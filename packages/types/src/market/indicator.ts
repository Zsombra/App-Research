/** Supported indicator kinds. */
export type IndicatorKind = 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger' | 'cvd' | 'vwap';

/** Whether an indicator renders overlaid on price or in a separate pane. */
export type IndicatorPlacement = 'overlay' | 'separate';

/** Maps each indicator kind to its placement. */
export const INDICATOR_PLACEMENT: Record<IndicatorKind, IndicatorPlacement> = {
  sma: 'overlay',
  ema: 'overlay',
  rsi: 'separate',
  macd: 'separate',
  bollinger: 'overlay',
  cvd: 'separate',
  vwap: 'overlay',
};

// --- Parameter types ---

export interface SMAParams { period: number }
export interface EMAParams { period: number }
export interface RSIParams { period: number }
export interface MACDParams { fastPeriod: number; slowPeriod: number; signalPeriod: number }
export interface BollingerParams { period: number; stdDev: number }
export interface CVDParams { _placeholder?: number }
export interface VWAPParams { _placeholder?: number }

/** Default parameters per indicator kind. */
export const INDICATOR_DEFAULTS: Record<IndicatorKind, Record<string, number>> = {
  sma: { period: 20 },
  ema: { period: 20 },
  rsi: { period: 14 },
  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  bollinger: { period: 20, stdDev: 2 },
  cvd: {},
  vwap: {},
};

// --- Output types ---

export interface SMAOutput { value: number | null }
export interface EMAOutput { value: number | null }
export interface RSIOutput { value: number | null }
export interface MACDOutput { macd: number | null; signal: number | null; histogram: number | null }
export interface BollingerOutput { upper: number | null; middle: number | null; lower: number | null }
/** Cumulative Volume Delta: running sum of (buyVolume - sellVolume). */
export interface CVDOutput { value: number | null; delta: number | null }
/** Volume Weighted Average Price with standard deviation bands. */
export interface VWAPOutput { vwap: number | null; upper: number | null; lower: number | null }

/** A single computed indicator data point. */
export interface IndicatorPoint<T> {
  timestamp: number;
  data: T;
}

/** Discriminated union of computed indicator series. */
export type IndicatorSeries =
  | { kind: 'sma'; id: string; params: SMAParams; points: IndicatorPoint<SMAOutput>[] }
  | { kind: 'ema'; id: string; params: EMAParams; points: IndicatorPoint<EMAOutput>[] }
  | { kind: 'rsi'; id: string; params: RSIParams; points: IndicatorPoint<RSIOutput>[] }
  | { kind: 'macd'; id: string; params: MACDParams; points: IndicatorPoint<MACDOutput>[] }
  | { kind: 'bollinger'; id: string; params: BollingerParams; points: IndicatorPoint<BollingerOutput>[] }
  | { kind: 'cvd'; id: string; params: CVDParams; points: IndicatorPoint<CVDOutput>[] }
  | { kind: 'vwap'; id: string; params: VWAPParams; points: IndicatorPoint<VWAPOutput>[] };

/** User-facing indicator configuration. */
export interface IndicatorConfig {
  id: string;
  kind: IndicatorKind;
  params: Record<string, number>;
  color: string;
}

/** Default color palette for indicators. */
export const INDICATOR_COLORS: string[] = [
  '#FFD700', // gold
  '#00BCD4', // cyan
  '#FF6EC7', // magenta
  '#FF9800', // orange
  '#7C4DFF', // purple
  '#76FF03', // lime
  '#F44336', // red
  '#00E5FF', // light cyan
];
