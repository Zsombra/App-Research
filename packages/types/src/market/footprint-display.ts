/**
 * Footprint display / visualization mode types.
 *
 * Controls how the footprint candle cells render:
 * - 'bid-ask': Shows Bid volume | Ask volume side by side
 * - 'delta': Shows net delta (buy - sell) per level
 * - 'total-volume': Shows total volume per level
 * - 'bid-ask-delta': Bid | Ask with delta color gradient
 */

/** How footprint cells display data. */
export type FootprintDisplayMode = 'bid-ask' | 'delta' | 'total-volume' | 'bid-ask-delta';

/** Footprint display configuration. */
export interface FootprintDisplayConfig {
  /** Active display mode */
  mode: FootprintDisplayMode;
  /** Whether to show volume text labels on cells */
  showLabels: boolean;
  /** Whether to highlight imbalance levels (bid/ask ratio > threshold) */
  highlightImbalances: boolean;
  /** Imbalance ratio threshold (e.g. 3.0 = 300% more on one side) */
  imbalanceThreshold: number;
  /** Whether to show the POC (Point of Control) line per candle */
  showPOC: boolean;
  /** Whether to show cumulative delta at the bottom */
  showCumulativeDelta: boolean;
}

/** Default footprint display config. */
export const DEFAULT_FOOTPRINT_DISPLAY_CONFIG: FootprintDisplayConfig = {
  mode: 'bid-ask',
  showLabels: false,
  highlightImbalances: true,
  imbalanceThreshold: 3.0,
  showPOC: true,
  showCumulativeDelta: true,
};
