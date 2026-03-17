import React, { useState, useCallback } from 'react';
import type { ExchangeId } from '@terminal/types';
import { ConnectionStatus } from '@terminal/types';
import { useMarketStore } from '../stores/market-store.js';
import { useSymbolStore } from '../stores/symbol-store.js';
import { getWorkerBridge } from '../worker/worker-bridge.js';

/** Exchanges available for connection. */
const AVAILABLE_EXCHANGES: { id: ExchangeId; label: string }[] = [
  { id: 'simulated', label: 'Simulated' },
  { id: 'binance', label: 'Binance' },
  { id: 'bybit', label: 'Bybit' },
  { id: 'coinbase', label: 'Coinbase' },
];

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  [ConnectionStatus.Disconnected]: '#555',
  [ConnectionStatus.Connecting]: '#ffb300',
  [ConnectionStatus.Connected]: '#26a69a',
  [ConnectionStatus.Reconnecting]: '#ff9800',
  [ConnectionStatus.Error]: '#ef5350',
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  [ConnectionStatus.Disconnected]: 'OFF',
  [ConnectionStatus.Connecting]: 'Connecting...',
  [ConnectionStatus.Connected]: 'LIVE',
  [ConnectionStatus.Reconnecting]: 'Reconnecting...',
  [ConnectionStatus.Error]: 'ERROR',
};

/**
 * Exchange selector bar that sits in the header area.
 * Shows available exchanges with connection status indicators.
 * Clicking an exchange connects/disconnects it for the active symbol.
 */
export function ExchangeSelector(): React.JSX.Element {
  const connectionStatuses = useMarketStore((s) => s.connectionStatuses);
  const activeSymbol = useSymbolStore((s) => s.activeSymbol);
  const watchlist = useSymbolStore((s) => s.watchlist);
  const [activeExchange, setActiveExchange] = useState<ExchangeId>('simulated');

  const handleExchangeClick = useCallback((exchangeId: ExchangeId) => {
    const bridge = getWorkerBridge();

    // Unsubscribe old exchange for all watchlist symbols
    if (activeExchange !== exchangeId) {
      for (const symbol of watchlist) {
        bridge.send({ type: 'unsubscribe', symbol });
      }
    }

    // Subscribe new exchange for all watchlist symbols
    for (const symbol of watchlist) {
      bridge.send({
        type: 'subscribe',
        symbol,
        exchanges: [exchangeId],
        topics: ['trades', 'orderbook', 'ticker'],
      });
    }

    setActiveExchange(exchangeId);
  }, [activeExchange, watchlist]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: '0 8px',
      height: '100%',
    }}>
      {AVAILABLE_EXCHANGES.map(({ id, label }) => {
        const status = connectionStatuses.get(id) ?? ConnectionStatus.Disconnected;
        const isActive = id === activeExchange;
        const color = STATUS_COLORS[status];

        return (
          <button
            key={id}
            onClick={() => handleExchangeClick(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: isActive ? 'rgba(92, 107, 192, 0.15)' : 'transparent',
              border: isActive ? '1px solid #5c6bc0' : '1px solid #222',
              borderRadius: 3,
              color: isActive ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: 11,
            }}
            title={`${label}: ${STATUS_LABELS[status]}`}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isActive ? color : '#333',
                flexShrink: 0,
              }}
            />
            {label}
          </button>
        );
      })}
      <span style={{ marginLeft: 8, color: '#555', fontSize: 10 }}>
        {activeSymbol} @ {AVAILABLE_EXCHANGES.find((e) => e.id === activeExchange)?.label ?? activeExchange}
      </span>
    </div>
  );
}
