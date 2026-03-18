// @ts-expect-error - not in standard TS lib
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';

// ---------------------------------------------------------------------------
// Global stubs
// ---------------------------------------------------------------------------
vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
})));

vi.stubGlobal('ResizeObserver', class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
});

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: vi.fn(() => ({
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()),
    terminate: vi.fn(),
  })),
  resetWorkerBridge: vi.fn(),
}));

vi.mock('../stores/market-store.js', () => ({
  useMarketStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ tickers: new Map(), trades: new Map(), orderbooks: new Map(), connectionStatuses: new Map() })
  ),
  useOrderbook: vi.fn(() => undefined),
  useTrades: vi.fn(() => []),
  useTicker: vi.fn(() => undefined),
  useCandles: vi.fn(() => []),
}));

vi.mock('../stores/order-store.js', () => ({
  useOrderStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      cancelOrder: vi.fn(),
      updatePositionMarkPrices: vi.fn(),
      placeOrder: vi.fn(),
      orders: [],
      positions: new Map(),
    })
  ),
  useAllPositions: vi.fn(() => []),
  useOrders: vi.fn(() => []),
  usePosition: vi.fn(() => undefined),
}));

vi.mock('../stores/symbol-store.js', () => ({
  useActiveSymbol: vi.fn(() => 'BTC/USDT'),
  useWatchlist: vi.fn(() => ['BTC/USDT', 'ETH/USDT']),
  useSymbolStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      activeSymbol: 'BTC/USDT',
      watchlist: ['BTC/USDT', 'ETH/USDT'],
      subscribedSymbols: new Set(),
      setActiveSymbol: vi.fn(),
      addToWatchlist: vi.fn(),
      removeFromWatchlist: vi.fn(),
      subscribeSymbol: vi.fn(),
    })
  ),
}));

vi.mock('../stores/derivatives-store.js', () => ({
  useLiquidations: vi.fn(() => []),
  useCurrentOI: vi.fn(() => 0),
  useFundingRate: vi.fn(() => 0),
  useOpenInterestHistory: vi.fn(() => []),
}));

vi.mock('../stores/sl-tp-heatmap-store.js', () => ({
  useSLTPHeatmapStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ enabled: true, setEnabled: vi.fn(), recompute: vi.fn() })
  ),
  useSLTPHeatmap: vi.fn(() => []),
  useSLClusters: vi.fn(() => []),
  useTPClusters: vi.fn(() => []),
}));

vi.mock('../stores/settings-store.js', () => ({
  useSettingsStore: vi.fn(() => ({
    defaultExchange: 'simulated',
    defaultTimeframe: '1m',
    showTickerBar: true,
    autoFitChart: true,
    maxTradesDisplay: 100,
    updateSetting: vi.fn(),
    resetDefaults: vi.fn(),
  })),
}));

vi.mock('../stores/script-store.js', () => {
  const { create } = require('zustand');
  const store = create(() => ({
    scripts: new Map(),
    saveScript: vi.fn(),
    removeScript: vi.fn(),
    toggleScript: vi.fn(),
  }));
  return {
    useScriptStore: Object.assign(store, {
      getState: store.getState,
    }),
    useScripts: vi.fn(() => []),
  };
});

// ---------------------------------------------------------------------------
// Component imports
// ---------------------------------------------------------------------------
import { OrderEntryPanel } from '../panels/OrderEntryPanel.js';
import { DepthChartPanel } from '../panels/DepthChartPanel.js';
import { DerivativesPanel } from '../panels/DerivativesPanel.js';
import { ExchangeSelector } from '../panels/ExchangeSelector.js';
import { MBOProfilePanel } from '../panels/MBOProfilePanel.js';
import { MarketProfilePanel } from '../panels/MarketProfilePanel.js';
import { SLTPHeatmapPanel } from '../panels/SLTPHeatmapPanel.js';
import { ScriptEditorPanel } from '../panels/ScriptEditorPanel.js';
import { SettingsPanel } from '../panels/SettingsPanel.js';
import { WatchlistPanel } from '../panels/WatchlistPanel.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderInto(
  element: React.ReactElement,
): { container: HTMLDivElement; root: ReactDOM.Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root!: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(element);
  });
  return { container, root };
}

function cleanup(root: ReactDOM.Root, container: HTMLDivElement): void {
  act(() => { root.unmount(); });
  document.body.removeChild(container);
}

const config = { id: 'test', type: 'panel', symbol: 'BTC/USDT', title: 'Test' };

