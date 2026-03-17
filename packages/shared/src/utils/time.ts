import type { CandleTimeframe } from '@terminal/types';
import { TIMEFRAME_MS } from '../constants/timeframes.js';

/**
 * Converts a Date or numeric timestamp to unix milliseconds.
 * If already a number, returns it as-is.
 */
export function toUnixMs(time: Date | number): number {
  if (typeof time === 'number') {
    return time;
  }
  return time.getTime();
}

/**
 * Floors a timestamp to the start of the given timeframe bucket.
 *
 * @example
 * bucketToTimeframe(1710000123456, '1m') // => 1710000120000
 */
export function bucketToTimeframe(timestampMs: number, timeframe: CandleTimeframe): number {
  const ms = TIMEFRAME_MS[timeframe];
  return Math.floor(timestampMs / ms) * ms;
}
