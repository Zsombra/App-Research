import React, { useState, useEffect } from 'react';
import { useAlertStore, startAlertChecker } from '../stores/alert-store.js';
import type { AlertCondition } from '../stores/alert-store.js';
import { useActiveSymbol } from '../stores/symbol-store.js';
import { useMarketStore } from '../stores/market-store.js';

export function AlertsPanel(): React.JSX.Element {
  const activeSymbol = useActiveSymbol();
  const alerts = useAlertStore((s) => s.alerts);
  const addAlert = useAlertStore((s) => s.addAlert);
  const removeAlert = useAlertStore((s) => s.removeAlert);
  const clearTriggered = useAlertStore((s) => s.clearTriggered);
  const ticker = useMarketStore((s) => s.tickers.get(activeSymbol));

  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<AlertCondition>('above');

  // Start alert checker on mount
  useEffect(() => startAlertChecker(), []);

  const handleAdd = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    addAlert(activeSymbol, condition, price);
    setTargetPrice('');
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === activeSymbol);
  const otherAlerts = alerts.filter((a) => a.symbol !== activeSymbol);
  const triggeredCount = alerts.filter((a) => a.triggered).length;

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0a0a0e', color: '#ccc', fontSize: 12 }}>
      {/* Header */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1, fontWeight: 700, color: '#888', fontSize: 11, textTransform: 'uppercase' }}>
          Price Alerts
        </span>
        {triggeredCount > 0 && (
          <button
            onClick={clearTriggered}
            style={{ padding: '1px 6px', background: 'transparent', border: '1px solid #333', color: '#888', cursor: 'pointer', fontSize: 10, borderRadius: 2 }}
          >
            Clear fired ({triggeredCount})
          </button>
        )}
      </div>

      {/* Add alert form */}
      <div style={{ display: 'flex', padding: '6px 8px', gap: 4, borderBottom: '1px solid #222', alignItems: 'center' }}>
        <span style={{ color: '#888', fontSize: 11 }}>{activeSymbol}</span>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as AlertCondition)}
          style={{ padding: '2px 4px', background: '#111', border: '1px solid #333', color: '#ccc', fontSize: 11, borderRadius: 2 }}
        >
          <option value="above">above</option>
          <option value="below">below</option>
        </select>
        <input
          type="number"
          step="any"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={ticker ? ticker.lastPrice.toFixed(2) : '0.00'}
          style={{ width: 80, padding: '2px 6px', background: '#111', border: '1px solid #333', color: '#fff', fontSize: 11, borderRadius: 2, outline: 'none' }}
        />
        <button
          onClick={handleAdd}
          style={{ padding: '2px 8px', background: '#5c6bc0', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, borderRadius: 2 }}
        >
          Set
        </button>
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {symbolAlerts.length > 0 && (
          <div style={{ padding: '2px 8px', color: '#555', fontSize: 10, borderBottom: '1px solid #1a1a22' }}>
            {activeSymbol}
          </div>
        )}
        {symbolAlerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} onRemove={removeAlert} />
        ))}

        {otherAlerts.length > 0 && (
          <div style={{ padding: '4px 8px 2px', color: '#555', fontSize: 10, borderBottom: '1px solid #1a1a22' }}>
            Other symbols
          </div>
        )}
        {otherAlerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} onRemove={removeAlert} />
        ))}

        {alerts.length === 0 && (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: '#444', fontSize: 11 }}>
            No alerts set. Use the form above to add one.
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, onRemove }: { alert: { id: string; symbol: string; condition: AlertCondition; targetPrice: number; triggered: boolean }; onRemove: (id: string) => void }): React.JSX.Element {
  const color = alert.triggered ? '#ffb300' : alert.condition === 'above' ? '#26a69a' : '#ef5350';
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', gap: 6, opacity: alert.triggered ? 0.6 : 1 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: alert.triggered ? '#ffb300' : '#333', flexShrink: 0 }} />
      <span style={{ flex: 1, color }}>{alert.symbol} {alert.condition} {alert.targetPrice.toFixed(2)}</span>
      {alert.triggered && <span style={{ color: '#ffb300', fontSize: 10 }}>FIRED</span>}
      <button
        onClick={() => onRemove(alert.id)}
        style={{ width: 16, height: 16, padding: 0, background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: 12, lineHeight: '16px' }}
      >
        x
      </button>
    </div>
  );
}
