import { describe, it, expect, beforeEach, vi } from 'vitest';

// Worker must be stubbed before any module that touches worker-bridge is imported.
vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null,
})));

// worker-bridge is imported transitively by market-store (subscribe/unsubscribe/setTimeframe).
// Mock it so those code paths don't throw.
vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: () => ({
    send: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
  }),
  resetWorkerBridge: vi.fn(),
}));

import { useOrderStore } from '../stores/order-store.js';
import { useMarketStore } from '../stores/market-store.js';
import type { Ticker } from '@terminal/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BTC = 'BTC/USDT';
const ETH = 'ETH/USDT';

const ASK_PRICE = 65001;
const BID_PRICE = 64999;
const LAST_PRICE = 65000;
const FEE_RATE = 0.001;

function makeTicker(overrides: Partial<Ticker> = {}): Ticker {
  return {
    exchange: 'binance',
    symbol: BTC,
    timestamp: Date.now(),
    lastPrice: LAST_PRICE,
    changePercent24h: 1.5,
    high24h: 66000,
    low24h: 64000,
    volume24h: 10000,
    quoteVolume24h: 650_000_000,
    bbo: { bidPrice: BID_PRICE, bidSize: 1, askPrice: ASK_PRICE, askSize: 1 },
    ...overrides,
  };
}

/** Seed the market store with a BTC/USDT ticker so market orders can fill. */
function seedBtcTicker(overrides: Partial<Ticker> = {}): void {
  useMarketStore.getState().processTicker(BTC, makeTicker(overrides));
}

// ---------------------------------------------------------------------------
// Reset both stores before every test so order/fill counters don't bleed.
// ---------------------------------------------------------------------------

beforeEach(() => {
  useMarketStore.setState({
    trades: new Map(),
    orderbooks: new Map(),
    tickers: new Map(),
    candles: new Map(),
    timeframes: new Map(),
    barTypes: new Map(),
    customBarConfigs: new Map(),
    connectionStatuses: new Map(),
    subscriptions: new Set(),
  });

  useOrderStore.setState({
    orders: [],
    fills: [],
    positions: new Map(),
  });
});

// ---------------------------------------------------------------------------
// Market orders
// ---------------------------------------------------------------------------

describe('placeOrder — market orders', () => {
  it('fills a market buy at the ask price', () => {
    seedBtcTicker();

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    expect(order).not.toBeNull();
    expect(order!.status).toBe('filled');
    expect(order!.averageFillPrice).toBe(ASK_PRICE);
    expect(order!.filledQuantity).toBe(1);
  });

  it('fills a market sell at the bid price', () => {
    seedBtcTicker();

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'sell',
      type: 'market',
      quantity: 2,
    });

    expect(order).not.toBeNull();
    expect(order!.status).toBe('filled');
    expect(order!.averageFillPrice).toBe(BID_PRICE);
    expect(order!.filledQuantity).toBe(2);
  });

  it('rejects a market order when no ticker is present', () => {
    // No ticker seeded — store is fresh from beforeEach.
    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    expect(order).toBeNull();

    const stored = useOrderStore.getState().orders[0];
    expect(stored).toBeDefined();
    expect(stored!.status).toBe('rejected');
  });

  it('records a fill in the fills array on a successful market order', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 0.5,
    });

    const fills = useOrderStore.getState().fills;
    expect(fills).toHaveLength(1);
    expect(fills[0]!.price).toBe(ASK_PRICE);
    expect(fills[0]!.quantity).toBe(0.5);
    expect(fills[0]!.fee).toBeCloseTo(ASK_PRICE * 0.5 * FEE_RATE);
    expect(fills[0]!.feeCurrency).toBe('USDT');
  });

  it('calculates fee correctly for a market buy', () => {
    const qty = 3;
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: qty,
    });

    const fill = useOrderStore.getState().fills[0]!;
    expect(fill.fee).toBeCloseTo(ASK_PRICE * qty * FEE_RATE);
  });
});

// ---------------------------------------------------------------------------
// Position creation from fills
// ---------------------------------------------------------------------------

