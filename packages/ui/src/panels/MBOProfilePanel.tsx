import React, { useMemo } from 'react';
import type { MBOSnapshot, MBOProfileLevel, MBOProfileConfig } from '@terminal/types';
import { buildMBOProfile, DEFAULT_MBO_PROFILE_CONFIG } from '@terminal/types';

export interface MBOProfilePanelProps {
  panelId: string;
  snapshot?: MBOSnapshot;
  config?: MBOProfileConfig;
}

function formatAge(ms: number): string {
  if (ms < 1000) return '<1s';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3600_000)}h`;
}

function formatSize(size: number): string {
  if (size >= 1000) return `${(size / 1000).toFixed(1)}K`;
  if (size >= 1) return size.toFixed(2);
  return size.toFixed(4);
}

export function MBOProfilePanel({ panelId, snapshot, config }: MBOProfilePanelProps): React.JSX.Element {
  const cfg = config ?? DEFAULT_MBO_PROFILE_CONFIG;

  const profile = useMemo(() => {
    if (!snapshot) return [];
    return buildMBOProfile(snapshot, cfg);
  }, [snapshot, cfg]);

  const bidLevels = profile.filter((l) => l.side === 'bid');
  const askLevels = profile.filter((l) => l.side === 'ask');

  // Find max total size for bar normalization
  const maxSize = Math.max(1, ...profile.map((l) => l.totalSize));

  return (
    <div
      data-panel-id={panelId}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f0f14',
        color: '#ccc',
        fontSize: 11,
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #222', fontSize: 10, color: '#888' }}>
        MBO Profile {snapshot ? `(${snapshot.symbol})` : '— No data'}
      </div>

      {!snapshot ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
          Awaiting MBO data (requires Hyperliquid L3 feed)
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Bid side */}
          <div style={{ flex: 1, overflow: 'auto', borderRight: '1px solid #222' }}>
            <div style={{ padding: '2px 6px', color: '#2CB776', fontSize: 10 }}>BIDS</div>
            {bidLevels.map((level) => (
              <LevelRow key={level.price} level={level} maxSize={maxSize} config={cfg} />
            ))}
          </div>

          {/* Ask side */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ padding: '2px 6px', color: '#E94747', fontSize: 10 }}>ASKS</div>
            {askLevels.map((level) => (
              <LevelRow key={level.price} level={level} maxSize={maxSize} config={cfg} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LevelRow({
  level,
  maxSize,
  config,
}: {
  level: MBOProfileLevel;
  maxSize: number;
  config: MBOProfileConfig;
}): React.JSX.Element {
  const barWidth = `${(level.totalSize / maxSize) * 100}%`;
  const isBid = level.side === 'bid';
  const barColor = isBid ? 'rgba(44, 183, 118, 0.15)' : 'rgba(233, 71, 71, 0.15)';
  const textColor = isBid ? '#2CB776' : '#E94747';
  const isLarge = level.maxOrderSize >= config.largeOrderThreshold;

  return (
    <div
      style={{
        position: 'relative',
        padding: '1px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1a1a22',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: isBid ? undefined : 0,
          right: isBid ? 0 : undefined,
          bottom: 0,
          width: barWidth,
          background: barColor,
        }}
      />
      <span style={{ position: 'relative', color: textColor }}>
        {level.price.toFixed(1)}
      </span>
      <span style={{ position: 'relative', display: 'flex', gap: 8 }}>
        <span style={{ color: isLarge ? '#FFD700' : '#888' }}>
          {level.orderCount}x
        </span>
        <span style={{ color: '#aaa', minWidth: 50, textAlign: 'right' }}>
          {formatSize(level.totalSize)}
        </span>
        {config.showOrderAge && (
          <span style={{ color: '#555', minWidth: 30, textAlign: 'right' }}>
            {formatAge(level.oldestOrderAge)}
          </span>
        )}
      </span>
    </div>
  );
}
