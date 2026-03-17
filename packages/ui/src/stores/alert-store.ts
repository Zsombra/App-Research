import { create } from 'zustand';
import { useMarketStore } from './market-store.js';

export type AlertCondition = 'above' | 'below';

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

export interface AlertState {
  alerts: PriceAlert[];
  addAlert: (symbol: string, condition: AlertCondition, targetPrice: number) => void;
  removeAlert: (id: string) => void;
  clearTriggered: () => void;
  checkAlerts: () => void;
}

let nextId = 1;

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],

  addAlert: (symbol, condition, targetPrice) => {
    const alert: PriceAlert = {
      id: `alert-${nextId++}`,
      symbol,
      condition,
      targetPrice,
      createdAt: Date.now(),
      triggered: false,
    };
    set((state) => ({ alerts: [...state.alerts, alert] }));
  },

  removeAlert: (id) => {
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
  },

  clearTriggered: () => {
    set((state) => ({ alerts: state.alerts.filter((a) => !a.triggered) }));
  },

  checkAlerts: () => {
    const { alerts } = get();
    const { tickers } = useMarketStore.getState();

    const now = Date.now();
    let changed = false;

    const updated = alerts.map((alert) => {
      if (alert.triggered) return alert;
      const ticker = tickers.get(alert.symbol);
      if (!ticker) return alert;

      const price = ticker.lastPrice;
      const fired =
        (alert.condition === 'above' && price >= alert.targetPrice) ||
        (alert.condition === 'below' && price <= alert.targetPrice);

      if (fired) {
        changed = true;
        return { ...alert, triggered: true, triggeredAt: now };
      }
      return alert;
    });

    if (changed) {
      set({ alerts: updated });
    }
  },
}));

/**
 * Start a periodic alert checker. Returns cleanup function.
 * Check every 500ms — lightweight since it only reads from stores.
 */
export function startAlertChecker(): () => void {
  const interval = setInterval(() => {
    useAlertStore.getState().checkAlerts();
  }, 500);
  return () => clearInterval(interval);
}
