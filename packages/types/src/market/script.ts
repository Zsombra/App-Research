/**
 * A user-defined custom script for indicators or alerts.
 */
export interface CustomScript {
  /** Unique script identifier */
  id: string;
  /** User-defined name */
  name: string;
  /** Script source code (JavaScript) */
  source: string;
  /** Script type: 'indicator' draws on chart, 'alert' triggers notifications */
  type: 'indicator' | 'alert';
  /** Whether this script is currently enabled */
  enabled: boolean;
  /** Script color (for indicator overlay) */
  color: string;
  /** Last error message from script execution */
  lastError: string | null;
  /** Timestamp of last modification */
  lastModified: number;
}

/**
 * API available inside custom scripts.
 * Scripts receive this as the `ctx` parameter.
 */
export interface ScriptContext {
  /** Access OHLCV candle data */
  candles: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
    timestamp: number[];
    length: number;
  };
  /** Current symbol */
  symbol: string;
  /** Plot a line series on the chart */
  plot: (values: (number | null)[], options?: { color?: string; width?: number; label?: string }) => void;
  /** Trigger an alert */
  alert: (message: string) => void;
  /** Simple Moving Average helper */
  sma: (values: number[], period: number) => (number | null)[];
  /** Exponential Moving Average helper */
  ema: (values: number[], period: number) => (number | null)[];
  /** Cross over detection */
  crossover: (a: number[], b: number[]) => boolean;
  /** Cross under detection */
  crossunder: (a: number[], b: number[]) => boolean;
}

/**
 * Result from executing a custom script.
 */
export interface ScriptResult {
  /** Plot data (line values to render) */
  plots: ScriptPlot[];
  /** Alert messages triggered */
  alerts: string[];
  /** Error message if execution failed */
  error: string | null;
}

/**
 * A plotted line from a custom script.
 */
export interface ScriptPlot {
  /** Values array (one per candle, null = no data) */
  values: (number | null)[];
  /** Line color */
  color: string;
  /** Line width */
  width: number;
  /** Optional label */
  label: string;
}
