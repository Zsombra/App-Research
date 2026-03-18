import type { CandleTimeframe } from '../market/candle.js';
import type { ExchangeId } from '../exchange/connection.js';

/**
 * Color used to link panels together.
 * Panels with the same link color share symbol and timeframe context.
 * 'none' means the panel is unlinked.
 */
export type LinkColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'none';

/**
 * Available panel types in the trading terminal.
 */
export type PanelType =
  | 'chart'
  | 'orderbook'
  | 'trades'
  | 'depth-chart'
  | 'watchlist'
  | 'positions'
  | 'order-entry'
  | 'alerts'
  | 'settings'
  | 'market-profile'
  | 'derivatives'
  | 'script-editor'
  | 'placeholder';

/**
 * Configuration for a single panel instance within the workspace.
 */
export interface PanelConfig {
  /** Unique panel instance identifier */
  id: string;
  /** The type of panel to render */
  type: PanelType;
  /** Display title for the panel tab */
  title: string;
  /** Link color for cross-panel synchronization */
  linkColor: LinkColor;
  /** The symbol this panel is displaying */
  symbol: string;
  /** Candle timeframe (applicable to chart panels) */
  timeframe?: CandleTimeframe | undefined;
  /** Exchanges to show data from */
  exchanges?: ExchangeId[] | undefined;
}
