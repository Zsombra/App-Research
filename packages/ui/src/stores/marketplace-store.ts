import { create } from 'zustand';
import type { MarketplaceIndicator, InstalledIndicator, MarketplaceSortBy } from '@terminal/types';

const STORAGE_KEY = 'terminal-installed-indicators-v1';

/** Milliseconds in one day, used for relative timestamp calculations. */
const MS_PER_DAY = 86_400_000;

function loadInstalled(): InstalledIndicator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[marketplace-store] Failed to load installed indicators:', err);
    return [];
  }
}

function saveInstalled(indicators: InstalledIndicator[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
  } catch (err) {
    console.warn('[marketplace-store] Failed to save installed indicators:', err);
  }
}

/**
 * Built-in community indicators shipped with the app.
 * Used as fallback when the marketplace API is unavailable.
 */
function getBuiltInIndicators(): readonly MarketplaceIndicator[] {
  return [
    {
      id: 'builtin-ema-ribbon',
      name: 'EMA Ribbon',
      description: 'Multiple EMA lines (8, 13, 21, 34, 55) forming a ribbon for trend direction.',
      author: 'terminal-team',
      version: '1.0.0',
      category: 'trend',
      source: 'const periods = [8,13,21,34,55]; return periods.map(p => ema(close, p));',
      installs: 1200,
      rating: 4.5,
      ratingCount: 48,
      publishedAt: Date.now() - 90 * MS_PER_DAY,
      updatedAt: Date.now() - 30 * MS_PER_DAY,
      tags: ['ema', 'ribbon', 'trend'],
    },
    {
      id: 'builtin-vol-profile',
      name: 'Session Volume Profile',
      description: 'Volume profile histogram for the current trading session.',
      author: 'terminal-team',
      version: '1.0.0',
      category: 'volume',
      source: 'return volumeProfile(candles, { session: "day" });',
      installs: 980,
      rating: 4.3,
      ratingCount: 32,
      publishedAt: Date.now() - 60 * MS_PER_DAY,
      updatedAt: Date.now() - 15 * MS_PER_DAY,
      tags: ['volume', 'profile', 'session'],
    },
    {
      id: 'builtin-delta-divergence',
      name: 'Delta Divergence',
      description: 'Highlights when price and cumulative delta diverge — potential reversal signal.',
      author: 'terminal-team',
      version: '1.0.0',
      category: 'orderflow',
      source: 'const d = cvd(candles); return divergence(close, d);',
      installs: 750,
      rating: 4.7,
      ratingCount: 25,
      publishedAt: Date.now() - 45 * MS_PER_DAY,
      updatedAt: Date.now() - 10 * MS_PER_DAY,
      tags: ['delta', 'divergence', 'orderflow', 'reversal'],
    },
    {
      id: 'builtin-rsi-divergence',
      name: 'RSI Divergence Scanner',
      description: 'Automatically detects bullish/bearish RSI divergences.',
      author: 'terminal-team',
      version: '1.0.0',
      category: 'momentum',
      source: 'const r = rsi(close, 14); return divergence(close, r);',
      installs: 620,
      rating: 4.2,
      ratingCount: 19,
      publishedAt: Date.now() - 30 * MS_PER_DAY,
      updatedAt: Date.now() - 5 * MS_PER_DAY,
      tags: ['rsi', 'divergence', 'momentum'],
    },
    {
      id: 'builtin-atr-bands',
      name: 'ATR Bands',
      description: 'Volatility bands based on ATR around a moving average.',
      author: 'terminal-team',
      version: '1.0.0',
      category: 'volatility',
      source: 'const m = sma(close, 20); const a = atr(14); return [m+2*a, m, m-2*a];',
      installs: 540,
      rating: 4.1,
      ratingCount: 15,
      publishedAt: Date.now() - 20 * MS_PER_DAY,
      updatedAt: Date.now() - 3 * MS_PER_DAY,
      tags: ['atr', 'bands', 'volatility'],
    },
  ];
}

export interface MarketplaceState {
  /** Available indicators from the marketplace (fetched from server) */
  available: MarketplaceIndicator[];
  /** Locally installed indicators */
  installed: InstalledIndicator[];
  /** Current search query */
  searchQuery: string;
  /** Current sort order */
  sortBy: MarketplaceSortBy;
  /** Whether marketplace data is loading */
  loading: boolean;
  /** Error message from last fetch attempt, null if successful */
  fetchError: string | null;

