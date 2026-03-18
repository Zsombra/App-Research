import { create } from 'zustand';
import type { CustomScript, ScriptResult } from '@terminal/types';
import { executeScript } from '@terminal/core';
import type { OHLCVCandle } from '@terminal/types';

const STORAGE_KEY = 'terminal-scripts-v1';

export interface ScriptState {
  /** All custom scripts */
  scripts: Map<string, CustomScript>;
  /** Latest execution results per script ID */
  results: Map<string, ScriptResult>;

  /** Add or update a script */
  saveScript: (script: CustomScript) => void;
  /** Remove a script */
  removeScript: (id: string) => void;
  /** Toggle a script's enabled state */
  toggleScript: (id: string) => void;
  /** Execute all enabled scripts against candle data */
  executeAll: (candles: OHLCVCandle[], symbol: string) => void;
}

function loadScripts(): Map<string, CustomScript> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as CustomScript[];
    return new Map(arr.map((s) => [s.id, s]));
  } catch (err) {
    console.warn('[script-store] Failed to load scripts:', err);
    return new Map();
  }
}

function persistScripts(scripts: Map<string, CustomScript>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...scripts.values()]));
  } catch (err) {
    console.warn('[script-store] Failed to persist scripts:', err);
  }
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: loadScripts(),
  results: new Map(),

  saveScript: (script) => {
    set((state) => {
      const scripts = new Map(state.scripts);
      scripts.set(script.id, { ...script, lastModified: Date.now() });
      persistScripts(scripts);
      return { scripts };
    });
  },

  removeScript: (id) => {
    set((state) => {
      const scripts = new Map(state.scripts);
      scripts.delete(id);
      persistScripts(scripts);
      const results = new Map(state.results);
      results.delete(id);
      return { scripts, results };
    });
  },

  toggleScript: (id) => {
    set((state) => {
      const scripts = new Map(state.scripts);
      const script = scripts.get(id);
      if (script) {
        scripts.set(id, { ...script, enabled: !script.enabled });
        persistScripts(scripts);
      }
      return { scripts };
    });
  },

  executeAll: (candles, symbol) => {
    const state = get();
    const results = new Map<string, ScriptResult>();

    for (const [id, script] of state.scripts) {
      if (!script.enabled) continue;

      const result = executeScript(script.source, candles, symbol);
      results.set(id, result);

      // Update lastError on script
      if (result.error !== script.lastError) {
        set((prev) => {
          const scripts = new Map(prev.scripts);
          const s = scripts.get(id);
          if (s) {
            scripts.set(id, { ...s, lastError: result.error });
          }
          return { scripts };
        });
      }
    }

    set({ results });
  },
}));

// --- Selectors ---

export function useScripts(): CustomScript[] {
  return useScriptStore((s) => [...s.scripts.values()]);
}

export function useScriptResult(id: string): ScriptResult | undefined {
  return useScriptStore((s) => s.results.get(id));
}

export function useEnabledScriptPlots(): { id: string; color: string; result: ScriptResult }[] {
  return useScriptStore((s) => {
    const plots: { id: string; color: string; result: ScriptResult }[] = [];
    for (const [id, script] of s.scripts) {
      if (!script.enabled) continue;
      const result = s.results.get(id);
      if (result && result.plots.length > 0) {
        plots.push({ id, color: script.color, result });
      }
    }
    return plots;
  });
}
