import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLayoutStore, getDefaultPanels, loadPersistedPanels, generatePanelId } from '../stores/layout-store.js';

// Mock localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
});

describe('useLayoutStore', () => {
  beforeEach(() => {
    // Reset store
    useLayoutStore.setState({
      panels: getDefaultPanels(),
      initialized: false,
    });
    // Clear mock storage
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  it('should have default panels', () => {
    const panels = useLayoutStore.getState().panels;
    expect(panels).toHaveLength(6);
    expect(panels.map((p) => p.type)).toEqual(['chart', 'orderbook', 'trades', 'watchlist', 'order-entry', 'positions']);
  });

  it('should add a panel', () => {
    useLayoutStore.getState().addPanel({
      id: 'test-panel',
      type: 'placeholder',
      title: 'Test',
      linkColor: 'none',
      symbol: 'BTC/USDT',
    });
    expect(useLayoutStore.getState().panels).toHaveLength(7);
  });

  it('should remove a panel', () => {
    useLayoutStore.getState().removePanel('chart-main');
    expect(useLayoutStore.getState().panels).toHaveLength(5);
    expect(useLayoutStore.getState().panels.find((p) => p.id === 'chart-main')).toBeUndefined();
  });

  it('should persist panels to localStorage on add', () => {
    useLayoutStore.getState().addPanel({
      id: 'test-persist',
      type: 'placeholder',
      title: 'Test',
      linkColor: 'none',
      symbol: 'ETH/USDT',
    });
    expect(localStorage.setItem).toHaveBeenCalled();
  });
});

describe('getDefaultPanels', () => {
  it('should return all default panel types', () => {
    const panels = getDefaultPanels();
    expect(panels).toHaveLength(6);
    expect(panels.map((p) => p.type)).toEqual([
      'chart', 'orderbook', 'trades', 'watchlist', 'order-entry', 'positions',
    ]);
  });
});

describe('loadPersistedPanels', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  it('should return null when no persisted data', () => {
    expect(loadPersistedPanels()).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    mockStorage['terminal-layout-v1'] = 'not json';
    expect(loadPersistedPanels()).toBeNull();
  });

  it('should return null for empty array', () => {
    mockStorage['terminal-layout-v1'] = '[]';
    expect(loadPersistedPanels()).toBeNull();
  });

  it('should return parsed panels', () => {
    const panels = getDefaultPanels();
    mockStorage['terminal-layout-v1'] = JSON.stringify(panels);
    const result = loadPersistedPanels();
    expect(result).toHaveLength(6);
  });
});

describe('generatePanelId', () => {
  it('should generate unique ids', () => {
    const id1 = generatePanelId('chart');
    const id2 = generatePanelId('chart');
    expect(id1).not.toBe(id2);
    expect(id1).toContain('chart');
  });
});
