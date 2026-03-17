import React, { useState, useCallback } from 'react';
import type { IndicatorKind } from '@terminal/types';
import { INDICATOR_DEFAULTS } from '@terminal/types';
import { useIndicatorStore, useIndicatorConfigs } from '../stores/indicator-store.js';

const AVAILABLE_INDICATORS: { kind: IndicatorKind; label: string }[] = [
  { kind: 'sma', label: 'SMA' },
  { kind: 'ema', label: 'EMA' },
  { kind: 'rsi', label: 'RSI' },
  { kind: 'macd', label: 'MACD' },
  { kind: 'bollinger', label: 'Bollinger' },
  { kind: 'cvd', label: 'CVD' },
  { kind: 'vwap', label: 'VWAP' },
];

function formatParams(params: Record<string, number>): string {
  return Object.values(params).join(', ');
}

export function IndicatorSelector(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const configs = useIndicatorConfigs();
  const addIndicator = useIndicatorStore((s) => s.addIndicator);
  const removeIndicator = useIndicatorStore((s) => s.removeIndicator);
  const updateParams = useIndicatorStore((s) => s.updateParams);

  const handleAdd = useCallback((kind: IndicatorKind) => {
    addIndicator(kind);
  }, [addIndicator]);

  const handleParamChange = useCallback((id: string, key: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      updateParams(id, { [key]: num });
    }
  }, [updateParams]);

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? 'rgba(92, 107, 192, 0.2)' : 'rgba(255,255,255,0.05)',
          border: '1px solid #333',
          borderRadius: 3,
          color: '#aaa',
          fontSize: 11,
          padding: '2px 8px',
          cursor: 'pointer',
        }}
      >
        Indicators{configs.length > 0 ? ` (${configs.length})` : ''}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: '#1a1a22',
            border: '1px solid #333',
            borderRadius: 4,
            padding: 8,
            minWidth: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {/* Available indicators */}
          <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>ADD INDICATOR</div>
          {AVAILABLE_INDICATORS.map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => handleAdd(kind)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: '#ccc',
                fontSize: 12,
                padding: '4px 6px',
                cursor: 'pointer',
                borderRadius: 2,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {label} ({formatParams(INDICATOR_DEFAULTS[kind])})
            </button>
          ))}

          {/* Active indicators */}
          {configs.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: '#666', marginTop: 8, marginBottom: 4, borderTop: '1px solid #333', paddingTop: 8 }}>
                ACTIVE
              </div>
              {configs.map((config) => (
                <div
                  key={config.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 0',
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: config.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: '#ccc', flex: 1 }}>
                    {config.kind.toUpperCase()}
                  </span>
                  {Object.entries(config.params).map(([key, val]) => (
                    <input
                      key={key}
                      type="number"
                      value={val}
                      onChange={(e) => handleParamChange(config.id, key, e.target.value)}
                      style={{
                        width: 36,
                        background: '#0f0f14',
                        border: '1px solid #333',
                        borderRadius: 2,
                        color: '#ccc',
                        fontSize: 10,
                        padding: '1px 3px',
                        textAlign: 'center',
                      }}
                      title={key}
                      min={1}
                    />
                  ))}
                  <button
                    onClick={() => removeIndicator(config.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '0 2px',
                    }}
                    title="Remove"
                  >
                    x
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
