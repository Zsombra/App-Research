import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSymbolStore, DEFAULT_WATCHLIST } from '../stores/symbol-store.js';

// Mock worker bridge
vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: () => ({
    send: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
  }),
  resetWorkerBridge: vi.fn(),
}));

describe('useSymbolStore', () => {
  beforeEach(() => {
    useSymbolStore.setState({
      activeSymbol: 'BTC/USDT',
      watchlist: [...DEFAULT_WATCHLIST],
      subscribedSymbols: new Set(),
    });
  });

  it('should have BTC/USDT as default active symbol', () => {
    expect(useSymbolStore.getState().activeSymbol).toBe('BTC/USDT');
  });

  it('should have default watchlist', () => {
    expect(useSymbolStore.getState().watchlist).toEqual(DEFAULT_WATCHLIST);
  });

  it('should set active symbol', () => {
    useSymbolStore.getState().setActiveSymbol('ETH/USDT');
    expect(useSymbolStore.getState().activeSymbol).toBe('ETH/USDT');
  });

  it('should not re-set same active symbol', () => {
    const stateBefore = useSymbolStore.getState();
    stateBefore.setActiveSymbol('BTC/USDT');
    // activeSymbol should still be BTC/USDT (no unnecessary update)
    expect(useSymbolStore.getState().activeSymbol).toBe('BTC/USDT');
  });

  it('should add to watchlist', () => {
    useSymbolStore.getState().addToWatchlist('DOGE/USDT');
    expect(useSymbolStore.getState().watchlist).toContain('DOGE/USDT');
  });

  it('should not add duplicate to watchlist', () => {
    useSymbolStore.getState().addToWatchlist('BTC/USDT');
    expect(useSymbolStore.getState().watchlist.filter((s) => s === 'BTC/USDT')).toHaveLength(1);
  });

  it('should remove from watchlist', () => {
    useSymbolStore.getState().removeFromWatchlist('SOL/USDT');
    expect(useSymbolStore.getState().watchlist).not.toContain('SOL/USDT');
  });

  it('should track subscribed symbols', () => {
    useSymbolStore.getState().subscribeSymbol('DOGE/USDT', ['simulated'], ['trades']);
    expect(useSymbolStore.getState().subscribedSymbols.has('DOGE/USDT')).toBe(true);
  });

  it('should unsubscribe symbols', () => {
    useSymbolStore.getState().subscribeSymbol('DOGE/USDT', ['simulated'], ['trades']);
    useSymbolStore.getState().unsubscribeSymbol('DOGE/USDT');
    expect(useSymbolStore.getState().subscribedSymbols.has('DOGE/USDT')).toBe(false);
  });
});
