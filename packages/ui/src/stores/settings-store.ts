import { create } from 'zustand';
import type { ExchangeId, CandleTimeframe } from '@terminal/types';

const STORAGE_KEY = 'terminal-settings-v1';

export interface AppSettings {
  /** Default exchange for new subscriptions. */
  defaultExchange: ExchangeId;
  /** Default timeframe for new charts. */
  defaultTimeframe: CandleTimeframe;
  /** Whether to show the ticker bar. */
  showTickerBar: boolean;
  /** Whether to auto-fit chart on new data. */
  autoFitChart: boolean;
  /** Max trades to display in T&S panel. */
  maxTradesDisplay: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultExchange: 'simulated',
  defaultTimeframe: '1m',
  showTickerBar: true,
  autoFitChart: true,
  maxTradesDisplay: 100,
};

interface SettingsState extends AppSettings {
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetDefaults: () => void;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) as Partial<AppSettings> };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadSettings(),

  updateSetting: (key, value) => {
    set((state) => {
      const updated = { ...state, [key]: value };
      persistSettings({
        defaultExchange: updated.defaultExchange,
        defaultTimeframe: updated.defaultTimeframe,
        showTickerBar: updated.showTickerBar,
        autoFitChart: updated.autoFitChart,
        maxTradesDisplay: updated.maxTradesDisplay,
      });
      return { [key]: value };
    });
  },

  resetDefaults: () => {
    persistSettings(DEFAULT_SETTINGS);
    set(DEFAULT_SETTINGS);
  },
}));

// --- Selectors ---

export function useDefaultExchange(): ExchangeId {
  return useSettingsStore((s) => s.defaultExchange);
}

export function useDefaultTimeframe(): CandleTimeframe {
  return useSettingsStore((s) => s.defaultTimeframe);
}
