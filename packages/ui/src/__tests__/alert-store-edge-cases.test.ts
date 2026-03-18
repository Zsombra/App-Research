import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null,
})));

vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: () => ({ send: vi.fn(), onMessage: vi.fn(), offMessage: vi.fn() }),
  resetWorkerBridge: vi.fn(),
}));

import { useAlertStore, startAlertChecker } from '../stores/alert-store.js';
import { useMarketStore } from '../stores/market-store.js';

beforeEach(() => {
  useAlertStore.setState({ alerts: [] });
  useMarketStore.setState({
    tickers: new Map(),
    trades: new Map(),
    orderbooks: new Map(),
    candles: new Map(),
    timeframes: new Map(),
    barTypes: new Map(),
    customBarConfigs: new Map(),
    connectionStatuses: new Map(),
    subscriptions: new Set(),
  });
});

describe('alert-store edge cases', () => {
  it('checkAlerts does not throw when ticker is missing for alert symbol', () => {
    useAlertStore.getState().addAlert('DOGE/USDT', 'above', 1.0);
    // No ticker for DOGE/USDT — should not throw
    expect(() => useAlertStore.getState().checkAlerts()).not.toThrow();
    expect(useAlertStore.getState().alerts[0]!.triggered).toBe(false);
  });

  it('does not re-trigger an already triggered alert', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);

    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated', symbol: 'BTC/USDT', timestamp: Date.now(),
          lastPrice: 51000, bidPrice: 50999, askPrice: 51001,
          volume24h: 1000, high24h: 52000, low24h: 48000, changePercent24h: 2.5,
        }],
      ]),
    });

    // First check triggers
    useAlertStore.getState().checkAlerts();
    expect(useAlertStore.getState().alerts[0]!.triggered).toBe(true);
    const triggeredAt = useAlertStore.getState().alerts[0]!.triggeredAt;

    // Second check should not change triggeredAt
    useAlertStore.getState().checkAlerts();
    expect(useAlertStore.getState().alerts[0]!.triggeredAt).toBe(triggeredAt);
  });

  it('handles multiple alerts for same symbol with different conditions', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    useAlertStore.getState().addAlert('BTC/USDT', 'below', 48000);

    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated', symbol: 'BTC/USDT', timestamp: Date.now(),
          lastPrice: 51000, bidPrice: 50999, askPrice: 51001,
          volume24h: 1000, high24h: 52000, low24h: 48000, changePercent24h: 2.5,
        }],
      ]),
    });

    useAlertStore.getState().checkAlerts();
    const alerts = useAlertStore.getState().alerts;

    expect(alerts[0]!.triggered).toBe(true); // above 50000, price is 51000
    expect(alerts[1]!.triggered).toBe(false); // below 48000, price is 51000
  });

  it('removeAlert with nonexistent id does not crash', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    expect(() => useAlertStore.getState().removeAlert('nonexistent-id')).not.toThrow();
    expect(useAlertStore.getState().alerts).toHaveLength(1);
  });

  it('clearTriggered with no triggered alerts is a no-op', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    useAlertStore.getState().addAlert('ETH/USDT', 'below', 3000);

    useAlertStore.getState().clearTriggered();
    expect(useAlertStore.getState().alerts).toHaveLength(2);
  });

  it('clearTriggered removes only triggered alerts', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    useAlertStore.getState().addAlert('ETH/USDT', 'below', 3000);

    // Manually trigger just the first
    useAlertStore.setState({
      alerts: useAlertStore.getState().alerts.map((a, i) =>
        i === 0 ? { ...a, triggered: true, triggeredAt: Date.now() } : a
      ),
    });

    useAlertStore.getState().clearTriggered();
    expect(useAlertStore.getState().alerts).toHaveLength(1);
    expect(useAlertStore.getState().alerts[0]!.symbol).toBe('ETH/USDT');
  });

  it('startAlertChecker cleanup actually stops the checker', () => {
    vi.useFakeTimers();

    const cleanup = startAlertChecker();
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);

    cleanup();

    // Set up a price that would trigger after cleanup
    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated', symbol: 'BTC/USDT', timestamp: Date.now(),
          lastPrice: 51000, bidPrice: 50999, askPrice: 51001,
          volume24h: 1000, high24h: 52000, low24h: 48000, changePercent24h: 2.5,
        }],
      ]),
    });

    vi.advanceTimersByTime(2000);

    // Alert should NOT be triggered because checker was stopped
    expect(useAlertStore.getState().alerts[0]!.triggered).toBe(false);

    vi.useRealTimers();
  });

  it('checkAlerts handles mixed symbols (some with ticker, some without)', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    useAlertStore.getState().addAlert('UNKNOWN/USDT', 'below', 1);

    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated', symbol: 'BTC/USDT', timestamp: Date.now(),
          lastPrice: 51000, bidPrice: 50999, askPrice: 51001,
          volume24h: 1000, high24h: 52000, low24h: 48000, changePercent24h: 2.5,
        }],
      ]),
    });

    expect(() => useAlertStore.getState().checkAlerts()).not.toThrow();

    const alerts = useAlertStore.getState().alerts;
    expect(alerts[0]!.triggered).toBe(true);   // BTC alert triggers
    expect(alerts[1]!.triggered).toBe(false);   // UNKNOWN alert stays untriggered
  });
});
