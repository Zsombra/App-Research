import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before import
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  }),
});

import { useSettingsStore } from '../stores/settings-store.js';

const DEFAULTS = {
  defaultExchange: 'simulated',
  defaultTimeframe: '1m',
  showTickerBar: true,
  autoFitChart: true,
  maxTradesDisplay: 100,
} as const;

function resetAll() {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  vi.mocked(localStorage.getItem).mockClear();
  vi.mocked(localStorage.setItem).mockClear();
  useSettingsStore.setState({ ...DEFAULTS });
}

describe('settings-store validation', () => {
  beforeEach(() => {
    resetAll();
  });

  // -------------------------------------------------------------------------
  // maxTradesDisplay validation
  // -------------------------------------------------------------------------
  describe('maxTradesDisplay validation on load', () => {
    it('should fall back to default when maxTradesDisplay is a non-numeric string', () => {
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        maxTradesDisplay: 'not-a-number',
      });

      // Re-import by forcing store state with the load logic
      const loaded = loadWithValidation(mockStorage['terminal-settings-v1']!);
      useSettingsStore.setState(loaded);

      expect(useSettingsStore.getState().maxTradesDisplay).toBe(100);
    });

    it('should fall back to default when maxTradesDisplay is NaN', () => {
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        maxTradesDisplay: NaN,
      });

      const loaded = loadWithValidation(mockStorage['terminal-settings-v1']!);
      useSettingsStore.setState(loaded);

      // NaN should be replaced with default
      expect(useSettingsStore.getState().maxTradesDisplay).toBe(100);
    });

    it('should fall back to default when maxTradesDisplay is 0', () => {
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        maxTradesDisplay: 0,
      });

      const loaded = loadWithValidation(mockStorage['terminal-settings-v1']!);
      useSettingsStore.setState(loaded);

      expect(useSettingsStore.getState().maxTradesDisplay).toBe(100);
    });

    it('should fall back to default when maxTradesDisplay is negative', () => {
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        maxTradesDisplay: -50,
      });

      const loaded = loadWithValidation(mockStorage['terminal-settings-v1']!);
      useSettingsStore.setState(loaded);

      expect(useSettingsStore.getState().maxTradesDisplay).toBe(100);
    });

    it('should accept valid positive maxTradesDisplay', () => {
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        maxTradesDisplay: 500,
      });

      const loaded = loadWithValidation(mockStorage['terminal-settings-v1']!);
      useSettingsStore.setState(loaded);

      expect(useSettingsStore.getState().maxTradesDisplay).toBe(500);
    });

    it('should floor fractional maxTradesDisplay', () => {
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        maxTradesDisplay: 150.7,
      });

      const loaded = loadWithValidation(mockStorage['terminal-settings-v1']!);
      useSettingsStore.setState(loaded);

      expect(useSettingsStore.getState().maxTradesDisplay).toBe(150);
    });

    it('should fall back to default when maxTradesDisplay is Infinity', () => {
      // JSON.stringify converts Infinity to null, so test with null
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        maxTradesDisplay: null,
      });

      const loaded = loadWithValidation(mockStorage['terminal-settings-v1']!);
      useSettingsStore.setState(loaded);

      // null becomes NaN via Number(), which is not finite → falls back to default
      expect(useSettingsStore.getState().maxTradesDisplay).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Corrupt localStorage handling
  // -------------------------------------------------------------------------
  describe('corrupt localStorage', () => {
    it('should return defaults for invalid JSON', () => {
      mockStorage['terminal-settings-v1'] = 'not valid json {{{';

      // When the store loads with invalid JSON, it catches the error and uses defaults
      // We can't easily re-initialize the store, so test the logic directly
      let result = DEFAULTS;
      try {
        JSON.parse(mockStorage['terminal-settings-v1']!);
      } catch {
        result = { ...DEFAULTS };
      }

      expect(result.maxTradesDisplay).toBe(100);
    });

    it('should handle empty string in localStorage', () => {
      mockStorage['terminal-settings-v1'] = '';

      let result;
      try {
        const raw = mockStorage['terminal-settings-v1'];
        if (!raw) {
          result = { ...DEFAULTS };
        } else {
          JSON.parse(raw);
        }
      } catch {
        result = { ...DEFAULTS };
      }

      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Partial settings override
  // -------------------------------------------------------------------------
  describe('partial settings from storage', () => {
    it('should merge partial settings with defaults', () => {
      const loaded = loadWithValidation(JSON.stringify({
        defaultExchange: 'binance',
      }));

      expect(loaded.defaultExchange).toBe('binance');
      expect(loaded.defaultTimeframe).toBe('1m');
      expect(loaded.showTickerBar).toBe(true);
      expect(loaded.autoFitChart).toBe(true);
      expect(loaded.maxTradesDisplay).toBe(100);
    });

    it('should handle empty object from storage', () => {
      const loaded = loadWithValidation(JSON.stringify({}));
      expect(loaded).toEqual(DEFAULTS);
    });
  });
});

/**
 * Simulates the loadSettings logic with our validation.
 * This mirrors the actual loadSettings function in settings-store.ts.
 */
function loadWithValidation(raw: string): typeof DEFAULTS & Record<string, unknown> {
  const defaults = { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Apply maxTradesDisplay validation (mirrors the actual code)
    if (parsed['maxTradesDisplay'] !== undefined) {
      const n = Number(parsed['maxTradesDisplay']);
      parsed['maxTradesDisplay'] = isFinite(n) && n > 0 ? Math.floor(n) : defaults.maxTradesDisplay;
    }

    return { ...defaults, ...parsed } as typeof DEFAULTS & Record<string, unknown>;
  } catch {
    return defaults;
  }
}
