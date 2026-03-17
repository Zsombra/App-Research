import type { OHLCVCandle, IndicatorPoint, MACDOutput } from '@terminal/types';

/**
 * Compute MACD (Moving Average Convergence Divergence).
 * MACD Line = Fast EMA - Slow EMA
 * Signal Line = EMA of MACD Line
 * Histogram = MACD Line - Signal Line
 */
export function computeMACD(
  candles: OHLCVCandle[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): IndicatorPoint<MACDOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<MACDOutput>[] = new Array(len);
  const nullPoint: MACDOutput = { macd: null, signal: null, histogram: null };

  if (len === 0) return result;

  // Compute fast and slow EMAs
  const fastMult = 2 / (fastPeriod + 1);
  const slowMult = 2 / (slowPeriod + 1);
  const signalMult = 2 / (signalPeriod + 1);

  let fastEma = 0;
  let slowEma = 0;
  let signalEma = 0;
  let fastSum = 0;
  let slowSum = 0;
  let fastReady = false;
  let slowReady = false;
  let signalCount = 0;
  let signalSum = 0;
  let signalReady = false;

  for (let i = 0; i < len; i++) {
    const close = candles[i]!.close;

    // Fast EMA
    if (!fastReady) {
      fastSum += close;
      if (i === fastPeriod - 1) {
        fastEma = fastSum / fastPeriod;
        fastReady = true;
      }
    } else {
      fastEma = (close - fastEma) * fastMult + fastEma;
    }

    // Slow EMA
    if (!slowReady) {
      slowSum += close;
      if (i === slowPeriod - 1) {
        slowEma = slowSum / slowPeriod;
        slowReady = true;
      }
    } else {
      slowEma = (close - slowEma) * slowMult + slowEma;
    }

    if (!fastReady || !slowReady) {
      result[i] = { timestamp: candles[i]!.timestamp, data: { ...nullPoint } };
      continue;
    }

    const macdLine = fastEma - slowEma;

    // Signal EMA (EMA of MACD line)
    if (!signalReady) {
      signalSum += macdLine;
      signalCount++;
      if (signalCount === signalPeriod) {
        signalEma = signalSum / signalPeriod;
        signalReady = true;
        result[i] = {
          timestamp: candles[i]!.timestamp,
          data: { macd: macdLine, signal: signalEma, histogram: macdLine - signalEma },
        };
      } else {
        result[i] = {
          timestamp: candles[i]!.timestamp,
          data: { macd: macdLine, signal: null, histogram: null },
        };
      }
    } else {
      signalEma = (macdLine - signalEma) * signalMult + signalEma;
      result[i] = {
        timestamp: candles[i]!.timestamp,
        data: { macd: macdLine, signal: signalEma, histogram: macdLine - signalEma },
      };
    }
  }

  return result;
}
