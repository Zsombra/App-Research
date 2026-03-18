import React from 'react';
import type { PanelType } from '@terminal/types';
import type { IDockviewPanelProps } from 'dockview-react';
import { PanelErrorBoundary } from './PanelErrorBoundary.js';
import { PanelSuspenseFallback } from './PanelSuspenseFallback.js';

// Lazy-loaded panel wrappers — each becomes its own chunk
const LazyChart = React.lazy(() => import('./wrappers/ChartPanelWrapper.js'));
const LazyOrderbook = React.lazy(() => import('./wrappers/OrderbookPanelWrapper.js'));
const LazyTrades = React.lazy(() => import('./wrappers/TradesPanelWrapper.js'));
const LazyOrderEntry = React.lazy(() => import('./wrappers/OrderEntryPanelWrapper.js'));
const LazyPositions = React.lazy(() => import('./wrappers/PositionsPanelWrapper.js'));
const LazyWatchlist = React.lazy(() => import('./wrappers/WatchlistPanelWrapper.js'));
const LazyDepthChart = React.lazy(() => import('./wrappers/DepthChartPanelWrapper.js'));
const LazyAlerts = React.lazy(() => import('./wrappers/AlertsPanelWrapper.js'));
const LazySettings = React.lazy(() => import('./wrappers/SettingsPanelWrapper.js'));
const LazyMarketProfile = React.lazy(() => import('./wrappers/MarketProfilePanelWrapper.js'));
const LazyDerivatives = React.lazy(() => import('./wrappers/DerivativesPanelWrapper.js'));
const LazyPlaceholder = React.lazy(() => import('./wrappers/PlaceholderPanelWrapper.js'));

/**
 * Wraps a lazy-loaded component with Suspense fallback and ErrorBoundary.
 * This ensures panel crashes are isolated and loading states are handled.
 */
function wrapLazy(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<IDockviewPanelProps>>,
  panelType: string
): React.FunctionComponent<IDockviewPanelProps> {
  const Wrapped: React.FunctionComponent<IDockviewPanelProps> = (props) => {
    const panelId = (props.params as Record<string, unknown>)?.id as string ?? panelType;
    return React.createElement(
      PanelErrorBoundary,
      { panelId },
      React.createElement(
        React.Suspense,
        { fallback: React.createElement(PanelSuspenseFallback) },
        React.createElement(LazyComponent, props)
      )
    );
  };
  Wrapped.displayName = `LazyPanel(${panelType})`;
  return Wrapped;
}

/**
 * Maps PanelType strings to Dockview-compatible React components.
 * Each panel is lazy-loaded, wrapped in ErrorBoundary + Suspense.
 */
export const panelComponents: Record<string, React.FunctionComponent<IDockviewPanelProps>> = {
  chart: wrapLazy(LazyChart, 'chart'),
  orderbook: wrapLazy(LazyOrderbook, 'orderbook'),
  trades: wrapLazy(LazyTrades, 'trades'),
  'order-entry': wrapLazy(LazyOrderEntry, 'order-entry'),
  positions: wrapLazy(LazyPositions, 'positions'),
  'depth-chart': wrapLazy(LazyDepthChart, 'depth-chart'),
  watchlist: wrapLazy(LazyWatchlist, 'watchlist'),
  alerts: wrapLazy(LazyAlerts, 'alerts'),
  settings: wrapLazy(LazySettings, 'settings'),
  'market-profile': wrapLazy(LazyMarketProfile, 'market-profile'),
  derivatives: wrapLazy(LazyDerivatives, 'derivatives'),
  placeholder: wrapLazy(LazyPlaceholder, 'placeholder'),
} satisfies Record<PanelType, React.FunctionComponent<IDockviewPanelProps>>;
