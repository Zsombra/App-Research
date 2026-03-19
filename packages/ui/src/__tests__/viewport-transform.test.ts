import { describe, it, expect } from 'vitest';
import { ViewportTransform } from '../rendering/viewport-transform.js';
import type { OHLCVCandle } from '@terminal/types';

function makeCandle(overrides: Partial<OHLCVCandle> & { timestamp: number; open: number; high: number; low: number; close: number }): OHLCVCandle {
  return {
    exchange: 'test',
    symbol: 'BTC/USDT',
    timeframe: '1m',
    volume: 100,
    buyVolume: 50,
    sellVolume: 50,
    tradeCount: 10,
    closed: true,
    ...overrides,
  };
}

describe('ViewportTransform', () => {
  describe('constructor', () => {
    it('should create with given dimensions', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      expect(vt.canvasWidth).toBe(800);
      expect(vt.canvasHeight).toBe(600);
    });
  });

  describe('coordinate transforms', () => {
    it('should round-trip dataToPixel and pixelToData for X', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const time = 1700000000000;
      const px = vt.dataToPixelX(time);
      const roundTripped = vt.pixelToDataX(px);
      expect(roundTripped).toBeCloseTo(time, 0);
    });

    it('should round-trip dataToPixel and pixelToData for Y', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const price = 65000;
      const py = vt.dataToPixelY(price);
      const roundTripped = vt.pixelToDataY(py);
      expect(roundTripped).toBeCloseTo(price, 5);
    });

    it('should place higher prices at lower pixel Y values', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      // After fitting to data, higher price should have lower pixel Y
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
        makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
      ];
      vt.fitToData(candles);

      const pyHigh = vt.dataToPixelY(250);
      const pyLow = vt.dataToPixelY(50);
      expect(pyHigh).toBeLessThan(pyLow);
    });

    it('should place later times at higher pixel X values', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
        makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
      ];
      vt.fitToData(candles);

      const px1 = vt.dataToPixelX(1000);
      const px2 = vt.dataToPixelX(2000);
      expect(px2).toBeGreaterThan(px1);
    });
  });

  describe('getVisibleTimeRange', () => {
    it('should return start and end timestamps', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const range = vt.getVisibleTimeRange();
      expect(range).toHaveProperty('start');
      expect(range).toHaveProperty('end');
      expect(range.end).toBeGreaterThan(range.start);
    });
  });

  describe('getVisiblePriceRange', () => {
    it('should return low and high prices', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const range = vt.getVisiblePriceRange();
      expect(range).toHaveProperty('low');
      expect(range).toHaveProperty('high');
      expect(range.high).toBeGreaterThan(range.low);
    });
  });

  describe('pan', () => {
    it('should shift the visible time range when panning horizontally', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
        makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
      ];
      vt.fitToData(candles);

      const before = vt.getVisibleTimeRange();
      vt.pan(100, 0); // pan right by 100 pixels
      const after = vt.getVisibleTimeRange();

      // Panning right (positive dx) should show earlier data
      expect(after.start).toBeLessThan(before.start);
      expect(after.end).toBeLessThan(before.end);
    });

    it('should shift the visible price range when panning vertically', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
      ];
      vt.fitToData(candles);

      const before = vt.getVisiblePriceRange();
      vt.pan(0, 100); // pan down by 100 pixels
      const after = vt.getVisiblePriceRange();

      // Panning down (positive dy) should show higher prices
      expect(after.high).toBeGreaterThan(before.high);
      expect(after.low).toBeGreaterThan(before.low);
    });
  });

  describe('zoom', () => {
    it('should narrow the visible range when zooming in', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
        makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
      ];
      vt.fitToData(candles);

      const before = vt.getVisibleTimeRange();
      const timeSpanBefore = before.end - before.start;

      vt.zoom(2, 400, 300); // zoom in 2x at center

      const after = vt.getVisibleTimeRange();
      const timeSpanAfter = after.end - after.start;

      expect(timeSpanAfter).toBeLessThan(timeSpanBefore);
    });

    it('should widen the visible range when zooming out', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
        makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
      ];
      vt.fitToData(candles);

      const before = vt.getVisibleTimeRange();
      const timeSpanBefore = before.end - before.start;

      vt.zoom(0.5, 400, 300); // zoom out 0.5x at center

      const after = vt.getVisibleTimeRange();
      const timeSpanAfter = after.end - after.start;

      expect(timeSpanAfter).toBeGreaterThan(timeSpanBefore);
    });

    it('should keep the zoom center point stable', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
        makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
      ];
      vt.fitToData(candles);

      const centerPx = 400;
      const centerPy = 300;
      const dataBefore = {
        time: vt.pixelToDataX(centerPx),
        price: vt.pixelToDataY(centerPy),
      };

      vt.zoom(1.5, centerPx, centerPy);

      const dataAfter = {
        time: vt.pixelToDataX(centerPx),
        price: vt.pixelToDataY(centerPy),
      };

      expect(dataAfter.time).toBeCloseTo(dataBefore.time, 0);
      expect(dataAfter.price).toBeCloseTo(dataBefore.price, 2);
    });
  });

  describe('fitToData', () => {
    it('should do nothing for empty candle array', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const originalScaleX = vt.scaleX;
      vt.fitToData([]);
      expect(vt.scaleX).toBe(originalScaleX);
    });

    it('should set origin and scale to encompass all candle data', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
        makeCandle({ timestamp: 5000, open: 150, high: 300, low: 100, close: 250 }),
      ];
      vt.fitToData(candles);

      // All candles should be visible (within padding)
      const timeRange = vt.getVisibleTimeRange();
      expect(timeRange.start).toBeLessThanOrEqual(1000);
      expect(timeRange.end).toBeGreaterThanOrEqual(5000);

      const priceRange = vt.getVisiblePriceRange();
      expect(priceRange.low).toBeLessThanOrEqual(50);
      expect(priceRange.high).toBeGreaterThanOrEqual(300);
    });

    it('should handle single candle (zero time range)', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
      ];
      vt.fitToData(candles);

      // Should not produce NaN or Infinity scales
      expect(Number.isFinite(vt.scaleX)).toBe(true);
      expect(Number.isFinite(vt.scaleY)).toBe(true);

      const timeRange = vt.getVisibleTimeRange();
      expect(Number.isFinite(timeRange.start)).toBe(true);
      expect(Number.isFinite(timeRange.end)).toBe(true);
    });

    it('should respect custom padding', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const candles = [
        makeCandle({ timestamp: 1000, open: 100, high: 200, low: 100, close: 200 }),
        makeCandle({ timestamp: 2000, open: 100, high: 200, low: 100, close: 200 }),
      ];

      vt.fitToData(candles, 0.1); // 10% padding
      const range = vt.getVisiblePriceRange();

      // With 10% padding on a 100-unit price range, we should see
      // low < 100 - 10 = 90 and high > 200 + 10 = 210
      expect(range.low).toBeLessThan(100);
      expect(range.high).toBeGreaterThan(200);
    });
  });

  describe('resize', () => {
    it('should update canvas dimensions', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      vt.resize(1024, 768);
      expect(vt.canvasWidth).toBe(1024);
      expect(vt.canvasHeight).toBe(768);
    });
  });

  describe('getProjectionMatrix', () => {
    it('should return a Float32Array of 16 elements', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const mat = vt.getProjectionMatrix();
      expect(mat).toBeInstanceOf(Float32Array);
      expect(mat.length).toBe(16);
    });

    it('should produce correct orthographic projection values', () => {
      const vt = new ViewportTransform({ canvasWidth: 800, canvasHeight: 600 });
      const mat = vt.getProjectionMatrix();

      // Column-major:
      // mat[0] = 2/W, mat[5] = -2/H, mat[12] = -1, mat[13] = 1
      expect(mat[0]).toBeCloseTo(2 / 800);
      expect(mat[5]).toBeCloseTo(-2 / 600);
      expect(mat[12]).toBeCloseTo(-1);
      expect(mat[13]).toBeCloseTo(1);
    });

    it('should map (0,0) to (-1,+1) in clip space and (W,H) to (+1,-1)', () => {
      const W = 800;
      const H = 600;
      const vt = new ViewportTransform({ canvasWidth: W, canvasHeight: H });
      const mat = vt.getProjectionMatrix();

      // Apply matrix to pixel (0,0): result should be (-1, +1)
      const clipX0 = mat[0]! * 0 + mat[4]! * 0 + mat[12]!;
      const clipY0 = mat[1]! * 0 + mat[5]! * 0 + mat[13]!;
      expect(clipX0).toBeCloseTo(-1);
      expect(clipY0).toBeCloseTo(1);

      // Apply matrix to pixel (W,H): result should be (+1, -1)
      const clipXW = mat[0]! * W + mat[4]! * H + mat[12]!;
      const clipYH = mat[1]! * W + mat[5]! * H + mat[13]!;
      expect(clipXW).toBeCloseTo(1);
      expect(clipYH).toBeCloseTo(-1);
    });
  });
});
