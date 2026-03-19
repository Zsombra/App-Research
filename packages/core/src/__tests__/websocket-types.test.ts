import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getWebSocketConstructor,
  WS_CONNECTING,
  WS_OPEN,
  WS_CLOSING,
  WS_CLOSED,
} from '../ws/websocket-types.js';

describe('WebSocket readyState constants', () => {
  it('should have correct values matching the WebSocket spec', () => {
    expect(WS_CONNECTING).toBe(0);
    expect(WS_OPEN).toBe(1);
    expect(WS_CLOSING).toBe(2);
    expect(WS_CLOSED).toBe(3);
  });

  it('should be distinct values', () => {
    const values = new Set([WS_CONNECTING, WS_OPEN, WS_CLOSING, WS_CLOSED]);
    expect(values.size).toBe(4);
  });
});

describe('getWebSocketConstructor', () => {
  const original = (globalThis as Record<string, unknown>)['WebSocket'];

  afterEach(() => {
    if (original !== undefined) {
      (globalThis as Record<string, unknown>)['WebSocket'] = original;
    } else {
      delete (globalThis as Record<string, unknown>)['WebSocket'];
    }
  });

  it('should throw when WebSocket is not available', () => {
    const saved = (globalThis as Record<string, unknown>)['WebSocket'];
    delete (globalThis as Record<string, unknown>)['WebSocket'];

    expect(() => getWebSocketConstructor()).toThrow(
      'WebSocket is not available in this environment'
    );

    // Restore
    if (saved !== undefined) {
      (globalThis as Record<string, unknown>)['WebSocket'] = saved;
    }
  });

  it('should return WebSocket constructor when available', () => {
    const MockWS = class {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;
      readonly readyState = 0;
      onopen = null;
      onclose = null;
      onerror = null;
      onmessage = null;
      constructor(_url: string) {}
      send(_data: string) {}
      close() {}
    };

    (globalThis as Record<string, unknown>)['WebSocket'] = MockWS;

    const result = getWebSocketConstructor();
    expect(result).toBe(MockWS);
  });
});