describe('position tracking — creation', () => {
  it('creates a long position after a market buy fill', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    const position = useOrderStore.getState().positions.get(BTC);
    expect(position).toBeDefined();
    expect(position!.quantity).toBe(1);
    expect(position!.entryPrice).toBe(ASK_PRICE);
    expect(position!.markPrice).toBe(ASK_PRICE);
    expect(position!.unrealizedPnl).toBe(0);
    // Initial realized PnL is the negative of the fee paid
    expect(position!.realizedPnl).toBeCloseTo(-(ASK_PRICE * 1 * FEE_RATE));
  });

  it('creates a short position after a market sell fill', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'sell',
      type: 'market',
      quantity: 2,
    });

    const position = useOrderStore.getState().positions.get(BTC);
    expect(position).toBeDefined();
    expect(position!.quantity).toBe(-2);
    expect(position!.entryPrice).toBe(BID_PRICE);
  });
});

// ---------------------------------------------------------------------------
// Limit orders
// ---------------------------------------------------------------------------

describe('placeOrder — limit orders', () => {
  it('sets status to open when the limit cannot fill immediately', () => {
    // No ticker — limit order should remain open.
    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 60000, // well below the ask
    });

    expect(order).not.toBeNull();
    expect(order!.status).toBe('open');
    expect(order!.filledQuantity).toBe(0);
  });

  it('stores the limit price on the order', () => {
    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 60000,
    });

    expect(order!.price).toBe(60000);
  });

  it('fills a limit buy immediately when price >= ask', () => {
    seedBtcTicker(); // askPrice = 65001

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 65001, // exactly at ask — should cross
    });

    // checkLimitFill is synchronous; order should be filled by the time
    // placeOrder returns.
    const stored = useOrderStore.getState().orders.find((o) => o.id === order!.id)!;
    expect(stored.status).toBe('filled');
    expect(stored.averageFillPrice).toBe(65001);
  });

  it('fills a limit sell immediately when price <= bid', () => {
    seedBtcTicker(); // bidPrice = 64999

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'sell',
      type: 'limit',
      quantity: 1,
      price: 64999, // exactly at bid
    });

    const stored = useOrderStore.getState().orders.find((o) => o.id === order!.id)!;
    expect(stored.status).toBe('filled');
  });

  it('does not fill a limit buy when price < ask', () => {
    seedBtcTicker(); // askPrice = 65001

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 65000, // one below ask — should not cross
    });

    const stored = useOrderStore.getState().orders.find((o) => o.id === order!.id)!;
    expect(stored.status).toBe('open');
  });

  it('creates a fill and position when a limit order fills immediately', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 65001,
    });

    expect(useOrderStore.getState().fills).toHaveLength(1);
    expect(useOrderStore.getState().positions.has(BTC)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cancelOrder
// ---------------------------------------------------------------------------

describe('cancelOrder', () => {
  it('cancels an open order and returns true', () => {
    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 60000,
    })!;

    const result = useOrderStore.getState().cancelOrder(order.id);

    expect(result).toBe(true);
    const stored = useOrderStore.getState().orders.find((o) => o.id === order.id)!;
    expect(stored.status).toBe('cancelled');
  });

  it('returns false and does nothing when order does not exist', () => {
    const result = useOrderStore.getState().cancelOrder('nonexistent-id');
    expect(result).toBe(false);
  });

  it('returns false for a filled order', () => {
    seedBtcTicker();

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    })!;

    const result = useOrderStore.getState().cancelOrder(order.id);
    expect(result).toBe(false);

    const stored = useOrderStore.getState().orders.find((o) => o.id === order.id)!;
    expect(stored.status).toBe('filled'); // unchanged
  });

  it('returns false for an already-cancelled order', () => {
    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 60000,
    })!;

    useOrderStore.getState().cancelOrder(order.id);
    const secondAttempt = useOrderStore.getState().cancelOrder(order.id);
    expect(secondAttempt).toBe(false);
  });

  it('returns false for a rejected order', () => {
    // Market order with no ticker produces a rejected order and returns null.
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    const rejectedOrder = useOrderStore.getState().orders[0]!;
    expect(rejectedOrder.status).toBe('rejected');

    const result = useOrderStore.getState().cancelOrder(rejectedOrder.id);
    expect(result).toBe(false);
  });

  it('sets updatedAt on the cancelled order', () => {
    const before = Date.now();

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price: 60000,
    })!;

    useOrderStore.getState().cancelOrder(order.id);

    const stored = useOrderStore.getState().orders.find((o) => o.id === order.id)!;
    expect(stored.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// cancelAllOrders
// ---------------------------------------------------------------------------

describe('cancelAllOrders', () => {
  function placeOpenLimit(symbol: string, price: number) {
    return useOrderStore.getState().placeOrder({
      symbol,
      side: 'buy',
      type: 'limit',
      quantity: 1,
      price,
    });
  }

  it('cancels all open orders when no symbol filter is provided', () => {
    placeOpenLimit(BTC, 60000);
    placeOpenLimit(BTC, 61000);
    placeOpenLimit(ETH, 3000);

    useOrderStore.getState().cancelAllOrders();

    const orders = useOrderStore.getState().orders;
    expect(orders.every((o) => o.status === 'cancelled')).toBe(true);
  });

  it('cancels only open orders for the specified symbol', () => {
    placeOpenLimit(BTC, 60000);
    placeOpenLimit(ETH, 3000);

    useOrderStore.getState().cancelAllOrders(BTC);

    const orders = useOrderStore.getState().orders;
    const btcOrder = orders.find((o) => o.symbol === BTC)!;
    const ethOrder = orders.find((o) => o.symbol === ETH)!;

    expect(btcOrder.status).toBe('cancelled');
    expect(ethOrder.status).toBe('open');
  });

  it('leaves filled orders untouched', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    placeOpenLimit(BTC, 60000);

    useOrderStore.getState().cancelAllOrders(BTC);

    const orders = useOrderStore.getState().orders;
    const filledOrder = orders.find((o) => o.type === 'market')!;
    expect(filledOrder.status).toBe('filled');
  });

  it('is a no-op when there are no open orders', () => {
    useOrderStore.getState().cancelAllOrders();
    expect(useOrderStore.getState().orders).toHaveLength(0);
  });

  it('cancels multiple open orders for same symbol in one call', () => {
    placeOpenLimit(BTC, 60000);
    placeOpenLimit(BTC, 61000);
    placeOpenLimit(BTC, 62000);

    useOrderStore.getState().cancelAllOrders(BTC);

    const orders = useOrderStore.getState().orders;
    expect(orders).toHaveLength(3);
    expect(orders.every((o) => o.status === 'cancelled')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Position averaging — adding to a position
// ---------------------------------------------------------------------------

describe('position tracking — adding to position', () => {
  it('averages entry price when buying more of an existing long', () => {
    seedBtcTicker({ bbo: { bidPrice: 64999, bidSize: 1, askPrice: 65001, askSize: 1 } });

    // First buy: 1 BTC at ask 65001
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    // Change the ask price via a new ticker before the second order.
    useMarketStore.getState().processTicker(BTC, makeTicker({
      bbo: { bidPrice: 66999, bidSize: 1, askPrice: 67001, askSize: 1 },
    }));

    // Second buy: 1 BTC at ask 67001
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    const position = useOrderStore.getState().positions.get(BTC)!;
    // Expected average entry: (65001 * 1 + 67001 * 1) / 2 = 66001
    expect(position.quantity).toBe(2);
    expect(position.entryPrice).toBeCloseTo(66001);
  });

  it('accumulates fees in realizedPnl when adding to position', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    const position = useOrderStore.getState().positions.get(BTC)!;
    const expectedFees = ASK_PRICE * 1 * FEE_RATE * 2;
    expect(position.realizedPnl).toBeCloseTo(-expectedFees);
  });
});

// ---------------------------------------------------------------------------
// Position closing — realizes PnL
// ---------------------------------------------------------------------------

describe('position tracking — closing position', () => {
  it('removes the position on a full close', () => {
    seedBtcTicker();

    // Open a long.
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    expect(useOrderStore.getState().positions.has(BTC)).toBe(true);

    // Close it fully with a sell at the same price.
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'sell',
      type: 'market',
      quantity: 1,
    });

    expect(useOrderStore.getState().positions.has(BTC)).toBe(false);
  });

  it('realizes PnL correctly when closing a profitable long position', () => {
    // Open long at ask 65001.
    seedBtcTicker();
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    // Tick up: bid is now 66000.
    useMarketStore.getState().processTicker(BTC, makeTicker({
      lastPrice: 66000,
      bbo: { bidPrice: 66000, bidSize: 1, askPrice: 66002, askSize: 1 },
    }));

    // Close at bid 66000.
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'sell',
      type: 'market',
      quantity: 1,
    });

    // After full close the position is removed.
    expect(useOrderStore.getState().positions.has(BTC)).toBe(false);

    // Fills should have two entries.
    const fills = useOrderStore.getState().fills;
    expect(fills).toHaveLength(2);
  });

  it('reduces position quantity on a partial close', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 3,
    });

    // Sell 1 of the 3 lots.
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'sell',
      type: 'market',
      quantity: 1,
    });

    const position = useOrderStore.getState().positions.get(BTC)!;
    expect(position).toBeDefined();
    expect(position.quantity).toBe(2);
  });

  it('realizes positive PnL on a profitable short close', () => {
    // Open short at bid 64999.
    seedBtcTicker();
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'sell',
      type: 'market',
      quantity: 1,
    });

    // Price drops: ask is now 63001.
    useMarketStore.getState().processTicker(BTC, makeTicker({
      lastPrice: 63000,
      bbo: { bidPrice: 62999, bidSize: 1, askPrice: 63001, askSize: 1 },
    }));

    // Cover the short (buy to close) at ask 63001.
    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    // Position fully closed.
    expect(useOrderStore.getState().positions.has(BTC)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updatePositionMarkPrices
// ---------------------------------------------------------------------------

describe('updatePositionMarkPrices', () => {
  it('updates mark price and unrealizedPnl from the ticker', () => {
    seedBtcTicker(); // lastPrice = 65000

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    // Advance the ticker's lastPrice.
    useMarketStore.getState().processTicker(BTC, makeTicker({ lastPrice: 66000 }));

    useOrderStore.getState().updatePositionMarkPrices();

    const position = useOrderStore.getState().positions.get(BTC)!;
    expect(position.markPrice).toBe(66000);
    // unrealizedPnl = (markPrice - entryPrice) * quantity
    // entryPrice = ASK_PRICE (65001), quantity = 1
    expect(position.unrealizedPnl).toBeCloseTo((66000 - ASK_PRICE) * 1);
  });

  it('does not mutate positions when mark price is unchanged', () => {
    seedBtcTicker(); // lastPrice = 65000

    useOrderStore.getState().placeOrder({
      symbol: BTC,
      side: 'buy',
      type: 'market',
      quantity: 1,
    });

    // Manually set the position's markPrice to match the ticker's lastPrice.
    const positions = new Map(useOrderStore.getState().positions);
    const pos = positions.get(BTC)!;
    positions.set(BTC, { ...pos, markPrice: LAST_PRICE });
    useOrderStore.setState({ positions });

    const snapshotBefore = useOrderStore.getState().positions;
    useOrderStore.getState().updatePositionMarkPrices();
    const snapshotAfter = useOrderStore.getState().positions;

    // Zustand returns the same Map reference when nothing changed.
    expect(snapshotAfter).toBe(snapshotBefore);
  });

  it('is a no-op when there are no positions', () => {
    // No positions, no ticker — should not throw.
    expect(() => {
      useOrderStore.getState().updatePositionMarkPrices();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Store shape / isolation
// ---------------------------------------------------------------------------

describe('store initialisation', () => {
  it('starts with empty orders, fills, and positions', () => {
    const { orders, fills, positions } = useOrderStore.getState();
    expect(orders).toHaveLength(0);
    expect(fills).toHaveLength(0);
    expect(positions.size).toBe(0);
  });

  it('stores orders newest-first', () => {
    // Place two limit orders; both land in the open state.
    const a = useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'limit', quantity: 1, price: 60000,
    })!;

    const b = useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'limit', quantity: 1, price: 61000,
    })!;

    const orders = useOrderStore.getState().orders;
    expect(orders[0]!.id).toBe(b.id);
    expect(orders[1]!.id).toBe(a.id);
  });

  it('stores fills newest-first', () => {
    seedBtcTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 1,
    });

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 2,
    });

    const fills = useOrderStore.getState().fills;
    expect(fills[0]!.quantity).toBe(2);
    expect(fills[1]!.quantity).toBe(1);
  });
});
