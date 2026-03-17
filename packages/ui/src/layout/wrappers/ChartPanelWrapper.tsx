import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { ChartPanel } from '../../rendering/panels/ChartPanel.js';
import { useCandles } from '../../stores/market-store.js';
import { useActiveSymbol } from '../../stores/symbol-store.js';

/**
 * Wraps ChartPanel for use inside Dockview.
 * Reads live candle data from the market store using the active symbol.
 */
export function ChartPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  const activeSymbol = useActiveSymbol();
  const symbol = activeSymbol ?? config?.symbol ?? 'BTC/USDT';
  const candles = useCandles(symbol);

  return (
    <ChartPanel panelId={config?.id ?? 'chart'} candles={candles} />
  );
}
