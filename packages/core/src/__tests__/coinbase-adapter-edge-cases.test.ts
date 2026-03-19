import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Ticker } from '@terminal/types';
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

  send(data: string): void { this.sentMessages.push(data); }
  close(): void { this.readyState = MockWebSocket.CLOSED; }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({});
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }
}

describe('CoinbaseAdapter edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    (globalThis as Record<string, unknown>)['WebSocket'] = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>)['WebSocket'];
  });

  function createAdapter(): { adapter: CoinbaseAdapter; ws: MockWebSocket } {
    const adapter = new CoinbaseAdapter('wss://test.coinbase.com');
    adapter.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;
    return { adapter, ws };
  }

  describe('ticker type guard on price field', () => {
    it('should skip ticker when price field is not a string', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      ws.simulateMessage(JSON.stringify({
        channel: 'ticker',
        events: [{
          type: 'update',
          tickers: [{
            product_id: 'BTC-USDT',
            price: 50000, // number, not string
            volume_24_h: '1000',
          }],
        }],
      }));

      expect(tickers).toHaveLength(0);
    });

    it('should skip ticker when price is undefined', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      ws.simulateMessage(JSON.stringify({
        channel: 'ticker',
        events: [{
          type: 'update',
          tickers: [{
            product_id: 'BTC-USDT',
            volume_24_h: '1000',
            // price field missing
          }],
        }],
      }));

      expect(tickers).toHaveLength(0);
    });

    it('should skip ticker when price is NaN string', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      ws.simulateMessage(JSON.stringify({
        channel: 'ticker',
        events: [{
          type: 'update',
          tickers: [{
            product_id: 'BTC-USDT',
            price: 'not-a-number',
            volume_24_h: '1000',
          }],
        }],
      }));

      expect(tickers).toHaveLength(0);
    });

    it('should accept valid ticker with string price', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      ws.simulateMessage(JSON.stringify({
        channel: 'ticker',
        events: [{
          type: 'update',
          tickers: [{
            product_id: 'BTC-USDT',
            price: '50000.00',
            price_percentage_change_24h: '2.5',
            high_24_h: '51000.00',
            low_24_h: '49000.00',
            volume_24_h: '5000',
            best_bid: '49999.00',
            best_bid_quantity: '1.5',
            best_ask: '50001.00',
            best_ask_quantity: '2.0',
          }],
        }],
      }));

      expect(tickers).toHaveLength(1);
      expect(tickers[0]!.lastPrice).toBeCloseTo(50000);
      expect(tickers[0]!.high24h).toBeCloseTo(51000);
      expect(tickers[0]!.volume24h).toBeCloseTo(5000);
    });

    it('should use fallback defaults for missing optional ticker fields', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('ETH/USDT');

      ws.simulateMessage(JSON.stringify({
        channel: 'ticker',
        events: [{
          type: 'update',
          tickers: [{
            product_id: 'ETH-USDT',
            price: '3000.00',
            // All other fields missing
          }],
        }],
      }));

      expect(tickers).toHaveLength(1);
      const t = tickers[0]!;
      expect(t.lastPrice).toBeCloseTo(3000);
      expect(t.high24h).toBeCloseTo(3000); // fallback to price
      expect(t.low24h).toBeCloseTo(3000);  // fallback to price
      expect(t.volume24h).toBe(0);
      expect(t.bbo.bidPrice).toBeCloseTo(3000); // fallback to price
      expect(t.bbo.askPrice).toBeCloseTo(3000); // fallback to price
    });
  });

  describe('symbol normalization', () => {
    it('should convert BTC-USDT to BTC/USDT', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      ws.simulateMessage(JSON.stringify({
        channel: 'ticker',
        events: [{
          type: 'update',
          tickers: [{
            product_id: 'BTC-USDT',
            price: '50000.00',
          }],
        }],
      }));

      expect(tickers[0]!.symbol).toBe('BTC/USDT');
    });

    it('should skip events with invalid product_id', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);
      adapter.subscribeTicker('BTC/USDT');

      ws.simulateMessage(JSON.stringify({
        channel: 'ticker',
        events: [{
          type: 'update',
          tickers: [{
            product_id: 'INVALID',
            price: '50000.00',
          }],
        }],
      }));

      expect(tickers).toHaveLength(0);
    });
  });

  describe('malformed messages', () => {
    it('should not crash on invalid JSON', () => {
      const { ws } = createAdapter();
      expect(() => ws.simulateMessage('not valid json')).not.toThrow();
    });

    it('should ignore messages without channel', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);

      ws.simulateMessage(JSON.stringify({ events: [{ data: 'test' }] }));
      expect(tickers).toHaveLength(0);
    });

    it('should ignore messages without events', () => {
      const { adapter, ws } = createAdapter();
      const tickers: Ticker[] = [];
      adapter.onTicker = (t) => tickers.push(t);

      ws.simulateMessage(JSON.stringify({ channel: 'ticker' }));
      expect(tickers).toHaveLength(0);
    });
  });
});
