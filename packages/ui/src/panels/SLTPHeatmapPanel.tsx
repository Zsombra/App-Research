import React, { useEffect } from 'react';
import { useActiveSymbol } from '../stores/symbol-store.js';
import { useCandles } from '../stores/market-store.js';
import {
  useSLTPHeatmapStore,
  useSLClusters,
  useTPClusters,
} from '../stores/sl-tp-heatmap-store.js';
import { COLOR_DANGER, COLOR_SUCCESS, COLOR_MUTED } from '../theme-colors.js';

/** Maximum clusters shown per section in the panel. */
const MAX_CLUSTERS_DISPLAY = 15;

/** Total number of SL/TP estimation algorithms. */
const NUM_ALGORITHMS = 6;

function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '—';
  if (price >= 10_000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(1);
  return price.toFixed(2);
}

function intensityBar(intensity: number, color: string): React.JSX.Element {
  const width = Math.min(100, Math.round(intensity * 100));
  return (
    <div style={{
      height: 10,
      width: `${width}%`,
      minWidth: width > 0 ? 2 : 0,
      background: color,
      borderRadius: 1,
      opacity: 0.3 + intensity * 0.7,
    }} />
  );
}

interface SLTPHeatmapPanelProps {
  mode?: 'sl' | 'tp' | 'both';
}

/**
 * SL/TP Heatmap Panel.
 * Shows estimated stop-loss and take-profit cluster zones.
 * Exchange-agnostic: works with any OHLCV data.
 */
export function SLTPHeatmapPanel({ mode = 'both' }: SLTPHeatmapPanelProps): React.JSX.Element {
  const activeSymbol = useActiveSymbol();
  const candles = useCandles(activeSymbol);
  const recompute = useSLTPHeatmapStore((s) => s.recompute);
  const enabled = useSLTPHeatmapStore((s) => s.enabled);
  const setEnabled = useSLTPHeatmapStore((s) => s.setEnabled);
  const slClusters = useSLClusters(activeSymbol);
  const tpClusters = useTPClusters(activeSymbol);

  // Auto-enable and recompute when candles change
  useEffect(() => {
    if (!enabled) setEnabled(true);
  }, [enabled, setEnabled]);

  useEffect(() => {
    if (candles.length > 0) {
      recompute(activeSymbol, candles);
    }
  }, [activeSymbol, candles, recompute]);

  const showSL = mode === 'sl' || mode === 'both';
  const showTP = mode === 'tp' || mode === 'both';

  const title = mode === 'sl' ? 'Stop-Loss Heatmap'
    : mode === 'tp' ? 'Take-Profit Heatmap'
    : 'SL/TP Heatmap';

  if (candles.length === 0) {
    return (
      <div style={{ padding: 12, color: COLOR_MUTED, fontSize: 12, textAlign: 'center' }}>
        Waiting for data...
      </div>
    );
  }

  return (
    <div style={{ padding: 8, color: '#ccc', fontSize: 11, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#fff' }}>
        {title} — {activeSymbol}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 10 }}>
        {showSL && <span style={{ color: COLOR_DANGER }}>SL Zones: {slClusters.length}</span>}
        {showTP && <span style={{ color: COLOR_SUCCESS }}>TP Zones: {tpClusters.length}</span>}
        <span style={{ color: '#666' }}>Algorithms: {NUM_ALGORITHMS}</span>
      </div>

      {/* SL Clusters */}
      {showSL && slClusters.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: COLOR_DANGER, marginBottom: 4, fontWeight: 600 }}>
            STOP-LOSS CLUSTERS
          </div>
          {slClusters.slice(0, MAX_CLUSTERS_DISPLAY).map((cluster, i) => (
            <div
              key={`sl-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '2px 0',
                fontSize: 10,
              }}
            >
              <span style={{ width: 60, textAlign: 'right', color: COLOR_MUTED, flexShrink: 0 }}>
                {formatPrice(cluster.price)}
              </span>
              <span style={{ width: 40, color: cluster.side === 'long' ? COLOR_SUCCESS : COLOR_DANGER, flexShrink: 0 }}>
                {cluster.side}
              </span>
              <div style={{ flex: 1 }}>
                {intensityBar(cluster.intensity, COLOR_DANGER)}
              </div>
              <span style={{ width: 60, fontSize: 9, color: '#555', flexShrink: 0 }}>
                {cluster.sources.filter((s) => s !== 'composite').join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TP Clusters */}
      {showTP && tpClusters.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: COLOR_SUCCESS, marginBottom: 4, fontWeight: 600 }}>
            TAKE-PROFIT CLUSTERS
          </div>
          {tpClusters.slice(0, MAX_CLUSTERS_DISPLAY).map((cluster, i) => (
            <div
              key={`tp-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '2px 0',
                fontSize: 10,
              }}
            >
              <span style={{ width: 60, textAlign: 'right', color: COLOR_MUTED, flexShrink: 0 }}>
                {formatPrice(cluster.price)}
              </span>
              <span style={{ width: 40, color: cluster.side === 'long' ? COLOR_SUCCESS : COLOR_DANGER, flexShrink: 0 }}>
                {cluster.side}
              </span>
              <div style={{ flex: 1 }}>
                {intensityBar(cluster.intensity, COLOR_SUCCESS)}
              </div>
              <span style={{ width: 60, fontSize: 9, color: '#555', flexShrink: 0 }}>
                {cluster.sources.filter((s) => s !== 'composite').join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Algorithm legend */}
      <div style={{ marginTop: 12, borderTop: '1px solid #222', paddingTop: 8 }}>
        <div style={{ fontSize: 9, color: '#555', marginBottom: 4 }}>ALGORITHMS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 9, color: '#666' }}>
          <span>LIQ = Liquidation Math</span>
          <span>SWG = Swing Cluster</span>
          <span>RND = Round Numbers</span>
          <span>SWP = Historical Sweep</span>
          <span>DBS = DBSCAN</span>
          <span>CMP = Composite</span>
        </div>
      </div>
    </div>
  );
}
