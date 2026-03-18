import { describe, it, expect, beforeEach } from 'vitest';
import { useIndicatorStore } from '../stores/indicator-store.js';
import { INDICATOR_DEFAULTS, INDICATOR_COLORS } from '@terminal/types';
import type { OHLCVCandle } from '@terminal/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandle(
  close: number,
  volume = 100,
  timestamp = Date.now(),
  overrides: Partial<OHLCVCandle> = {}
): OHLCVCandle {
  return {
    exchange: 'test',
    symbol: 'BTC/USDT',
    timeframe: '1m',
    timestamp,
    open: close,
    high: close + 5,
    low: close - 5,
    close,
    volume,
    buyVolume: volume / 2,
    sellVolume: volume / 2,
    tradeCount: 10,
    closed: true,
    ...overrides,
  };
}

/**
 * Build `count` candles with evenly-spaced timestamps and gently rising prices
 * so that indicators with warm-up periods (RSI, MACD, Bollinger) return
 * non-null values by the end of the series.
 */
function makeCandles(count: number): OHLCVCandle[] {
  const base = 1_700_000_000_000;
  return Array.from({ length: count }, (_, i) =>
    makeCandle(100 + i, 100 + i * 10, base + i * 60_000)
  );
}

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useIndicatorStore.setState({
    indicators: new Map(),
    series: new Map(),
  });
});

// ---------------------------------------------------------------------------
// 1. addIndicator returns an id and stores the config
// ---------------------------------------------------------------------------

describe('addIndicator', () => {
  it('returns an id and stores the config', () => {
    const { addIndicator } = useIndicatorStore.getState();
    const id = addIndicator('sma');

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const { indicators } = useIndicatorStore.getState();
    expect(indicators.size).toBe(1);
    expect(indicators.has(id)).toBe(true);

    const config = indicators.get(id)!;
    expect(config.id).toBe(id);
    expect(config.kind).toBe('sma');
  });

  // -------------------------------------------------------------------------
  // 2. addIndicator uses defaults merged with overrides
  // -------------------------------------------------------------------------

  it('uses INDICATOR_DEFAULTS when no override is provided', () => {
    const { addIndicator } = useIndicatorStore.getState();
    const id = addIndicator('sma');

    const config = useIndicatorStore.getState().indicators.get(id)!;
    expect(config.params).toEqual(INDICATOR_DEFAULTS['sma']);
    expect(config.params['period']).toBe(20);
  });

  it('merges paramsOverride on top of defaults', () => {
    const { addIndicator } = useIndicatorStore.getState();
    const id = addIndicator('sma', { period: 50 });

    const config = useIndicatorStore.getState().indicators.get(id)!;
    expect(config.params['period']).toBe(50);
  });

  it('merges partial override without discarding other defaults', () => {
    const { addIndicator } = useIndicatorStore.getState();
    // MACD has three default params; override only one
    const id = addIndicator('macd', { fastPeriod: 5 });

    const config = useIndicatorStore.getState().indicators.get(id)!;
    expect(config.params['fastPeriod']).toBe(5);
    expect(config.params['slowPeriod']).toBe(INDICATOR_DEFAULTS['macd']['slowPeriod']);
    expect(config.params['signalPeriod']).toBe(INDICATOR_DEFAULTS['macd']['signalPeriod']);
  });

  it('preserves empty-param defaults for indicators like cvd and vwap', () => {
    const { addIndicator } = useIndicatorStore.getState();
    const cvdId = addIndicator('cvd');
    const vwapId = addIndicator('vwap');

    const cvdConfig = useIndicatorStore.getState().indicators.get(cvdId)!;
    const vwapConfig = useIndicatorStore.getState().indicators.get(vwapId)!;

    // Both have empty default param objects
    expect(cvdConfig.params).toEqual({});
    expect(vwapConfig.params).toEqual({});
  });

  // -------------------------------------------------------------------------
  // 3. addIndicator assigns cycling colors
  // -------------------------------------------------------------------------

  it('assigns the first color to the first indicator', () => {
    const { addIndicator } = useIndicatorStore.getState();
    const id = addIndicator('sma');

    const config = useIndicatorStore.getState().indicators.get(id)!;
    expect(config.color).toBe(INDICATOR_COLORS[0]);
  });

  it('assigns colors cycling through INDICATOR_COLORS by insertion index', () => {
    const { addIndicator } = useIndicatorStore.getState();

    const ids: string[] = [];
    // Add more indicators than there are colors to verify wrap-around
    const totalToAdd = INDICATOR_COLORS.length + 2;
    for (let i = 0; i < totalToAdd; i++) {
      ids.push(addIndicator('ema'));
    }

    const { indicators } = useIndicatorStore.getState();
    ids.forEach((id, i) => {
      const expectedColor = INDICATOR_COLORS[i % INDICATOR_COLORS.length]!;
      expect(indicators.get(id)!.color).toBe(expectedColor);
    });
  });

  it('id contains the indicator kind', () => {
    const { addIndicator } = useIndicatorStore.getState();

    const smaId = addIndicator('sma');
    const rsiId = addIndicator('rsi');
    const bollingerId = addIndicator('bollinger');

    expect(smaId).toContain('sma');
    expect(rsiId).toContain('rsi');
    expect(bollingerId).toContain('bollinger');
  });

  it('generates unique ids for consecutive calls', () => {
    const { addIndicator } = useIndicatorStore.getState();

    const id1 = addIndicator('sma');
    const id2 = addIndicator('sma');
    const id3 = addIndicator('ema');

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });
});

