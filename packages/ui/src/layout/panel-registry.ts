import React from 'react';
import type { PanelType } from '@terminal/types';
import type { IDockviewPanelProps } from 'dockview-react';
import { ChartPanelWrapper } from './wrappers/ChartPanelWrapper.js';
import { TradesPanelWrapper } from './wrappers/TradesPanelWrapper.js';
import { OrderbookPanelWrapper } from './wrappers/OrderbookPanelWrapper.js';
import { PlaceholderPanelWrapper } from './wrappers/PlaceholderPanelWrapper.js';

/**
 * Maps PanelType strings to Dockview-compatible React components.
 * Each component receives IDockviewPanelProps with PanelConfig in params.
 */
export const panelComponents: Record<string, React.FunctionComponent<IDockviewPanelProps>> = {
  chart: ChartPanelWrapper,
  orderbook: OrderbookPanelWrapper,
  trades: TradesPanelWrapper,
  'depth-chart': PlaceholderPanelWrapper,
  watchlist: PlaceholderPanelWrapper,
  positions: PlaceholderPanelWrapper,
  placeholder: PlaceholderPanelWrapper,
} satisfies Record<PanelType, React.FunctionComponent<IDockviewPanelProps>>;
