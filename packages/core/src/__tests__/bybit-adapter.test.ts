import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NormalizedTrade, OrderbookSnapshot, Ticker } from '@terminal/types';
import { BybitAdapter } from '../adapters/bybit/bybit-adapter.js';

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

describe('BybitAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    (globalThis as Record<string, unknown>)['WebSocket'] = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>)['WebSocket'];
  });

  function createConnectedAdapter(): { adapter: BybitAdapter; ws: MockWebSocket } {
    const adapter = new BybitAdapter('wss://test.bybit.com/v5/public/linear');
    adapter.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;
    return { adapter, ws };
  }

  describe('Trade normalization (publicTrade)', () => {
    // Real Bybit publicTrade message sample
    const samplePublicTrade = JSON.stringify({
      topic: 'publicTrade.BTCUSDT',
      type: 'snapshot',
      ts: 1672515782136,
      data: [
        {
          i: '2290000000068683480',
          T: 1672515782135,
          p: '23145.50',
          v: '0.015',
          S: 'Sell',
          s: 'BTCUSDT',
          BT: false,
        },
      ],
    });

    it('should normalize publicTrade to NormalizedTrade', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('BTC/USDT');
      ws.simulateMessage(samplePublicTrade);

      expect(trades).toHaveLength(1);
      const trade = trades[0]!;

      expect(trade.exchange).toBe('bybit');
      expect(trade.symbol).toBe('BTC/USDT');
      expect(trade.price).toBeCloseTo(23145.5);
      expect(trade.amount).toBeCloseTo(0.015);
      expect(trade.side).toBe('sell');
      expect(trade.timestamp).toBe(1672515782135);
      expect(trade.id).toBe('2290000000068683480');
      expect(trade.cost).toBeCloseTo(23145.5 * 0.015);
      expect(trade.liquidation).toBe(false);
    });

    it('should handle Buy side correctly', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('BTC/USDT');

      const buyTrade = JSON.stringify({
        topic: 'publicTrade.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782200,
        data: [
          {
            i: '2290000000068683481',
            T: 1672515782200,
            p: '23150.00',
            v: '0.100',
            S: 'Buy',
            s: 'BTCUSDT',
          },
        ],
      });

      ws.simulateMessage(buyTrade);
      expect(trades[0]!.side).toBe('buy');
    });

    it('should handle multiple trades in a single message', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('ETH/USDT');

      const multiTrade = JSON.stringify({
        topic: 'publicTrade.ETHUSDT',
        type: 'snapshot',
        ts: 1672515782300,
        data: [
          { i: '1', T: 1672515782300, p: '1600.00', v: '1.0', S: 'Buy', s: 'ETHUSDT' },
          { i: '2', T: 1672515782301, p: '1601.00', v: '0.5', S: 'Sell', s: 'ETHUSDT' },
          { i: '3', T: 1672515782302, p: '1599.50', v: '2.0', S: 'Buy', s: 'ETHUSDT' },
        ],
      });

      ws.simulateMessage(multiTrade);
      expect(trades).toHaveLength(3);
      expect(trades[0]!.price).toBeCloseTo(1600);
      expect(trades[1]!.side).toBe('sell');
      expect(trades[2]!.amount).toBeCloseTo(2.0);
    });
  });

  describe('Orderbook normalization', () => {
    const sampleOrderbookSnapshot = JSON.stringify({
      topic: 'orderbook.50.BTCUSDT',
      type: 'snapshot',
      ts: 1672515782136,
      data: {
        s: 'BTCUSDT',
        b: [
          ['23145.00', '1.50'],
          ['23144.00', '2.30'],
        ],
        a: [
          ['23146.00', '1.20'],
          ['23147.00', '3.10'],
        ],
        u: 100,
        seq: 99,
      },
    });

    it('should normalize orderbook snapshot', () => {
      const { adapter, ws } = createConnectedAdapter();

      const snapshots: OrderbookSnapshot[] = [];
      adapter.onOrderbookSnapshot = (s) => snapshots.push(s);

      adapter.subscribeOrderbook('BTC/USDT');
      ws.simulateMessage(sampleOrderbookSnapshot);

      expect(snapshots).toHaveLength(1);
      const snapshot = snapshots[0]!;

      expect(snapshot.exchange).toBe('bybit');
      expect(snapshot.symbol).toBe('BTC/USDT');
      expect(snapshot.bids).toHaveLength(2);
      expect(snapshot.asks).toHaveLength(2);

      // Bids descending
      expect(snapshot.bids[0]!.price).toBeCloseTo(23145);
      expect(snapshot.bids[1]!.price).toBeCloseTo(23144);

      // Asks ascending
      expect(snapshot.asks[0]!.price).toBeCloseTo(23146);
      expect(snapshot.asks[1]!.price).toBeCloseTo(23147);
    });

    it('should apply orderbook deltas', () => {
      const { adapter, ws } = createConnectedAdapter();

      const snapshots: OrderbookSnapshot[] = [];
      adapter.onOrderbookSnapshot = (s) => snapshots.push(s);

      adapter.subscribeOrderbook('BTC/USDT');

      // First, send a snapshot
      ws.simulateMessage(sampleOrderbookSnapshot);

      // Then, send a delta
      const delta = JSON.stringify({
        topic: 'orderbook.50.BTCUSDT',
        type: 'delta',
        ts: 1672515782200,
        data: {
          s: 'BTCUSDT',
          b: [
            ['23145.00', '2.00'], // Update existing bid
            ['23143.00', '0.80'], // New bid level
          ],
          a: [
            ['23146.00', '0'], // Remove ask level
          ],
          u: 101,
          seq: 100,
        },
      });

      ws.simulateMessage(delta);

      expect(snapshots).toHaveLength(2);
      const updated = snapshots[1]!;

      // Updated bid
      expect(updated.bids[0]!.price).toBeCloseTo(23145);
      expect(updated.bids[0]!.size).toBeCloseTo(2.0);

      // New bid level
      expect(updated.bids.length).toBe(3);

      // Removed ask
      expect(updated.asks.find((a) => a.price === 23146)).toBeUndefined();
    });
  });

  describe('Ticker normalization', () => {
    const sampleTicker = JSON.stringify({
      topic: 'tickers.BTCUSDT',
      type: 'snapshot',
      ts: 1672515782136,
      cs: 123456,
      data: {
        symbol: 'BTCUSDT',
        lastPrice: '23600.00',
        price24hPcnt: '0.0215',
        highPrice24h: '23700.00',
        lowPrice24h: '22900.00',
        volume24h: '12345.678',
        turnover24h: '285000000.00',
        bid1Price: '23599.00',
        bid1Size: '5.00',
        ask1Price: '23601.00',
        ask1Size: '3.00',
      },
    });

    it('should normalize ticker data', () => {
      const { adapter, ws } = createConnectedAdapter();

      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);

      adapter.subscribeTicker('BTC/USDT');
      ws.simulateMessage(sampleTicker);

      expect(tickers).toHaveLength(1);
      const ticker = tickers[0]!;

      expect(ticker.exchange).toBe('bybit');
      expect(ticker.symbol).toBe('BTC/USDT');
      expect(ticker.lastPrice).toBeCloseTo(23600);
      expect(ticker.changePercent24h).toBeCloseTo(2.15);
      expect(ticker.high24h).toBeCloseTo(23700);
      expect(ticker.low24h).toBeCloseTo(22900);
      expect(ticker.volume24h).toBeCloseTo(12345.678);
      expect(ticker.bbo.bidPrice).toBeCloseTo(23599);
      expect(ticker.bbo.askPrice).toBeCloseTo(23601);
    });
  });

  describe('Ping/pong', () => {
    it('should send ping every 20 seconds', () => {
      const { ws } = createConnectedAdapter();

      vi.advanceTimersByTime(20_000);
      const pings = ws.sentMessages.filter((m) => m === '{"op":"ping"}');
      expect(pings.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore pong responses', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      // Pong message should not produce trade output
      ws.simulateMessage(JSON.stringify({ ret_msg: 'pong', op: 'pong' }));
      expect(trades).toHaveLength(0);
    });
  });

  describe('Symbol mapping', () => {
    it('should send subscribe with correct Bybit format', () => {
      const { adapter, ws } = createConnectedAdapter();

      adapter.subscribeTrades('ETH/USDT');

      const sub = JSON.parse(ws.sentMessages[0]!) as Record<string, unknown>;
      expect(sub['op']).toBe('subscribe');
      expect((sub['args'] as string[])[0]).toBe('publicTrade.ETHUSDT');
    });
  });
});
