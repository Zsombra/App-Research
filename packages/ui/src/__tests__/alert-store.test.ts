import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAlertStore, startAlertChecker } from '../stores/alert-store.js';
import { useMarketStore } from '../stores/market-store.js';

// Mock worker bridge
vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: () => ({
    send: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
  }),
  resetWorkerBridge: vi.fn(),
}));

describe('useAlertStore', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [] });
  });

  it('should start with empty alerts', () => {
    expect(useAlertStore.getState().alerts).toHaveLength(0);
  });

  it('should add an alert', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 100000);
    const alerts = useAlertStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.symbol).toBe('BTC/USDT');
    expect(alerts[0]!.condition).toBe('above');
    expect(alerts[0]!.targetPrice).toBe(100000);
    expect(alerts[0]!.triggered).toBe(false);
  });

  it('should remove an alert', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 100000);
    const id = useAlertStore.getState().alerts[0]!.id;
    useAlertStore.getState().removeAlert(id);
    expect(useAlertStore.getState().alerts).toHaveLength(0);
  });

  it('should trigger alert when price crosses above', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);

    // Set a ticker price above threshold
    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated',
          symbol: 'BTC/USDT',
          timestamp: Date.now(),
          lastPrice: 51000,
          bidPrice: 50999,
          askPrice: 51001,
          volume24h: 1000,
          high24h: 52000,
          low24h: 48000,
          changePercent24h: 2.5,
        }],
      ]),
    });

    useAlertStore.getState().checkAlerts();
    const alerts = useAlertStore.getState().alerts;
    expect(alerts[0]!.triggered).toBe(true);
    expect(alerts[0]!.triggeredAt).toBeGreaterThan(0);
  });

  it('should trigger alert when price crosses below', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'below', 50000);

    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated',
          symbol: 'BTC/USDT',
          timestamp: Date.now(),
          lastPrice: 49000,
          bidPrice: 48999,
          askPrice: 49001,
          volume24h: 1000,
          high24h: 52000,
          low24h: 48000,
          changePercent24h: -2.5,
        }],
      ]),
    });

    useAlertStore.getState().checkAlerts();
    expect(useAlertStore.getState().alerts[0]!.triggered).toBe(true);
  });

  it('should not trigger alert when price has not crossed', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 100000);

    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated',
          symbol: 'BTC/USDT',
          timestamp: Date.now(),
          lastPrice: 50000,
          bidPrice: 49999,
          askPrice: 50001,
          volume24h: 1000,
          high24h: 52000,
          low24h: 48000,
          changePercent24h: 0,
        }],
      ]),
    });

    useAlertStore.getState().checkAlerts();
    expect(useAlertStore.getState().alerts[0]!.triggered).toBe(false);
  });

  it('should clear triggered alerts', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    useAlertStore.getState().addAlert('ETH/USDT', 'below', 3000);

    // Trigger first alert only
    useAlertStore.setState({
      alerts: useAlertStore.getState().alerts.map((a, i) =>
        i === 0 ? { ...a, triggered: true, triggeredAt: Date.now() } : a
      ),
    });

    useAlertStore.getState().clearTriggered();
    expect(useAlertStore.getState().alerts).toHaveLength(1);
    expect(useAlertStore.getState().alerts[0]!.symbol).toBe('ETH/USDT');
  });

  it('should start and stop alert checker', () => {
    vi.useFakeTimers();
    const cleanup = startAlertChecker();

    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    useMarketStore.setState({
      tickers: new Map([
        ['BTC/USDT', {
          exchange: 'simulated',
          symbol: 'BTC/USDT',
          timestamp: Date.now(),
          lastPrice: 51000,
          bidPrice: 50999,
          askPrice: 51001,
          volume24h: 1000,
          high24h: 52000,
          low24h: 48000,
          changePercent24h: 2.5,
        }],
      ]),
    });

    vi.advanceTimersByTime(600);
    expect(useAlertStore.getState().alerts[0]!.triggered).toBe(true);

    cleanup();
    vi.useRealTimers();
  });
});
