import { create } from 'zustand';
import type { Order, Fill, Position, OrderSide, OrderType } from '@terminal/types';
import { useMarketStore } from './market-store.js';

/** Fee rate for simulated trades (0.1% taker). */
const FEE_RATE = 0.001;

let orderCounter = 0;
let fillCounter = 0;

function generateOrderId(): string {
  return `ord-${++orderCounter}-${Date.now()}`;
}

function generateFillId(): string {
  return `fill-${++fillCounter}-${Date.now()}`;
}

export interface OrderState {
  /** All orders, newest first */
  orders: Order[];
  /** All fills, newest first */
  fills: Fill[];
  /** Open positions by symbol */
  positions: Map<string, Position>;

  // Actions
  placeOrder: (params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
  }) => Order | null;
  cancelOrder: (orderId: string) => boolean;
  cancelAllOrders: (symbol?: string) => void;
  updatePositionMarkPrices: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  fills: [],
  positions: new Map(),

  placeOrder: (params) => {
    const now = Date.now();
    const order: Order = {
      id: generateOrderId(),
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      ...(params.price !== undefined ? { price: params.price } : {}),
      status: 'pending',
      filledQuantity: 0,
      averageFillPrice: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (params.type === 'market') {
      // Market orders fill immediately against current ticker
      const ticker = useMarketStore.getState().tickers.get(params.symbol);
      if (!ticker) {
        order.status = 'rejected';
        set((state) => ({ orders: [order, ...state.orders] }));
        return null;
      }

      const fillPrice = params.side === 'buy' ? ticker.bbo.askPrice : ticker.bbo.bidPrice;
      const fill: Fill = {
        id: generateFillId(),
        orderId: order.id,
        symbol: params.symbol,
        side: params.side,
        price: fillPrice,
        quantity: params.quantity,
        timestamp: now,
        fee: fillPrice * params.quantity * FEE_RATE,
        feeCurrency: 'USDT',
      };

      order.status = 'filled';
      order.filledQuantity = params.quantity;
      order.averageFillPrice = fillPrice;
      order.updatedAt = now;

      set((state) => {
        const positions = new Map(state.positions);
        updatePosition(positions, fill);

        return {
          orders: [order, ...state.orders],
          fills: [fill, ...state.fills],
          positions,
        };
      });

      return order;
    }

    // Limit orders go to open state
    order.status = 'open';
    set((state) => ({ orders: [order, ...state.orders] }));

    // Check if limit can fill immediately
    checkLimitFill(order);

    return order;
  },

  cancelOrder: (orderId) => {
    const state = get();
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || order.status !== 'open') return false;

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'cancelled' as const, updatedAt: Date.now() } : o
      ),
    }));
    return true;
  },

  cancelAllOrders: (symbol) => {
    const now = Date.now();
    set((state) => ({
      orders: state.orders.map((o) =>
        o.status === 'open' && (!symbol || o.symbol === symbol)
          ? { ...o, status: 'cancelled' as const, updatedAt: now }
          : o
      ),
    }));
  },

  updatePositionMarkPrices: () => {
    const tickers = useMarketStore.getState().tickers;

    set((state) => {
      const positions = new Map(state.positions);
      let changed = false;

      for (const [symbol, pos] of positions) {
        const ticker = tickers.get(symbol);
        if (ticker && ticker.lastPrice !== pos.markPrice) {
          const newMarkPrice = ticker.lastPrice;
          const unrealizedPnl = (newMarkPrice - pos.entryPrice) * pos.quantity;
          positions.set(symbol, {
            ...pos,
            markPrice: newMarkPrice,
            unrealizedPnl,
          });
          changed = true;
        }
      }

      return changed ? { positions } : {};
    });
  },
}));

