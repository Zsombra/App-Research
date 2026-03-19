import { create } from 'zustand';
import type {
  SLTPHeatmap,
  SLTPConfig,
  OHLCVCandle,
  EstimatedPosition,
} from '@terminal/types';
import { DEFAULT_SLTP_CONFIG } from '@terminal/types';
import { computeSLTPHeatmap } from '@terminal/core';

export interface SLTPHeatmapState {
  /** Whether SL/TP heatmap is enabled */
  enabled: boolean;
  /** Configuration */
  config: SLTPConfig;
  /** Computed heatmaps per symbol */
  heatmaps: Map<string, SLTPHeatmap>;
  /** Known positions per symbol (optional, improves accuracy) */
  positions: Map<string, EstimatedPosition[]>;

  setEnabled: (enabled: boolean) => void;
  updateConfig: <K extends keyof SLTPConfig>(key: K, value: SLTPConfig[K]) => void;
  setPositions: (symbol: string, positions: EstimatedPosition[]) => void;
  recompute: (symbol: string, candles: OHLCVCandle[]) => void;
  /** Clear all SL/TP data for a symbol (e.g. on unsubscribe) */
  clearSymbol: (symbol: string) => void;
}

export const useSLTPHeatmapStore = create<SLTPHeatmapState>((set, get) => ({
  enabled: false,
  config: { ...DEFAULT_SLTP_CONFIG },
  heatmaps: new Map(),
  positions: new Map(),

  setEnabled: (enabled) => set({ enabled }),

  updateConfig: (key, value) => {
    set((state) => ({
      config: { ...state.config, [key]: value },
    }));
  },

  setPositions: (symbol, positions) => {
    set((prev) => {
      const map = new Map(prev.positions);
      map.set(symbol, positions);
      return { positions: map };
    });
  },

  recompute: (symbol, candles) => {
    const state = get();
    if (!state.enabled || candles.length === 0) return;

    const positions = state.positions.get(symbol);
    const heatmap = computeSLTPHeatmap(candles, state.config, positions);

    set((prev) => {
      const heatmaps = new Map(prev.heatmaps);
      heatmaps.set(symbol, heatmap);
      return { heatmaps };
    });
  },

  clearSymbol: (symbol) => {
    set((state) => {
      const heatmaps = new Map(state.heatmaps);
      const positions = new Map(state.positions);
      heatmaps.delete(symbol);
      positions.delete(symbol);
      return { heatmaps, positions };
    });
  },
}));

// Selectors
export function useSLTPHeatmapEnabled(): boolean {
  return useSLTPHeatmapStore((s) => s.enabled);
}

export function useSLTPHeatmap(symbol: string): SLTPHeatmap | undefined {
  return useSLTPHeatmapStore((s) => s.heatmaps.get(symbol));
}

export function useSLClusters(symbol: string) {
  return useSLTPHeatmapStore((s) => s.heatmaps.get(symbol)?.slClusters ?? []);
}

export function useTPClusters(symbol: string) {
  return useSLTPHeatmapStore((s) => s.heatmaps.get(symbol)?.tpClusters ?? []);
}
