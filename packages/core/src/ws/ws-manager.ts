import { ConnectionStatus } from '@terminal/types';
import type { IWebSocket, WSMessageEvent, WSCloseEvent } from './websocket-types.js';
import { getWebSocketConstructor, WS_OPEN, WS_CONNECTING } from './websocket-types.js';

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_INBOUND_TIMEOUT_MS = 60_000;
const BACKOFF_BASE_DELAY_MS = 1000;
const BACKOFF_MAX_DELAY_MS = 30_000;
const BACKOFF_JITTER = 0.5;
const MESSAGE_RATE_INTERVAL_MS = 1000;

/**
 * Configuration for the WebSocketManager.
 */
export interface WebSocketManagerConfig {
  /** WebSocket endpoint URL */
  url: string;
  /** Interval in ms between heartbeat pings. 0 = no client pings. */
  heartbeatInterval?: number;
  /** Maximum number of reconnect attempts before entering Error state. Default 10. */
  maxReconnectAttempts?: number;
  /** Payload to send as a client ping. null = WS-level ping (not available in browser). */
  pingPayload?: string | null;
  /** Timeout in ms for receiving any inbound message. Default 60000. */
  inboundTimeout?: number;
}

/**
 * Manages a raw WebSocket connection with automatic reconnection,
 * exponential backoff with jitter, heartbeat monitoring, and
 * connection state tracking.
 */
export class WebSocketManager {
  private readonly url: string;
  private readonly heartbeatInterval: number;
  private readonly maxReconnectAttempts: number;
  private readonly pingPayload: string | null;
  private readonly inboundTimeout: number;

  private ws: IWebSocket | null = null;
  private _state: ConnectionStatus = ConnectionStatus.Disconnected;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private inboundTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  private messageCount = 0;
  private messageCountResetTimer: ReturnType<typeof setInterval> | null = null;
  private _messagesPerSecond = 0;

  /** Callback invoked when a message is received. */
  onMessage: ((data: string) => void) | null = null;
  /** Callback invoked when the connection state changes. */
  onStateChange: ((state: ConnectionStatus) => void) | null = null;
  /** Callback invoked when an error occurs. */
  onError: ((error: Error) => void) | null = null;

  constructor(config: WebSocketManagerConfig) {
    this.url = config.url;
    this.heartbeatInterval = config.heartbeatInterval ?? 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
    this.pingPayload = config.pingPayload ?? null;
    this.inboundTimeout = config.inboundTimeout ?? DEFAULT_INBOUND_TIMEOUT_MS;
  }

  /** Current connection state. */
  get state(): ConnectionStatus {
    return this._state;
  }

  /** Approximate messages received per second over the last interval. */
  get messagesPerSecond(): number {
    return this._messagesPerSecond;
  }

  /**
   * Initiates a WebSocket connection. Transitions state to Connecting.
   */
  connect(): void {
    if (
      this._state === ConnectionStatus.Connected ||
      this._state === ConnectionStatus.Connecting
    ) {
      return;
    }
    // Clear any pending reconnect timer to avoid racing with the new connection
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.intentionalDisconnect = false;
    this.reconnectAttempt = 0;
    this.openSocket();
  }

  /**
   * Gracefully disconnects the WebSocket. Does not trigger reconnection.
   */
  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearAllTimers();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      if (
        this.ws.readyState === WS_OPEN ||
        this.ws.readyState === WS_CONNECTING
      ) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    this.setState(ConnectionStatus.Disconnected);
  }

  /**
   * Sends a string message over the WebSocket.
   * Silently drops if the connection is not open.
   */
  send(data: string): void {
    if (!this.ws || this.ws.readyState !== WS_OPEN) {
      return;
    }
    this.ws.send(data);
  }

  private openSocket(): void {
    this.setState(ConnectionStatus.Connecting);
    try {
      const WSConstructor = getWebSocketConstructor();
      this.ws = new WSConstructor(this.url);
    } catch {
      this.handleConnectionFailure();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setState(ConnectionStatus.Connected);
      this.startHeartbeat();
      this.resetInboundTimer();
      this.startMessageRateMonitor();
    };

    this.ws.onmessage = (event: WSMessageEvent) => {
      this.messageCount++;
      this.resetInboundTimer();
      const data = typeof event.data === 'string' ? event.data : String(event.data);
      this.onMessage?.(data);
    };

    this.ws.onclose = (event: WSCloseEvent) => {
      this.clearHeartbeat();
      this.clearInboundTimer();
      if (this.intentionalDisconnect || event.code === 1000) {
        this.setState(ConnectionStatus.Disconnected);
        return;
      }
      this.handleConnectionFailure();
    };

    this.ws.onerror = () => {
      this.onError?.(new Error(`WebSocket error on ${this.url}`));
      // onclose will fire after onerror; reconnection handled there
    };
  }

  private handleConnectionFailure(): void {
    if (this.intentionalDisconnect) {
      return;
    }
    if (
      this.maxReconnectAttempts > 0 &&
      this.reconnectAttempt >= this.maxReconnectAttempts
    ) {
      this.setState(ConnectionStatus.Error);
      this.onError?.(
        new Error(
          `Max reconnect attempts (${this.maxReconnectAttempts}) exceeded for ${this.url}`
        )
      );
      return;
    }
    this.setState(ConnectionStatus.Reconnecting);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const delay = this.computeBackoff(this.reconnectAttempt);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  /**
   * Exponential backoff with jitter.
   * delay = min(baseDelay * 2^attempt, maxDelay) * (1 + jitter * random())
   */
  private computeBackoff(attempt: number): number {
    const baseDelay = BACKOFF_BASE_DELAY_MS;
    const maxDelay = BACKOFF_MAX_DELAY_MS;
    const jitter = BACKOFF_JITTER;
    const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return exponential * (1 + jitter * Math.random());
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval <= 0) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WS_OPEN) {
        if (this.pingPayload !== null) {
          this.ws.send(this.pingPayload);
        }
      }
    }, this.heartbeatInterval);
  }

  private resetInboundTimer(): void {
    this.clearInboundTimer();
    if (this.inboundTimeout <= 0) {
      return;
    }
    this.inboundTimer = setTimeout(() => {
      this.inboundTimer = null;
      if (this.ws) {
        this.ws.close(4000, 'Inbound timeout');
      }
    }, this.inboundTimeout);
  }

  private clearInboundTimer(): void {
    if (this.inboundTimer !== null) {
      clearTimeout(this.inboundTimer);
      this.inboundTimer = null;
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startMessageRateMonitor(): void {
    if (this.messageCountResetTimer !== null) {
      clearInterval(this.messageCountResetTimer);
    }
    this.messageCount = 0;
    this._messagesPerSecond = 0;
    this.messageCountResetTimer = setInterval(() => {
      this._messagesPerSecond = this.messageCount;
      this.messageCount = 0;
    }, MESSAGE_RATE_INTERVAL_MS);
  }

  private clearAllTimers(): void {
    this.clearHeartbeat();
    this.clearInboundTimer();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.messageCountResetTimer !== null) {
      clearInterval(this.messageCountResetTimer);
      this.messageCountResetTimer = null;
    }
  }

  private setState(state: ConnectionStatus): void {
    if (this._state === state) {
      return;
    }
    this._state = state;
    this.onStateChange?.(state);
  }
}
