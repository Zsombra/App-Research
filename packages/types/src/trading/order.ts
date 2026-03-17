/**
 * Order side: buy or sell.
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type: market executes immediately, limit waits for price.
 */
export type OrderType = 'market' | 'limit';

/**
 * Order status lifecycle.
 */
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';

/**
 * Represents a trading order.
 */
export interface Order {
  /** Unique order ID */
  id: string;
  /** Symbol being traded */
  symbol: string;
  /** Buy or sell */
  side: OrderSide;
  /** Market or limit */
  type: OrderType;
  /** Order quantity in base currency */
  quantity: number;
  /** Limit price (required for limit orders) */
  price?: number;
  /** Current order status */
  status: OrderStatus;
  /** Amount filled so far */
  filledQuantity: number;
  /** Average fill price */
  averageFillPrice: number;
  /** When the order was created */
  createdAt: number;
  /** When the order was last updated */
  updatedAt: number;
}

/**
 * A single fill (partial or complete execution of an order).
 */
export interface Fill {
  /** Unique fill ID */
  id: string;
  /** Associated order ID */
  orderId: string;
  /** Symbol */
  symbol: string;
  /** Side */
  side: OrderSide;
  /** Fill price */
  price: number;
  /** Fill quantity */
  quantity: number;
  /** Timestamp */
  timestamp: number;
  /** Fee paid */
  fee: number;
  /** Fee currency */
  feeCurrency: string;
}

/**
 * An open position.
 */
export interface Position {
  /** Symbol */
  symbol: string;
  /** Net quantity (positive = long, negative = short) */
  quantity: number;
  /** Average entry price */
  entryPrice: number;
  /** Current mark price (from ticker) */
  markPrice: number;
  /** Unrealized PnL */
  unrealizedPnl: number;
  /** Realized PnL from closed portions */
  realizedPnl: number;
  /** When position was opened */
  openedAt: number;
}
