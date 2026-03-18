import { create } from 'zustand';
import type { FootprintCandle, FootprintConfig, OHLCVCandle } from '@terminal/types';
import { DEFAULT_FOOTPRINT_CONFIG } from '@terminal/types';
import { buildFootprintFromCandles, autoTickSize } from '@terminal/core';

export interface FootprintState {
  /** Whether footprint mode is enabled */
  enabled: boolean;
  /** Footprint configuration */
  config: FootprintConfig;
  /** Computed footprint candles per symbol */
  footprints: Map<string, FootprintCandle[]>;

  /** Toggle footprint mode on/off */
  setEnabled: (enabled: boolean) => void;
  /** Update footprint config */
  updateConfig: <K extends keyof FootprintConfig>(key: K, value: FootprintConfig[K]) => void;
  /** Recompute footprints from candles (called when candles update) */
  recompute: (symbol: string, candles: OHLCVCandle[]) => void;
}

export const useFootprintStore = create<FootprintState>((set, get) => ({
  enabled: false,
  config: { ...DEFAULT_FOOTPRINT_CONFIG },
  footprints: new Map(),

  setEnabled: (enabled) => {
    set({ enabled });
  },

  updateConfig: (key, value) => {
    set((state) => ({
      config: { ...state.config, [key]: value },
    }));
  },

  recompute: (symbol, candles) => {
    const state = get();
    if (!state.enabled || candles.length === 0) return;

    // Auto-detect tick size if not set or still default
    const tickSize = state.config.tickSize > 0
      ? state.config.tickSize
      : autoTickSize(candles);

    const fpCandles = buildFootprintFromCandles(candles, tickSize);

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
