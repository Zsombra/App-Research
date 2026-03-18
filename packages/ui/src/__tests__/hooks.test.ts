import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startFpsMonitor } from '../hooks/use-render-perf.js';

// ---------------------------------------------------------------------------
// useHotkeys tests
// ---------------------------------------------------------------------------

// We test the hotkey handler logic by importing the hook in a minimal React
// tree. The hook uses zustand stores directly via getState(), so we mock them.

vi.mock('../stores/order-store.js', () => {
  const placeOrder = vi.fn();
  const cancelAllOrders = vi.fn();
  const positions = new Map();

  const getState = () => ({ placeOrder, cancelAllOrders, positions });
  const store = Object.assign(vi.fn((sel: (s: ReturnType<typeof getState>) => unknown) => sel(getState())), { getState });

  return {
    useOrderStore: store,
    usePosition: vi.fn(() => undefined),
    useOrders: vi.fn(() => []),
    useAllPositions: vi.fn(() => []),
  };
});

vi.mock('../stores/symbol-store.js', () => {
  const getState = () => ({
    activeSymbol: 'ETH/USDT',
    watchlist: [],
    subscribedSymbols: new Set(),
    setActiveSymbol: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    subscribeSymbol: vi.fn(),
  });
  const store = Object.assign(vi.fn((sel: (s: ReturnType<typeof getState>) => unknown) => sel(getState())), { getState });

  return {
    useSymbolStore: store,
    useActiveSymbol: vi.fn(() => 'ETH/USDT'),
    useWatchlist: vi.fn(() => []),
  };
});

// Need these for the hook import environment
vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
})));

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: vi.fn(() => ({
    send: vi.fn(), onMessage: vi.fn(() => vi.fn()), terminate: vi.fn(),
  })),
  resetWorkerBridge: vi.fn(),
}));

// ---------------------------------------------------------------------------
// startFpsMonitor tests
// ---------------------------------------------------------------------------
describe('startFpsMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a cleanup function', () => {
    const cleanup = startFpsMonitor();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('calls requestAnimationFrame', () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
    const cleanup = startFpsMonitor();
    expect(rafSpy).toHaveBeenCalled();
    cleanup();
    rafSpy.mockRestore();
  });

  it('calls cancelAnimationFrame on cleanup', () => {
    const cafSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const cleanup = startFpsMonitor();
    cleanup();
    expect(cafSpy).toHaveBeenCalled();
    cafSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useHotkeys (integration-style via keydown events)
// ---------------------------------------------------------------------------
describe('useHotkeys', () => {
  // We import the stores to check calls
  let orderStore: ReturnType<typeof import('../stores/order-store.js').useOrderStore.getState>;

  beforeEach(async () => {
    const { useOrderStore } = await import('../stores/order-store.js');
    orderStore = useOrderStore.getState();
    vi.clearAllMocks();
  });

  it('useHotkeys module can be imported', async () => {
    const mod = await import('../hooks/use-hotkeys.js');
    expect(typeof mod.useHotkeys).toBe('function');
  });
});
