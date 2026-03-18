import { create } from 'zustand';
import type { FootprintCandle, FootprintConfig, FootprintFilter, FootprintDisplayConfig, FootprintDisplayMode, OHLCVCandle } from '@terminal/types';
import { DEFAULT_FOOTPRINT_CONFIG, DEFAULT_FOOTPRINT_DISPLAY_CONFIG } from '@terminal/types';
import { buildFootprintFromCandles, autoTickSize, filterFootprintLevels } from '@terminal/core';

export interface FootprintState {
  /** Whether footprint mode is enabled */
  enabled: boolean;
  /** Footprint configuration */
  config: FootprintConfig;
  /** Display configuration (mode, labels, imbalances, etc.) */
  displayConfig: FootprintDisplayConfig;
  /** Computed footprint candles per symbol (after filtering) */
  footprints: Map<string, FootprintCandle[]>;

  /** Toggle footprint mode on/off */
  setEnabled: (enabled: boolean) => void;
  /** Update footprint config */
  updateConfig: <K extends keyof FootprintConfig>(key: K, value: FootprintConfig[K]) => void;
  /** Update filter settings */
  updateFilter: <K extends keyof FootprintFilter>(key: K, value: FootprintFilter[K]) => void;
  /** Update display config */
  updateDisplayConfig: <K extends keyof FootprintDisplayConfig>(key: K, value: FootprintDisplayConfig[K]) => void;
  /** Set display mode shorthand */
  setDisplayMode: (mode: FootprintDisplayMode) => void;
  /** Recompute footprints from candles (called when candles update) */
  recompute: (symbol: string, candles: OHLCVCandle[]) => void;
}

export const useFootprintStore = create<FootprintState>((set, get) => ({
  enabled: false,
  config: { ...DEFAULT_FOOTPRINT_CONFIG },
  displayConfig: { ...DEFAULT_FOOTPRINT_DISPLAY_CONFIG },
  footprints: new Map(),

  setEnabled: (enabled) => {
    set({ enabled });
  },

  updateConfig: (key, value) => {
    set((state) => ({
      config: { ...state.config, [key]: value },
    }));
  },

  updateFilter: (key, value) => {
    set((state) => ({
      config: {
        ...state.config,
        filter: { ...state.config.filter, [key]: value },
      },
    }));
  },

  updateDisplayConfig: (key, value) => {
    set((state) => ({
      displayConfig: { ...state.displayConfig, [key]: value },
    }));
  },

  setDisplayMode: (mode) => {
    set((state) => ({
      displayConfig: { ...state.displayConfig, mode },
    }));
  },

  recompute: (symbol, candles) => {
    const state = get();
    if (!state.enabled || candles.length === 0) return;

    // Auto-detect tick size if not set or still default
    const tickSize = state.config.tickSize > 0
      ? state.config.tickSize
      : autoTickSize(candles);

    let fpCandles = buildFootprintFromCandles(candles, tickSize);

    // Apply footprint filter
    if (state.config.filter.mode !== 'none') {
      fpCandles = filterFootprintLevels(fpCandles, state.config.filter);
    }

    set((prev) => {
      const footprints = new Map(prev.footprints);
      footprints.set(symbol, fpCandles);
      return { footprints };
    });
  },
}));

// --- Selectors ---

export function useFootprintEnabled(): boolean {
  return useFootprintStore((s) => s.enabled);
}

export function useFootprints(symbol: string): FootprintCandle[] {
  return useFootprintStore((s) => s.footprints.get(symbol) ?? []);
}

export function useFootprintConfig(): FootprintConfig {
  return useFootprintStore((s) => s.config);
}

export function useFootprintDisplayConfig(): FootprintDisplayConfig {
  return useFootprintStore((s) => s.displayConfig);
}

export function useFootprintDisplayMode(): FootprintDisplayMode {
  return useFootprintStore((s) => s.displayConfig.mode);
}
