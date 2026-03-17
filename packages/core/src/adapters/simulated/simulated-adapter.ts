import { ConnectionStatus } from '@terminal/types';
import type {
  ExchangeId,
  NormalizedTrade,
  OrderbookSnapshot,
  Ticker,
  PriceLevel,
} from '@terminal/types';
import { BaseExchangeAdapter } from '../base-adapter.js';

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
    await new Promise((resolve) => setTimeout(resolve, 50));
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
    }, 200 + Math.random() * 300); // 200-500ms between batches

    this.tradeIntervals.set(symbol, interval);
  }

  subscribeOrderbook(symbol: string): void {
    if (this.orderbookIntervals.has(symbol)) return;
    this.initPrice(symbol);

    // Emit initial snapshot
    this.emitOrderbook(symbol);

    const interval = setInterval(() => {
      this.emitOrderbook(symbol);
    }, 250);

    this.orderbookIntervals.set(symbol, interval);
  }

  subscribeTicker(symbol: string): void {
    if (this.tickerIntervals.has(symbol)) return;
    this.initPrice(symbol);

    // Emit initial ticker
    this.emitTicker(symbol);

    const interval = setInterval(() => {
      this.emitTicker(symbol);
    }, 1000);

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
    if (symbol.startsWith('BTC')) return 65000 + Math.random() * 2000;
    if (symbol.startsWith('ETH')) return 3400 + Math.random() * 100;
    if (symbol.startsWith('SOL')) return 140 + Math.random() * 10;
    return 100 + Math.random() * 50;
  }

  private emitTrade(symbol: string): void {
    const price = this.prices.get(symbol) ?? 100;
    const volatility = price * 0.0002; // 0.02% per trade
    const change = (Math.random() - 0.48) * volatility; // slight upward bias
    const newPrice = price + change;
    this.prices.set(symbol, newPrice);

    const amount = 0.001 + Math.random() * 2;
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
    const spread = midPrice * 0.0001; // 0.01% spread

    const bids: PriceLevel[] = [];
    const asks: PriceLevel[] = [];

    for (let i = 0; i < 20; i++) {
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
