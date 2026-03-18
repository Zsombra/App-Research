import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';

// Tell React's act() that we are in a test environment.
// Must be set before any React rendering happens.
// @ts-expect-error - not in standard TS lib
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
})));

vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: vi.fn(() => ({
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()),
    terminate: vi.fn(),
  })),
  resetWorkerBridge: vi.fn(),
}));

// Mock localStorage
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

// ---------------------------------------------------------------------------
// Store mocks — provide stable selector return values so React doesn't loop.
// ---------------------------------------------------------------------------

vi.mock('../stores/market-store.js', () => ({
  useMarketStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ tickers: new Map(), trades: new Map(), orderbooks: new Map() })
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
      orders: [],
      positions: new Map(),
    })
  ),
  useAllPositions: vi.fn(() => []),
  useOrders: vi.fn(() => []),
}));

vi.mock('../stores/alert-store.js', () => ({
  useAlertStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      alerts: [],
      addAlert: vi.fn(),
      removeAlert: vi.fn(),
      clearTriggered: vi.fn(),
    })
  ),
  startAlertChecker: vi.fn(() => vi.fn()),
}));

vi.mock('../stores/symbol-store.js', () => ({
  useActiveSymbol: vi.fn(() => 'BTC/USDT'),
  useSymbolStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ activeSymbol: 'BTC/USDT', watchlist: [], subscribedSymbols: new Set() })
  ),
}));

vi.mock('../stores/marketplace-store.js', () => ({
  useMarketplaceStore: Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ searchQuery: '', sortBy: 'popular', loading: false, fetchAvailable: vi.fn(), setSearchQuery: vi.fn(), setSortBy: vi.fn(), toggleEnabled: vi.fn(), uninstall: vi.fn(), install: vi.fn() })
    ),
    {
      getState: vi.fn(() => ({
        setSearchQuery: vi.fn(),
        setSortBy: vi.fn(),
        toggleEnabled: vi.fn(),
        uninstall: vi.fn(),
        install: vi.fn(),
      })),
    }
  ),
  useFilteredMarketplace: vi.fn(() => []),
  useInstalledIndicators: vi.fn(() => []),
}));

// ---------------------------------------------------------------------------
// Component imports — must come after all vi.mock() calls.
// ---------------------------------------------------------------------------
import { OrderbookPanel } from '../panels/OrderbookPanel.js';
import { TradesPanel } from '../panels/TradesPanel.js';
import { PositionsPanel } from '../panels/PositionsPanel.js';
import { AlertsPanel } from '../panels/AlertsPanel.js';
import { MarketplacePanel } from '../panels/MarketplacePanel.js';

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
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
}

// ---------------------------------------------------------------------------
// OrderbookPanel
// ---------------------------------------------------------------------------

describe('OrderbookPanel', () => {
  const config = { id: 'ob', type: 'orderbook', symbol: 'BTC/USDT', title: 'OB' };

  it('renders without crashing', () => {
    const { container, root } = renderInto(<OrderbookPanel config={config} />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows "No orderbook data" when no data is present', () => {
    const { container, root } = renderInto(<OrderbookPanel config={config} />);
    expect(container.textContent).toContain('No orderbook data');
    cleanup(root, container);
  });

  it('shows Price and Size headers when data is present', async () => {
    // Temporarily override the mock to return a valid orderbook snapshot.
    const marketStore = await import('../stores/market-store.js');
    vi.mocked(marketStore.useOrderbook).mockReturnValueOnce({
      exchange: 'binance',
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      bids: [{ price: 64999, size: 1 }],
      asks: [{ price: 65001, size: 1 }],
      sequenceId: 1,
    });

    const { container, root } = renderInto(<OrderbookPanel config={config} />);
    expect(container.textContent).toContain('Price');
    expect(container.textContent).toContain('Size');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// TradesPanel
// ---------------------------------------------------------------------------

describe('TradesPanel', () => {
  const config = { id: 'ts', type: 'trades', symbol: 'BTC/USDT', title: 'Trades' };

  it('renders without crashing', () => {
    const { container, root } = renderInto(<TradesPanel config={config} />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows "No trades yet" when no data is present', () => {
    const { container, root } = renderInto(<TradesPanel config={config} />);
    expect(container.textContent).toContain('No trades yet');
    cleanup(root, container);
  });

  it('shows Price, Amount, and Time headers', () => {
    const { container, root } = renderInto(<TradesPanel config={config} />);
    expect(container.textContent).toContain('Price');
    expect(container.textContent).toContain('Amount');
    expect(container.textContent).toContain('Time');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// PositionsPanel
// ---------------------------------------------------------------------------

describe('PositionsPanel', () => {
  const config = { id: 'pos', type: 'positions', symbol: 'BTC/USDT', title: 'Positions' };

  it('renders without crashing', () => {
    const { container, root } = renderInto(<PositionsPanel config={config} />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows "No open positions" when no positions exist', () => {
    const { container, root } = renderInto(<PositionsPanel config={config} />);
    expect(container.textContent).toContain('No open positions');
    cleanup(root, container);
  });

  it('shows "Positions" and "Orders" sections', () => {
    const { container, root } = renderInto(<PositionsPanel config={config} />);
    expect(container.textContent).toContain('Positions');
    expect(container.textContent).toContain('Orders');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// AlertsPanel
// ---------------------------------------------------------------------------

describe('AlertsPanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<AlertsPanel />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });

  it('shows "Price Alerts" header', () => {
    const { container, root } = renderInto(<AlertsPanel />);
    expect(container.textContent).toContain('Price Alerts');
    cleanup(root, container);
  });

  it('shows "No alerts set" when no alerts exist', () => {
    const { container, root } = renderInto(<AlertsPanel />);
    expect(container.textContent).toContain('No alerts set');
    cleanup(root, container);
  });

  it('shows the add alert form with "above"/"below" dropdown and "Set" button', () => {
    const { container, root } = renderInto(<AlertsPanel />);
    expect(container.textContent).toContain('above');
    expect(container.textContent).toContain('below');
    expect(container.textContent).toContain('Set');
    cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// MarketplacePanel
// ---------------------------------------------------------------------------

describe('MarketplacePanel', () => {
  it('renders without crashing', () => {
    const { container, root } = renderInto(<MarketplacePanel panelId="mp-1" />);
    expect(container.firstChild).not.toBeNull();
    cleanup(root, container);
  });
});
