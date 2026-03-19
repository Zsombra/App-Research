import { create } from 'zustand';
import type {
  IndicatorConfig,
  IndicatorSeries,
  IndicatorKind,
  OHLCVCandle,
} from '@terminal/types';
import { INDICATOR_DEFAULTS, INDICATOR_COLORS } from '@terminal/types';
import { computeIndicator } from '@terminal/core';

const OVERLAY_KINDS: ReadonlySet<string> = new Set(['sma', 'ema', 'bollinger', 'vwap', 'vwap-anchored', 'vwap-rolling']);
const SEPARATE_KINDS: ReadonlySet<string> = new Set(['rsi', 'macd', 'cvd']);

let idCounter = 0;

export interface IndicatorState {
  /** Active indicator configurations keyed by id. */
  indicators: Map<string, IndicatorConfig>;
  /** Computed indicator series keyed by indicator id. */
  series: Map<string, IndicatorSeries>;

  addIndicator: (kind: IndicatorKind, paramsOverride?: Record<string, number>) => string;
  removeIndicator: (id: string) => void;
  updateParams: (id: string, params: Readonly<Record<string, number>>) => void;
  recompute: (symbol: string, candles: readonly OHLCVCandle[]) => void;
}

export const useIndicatorStore = create<IndicatorState>((set, get) => ({
  indicators: new Map(),
  series: new Map(),

  addIndicator: (kind, paramsOverride) => {
    const id = `${kind}-${++idCounter}`;
    const params = { ...INDICATOR_DEFAULTS[kind], ...paramsOverride };
    const colorIndex = get().indicators.size % INDICATOR_COLORS.length;
    const color = INDICATOR_COLORS[colorIndex] ?? '#FFD700';
    const config: IndicatorConfig = { id, kind, params, color };

    set((state) => {
      const indicators = new Map(state.indicators);
      indicators.set(id, config);
      return { indicators };
    });

    return id;
  },

  removeIndicator: (id) => {
    set((state) => {
      const indicators = new Map(state.indicators);
      const series = new Map(state.series);
      indicators.delete(id);
      series.delete(id);
      return { indicators, series };
    });
  },

  updateParams: (id, params) => {
    set((state) => {
      const indicators = new Map(state.indicators);
      const existing = indicators.get(id);
      if (!existing) return state;
      indicators.set(id, { ...existing, params: { ...existing.params, ...params } });
      return { indicators };
    });
  },

  recompute: (_symbol, candles) => {
    const { indicators } = get();
    if (indicators.size === 0 || candles.length === 0) return;

    const series = new Map<string, IndicatorSeries>();

    for (const [id, config] of indicators) {
      const points = computeIndicator(config.kind, candles, config.params);
      series.set(id, {
        kind: config.kind,
        id,
        params: config.params,
        points,
      } as IndicatorSeries);
    }

    set({ series });
  },
}));

// --- Selectors ---

export function useIndicatorConfigs(): IndicatorConfig[] {
  return useIndicatorStore((state) => [...state.indicators.values()]);
}

export function useOverlaySeries(): IndicatorSeries[] {
  return useIndicatorStore((state) => {
    const overlay: IndicatorSeries[] = [];
    for (const s of state.series.values()) {
      if (OVERLAY_KINDS.has(s.kind)) {
        overlay.push(s);
      }
    }
    return overlay;
  });
}

export function useSeparateSeries(): IndicatorSeries[] {
  return useIndicatorStore((state) => {
    const separate: IndicatorSeries[] = [];
    for (const s of state.series.values()) {
      if (SEPARATE_KINDS.has(s.kind)) {
        separate.push(s);
      }
    }
    return separate;
  });
}
