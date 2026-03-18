import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null,
})));

vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: () => ({ send: vi.fn(), onMessage: vi.fn(), offMessage: vi.fn() }),
  resetWorkerBridge: vi.fn(),
}));

import { useOrderStore } from '../stores/order-store.js';
import { useMarketStore } from '../stores/market-store.js';
import type { Ticker } from '@terminal/types';

const BTC = 'BTC/USDT';

function makeTicker(overrides: Partial<Ticker> = {}): Ticker {
  return {
    exchange: 'binance', symbol: BTC, timestamp: Date.now(),
    lastPrice: 65000, changePercent24h: 0, high24h: 66000, low24h: 64000,
    volume24h: 10000, quoteVolume24h: 650_000_000,
    bbo: { bidPrice: 64999, bidSize: 1, askPrice: 65001, askSize: 1 },
    ...overrides,
  };
}

function seedTicker(overrides: Partial<Ticker> = {}): void {
  useMarketStore.getState().processTicker(BTC, makeTicker(overrides));
}

beforeEach(() => {
  useMarketStore.setState({
    trades: new Map(), orderbooks: new Map(), tickers: new Map(),
    candles: new Map(), timeframes: new Map(), barTypes: new Map(),
    customBarConfigs: new Map(), connectionStatuses: new Map(), subscriptions: new Set(),
  });
  useOrderStore.setState({ orders: [], fills: [], positions: new Map() });
});

// ---------------------------------------------------------------------------
// Position flipping (long -> short in a single trade)
// ---------------------------------------------------------------------------
describe('position flipping', () => {
  it('flips from long to short when selling more than held', () => {
    seedTicker();

    // Open long 1
    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 1,
    });
    expect(useOrderStore.getState().positions.get(BTC)!.quantity).toBe(1);

    // Sell 3 — should flip to short 2
    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'sell', type: 'market', quantity: 3,
    });
    const pos = useOrderStore.getState().positions.get(BTC);
    expect(pos).toBeDefined();
    expect(pos!.quantity).toBe(-2);
  });

  it('flips from short to long when buying more than held', () => {
    seedTicker();

    // Open short 2
    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'sell', type: 'market', quantity: 2,
    });

    // Buy 5 — should flip to long 3
    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 5,
    });
    const pos = useOrderStore.getState().positions.get(BTC);
    expect(pos).toBeDefined();
    expect(pos!.quantity).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Very small quantities (precision edge cases)
// ---------------------------------------------------------------------------
describe('small quantity precision', () => {
  it('handles very small quantities correctly', () => {
    seedTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 0.00001,
    });

    const pos = useOrderStore.getState().positions.get(BTC)!;
    expect(pos.quantity).toBe(0.00001);
  });

  it('closes position fully when selling exact small quantity', () => {
    seedTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 0.001,
    });

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'sell', type: 'market', quantity: 0.001,
    });

    // Should be fully closed (within epsilon)
    expect(useOrderStore.getState().positions.has(BTC)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multiple symbols simultaneously
// ---------------------------------------------------------------------------
describe('multi-symbol positions', () => {
  it('tracks positions across different symbols independently', () => {
    const ETH = 'ETH/USDT';
    seedTicker();
    useMarketStore.getState().processTicker(ETH, makeTicker({
      symbol: ETH, lastPrice: 3000,
      bbo: { bidPrice: 2999, bidSize: 1, askPrice: 3001, askSize: 1 },
    }));

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 1,
    });
    useOrderStore.getState().placeOrder({
      symbol: ETH, side: 'sell', type: 'market', quantity: 5,
    });

    const btcPos = useOrderStore.getState().positions.get(BTC)!;
    const ethPos = useOrderStore.getState().positions.get(ETH)!;

    expect(btcPos.quantity).toBe(1);
    expect(ethPos.quantity).toBe(-5);
    expect(btcPos.entryPrice).toBe(65001);
    expect(ethPos.entryPrice).toBe(2999);
  });
});

// ---------------------------------------------------------------------------
// updatePositionMarkPrices edge cases
// ---------------------------------------------------------------------------
describe('updatePositionMarkPrices edge cases', () => {
  it('handles position with no matching ticker gracefully', () => {
    seedTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 1,
    });

    // Clear tickers so there's no matching ticker
    useMarketStore.setState({ tickers: new Map() });

    // Should not throw; mark price stays the same
    expect(() => {
      useOrderStore.getState().updatePositionMarkPrices();
    }).not.toThrow();

    const pos = useOrderStore.getState().positions.get(BTC)!;
    expect(pos.markPrice).toBe(65001); // unchanged
  });

  it('correctly calculates unrealized PnL for short positions', () => {
    seedTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'sell', type: 'market', quantity: 2,
    });

    // Price rises (bad for short)
    useMarketStore.getState().processTicker(BTC, makeTicker({ lastPrice: 66000 }));
    useOrderStore.getState().updatePositionMarkPrices();

    const pos = useOrderStore.getState().positions.get(BTC)!;
    // unrealizedPnl = (markPrice - entryPrice) * quantity
    // quantity is -2, entry is 64999 (bid), mark is 66000
    expect(pos.unrealizedPnl).toBeCloseTo((66000 - 64999) * -2);
    expect(pos.unrealizedPnl).toBeLessThan(0); // Loss
  });
});

// ---------------------------------------------------------------------------
// Limit order edge cases
// ---------------------------------------------------------------------------
describe('limit order edge cases', () => {
  it('limit buy at exact ask price fills immediately', () => {
    seedTicker(); // ask = 65001

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'limit', quantity: 1, price: 65001,
    });

    const stored = useOrderStore.getState().orders.find((o) => o.id === order!.id)!;
    expect(stored.status).toBe('filled');
  });

  it('limit sell at exact bid price fills immediately', () => {
    seedTicker(); // bid = 64999

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'sell', type: 'limit', quantity: 1, price: 64999,
    });

    const stored = useOrderStore.getState().orders.find((o) => o.id === order!.id)!;
    expect(stored.status).toBe('filled');
  });

  it('limit order without price stays open', () => {
    seedTicker();

    const order = useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'limit', quantity: 1,
      // No price — checkLimitFill should bail early
    });

    expect(order!.status).toBe('open');
  });

  it('limit order that fills creates proper position', () => {
    seedTicker();

    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'limit', quantity: 2, price: 70000,
    });

    const pos = useOrderStore.getState().positions.get(BTC)!;
    expect(pos.quantity).toBe(2);
    expect(pos.entryPrice).toBe(70000);
  });
});

// ---------------------------------------------------------------------------
// Realized PnL accumulation
// ---------------------------------------------------------------------------
describe('realized PnL tracking', () => {
  it('accumulates realized PnL across multiple partial closes', () => {
    seedTicker(); // ask=65001, bid=64999

    // Open long 3 at 65001
    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'buy', type: 'market', quantity: 3,
    });

    // Close 1 at same price (bid=64999)
    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'sell', type: 'market', quantity: 1,
    });

    const pos1 = useOrderStore.getState().positions.get(BTC)!;
    expect(pos1.quantity).toBe(2);

    // Close another 1
    useOrderStore.getState().placeOrder({
      symbol: BTC, side: 'sell', type: 'market', quantity: 1,
    });

    const pos2 = useOrderStore.getState().positions.get(BTC)!;
    expect(pos2.quantity).toBe(1);

    // Fees + PnL from partial closes should be accumulated
    expect(pos2.realizedPnl).not.toBe(0);
  });
});
