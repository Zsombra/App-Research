import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMarketplaceStore } from '../stores/marketplace-store.js';
import type { MarketplaceIndicator } from '@terminal/types';

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
});

function makeIndicator(id: string, name: string): MarketplaceIndicator {
  return {
    id,
    name,
    description: `${name} description`,
    author: 'testuser',
    version: '1.0.0',
    category: 'trend',
    source: `// ${name}`,
    installs: 100,
    rating: 4.5,
    ratingCount: 10,
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['test'],
  };
}

describe('marketplace-store', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    useMarketplaceStore.setState({
      available: [],
      installed: [],
      searchQuery: '',
      sortBy: 'popular',
      loading: false,
    });
  });

  it('should install an indicator', () => {
    const ind = makeIndicator('ind-1', 'My SMA');
    useMarketplaceStore.getState().install(ind);

    const installed = useMarketplaceStore.getState().installed;
    expect(installed).toHaveLength(1);
    expect(installed[0]!.indicatorId).toBe('ind-1');
    expect(installed[0]!.enabled).toBe(true);
  });

  it('should not install duplicates', () => {
    const ind = makeIndicator('ind-1', 'My SMA');
    useMarketplaceStore.getState().install(ind);
    useMarketplaceStore.getState().install(ind);

    expect(useMarketplaceStore.getState().installed).toHaveLength(1);
  });

  it('should uninstall an indicator', () => {
    const ind = makeIndicator('ind-1', 'My SMA');
    useMarketplaceStore.getState().install(ind);
    useMarketplaceStore.getState().uninstall('ind-1');

    expect(useMarketplaceStore.getState().installed).toHaveLength(0);
  });

  it('should toggle enabled state', () => {
    const ind = makeIndicator('ind-1', 'My SMA');
    useMarketplaceStore.getState().install(ind);

    useMarketplaceStore.getState().toggleEnabled('ind-1');
    expect(useMarketplaceStore.getState().installed[0]!.enabled).toBe(false);

    useMarketplaceStore.getState().toggleEnabled('ind-1');
    expect(useMarketplaceStore.getState().installed[0]!.enabled).toBe(true);
  });

  it('should set available indicators', () => {
    const indicators = [makeIndicator('a', 'A'), makeIndicator('b', 'B')];
    useMarketplaceStore.getState().setAvailable(indicators);
    expect(useMarketplaceStore.getState().available).toHaveLength(2);
  });

  it('should persist installed to localStorage', () => {
    const ind = makeIndicator('ind-1', 'My SMA');
    useMarketplaceStore.getState().install(ind);

    const stored = JSON.parse(storage['terminal-installed-indicators-v1'] ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].indicatorId).toBe('ind-1');
  });
});
