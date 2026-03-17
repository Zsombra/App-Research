import type { ExchangeId, ConnectionStatus } from './connection.js';
import type { NormalizedTrade } from '../market/trade.js';
import type { OrderbookSnapshot, OrderbookDelta } from '../market/orderbook.js';
import type { Ticker } from '../market/ticker.js';
import type { LiquidationEvent } from '../market/liquidation.js';

/**
 * Interface that all exchange adapters must implement.
 * Each adapter normalizes exchange-specific WebSocket data into
 * the shared NormalizedTrade, OrderbookSnapshot, etc. types.
 */
export interface ExchangeAdapter {
  /** The exchange this adapter connects to */
  readonly exchangeId: ExchangeId;
  /** Current connection status */
  readonly status: ConnectionStatus;

  /** Establish WebSocket connection to the exchange */
  connect(): Promise<void>;
  /** Gracefully disconnect from the exchange */
  disconnect(): Promise<void>;

  /** Subscribe to trade stream for a symbol */
  subscribeTrades(symbol: string): void;
  /** Subscribe to order book updates for a symbol */
  subscribeOrderbook(symbol: string, depth?: number): void;
  /** Subscribe to ticker updates for a symbol */
  subscribeTicker(symbol: string): void;

  /** Unsubscribe from trade stream for a symbol */
  unsubscribeTrades(symbol: string): void;
  /** Unsubscribe from order book updates for a symbol */
  unsubscribeOrderbook(symbol: string): void;
  /** Unsubscribe from ticker updates for a symbol */
  unsubscribeTicker(symbol: string): void;
  /** Subscribe to liquidation events for a symbol */
  subscribeLiquidations(symbol: string): void;
  /** Unsubscribe from liquidation events for a symbol */
  unsubscribeLiquidations(symbol: string): void;

  /** Callback invoked when a normalized trade is received */
  onTrade: ((trade: NormalizedTrade) => void) | null;
  /** Callback invoked when a full order book snapshot is received */
  onOrderbookSnapshot: ((snapshot: OrderbookSnapshot) => void) | null;
  /** Callback invoked when an order book delta is received */
  onOrderbookDelta: ((delta: OrderbookDelta) => void) | null;
  /** Callback invoked when a ticker update is received */
  onTicker: ((ticker: Ticker) => void) | null;
  /** Callback invoked when a liquidation event is received */
  onLiquidation: ((liquidation: LiquidationEvent) => void) | null;
  /** Callback invoked when connection status changes */
  onConnectionStatusChange: ((status: ConnectionStatus) => void) | null;
}
