import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CustomScript, OHLCVCandle } from '@terminal/types';
import { useScriptStore } from '../stores/script-store.js';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
});

function makeScript(overrides: Partial<CustomScript> = {}): CustomScript {
  return {
    id: `script-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Script',
    source: 'plot(candles.close);',
    type: 'indicator',
    enabled: true,
    color: '#FFD700',
    lastError: null,
    lastModified: Date.now(),
    ...overrides,
  };
}

function makeCandle(close: number, timestamp: number): OHLCVCandle {
  return {
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m',
    timestamp,
    open: close,
    high: close + 5,
    low: close - 5,
    close,
    volume: 100,
    buyVolume: 50,
    sellVolume: 50,
    tradeCount: 10,
    closed: true,
  };
}

function makeCandles(count: number): OHLCVCandle[] {
  const base = 1700000000000;
  return Array.from({ length: count }, (_, i) =>
    makeCandle(100 + i, base + i * 60_000)
  );
}

describe('useScriptStore', () => {
  beforeEach(() => {
    // Clear localStorage mock
    for (const key of Object.keys(store)) delete store[key];
    // Reset store
    useScriptStore.setState({
      scripts: new Map(),
      results: new Map(),
    });
  });

  describe('saveScript', () => {
    it('should add a new script', () => {
      const script = makeScript({ id: 'test-1', name: 'My Script' });
      useScriptStore.getState().saveScript(script);

      const scripts = useScriptStore.getState().scripts;
      expect(scripts.has('test-1')).toBe(true);
      expect(scripts.get('test-1')!.name).toBe('My Script');
    });

    it('should update an existing script', () => {
      const script = makeScript({ id: 'test-1', name: 'V1' });
      useScriptStore.getState().saveScript(script);
      useScriptStore.getState().saveScript({ ...script, name: 'V2' });

      expect(useScriptStore.getState().scripts.get('test-1')!.name).toBe('V2');
      expect(useScriptStore.getState().scripts.size).toBe(1);
    });

    it('should set lastModified to current time', () => {
      const before = Date.now();
      const script = makeScript({ id: 'test-1', lastModified: 0 });
      useScriptStore.getState().saveScript(script);

      const saved = useScriptStore.getState().scripts.get('test-1')!;
      expect(saved.lastModified).toBeGreaterThanOrEqual(before);
    });

    it('should persist to localStorage', () => {
      const script = makeScript({ id: 'test-1' });
      useScriptStore.getState().saveScript(script);

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('removeScript', () => {
    it('should remove a script', () => {
      const script = makeScript({ id: 'test-1' });
      useScriptStore.getState().saveScript(script);
      useScriptStore.getState().removeScript('test-1');

      expect(useScriptStore.getState().scripts.has('test-1')).toBe(false);
    });

    it('should also remove results for the script', () => {
      const script = makeScript({ id: 'test-1', source: 'plot(candles.close);' });
      useScriptStore.getState().saveScript(script);
      useScriptStore.getState().executeAll(makeCandles(5), 'BTC/USDT');

      expect(useScriptStore.getState().results.has('test-1')).toBe(true);

      useScriptStore.getState().removeScript('test-1');
      expect(useScriptStore.getState().results.has('test-1')).toBe(false);
    });

    it('should not affect other scripts', () => {
      useScriptStore.getState().saveScript(makeScript({ id: 's1' }));
      useScriptStore.getState().saveScript(makeScript({ id: 's2' }));
      useScriptStore.getState().removeScript('s1');

      expect(useScriptStore.getState().scripts.has('s1')).toBe(false);
      expect(useScriptStore.getState().scripts.has('s2')).toBe(true);
    });
  });

  describe('toggleScript', () => {
    it('should toggle enabled state', () => {
      useScriptStore.getState().saveScript(makeScript({ id: 'test-1', enabled: true }));
      useScriptStore.getState().toggleScript('test-1');
      expect(useScriptStore.getState().scripts.get('test-1')!.enabled).toBe(false);

      useScriptStore.getState().toggleScript('test-1');
      expect(useScriptStore.getState().scripts.get('test-1')!.enabled).toBe(true);
    });

    it('should be a no-op for unknown id', () => {
      useScriptStore.getState().saveScript(makeScript({ id: 'test-1' }));
      useScriptStore.getState().toggleScript('unknown');
      // No error, original script unchanged
      expect(useScriptStore.getState().scripts.get('test-1')!.enabled).toBe(true);
    });

    it('should persist the toggle', () => {
      useScriptStore.getState().saveScript(makeScript({ id: 'test-1' }));
      vi.mocked(localStorage.setItem).mockClear();
      useScriptStore.getState().toggleScript('test-1');
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('executeAll', () => {
    it('should execute enabled scripts and store results', () => {
      useScriptStore.getState().saveScript(makeScript({
        id: 'test-1',
        enabled: true,
        source: 'plot(candles.close);',
      }));

      useScriptStore.getState().executeAll(makeCandles(5), 'BTC/USDT');

      const result = useScriptStore.getState().results.get('test-1');
      expect(result).toBeDefined();
      expect(result!.error).toBeNull();
      expect(result!.plots.length).toBeGreaterThan(0);
    });

    it('should skip disabled scripts', () => {
      useScriptStore.getState().saveScript(makeScript({
        id: 'test-1',
        enabled: false,
        source: 'plot(candles.close);',
      }));

      useScriptStore.getState().executeAll(makeCandles(5), 'BTC/USDT');

      expect(useScriptStore.getState().results.has('test-1')).toBe(false);
    });

    it('should capture errors from bad scripts', () => {
      useScriptStore.getState().saveScript(makeScript({
        id: 'test-1',
        enabled: true,
        source: 'throw new Error("boom");',
      }));

      useScriptStore.getState().executeAll(makeCandles(5), 'BTC/USDT');

      const result = useScriptStore.getState().results.get('test-1');
      expect(result).toBeDefined();
      expect(result!.error).not.toBeNull();
    });

    it('should update lastError on the script when execution fails', () => {
      useScriptStore.getState().saveScript(makeScript({
        id: 'test-1',
        enabled: true,
        source: 'throw new Error("broken");',
        lastError: null,
      }));

      useScriptStore.getState().executeAll(makeCandles(5), 'BTC/USDT');

      const script = useScriptStore.getState().scripts.get('test-1')!;
      expect(script.lastError).not.toBeNull();
    });

    it('should execute multiple enabled scripts independently', () => {
      useScriptStore.getState().saveScript(makeScript({
        id: 's1',
        enabled: true,
        source: 'plot(candles.close);',
      }));
      useScriptStore.getState().saveScript(makeScript({
        id: 's2',
        enabled: true,
        source: 'plot(candles.high);',
      }));
      useScriptStore.getState().saveScript(makeScript({
        id: 's3',
        enabled: false,
        source: 'plot(candles.low);',
      }));

      useScriptStore.getState().executeAll(makeCandles(5), 'BTC/USDT');

      const results = useScriptStore.getState().results;
      expect(results.has('s1')).toBe(true);
      expect(results.has('s2')).toBe(true);
      expect(results.has('s3')).toBe(false);
    });
  });
});
