import React, { useEffect } from 'react';
import {
  useMarketplaceStore,
  useFilteredMarketplace,
  useInstalledIndicators,
} from '../stores/marketplace-store.js';
import type { MarketplaceIndicator, MarketplaceSortBy } from '@terminal/types';
import { COLOR_BULLISH_GL, COLOR_BEARISH_GL, COLOR_NEUTRAL } from '../theme-colors.js';

export interface MarketplacePanelProps {
  panelId: string;
}

const SORT_OPTIONS: readonly { value: MarketplaceSortBy; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'recent', label: 'Recent' },
  { value: 'top-rated', label: 'Top Rated' },
  { value: 'name', label: 'A-Z' },
];

export function MarketplacePanel({ panelId }: MarketplacePanelProps): React.JSX.Element {
  const searchQuery = useMarketplaceStore((s) => s.searchQuery);
  const sortBy = useMarketplaceStore((s) => s.sortBy);
  const loading = useMarketplaceStore((s) => s.loading);
  const available = useFilteredMarketplace();
  const installed = useInstalledIndicators();

  const fetchAvailable = useMarketplaceStore((s) => s.fetchAvailable);

  // Fetch marketplace indicators on mount
  useEffect(() => {
    void fetchAvailable();
  }, [fetchAvailable]);

  const installedIds = new Set(installed.map((i) => i.indicatorId));

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
      {/* Header */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #222' }}>
        <div style={{ marginBottom: 4, fontSize: 12, color: '#ddd' }}>Community Indicators</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => useMarketplaceStore.getState().setSearchQuery(e.target.value)}
            placeholder="Search indicators..."
            style={{
              flex: 1,
              background: '#1a1a22',
              border: '1px solid #333',
              borderRadius: 3,
              color: '#ccc',
              padding: '2px 6px',
              fontSize: 10,
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => useMarketplaceStore.getState().setSortBy(e.target.value as MarketplaceSortBy)}
            style={{
              background: '#1a1a22',
              border: '1px solid #333',
              borderRadius: 3,
              color: '#ccc',
              fontSize: 10,
              padding: '2px 4px',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>Loading...</div>
        ) : available.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>
            No indicators available yet.
            <br />
            <span style={{ fontSize: 10, color: '#444' }}>
              Marketplace requires a backend server connection.
            </span>
          </div>
        ) : (
          available.map((ind) => (
            <IndicatorCard
              key={ind.id}
              indicator={ind}
              isInstalled={installedIds.has(ind.id)}
            />
          ))
        )}
      </div>

      {/* Installed section */}
      {installed.length > 0 && (
        <div style={{ borderTop: '1px solid #222', maxHeight: '40%', overflow: 'auto' }}>
          <div style={{ padding: '4px 8px', fontSize: 10, color: '#888' }}>
            Installed ({installed.length})
          </div>
          {installed.map((inst) => (
            <div
              key={inst.indicatorId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '3px 8px',
                borderBottom: '1px solid #1a1a22',
              }}
            >
              <span style={{ color: inst.enabled ? '#ccc' : '#555' }}>{inst.name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => useMarketplaceStore.getState().toggleEnabled(inst.indicatorId)}
                  style={{
                    padding: '1px 4px',
                    fontSize: 9,
                    background: inst.enabled ? 'rgba(44, 183, 118, 0.2)' : 'transparent',
                    border: '1px solid #444',
                    borderRadius: 2,
                    color: inst.enabled ? COLOR_BULLISH_GL : COLOR_NEUTRAL,
                    cursor: 'pointer',
                  }}
                >
                  {inst.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => useMarketplaceStore.getState().uninstall(inst.indicatorId)}
                  style={{
                    padding: '1px 4px',
                    fontSize: 9,
                    background: 'transparent',
                    border: '1px solid #444',
                    borderRadius: 2,
                    color: COLOR_BEARISH_GL,
                    cursor: 'pointer',
                  }}
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IndicatorCard({
  indicator,
  isInstalled,
}: {
  indicator: MarketplaceIndicator;
  isInstalled: boolean;
}): React.JSX.Element {
  return (
    <div
      style={{
        padding: '6px 8px',
        borderBottom: '1px solid #1a1a22',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ddd', fontSize: 11 }}>{indicator.name}</span>
        <span style={{
          padding: '0 4px',
          fontSize: 9,
          background: '#1a1a22',
          border: '1px solid #333',
          borderRadius: 2,
          color: '#888',
        }}>
          {indicator.category}
        </span>
      </div>
      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{indicator.description}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
        <span style={{ color: '#555', fontSize: 9 }}>
          by {indicator.author} &middot; v{indicator.version} &middot; {indicator.installs} installs
        </span>
        <button
          onClick={() => {
            if (!isInstalled) {
              useMarketplaceStore.getState().install(indicator);
            }
          }}
          disabled={isInstalled}
          style={{
            padding: '1px 6px',
            fontSize: 9,
            background: isInstalled ? '#1a1a22' : 'rgba(92, 107, 192, 0.2)',
            border: isInstalled ? '1px solid #333' : '1px solid #5c6bc0',
            borderRadius: 2,
            color: isInstalled ? '#555' : '#fff',
            cursor: isInstalled ? 'default' : 'pointer',
          }}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    </div>
  );
}
