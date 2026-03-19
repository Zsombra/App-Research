import { ConnectionStatus } from '@terminal/types';
import type {
  ExchangeId,
  NormalizedTrade,
  OrderbookSnapshot,
  Ticker,
  PriceLevel,
} from '@terminal/types';
import { BaseExchangeAdapter } from '../base-adapter.js';

/** Simulated adapter timing and market model constants. */
const SIM_CONNECT_DELAY_MS = 50;
const SIM_TRADE_INTERVAL_MIN_MS = 200;
const SIM_TRADE_INTERVAL_RANGE_MS = 300;
const SIM_ORDERBOOK_INTERVAL_MS = 250;
const SIM_TICKER_INTERVAL_MS = 1000;
const SIM_VOLATILITY = 0.0002;
const SIM_UPWARD_BIAS = 0.48;
const SIM_TRADE_AMOUNT_MIN = 0.001;
const SIM_TRADE_AMOUNT_RANGE = 2;
const SIM_SPREAD_FACTOR = 0.0001;
const SIM_ORDERBOOK_DEPTH = 20;

/** Default base prices for common simulated symbols. */
const SIM_BASE_PRICES: Record<string, { base: number; range: number }> = {
  BTC: { base: 65000, range: 2000 },
  ETH: { base: 3400, range: 100 },
  SOL: { base: 140, range: 10 },
};
const SIM_DEFAULT_BASE_PRICE = { base: 100, range: 50 };

/**
 * Simulated exchange adapter that generates realistic market data
 * for development, testing, and demo purposes.
 *
 * Generates trades at random intervals with a random walk price model,
 * maintains a synthetic orderbook, and emits ticker updates.
 */
export class SimulatedAdapter extends BaseExchangeAdapter {
  readonly exchangeId: ExchangeId = 'simulated';

  private tradeIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private tickerIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private orderbookIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  /** Current simulated prices per symbol */
  private prices: Map<string, number> = new Map();
  /** 24h tracking per symbol */
  private daily: Map<string, { open: number; high: number; low: number; volume: number }> = new Map();
  /** Trade counter for unique IDs */
  private tradeCounter = 0;

  async connect(): Promise<void> {
    this.setStatus(ConnectionStatus.Connecting);
    // Simulate brief connection delay
    await new Promise((resolve) => setTimeout(resolve, SIM_CONNECT_DELAY_MS));
    this.setStatus(ConnectionStatus.Connected);
  }

  async disconnect(): Promise<void> {
    for (const interval of this.tradeIntervals.values()) clearInterval(interval);
    for (const interval of this.tickerIntervals.values()) clearInterval(interval);
    for (const interval of this.orderbookIntervals.values()) clearInterval(interval);
    this.tradeIntervals.clear();
    this.tickerIntervals.clear();
    this.orderbookIntervals.clear();
    this.setStatus(ConnectionStatus.Disconnected);
  }

  subscribeTrades(symbol: string): void {
    if (this.tradeIntervals.has(symbol)) return;
    this.initPrice(symbol);

    const interval = setInterval(() => {
      const count = 1 + Math.floor(Math.random() * 3); // 1-3 trades per tick
      for (let i = 0; i < count; i++) {
        this.emitTrade(symbol);
      }
    }, SIM_TRADE_INTERVAL_MIN_MS + Math.random() * SIM_TRADE_INTERVAL_RANGE_MS);

    this.tradeIntervals.set(symbol, interval);
  }

  subscribeOrderbook(symbol: string): void {
    if (this.orderbookIntervals.has(symbol)) return;
    this.initPrice(symbol);

    // Emit initial snapshot
    this.emitOrderbook(symbol);

    const interval = setInterval(() => {
      this.emitOrderbook(symbol);
    }, SIM_ORDERBOOK_INTERVAL_MS);

    this.orderbookIntervals.set(symbol, interval);
  }

  subscribeTicker(symbol: string): void {
    if (this.tickerIntervals.has(symbol)) return;
    this.initPrice(symbol);

    // Emit initial ticker
    this.emitTicker(symbol);

    const interval = setInterval(() => {
      this.emitTicker(symbol);
    }, SIM_TICKER_INTERVAL_MS);

    this.tickerIntervals.set(symbol, interval);
  }

