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

/** Default WebSocket URL for Bybit linear perpetuals. */
const DEFAULT_WS_URL = 'wss://stream.bybit.com/v5/public/linear';
const BYBIT_ORDERBOOK_DEPTH = 50;
const BYBIT_QUOTE_CURRENCIES = ['USDT', 'USDC', 'BTC', 'ETH', 'USD'] as const;

/**
 * Bybit exchange adapter for linear perpetual contracts.
 *
 * Connects to Bybit's v5 public linear WebSocket and normalizes
 * trade (publicTrade), orderbook, and ticker data.
 *
 * Symbol format: Bybit uses "BTCUSDT", we normalize to "BTC/USDT".
 * Ping: Sends `{"op":"ping"}` every 20 seconds.
 */
export class BybitAdapter extends BaseExchangeAdapter {
  readonly exchangeId: ExchangeId = 'bybit';

  private wsManager: WebSocketManager;
  private orderbookManagers: Map<string, OrderbookManager> = new Map();
  private subscribedTrades: Set<string> = new Set();
  private subscribedOrderbooks: Set<string> = new Set();
  private subscribedTickers: Set<string> = new Set();

  constructor(wsUrl?: string) {
    super();
    this.wsManager = new WebSocketManager({
      url: wsUrl ?? DEFAULT_WS_URL,
      heartbeatInterval: 20_000,
      pingPayload: '{"op":"ping"}',
      maxReconnectAttempts: 10,
      inboundTimeout: 600_000,
    });

    this.wsManager.onMessage = (data: string) => this.handleMessage(data);
    this.wsManager.onStateChange = (state: ConnectionStatus) => {
      this.setStatus(state);
      if (state === ConnectionStatus.Connected) {
        this.resubscribeAll();
      }
    };
    this.wsManager.onError = (error: Error) => {
      console.warn(`[BybitAdapter] WebSocket error: ${error.message}`);
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

  /** Subscribe to publicTrade for a normalized symbol. */
  subscribeTrades(symbol: string): void {
    this.subscribedTrades.add(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendSubscribe([`publicTrade.${exchangeSymbol}`]);
  }

  /** Subscribe to orderbook depth for a normalized symbol. */
  subscribeOrderbook(symbol: string, _depth?: number): void {
    this.subscribedOrderbooks.add(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    if (!this.orderbookManagers.has(symbol)) {
      this.orderbookManagers.set(
        symbol,
        new OrderbookManager({ symbol, exchange: 'bybit', maxDepth: BYBIT_ORDERBOOK_DEPTH })
      );
    }
    this.sendSubscribe([`orderbook.50.${exchangeSymbol}`]);
  }

  /** Subscribe to ticker for a normalized symbol. */
  subscribeTicker(symbol: string): void {
    this.subscribedTickers.add(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendSubscribe([`tickers.${exchangeSymbol}`]);
  }

  /** Subscribe to liquidation events (stub for Phase 1). */
  subscribeLiquidations(_symbol: string): void {
    // stub
  }

  /** Unsubscribe from publicTrade. */
  unsubscribeTrades(symbol: string): void {
    this.subscribedTrades.delete(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendUnsubscribe([`publicTrade.${exchangeSymbol}`]);
  }

  /** Unsubscribe from orderbook. */
  unsubscribeOrderbook(symbol: string): void {
    this.subscribedOrderbooks.delete(symbol);
    this.orderbookManagers.delete(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendUnsubscribe([`orderbook.50.${exchangeSymbol}`]);
  }

  /** Unsubscribe from ticker. */
  unsubscribeTicker(symbol: string): void {
    this.subscribedTickers.delete(symbol);
    const exchangeSymbol = this.toExchangeSymbol(symbol);
    this.sendUnsubscribe([`tickers.${exchangeSymbol}`]);
  }

  /** Unsubscribe from liquidations (stub). */
  unsubscribeLiquidations(_symbol: string): void {
    // stub
  }

  /**
   * Handles an incoming WebSocket message from Bybit.
   * Routes based on the topic field.
   */
  private handleMessage(data: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    // Pong response — ignore
    if (parsed['op'] === 'pong' || parsed['ret_msg'] === 'pong') {
      return;
    }

    // Subscription ack
    if (parsed['op'] === 'subscribe') {
      return;
    }

    const topic = parsed['topic'] as string | undefined;
    if (!topic) return;

    const topicData = parsed['data'] as Record<string, unknown> | undefined;
    if (!topicData && !Array.isArray(parsed['data'])) return;

    if (topic.startsWith('publicTrade.')) {
      this.handlePublicTrade(topic, parsed['data'] as Array<Record<string, unknown>>);
    } else if (topic.startsWith('orderbook.')) {
      const type = parsed['type'] as string;
      this.handleOrderbook(topic, type, parsed['data'] as Record<string, unknown>);
    } else if (topic.startsWith('tickers.')) {
      this.handleTicker(topic, parsed['data'] as Record<string, unknown>);
    }
  }

  /**
   * Normalizes Bybit publicTrade messages into NormalizedTrade.
   *
   * Field mapping:
   * - `p` -> price
   * - `v` -> amount
   * - `S` -> side ("Buy"/"Sell" -> 'buy'/'sell')
   * - `T` -> timestamp
   * - `i` -> id
   */
  private handlePublicTrade(
    topic: string,
    trades: readonly Record<string, unknown>[],
  ): void {
    const exchangeSymbol = topic.replace('publicTrade.', '');
    const symbol = this.toNormalizedSymbol(exchangeSymbol);
    if (symbol === null) return;

    for (const t of trades) {
      if (typeof t['p'] !== 'string' || typeof t['v'] !== 'string') continue;
      const price = parseFloat(t['p']);
      const amount = parseFloat(t['v']);
      const rawSide = t['S'] as string;
      const timestamp = t['T'] as number;
      const id = String(t['i']);

      if (isNaN(price) || isNaN(amount)) continue;

      const trade: NormalizedTrade = {
        id,
        exchange: 'bybit',
        symbol,
        price,
        amount,
        side: rawSide === 'Buy' ? 'buy' : 'sell',
        timestamp,
        isMaker: false, // Bybit publicTrade does not indicate maker
        cost: price * amount,
        liquidation: false,
      };

      this.onTrade?.(trade);
    }
  }

  /**
   * Handles Bybit orderbook messages. Supports both "snapshot" and "delta" types.
   *
   * Bybit sends an explicit snapshot message on subscription, followed by deltas.
   */
  private handleOrderbook(
    topic: string,
    type: string,
    data: Record<string, unknown>
  ): void {
    // topic format: orderbook.50.BTCUSDT
    const parts = topic.split('.');
    const exchangeSymbol = parts[2];
    if (!exchangeSymbol) return;
    const symbol = this.toNormalizedSymbol(exchangeSymbol);
    if (symbol === null) return;

    const manager = this.orderbookManagers.get(symbol);
    if (!manager) return;

    const rawBids = data['b'] as Array<[string, string]>;
    const rawAsks = data['a'] as Array<[string, string]>;
    const sequenceId = (data['u'] as number) ?? 0;

    const bids: PriceLevel[] = (rawBids ?? []).map(([p, s]) => ({
      price: parseFloat(p),
      size: parseFloat(s),
    }));
    const asks: PriceLevel[] = (rawAsks ?? []).map(([p, s]) => ({
      price: parseFloat(p),
      size: parseFloat(s),
    }));

    if (type === 'snapshot') {
      const snapshot: OrderbookSnapshot = {
        exchange: 'bybit',
        symbol,
        timestamp: Date.now(),
        bids,
        asks,
        sequenceId,
      };
      manager.applySnapshot(snapshot);
    } else {
      // delta
      manager.applyDelta({
        exchange: 'bybit',
        symbol,
        timestamp: Date.now(),
        bids,
        asks,
        sequenceId,
        prevSequenceId: (data['seq'] as number) ?? 0,
      });
    }

    this.onOrderbookSnapshot?.(manager.getSnapshot());
  }

  /**
   * Normalizes a Bybit ticker message into a Ticker.
   */
  private handleTicker(topic: string, data: Record<string, unknown>): void {
    const exchangeSymbol = topic.replace('tickers.', '');
    const symbol = this.toNormalizedSymbol(exchangeSymbol);
    if (symbol === null) return;

    const lastPrice = parseFloat(data['lastPrice'] as string);
    if (isNaN(lastPrice)) return;

    const ticker: Ticker = {
      exchange: 'bybit',
      symbol,
      timestamp: Date.now(),
      lastPrice,
      changePercent24h: parseFloat(data['price24hPcnt'] as string) * 100 || 0,
      high24h: parseFloat(data['highPrice24h'] as string) || lastPrice,
      low24h: parseFloat(data['lowPrice24h'] as string) || lastPrice,
      volume24h: parseFloat(data['volume24h'] as string) || 0,
      quoteVolume24h: parseFloat(data['turnover24h'] as string) || 0,
      bbo: {
        bidPrice: parseFloat(data['bid1Price'] as string) || lastPrice,
        bidSize: parseFloat(data['bid1Size'] as string) || 0,
        askPrice: parseFloat(data['ask1Price'] as string) || lastPrice,
        askSize: parseFloat(data['ask1Size'] as string) || 0,
      },
    };

    this.onTicker?.(ticker);
  }

  /** Sends a subscribe message to Bybit. */
  private sendSubscribe(args: readonly string[]): void {
    this.wsManager.send(
      JSON.stringify({ op: 'subscribe', args })
    );
  }

  /** Sends an unsubscribe message to Bybit. */
  private sendUnsubscribe(args: readonly string[]): void {
    this.wsManager.send(
      JSON.stringify({ op: 'unsubscribe', args })
    );
  }

  /** Re-subscribes to all active streams after reconnection. */
  private resubscribeAll(): void {
    const args: string[] = [];
    for (const symbol of this.subscribedTrades) {
      args.push(`publicTrade.${this.toExchangeSymbol(symbol)}`);
    }
    for (const symbol of this.subscribedOrderbooks) {
      args.push(`orderbook.50.${this.toExchangeSymbol(symbol)}`);
    }
    for (const symbol of this.subscribedTickers) {
      args.push(`tickers.${this.toExchangeSymbol(symbol)}`);
    }
    if (args.length > 0) {
      this.sendSubscribe(args);
    }
  }

  /**
   * Converts a normalized symbol (e.g. "BTC/USDT") to Bybit format ("BTCUSDT").
   */
  private toExchangeSymbol(normalizedSymbol: string): string {
    return normalizedSymbol.replace('/', '');
  }

  /**
   * Converts a Bybit symbol (e.g. "BTCUSDT") to normalized format ("BTC/USDT").
   */
  private toNormalizedSymbol(exchangeSymbol: string): string | null {
    const quotes = BYBIT_QUOTE_CURRENCIES;
    for (const quote of quotes) {
      if (exchangeSymbol.endsWith(quote) && exchangeSymbol.length > quote.length) {
        const base = exchangeSymbol.slice(0, exchangeSymbol.length - quote.length);
        return `${base}/${quote}`;
      }
    }
    return null;
  }
}
