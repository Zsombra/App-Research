import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NormalizedTrade, OrderbookSnapshot, Ticker } from '@terminal/types';
import { CoinbaseAdapter } from '../adapters/coinbase/coinbase-adapter.js';

// --- Mock WebSocket ---

type MockWSListener = ((event: Record<string, unknown>) => void) | null;

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readyState: number = MockWebSocket.CONNECTING;
  url: string;

  onopen: MockWSListener = null;
  onclose: MockWSListener = null;
  onerror: MockWSListener = null;
  onmessage: MockWSListener = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.simulateOpen(), 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({});
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }
}

describe('CoinbaseAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    (globalThis as Record<string, unknown>)['WebSocket'] = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>)['WebSocket'];
  });

  function createConnectedAdapter(): { adapter: CoinbaseAdapter; ws: MockWebSocket } {
    const adapter = new CoinbaseAdapter('wss://test.coinbase.com');
    adapter.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;
    return { adapter, ws };
  }

  describe('Trade normalization (market_trades)', () => {
    const sampleTradeMessage = JSON.stringify({
      channel: 'market_trades',
      events: [{
        type: 'update',
        trades: [{
          trade_id: 'trade-123',
          product_id: 'BTC-USDT',
          price: '65432.10',
          size: '0.025',
          side: 'BUY',
          time: '2024-01-15T12:30:00Z',
        }],
      }],
    });

    it('should normalize market_trades to NormalizedTrade', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('BTC/USDT');
      ws.simulateMessage(sampleTradeMessage);

      expect(trades).toHaveLength(1);
      const trade = trades[0]!;

      expect(trade.exchange).toBe('coinbase');
      expect(trade.symbol).toBe('BTC/USDT');
      expect(trade.price).toBeCloseTo(65432.10);
      expect(trade.amount).toBeCloseTo(0.025);
      expect(trade.side).toBe('buy');
      expect(trade.id).toBe('trade-123');
      expect(trade.cost).toBeCloseTo(65432.10 * 0.025);
      expect(trade.liquidation).toBe(false);
    });

    it('should normalize sell side correctly', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('ETH/USDT');
      ws.simulateMessage(JSON.stringify({
        channel: 'market_trades',
        events: [{
          type: 'update',
          trades: [{
            trade_id: 'trade-456',
            product_id: 'ETH-USDT',
            price: '3400.00',
            size: '1.5',
            side: 'sell',
          }],
        }],
      }));

      expect(trades[0]!.side).toBe('sell');
    });

    it('should skip malformed messages', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('BTC/USDT');
      ws.simulateMessage('not json');
      expect(trades).toHaveLength(0);

      ws.simulateMessage(JSON.stringify({ channel: 'market_trades', events: [{ type: 'update', trades: [{ product_id: 'BTC-USDT', price: 'invalid' }] }] }));
      expect(trades).toHaveLength(0);
    });
  });

  describe('Orderbook normalization (level2)', () => {
    const sampleL2Snapshot = JSON.stringify({
      channel: 'l2_data',
      events: [{
        type: 'snapshot',
        product_id: 'BTC-USDT',
        updates: [
          { side: 'bid', price_level: '65000.00', new_quantity: '1.5' },
          { side: 'bid', price_level: '64999.00', new_quantity: '2.3' },
          { side: 'ask', price_level: '65001.00', new_quantity: '1.2' },
          { side: 'ask', price_level: '65002.00', new_quantity: '3.1' },
        ],
      }],
    });

    it('should normalize level2 snapshot to OrderbookSnapshot', () => {
      const { adapter, ws } = createConnectedAdapter();

      const snapshots: OrderbookSnapshot[] = [];
      adapter.onOrderbookSnapshot = (s) => snapshots.push(s);

      adapter.subscribeOrderbook('BTC/USDT');
      ws.simulateMessage(sampleL2Snapshot);

      expect(snapshots).toHaveLength(1);
      const snapshot = snapshots[0]!;

      expect(snapshot.exchange).toBe('coinbase');
      expect(snapshot.symbol).toBe('BTC/USDT');
      expect(snapshot.bids).toHaveLength(2);
      expect(snapshot.asks).toHaveLength(2);

      // Bids sorted descending
      expect(snapshot.bids[0]!.price).toBeCloseTo(65000);
      expect(snapshot.bids[1]!.price).toBeCloseTo(64999);

      // Asks sorted ascending
      expect(snapshot.asks[0]!.price).toBeCloseTo(65001);
      expect(snapshot.asks[1]!.price).toBeCloseTo(65002);
    });
  });

  describe('Ticker normalization', () => {
    const sampleTicker = JSON.stringify({
      channel: 'ticker',
      events: [{
        type: 'snapshot',
        tickers: [{
          product_id: 'BTC-USDT',
          price: '65500.00',
          price_percentage_change_24h: '2.35',
          high_24_h: '66000.00',
          low_24_h: '64000.00',
          volume_24_h: '1234.56',
          best_bid: '65499.00',
          best_bid_quantity: '0.5',
          best_ask: '65501.00',
          best_ask_quantity: '0.3',
        }],
      }],
    });

    it('should normalize ticker data', () => {
      const { adapter, ws } = createConnectedAdapter();

      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);

      adapter.subscribeTicker('BTC/USDT');
      ws.simulateMessage(sampleTicker);

      expect(tickers).toHaveLength(1);
      const ticker = tickers[0]!;

      expect(ticker.exchange).toBe('coinbase');
      expect(ticker.symbol).toBe('BTC/USDT');
      expect(ticker.lastPrice).toBeCloseTo(65500);
      expect(ticker.changePercent24h).toBeCloseTo(2.35);
      expect(ticker.high24h).toBeCloseTo(66000);
      expect(ticker.low24h).toBeCloseTo(64000);
      expect(ticker.volume24h).toBeCloseTo(1234.56);
      expect(ticker.bbo.bidPrice).toBeCloseTo(65499);
      expect(ticker.bbo.askPrice).toBeCloseTo(65501);
    });
  });

  describe('Symbol mapping', () => {
    it('should send subscribe with Coinbase symbol format (BTC-USDT)', () => {
      const { adapter, ws } = createConnectedAdapter();

      adapter.subscribeTrades('BTC/USDT');

      const sub = JSON.parse(ws.sentMessages[0]!) as Record<string, unknown>;
      expect(sub['type']).toBe('subscribe');
      expect(sub['channel']).toBe('market_trades');
      expect((sub['product_ids'] as string[])[0]).toBe('BTC-USDT');
    });

    it('should send unsubscribe with correct format', () => {
      const { adapter, ws } = createConnectedAdapter();

      adapter.unsubscribeTrades('ETH/USDT');

      const sub = JSON.parse(ws.sentMessages[0]!) as Record<string, unknown>;
      expect(sub['type']).toBe('unsubscribe');
      expect(sub['channel']).toBe('market_trades');
      expect((sub['product_ids'] as string[])[0]).toBe('ETH-USDT');
    });
  });

  describe('Connection lifecycle', () => {
    it('should clean up on disconnect', async () => {
      const { adapter } = createConnectedAdapter();

      adapter.subscribeTrades('BTC/USDT');
      await adapter.disconnect();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (t) => trades.push(t);
      expect(trades).toHaveLength(0);
    });
  });
});
