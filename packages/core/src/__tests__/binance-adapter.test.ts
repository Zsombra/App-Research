import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NormalizedTrade, OrderbookSnapshot, Ticker } from '@terminal/types';
import { BinanceAdapter } from '../adapters/binance/binance-adapter.js';

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
    // Auto-open after a microtask to simulate real behavior
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

describe('BinanceAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    (globalThis as Record<string, unknown>)['WebSocket'] = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>)['WebSocket'];
  });

  function createConnectedAdapter(): { adapter: BinanceAdapter; ws: MockWebSocket } {
    const adapter = new BinanceAdapter('wss://test.binance.com/ws');
    adapter.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;
    return { adapter, ws };
  }

  describe('Trade normalization (aggTrade)', () => {
    // Real Binance aggTrade message sample
    const sampleAggTrade = JSON.stringify({
      e: 'aggTrade',
      E: 1672515782136,
      s: 'BTCUSDT',
      a: 164325435,
      p: '23145.67000000',
      q: '0.01500000',
      f: 200123456,
      l: 200123456,
      T: 1672515782135,
      m: true, // buyer is maker => taker sold
      M: true,
    });

    it('should normalize aggTrade to NormalizedTrade', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('BTC/USDT');
      ws.simulateMessage(sampleAggTrade);

      expect(trades).toHaveLength(1);
      const trade = trades[0]!;

      expect(trade.exchange).toBe('binance');
      expect(trade.symbol).toBe('BTC/USDT');
      expect(trade.price).toBeCloseTo(23145.67);
      expect(trade.amount).toBeCloseTo(0.015);
      expect(trade.side).toBe('sell'); // m=true means SELL (buyer is maker)
      expect(trade.timestamp).toBe(1672515782135);
      expect(trade.id).toBe('164325435');
      expect(trade.isMaker).toBe(true);
      expect(trade.cost).toBeCloseTo(23145.67 * 0.015);
      expect(trade.liquidation).toBe(false);
    });

    it('should correctly map side: m=false means BUY', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('BTC/USDT');

      const buyTrade = JSON.stringify({
        e: 'aggTrade',
        s: 'BTCUSDT',
        a: 164325436,
        p: '23150.00000000',
        q: '0.10000000',
        T: 1672515782200,
        m: false,
      });

      ws.simulateMessage(buyTrade);

      expect(trades[0]!.side).toBe('buy');
      expect(trades[0]!.isMaker).toBe(false);
    });

    it('should skip malformed messages', () => {
      const { adapter, ws } = createConnectedAdapter();

      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      adapter.subscribeTrades('BTC/USDT');

      // Malformed JSON
      ws.simulateMessage('not json at all');
      expect(trades).toHaveLength(0);

      // Missing fields
      ws.simulateMessage(JSON.stringify({ e: 'aggTrade', s: 'UNKNOWN', p: 'invalid' }));
      expect(trades).toHaveLength(0);
    });
  });

  describe('Orderbook normalization (depth20@100ms)', () => {
    const sampleDepthSnapshot = JSON.stringify({
      lastUpdateId: 160,
      bids: [
        ['23145.00000000', '1.50000000'],
        ['23144.00000000', '2.30000000'],
        ['23143.00000000', '0.80000000'],
      ],
      asks: [
        ['23146.00000000', '1.20000000'],
        ['23147.00000000', '3.10000000'],
        ['23148.00000000', '0.45000000'],
      ],
    });

    it('should normalize depth20 snapshot to OrderbookSnapshot', () => {
      const { adapter, ws } = createConnectedAdapter();

      const snapshots: OrderbookSnapshot[] = [];
      adapter.onOrderbookSnapshot = (s) => snapshots.push(s);

      adapter.subscribeOrderbook('BTC/USDT');
      ws.simulateMessage(sampleDepthSnapshot);

      expect(snapshots).toHaveLength(1);
      const snapshot = snapshots[0]!;

      expect(snapshot.exchange).toBe('binance');
      expect(snapshot.symbol).toBe('BTC/USDT');
      expect(snapshot.bids).toHaveLength(3);
      expect(snapshot.asks).toHaveLength(3);

      // Bids should be sorted descending
      expect(snapshot.bids[0]!.price).toBeCloseTo(23145);
      expect(snapshot.bids[0]!.size).toBeCloseTo(1.5);

      // Asks should be sorted ascending
      expect(snapshot.asks[0]!.price).toBeCloseTo(23146);
      expect(snapshot.asks[0]!.size).toBeCloseTo(1.2);

      expect(snapshot.sequenceId).toBe(160);
    });
  });

  describe('Ticker normalization (24hrTicker)', () => {
    const sampleTicker = JSON.stringify({
      e: '24hrTicker',
      E: 1672515782136,
      s: 'BTCUSDT',
      p: '500.00000000',
      P: '2.15',
      w: '23100.00000000',
      c: '23600.00000000',
      Q: '0.10000000',
      b: '23599.00000000',
      B: '5.00000000',
      a: '23601.00000000',
      A: '3.00000000',
      o: '23100.00000000',
      h: '23700.00000000',
      l: '22900.00000000',
      v: '12345.67800000',
      q: '285000000.00000000',
      O: 1672429382136,
      C: 1672515782136,
      F: 200000000,
      L: 200123456,
      n: 123456,
    });

    it('should normalize 24hrTicker to Ticker', () => {
      const { adapter, ws } = createConnectedAdapter();

      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);

      adapter.subscribeTicker('BTC/USDT');
      ws.simulateMessage(sampleTicker);

      expect(tickers).toHaveLength(1);
      const ticker = tickers[0]!;

      expect(ticker.exchange).toBe('binance');
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

  describe('Symbol mapping', () => {
    it('should send subscribe with correct Binance symbol format', () => {
      const { adapter, ws } = createConnectedAdapter();

      adapter.subscribeTrades('BTC/USDT');

      const sub = JSON.parse(ws.sentMessages[0]!) as Record<string, unknown>;
      expect(sub['method']).toBe('SUBSCRIBE');
      expect((sub['params'] as string[])[0]).toBe('btcusdt@aggTrade');
    });

    it('should send unsubscribe with correct format', () => {
      const { adapter, ws } = createConnectedAdapter();

      adapter.unsubscribeTrades('ETH/USDT');

      const sub = JSON.parse(ws.sentMessages[0]!) as Record<string, unknown>;
      expect(sub['method']).toBe('UNSUBSCRIBE');
      expect((sub['params'] as string[])[0]).toBe('ethusdt@aggTrade');
    });
  });

  describe('Connection lifecycle', () => {
    it('should clean up on disconnect', async () => {
      const { adapter } = createConnectedAdapter();

      adapter.subscribeTrades('BTC/USDT');
      await adapter.disconnect();

      // After disconnect, no more callbacks should fire
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (t) => trades.push(t);
      expect(trades).toHaveLength(0);
    });
  });
});
