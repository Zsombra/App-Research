import type { OHLCVCandle, IndicatorPoint, RSIOutput } from '@terminal/types';

/**
 * Compute Relative Strength Index using the Wilder smoothing method.
 * Requires at least `period + 1` candles for the first valid value.
 * Returns null for points with insufficient data.
 */
export function computeRSI(
  candles: OHLCVCandle[],
  period: number
): IndicatorPoint<RSIOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<RSIOutput>[] = new Array(len);

  if (len === 0) return result;

  // First candle has no change
  result[0] = { timestamp: candles[0]!.timestamp, data: { value: null } };

  if (len < period + 1) {
    for (let i = 1; i < len; i++) {
      result[i] = { timestamp: candles[i]!.timestamp, data: { value: null } };
    }
    return result;
  }

  // Calculate initial average gain/loss from first `period` changes
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i]!.close - candles[i - 1]!.close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
    result[i] = { timestamp: candles[i]!.timestamp, data: { value: null } };
  }

  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  result[period] = { timestamp: candles[period]!.timestamp, data: { value: rsi } };

  // Subsequent values using Wilder smoothing
  for (let i = period + 1; i < len; i++) {
    const change = candles[i]!.close - candles[i - 1]!.close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const currentRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + currentRs);

    result[i] = { timestamp: candles[i]!.timestamp, data: { value: currentRsi } };
  }

  return result;
}
