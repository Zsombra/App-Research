import { create } from 'zustand';
import type {
  LiquidationEvent,
  LiquidationHeatmap,
  LiquidationHeatmapConfig,
} from '@terminal/types';
import { DEFAULT_LIQUIDATION_HEATMAP_CONFIG, buildLiquidationHeatmap } from '@terminal/types';

export interface LiquidationHeatmapState {
  /** Whether liquidation heatmap is enabled */
  enabled: boolean;
  /** Configuration */
  config: LiquidationHeatmapConfig;
  /** Raw liquidation events per symbol */
  events: Map<string, LiquidationEvent[]>;
  /** Computed heatmap per symbol */
  heatmaps: Map<string, LiquidationHeatmap>;

  setEnabled: (enabled: boolean) => void;
  addLiquidation: (event: LiquidationEvent) => void;
  recompute: (symbol: string) => void;
}

export const useLiquidationHeatmapStore = create<LiquidationHeatmapState>((set, get) => ({
  enabled: false,
  config: { ...DEFAULT_LIQUIDATION_HEATMAP_CONFIG },
  events: new Map(),
  heatmaps: new Map(),

  setEnabled: (enabled) => set({ enabled }),

  addLiquidation: (event) => {
    const state = get();
    const events = new Map(state.events);
    const symbolEvents = [...(events.get(event.symbol) ?? []), event];

    // Trim to max events
    if (symbolEvents.length > state.config.maxEvents) {
      symbolEvents.splice(0, symbolEvents.length - state.config.maxEvents);
    }

    events.set(event.symbol, symbolEvents);
    set({ events });

    // Auto-recompute if enabled
    if (state.enabled) {
      get().recompute(event.symbol);
    }
  },

  recompute: (symbol) => {
    const state = get();
    const symbolEvents = state.events.get(symbol) ?? [];
    const heatmap = buildLiquidationHeatmap(symbolEvents, state.config);

    set((prev) => {
      const heatmaps = new Map(prev.heatmaps);
      heatmaps.set(symbol, heatmap);
      return { heatmaps };
    });
  },
}));

// Selectors
export function useLiquidationHeatmapEnabled(): boolean {
  return useLiquidationHeatmapStore((s) => s.enabled);
}

export function useLiquidationHeatmap(symbol: string): LiquidationHeatmap | undefined {
  return useLiquidationHeatmapStore((s) => s.heatmaps.get(symbol));
}
