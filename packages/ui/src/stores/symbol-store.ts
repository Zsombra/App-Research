import { create } from 'zustand';
import type { ExchangeId, SubscriptionTopic } from '@terminal/types';
import { getWorkerBridge } from '../worker/worker-bridge.js';

/** Default symbols shown in the watchlist. */
export const DEFAULT_WATCHLIST: string[] = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'XRP/USDT',
];

export interface SymbolState {
  /** Currently active symbol displayed across linked panels */
  activeSymbol: string;
  /** Watchlist symbols */
  watchlist: string[];
  /** Which symbols are currently subscribed to the data feed */
  subscribedSymbols: Set<string>;

  // Actions
  setActiveSymbol: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  subscribeSymbol: (symbol: string, exchanges: ExchangeId[], topics: SubscriptionTopic[]) => void;
  unsubscribeSymbol: (symbol: string) => void;
}

export const useSymbolStore = create<SymbolState>((set, get) => ({
  activeSymbol: 'BTC/USDT',
  watchlist: DEFAULT_WATCHLIST,
  subscribedSymbols: new Set(),

  setActiveSymbol: (symbol) => {
    const state = get();
    if (symbol === state.activeSymbol) return;

    set({ activeSymbol: symbol });

    // Auto-subscribe if not already subscribed
    if (!state.subscribedSymbols.has(symbol)) {
      state.subscribeSymbol(symbol, ['simulated'], ['trades', 'orderbook', 'ticker']);
    }
  },

  addToWatchlist: (symbol) => {
    set((state) => {
      if (state.watchlist.includes(symbol)) return {};
      return { watchlist: [...state.watchlist, symbol] };
    });
  },

  removeFromWatchlist: (symbol) => {
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== symbol),
    }));
  },

  subscribeSymbol: (symbol, exchanges, topics) => {
    const bridge = getWorkerBridge();
    bridge.send({ type: 'subscribe', symbol, exchanges, topics });
    set((state) => {
      const subscribedSymbols = new Set(state.subscribedSymbols);
      subscribedSymbols.add(symbol);
      return { subscribedSymbols };
    });
  },

  unsubscribeSymbol: (symbol) => {
    const bridge = getWorkerBridge();
    bridge.send({ type: 'unsubscribe', symbol });
    set((state) => {
      const subscribedSymbols = new Set(state.subscribedSymbols);
      subscribedSymbols.delete(symbol);
      return { subscribedSymbols };
    });
  },
}));

// --- Selectors ---

export function useActiveSymbol(): string {
  return useSymbolStore((state) => state.activeSymbol);
}

export function useWatchlist(): string[] {
  return useSymbolStore((state) => state.watchlist);
}
