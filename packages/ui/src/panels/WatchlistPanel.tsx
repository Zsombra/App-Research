import React, { useState, useCallback } from 'react';
import type { PanelConfig, Ticker } from '@terminal/types';
import { useMarketStore } from '../stores/market-store.js';
import { useSymbolStore, useActiveSymbol, useWatchlist } from '../stores/symbol-store.js';
import { COLOR_BULLISH, COLOR_BEARISH, COLOR_NEUTRAL } from '../theme-colors.js';

interface WatchlistPanelProps {
  config: PanelConfig;
}

const WatchlistRow = React.memo(function WatchlistRow({
  symbol,
  isActive,
  onSelect,
}: {
  symbol: string;
  isActive: boolean;
  onSelect: (symbol: string) => void;
}) {
  const ticker = useMarketStore((state) => state.tickers.get(symbol));
  const removeFromWatchlist = useSymbolStore((s) => s.removeFromWatchlist);

  const changeColor = ticker
    ? ticker.changePercent24h >= 0 ? COLOR_BULLISH : COLOR_BEARISH
    : COLOR_NEUTRAL;

  return (
    <div
      onClick={() => onSelect(symbol)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        cursor: 'pointer',
        background: isActive ? 'rgba(92, 107, 192, 0.15)' : 'transparent',
        borderLeft: isActive ? '2px solid #5c6bc0' : '2px solid transparent',
        gap: 4,
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget.style.background = 'rgba(255,255,255,0.03)');
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget.style.background = 'transparent');
      }}
    >
      <span style={{ flex: 1, fontWeight: isActive ? 700 : 400 }}>{symbol}</span>
      <span style={{ width: 70, textAlign: 'right', fontWeight: 600 }}>
        {ticker ? formatPrice(ticker) : '—'}
      </span>
      <span style={{ width: 55, textAlign: 'right', color: changeColor, fontSize: 11 }}>
        {ticker ? `${ticker.changePercent24h >= 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}%` : '—'}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFromWatchlist(symbol);
        }}
        style={{
          width: 16,
          height: 16,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: '#444',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: '16px',
          textAlign: 'center',
        }}
        title="Remove"
      >
        x
      </button>
    </div>
  );
});

function formatPrice(ticker: Ticker): string {
  const p = ticker.lastPrice;
  if (p >= 10000) return p.toFixed(1);
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

/**
 * Watchlist panel showing multiple symbols with live prices.
 * Clicking a symbol makes it the active symbol across all linked panels.
 */
export function WatchlistPanel({ config: _config }: WatchlistPanelProps): React.JSX.Element {
  const watchlist = useWatchlist();
  const activeSymbol = useActiveSymbol();
  const setActiveSymbol = useSymbolStore((s) => s.setActiveSymbol);
  const addToWatchlist = useSymbolStore((s) => s.addToWatchlist);
  const subscribeSymbol = useSymbolStore((s) => s.subscribeSymbol);

  const [addInput, setAddInput] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleSelect = useCallback((symbol: string) => {
    setActiveSymbol(symbol);
  }, [setActiveSymbol]);

  const handleAdd = useCallback(() => {
    const symbol = addInput.trim().toUpperCase();
    if (symbol && !watchlist.includes(symbol)) {
      addToWatchlist(symbol);
      subscribeSymbol(symbol, ['simulated'], ['trades', 'orderbook', 'ticker']);
    }
    setAddInput('');
    setShowAdd(false);
  }, [addInput, watchlist, addToWatchlist, subscribeSymbol]);

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0a0a0e', color: '#ccc', fontSize: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid #222', alignItems: 'center' }}>
        <span style={{ flex: 1, fontWeight: 700, color: '#888', fontSize: 11, textTransform: 'uppercase' }}>
          Watchlist
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: '1px 6px',
            background: 'transparent',
            border: '1px solid #333',
            color: '#888',
            cursor: 'pointer',
            fontSize: 12,
            borderRadius: 2,
          }}
        >
          +
        </button>
      </div>

      {/* Add symbol input */}
      {showAdd && (
        <div style={{ display: 'flex', padding: '4px 8px', gap: 4, borderBottom: '1px solid #222' }}>
          <input
            type="text"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. DOGE/USDT"
            autoFocus
            style={{
              flex: 1,
              padding: '3px 6px',
              background: '#111',
              border: '1px solid #333',
              color: '#fff',
              fontSize: 11,
              borderRadius: 2,
              outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: '3px 8px',
              background: '#5c6bc0',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              borderRadius: 2,
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* Column headers */}
      <div style={{ display: 'flex', padding: '2px 8px', color: '#555', fontSize: 10, borderBottom: '1px solid #1a1a22' }}>
        <span style={{ flex: 1 }}>Symbol</span>
        <span style={{ width: 70, textAlign: 'right' }}>Price</span>
        <span style={{ width: 55, textAlign: 'right' }}>24h %</span>
        <span style={{ width: 16 }} />
      </div>

      {/* Symbol list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {watchlist.map((symbol) => (
          <WatchlistRow
            key={symbol}
            symbol={symbol}
            isActive={symbol === activeSymbol}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
