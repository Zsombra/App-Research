import type { OHLCVCandle, MarketProfile, TPORow } from '@terminal/types';
import { bucketPrice } from './footprint.js';

/**
 * Compute a Market Profile (TPO) from candle data.
 *
 * Each candle contributes TPO counts to every price level between its low and high.
 * The Point of Control (POC) is the level with the most TPOs.
 * The Value Area (70% of total volume) is calculated around the POC.
 *
 * @param candles - OHLCV candles to analyze
 * @param tickSize - Price bucket size
 * @param valueAreaPercent - Fraction for value area (default 0.70)
 * @param ibPeriodMinutes - Initial balance period in minutes (default 60)
 * @returns Computed MarketProfile
 */
export function computeMarketProfile(
  candles: OHLCVCandle[],
  tickSize: number,
  valueAreaPercent: number = 0.70,
  ibPeriodMinutes: number = 60,
): MarketProfile {
  if (candles.length === 0) {
    return {
      sessionStart: 0,
      sessionEnd: 0,
      tickSize,
      rows: [],
      poc: 0,
      vah: 0,
      val: 0,
      high: 0,
      low: 0,
      ibHigh: 0,
      ibLow: 0,
    };
  }

  const sessionStart = candles[0]!.timestamp;
  const sessionEnd = candles[candles.length - 1]!.timestamp;
  const ibEndTime = sessionStart + ibPeriodMinutes * 60_000;

  // Accumulate TPO counts and volume per price level
  const levelMap = new Map<number, { tpoCount: number; volume: number; buyVol: number; sellVol: number }>();

  let globalHigh = -Infinity;
  let globalLow = Infinity;
  let ibHigh = -Infinity;
  let ibLow = Infinity;

  for (const candle of candles) {
    const low = bucketPrice(candle.low, tickSize);
    const high = bucketPrice(candle.high, tickSize);

    if (candle.high > globalHigh) globalHigh = candle.high;
    if (candle.low < globalLow) globalLow = candle.low;

    // Initial balance
    if (candle.timestamp < ibEndTime) {
      if (candle.high > ibHigh) ibHigh = candle.high;
      if (candle.low < ibLow) ibLow = candle.low;
    }

    // Count TPOs: one letter for each price level the candle touches
    const numLevels = Math.max(1, Math.round((high - low) / tickSize) + 1);
    const volPerLevel = candle.volume / numLevels;
    const buyPerLevel = candle.buyVolume / numLevels;
    const sellPerLevel = candle.sellVolume / numLevels;

    for (let i = 0; i < numLevels; i++) {
      const price = low + i * tickSize;
      let entry = levelMap.get(price);
      if (!entry) {
        entry = { tpoCount: 0, volume: 0, buyVol: 0, sellVol: 0 };
        levelMap.set(price, entry);
      }
      entry.tpoCount += 1;
      entry.volume += volPerLevel;
      entry.buyVol += buyPerLevel;
      entry.sellVol += sellPerLevel;
    }
  }

  // Build sorted rows
  const rows: TPORow[] = [];
  for (const [price, data] of levelMap) {
    rows.push({
      price,
      tpoCount: data.tpoCount,
      volume: data.volume,
      buyVolume: data.buyVol,
      sellVolume: data.sellVol,
    });
  }
  rows.sort((a, b) => a.price - b.price);

  // Find POC (highest TPO count)
  let poc = 0;
  let maxTpo = 0;
  for (const row of rows) {
    if (row.tpoCount > maxTpo) {
      maxTpo = row.tpoCount;
      poc = row.price;
    }
  }

  // Compute Value Area (70% of total volume around POC)
  const totalVolume = rows.reduce((sum, r) => sum + r.volume, 0);
  const vaTarget = totalVolume * valueAreaPercent;

  const pocIndex = rows.findIndex((r) => r.price === poc);
  let vaVolume = pocIndex >= 0 ? rows[pocIndex]!.volume : 0;
  let vaHighIdx = pocIndex;
  let vaLowIdx = pocIndex;

  while (vaVolume < vaTarget && (vaHighIdx < rows.length - 1 || vaLowIdx > 0)) {
    const upVol = vaHighIdx < rows.length - 1 ? rows[vaHighIdx + 1]!.volume : 0;
    const downVol = vaLowIdx > 0 ? rows[vaLowIdx - 1]!.volume : 0;

    if (upVol >= downVol && vaHighIdx < rows.length - 1) {
      vaHighIdx++;
      vaVolume += rows[vaHighIdx]!.volume;
    } else if (vaLowIdx > 0) {
      vaLowIdx--;
      vaVolume += rows[vaLowIdx]!.volume;
    } else {
      vaHighIdx++;
      vaVolume += rows[vaHighIdx]!.volume;
    }
  }

  const vah = vaHighIdx >= 0 && vaHighIdx < rows.length ? rows[vaHighIdx]!.price : globalHigh;
  const val = vaLowIdx >= 0 && vaLowIdx < rows.length ? rows[vaLowIdx]!.price : globalLow;

  // Handle edge case where no IB candles exist
  if (ibHigh === -Infinity) ibHigh = globalHigh;
  if (ibLow === Infinity) ibLow = globalLow;

  return {
    sessionStart,
    sessionEnd,
    tickSize,
    rows,
    poc,
    vah,
    val,
    high: globalHigh,
    low: globalLow,
    ibHigh,
    ibLow,
  };
}