  /** Set available indicators (from API fetch) */
  setAvailable: (indicators: MarketplaceIndicator[]) => void;
  /** Install an indicator from the marketplace */
  install: (indicator: MarketplaceIndicator) => void;
  /** Uninstall an indicator */
  uninstall: (indicatorId: string) => void;
  /** Toggle an installed indicator on/off */
  toggleEnabled: (indicatorId: string) => void;
  /** Update search query */
  setSearchQuery: (query: string) => void;
  /** Update sort order */
  setSortBy: (sortBy: MarketplaceSortBy) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Fetch available indicators from API */
  fetchAvailable: (apiUrl?: string) => Promise<void>;
  /** Fetch indicators filtered by category */
  fetchByCategory: (category: string, apiUrl?: string) => Promise<void>;
  /** Search indicators remotely */
  searchRemote: (query: string, apiUrl?: string) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  available: [],
  installed: loadInstalled(),
  searchQuery: '',
  sortBy: 'popular',
  loading: false,
  fetchError: null,

  setAvailable: (indicators) => set({ available: indicators }),

  install: (indicator: Readonly<MarketplaceIndicator>) => {
    const state = get();
    // Don't install duplicates
    if (state.installed.some((i) => i.indicatorId === indicator.id)) return;

    const installed: InstalledIndicator = {
      indicatorId: indicator.id,
      version: indicator.version,
      name: indicator.name,
      source: indicator.source,
      enabled: true,
      installedAt: Date.now(),
    };

    const updated = [...state.installed, installed];
    saveInstalled(updated);
    set({ installed: updated });
  },

  uninstall: (indicatorId) => {
    const updated = get().installed.filter((i) => i.indicatorId !== indicatorId);
    saveInstalled(updated);
    set({ installed: updated });
  },

  toggleEnabled: (indicatorId) => {
    const updated = get().installed.map((i) =>
      i.indicatorId === indicatorId ? { ...i, enabled: !i.enabled } : i
    );
    saveInstalled(updated);
    set({ installed: updated });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortBy: (sortBy) => set({ sortBy }),
  setLoading: (loading) => set({ loading }),

  fetchAvailable: async (apiUrl?: string) => {
    const state = get();
    if (state.loading) return;
    set({ loading: true, fetchError: null });

    try {
      const url = apiUrl ?? '/api/marketplace/indicators';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Marketplace fetch failed: ${response.status}`);
      }

      const data = await response.json() as { indicators: MarketplaceIndicator[] };
      const indicators = Array.isArray(data) ? data : data.indicators ?? [];
      set({ available: indicators as MarketplaceIndicator[], loading: false, fetchError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[marketplace-store] Fetch failed, using built-in indicators:', message);
      set({ available: getBuiltInIndicators(), loading: false, fetchError: message });
    }
  },

  fetchByCategory: async (category: string, apiUrl?: string) => {
    set({ loading: true, fetchError: null });
    try {
      const url = apiUrl ?? '/api/marketplace/indicators';
      const response = await fetch(`${url}?category=${encodeURIComponent(category)}`);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const data = await response.json() as { indicators: MarketplaceIndicator[] };
      const indicators = Array.isArray(data) ? data : data.indicators ?? [];
      set({ available: indicators as MarketplaceIndicator[], loading: false, fetchError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[marketplace-store] Category fetch failed:', message);
      set({ loading: false, fetchError: message });
    }
  },

  searchRemote: async (query: string, apiUrl?: string) => {
    set({ loading: true, searchQuery: query, fetchError: null });
    try {
      const url = apiUrl ?? '/api/marketplace/indicators';
      const response = await fetch(`${url}?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const data = await response.json() as { indicators: MarketplaceIndicator[] };
      const indicators = Array.isArray(data) ? data : data.indicators ?? [];
      set({ available: indicators as MarketplaceIndicator[], loading: false, fetchError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[marketplace-store] Search failed:', message);
      set({ loading: false, fetchError: message });
    }
  },
}));

// Selectors
export function useInstalledIndicators(): InstalledIndicator[] {
  return useMarketplaceStore((s) => s.installed);
}

export function useEnabledIndicators(): InstalledIndicator[] {
  return useMarketplaceStore((s) => s.installed.filter((i) => i.enabled));
}

/**
 * Get sorted and filtered available indicators.
 */
export function useFilteredMarketplace(): MarketplaceIndicator[] {
  return useMarketplaceStore((s) => {
    let results = [...s.available];

    // Filter by search query
    if (s.searchQuery.trim()) {
      const q = s.searchQuery.toLowerCase();
      results = results.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (s.sortBy) {
      case 'popular':
        results.sort((a, b) => b.installs - a.installs);
        break;
      case 'recent':
        results.sort((a, b) => b.publishedAt - a.publishedAt);
        break;
      case 'top-rated':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return results;
  });
}
