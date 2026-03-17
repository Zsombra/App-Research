import React, { useMemo } from 'react';
import type { OHLCVCandle } from '@terminal/types';
import { ChartPanel } from './rendering/panels/ChartPanel.js';

/**
 * Generate demo candle data for the chart demonstration.
 * Creates a realistic-looking random walk of OHLCV candles.
 */
function generateDemoCandles(count: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  const now = Date.now();
  const interval = 60_000; // 1 minute
  let price = 65000; // BTC-like starting price

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * interval;
    const volatility = price * 0.003; // 0.3% per candle
    const change = (Math.random() - 0.48) * volatility; // slight upward bias
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

/**
 * Root application component.
 * Phase 1c: Demonstrates the WebGL rendering engine with a candlestick chart.
 */
export function App(): React.JSX.Element {
  const demoCandles = useMemo(() => generateDemoCandles(200), []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0a0a0e',
        color: '#ccc',
      }}
    >
      <header
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #222',
          fontSize: '14px',
        }}
      >
        Trading Terminal - Phase 1c (WebGL Rendering Engine)
      </header>
      <main style={{ flex: 1, padding: '8px', minHeight: 0 }}>
        <ChartPanel panelId="demo-chart" candles={demoCandles} />
      </main>
    </div>
  );
}
