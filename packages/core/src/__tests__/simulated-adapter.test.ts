import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimulatedAdapter } from '../adapters/simulated/simulated-adapter.js';
import { ConnectionStatus } from '@terminal/types';

describe('SimulatedAdapter', () => {
  let adapter: SimulatedAdapter;

  beforeEach(() => {
    adapter = new SimulatedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should have exchangeId "simulated"', () => {
    expect(adapter.exchangeId).toBe('simulated');
  });

  it('should start disconnected', () => {
    expect(adapter.status).toBe(ConnectionStatus.Disconnected);
  });

  it('should transition to connected on connect()', async () => {
    const statusChanges: string[] = [];
    adapter.onConnectionStatusChange = (status) => statusChanges.push(status);

    await adapter.connect();

    expect(adapter.status).toBe(ConnectionStatus.Connected);
    expect(statusChanges).toContain(ConnectionStatus.Connecting);
    expect(statusChanges).toContain(ConnectionStatus.Connected);
  });

  it('should emit trades after subscribeTrades()', async () => {
    await adapter.connect();

    const trades: unknown[] = [];
    adapter.onTrade = (trade) => trades.push(trade);

    adapter.subscribeTrades('BTC/USDT');

    // Wait for at least one trade emission cycle
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(trades.length).toBeGreaterThan(0);

    const trade = trades[0] as Record<string, unknown>;
    expect(trade).toHaveProperty('id');
    expect(trade).toHaveProperty('exchange', 'simulated');
    expect(trade).toHaveProperty('symbol', 'BTC/USDT');
    expect(trade).toHaveProperty('price');
    expect(trade).toHaveProperty('amount');
    expect(trade).toHaveProperty('side');
  });

  it('should emit orderbook after subscribeOrderbook()', async () => {
    await adapter.connect();

    const snapshots: unknown[] = [];
    adapter.onOrderbookSnapshot = (snapshot) => snapshots.push(snapshot);

    adapter.subscribeOrderbook('BTC/USDT');

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(snapshots.length).toBeGreaterThan(0);

    const snapshot = snapshots[0] as Record<string, unknown>;
    expect(snapshot).toHaveProperty('exchange', 'simulated');
    expect(snapshot).toHaveProperty('bids');
    expect(snapshot).toHaveProperty('asks');
  });

  it('should emit ticker after subscribeTicker()', async () => {
    await adapter.connect();

    const tickers: unknown[] = [];
    adapter.onTicker = (ticker) => tickers.push(ticker);

    adapter.subscribeTicker('BTC/USDT');

    await new Promise((resolve) => setTimeout(resolve, 1200));

    expect(tickers.length).toBeGreaterThan(0);

    const ticker = tickers[0] as Record<string, unknown>;
    expect(ticker).toHaveProperty('lastPrice');
    expect(ticker).toHaveProperty('changePercent24h');
  });

  it('should stop emitting after unsubscribe', async () => {
    await adapter.connect();

    const trades: unknown[] = [];
    adapter.onTrade = (trade) => trades.push(trade);

    adapter.subscribeTrades('BTC/USDT');
    await new Promise((resolve) => setTimeout(resolve, 600));

    const countBefore = trades.length;
    adapter.unsubscribeTrades('BTC/USDT');

    await new Promise((resolve) => setTimeout(resolve, 600));
    // Should not grow significantly after unsubscribe
    expect(trades.length - countBefore).toBeLessThanOrEqual(1);
  });

  it('should handle multiple symbols', async () => {
    await adapter.connect();

    const symbols = new Set<string>();
    adapter.onTrade = (trade) => symbols.add(trade.symbol);

    adapter.subscribeTrades('BTC/USDT');
    adapter.subscribeTrades('ETH/USDT');

    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(symbols.has('BTC/USDT')).toBe(true);
    expect(symbols.has('ETH/USDT')).toBe(true);
  });

  it('should clean up on disconnect', async () => {
    await adapter.connect();
    adapter.subscribeTrades('BTC/USDT');
    adapter.subscribeOrderbook('BTC/USDT');
    adapter.subscribeTicker('BTC/USDT');

    await adapter.disconnect();

    expect(adapter.status).toBe(ConnectionStatus.Disconnected);
  });
});
