import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import type { PanelConfig, NormalizedTrade } from '@terminal/types';
import { useTrades } from '../stores/market-store.js';
import { COLOR_BULLISH, COLOR_BEARISH, COLOR_NEUTRAL, COLOR_MUTED, COLOR_BACKGROUND_DARK, COLOR_BG_BULLISH, COLOR_BG_BEARISH } from '../theme-colors.js';

interface TradesPanelProps {
  config: PanelConfig;
}

/** Maximum trades displayed in the scrolling list. */
const MAX_DISPLAY = 100;

/** Threshold in USD for highlighting a large trade. */
const LARGE_TRADE_THRESHOLD = 5000;

/** Scroll position threshold for auto-scroll behavior. */
const SCROLL_AT_TOP_THRESHOLD = 10;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const TradeRow = React.memo(function TradeRow({ trade }: { trade: NormalizedTrade }) {
  const isBuy = trade.side === 'buy';
  const isLarge = trade.cost >= LARGE_TRADE_THRESHOLD;
  const color = isBuy ? COLOR_BULLISH : COLOR_BEARISH;

  return (
    <div
      style={{
        display: 'flex',
        padding: '1px 8px',
        color,
        background: isLarge ? (isBuy ? COLOR_BG_BULLISH : COLOR_BG_BEARISH) : 'transparent',
        fontWeight: isLarge ? 600 : 400,
      }}
    >
      <span style={{ flex: 1 }}>{trade.price.toFixed(2)}</span>
      <span style={{ flex: 1, textAlign: 'right' }}>{trade.amount.toFixed(4)}</span>
      <span style={{ flex: 1, textAlign: 'right', color: COLOR_NEUTRAL }}>
        {formatTime(trade.timestamp)}
      </span>
    </div>
  );
});

/**
 * Displays a scrolling list of recent trades with large-trade highlighting.
 * Auto-scrolls to newest trade when scrolled to top.
 */
export function TradesPanel({ config }: TradesPanelProps): React.JSX.Element {
  const trades = useTrades(config.symbol);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasAtTopRef = useRef(true);

  const displayTrades = useMemo(() => trades.slice(0, MAX_DISPLAY), [trades]);

  // Auto-scroll to top (newest trades) if user hasn't scrolled down
  useEffect(() => {
    if (wasAtTopRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [displayTrades]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      wasAtTopRef.current = scrollRef.current.scrollTop < SCROLL_AT_TOP_THRESHOLD;
    }
  }, []);

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: COLOR_BACKGROUND_DARK, color: '#ccc', fontSize: 12 }}>
      <div style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid #222', fontWeight: 600, color: COLOR_MUTED }}>
        <span style={{ flex: 1 }}>Price</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Amount</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Time</span>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto' }}>
        {displayTrades.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: COLOR_NEUTRAL }}>
            No trades yet for {config.symbol}
          </div>
        ) : (
          displayTrades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))
        )}
      </div>
    </div>
  );
}
