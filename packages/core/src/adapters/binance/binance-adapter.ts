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

/** Default WebSocket URL for Binance spot combined streams. */
const DEFAULT_WS_URL = 'wss://stream.binance.com:9443/ws';

/**
 * Binance exchange adapter.
 *
 * Connects to Binance's combined WebSocket stream and normalizes
 * trade (aggTrade), orderbook (depth20@100ms), and ticker data
 * into the terminal's common format.
 *
 * Symbol format: Binance uses "BTCUSDT", we normalize to "BTC/USDT".
 */
export class BinanceAdapter extends BaseExchangeAdapter {
  readonly exchangeId: ExchangeId = 'binance';

  private wsManager: WebSocketManager;
  private orderbookManagers: Map<string, OrderbookManager> = new Map();
  private subscribedTrades: Set<string> = new Set();
  private subscribedOrderbooks: Set<string> = new Set();
  private subscribedTickers: Set<string> = new Set();
  private subscriptionId = 1;

  constructor(wsUrl?: string) {
    super();
    this.wsManager = new WebSocketManager({
      url: wsUrl ?? DEFAULT_WS_URL,
      heartbeatInterval: 0, // Binance sends server pings; browser auto-pongs
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
      // Log errors but don't crash; ws-manager handles reconnection
      console.warn(`[BinanceAdapter] WebSocket error: ${error.message}`);
    };
  }

  /** Establishes the WebSocket connection. */
  async connect(): Promise<void> {
    this.wsManager.connect();
  }

  /** Disconnects and clears all subscriptions. */
  async disconnect(): Promise<void> {
    this.wsManager.disconnect();
    this.subscribedTrades.clear();
    this.subscribedOrderbooks.clear();
    this.subscribedTickers.clear();
    this.orderbookManagers.clear();
  }

  /** Subscribe to the aggTrade stream for a normalized symbol. */
  subscribeTrades(symbol: string): void {
    this.subscribedTrades.add(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendSubscribe([`${exchangeSymbol.toLowerCase()}@aggTrade`]);
  }

  /** Subscribe to orderbook depth snapshots for a normalized symbol. */
  subscribeOrderbook(symbol: string, _depth?: number): void {
    this.subscribedOrderbooks.add(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    if (!this.orderbookManagers.has(symbol)) {
      this.orderbookManagers.set(
        symbol,
        new OrderbookManager({ symbol, exchange: 'binance', maxDepth: 20 })
      );
    }
    this.sendSubscribe([`${exchangeSymbol.toLowerCase()}@depth20@100ms`]);
  }

  /** Subscribe to 24hr ticker for a normalized symbol. */
  subscribeTicker(symbol: string): void {
    this.subscribedTickers.add(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendSubscribe([`${exchangeSymbol.toLowerCase()}@ticker`]);
  }

  /** Subscribe to liquidation events (stub for Phase 1). */
  subscribeLiquidations(_symbol: string): void {
    // Liquidations are on the futures endpoint; stub for spot Phase 1
  }

  /** Unsubscribe from the aggTrade stream. */
  unsubscribeTrades(symbol: string): void {
    this.subscribedTrades.delete(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendUnsubscribe([`${exchangeSymbol.toLowerCase()}@aggTrade`]);
  }

  /** Unsubscribe from orderbook depth. */
  unsubscribeOrderbook(symbol: string): void {
    this.subscribedOrderbooks.delete(symbol);
    this.orderbookManagers.delete(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendUnsubscribe([`${exchangeSymbol.toLowerCase()}@depth20@100ms`]);
  }

  /** Unsubscribe from ticker. */
  unsubscribeTicker(symbol: string): void {
    this.subscribedTickers.delete(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendUnsubscribe([`${exchangeSymbol.toLowerCase()}@ticker`]);
  }

  /** Unsubscribe from liquidations (stub). */
  unsubscribeLiquidations(_symbol: string): void {
    // stub
  }

  /**
   * Handles an incoming WebSocket message from Binance.
   * Routes to the appropriate normalizer based on the event type.
   */
  private handleMessage(data: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return; // Malformed JSON — skip
    }

    // Handle combined stream envelope: {"stream":"btcusdt@aggTrade","data":{...}}
    const streamName = parsed['stream'] as string | undefined;
    const payload = streamName
      ? (parsed['data'] as Record<string, unknown>)
      : parsed;

    if (!payload) return;

    const eventType = payload['e'] as string | undefined;

    if (eventType === 'aggTrade') {
      this.handleAggTrade(payload);
    } else if (payload['lastUpdateId'] !== undefined && payload['bids'] !== undefined) {
      // depth20 snapshot (no 'e' field) — use stream name to resolve symbol
      this.handleDepthSnapshot(payload, streamName);
    } else if (eventType === '24hrTicker') {
      this.handleTicker(payload);
    }
    // Subscription ack messages (result: null) are silently ignored
  }

  /**
   * Normalizes a Binance aggTrade message into a NormalizedTrade.
   *
   * Field mapping:
   * - `p` -> price (parseFloat)
   * - `q` -> amount (parseFloat)
   * - `m` (isBuyerMaker) -> side: m=true means taker SELL, m=false means taker BUY
   * - `T` -> timestamp
   * - `a` -> id (as string)
   * - `s` -> symbol (exchange format)
   */
  private handleAggTrade(msg: Record<string, unknown>): void {
    if (typeof msg['p'] !== 'string' || typeof msg['q'] !== 'string') {
      return;
    }
    const price = parseFloat(msg['p']);
    const amount = parseFloat(msg['q']);
    const isBuyerMaker = msg['m'] as boolean;
    const timestamp = msg['T'] as number;
    const id = String(msg['a']);
    const exchangeSymbol = msg['s'] as string;
    const symbol = this.toNormalizedSymbol(exchangeSymbol);

    if (symbol === null || isNaN(price) || isNaN(amount)) {
      return;
    }

    const trade: NormalizedTrade = {
      id,
      exchange: 'binance',
      symbol,
      price,
      amount,
      side: isBuyerMaker ? 'sell' : 'buy',
      timestamp,
      isMaker: isBuyerMaker,
      cost: price * amount,
      liquidation: false,
    };

    this.onTrade?.(trade);
  }

  /**
   * Handles Binance depth20@100ms snapshot messages.
   * These are full snapshots (not deltas), so we replace the entire book.
   */
  private handleDepthSnapshot(msg: Record<string, unknown>, streamName?: string): void {
    const rawBids = msg['bids'] as Array<[string, string]>;
    const rawAsks = msg['asks'] as Array<[string, string]>;
    const lastUpdateId = msg['lastUpdateId'] as number;

    if (!rawBids || !rawAsks) {
      return;
    }

    // Resolve symbol from stream name (e.g., "btcusdt@depth20@100ms" → "BTC/USDT")
    let resolvedSymbol: string | null = null;
    if (streamName) {
      const exchangeSymbol = (streamName.split('@')[0] as string).toUpperCase();
      resolvedSymbol = this.toNormalizedSymbol(exchangeSymbol);
    }

    // Fallback: if only one orderbook is subscribed, use that
    if (!resolvedSymbol && this.subscribedOrderbooks.size === 1) {
      resolvedSymbol = this.subscribedOrderbooks.values().next().value ?? null;
    }

    if (!resolvedSymbol) {
      console.warn('[BinanceAdapter] Cannot resolve symbol for depth snapshot — multiple orderbooks subscribed without stream name');
      return;
    }

    const manager = this.orderbookManagers.get(resolvedSymbol);
    if (!manager) return;

    const bids: PriceLevel[] = rawBids.map(([p, s]) => ({
      price: parseFloat(p),
      size: parseFloat(s),
    }));
    const asks: PriceLevel[] = rawAsks.map(([p, s]) => ({
      price: parseFloat(p),
      size: parseFloat(s),
    }));

    const snapshot: OrderbookSnapshot = {
      exchange: 'binance',
      symbol: resolvedSymbol,
      timestamp: Date.now(),
      bids,
      asks,
      sequenceId: lastUpdateId,
    };

    manager.applySnapshot(snapshot);
    this.onOrderbookSnapshot?.(manager.getSnapshot());
  }

  /**
   * Normalizes a Binance 24hrTicker message into a Ticker.
   */
  private handleTicker(msg: Record<string, unknown>): void {
    const exchangeSymbol = msg['s'] as string;
    const symbol = this.toNormalizedSymbol(exchangeSymbol);
    if (symbol === null) return;

    const ticker: Ticker = {
      exchange: 'binance',
      symbol,
      timestamp: msg['E'] as number,
      lastPrice: parseFloat(msg['c'] as string),
      changePercent24h: parseFloat(msg['P'] as string),
      high24h: parseFloat(msg['h'] as string),
      low24h: parseFloat(msg['l'] as string),
      volume24h: parseFloat(msg['v'] as string),
      quoteVolume24h: parseFloat(msg['q'] as string),
      bbo: {
        bidPrice: parseFloat(msg['b'] as string),
        bidSize: parseFloat(msg['B'] as string),
        askPrice: parseFloat(msg['a'] as string),
        askSize: parseFloat(msg['A'] as string),
      },
    };

    this.onTicker?.(ticker);
  }

  /**
   * Sends a SUBSCRIBE frame to Binance.
   */
  private sendSubscribe(params: string[]): void {
    const id = this.subscriptionId++;
    this.wsManager.send(
      JSON.stringify({ method: 'SUBSCRIBE', params, id })
    );
  }

  /**
   * Sends an UNSUBSCRIBE frame to Binance.
   */
  private sendUnsubscribe(params: string[]): void {
    const id = this.subscriptionId++;
    this.wsManager.send(
      JSON.stringify({ method: 'UNSUBSCRIBE', params, id })
    );
  }

  /**
   * Re-subscribes to all active streams after a reconnection.
   */
  private resubscribeAll(): void {
    const params: string[] = [];
    for (const symbol of this.subscribedTrades) {
      const ex = this.toExchangeSymbol(symbol);
      params.push(`${ex.toLowerCase()}@aggTrade`);
    }
    for (const symbol of this.subscribedOrderbooks) {
      const ex = this.toExchangeSymbol(symbol);
      params.push(`${ex.toLowerCase()}@depth20@100ms`);
    }
    for (const symbol of this.subscribedTickers) {
      const ex = this.toExchangeSymbol(symbol);
      params.push(`${ex.toLowerCase()}@ticker`);
    }
    if (params.length > 0) {
      this.sendSubscribe(params);
    }
  }

  /**
   * Converts a normalized symbol (e.g. "BTC/USDT") to Binance format ("BTCUSDT").
   */
  private toExchangeSymbol(normalizedSymbol: string): string {
    return normalizedSymbol.replace('/', '');
  }

  /**
   * Converts a Binance symbol (e.g. "BTCUSDT") to normalized format ("BTC/USDT").
   * Uses known quote currencies to determine where to insert the separator.
   */
  private toNormalizedSymbol(exchangeSymbol: string): string | null {
    const quotes = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB', 'TUSD', 'FDUSD', 'USD'];
    for (const quote of quotes) {
      if (exchangeSymbol.endsWith(quote) && exchangeSymbol.length > quote.length) {
        const base = exchangeSymbol.slice(0, exchangeSymbol.length - quote.length);
        return `${base}/${quote}`;
      }
    }
    return null;
  }
}
