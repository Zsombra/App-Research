import type { FootprintLevel } from '@terminal/types';
import type { FootprintDisplayMode } from '@terminal/types';

/**
 * Data for a single rendered footprint cell in the chosen display mode.
 */
export interface FootprintCellData {
  /** Price level */
  price: number;
  /** Left value (bid side in bid-ask mode, or single value in delta/total) */
  leftValue: number;
  /** Right value (ask side in bid-ask mode, or 0 in delta/total) */
  rightValue: number;
  /** Text label for the left side */
  leftLabel: string;
  /** Text label for the right side */
  rightLabel: string;
  /** Normalized color intensity (-1 to 1, negative = bearish, positive = bullish) */
  colorIntensity: number;
  /** Whether this level has an imbalance */
  isImbalance: boolean;
  /** Whether this is the POC (Point of Control) level */
  isPOC: boolean;
}

/**
 * Transform footprint levels into display-mode-specific cell data.
 */
export function transformFootprintLevels(
  levels: readonly FootprintLevel[],
  mode: FootprintDisplayMode,
  imbalanceThreshold: number,
): FootprintCellData[] {
  if (levels.length === 0) return [];

  // Find POC (highest total volume level)
  let pocPrice = (levels[0] as FootprintLevel).price;
  let pocVol = 0;
  let maxTotal = 0;

  for (const level of levels) {
    const total = level.buyVolume + level.sellVolume;
    if (total > pocVol) {
      pocVol = total;
      pocPrice = level.price;
    }
    if (total > maxTotal) maxTotal = total;
  }

  return levels.map((level) => {
    const total = level.buyVolume + level.sellVolume;
    const delta = level.buyVolume - level.sellVolume;
    const isPOC = level.price === pocPrice;

    // Detect imbalance: one side is N times larger than the other
    const bidAskRatio = level.sellVolume > 0
      ? level.buyVolume / level.sellVolume
      : level.buyVolume > 0 ? imbalanceThreshold : 0;
    const askBidRatio = level.buyVolume > 0
      ? level.sellVolume / level.buyVolume
      : level.sellVolume > 0 ? imbalanceThreshold : 0;
    const isImbalance = bidAskRatio >= imbalanceThreshold || askBidRatio >= imbalanceThreshold;

    switch (mode) {
      case 'bid-ask':
        return {
          price: level.price,
          leftValue: level.sellVolume,
          rightValue: level.buyVolume,
          leftLabel: formatVolume(level.sellVolume),
          rightLabel: formatVolume(level.buyVolume),
          colorIntensity: maxTotal > 0 ? delta / maxTotal : 0,
          isImbalance,
          isPOC,
        };

      case 'delta':
        return {
          price: level.price,
          leftValue: delta,
          rightValue: 0,
          leftLabel: (delta >= 0 ? '+' : '') + formatVolume(delta),
          rightLabel: '',
          colorIntensity: maxTotal > 0 ? delta / maxTotal : 0,
          isImbalance,
          isPOC,
        };

      case 'total-volume':
        return {
          price: level.price,
          leftValue: total,
          rightValue: 0,
          leftLabel: formatVolume(total),
          rightLabel: '',
          colorIntensity: maxTotal > 0 ? delta / maxTotal : 0,
          isImbalance,
          isPOC,
        };

      case 'bid-ask-delta': {
        // Show bid|ask but color based on delta
        const normalizedDelta = maxTotal > 0 ? delta / maxTotal : 0;
        return {
          price: level.price,
          leftValue: level.sellVolume,
          rightValue: level.buyVolume,
          leftLabel: formatVolume(level.sellVolume),
          rightLabel: formatVolume(level.buyVolume),
          colorIntensity: normalizedDelta,
          isImbalance,
          isPOC,
        };
      }
    }
  });
}

/**
 * Compute cumulative delta for a footprint candle.
 */
export function computeFootprintCumulativeDelta(levels: readonly FootprintLevel[]): number {
  let cumDelta = 0;
  for (const level of levels) {
    cumDelta += level.buyVolume - level.sellVolume;
  }
  return cumDelta;
}

function formatVolume(vol: number): string {
  const abs = Math.abs(vol);
  if (abs >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return vol.toFixed(0);
}
