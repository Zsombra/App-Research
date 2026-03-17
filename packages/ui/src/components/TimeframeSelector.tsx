import React, { useCallback } from 'react';
import type { CandleTimeframe } from '@terminal/types';
import { useMarketStore, useTimeframe } from '../stores/market-store.js';

/** Commonly used timeframes shown in the compact bar. */
const QUICK_TIMEFRAMES: CandleTimeframe[] = [
  '1s', '5s', '1m', '5m', '15m', '1h', '4h', '1d',
];

interface TimeframeSelectorProps {
  symbol: string;
}

/**
 * Compact timeframe selector bar for the chart panel.
 * Shows a row of quick-switch timeframe buttons.
 */
export function TimeframeSelector({ symbol }: TimeframeSelectorProps): React.JSX.Element {
  const activeTimeframe = useTimeframe(symbol);
  const setTimeframe = useMarketStore((s) => s.setTimeframe);

  const handleClick = useCallback((tf: CandleTimeframe) => {
    setTimeframe(symbol, tf);
  }, [symbol, setTimeframe]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {QUICK_TIMEFRAMES.map((tf) => {
        const isActive = tf === activeTimeframe;
        return (
          <button
            key={tf}
            onClick={() => handleClick(tf)}
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
    </div>
  );
}
