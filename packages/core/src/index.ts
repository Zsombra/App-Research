// Adapters
export { BaseExchangeAdapter } from './adapters/base-adapter.js';
export { BinanceAdapter } from './adapters/binance/binance-adapter.js';
export { BybitAdapter } from './adapters/bybit/bybit-adapter.js';
export { CoinbaseAdapter } from './adapters/coinbase/coinbase-adapter.js';
export { SimulatedAdapter } from './adapters/simulated/simulated-adapter.js';

// WebSocket
export { WebSocketManager } from './ws/ws-manager.js';
export type { WebSocketManagerConfig } from './ws/ws-manager.js';
export type { IWebSocket, IWebSocketConstructor, WSMessageEvent, WSCloseEvent } from './ws/websocket-types.js';
export { getWebSocketConstructor, WS_CONNECTING, WS_OPEN, WS_CLOSING, WS_CLOSED } from './ws/websocket-types.js';

// Orderbook
export { OrderbookManager, SequenceGapError } from './orderbook/orderbook-manager.js';
export type { OrderbookManagerConfig } from './orderbook/orderbook-manager.js';

// Indicators
export { computeSMA } from './indicators/sma.js';
export { computeEMA } from './indicators/ema.js';
export { computeRSI } from './indicators/rsi.js';
export { computeMACD } from './indicators/macd.js';
export { computeBollinger } from './indicators/bollinger.js';
export { computeCVD } from './indicators/cvd.js';
export { computeVWAP } from './indicators/vwap.js';
export { computeIndicator } from './indicators/index.js';
export { buildFootprintFromTrades, buildFootprintFromCandles, autoTickSize, bucketPrice } from './indicators/footprint.js';
export { filterFootprintLevels } from './indicators/footprint-filter.js';
export { computeMarketProfile } from './indicators/tpo.js';
export { computeOrderbookImbalance, detectStackedImbalances } from './indicators/orderbook-imbalance.js';
export type { ImbalanceResult, StackedImbalance, Absorption } from './indicators/orderbook-imbalance.js';

// Trade clustering
export { clusterTradeSizes } from './indicators/trade-cluster.js';
export { clusterByTime } from './indicators/time-cluster.js';

// SL/TP estimation engine
export {
  computeSLTPHeatmap,
  computeLiquidationLevels,
  detectSwingPoints,
  clusterSwingPoints,
  computeATR,
  computeRoundNumberLevels,
  detectHistoricalSweeps,
  dbscanCluster,
  dbscanSLTPClusters,
  computeCompositeScores,
} from './indicators/sl-tp-engine.js';

// VWAP variants
export { computeAnchoredVWAP, computeRollingVWAP } from './indicators/vwap-extended.js';

// Custom bar types
export { buildTickBars, buildVolumeBars, buildRangeBars } from './indicators/custom-bars.js';

// Footprint display modes
export { transformFootprintLevels, computeFootprintCumulativeDelta } from './indicators/footprint-display.js';
export type { FootprintCellData } from './indicators/footprint-display.js';

// Scripting
export { executeScript } from './scripting/script-engine.js';

// Worker
export { FlushScheduler } from './worker/flush-scheduler.js';
export type { FlushSchedulerConfig } from './worker/flush-scheduler.js';
export { DataWorker, initializeWorker } from './worker/data-worker.js';
