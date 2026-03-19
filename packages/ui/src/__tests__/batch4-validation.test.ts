import { describe, it, expect, beforeEach, vi } from 'vitest';
import { floorToCandle } from '../stores/candle-aggregator.js';
import { useAlertStore } from '../stores/alert-store.js';
import { useMarketStore } from '../stores/market-store.js';

describe('floorToCandle — zero intervalMs guard', () => {
  it('returns timestamp unchanged when intervalMs is 0', () => {
    expect(floorToCandle(1700000099999, 0)).toBe(1700000099999);
  });

  it('returns timestamp unchanged when intervalMs is negative', () => {
    expect(floorToCandle(1700000099999, -60_000)).toBe(1700000099999);
  });

  it('floors correctly with positive intervalMs', () => {
    const ts = 1700000099999;
    const floored = floorToCandle(ts, 60_000);
    expect(floored % 60_000).toBe(0);
    expect(floored).toBeLessThanOrEqual(ts);
  });
});

describe('alert-store — NaN price guard', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [] });
    useMarketStore.setState({
      tickers: new Map(),
    });
  });

  it('does not trigger alert when ticker price is NaN', () => {
    // Add an alert
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);
    const alertId = useAlertStore.getState().alerts[0]!.id;

    // Set ticker with NaN price
    useMarketStore.setState({
      tickers: new Map([['BTC/USDT', {
        symbol: 'BTC/USDT',
        lastPrice: NaN,
        bid: 0,
        ask: 0,
        volume24h: 0,
        change24h: 0,
        high24h: 0,
        low24h: 0,
        timestamp: Date.now(),
      }]]),
    });

    useAlertStore.getState().checkAlerts();
    const alert = useAlertStore.getState().alerts.find((a) => a.id === alertId);
    expect(alert!.triggered).toBe(false);
  });

  it('does not trigger alert when ticker price is Infinity', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'below', 50000);

    useMarketStore.setState({
      tickers: new Map([['BTC/USDT', {
        symbol: 'BTC/USDT',
        lastPrice: Infinity,
        bid: 0,
        ask: 0,
        volume24h: 0,
        change24h: 0,
        high24h: 0,
        low24h: 0,
        timestamp: Date.now(),
      }]]),
    });

    useAlertStore.getState().checkAlerts();
    const alert = useAlertStore.getState().alerts[0]!;
    expect(alert.triggered).toBe(false);
  });

  it('triggers alert correctly with valid price', () => {
    useAlertStore.getState().addAlert('BTC/USDT', 'above', 50000);

    useMarketStore.setState({
      tickers: new Map([['BTC/USDT', {
        symbol: 'BTC/USDT',
        lastPrice: 51000,
        bid: 50999,
        ask: 51001,
        volume24h: 1000,
        change24h: 2,
        high24h: 52000,
        low24h: 49000,
        timestamp: Date.now(),
      }]]),
    });

    useAlertStore.getState().checkAlerts();
    const alert = useAlertStore.getState().alerts[0]!;
    expect(alert.triggered).toBe(true);
  });
});