// ---------------------------------------------------------------------------
// OrderEntryPanel
// ---------------------------------------------------------------------------
describe('OrderEntryPanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<OrderEntryPanel config={config} />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows BTC/USDT symbol', () => {
    const { container, root } = renderInto(<OrderEntryPanel config={config} />);
    expect(container.textContent).toContain('BTC/USDT');
    cleanup(root, container);
  });

  it('shows BUY and SELL buttons', () => {
    const { container, root } = renderInto(<OrderEntryPanel config={config} />);
    expect(container.textContent).toContain('BUY');
    expect(container.textContent).toContain('SELL');
    cleanup(root, container);
  });

  it('shows market and limit order type tabs', () => {
    const { container, root } = renderInto(<OrderEntryPanel config={config} />);
    expect(container.textContent).toContain('market');
    expect(container.textContent).toContain('limit');
    cleanup(root, container);
  });

  it('shows Position section when flat', () => {
    const { container, root } = renderInto(<OrderEntryPanel config={config} />);
    expect(container.textContent).toContain('Position');
    expect(container.textContent).toContain('Flat');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// DepthChartPanel
// ---------------------------------------------------------------------------
describe('DepthChartPanel', () => {
  it('renders a canvas element', () => {
    const { container, root } = renderInto(<DepthChartPanel config={config} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// DerivativesPanel
// ---------------------------------------------------------------------------
describe('DerivativesPanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<DerivativesPanel />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows Derivatives header with symbol', () => {
    const { container, root } = renderInto(<DerivativesPanel />);
    expect(container.textContent).toContain('Derivatives');
    expect(container.textContent).toContain('BTC/USDT');
    cleanup(root, container);
  });

  it('shows OPEN INTEREST, FUNDING RATE, LIQUIDATIONS sections', () => {
    const { container, root } = renderInto(<DerivativesPanel />);
    expect(container.textContent).toContain('OPEN INTEREST');
    expect(container.textContent).toContain('FUNDING RATE');
    expect(container.textContent).toContain('LIQUIDATIONS');
    cleanup(root, container);
  });

  it('shows "No liquidations yet" when empty', () => {
    const { container, root } = renderInto(<DerivativesPanel />);
    expect(container.textContent).toContain('No liquidations yet');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// ExchangeSelector
// ---------------------------------------------------------------------------
describe('ExchangeSelector', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<ExchangeSelector />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows all exchange labels', () => {
    const { container, root } = renderInto(<ExchangeSelector />);
    expect(container.textContent).toContain('Simulated');
    expect(container.textContent).toContain('Binance');
    expect(container.textContent).toContain('Bybit');
    expect(container.textContent).toContain('Coinbase');
    cleanup(root, container);
  });

  it('shows active symbol', () => {
    const { container, root } = renderInto(<ExchangeSelector />);
    expect(container.textContent).toContain('BTC/USDT');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// MBOProfilePanel
// ---------------------------------------------------------------------------
describe('MBOProfilePanel', () => {
  it('renders without crashing (no snapshot)', () => {
    const { container, root } = renderInto(<MBOProfilePanel panelId="mbo-1" />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows "Awaiting MBO data" when no snapshot', () => {
    const { container, root } = renderInto(<MBOProfilePanel panelId="mbo-1" />);
    expect(container.textContent).toContain('Awaiting MBO data');
    cleanup(root, container);
  });

  it('shows MBO Profile header', () => {
    const { container, root } = renderInto(<MBOProfilePanel panelId="mbo-1" />);
    expect(container.textContent).toContain('MBO Profile');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// MarketProfilePanel
// ---------------------------------------------------------------------------
describe('MarketProfilePanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<MarketProfilePanel />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows "Waiting for data..." when no candles', () => {
    const { container, root } = renderInto(<MarketProfilePanel />);
    expect(container.textContent).toContain('Waiting for data...');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// SLTPHeatmapPanel
// ---------------------------------------------------------------------------
describe('SLTPHeatmapPanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<SLTPHeatmapPanel />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows "Waiting for data..." when no candles', () => {
    const { container, root } = renderInto(<SLTPHeatmapPanel />);
    expect(container.textContent).toContain('Waiting for data...');
    cleanup(root, container);
  });

  it('renders with mode="sl"', () => {
    const { container, root } = renderInto(<SLTPHeatmapPanel mode="sl" />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// ScriptEditorPanel
// ---------------------------------------------------------------------------
describe('ScriptEditorPanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<ScriptEditorPanel />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows Scripts header and + New button', () => {
    const { container, root } = renderInto(<ScriptEditorPanel />);
    expect(container.textContent).toContain('Scripts');
    expect(container.textContent).toContain('+ New');
    cleanup(root, container);
  });

  it('shows Save button', () => {
    const { container, root } = renderInto(<ScriptEditorPanel />);
    expect(container.textContent).toContain('Save');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------
describe('SettingsPanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<SettingsPanel />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows Settings header', () => {
    const { container, root } = renderInto(<SettingsPanel />);
    expect(container.textContent).toContain('Settings');
    cleanup(root, container);
  });

  it('shows setting labels', () => {
    const { container, root } = renderInto(<SettingsPanel />);
    const text = container.textContent ?? '';
    expect(text).toContain('Default Exchange');
    expect(text).toContain('Default Timeframe');
    expect(text).toContain('Show Ticker Bar');
    expect(text).toContain('Auto-Fit Chart');
    expect(text).toContain('Max Trades Display');
    cleanup(root, container);
  });

  it('shows Reset to Defaults button', () => {
    const { container, root } = renderInto(<SettingsPanel />);
    expect(container.textContent).toContain('Reset to Defaults');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// WatchlistPanel
// ---------------------------------------------------------------------------
describe('WatchlistPanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<WatchlistPanel config={config} />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows Watchlist header', () => {
    const { container, root } = renderInto(<WatchlistPanel config={config} />);
    expect(container.textContent).toContain('Watchlist');
    cleanup(root, container);
  });

  it('shows column headers', () => {
    const { container, root } = renderInto(<WatchlistPanel config={config} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Symbol');
    expect(text).toContain('Price');
    expect(text).toContain('24h %');
    cleanup(root, container);
  });

  it('shows watchlist symbols', () => {
    const { container, root } = renderInto(<WatchlistPanel config={config} />);
    expect(container.textContent).toContain('BTC/USDT');
    expect(container.textContent).toContain('ETH/USDT');
    cleanup(root, container);
  });

  it('shows + button to add symbols', () => {
    const { container, root } = renderInto(<WatchlistPanel config={config} />);
    const addBtn = container.querySelector('button');
    expect(addBtn).not.toBeNull();
    expect(addBtn?.textContent).toBe('+');
    cleanup(root, container);
  });
});
