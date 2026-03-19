
/**
 * Custom bar type definitions beyond standard time-based intervals.
 *
 * Supports:
 * - Tick bars: N trades per bar
 * - Volume bars: N contracts/units per bar
 * - Range bars: fixed price range per bar
 */

/** Bar construction method. */
export type BarType = 'time' | 'tick' | 'volume' | 'range';

/** Configuration for tick-based bars (N trades per bar). */
export interface TickBarConfig {
  type: 'tick';
  /** Number of trades per bar */
  tickCount: number;
}

/** Configuration for volume-based bars (N units of volume per bar). */
export interface VolumeBarConfig {
  type: 'volume';
  /** Volume threshold per bar (in base currency) */
  volumeThreshold: number;
}

/** Configuration for range bars (fixed price range per bar). */
export interface RangeBarConfig {
  type: 'range';
  /** Price range per bar (e.g. 10 = $10 movement per bar) */
  rangeSize: number;
}

/** Union of all custom bar configurations. */
export type CustomBarConfig = TickBarConfig | VolumeBarConfig | RangeBarConfig;

/** Default configs for each bar type. */
export const DEFAULT_TICK_BAR_CONFIG: TickBarConfig = {
  type: 'tick',
  tickCount: 100,
};

export const DEFAULT_VOLUME_BAR_CONFIG: VolumeBarConfig = {
  type: 'volume',
  volumeThreshold: 10,
};

export const DEFAULT_RANGE_BAR_CONFIG: RangeBarConfig = {
  type: 'range',
  rangeSize: 10,
};
