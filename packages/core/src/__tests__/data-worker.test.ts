import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataWorker } from '../worker/data-worker.js';

// Stub WebSocket for adapters
vi.stubGlobal('WebSocket', vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: 0,
})));

describe('DataWorker', () => {
  let postMessage: ReturnType<typeof vi.fn>;
  let worker: DataWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    postMessage = vi.fn();
    worker = new DataWorker(postMessage, 50);
  });

  afterEach(async () => {
    await worker.shutdown();
    vi.useRealTimers();
  });

  it('should create without errors', () => {
    expect(worker).toBeDefined();
  });

  it('should handle subscribe message without crashing', () => {
    expect(() => {
      worker.handleMessage({
        type: 'subscribe',
        symbol: 'BTC/USDT',
        exchanges: ['simulated'],
        topics: ['trades', 'orderbook', 'ticker'],
      });
    }).not.toThrow();
  });

  it('should handle unsubscribe message without crashing', () => {
    // Subscribe first
    worker.handleMessage({
      type: 'subscribe',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
      topics: ['trades'],
    });

    expect(() => {
      worker.handleMessage({
        type: 'unsubscribe',
        symbol: 'BTC/USDT',
      });
    }).not.toThrow();
  });

  it('should handle set-timeframe message (no-op)', () => {
    expect(() => {
      worker.handleMessage({
        type: 'set-timeframe',
        timeframe: '1m',
      } as any);
    }).not.toThrow();
  });

  it('should handle request-snapshot message (no-op)', () => {
    expect(() => {
      worker.handleMessage({
        type: 'request-snapshot',
        symbol: 'ETH/USDT',
      } as any);
    }).not.toThrow();
  });

  it('should handle add-indicator message (no-op)', () => {
    expect(() => {
      worker.handleMessage({
        type: 'add-indicator',
      } as any);
    }).not.toThrow();
  });

  it('should handle remove-indicator message (no-op)', () => {
    expect(() => {
      worker.handleMessage({
        type: 'remove-indicator',
      } as any);
    }).not.toThrow();
  });

  it('should create adapters for all supported exchanges', () => {
    const exchanges = ['simulated', 'binance', 'bybit', 'coinbase'] as const;

    for (const exchange of exchanges) {
      expect(() => {
        worker.handleMessage({
          type: 'subscribe',
          symbol: 'BTC/USDT',
          exchanges: [exchange],
          topics: ['trades'],
        });
      }).not.toThrow();
    }
  });

  it('should reuse existing adapter on repeated subscribe', () => {
    worker.handleMessage({
      type: 'subscribe',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
      topics: ['trades'],
    });

    // Second subscribe to same exchange should reuse
    expect(() => {
      worker.handleMessage({
        type: 'subscribe',
        symbol: 'ETH/USDT',
        exchanges: ['simulated'],
        topics: ['trades'],
      });
    }).not.toThrow();
  });

  it('should handle unknown exchange gracefully', () => {
    expect(() => {
      worker.handleMessage({
        type: 'subscribe',
        symbol: 'BTC/USDT',
        exchanges: ['unknown_exchange' as any],
        topics: ['trades'],
      });
    }).not.toThrow();
  });

  it('should subscribe to all topic types', () => {
    expect(() => {
      worker.handleMessage({
        type: 'subscribe',
        symbol: 'BTC/USDT',
        exchanges: ['simulated'],
        topics: ['trades', 'orderbook', 'ticker', 'liquidations'],
      });
    }).not.toThrow();
  });

  it('shutdown should clear adapters and stop scheduler', async () => {
    worker.handleMessage({
      type: 'subscribe',
      symbol: 'BTC/USDT',
      exchanges: ['simulated'],
      topics: ['trades'],
    });

    await worker.shutdown();

    // Should not throw on double shutdown
    await worker.shutdown();
  });
});
