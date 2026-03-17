import {
  ConnectionStatus,
} from '@terminal/types';
import type {
  ExchangeAdapter,
  ExchangeId,
  NormalizedTrade,
  OrderbookSnapshot,
  OrderbookDelta,
  Ticker,
  LiquidationEvent,
} from '@terminal/types';

/**
 * Abstract base class for exchange adapters.
 * Provides common lifecycle management and callback wiring.
 * Each exchange adapter (Binance, Bybit, etc.) extends this class.
 */
export abstract class BaseExchangeAdapter implements ExchangeAdapter {
  abstract readonly exchangeId: ExchangeId;

  /** Current connection status */
  protected _status: ConnectionStatus;

  /** Callback invoked when a normalized trade is received */
  onTrade: ((trade: NormalizedTrade) => void) | null = null;

  /** Callback invoked when a full order book snapshot is received */
  onOrderbookSnapshot: ((snapshot: OrderbookSnapshot) => void) | null = null;

  /** Callback invoked when an order book delta is received */
  onOrderbookDelta: ((delta: OrderbookDelta) => void) | null = null;

  /** Callback invoked when a ticker update is received */
  onTicker: ((ticker: Ticker) => void) | null = null;

  /** Callback invoked when a liquidation event is received */
  onLiquidation: ((liquidation: LiquidationEvent) => void) | null = null;

  /** Callback invoked when connection status changes */
  onConnectionStatusChange: ((status: ConnectionStatus) => void) | null = null;

  constructor() {
    this._status = ConnectionStatus.Disconnected;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  abstract subscribeTrades(symbol: string): void;
  abstract subscribeOrderbook(symbol: string, depth?: number): void;
  abstract subscribeTicker(symbol: string): void;
  abstract subscribeLiquidations(symbol: string): void;

  abstract unsubscribeTrades(symbol: string): void;
  abstract unsubscribeOrderbook(symbol: string): void;
  abstract unsubscribeTicker(symbol: string): void;
  abstract unsubscribeLiquidations(symbol: string): void;

  /**
   * Updates the connection status and notifies the callback.
   */
  protected setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.onConnectionStatusChange?.(status);
  }
}
