/**
 * Maximum number of panels allowed in a single workspace.
 */
export const MAX_PANELS = 20;

/**
 * Default capacity of ring buffers for trade history per symbol.
 */
export const RING_BUFFER_SIZE = 1_000;

/**
 * Memory budget constants for the application.
 */
export const MEMORY_BUDGETS = {
  /** Maximum memory for the data worker in bytes (256 MB) */
  WORKER_MAX_BYTES: 256 * 1024 * 1024,
  /** Maximum memory for orderbook state per symbol in bytes (1 MB) */
  ORDERBOOK_MAX_BYTES: 1 * 1024 * 1024,
  /** Maximum number of candles retained per symbol/timeframe pair */
  MAX_CANDLES_PER_SERIES: 5_000,
  /** Maximum number of symbols that can be subscribed simultaneously */
  MAX_SUBSCRIBED_SYMBOLS: 50,
} as const;
