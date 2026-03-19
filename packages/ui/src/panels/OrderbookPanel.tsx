import React, { useMemo } from 'react';
import type { PanelConfig, PriceLevel } from '@terminal/types';
import { useOrderbook } from '../stores/market-store.js';
import { COLOR_BULLISH, COLOR_BEARISH, COLOR_BACKGROUND_DARK, COLOR_MUTED, COLOR_NEUTRAL, COLOR_DEPTH_BULLISH, COLOR_DEPTH_BEARISH } from '../theme-colors.js';

interface OrderbookPanelProps {
  config: PanelConfig;
}

/** Maximum orderbook levels displayed on each side. */
const MAX_LEVELS = 20;

const LevelRow = React.memo(function LevelRow({
  level,
  side,
  depthPercent,
}: {
  level: PriceLevel;
  side: 'bid' | 'ask';
  depthPercent: number;
}): React.JSX.Element {
  const color = side === 'bid' ? COLOR_BULLISH : COLOR_BEARISH;
  const bgColor = side === 'bid' ? COLOR_DEPTH_BULLISH : COLOR_DEPTH_BEARISH;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        padding: '1px 8px',
        fontSize: 12,
      }}
    >
      {/* Depth bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side === 'bid' ? 'left' : 'right']: 0,
          width: `${Math.min(depthPercent, 100)}%`,
          background: bgColor,
          transition: 'width 150ms ease-out',
        }}
      />
      <span style={{ flex: 1, color, position: 'relative' }}>
        {level.price.toFixed(2)}
      </span>
      <span style={{ flex: 1, textAlign: 'right', color: '#ccc', position: 'relative' }}>
        {level.size.toFixed(4)}
      </span>
    </div>
  );
});

/**
 * Displays bid/ask price levels with depth visualization bars.
 */
export function OrderbookPanel({ config }: OrderbookPanelProps): React.JSX.Element {
  const orderbook = useOrderbook(config.symbol);

  const { asks, bids, maxSize, spread, spreadPercent } = useMemo(() => {
    if (!orderbook) return { asks: [], bids: [], maxSize: 0, spread: '—', spreadPercent: '' };

    const a = orderbook.asks.slice(0, MAX_LEVELS);
    const b = orderbook.bids.slice(0, MAX_LEVELS);

    // Find max size across both sides for normalization
    let max = 0;
    for (const level of a) if (level.size > max) max = level.size;
    for (const level of b) if (level.size > max) max = level.size;

    let sp = '—';
    let spPct = '';
    if (a.length > 0 && b.length > 0) {
      const topAsk = a[0] as { price: number; size: number };
      const topBid = b[0] as { price: number; size: number };
      const spreadVal = topAsk.price - topBid.price;
      sp = spreadVal.toFixed(2);
      spPct = topAsk.price > 0 ? `(${((spreadVal / topAsk.price) * 100).toFixed(3)}%)` : '';
    }

    return { asks: a.reverse(), bids: b, maxSize: max, spread: sp, spreadPercent: spPct };
  }, [orderbook]);

  if (!orderbook) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_BACKGROUND_DARK, color: COLOR_NEUTRAL, fontSize: 12 }}>
        No orderbook data for {config.symbol}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: COLOR_BACKGROUND_DARK, color: '#ccc', fontSize: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid #222', fontWeight: 600, color: COLOR_MUTED }}>
        <span style={{ flex: 1 }}>Price</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Size</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Asks (reversed so lowest ask is at bottom) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {asks.map((level) => (
            <LevelRow
              key={`ask-${level.price}`}
              level={level}
              side="ask"
              depthPercent={maxSize > 0 ? (level.size / maxSize) * 100 : 0}
            />
          ))}
        </div>
        {/* Spread */}
        <div style={{ padding: '4px 8px', borderTop: '1px solid #333', borderBottom: '1px solid #333', textAlign: 'center', fontWeight: 600, fontSize: 11 }}>
          <span style={{ color: '#fff' }}>{spread}</span>
          {spreadPercent && <span style={{ color: '#666', marginLeft: 4 }}>{spreadPercent}</span>}
        </div>
        {/* Bids */}
        <div style={{ flex: 1 }}>
          {bids.map((level) => (
            <LevelRow
              key={`bid-${level.price}`}
              level={level}
              side="bid"
              depthPercent={maxSize > 0 ? (level.size / maxSize) * 100 : 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
