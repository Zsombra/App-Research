import type { OHLCVCandle, IndicatorKind, IndicatorPoint } from '@terminal/types';
import { computeSMA } from './sma.js';
import { computeEMA } from './ema.js';
import { computeRSI } from './rsi.js';
import { computeMACD } from './macd.js';
import { computeBollinger } from './bollinger.js';
import { computeCVD } from './cvd.js';
import { computeVWAP } from './vwap.js';

export { computeSMA } from './sma.js';
export { computeEMA } from './ema.js';
export { computeRSI } from './rsi.js';
export { computeMACD } from './macd.js';
export { computeBollinger } from './bollinger.js';
export { computeCVD } from './cvd.js';
export { computeVWAP } from './vwap.js';

/**
 * Dispatch function: compute any indicator by kind.
 * Returns an array of indicator points matching the candle array length.
 */
export function computeIndicator(
  kind: IndicatorKind,
  candles: OHLCVCandle[],
  params: Record<string, number>
): IndicatorPoint<unknown>[] {
  switch (kind) {
    case 'sma':
      return computeSMA(candles, params['period'] ?? 20);
    case 'ema':
      return computeEMA(candles, params['period'] ?? 20);
    case 'rsi':
      return computeRSI(candles, params['period'] ?? 14);
    case 'macd':
      return computeMACD(
        candles,
        params['fastPeriod'] ?? 12,
        params['slowPeriod'] ?? 26,
        params['signalPeriod'] ?? 9
      );
    case 'bollinger':
      return computeBollinger(
        candles,
        params['period'] ?? 20,
        params['stdDev'] ?? 2
      );
    case 'cvd':
      return computeCVD(candles);
    case 'vwap':
      return computeVWAP(candles);
  }
}
