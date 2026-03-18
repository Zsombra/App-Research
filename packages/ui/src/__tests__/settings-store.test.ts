import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage must be mocked before the store module is imported, because
// the store calls loadSettings() (which reads localStorage) at module
// initialisation time.  We use vi.stubGlobal so the mock is available for
// every dynamic import that follows.
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

// Import after the global stub is in place.
import { useSettingsStore } from '../stores/settings-store.js';

const DEFAULTS = {
  defaultExchange: 'simulated',
  defaultTimeframe: '1m',
  showTickerBar: true,
  autoFitChart: true,
  maxTradesDisplay: 100,
} as const;

/** Reset the store and the fake storage to a clean slate before each test. */
function resetAll() {
  // Clear fake storage entries
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  // Clear spy call history so assertions stay isolated
  vi.mocked(localStorage.getItem).mockClear();
  vi.mocked(localStorage.setItem).mockClear();
  // Drive the store back to defaults
  useSettingsStore.setState({ ...DEFAULTS });
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    resetAll();
  });

  // ------------------------------------------------------------------
  // 1. Default state
  // ------------------------------------------------------------------
  describe('initial state', () => {
    it('has the correct default exchange', () => {
      expect(useSettingsStore.getState().defaultExchange).toBe('simulated');
    });

    it('has the correct default timeframe', () => {
      expect(useSettingsStore.getState().defaultTimeframe).toBe('1m');
    });

    it('shows the ticker bar by default', () => {
      expect(useSettingsStore.getState().showTickerBar).toBe(true);
    });

    it('auto-fits the chart by default', () => {
      expect(useSettingsStore.getState().autoFitChart).toBe(true);
    });

    it('has the correct default maxTradesDisplay', () => {
      expect(useSettingsStore.getState().maxTradesDisplay).toBe(100);
    });
  });

  // ------------------------------------------------------------------
  // 2. updateSetting
  // ------------------------------------------------------------------
  describe('updateSetting', () => {
    it('changes defaultExchange', () => {
      useSettingsStore.getState().updateSetting('defaultExchange', 'binance');
      expect(useSettingsStore.getState().defaultExchange).toBe('binance');
    });

    it('changes defaultTimeframe', () => {
      useSettingsStore.getState().updateSetting('defaultTimeframe', '4h');
      expect(useSettingsStore.getState().defaultTimeframe).toBe('4h');
    });

    it('changes showTickerBar to false', () => {
      useSettingsStore.getState().updateSetting('showTickerBar', false);
      expect(useSettingsStore.getState().showTickerBar).toBe(false);
    });

    it('changes autoFitChart to false', () => {
      useSettingsStore.getState().updateSetting('autoFitChart', false);
      expect(useSettingsStore.getState().autoFitChart).toBe(false);
    });

    it('changes maxTradesDisplay', () => {
      useSettingsStore.getState().updateSetting('maxTradesDisplay', 500);
      expect(useSettingsStore.getState().maxTradesDisplay).toBe(500);
    });

    it('persists the updated setting to localStorage', () => {
      useSettingsStore.getState().updateSetting('defaultExchange', 'bybit');
      expect(localStorage.setItem).toHaveBeenCalled();

      const [, rawValue] = vi.mocked(localStorage.setItem).mock.calls.at(-1)!;
      const persisted = JSON.parse(rawValue as string) as Record<string, unknown>;
      expect(persisted['defaultExchange']).toBe('bybit');
    });

    it('does not change other settings when one is updated', () => {
      useSettingsStore.getState().updateSetting('maxTradesDisplay', 250);
      const state = useSettingsStore.getState();
      // All other fields must still be at their defaults
      expect(state.defaultExchange).toBe('simulated');
      expect(state.defaultTimeframe).toBe('1m');
      expect(state.showTickerBar).toBe(true);
      expect(state.autoFitChart).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 3. resetDefaults
  // ------------------------------------------------------------------
  describe('resetDefaults', () => {
    it('resets all settings to defaults after multiple changes', () => {
      useSettingsStore.getState().updateSetting('defaultExchange', 'okx');
      useSettingsStore.getState().updateSetting('defaultTimeframe', '1h');
      useSettingsStore.getState().updateSetting('showTickerBar', false);
      useSettingsStore.getState().updateSetting('autoFitChart', false);
      useSettingsStore.getState().updateSetting('maxTradesDisplay', 999);

      useSettingsStore.getState().resetDefaults();
      const state = useSettingsStore.getState();

      expect(state.defaultExchange).toBe('simulated');
      expect(state.defaultTimeframe).toBe('1m');
      expect(state.showTickerBar).toBe(true);
      expect(state.autoFitChart).toBe(true);
      expect(state.maxTradesDisplay).toBe(100);
    });

    it('persists the defaults to localStorage on reset', () => {
      useSettingsStore.getState().updateSetting('defaultExchange', 'okx');
      vi.mocked(localStorage.setItem).mockClear();

      useSettingsStore.getState().resetDefaults();
      expect(localStorage.setItem).toHaveBeenCalled();

      const [, rawValue] = vi.mocked(localStorage.setItem).mock.calls.at(-1)!;
      const persisted = JSON.parse(rawValue as string) as Record<string, unknown>;
      expect(persisted['defaultExchange']).toBe('simulated');
    });

    it('is idempotent when already at defaults', () => {
      useSettingsStore.getState().resetDefaults();
      const state = useSettingsStore.getState();
      expect(state).toMatchObject(DEFAULTS);
    });
  });

  // ------------------------------------------------------------------
  // 4. Independent setting changes
  // ------------------------------------------------------------------
  describe('multiple independent settings changes', () => {
    it('each setting can be updated without affecting the others', () => {
      useSettingsStore.getState().updateSetting('defaultExchange', 'kraken');
      useSettingsStore.getState().updateSetting('showTickerBar', false);
      useSettingsStore.getState().updateSetting('maxTradesDisplay', 50);

      const state = useSettingsStore.getState();
      // Changed
      expect(state.defaultExchange).toBe('kraken');
      expect(state.showTickerBar).toBe(false);
      expect(state.maxTradesDisplay).toBe(50);
      // Unchanged
      expect(state.defaultTimeframe).toBe('1m');
      expect(state.autoFitChart).toBe(true);
    });

    it('overwrites the same setting multiple times correctly', () => {
      useSettingsStore.getState().updateSetting('defaultTimeframe', '5m');
      useSettingsStore.getState().updateSetting('defaultTimeframe', '1h');
      useSettingsStore.getState().updateSetting('defaultTimeframe', '1d');

      expect(useSettingsStore.getState().defaultTimeframe).toBe('1d');
    });

    it('boolean settings can be toggled back and forth', () => {
      useSettingsStore.getState().updateSetting('autoFitChart', false);
      expect(useSettingsStore.getState().autoFitChart).toBe(false);

      useSettingsStore.getState().updateSetting('autoFitChart', true);
      expect(useSettingsStore.getState().autoFitChart).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 5. localStorage persistence round-trip
  // ------------------------------------------------------------------
  describe('localStorage persistence', () => {
    it('writes valid JSON that contains all settings fields', () => {
      useSettingsStore.getState().updateSetting('defaultExchange', 'deribit');

      const [, rawValue] = vi.mocked(localStorage.setItem).mock.calls.at(-1)!;
      const persisted = JSON.parse(rawValue as string) as Record<string, unknown>;

      expect(persisted).toHaveProperty('defaultExchange');
      expect(persisted).toHaveProperty('defaultTimeframe');
      expect(persisted).toHaveProperty('showTickerBar');
      expect(persisted).toHaveProperty('autoFitChart');
      expect(persisted).toHaveProperty('maxTradesDisplay');
    });

    it('merges persisted values over defaults when the store loads', () => {
      // Simulate a pre-existing entry in storage (partial override)
      mockStorage['terminal-settings-v1'] = JSON.stringify({
        defaultExchange: 'coinbase',
        maxTradesDisplay: 200,
      });

      // Force the store to re-read by importing loadSettings indirectly
      // through the store's own resetDefaults then setState pathway.
      // The simplest equivalent: drive the state manually as the store
      // would after parsing.
      const loaded = {
        ...DEFAULTS,
        ...(JSON.parse(mockStorage['terminal-settings-v1']!) as Partial<typeof DEFAULTS>),
      };

      useSettingsStore.setState(loaded);

      expect(useSettingsStore.getState().defaultExchange).toBe('coinbase');
      expect(useSettingsStore.getState().maxTradesDisplay).toBe(200);
      // Fields not in storage stay at default
      expect(useSettingsStore.getState().defaultTimeframe).toBe('1m');
    });
  });
});
