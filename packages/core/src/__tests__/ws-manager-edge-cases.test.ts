import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionStatus } from '@terminal/types';
import { WebSocketManager } from '../ws/ws-manager.js';

// --- Mock WebSocket ---

type MockWSListener = ((event: Record<string, unknown>) => void) | null;

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];
  static shouldThrowOnConstruct = false;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;

  onopen: MockWSListener = null;
  onclose: MockWSListener = null;
  onerror: MockWSListener = null;
  onmessage: MockWSListener = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    if (MockWebSocket.shouldThrowOnConstruct) {
      throw new Error('WebSocket constructor failed');
    }
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code ?? 1000, reason: reason ?? '' });
    }
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({});
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  simulateClose(code: number = 1006, reason: string = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  simulateError(): void {
    this.onerror?.({});
  }
}

describe('WebSocketManager edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    MockWebSocket.shouldThrowOnConstruct = false;
    (globalThis as Record<string, unknown>)['WebSocket'] = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>)['WebSocket'];
  });

  // -------------------------------------------------------------------------
  // Constructor exception handling
  // -------------------------------------------------------------------------
  describe('WebSocket constructor failure', () => {
    it('should handle constructor throwing and trigger reconnection', () => {
      MockWebSocket.shouldThrowOnConstruct = true;

      const manager = new WebSocketManager({
        url: 'wss://bad.url',
        maxReconnectAttempts: 2,
        inboundTimeout: 0,
      });

      manager.connect();

      // Constructor throws → handleConnectionFailure → Reconnecting
      expect(manager.state).toBe(ConnectionStatus.Reconnecting);
    });

    it('should enter Error state after constructor keeps failing', () => {
      MockWebSocket.shouldThrowOnConstruct = true;

      const errors: Error[] = [];
      const manager = new WebSocketManager({
        url: 'wss://bad.url',
        maxReconnectAttempts: 1,
        inboundTimeout: 0,
      });
      manager.onError = (err) => errors.push(err);

      manager.connect();
      expect(manager.state).toBe(ConnectionStatus.Reconnecting);

      // Advance past backoff → second attempt also fails
      vi.advanceTimersByTime(5000);
      expect(manager.state).toBe(ConnectionStatus.Error);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // onerror + onclose sequence
  // -------------------------------------------------------------------------
  describe('error then close sequence', () => {
    it('fires onError callback then reconnects via onclose', () => {
      const errors: Error[] = [];
      const manager = new WebSocketManager({
        url: 'wss://test.com',
        maxReconnectAttempts: 3,
        inboundTimeout: 0,
      });
      manager.onError = (err) => errors.push(err);

      manager.connect();
      const ws = MockWebSocket.instances[0]!;
      ws.simulateOpen();

      // Error fires first, then close
      ws.simulateError();
      expect(errors).toHaveLength(1);

      ws.simulateClose(1006);
      expect(manager.state).toBe(ConnectionStatus.Reconnecting);
    });
  });

  // -------------------------------------------------------------------------
  // Recovery from Error state
  // -------------------------------------------------------------------------
  describe('recovery from Error state', () => {
    it('can reconnect after entering Error state by calling connect()', () => {
      const manager = new WebSocketManager({
        url: 'wss://test.com',
        maxReconnectAttempts: 1,
        inboundTimeout: 0,
      });

      manager.connect();
      // First connection fails
      MockWebSocket.instances[0]!.simulateClose(1006);
      expect(manager.state).toBe(ConnectionStatus.Reconnecting);

      // Reconnect attempt fires, also fails
      vi.advanceTimersByTime(5000);
      MockWebSocket.instances[1]!.simulateClose(1006);

      // Now exhausted → Error
      expect(manager.state).toBe(ConnectionStatus.Error);

      // Manual reconnect should work
      manager.connect();
      expect(manager.state).toBe(ConnectionStatus.Connecting);

      MockWebSocket.instances[2]!.simulateOpen();
      expect(manager.state).toBe(ConnectionStatus.Connected);
    });
  });

  // -------------------------------------------------------------------------
  // Disconnect during reconnect backoff
  // -------------------------------------------------------------------------
  describe('disconnect during reconnect', () => {
    it('disconnect cancels pending reconnect', () => {
      const manager = new WebSocketManager({
        url: 'wss://test.com',
        maxReconnectAttempts: 5,
        inboundTimeout: 0,
      });

      manager.connect();
      MockWebSocket.instances[0]!.simulateOpen();
      MockWebSocket.instances[0]!.simulateClose(1006);
      expect(manager.state).toBe(ConnectionStatus.Reconnecting);

      manager.disconnect();
      expect(manager.state).toBe(ConnectionStatus.Disconnected);

      // Advance past backoff - no new connection should be created
      const countBefore = MockWebSocket.instances.length;
      vi.advanceTimersByTime(60000);
      expect(MockWebSocket.instances.length).toBe(countBefore);
    });
  });

  // -------------------------------------------------------------------------
  // Message rate monitoring
  // -------------------------------------------------------------------------
  describe('message rate tracking', () => {
    it('tracks messages per second', () => {
      const manager = new WebSocketManager({ url: 'wss://test.com' });
      manager.connect();
      MockWebSocket.instances[0]!.simulateOpen();

      // Send 5 messages
      for (let i = 0; i < 5; i++) {
        MockWebSocket.instances[0]!.simulateMessage(`msg-${i}`);
      }

      // Rate hasn't been computed yet (needs 1s interval)
      expect(manager.messagesPerSecond).toBe(0);

      // After 1 second, rate should be 5
      vi.advanceTimersByTime(1000);
      expect(manager.messagesPerSecond).toBe(5);
    });

    it('resets message rate on reconnection', () => {
      const manager = new WebSocketManager({
        url: 'wss://test.com',
        maxReconnectAttempts: 3,
        inboundTimeout: 0,
      });
      manager.connect();
      MockWebSocket.instances[0]!.simulateOpen();

      // Send messages
      for (let i = 0; i < 10; i++) {
        MockWebSocket.instances[0]!.simulateMessage(`msg-${i}`);
      }
      vi.advanceTimersByTime(1000);
      expect(manager.messagesPerSecond).toBe(10);

      // Reconnect
      MockWebSocket.instances[0]!.simulateClose(1006);
      vi.advanceTimersByTime(5000);
      MockWebSocket.instances[1]!.simulateOpen();

      // Rate should be reset
      vi.advanceTimersByTime(1000);
      expect(manager.messagesPerSecond).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple rapid connects
  // -------------------------------------------------------------------------
  describe('rapid connect calls', () => {
    it('multiple connect() calls while Connecting are no-ops', () => {
      const manager = new WebSocketManager({ url: 'wss://test.com' });

      manager.connect();
      manager.connect();
      manager.connect();

      expect(MockWebSocket.instances.length).toBe(1);
    });

    it('connect during Reconnecting does not create extra sockets', () => {
      const manager = new WebSocketManager({
        url: 'wss://test.com',
        maxReconnectAttempts: 5,
        inboundTimeout: 0,
      });
      manager.connect();
      MockWebSocket.instances[0]!.simulateOpen();
      MockWebSocket.instances[0]!.simulateClose(1006);

      expect(manager.state).toBe(ConnectionStatus.Reconnecting);

      // Connect while reconnecting — goes back to Connecting state
      manager.connect();
      expect(manager.state).toBe(ConnectionStatus.Connecting);
    });
  });

  // -------------------------------------------------------------------------
  // Send during various states
  // -------------------------------------------------------------------------
  describe('send in non-open states', () => {
    it('send during Connecting is silently dropped', () => {
      const manager = new WebSocketManager({ url: 'wss://test.com' });
      manager.connect();
      // Still connecting, not open
      manager.send('{"test": true}');
      expect(MockWebSocket.instances[0]!.sentMessages).toHaveLength(0);
    });

    it('send after disconnect is silently dropped', () => {
      const manager = new WebSocketManager({ url: 'wss://test.com' });
      manager.connect();
      MockWebSocket.instances[0]!.simulateOpen();
      manager.disconnect();

      manager.send('{"test": true}');
      // Should not throw
      expect(manager.state).toBe(ConnectionStatus.Disconnected);
    });
  });

  // -------------------------------------------------------------------------
  // Heartbeat edge cases
  // -------------------------------------------------------------------------
  describe('heartbeat edge cases', () => {
    it('no heartbeat when interval is 0', () => {
      const manager = new WebSocketManager({
        url: 'wss://test.com',
        heartbeatInterval: 0,
      });
      manager.connect();
      MockWebSocket.instances[0]!.simulateOpen();

      vi.advanceTimersByTime(60000);
      expect(MockWebSocket.instances[0]!.sentMessages).toHaveLength(0);
    });

    it('heartbeat stops after disconnect', () => {
      const manager = new WebSocketManager({
        url: 'wss://test.com',
        heartbeatInterval: 1000,
        pingPayload: '{"op":"ping"}',
      });
      manager.connect();
      MockWebSocket.instances[0]!.simulateOpen();

      vi.advanceTimersByTime(1000);
      expect(MockWebSocket.instances[0]!.sentMessages).toHaveLength(1);

      manager.disconnect();

      // No more pings should be sent (heartbeat timer cleared)
      vi.advanceTimersByTime(10000);
      // sentMessages stays at 1
      expect(MockWebSocket.instances[0]!.sentMessages).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // State change deduplication
  // -------------------------------------------------------------------------
  describe('state change deduplication', () => {
    it('does not fire onStateChange for same state', () => {
      const states: ConnectionStatus[] = [];
      const manager = new WebSocketManager({ url: 'wss://test.com' });
      manager.onStateChange = (s) => states.push(s);

      manager.connect();
      expect(states).toEqual([ConnectionStatus.Connecting]);

      // Calling connect again while Connecting does not re-fire
      manager.connect();
      expect(states).toEqual([ConnectionStatus.Connecting]);
    });
  });
});
