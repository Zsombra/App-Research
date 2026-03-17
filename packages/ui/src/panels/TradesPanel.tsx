import React from 'react';
import type { PanelConfig } from '@terminal/types';
import { useTrades } from '../stores/market-store.js';

interface TradesPanelProps {
  config: PanelConfig;
}

/**
 * Displays a scrolling list of recent trades for a symbol.
 */
export function TradesPanel({ config }: TradesPanelProps): React.JSX.Element {
  const trades = useTrades(config.symbol);

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0a0a0e', color: '#ccc', fontSize: 12 }}>
      <div style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid #222', fontWeight: 600, color: '#888' }}>
        <span style={{ flex: 1 }}>Price</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Amount</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Time</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {trades.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#555' }}>
            No trades yet for {config.symbol}
          </div>
        ) : (
          trades.slice(0, 100).map((trade) => (
            <div
              key={trade.id}
              style={{
                display: 'flex',
                padding: '2px 8px',
                color: trade.side === 'buy' ? '#26a69a' : '#ef5350',
              }}
            >
              <span style={{ flex: 1 }}>{trade.price.toFixed(2)}</span>
              <span style={{ flex: 1, textAlign: 'right' }}>{trade.amount.toFixed(4)}</span>
              <span style={{ flex: 1, textAlign: 'right', color: '#666' }}>
                {new Date(trade.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
