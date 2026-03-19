import React, { useCallback } from 'react';
import type { CandleTimeframe, BarType, CustomBarConfig } from '@terminal/types';
import {
  DEFAULT_TICK_BAR_CONFIG,
  DEFAULT_VOLUME_BAR_CONFIG,
  DEFAULT_RANGE_BAR_CONFIG,
} from '@terminal/types';
import { useMarketStore, useTimeframe, useBarType } from '../stores/market-store.js';

/** Commonly used timeframes shown in the compact bar. */
const QUICK_TIMEFRAMES: readonly CandleTimeframe[] = [
  '1s', '5s', '1m', '5m', '15m', '1h', '4h', '1d',
] as const;

/** Custom bar type options. */
const CUSTOM_BAR_OPTIONS: readonly { type: BarType; label: string; config: CustomBarConfig }[] = [
  { type: 'tick', label: 'Tick', config: DEFAULT_TICK_BAR_CONFIG },
  { type: 'volume', label: 'Vol', config: DEFAULT_VOLUME_BAR_CONFIG },
  { type: 'range', label: 'Range', config: DEFAULT_RANGE_BAR_CONFIG },
];

interface TimeframeSelectorProps {
  symbol: string;
}

/**
 * Compact timeframe selector bar for the chart panel.
 * Shows time-based intervals plus tick/volume/range bar options.
 */
export function TimeframeSelector({ symbol }: TimeframeSelectorProps): React.JSX.Element {
  const activeTimeframe = useTimeframe(symbol);
  const activeBarType = useBarType(symbol);
  const setTimeframe = useMarketStore((s) => s.setTimeframe);
  const setBarType = useMarketStore((s) => s.setBarType);

  const handleTimeClick = useCallback((tf: CandleTimeframe) => {
    // Switch back to time-based bars
    setBarType(symbol, 'time');
    setTimeframe(symbol, tf);
  }, [symbol, setTimeframe, setBarType]);

  const handleBarTypeClick = useCallback((type: BarType, config: CustomBarConfig) => {
    setBarType(symbol, type, config);
  }, [symbol, setBarType]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {QUICK_TIMEFRAMES.map((tf) => {
        const isActive = activeBarType === 'time' && tf === activeTimeframe;
        return (
          <button
            key={tf}
            onClick={() => handleTimeClick(tf)}
            style={{
              padding: '1px 5px',
              fontSize: 10,
              background: isActive ? 'rgba(92, 107, 192, 0.2)' : 'transparent',
              border: isActive ? '1px solid #5c6bc0' : '1px solid transparent',
              borderRadius: 2,
              color: isActive ? '#fff' : '#777',
              cursor: 'pointer',
            }}
          >
            {tf}
          </button>
        );
      })}
      <span style={{ color: '#333', fontSize: 10, margin: '0 2px' }}>|</span>
      {CUSTOM_BAR_OPTIONS.map(({ type, label, config }) => {
        const isActive = activeBarType === type;
        return (
          <button
            key={type}
            onClick={() => handleBarTypeClick(type, config)}
            style={{
              padding: '1px 5px',
              fontSize: 10,
              background: isActive ? 'rgba(255, 152, 0, 0.2)' : 'transparent',
              border: isActive ? '1px solid #FF9800' : '1px solid transparent',
              borderRadius: 2,
              color: isActive ? '#fff' : '#777',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
