import { create } from 'zustand';
import type { HeatmapColumn, HeatmapConfig, OrderbookSnapshot } from '@terminal/types';
import { DEFAULT_HEATMAP_CONFIG } from '@terminal/types';

export interface HeatmapState {
  /** Whether heatmap mode is enabled */
  enabled: boolean;
  /** Heatmap configuration */
  config: HeatmapConfig;
  /** Historical heatmap columns per symbol */
  columns: Map<string, HeatmapColumn[]>;
  /** Global max liquidity (for normalization) per symbol */
  maxLiquidity: Map<string, number>;

  /** Toggle heatmap on/off */
  setEnabled: (enabled: boolean) => void;
  /** Capture an orderbook snapshot as a new heatmap column */
  captureSnapshot: (symbol: string, snapshot: Readonly<OrderbookSnapshot>) => void;
  /** Update config */
  updateConfig: <K extends keyof HeatmapConfig>(key: K, value: HeatmapConfig[K]) => void;
  /** Clear all heatmap data for a symbol (e.g. on unsubscribe) */
  clearSymbol: (symbol: string) => void;
}

export const useHeatmapStore = create<HeatmapState>((set, get) => ({
  enabled: false,
  config: { ...DEFAULT_HEATMAP_CONFIG },
  columns: new Map(),
  maxLiquidity: new Map(),

  setEnabled: (enabled) => {
    set({ enabled });
  },

  captureSnapshot: (symbol, snapshot) => {
    const state = get();
    if (!state.enabled) return;

    const depthLevels = state.config.depthLevels;
    const bids = new Map<number, number>();
    const asks = new Map<number, number>();

    // Capture top N bid levels
    const bidSlice = snapshot.bids.slice(0, depthLevels);
    for (const level of bidSlice) {
      if (level.size > 0) bids.set(level.price, level.size);
    }

    // Capture top N ask levels
    const askSlice = snapshot.asks.slice(0, depthLevels);
    for (const level of askSlice) {
      if (level.size > 0) asks.set(level.price, level.size);
    }

    const column: HeatmapColumn = {
      timestamp: snapshot.timestamp,
      bids,
      asks,
    };

    set((prev) => {
      const columns = new Map(prev.columns);
      const existing = columns.get(symbol) ?? [];

      // Check capture interval - skip if too close to last column
      const lastTs = existing.length > 0 ? (existing[existing.length - 1] as HeatmapColumn).timestamp : 0;
      if (snapshot.timestamp - lastTs < prev.config.captureIntervalMs) {
        return {};
      }

      // Trim old columns using slice for immutability
      const appended = [...existing, column];
      const updated = appended.length > prev.config.maxColumns
        ? appended.slice(-prev.config.maxColumns)
        : appended;
      columns.set(symbol, updated);

      // Update max liquidity for normalization
      const maxLiquidity = new Map(prev.maxLiquidity);
      let max = maxLiquidity.get(symbol) ?? 0;
      for (const [, size] of bids) {
        if (size > max) max = size;
      }
      for (const [, size] of asks) {
        if (size > max) max = size;
      }
      maxLiquidity.set(symbol, max);

      return { columns, maxLiquidity };
    });
  },

  updateConfig: (key, value) => {
    set((state) => ({
      config: { ...state.config, [key]: value },
    }));
  },

  clearSymbol: (symbol) => {
    set((state) => {
      const columns = new Map(state.columns);
      const maxLiquidity = new Map(state.maxLiquidity);
      columns.delete(symbol);
      maxLiquidity.delete(symbol);
      return { columns, maxLiquidity };
    });
  },
}));

// --- Selectors ---

export function useHeatmapEnabled(): boolean {
  return useHeatmapStore((s) => s.enabled);
}

export function useHeatmapColumns(symbol: string): HeatmapColumn[] {
  return useHeatmapStore((s) => s.columns.get(symbol) ?? []);
}

export function useHeatmapMaxLiquidity(symbol: string): number {
  return useHeatmapStore((s) => s.maxLiquidity.get(symbol) ?? 1);
}
