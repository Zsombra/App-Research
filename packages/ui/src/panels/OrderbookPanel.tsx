import React from 'react';
import type { PanelConfig, PriceLevel } from '@terminal/types';
import { useOrderbook } from '../stores/market-store.js';

interface OrderbookPanelProps {
  config: PanelConfig;
}

const MAX_LEVELS = 20;

function LevelRow({ level, side }: { level: PriceLevel; side: 'bid' | 'ask' }): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        padding: '1px 8px',
        fontSize: 12,
      }}
    >
      <span style={{ flex: 1, color: side === 'bid' ? '#26a69a' : '#ef5350' }}>
        {level.price.toFixed(2)}
      </span>
      <span style={{ flex: 1, textAlign: 'right', color: '#ccc' }}>
        {level.size.toFixed(4)}
      </span>
    </div>
  );
}

/**
 * Displays bid/ask price levels from the orderbook.
 */
export function OrderbookPanel({ config }: OrderbookPanelProps): React.JSX.Element {
  const orderbook = useOrderbook(config.symbol);

  if (!orderbook) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0e', color: '#555', fontSize: 12 }}>
        No orderbook data for {config.symbol}
      </div>
    );
  }

  const asks = orderbook.asks.slice(0, MAX_LEVELS).reverse();
  const bids = orderbook.bids.slice(0, MAX_LEVELS);

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0a0a0e', color: '#ccc', fontSize: 12 }}>
      <div style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid #222', fontWeight: 600, color: '#888' }}>
        <span style={{ flex: 1 }}>Price</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Size</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {asks.map((level, i) => (
            <LevelRow key={`ask-${i}`} level={level} side="ask" />
          ))}
        </div>
        <div style={{ padding: '4px 8px', borderTop: '1px solid #333', borderBottom: '1px solid #333', textAlign: 'center', fontWeight: 600, color: '#fff' }}>
          Spread: {orderbook.asks.length > 0 && orderbook.bids.length > 0
            ? ((orderbook.asks[0]!.price - orderbook.bids[0]!.price)).toFixed(2)
            : '—'}
        </div>
        <div style={{ flex: 1 }}>
          {bids.map((level, i) => (
            <LevelRow key={`bid-${i}`} level={level} side="bid" />
          ))}
        </div>
      </div>
    </div>
  );
}
