import React from 'react';
import { useTicker, useConnectionStatus } from '../stores/market-store.js';
import type { ExchangeId } from '@terminal/types';

interface TickerBarProps {
  symbol: string;
  exchange: ExchangeId;
}

/**
 * Header bar displaying current price, 24h change, and connection status.
 */
export function TickerBar({ symbol, exchange }: TickerBarProps): React.JSX.Element {
  const ticker = useTicker(symbol);
  const status = useConnectionStatus(exchange);

  const statusColor =
    status === 'connected' ? '#26a69a' :
    status === 'connecting' || status === 'reconnecting' ? '#ffa726' :
    '#ef5350';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '6px 16px',
        borderBottom: '1px solid #222',
        background: '#0d0d12',
        fontSize: 13,
        color: '#ccc',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{symbol}</span>

      {ticker ? (
        <>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>
            {ticker.lastPrice.toFixed(2)}
          </span>
          <span
            style={{
              color: ticker.changePercent24h >= 0 ? '#26a69a' : '#ef5350',
              fontWeight: 600,
            }}
          >
            {ticker.changePercent24h >= 0 ? '+' : ''}
            {ticker.changePercent24h.toFixed(2)}%
          </span>
          <span style={{ color: '#666' }}>
            H: {ticker.high24h.toFixed(2)}
          </span>
          <span style={{ color: '#666' }}>
            L: {ticker.low24h.toFixed(2)}
          </span>
          <span style={{ color: '#666' }}>
            Vol: {(ticker.volume24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </>
      ) : (
        <span style={{ color: '#555' }}>Waiting for data...</span>
      )}

      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor,
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: 11, color: '#666' }}>{exchange}</span>
      </span>
    </div>
  );
}
