import type { ExchangeId, ConnectionStatus } from '../exchange/connection.js';
import type { SubscriptionTopic } from '../exchange/subscription.js';
import type { NormalizedTrade } from '../market/trade.js';
import type { OHLCVCandle, CandleTimeframe } from '../market/candle.js';
import type { OrderbookSnapshot } from '../market/orderbook.js';
import type { Ticker } from '../market/ticker.js';

/**
 * Messages sent from the main thread to the data worker.
 * Uses discriminated union on the `type` field.
 */
export type WorkerInboundMessage =
  | {
      type: 'subscribe';
      symbol: string;
      exchanges: ExchangeId[];
      topics: SubscriptionTopic[];
    }
  | { type: 'unsubscribe'; symbol: string }
  | { type: 'set-timeframe'; symbol: string; timeframe: CandleTimeframe }
  | { type: 'request-snapshot'; symbol: string; topic: SubscriptionTopic }
  | {
      type: 'add-indicator';
      id: string;
      kind: string;
      params: Record<string, unknown>;
    }
  | { type: 'remove-indicator'; id: string };

/**
 * Messages sent from the data worker to the main thread.
 * Uses discriminated union on the `type` field.
 */
export type WorkerOutboundMessage =
  | { type: 'trade-batch'; symbol: string; trades: NormalizedTrade[] }
  | {
      type: 'candle-update';
      symbol: string;
      timeframe: CandleTimeframe;
      candle: OHLCVCandle;
    }
  | { type: 'orderbook'; symbol: string; snapshot: OrderbookSnapshot }
  | { type: 'ticker'; symbol: string; ticker: Ticker }
  | {
      type: 'connection-status';
      exchange: ExchangeId;
      status: ConnectionStatus;
    }
  | { type: 'error'; code: string; message: string };