  subscribeLiquidations(_symbol: string): void {
    // Not simulated
  }

  unsubscribeTrades(symbol: string): void {
    const interval = this.tradeIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.tradeIntervals.delete(symbol);
    }
  }

  unsubscribeOrderbook(symbol: string): void {
    const interval = this.orderbookIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.orderbookIntervals.delete(symbol);
    }
  }

  unsubscribeTicker(symbol: string): void {
    const interval = this.tickerIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.tickerIntervals.delete(symbol);
    }
  }

  unsubscribeLiquidations(_symbol: string): void {
    // Not simulated
  }

  private initPrice(symbol: string): void {
    if (this.prices.has(symbol)) return;
    const basePrice = this.getBasePrice(symbol);
    this.prices.set(symbol, basePrice);
    this.daily.set(symbol, {
      open: basePrice,
      high: basePrice,
      low: basePrice,
      volume: 0,
    });
  }

  private getBasePrice(symbol: string): number {
    for (const [prefix, cfg] of Object.entries(SIM_BASE_PRICES)) {
      if (symbol.startsWith(prefix)) return cfg.base + Math.random() * cfg.range;
    }
    return SIM_DEFAULT_BASE_PRICE.base + Math.random() * SIM_DEFAULT_BASE_PRICE.range;
  }

  private emitTrade(symbol: string): void {
    const price = this.prices.get(symbol) ?? 100;
    const volatility = price * SIM_VOLATILITY;
    const change = (Math.random() - SIM_UPWARD_BIAS) * volatility;
    const newPrice = price + change;
    this.prices.set(symbol, newPrice);

    const amount = SIM_TRADE_AMOUNT_MIN + Math.random() * SIM_TRADE_AMOUNT_RANGE;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';

    // Update daily stats
    const d = this.daily.get(symbol);
    if (d) {
      d.high = Math.max(d.high, newPrice);
      d.low = Math.min(d.low, newPrice);
      d.volume += amount;
    }

    this.tradeCounter++;
    const trade: NormalizedTrade = {
      id: `sim-${this.tradeCounter}`,
      exchange: 'simulated',
      symbol,
      price: newPrice,
      amount,
      side: side as 'buy' | 'sell',
      timestamp: Date.now(),
      isMaker: Math.random() > 0.5,
      cost: newPrice * amount,
      liquidation: false,
    };

    this.onTrade?.(trade);
  }

  private emitOrderbook(symbol: string): void {
    const midPrice = this.prices.get(symbol) ?? 100;
    const spread = midPrice * SIM_SPREAD_FACTOR;

    const bids: PriceLevel[] = [];
    const asks: PriceLevel[] = [];

    for (let i = 0; i < SIM_ORDERBOOK_DEPTH; i++) {
      const bidOffset = spread * (0.5 + i * 0.5) + Math.random() * spread * 0.2;
      const askOffset = spread * (0.5 + i * 0.5) + Math.random() * spread * 0.2;

      bids.push({
        price: midPrice - bidOffset,
        size: 0.1 + Math.random() * 5,
      });
      asks.push({
        price: midPrice + askOffset,
        size: 0.1 + Math.random() * 5,
      });
    }

    // Sort bids descending, asks ascending
    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);

    const snapshot: OrderbookSnapshot = {
      exchange: 'simulated',
      symbol,
      timestamp: Date.now(),
      bids,
      asks,
      sequenceId: Date.now(),
    };

    this.onOrderbookSnapshot?.(snapshot);
  }

  private emitTicker(symbol: string): void {
    const price = this.prices.get(symbol) ?? 100;
    const d = this.daily.get(symbol);
    const open = d?.open ?? price;
    const changePercent = ((price - open) / open) * 100;

    const ticker: Ticker = {
      exchange: 'simulated',
      symbol,
      timestamp: Date.now(),
      lastPrice: price,
      changePercent24h: changePercent,
      high24h: d?.high ?? price,
      low24h: d?.low ?? price,
      volume24h: d?.volume ?? 0,
      quoteVolume24h: (d?.volume ?? 0) * price,
      bbo: {
        bidPrice: price * 0.9999,
        bidSize: 1 + Math.random() * 10,
        askPrice: price * 1.0001,
        askSize: 1 + Math.random() * 10,
      },
    };

    this.onTicker?.(ticker);
  }
}
