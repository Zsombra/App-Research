import { create } from 'zustand';
import type { MarketplaceIndicator, InstalledIndicator, MarketplaceSortBy } from '@terminal/types';

const STORAGE_KEY = 'terminal-installed-indicators-v1';

function loadInstalled(): InstalledIndicator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInstalled(indicators: InstalledIndicator[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
  } catch {
    // Ignore storage errors
  }
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
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  available: [],
  installed: loadInstalled(),
  searchQuery: '',
  sortBy: 'popular',
  loading: false,

  setAvailable: (indicators) => set({ available: indicators }),

  install: (indicator) => {
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
