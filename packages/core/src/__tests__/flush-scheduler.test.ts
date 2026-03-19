import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkerOutboundMessage } from '@terminal/types';
import { FlushScheduler } from '../worker/flush-scheduler.js';

describe('FlushScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch messages and flush on interval', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 100,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();

    const msg1: WorkerOutboundMessage = {
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    };
    const msg2: WorkerOutboundMessage = {
      type: 'ticker',
      symbol: 'BTC/USDT',
      ticker: {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        lastPrice: 23000,
        changePercent24h: 1.5,
        high24h: 23500,
        low24h: 22500,
        volume24h: 10000,
        quoteVolume24h: 230000000,
        bbo: { bidPrice: 22999, bidSize: 1, askPrice: 23001, askSize: 1 },
      },
    };

    scheduler.enqueue(msg1);
    scheduler.enqueue(msg2);

    // Not flushed yet
    expect(flushed).toHaveLength(0);

    // Advance to flush interval
    vi.advanceTimersByTime(100);

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
    expect(flushed[0]![0]).toBe(msg1);
    expect(flushed[0]![1]).toBe(msg2);
  });

  it('should not flush when buffer is empty', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 100,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();

    vi.advanceTimersByTime(100);
    expect(flushed).toHaveLength(0);

    vi.advanceTimersByTime(100);
    expect(flushed).toHaveLength(0);
  });

  it('should flush immediately when buffer exceeds maxBufferSize', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 1000, // Long interval
      maxBufferSize: 3,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();

    const msg: WorkerOutboundMessage = {
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    };

    scheduler.enqueue(msg);
    scheduler.enqueue(msg);
    expect(flushed).toHaveLength(0);

    scheduler.enqueue(msg); // This should trigger flush (size >= 3)
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(3);
  });

  it('should flush multiple times across intervals', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 50,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();

    const msg: WorkerOutboundMessage = {
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    };

    scheduler.enqueue(msg);
    vi.advanceTimersByTime(50);
    expect(flushed).toHaveLength(1);

    scheduler.enqueue(msg);
    scheduler.enqueue(msg);
    vi.advanceTimersByTime(50);
    expect(flushed).toHaveLength(2);
    expect(flushed[1]).toHaveLength(2);
  });

  it('should flush remaining messages on stop', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 1000,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();

    const msg: WorkerOutboundMessage = {
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    };

    scheduler.enqueue(msg);
    scheduler.enqueue(msg);

    scheduler.stop();
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
  });

  it('should not flush on stop when buffer is empty', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 100,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();

    scheduler.stop();
    expect(flushed).toHaveLength(0);
  });

  it('should not start twice', () => {
    let flushCount = 0;

    const scheduler = new FlushScheduler({
      flushInterval: 100,
      onFlush: () => { flushCount++; },
    });

    scheduler.start();
    scheduler.start(); // Should be a no-op

    scheduler.enqueue({
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    });

    vi.advanceTimersByTime(100);
    expect(flushCount).toBe(1); // Only one flush, not two
  });

  it('should stop periodic flushing after stop', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 100,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();
    scheduler.stop();

    scheduler.enqueue({
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    });

    vi.advanceTimersByTime(200);
    // The message enqueued after stop won't be flushed by interval
    expect(flushed).toHaveLength(0);
  });

  it('should allow restart after stop', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 100,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();
    scheduler.stop();
    scheduler.start(); // restart

    scheduler.enqueue({
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    });

    vi.advanceTimersByTime(100);
    expect(flushed).toHaveLength(1);
    scheduler.stop();
  });

  it('should use default maxBufferSize of 1000', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 10000,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();

    const msg: WorkerOutboundMessage = {
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    };

    // Enqueue 999 — should not flush
    for (let i = 0; i < 999; i++) {
      scheduler.enqueue(msg);
    }
    expect(flushed).toHaveLength(0);

    // 1000th should trigger flush
    scheduler.enqueue(msg);
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(1000);
    scheduler.stop();
  });

  it('should handle stop called multiple times', () => {
    const flushed: WorkerOutboundMessage[][] = [];

    const scheduler = new FlushScheduler({
      flushInterval: 100,
      onFlush: (messages) => flushed.push([...messages]),
    });
    scheduler.start();
    scheduler.enqueue({
      type: 'trade-batch',
      symbol: 'BTC/USDT',
      trades: [],
    });

    scheduler.stop();
    scheduler.stop(); // double stop
    expect(flushed).toHaveLength(1); // only flushed once
  });
});
