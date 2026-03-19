import { create } from 'zustand';
import type { PanelConfig, PanelType } from '@terminal/types';

const STORAGE_KEY = 'terminal-layout-v1';

export interface LayoutState {
  /** All active panel configurations */
  panels: PanelConfig[];
  /** Whether the layout has been initialized */
  initialized: boolean;

  // Actions
  addPanel: (config: Readonly<PanelConfig>) => void;
  removePanel: (id: string) => void;
  setPanels: (panels: PanelConfig[]) => void;
  setInitialized: () => void;
}

/**
 * Default panel layout for a fresh workspace.
 */
export function getDefaultPanels(): PanelConfig[] {
  return [
    {
      id: 'chart-main',
      type: 'chart',
      title: 'BTC/USDT Chart',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      timeframe: '1m',
      exchanges: ['simulated'],
    },
    {
      id: 'orderbook-main',
      type: 'orderbook',
      title: 'Orderbook',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
    },
    {
      id: 'trades-main',
      type: 'trades',
      title: 'Recent Trades',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
    },
    {
      id: 'watchlist-main',
      type: 'watchlist',
      title: 'Watchlist',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
    },
    {
      id: 'depth-chart-main',
      type: 'depth-chart',
      title: 'Depth Chart',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
    },
    {
      id: 'alerts-main',
      type: 'alerts',
      title: 'Price Alerts',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
    },
    {
      id: 'order-entry-main',
      type: 'order-entry',
      title: 'Order Entry',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
    },
    {
      id: 'positions-main',
      type: 'positions',
      title: 'Positions & Orders',
      linkColor: 'none',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
    },
  ];
}

export const useLayoutStore = create<LayoutState>((set) => ({
  panels: getDefaultPanels(),
  initialized: false,

  addPanel: (config) => {
    set((state) => {
      const panels = [...state.panels, config];
      persistPanels(panels);
      return { panels };
    });
  },

  removePanel: (id) => {
    set((state) => {
      const panels = state.panels.filter((p) => p.id !== id);
      persistPanels(panels);
      return { panels };
    });
  },

  setPanels: (panels) => {
    set({ panels });
    persistPanels(panels);
  },

  setInitialized: () => set({ initialized: true }),
}));

function persistPanels(panels: readonly PanelConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  } catch (err) {
    console.warn('[layout-store] Failed to persist layout:', err);
  }
}

export function loadPersistedPanels(): PanelConfig[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch (err) {
    console.warn('[layout-store] Failed to load persisted panels:', err);
    return null;
  }
}

/**
 * Returns a unique panel ID for the given type.
 */
let panelCounter = 0;
export function generatePanelId(type: PanelType): string {
  panelCounter += 1;
  return `${type}-${Date.now()}-${panelCounter}`;
}