// ---------------------------------------------------------------------------
// 4. removeIndicator removes config and series
// ---------------------------------------------------------------------------

describe('removeIndicator', () => {
  it('deletes the config from indicators map', () => {
    const { addIndicator, removeIndicator } = useIndicatorStore.getState();
    const id = addIndicator('sma');

    expect(useIndicatorStore.getState().indicators.has(id)).toBe(true);

    removeIndicator(id);

    expect(useIndicatorStore.getState().indicators.has(id)).toBe(false);
    expect(useIndicatorStore.getState().indicators.size).toBe(0);
  });

  it('also removes the corresponding series entry', () => {
    const { addIndicator, removeIndicator, recompute } = useIndicatorStore.getState();
    const id = addIndicator('sma');

    // Produce series so there is something to remove
    recompute('BTC/USDT', makeCandles(30));
    expect(useIndicatorStore.getState().series.has(id)).toBe(true);

    removeIndicator(id);

    expect(useIndicatorStore.getState().series.has(id)).toBe(false);
  });

  it('leaves other indicators untouched', () => {
    const { addIndicator, removeIndicator } = useIndicatorStore.getState();
    const id1 = addIndicator('sma');
    const id2 = addIndicator('ema');

    removeIndicator(id1);

    const { indicators } = useIndicatorStore.getState();
    expect(indicators.has(id1)).toBe(false);
    expect(indicators.has(id2)).toBe(true);
  });

  it('is a no-op when given an unknown id', () => {
    const { addIndicator, removeIndicator } = useIndicatorStore.getState();
    addIndicator('sma');

    // Should not throw and should leave state unchanged
    expect(() => removeIndicator('nonexistent-id')).not.toThrow();
    expect(useIndicatorStore.getState().indicators.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. updateParams updates existing indicator params
// ---------------------------------------------------------------------------

describe('updateParams', () => {
  it('merges new params into the existing config', () => {
    const { addIndicator, updateParams } = useIndicatorStore.getState();
    const id = addIndicator('sma');

    updateParams(id, { period: 50 });

    const config = useIndicatorStore.getState().indicators.get(id)!;
    expect(config.params['period']).toBe(50);
  });

  it('merges without discarding params not mentioned in the update', () => {
    const { addIndicator, updateParams } = useIndicatorStore.getState();
    const id = addIndicator('bollinger');

    // Bollinger defaults: { period: 20, stdDev: 2 }
    updateParams(id, { period: 30 });

    const config = useIndicatorStore.getState().indicators.get(id)!;
    expect(config.params['period']).toBe(30);
    expect(config.params['stdDev']).toBe(INDICATOR_DEFAULTS['bollinger']['stdDev']);
  });

  it('supports adding a brand-new param key via update', () => {
    const { addIndicator, updateParams } = useIndicatorStore.getState();
    const id = addIndicator('sma');

    updateParams(id, { customKey: 99 });

    const config = useIndicatorStore.getState().indicators.get(id)!;
    expect(config.params['customKey']).toBe(99);
    // Original param still present
    expect(config.params['period']).toBe(20);
  });

  it('does not mutate other indicator configs', () => {
    const { addIndicator, updateParams } = useIndicatorStore.getState();
    const id1 = addIndicator('sma');
    const id2 = addIndicator('sma');

    updateParams(id1, { period: 99 });

    expect(useIndicatorStore.getState().indicators.get(id2)!.params['period']).toBe(20);
  });

  // -------------------------------------------------------------------------
  // 6. updateParams is a no-op for an unknown id
  // -------------------------------------------------------------------------

  it('is a no-op for an unknown id', () => {
    const { addIndicator, updateParams } = useIndicatorStore.getState();
    const id = addIndicator('sma');
    const before = useIndicatorStore.getState().indicators.get(id)!.params;

    updateParams('does-not-exist', { period: 999 });

    const after = useIndicatorStore.getState().indicators.get(id)!.params;
    // State reference and values should be unchanged
    expect(after).toEqual(before);
    expect(useIndicatorStore.getState().indicators.size).toBe(1);
  });

  it('does not throw for an unknown id', () => {
    const { updateParams } = useIndicatorStore.getState();
    expect(() => updateParams('ghost', { period: 1 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. recompute is a no-op with no indicators
// ---------------------------------------------------------------------------

describe('recompute no-op cases', () => {
  it('does nothing when there are no indicators', () => {
    const { recompute } = useIndicatorStore.getState();
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);

    expect(useIndicatorStore.getState().series.size).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 8. recompute is a no-op with empty candles
  // -------------------------------------------------------------------------

  it('does nothing when the candles array is empty', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    addIndicator('sma');

    recompute('BTC/USDT', []);

    expect(useIndicatorStore.getState().series.size).toBe(0);
  });

  it('does not throw when called with no indicators and empty candles', () => {
    const { recompute } = useIndicatorStore.getState();
    expect(() => recompute('BTC/USDT', [])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 9. recompute produces series for each indicator
// ---------------------------------------------------------------------------

describe('recompute produces series', () => {
  it('stores a series entry for a single indicator', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    const id = addIndicator('sma');
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);

    const { series } = useIndicatorStore.getState();
    expect(series.has(id)).toBe(true);
  });

  it('produced series has the correct kind and id', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    const id = addIndicator('ema');
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);

    const s = useIndicatorStore.getState().series.get(id)!;
    expect(s.kind).toBe('ema');
    expect(s.id).toBe(id);
  });

  it('series points array length matches candle count', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    const id = addIndicator('sma');
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);

    const s = useIndicatorStore.getState().series.get(id)!;
    expect(s.points).toHaveLength(candles.length);
  });

  it('series reflects the current params stored in the config', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    const id = addIndicator('sma', { period: 5 });
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);

    const s = useIndicatorStore.getState().series.get(id)!;
    expect(s.params).toEqual(
      useIndicatorStore.getState().indicators.get(id)!.params
    );
  });

  it('replaces the series map entirely on each recompute call', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    const id = addIndicator('sma');
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);
    const firstSeries = useIndicatorStore.getState().series.get(id)!;

    recompute('BTC/USDT', candles);
    const secondSeries = useIndicatorStore.getState().series.get(id)!;

    // Different object references — series was rebuilt
    expect(secondSeries).not.toBe(firstSeries);
    expect(secondSeries.points).toHaveLength(candles.length);
  });

  it('works for every supported indicator kind', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    // Need enough candles for MACD (slow=26) and Bollinger (period=20)
    const candles = makeCandles(50);

    const kinds = [
      'sma',
      'ema',
      'rsi',
      'macd',
      'bollinger',
      'cvd',
      'vwap',
      'vwap-anchored',
      'vwap-rolling',
    ] as const;

    const idMap: Record<string, string> = {};
    for (const kind of kinds) {
      idMap[kind] = addIndicator(kind);
    }

    recompute('BTC/USDT', candles);

    const { series } = useIndicatorStore.getState();
    for (const kind of kinds) {
      const id = idMap[kind]!;
      const s = series.get(id);
      expect(s, `series missing for kind "${kind}"`).toBeDefined();
      if (!s) continue;
      expect(s.kind, `kind mismatch for ${kind}`).toBe(kind);
      expect(s.points.length, `points empty for ${kind} (id=${id}), got ${s.points.length}`).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Multiple indicators can coexist
// ---------------------------------------------------------------------------

describe('multiple indicators coexist', () => {
  it('stores all configs when multiple indicators are added', () => {
    const { addIndicator } = useIndicatorStore.getState();

    const smaId = addIndicator('sma');
    const emaId = addIndicator('ema');
    const rsiId = addIndicator('rsi');

    const { indicators } = useIndicatorStore.getState();
    expect(indicators.size).toBe(3);
    expect(indicators.has(smaId)).toBe(true);
    expect(indicators.has(emaId)).toBe(true);
    expect(indicators.has(rsiId)).toBe(true);
  });

  it('produces independent series for each indicator', () => {
    const { addIndicator, recompute } = useIndicatorStore.getState();
    const smaId = addIndicator('sma', { period: 5 });
    const emaId = addIndicator('ema', { period: 10 });
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);

    const { series } = useIndicatorStore.getState();
    expect(series.size).toBe(2);

    const smaSeries = series.get(smaId)!;
    const emaSeries = series.get(emaId)!;

    expect(smaSeries.kind).toBe('sma');
    expect(emaSeries.kind).toBe('ema');
    expect(smaSeries.params['period']).toBe(5);
    expect(emaSeries.params['period']).toBe(10);
  });

  it('removing one indicator does not affect others', () => {
    const { addIndicator, removeIndicator, recompute } = useIndicatorStore.getState();
    const smaId = addIndicator('sma');
    const rsiId = addIndicator('rsi');
    const candles = makeCandles(30);

    recompute('BTC/USDT', candles);

    removeIndicator(smaId);

    const { indicators, series } = useIndicatorStore.getState();
    expect(indicators.has(smaId)).toBe(false);
    expect(indicators.has(rsiId)).toBe(true);
    // Series for removed indicator is gone, remaining series is intact
    expect(series.has(smaId)).toBe(false);
    expect(series.has(rsiId)).toBe(true);
  });

  it('updating params for one indicator does not affect others', () => {
    const { addIndicator, updateParams } = useIndicatorStore.getState();
    const id1 = addIndicator('sma');
    const id2 = addIndicator('sma');

    updateParams(id1, { period: 100 });

    expect(useIndicatorStore.getState().indicators.get(id1)!.params['period']).toBe(100);
    expect(useIndicatorStore.getState().indicators.get(id2)!.params['period']).toBe(20);
  });

  it('recompute after partial removal only produces series for remaining indicators', () => {
    const { addIndicator, removeIndicator, recompute } = useIndicatorStore.getState();
    const smaId = addIndicator('sma');
    const emaId = addIndicator('ema');
    const candles = makeCandles(30);

    removeIndicator(smaId);
    recompute('BTC/USDT', candles);

    const { series } = useIndicatorStore.getState();
    expect(series.has(smaId)).toBe(false);
    expect(series.has(emaId)).toBe(true);
    expect(series.size).toBe(1);
  });

  it('same kind can be added more than once with separate configs', () => {
    const { addIndicator } = useIndicatorStore.getState();
    const id1 = addIndicator('sma', { period: 10 });
    const id2 = addIndicator('sma', { period: 50 });

    expect(id1).not.toBe(id2);

    const { indicators } = useIndicatorStore.getState();
    expect(indicators.get(id1)!.params['period']).toBe(10);
    expect(indicators.get(id2)!.params['period']).toBe(50);
  });
});
