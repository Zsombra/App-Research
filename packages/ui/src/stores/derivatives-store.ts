import { create } from 'zustand';
import type { LiquidationEvent, OpenInterestPoint } from '@terminal/types';

/** Maximum number of recent liquidation events kept per symbol. */
const MAX_LIQUIDATIONS = 200;

/** Maximum number of open interest data points kept per symbol. */
const MAX_OI_POINTS = 500;

export interface DerivativesState {
  /** Recent liquidation events per symbol */
  liquidations: Map<string, LiquidationEvent[]>;
  /** Historical open interest data per symbol */
  openInterestHistory: Map<string, OpenInterestPoint[]>;
  /** Latest OI value per symbol */
  currentOI: Map<string, number>;
  /** Current funding rate per symbol */
  fundingRates: Map<string, number>;

  /** Add a liquidation event */
  addLiquidation: (event: LiquidationEvent) => void;
  /** Update open interest for a symbol */
  updateOpenInterest: (symbol: string, oi: number, timestamp: number) => void;
  /** Update funding rate */
  updateFundingRate: (symbol: string, rate: number) => void;
}

export const useDerivativesStore = create<DerivativesState>((set) => ({
  liquidations: new Map(),
  openInterestHistory: new Map(),
  currentOI: new Map(),
  fundingRates: new Map(),

  addLiquidation: (event) => {
    set((state) => {
      const liquidations = new Map(state.liquidations);
      const existing = liquidations.get(event.symbol) ?? [];
      const updated = [event, ...existing].slice(0, MAX_LIQUIDATIONS);
      liquidations.set(event.symbol, updated);
      return { liquidations };
    });
  },

  updateOpenInterest: (symbol, oi, timestamp) => {
    set((state) => {
      const currentOI = new Map(state.currentOI);
      const prevOI = currentOI.get(symbol) ?? oi;
      currentOI.set(symbol, oi);

      const openInterestHistory = new Map(state.openInterestHistory);
      const existing = openInterestHistory.get(symbol) ?? [];
      const history = [...existing, {
        timestamp,
        openInterest: oi,
        change: oi - prevOI,
      }];
      const trimmed = history.length > MAX_OI_POINTS
        ? history.slice(-MAX_OI_POINTS)
        : history;
      openInterestHistory.set(symbol, trimmed);

      return { currentOI, openInterestHistory };
    });
  },

  updateFundingRate: (symbol, rate) => {
    set((state) => {
      const fundingRates = new Map(state.fundingRates);
      fundingRates.set(symbol, rate);
      return { fundingRates };
    });
  },
}));

// --- Selectors ---

export function useLiquidations(symbol: string): LiquidationEvent[] {
  return useDerivativesStore((s) => s.liquidations.get(symbol) ?? []);
}

export function useOpenInterestHistory(symbol: string): OpenInterestPoint[] {
  return useDerivativesStore((s) => s.openInterestHistory.get(symbol) ?? []);
}

export function useCurrentOI(symbol: string): number {
  return useDerivativesStore((s) => s.currentOI.get(symbol) ?? 0);
}

export function useFundingRate(symbol: string): number {
  return useDerivativesStore((s) => s.fundingRates.get(symbol) ?? 0);
}
