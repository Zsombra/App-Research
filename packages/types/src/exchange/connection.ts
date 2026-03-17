/**
 * Supported exchange identifiers.
 */
export type ExchangeId =
  | 'binance'
  | 'bybit'
  | 'okx'
  | 'bitget'
  | 'coinbase'
  | 'kraken'
  | 'deribit'
  | 'bitmex'
  | 'gate'
  | 'kucoin';

/**
 * Connection lifecycle states for an exchange adapter.
 */
export enum ConnectionStatus {
  /** Not connected and not attempting to connect */
  Disconnected = 'disconnected',
  /** Actively attempting to establish a connection */
  Connecting = 'connecting',
  /** Connection established and receiving data */
  Connected = 'connected',
  /** Connection lost, attempting automatic reconnection */
  Reconnecting = 'reconnecting',
  /** Permanent failure, will not retry */
  Error = 'error',
}

/**
 * Configuration for an exchange WebSocket connection.
 */
export interface ConnectionConfig {
  /** Exchange to connect to */
  exchangeId: ExchangeId;
  /** WebSocket endpoint URL (if overriding default) */
  wsUrl?: string;
  /** API key for authenticated endpoints */
  apiKey?: string;
  /** API secret for authenticated endpoints */
  apiSecret?: string;
  /** Maximum reconnection attempts before giving up */
  maxReconnectAttempts: number;
  /** Base delay in ms for exponential backoff reconnection */
  reconnectBaseDelay: number;
  /** Heartbeat/ping interval in ms */
  heartbeatInterval: number;
}
