import React from 'react';
import type { ExchangeId, CandleTimeframe } from '@terminal/types';
import { useSettingsStore } from '../stores/settings-store.js';

const EXCHANGES: readonly { id: ExchangeId; label: string }[] = [
  { id: 'simulated', label: 'Simulated' },
  { id: 'binance', label: 'Binance' },
  { id: 'bybit', label: 'Bybit' },
  { id: 'coinbase', label: 'Coinbase' },
];

const TIMEFRAMES: readonly CandleTimeframe[] = ['1s', '5s', '1m', '5m', '15m', '1h', '4h', '1d'] as const;

interface SettingsRowProps {
  label: string;
  children: React.ReactNode;
}

function SettingsRow({ label, children }: SettingsRowProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ color: '#aaa', fontSize: 12 }}>{label}</span>
      {children}
    </div>
  );
}

export function SettingsPanel(): React.JSX.Element {
  const settings = useSettingsStore();

  return (
    <div style={{ padding: 12, color: '#ccc', fontSize: 12, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#fff' }}>Settings</div>

      <div style={{ borderBottom: '1px solid #222', paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>GENERAL</div>

        <SettingsRow label="Default Exchange">
          <select
            value={settings.defaultExchange}
            onChange={(e) => settings.updateSetting('defaultExchange', e.target.value as ExchangeId)}
            style={selectStyle}
          >
            {EXCHANGES.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.label}</option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow label="Default Timeframe">
          <select
            value={settings.defaultTimeframe}
            onChange={(e) => settings.updateSetting('defaultTimeframe', e.target.value as CandleTimeframe)}
            style={selectStyle}
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow label="Show Ticker Bar">
          <input
            type="checkbox"
            checked={settings.showTickerBar}
            onChange={(e) => settings.updateSetting('showTickerBar', e.target.checked)}
            style={{ accentColor: '#5c6bc0' }}
          />
        </SettingsRow>

        <SettingsRow label="Auto-Fit Chart">
          <input
            type="checkbox"
            checked={settings.autoFitChart}
            onChange={(e) => settings.updateSetting('autoFitChart', e.target.checked)}
            style={{ accentColor: '#5c6bc0' }}
          />
        </SettingsRow>

        <SettingsRow label="Max Trades Display">
          <input
            type="number"
            value={settings.maxTradesDisplay}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (Number.isFinite(val) && val > 0) settings.updateSetting('maxTradesDisplay', val);
            }}
            min={10}
            max={500}
            style={{
              ...selectStyle,
              width: 60,
              textAlign: 'center' as const,
            }}
          />
        </SettingsRow>
      </div>

      <button
        onClick={settings.resetDefaults}
        style={{
          background: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #ef5350',
          borderRadius: 3,
          color: '#ef5350',
          fontSize: 11,
          padding: '4px 12px',
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        Reset to Defaults
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: '#0f0f14',
  border: '1px solid #333',
  borderRadius: 3,
  color: '#ccc',
  fontSize: 11,
  padding: '2px 4px',
};