/** Update or create a position from a fill. */
function updatePosition(positions: Map<string, Position>, fill: Fill): void {
  const existing = positions.get(fill.symbol);
  const signedQty = fill.side === 'buy' ? fill.quantity : -fill.quantity;

  if (!existing) {
    positions.set(fill.symbol, {
      symbol: fill.symbol,
      quantity: signedQty,
      entryPrice: fill.price,
      markPrice: fill.price,
      unrealizedPnl: 0,
      realizedPnl: -fill.fee,
      openedAt: fill.timestamp,
    });
    return;
  }

  const newQty = existing.quantity + signedQty;

  if (Math.sign(newQty) !== Math.sign(existing.quantity) && existing.quantity !== 0) {
    // Position flipped — realize PnL on the closed portion
    const realizedPnl = (fill.price - existing.entryPrice) * existing.quantity;

    if (Math.abs(newQty) < 0.00000001) {
      // Fully closed
      positions.delete(fill.symbol);
    } else {
      // Flipped
      positions.set(fill.symbol, {
        symbol: fill.symbol,
        quantity: newQty,
        entryPrice: fill.price,
        markPrice: fill.price,
        unrealizedPnl: 0,
        realizedPnl: existing.realizedPnl + realizedPnl - fill.fee,
        openedAt: fill.timestamp,
      });
    }
    return;
  }

  if (Math.sign(signedQty) === Math.sign(existing.quantity)) {
    // Adding to position — average entry price
    const totalCost = existing.entryPrice * Math.abs(existing.quantity) + fill.price * fill.quantity;
    const totalQty = Math.abs(existing.quantity) + fill.quantity;
    const avgEntry = totalQty > 0 ? totalCost / totalQty : fill.price;

    positions.set(fill.symbol, {
      ...existing,
      quantity: newQty,
      entryPrice: avgEntry,
      realizedPnl: existing.realizedPnl - fill.fee,
    });
  } else {
    // Reducing position — realize PnL
    const realizedPnl = (fill.price - existing.entryPrice) * Math.abs(signedQty) *
      (existing.quantity > 0 ? 1 : -1);

    if (Math.abs(newQty) < 0.00000001) {
      positions.delete(fill.symbol);
    } else {
      positions.set(fill.symbol, {
        ...existing,
        quantity: newQty,
        realizedPnl: existing.realizedPnl + realizedPnl - fill.fee,
      });
    }
  }
}

/** Check if a limit order can fill against the current market. */
function checkLimitFill(order: Order): void {
  const ticker = useMarketStore.getState().tickers.get(order.symbol);
  if (!ticker || !order.price) return;

  const canFill =
    (order.side === 'buy' && order.price >= ticker.bbo.askPrice) ||
    (order.side === 'sell' && order.price <= ticker.bbo.bidPrice);

  if (canFill) {
    const now = Date.now();
    const fillPrice = order.price;
    const fill: Fill = {
      id: generateFillId(),
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      price: fillPrice,
      quantity: order.quantity,
      timestamp: now,
      fee: fillPrice * order.quantity * FEE_RATE,
      feeCurrency: 'USDT',
    };

    useOrderStore.setState((state) => {
      const positions = new Map(state.positions);
      updatePosition(positions, fill);

      return {
        orders: state.orders.map((o) =>
          o.id === order.id
            ? { ...o, status: 'filled' as const, filledQuantity: order.quantity, averageFillPrice: fillPrice, updatedAt: now }
            : o
        ),
        fills: [fill, ...state.fills],
        positions,
      };
    });
  }
}

// --- Selectors ---

export function useOrders(symbol?: string): Order[] {
  return useOrderStore((state) =>
    symbol ? state.orders.filter((o) => o.symbol === symbol) : state.orders
  );
}

export function useOpenOrders(symbol?: string): Order[] {
  return useOrderStore((state) =>
    state.orders.filter((o) => o.status === 'open' && (!symbol || o.symbol === symbol))
  );
}

export function useFills(symbol?: string): Fill[] {
  return useOrderStore((state) =>
    symbol ? state.fills.filter((f) => f.symbol === symbol) : state.fills
  );
}

export function usePosition(symbol: string): Position | undefined {
  return useOrderStore((state) => state.positions.get(symbol));
}

export function useAllPositions(): Position[] {
  return useOrderStore((state) => Array.from(state.positions.values()));
}
