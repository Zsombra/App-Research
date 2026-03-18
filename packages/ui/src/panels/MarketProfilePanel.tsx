import React, { useMemo } from 'react';
import type { MarketProfile } from '@terminal/types';
import { computeMarketProfile } from '@terminal/core';
import { autoTickSize } from '@terminal/core';
import { useCandles } from '../stores/market-store.js';
import { useActiveSymbol } from '../stores/symbol-store.js';

/**
 * Market Profile / TPO Panel.
 * Displays a horizontal histogram of time-at-price with POC, VAH, VAL markers.
 */
export function MarketProfilePanel(): React.JSX.Element {
  const activeSymbol = useActiveSymbol() ?? 'BTC/USDT';
  const candles = useCandles(activeSymbol);

  const profile: MarketProfile | null = useMemo(() => {
    if (candles.length === 0) return null;
    const tickSize = autoTickSize(candles);
    return computeMarketProfile(candles, tickSize);
  }, [candles]);

  if (!profile || profile.rows.length === 0) {
    return (
      <div style={{ padding: 12, color: '#888', fontSize: 12, textAlign: 'center' }}>
        Waiting for data...
      </div>
    );
  }

  const maxTpo = Math.max(...profile.rows.map((r) => r.tpoCount));

  return (
    <div style={{ padding: 8, color: '#ccc', fontSize: 11, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#fff' }}>
        Market Profile — {activeSymbol}
      </div>

      {/* Reference lines */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 10 }}>
        <span style={{ color: '#FFD700' }}>POC: {profile.poc.toFixed(2)}</span>
        <span style={{ color: '#4CAF50' }}>VAH: {profile.vah.toFixed(2)}</span>
        <span style={{ color: '#F44336' }}>VAL: {profile.val.toFixed(2)}</span>
        <span style={{ color: '#888' }}>IB: {profile.ibLow.toFixed(2)}-{profile.ibHigh.toFixed(2)}</span>
      </div>

      {/* TPO histogram */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[...profile.rows].reverse().map((row) => {
          const barWidth = maxTpo > 0 ? (row.tpoCount / maxTpo) * 100 : 0;
          const isPoc = row.price === profile.poc;
          const inValueArea = row.price >= profile.val && row.price <= profile.vah;

          let barColor = '#333';
          if (isPoc) barColor = '#FFD700';
          else if (inValueArea) barColor = '#5c6bc0';
          else barColor = '#2a2a3a';

          return (
            <div
              key={row.price}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 14,
              }}
            >
              <span style={{
                width: 55,
                textAlign: 'right',
                paddingRight: 6,
                fontSize: 9,
                color: isPoc ? '#FFD700' : '#666',
                flexShrink: 0,
              }}>
                {row.price.toFixed(profile.tickSize < 1 ? 2 : 0)}
              </span>
              <div
                style={{
                  height: 12,
                  width: `${barWidth}%`,
                  minWidth: barWidth > 0 ? 2 : 0,
                  background: barColor,
                  borderRadius: 1,
                  position: 'relative',
                }}
              >
                {isPoc && (
                  <span style={{
                    position: 'absolute',
                    right: -30,
                    top: 0,
                    fontSize: 8,
                    color: '#FFD700',
                  }}>
                    POC
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
