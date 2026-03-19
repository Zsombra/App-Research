import React from 'react';
import { useActiveSymbol } from '../stores/symbol-store.js';
import {
  useLiquidations,
  useCurrentOI,
  useFundingRate,
  useOpenInterestHistory,
} from '../stores/derivatives-store.js';
import { COLOR_SUCCESS, COLOR_DANGER, COLOR_MUTED } from '../theme-colors.js';

const FORMAT_BILLION = 1_000_000_000;
const FORMAT_MILLION = 1_000_000;
const FORMAT_THOUSAND = 1_000;

/** Maximum recent liquidation events shown in the feed. */
const MAX_RECENT_LIQUIDATIONS = 20;

/** Multiplier to convert decimal rate to percentage. */
const PERCENTAGE_MULTIPLIER = 100;

function formatNumber(n: number): string {
  if (n >= FORMAT_BILLION) return (n / FORMAT_BILLION).toFixed(2) + 'B';
  if (n >= FORMAT_MILLION) return (n / FORMAT_MILLION).toFixed(2) + 'M';
  if (n >= FORMAT_THOUSAND) return (n / FORMAT_THOUSAND).toFixed(2) + 'K';
  return n.toFixed(2);
}

function formatRate(rate: number): string {
  return (rate * PERCENTAGE_MULTIPLIER).toFixed(4) + '%';
}

/**
 * Derivatives info panel showing Open Interest, Funding Rate, and Liquidations.
 */
export function DerivativesPanel(): React.JSX.Element {
  const activeSymbol = useActiveSymbol();
  const liquidations = useLiquidations(activeSymbol);
  const currentOI = useCurrentOI(activeSymbol);
  const fundingRate = useFundingRate(activeSymbol);
  const oiHistory = useOpenInterestHistory(activeSymbol);

  // OI change
  const oiChange = oiHistory.length >= 2
    ? (oiHistory[oiHistory.length - 1] as { openInterest: number }).openInterest - (oiHistory[0] as { openInterest: number }).openInterest
    : 0;

  // Recent liquidation stats
  const recentLongLiqs = liquidations.filter((l) => l.side === 'sell'); // sell = long liquidated
  const recentShortLiqs = liquidations.filter((l) => l.side === 'buy'); // buy = short liquidated
  const longLiqVol = recentLongLiqs.reduce((sum, l) => sum + l.amount * l.price, 0);
  const shortLiqVol = recentShortLiqs.reduce((sum, l) => sum + l.amount * l.price, 0);

  return (
    <div style={{ padding: 12, color: '#ccc', fontSize: 11, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#fff' }}>
        Derivatives — {activeSymbol}
      </div>

      {/* Open Interest */}
      <div style={{ borderBottom: '1px solid #222', paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>OPEN INTEREST</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Current OI</span>
          <span style={{ color: '#fff' }}>{currentOI > 0 ? formatNumber(currentOI) : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Session Change</span>
          <span style={{ color: oiChange >= 0 ? COLOR_SUCCESS : COLOR_DANGER }}>
            {oiChange !== 0 ? (oiChange > 0 ? '+' : '') + formatNumber(oiChange) : '—'}
          </span>
        </div>
      </div>

      {/* Funding Rate */}
      <div style={{ borderBottom: '1px solid #222', paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>FUNDING RATE</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Current Rate</span>
          <span style={{ color: fundingRate >= 0 ? COLOR_SUCCESS : COLOR_DANGER }}>
            {fundingRate !== 0 ? formatRate(fundingRate) : '—'}
          </span>
        </div>
        <div style={{ fontSize: 9, color: '#555' }}>
          {fundingRate > 0 ? 'Longs pay shorts' : fundingRate < 0 ? 'Shorts pay longs' : ''}
        </div>
      </div>

      {/* Liquidations */}
      <div style={{ borderBottom: '1px solid #222', paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>LIQUIDATIONS</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Long Liqs</span>
          <span style={{ color: COLOR_DANGER }}>
            {recentLongLiqs.length > 0 ? `${recentLongLiqs.length} ($${formatNumber(longLiqVol)})` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Short Liqs</span>
          <span style={{ color: COLOR_SUCCESS }}>
            {recentShortLiqs.length > 0 ? `${recentShortLiqs.length} ($${formatNumber(shortLiqVol)})` : '—'}
          </span>
        </div>
      </div>

      {/* Recent Liquidation Feed */}
      <div>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>RECENT LIQUIDATIONS</div>
        {liquidations.length === 0 && (
          <div style={{ color: '#555', fontSize: 10 }}>No liquidations yet</div>
        )}
        {liquidations.slice(0, MAX_RECENT_LIQUIDATIONS).map((liq, i) => {
          const isLong = liq.side === 'sell';
          const time = new Date(liq.timestamp);
          const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
          return (
            <div
              key={`${liq.timestamp}-${i}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2px 0',
                fontSize: 10,
              }}
            >
              <span style={{ color: '#555' }}>{timeStr}</span>
              <span style={{ color: isLong ? COLOR_DANGER : COLOR_SUCCESS }}>
                {isLong ? 'LONG' : 'SHORT'}
              </span>
              <span>${formatNumber(liq.amount * liq.price)}</span>
              <span style={{ color: COLOR_MUTED }}>{liq.price.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
