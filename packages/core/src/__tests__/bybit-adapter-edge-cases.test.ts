import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NormalizedTrade, Ticker } from '@terminal/types';
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

describe('BybitAdapter edge cases', () => {
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

  // -------------------------------------------------------------------------
  // Trade type guard validation
  // -------------------------------------------------------------------------
  describe('trade type guards', () => {
    it('should skip trades where p is not a string', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);
      adapter.subscribeTrades('BTC/USDT');

      const msg = JSON.stringify({
        topic: 'publicTrade.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782136,
        data: [
          { i: '1', T: 1672515782135, p: 23145.50, v: '0.015', S: 'Buy', s: 'BTCUSDT' },
        ],
      });
      ws.simulateMessage(msg);
      expect(trades).toHaveLength(0);
    });

    it('should skip trades where v is not a string', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);
      adapter.subscribeTrades('BTC/USDT');

      const msg = JSON.stringify({
        topic: 'publicTrade.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782136,
        data: [
          { i: '1', T: 1672515782135, p: '23145.50', v: 0.015, S: 'Buy', s: 'BTCUSDT' },
        ],
      });
      ws.simulateMessage(msg);
      expect(trades).toHaveLength(0);
    });

    it('should skip trades where p is null', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);
      adapter.subscribeTrades('BTC/USDT');

      const msg = JSON.stringify({
        topic: 'publicTrade.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782136,
        data: [
          { i: '1', T: 1672515782135, p: null, v: '0.015', S: 'Buy', s: 'BTCUSDT' },
        ],
      });
      ws.simulateMessage(msg);
      expect(trades).toHaveLength(0);
    });

    it('should skip trades with NaN price string', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);
      adapter.subscribeTrades('BTC/USDT');

      const msg = JSON.stringify({
        topic: 'publicTrade.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782136,
        data: [
          { i: '1', T: 1672515782135, p: 'not-a-number', v: '0.015', S: 'Buy', s: 'BTCUSDT' },
        ],
      });
      ws.simulateMessage(msg);
      expect(trades).toHaveLength(0);
    });

    it('should process valid trades alongside invalid ones', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);
      adapter.subscribeTrades('BTC/USDT');

      const msg = JSON.stringify({
        topic: 'publicTrade.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782136,
        data: [
          { i: '1', T: 1672515782135, p: 23145, v: '0.015', S: 'Buy', s: 'BTCUSDT' },    // invalid: p is number
          { i: '2', T: 1672515782136, p: '23150.00', v: '0.100', S: 'Sell', s: 'BTCUSDT' }, // valid
          { i: '3', T: 1672515782137, p: '23155.00', v: null, S: 'Buy', s: 'BTCUSDT' },    // invalid: v is null
        ],
      });
      ws.simulateMessage(msg);
      expect(trades).toHaveLength(1);
      expect(trades[0]!.price).toBeCloseTo(23150);
    });
  });

  // -------------------------------------------------------------------------
  // Ticker NaN validation
  // -------------------------------------------------------------------------
  describe('ticker NaN validation', () => {
    it('should drop ticker when lastPrice is not a valid number string', () => {
      const { adapter, ws } = createConnectedAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      const msg = JSON.stringify({
        topic: 'tickers.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782136,
        data: {
          symbol: 'BTCUSDT',
          lastPrice: 'invalid',
          price24hPcnt: '0.02',
          highPrice24h: '24000',
          lowPrice24h: '22000',
          volume24h: '10000',
          turnover24h: '200000000',
          bid1Price: '23500',
          bid1Size: '1.0',
          ask1Price: '23600',
          ask1Size: '1.0',
        },
      });
      ws.simulateMessage(msg);
      expect(tickers).toHaveLength(0);
    });

    it('should use fallback defaults for missing ticker fields', () => {
      const { adapter, ws } = createConnectedAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      const msg = JSON.stringify({
        topic: 'tickers.BTCUSDT',
        type: 'snapshot',
        ts: 1672515782136,
        data: {
          symbol: 'BTCUSDT',
          lastPrice: '50000.00',
          // All other fields missing or undefined
        },
      });
      ws.simulateMessage(msg);
      expect(tickers).toHaveLength(1);
      const t = tickers[0]!;
      expect(t.lastPrice).toBeCloseTo(50000);
      expect(t.volume24h).toBe(0);
      expect(t.quoteVolume24h).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Symbol normalization edge cases
  // -------------------------------------------------------------------------
  describe('symbol normalization', () => {
    it('should handle USDC-quoted symbols', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);
      adapter.subscribeTrades('BTC/USDC');

      const msg = JSON.stringify({
        topic: 'publicTrade.BTCUSDC',
        type: 'snapshot',
        ts: 1672515782136,
        data: [
          { i: '1', T: 1672515782135, p: '50000.00', v: '1.0', S: 'Buy', s: 'BTCUSDC' },
        ],
      });
      ws.simulateMessage(msg);
      expect(trades).toHaveLength(1);
      expect(trades[0]!.symbol).toBe('BTC/USDC');
    });

    it('should return null for unrecognizable symbols', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      // Subscribe to something then send a message with an unknown symbol format
      adapter.subscribeTrades('BTC/USDT');
      const msg = JSON.stringify({
        topic: 'publicTrade.XYZ',
        type: 'snapshot',
        ts: 1672515782136,
        data: [
          { i: '1', T: 1672515782135, p: '100.00', v: '1.0', S: 'Buy', s: 'XYZ' },
        ],
      });
      ws.simulateMessage(msg);
      // "XYZ" doesn't end in any known quote currency, so toNormalizedSymbol returns null
      expect(trades).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Subscription management
  // -------------------------------------------------------------------------
  describe('subscription management', () => {
    it('should track subscribed trades after subscribeTrades', () => {
      const { adapter, ws } = createConnectedAdapter();

      adapter.subscribeTrades('BTC/USDT');
      adapter.subscribeTrades('ETH/USDT');

      // Should have sent two subscribe messages
      const subs = ws.sentMessages.filter((m) => {
        const parsed = JSON.parse(m) as Record<string, unknown>;
        return parsed['op'] === 'subscribe';
      });
      expect(subs.length).toBe(2);
    });

    it('should clean up subscriptions on disconnect', async () => {
      const { adapter } = createConnectedAdapter();

      adapter.subscribeTrades('BTC/USDT');
      adapter.subscribeOrderbook('ETH/USDT');

      await adapter.disconnect();
      // Internal state should be cleared - no errors on reconnect
    });

    it('should handle unsubscribe for trades', () => {
      const { adapter, ws } = createConnectedAdapter();

      adapter.subscribeTrades('BTC/USDT');
      adapter.unsubscribeTrades('BTC/USDT');

      const unsubs = ws.sentMessages.filter((m) => {
        const parsed = JSON.parse(m) as Record<string, unknown>;
        return parsed['op'] === 'unsubscribe';
      });
      expect(unsubs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // Malformed message handling
  // -------------------------------------------------------------------------
  describe('malformed messages', () => {
    it('should not crash on invalid JSON', () => {
      const { ws } = createConnectedAdapter();
      expect(() => ws.simulateMessage('not valid json {')).not.toThrow();
    });

    it('should ignore messages without topic field', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      ws.simulateMessage(JSON.stringify({ data: { some: 'data' } }));
      expect(trades).toHaveLength(0);
    });

    it('should ignore subscription ack messages', () => {
      const { adapter, ws } = createConnectedAdapter();
      const trades: NormalizedTrade[] = [];
      adapter.onTrade = (trade) => trades.push(trade);

      ws.simulateMessage(JSON.stringify({ op: 'subscribe', ret_msg: '', conn_id: '123' }));
      expect(trades).toHaveLength(0);
    });
  });
});
