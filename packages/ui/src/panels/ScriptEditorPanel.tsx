import React, { useState, useCallback } from 'react';
import type { CustomScript } from '@terminal/types';
import { useScriptStore, useScripts } from '../stores/script-store.js';

const DEFAULT_SCRIPT = `// Custom Indicator Script
// Available: candles.open[], candles.close[], candles.high[], candles.low[], candles.volume[]
// Helpers: sma(values, period), ema(values, period), crossover(a, b), crossunder(a, b)
// Output: plot(values, { color, width, label }), alert(message)

const ma20 = sma(candles.close, 20);
const ma50 = sma(candles.close, 50);

plot(ma20, { color: '#FFD700', label: 'SMA 20' });
plot(ma50, { color: '#00BCD4', label: 'SMA 50' });

if (crossover(ma20.filter(v => v !== null), ma50.filter(v => v !== null))) {
  alert('Golden Cross: SMA 20 crossed above SMA 50');
}
`;

function generateId(): string {
  return 'script-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Script Editor Panel.
 * Allows users to write, save, and manage custom indicator/alert scripts.
 */
export function ScriptEditorPanel(): React.JSX.Element {
  const scripts = useScripts();
  const store = useScriptStore.getState;

  const [activeScriptId, setActiveScriptId] = useState<string | null>(
    scripts.length > 0 ? (scripts[0] as { id: string }).id : null
  );
  const [editSource, setEditSource] = useState(
    scripts.length > 0 ? (scripts[0] as { source: string }).source : DEFAULT_SCRIPT
  );
  const [editName, setEditName] = useState(
    scripts.length > 0 ? (scripts[0] as { name: string }).name : 'New Script'
  );

  const activeScript = activeScriptId
    ? store().scripts.get(activeScriptId) ?? null
    : null;

  const handleNew = useCallback(() => {
    const id = generateId();
    const newScript: CustomScript = {
      id,
      name: 'New Script',
      source: DEFAULT_SCRIPT,
      type: 'indicator',
      enabled: false,
      color: '#FFD700',
      lastError: null,
      lastModified: Date.now(),
    };
    store().saveScript(newScript);
    setActiveScriptId(id);
    setEditSource(DEFAULT_SCRIPT);
    setEditName('New Script');
  }, [store]);

  const handleSave = useCallback(() => {
    if (!activeScriptId) return;
    const existing = store().scripts.get(activeScriptId);
    const script: CustomScript = {
      id: activeScriptId,
      name: editName,
      source: editSource,
      type: existing?.type ?? 'indicator',
      enabled: existing?.enabled ?? false,
      color: existing?.color ?? '#FFD700',
      lastError: null,
      lastModified: Date.now(),
    };
    store().saveScript(script);
  }, [activeScriptId, editSource, editName, store]);

  const handleSelect = useCallback((script: CustomScript) => {
    setActiveScriptId(script.id);
    setEditSource(script.source);
    setEditName(script.name);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%', color: '#ccc', fontSize: 11 }}>
      {/* Script list sidebar */}
      <div style={{
        width: 180,
        borderRight: '1px solid #222',
        overflow: 'auto',
        padding: 8,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Scripts</span>
          <button
            onClick={handleNew}
            style={{
              background: '#5c6bc0',
              border: 'none',
              borderRadius: 2,
              color: '#fff',
              fontSize: 10,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            + New
          </button>
        </div>

        {scripts.map((script) => (
          <div
            key={script.id}
            onClick={() => handleSelect(script)}
            style={{
              padding: '4px 6px',
              marginBottom: 2,
              borderRadius: 2,
              background: activeScriptId === script.id ? 'rgba(92, 107, 192, 0.2)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: script.enabled ? '#fff' : '#888' }}>
              {script.name}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={(e) => { e.stopPropagation(); store().toggleScript(script.id); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: script.enabled ? '#4CAF50' : '#666',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {script.enabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  store().removeScript(script.id);
                  if (activeScriptId === script.id) {
                    setActiveScriptId(null);
                    setEditSource(DEFAULT_SCRIPT);
                    setEditName('New Script');
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#F44336',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Script name + save */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          borderBottom: '1px solid #222',
        }}>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={{
              background: '#0f0f14',
              border: '1px solid #333',
              borderRadius: 2,
              color: '#fff',
              fontSize: 11,
              padding: '2px 6px',
              flex: 1,
            }}
          />
          <button
            onClick={handleSave}
            style={{
              background: '#5c6bc0',
              border: 'none',
              borderRadius: 2,
              color: '#fff',
              fontSize: 10,
              padding: '3px 12px',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>

        {/* Code editor (textarea) */}
        <textarea
          value={editSource}
          onChange={(e) => setEditSource(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            background: '#0a0a0f',
            color: '#e0e0e0',
            border: 'none',
            padding: 12,
            fontSize: 12,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            lineHeight: 1.5,
            resize: 'none',
            outline: 'none',
            tabSize: 2,
          }}
        />

        {/* Error display */}
        {activeScript?.lastError && (
          <div style={{
            padding: '4px 8px',
            background: 'rgba(244, 67, 54, 0.1)',
            borderTop: '1px solid #F44336',
            color: '#F44336',
            fontSize: 10,
          }}>
            Error: {activeScript.lastError}
          </div>
        )}
      </div>
    </div>
  );
}
