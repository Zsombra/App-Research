import { ConnectionStatus } from '@terminal/types';
import type {
  ExchangeId,
  NormalizedTrade,
  OrderbookSnapshot,
  Ticker,
  PriceLevel,
} from '@terminal/types';
import { BaseExchangeAdapter } from '../base-adapter.js';
import { WebSocketManager } from '../../ws/ws-manager.js';
import { OrderbookManager } from '../../orderbook/orderbook-manager.js';

/** Coinbase Advanced Trade WebSocket feed URL. */
const DEFAULT_WS_URL = 'wss://advanced-trade-ws.coinbase.com';

/** Default orderbook depth for Coinbase level2 subscriptions. */
const COINBASE_ORDERBOOK_DEPTH = 25;

/**
 * Coinbase exchange adapter.
 *
 * Connects to Coinbase Advanced Trade WebSocket API and normalizes
 * market_trades, level2 (orderbook), and ticker data into the
 * terminal's common format.
 *
 * Symbol format: Coinbase uses "BTC-USDT", we normalize to "BTC/USDT".
 */
export class CoinbaseAdapter extends BaseExchangeAdapter {
  readonly exchangeId: ExchangeId = 'coinbase';

  private wsManager: WebSocketManager;
  private orderbookManagers: Map<string, OrderbookManager> = new Map();
  private subscribedTrades: Set<string> = new Set();
  private subscribedOrderbooks: Set<string> = new Set();
  private subscribedTickers: Set<string> = new Set();
  private tradeIdCounter = 0;

  constructor(wsUrl?: string) {
    super();
    this.wsManager = new WebSocketManager({
      url: wsUrl ?? DEFAULT_WS_URL,
      heartbeatInterval: 0, // Coinbase sends heartbeats if subscribed
      maxReconnectAttempts: 10,
      inboundTimeout: 60_000,
    });

    this.wsManager.onMessage = (data: string) => this.handleMessage(data);
    this.wsManager.onStateChange = (state: ConnectionStatus) => {
      this.setStatus(state);
      if (state === ConnectionStatus.Connected) {
        this.resubscribeAll();
      }
    };
    this.wsManager.onError = (error: Error) => {
      console.warn(`[CoinbaseAdapter] WebSocket error: ${error.message}`);
    };
  }

  async connect(): Promise<void> {
    this.wsManager.connect();
  }

  async disconnect(): Promise<void> {
    this.wsManager.disconnect();
    this.subscribedTrades.clear();
    this.subscribedOrderbooks.clear();
    this.subscribedTickers.clear();
    this.orderbookManagers.clear();
  }

  subscribeTrades(symbol: string): void {
    this.subscribedTrades.add(symbol);
    this.sendSubscribe('market_trades', [this.toExchangeSymbol(symbol)]);
  }

  subscribeOrderbook(symbol: string, _depth?: number): void {
    this.subscribedOrderbooks.add(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    if (!this.orderbookManagers.has(symbol)) {
      this.orderbookManagers.set(
        symbol,
        new OrderbookManager({ symbol, exchange: 'coinbase', maxDepth: COINBASE_ORDERBOOK_DEPTH })
      );
    }
    this.sendSubscribe('level2', [exchangeSymbol]);
  }

  subscribeTicker(symbol: string): void {
    this.subscribedTickers.add(symbol);
    this.sendSubscribe('ticker', [this.toExchangeSymbol(symbol)]);
  }

  subscribeLiquidations(_symbol: string): void {
    // Coinbase does not provide liquidation feeds
  }

  unsubscribeTrades(symbol: string): void {
    this.subscribedTrades.delete(symbol);
    this.sendUnsubscribe('market_trades', [this.toExchangeSymbol(symbol)]);
  }

  unsubscribeOrderbook(symbol: string): void {
    this.subscribedOrderbooks.delete(symbol);
    this.orderbookManagers.delete(symbol);
    this.sendUnsubscribe('level2', [this.toExchangeSymbol(symbol)]);
  }

  unsubscribeTicker(symbol: string): void {
    this.subscribedTickers.delete(symbol);
    this.sendUnsubscribe('ticker', [this.toExchangeSymbol(symbol)]);
  }

  unsubscribeLiquidations(_symbol: string): void {
    // stub
  }

  private handleMessage(data: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    const channel = parsed['channel'] as string | undefined;
    const events = parsed['events'] as Array<Record<string, unknown>> | undefined;

    if (!channel || !events) return;

    for (const event of events) {
      switch (channel) {
        case 'market_trades':
          this.handleMarketTrades(event);
          break;
        case 'l2_data':
          this.handleLevel2(event);
          break;
        case 'ticker':
          this.handleTicker(event);
          break;
      }
    }
  }

  /**
   * Handles Coinbase market_trades channel events.
   *
   * Event format:
   * { type: "snapshot"|"update", trades: [{ trade_id, product_id, price, size, side, time }] }
   */
  private handleMarketTrades(event: Readonly<Record<string, unknown>>): void {
    const trades = event['trades'] as Array<Record<string, unknown>> | undefined;
    if (!trades) return;

    for (const t of trades) {
      const exchangeSymbol = t['product_id'] as string;
      const symbol = this.toNormalizedSymbol(exchangeSymbol);
      if (!symbol) continue;

      if (typeof t['price'] !== 'string' || typeof t['size'] !== 'string') continue;
      const price = parseFloat(t['price']);
      const amount = parseFloat(t['size']);
      const rawSide = typeof t['side'] === 'string' ? t['side'].toLowerCase() : undefined;
      const side = rawSide === 'sell' ? 'sell' as const : 'buy' as const;
      const time = t['time'] as string;

      if (isNaN(price) || isNaN(amount)) continue;

      const trade: NormalizedTrade = {
        id: (t['trade_id'] as string) ?? String(++this.tradeIdCounter),
        exchange: 'coinbase',
        symbol,
        price,
        amount,
        side,
        timestamp: time ? new Date(time).getTime() : Date.now(),
        isMaker: false,
        cost: price * amount,
        liquidation: false,
      };

      this.onTrade?.(trade);
    }
  }

  /**
   * Handles Coinbase level2 (l2_data) channel events.
   *
   * Event format:
   * { type: "snapshot"|"update", product_id, updates: [{ side, price_level, new_quantity }] }
   */
  private handleLevel2(event: Readonly<Record<string, unknown>>): void {
    const exchangeSymbol = event['product_id'] as string;
    const symbol = this.toNormalizedSymbol(exchangeSymbol);
    if (!symbol) return;

    const manager = this.orderbookManagers.get(symbol);
    if (!manager) return;

    const eventType = event['type'] as string;
    const updates = event['updates'] as Array<Record<string, unknown>> | undefined;
    if (!updates) return;

    const bids: PriceLevel[] = [];
    const asks: PriceLevel[] = [];

    for (const u of updates) {
      const side = u['side'] as string;
      const price = parseFloat(u['price_level'] as string);
      const size = parseFloat(u['new_quantity'] as string);
      if (isNaN(price) || isNaN(size)) continue;

      if (side === 'bid') {
        bids.push({ price, size });
      } else {
        asks.push({ price, size });
      }
    }

    // Sort bids descending, asks ascending
    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);

    if (eventType === 'snapshot') {
      const snapshot: OrderbookSnapshot = {
        exchange: 'coinbase',
        symbol,
        timestamp: Date.now(),
        bids,
        asks,
        sequenceId: Date.now(),
      };
      manager.applySnapshot(snapshot);
    } else {
      // Apply delta updates
      manager.applyDelta({
        exchange: 'coinbase',
        symbol,
        timestamp: Date.now(),
        bids,
        asks,
        sequenceId: Date.now(),
        prevSequenceId: 0, // Coinbase doesn't use sequence-based gap detection
      });
    }

    this.onOrderbookSnapshot?.(manager.getSnapshot());
  }

