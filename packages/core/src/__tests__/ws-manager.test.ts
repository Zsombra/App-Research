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

  // Test helpers to simulate events
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

// Install mock globally
function installMockWebSocket(): void {
  (globalThis as Record<string, unknown>)['WebSocket'] = MockWebSocket;
}

function uninstallMockWebSocket(): void {
  delete (globalThis as Record<string, unknown>)['WebSocket'];
}

describe('WebSocketManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    installMockWebSocket();
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallMockWebSocket();
  });

  it('should start in Disconnected state', () => {
    const manager = new WebSocketManager({ url: 'wss://test.com' });
    expect(manager.state).toBe(ConnectionStatus.Disconnected);
  });

  it('should transition to Connecting then Connected on successful connect', () => {
    const states: ConnectionStatus[] = [];
    const manager = new WebSocketManager({ url: 'wss://test.com' });
    manager.onStateChange = (state) => states.push(state);

    manager.connect();
    expect(manager.state).toBe(ConnectionStatus.Connecting);

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    expect(manager.state).toBe(ConnectionStatus.Connected);
    expect(states).toEqual([ConnectionStatus.Connecting, ConnectionStatus.Connected]);
  });

  it('should transition to Disconnected on intentional disconnect', () => {
    const manager = new WebSocketManager({ url: 'wss://test.com' });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    manager.disconnect();
    expect(manager.state).toBe(ConnectionStatus.Disconnected);
  });

  it('should transition to Reconnecting on unexpected close', () => {
    const manager = new WebSocketManager({ url: 'wss://test.com', maxReconnectAttempts: 3 });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    // Simulate unexpected close (non-1000 code)
    ws.simulateClose(1006);

    expect(manager.state).toBe(ConnectionStatus.Reconnecting);
  });

  it('should attempt reconnection with exponential backoff', () => {
    const manager = new WebSocketManager({
      url: 'wss://test.com',
      maxReconnectAttempts: 5,
      inboundTimeout: 0,
    });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();
    ws.simulateClose(1006);

    expect(manager.state).toBe(ConnectionStatus.Reconnecting);

    // Advance time past first backoff (base 1s + up to 50% jitter = max 1.5s)
    vi.advanceTimersByTime(2000);

    // A new WebSocket should have been created
    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);
    expect(manager.state).toBe(ConnectionStatus.Connecting);
  });

  it('should transition to Error after max reconnect attempts', () => {
    const manager = new WebSocketManager({
      url: 'wss://test.com',
      maxReconnectAttempts: 2,
      inboundTimeout: 0,
    });
    const errors: Error[] = [];
    manager.onError = (err) => errors.push(err);

    manager.connect();

    // First connection fails
    MockWebSocket.instances[0]!.simulateClose(1006);
    expect(manager.state).toBe(ConnectionStatus.Reconnecting);

    // First reconnect attempt
    vi.advanceTimersByTime(2000);
    MockWebSocket.instances[1]!.simulateClose(1006);

    // Second reconnect attempt
    vi.advanceTimersByTime(5000);
    MockWebSocket.instances[2]!.simulateClose(1006);

    // Should now be in Error state (2 reconnect attempts exhausted)
    expect(manager.state).toBe(ConnectionStatus.Error);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should send messages when connected', () => {
    const manager = new WebSocketManager({ url: 'wss://test.com' });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    manager.send('{"test": true}');
    expect(ws.sentMessages).toEqual(['{"test": true}']);
  });

  it('should not send messages when not connected', () => {
    const manager = new WebSocketManager({ url: 'wss://test.com' });
    // Not connected — send should be a no-op
    manager.send('{"test": true}');
    expect(MockWebSocket.instances.length).toBe(0);
  });

  it('should invoke onMessage callback for received messages', () => {
    const messages: string[] = [];
    const manager = new WebSocketManager({ url: 'wss://test.com' });
    manager.onMessage = (data) => messages.push(data);

    manager.connect();
    MockWebSocket.instances[0]!.simulateOpen();
    MockWebSocket.instances[0]!.simulateMessage('{"data": "test"}');

    expect(messages).toEqual(['{"data": "test"}']);
  });

  it('should send heartbeat pings at the configured interval', () => {
    const manager = new WebSocketManager({
      url: 'wss://test.com',
      heartbeatInterval: 5000,
      pingPayload: '{"op":"ping"}',
    });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    vi.advanceTimersByTime(5000);
    expect(ws.sentMessages).toContain('{"op":"ping"}');

    vi.advanceTimersByTime(5000);
    expect(ws.sentMessages.filter((m) => m === '{"op":"ping"}').length).toBe(2);
  });

  it('should close socket on inbound timeout', () => {
    const manager = new WebSocketManager({
      url: 'wss://test.com',
      inboundTimeout: 5000,
      maxReconnectAttempts: 3,
    });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    // No messages for 5 seconds
    vi.advanceTimersByTime(5000);

    // Socket should have been closed (which triggers reconnection via onclose)
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
  });

  it('should reset inbound timer when a message arrives', () => {
    const manager = new WebSocketManager({
      url: 'wss://test.com',
      inboundTimeout: 5000,
    });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    // After 3 seconds, send a message (resets timer)
    vi.advanceTimersByTime(3000);
    ws.simulateMessage('{"heartbeat": true}');

    // After 3 more seconds (6s total), timeout should NOT have fired
    vi.advanceTimersByTime(3000);
    expect(ws.readyState).toBe(MockWebSocket.OPEN);

    // After 5s from the last message, it should close
    vi.advanceTimersByTime(2000);
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
  });

  it('should not reconnect on clean close (code 1000)', () => {
    const manager = new WebSocketManager({
      url: 'wss://test.com',
      maxReconnectAttempts: 5,
    });
    manager.connect();

    const ws = MockWebSocket.instances[0]!;
    ws.simulateOpen();

    ws.simulateClose(1000);
    expect(manager.state).toBe(ConnectionStatus.Disconnected);
  });

  it('should not connect if already connected', () => {
    const manager = new WebSocketManager({ url: 'wss://test.com' });
    manager.connect();
    MockWebSocket.instances[0]!.simulateOpen();

    manager.connect(); // should be a no-op
    expect(MockWebSocket.instances.length).toBe(1);
  });
});
