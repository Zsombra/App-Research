import React, { useCallback, useRef, useEffect } from 'react';
import { DockviewReact, themeAbyss } from 'dockview-react';
import type { DockviewReadyEvent, DockviewApi, SerializedDockview } from 'dockview-react';
import 'dockview-react/dist/styles/dockview.css';
import { panelComponents } from './panel-registry.js';
import { getWorkerBridge, resetWorkerBridge } from '../worker/worker-bridge.js';
import { routeWorkerMessage } from '../stores/market-store.js';
import { getDefaultPanels } from '../stores/layout-store.js';

const LAYOUT_STORAGE_KEY = 'terminal-dockview-layout-v1';

function saveLayout(api: DockviewApi): void {
  try {
    const serialized = api.toJSON();
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // ignore
  }
}

function loadLayout(): SerializedDockview | null {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedDockview;
  } catch {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    return null;
  }
}

/**
 * Root layout component. Wraps DockviewReact, manages panel layout,
 * and owns the WorkerBridge lifecycle.
 */
export function TerminalLayout(): React.JSX.Element {
  const apiRef = useRef<DockviewApi | null>(null);

  // Wire up the WorkerBridge on mount
  useEffect(() => {
    const bridge = getWorkerBridge();
    bridge.onMessage(routeWorkerMessage);

    // Default subscription using simulated exchange for demo
    bridge.send({
      type: 'subscribe',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
      topics: ['trades', 'orderbook', 'ticker'],
    });

    return () => {
      bridge.offMessage(routeWorkerMessage);
      resetWorkerBridge();
    };
  }, []);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    const api = event.api;
    apiRef.current = api;

    // Try to restore persisted layout
    const saved = loadLayout();
    if (saved) {
      try {
        api.fromJSON(saved);
        return;
      } catch {
        localStorage.removeItem(LAYOUT_STORAGE_KEY);
      }
    }

    // Apply default layout
    const defaultPanels = getDefaultPanels();

    // Add chart panel (center)
    const chartConfig = defaultPanels.find((p) => p.type === 'chart');
    if (chartConfig) {
      api.addPanel({
        id: chartConfig.id,
        component: chartConfig.type,
        title: chartConfig.title,
        params: chartConfig,
      });
    }

    // Add orderbook panel (right)
    const orderbookConfig = defaultPanels.find((p) => p.type === 'orderbook');
    if (orderbookConfig) {
      api.addPanel({
        id: orderbookConfig.id,
        component: orderbookConfig.type,
        title: orderbookConfig.title,
        params: orderbookConfig,
        position: {
          referencePanel: chartConfig?.id ?? 'chart-main',
          direction: 'right',
        },
        initialWidth: 280,
      });
    }

    // Add trades panel (bottom)
    const tradesConfig = defaultPanels.find((p) => p.type === 'trades');
    if (tradesConfig) {
      api.addPanel({
        id: tradesConfig.id,
        component: tradesConfig.type,
        title: tradesConfig.title,
        params: tradesConfig,
        position: {
          referencePanel: chartConfig?.id ?? 'chart-main',
          direction: 'below',
        },
        initialHeight: 200,
      });
    }

    // Persist on layout changes
    const disposable = api.onDidLayoutChange(() => {
      saveLayout(api);
    });

    // Clean up on unmount (handled by React strict mode double-invoke)
    return () => {
      disposable.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <DockviewReact
        components={panelComponents}
        onReady={onReady}
        theme={themeAbyss}
        className="terminal-dockview"
      />
    </div>
  );
}