  /**
   * Handles Coinbase ticker channel events.
   *
   * Event format:
   * { type: "snapshot"|"update", tickers: [{ product_id, price, volume_24_h, ... }] }
   */
  private handleTicker(event: Readonly<Record<string, unknown>>): void {
    const tickers = event['tickers'] as Array<Record<string, unknown>> | undefined;
    if (!tickers) return;

    for (const t of tickers) {
      const exchangeSymbol = t['product_id'] as string;
      const symbol = this.toNormalizedSymbol(exchangeSymbol);
      if (!symbol) continue;

      if (typeof t['price'] !== 'string') continue;
      const price = parseFloat(t['price']);
      if (isNaN(price)) continue;

      const priceChangePercent = parseFloat(t['price_percentage_change_24h'] as string) || 0;
      const high = parseFloat(t['high_24_h'] as string) || price;
      const low = parseFloat(t['low_24_h'] as string) || price;
      const volume = parseFloat(t['volume_24_h'] as string) || 0;
      const bestBid = parseFloat(t['best_bid'] as string) || price;
      const bestBidSize = parseFloat(t['best_bid_quantity'] as string) || 0;
      const bestAsk = parseFloat(t['best_ask'] as string) || price;
      const bestAskSize = parseFloat(t['best_ask_quantity'] as string) || 0;

      const ticker: Ticker = {
        exchange: 'coinbase',
        symbol,
        timestamp: Date.now(),
        lastPrice: price,
        changePercent24h: priceChangePercent,
        high24h: high,
        low24h: low,
        volume24h: volume,
        quoteVolume24h: volume * price,
        bbo: {
          bidPrice: bestBid,
          bidSize: bestBidSize,
          askPrice: bestAsk,
          askSize: bestAskSize,
        },
      };

      this.onTicker?.(ticker);
    }
  }

  private sendSubscribe(channel: string, productIds: readonly string[]): void {
    this.wsManager.send(JSON.stringify({
      type: 'subscribe',
      product_ids: productIds,
      channel,
    }));
  }

  private sendUnsubscribe(channel: string, productIds: readonly string[]): void {
    this.wsManager.send(JSON.stringify({
      type: 'unsubscribe',
      product_ids: productIds,
      channel,
    }));
  }

  private resubscribeAll(): void {
    const tradeProducts = [...this.subscribedTrades].map((s) => this.toExchangeSymbol(s));
    if (tradeProducts.length > 0) {
      this.sendSubscribe('market_trades', tradeProducts);
    }

    const obProducts = [...this.subscribedOrderbooks].map((s) => this.toExchangeSymbol(s));
    if (obProducts.length > 0) {
      this.sendSubscribe('level2', obProducts);
    }

    const tickerProducts = [...this.subscribedTickers].map((s) => this.toExchangeSymbol(s));
    if (tickerProducts.length > 0) {
      this.sendSubscribe('ticker', tickerProducts);
    }
  }

  /** Converts "BTC/USDT" → "BTC-USDT" */
  private toExchangeSymbol(normalizedSymbol: string): string {
    return normalizedSymbol.replace('/', '-');
  }

  /** Converts "BTC-USDT" → "BTC/USDT" */
  private toNormalizedSymbol(exchangeSymbol: string): string | null {
    if (!exchangeSymbol || !exchangeSymbol.includes('-')) return null;
    return exchangeSymbol.replace('-', '/');
  }
}
