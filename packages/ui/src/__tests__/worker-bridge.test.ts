import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Worker
const mockWorkerInstance = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: ErrorEvent) => void) | null,
};
vi.stubGlobal('Worker', vi.fn(() => mockWorkerInstance));

import { WorkerBridge, getWorkerBridge, resetWorkerBridge } from '../worker/worker-bridge.js';

describe('WorkerBridge', () => {
  let bridge: WorkerBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkerInstance.onmessage = null;
    mockWorkerInstance.onerror = null;
    bridge = new WorkerBridge();
  });

  afterEach(() => {
    bridge.terminate();
    resetWorkerBridge();
  });

  it('should not be running before start()', () => {
    expect(bridge.isRunning).toBe(false);
  });

  it('should be running after start()', () => {
    bridge.start();
    expect(bridge.isRunning).toBe(true);
    expect(Worker).toHaveBeenCalledOnce();
  });

  it('should not spawn a second worker on double start()', () => {
    bridge.start();
    bridge.start();
    expect(Worker).toHaveBeenCalledOnce();
  });

  it('should throw when sending before start()', () => {
    expect(() => bridge.send({ type: 'unsubscribe', symbol: 'BTC/USDT' })).toThrow(
      'WorkerBridge: worker not started'
    );
  });

  it('should post messages to the worker', () => {
    bridge.start();
    const msg = { type: 'subscribe' as const, symbol: 'BTC/USDT', exchanges: ['binance' as const], topics: ['trades' as const] };
    bridge.send(msg);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(msg);
  });

  it('should route worker messages to listeners', () => {
    bridge.start();
    const listener = vi.fn();
    bridge.onMessage(listener);

    const outMsg = { type: 'ticker' as const, symbol: 'BTC/USDT', ticker: {} as never };
    // Simulate worker message
    mockWorkerInstance.onmessage!({ data: outMsg } as MessageEvent);

    expect(listener).toHaveBeenCalledWith(outMsg);
  });

  it('should stop delivering to removed listeners', () => {
    bridge.start();
    const listener = vi.fn();
    bridge.onMessage(listener);
    bridge.offMessage(listener);

    mockWorkerInstance.onmessage!({ data: { type: 'error', code: 'X', message: 'Y' } } as never);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should route error events to error listeners', () => {
    bridge.start();
    const errorListener = vi.fn();
    bridge.onError(errorListener);

    const errorEvent = new ErrorEvent('error', { message: 'test error' });
    mockWorkerInstance.onerror!(errorEvent);

    expect(errorListener).toHaveBeenCalledWith(errorEvent);
  });

  it('should terminate the worker', () => {
    bridge.start();
    expect(bridge.isRunning).toBe(true);
    bridge.terminate();
    expect(bridge.isRunning).toBe(false);
    expect(mockWorkerInstance.terminate).toHaveBeenCalled();
  });

  it('should be safe to terminate twice', () => {
    bridge.start();
    bridge.terminate();
    bridge.terminate(); // no-op
    expect(mockWorkerInstance.terminate).toHaveBeenCalledOnce();
  });

  it('should not restart after terminate', () => {
    bridge.start();
    bridge.terminate();
    bridge.start(); // should be no-op since disposed
    expect(bridge.isRunning).toBe(false);
  });
});

describe('getWorkerBridge singleton', () => {
  afterEach(() => {
    resetWorkerBridge();
  });

  it('should return the same instance on repeated calls', () => {
    const a = getWorkerBridge();
    const b = getWorkerBridge();
    expect(a).toBe(b);
    expect(a.isRunning).toBe(true);
  });

  it('should create a new instance after reset', () => {
    const a = getWorkerBridge();
    resetWorkerBridge();
    const b = getWorkerBridge();
    expect(a).not.toBe(b);
  });
});
