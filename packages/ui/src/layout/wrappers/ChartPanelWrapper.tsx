import React, { useMemo } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig, OHLCVCandle } from '@terminal/types';
import { ChartPanel } from '../../rendering/panels/ChartPanel.js';

/**
 * Wraps ChartPanel for use inside Dockview.
 * Extracts PanelConfig from dockview params.
 */
export function ChartPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;

  // Demo candles — in future phases this will come from the market store
  const demoCandles = useMemo(() => generateDemoCandles(200), []);

  return (
    <ChartPanel panelId={config?.id ?? 'chart'} candles={demoCandles} />
  );
}

function generateDemoCandles(count: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  const now = Date.now();
  const interval = 60_000;
  let price = 65000;

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * interval;
    const volatility = price * 0.003;
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = 10 + Math.random() * 90;
    const buyVolume = volume * (0.3 + Math.random() * 0.4);

    candles.push({
      exchange: 'demo',
      symbol: 'BTC/USDT',
      timeframe: '1m',
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      buyVolume,
      sellVolume: volume - buyVolume,
      tradeCount: Math.floor(50 + Math.random() * 200),
      closed: i < count - 1,
    });

    price = close;
  }

  return candles;
}
