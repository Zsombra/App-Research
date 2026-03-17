import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';

// Mock regl since jsdom doesn't support WebGL
vi.mock('regl', () => {
  const mockBuffer = {
    destroy: vi.fn(),
    subdata: vi.fn(),
  };
  const mockCommand = vi.fn();
  const mockRegl = vi.fn(() => mockCommand);

  // Add methods to mockRegl instance
  const reglInstance = Object.assign(mockRegl, {
    buffer: vi.fn(() => mockBuffer),
    clear: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    _gl: {},
    limits: {},
    stats: {},
  });

  // The default export is the factory function
  return {
    default: vi.fn(() => reglInstance),
    __esModule: true,
  };
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock requestAnimationFrame / cancelAnimationFrame
vi.stubGlobal('requestAnimationFrame', vi.fn((_cb: FrameRequestCallback) => {
  return 1;
}));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

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

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Mock getBoundingClientRect
  canvas.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
  return canvas;
}

describe('ChartManager', () => {
  let ChartManager: typeof import('../rendering/chart-manager.js').ChartManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import after mocks are set up
    const mod = await import('../rendering/chart-manager.js');
    ChartManager = mod.ChartManager;
  });

  it('should construct without throwing', () => {
    const canvas = createMockCanvas();
    expect(() => new ChartManager(canvas)).not.toThrow();
  });

  it('should accept candle data via setCandles', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    const candles = [
      makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
      makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
    ];
    expect(() => manager.setCandles(candles)).not.toThrow();
  });

  it('should append candle without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    const candles = [
      makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
    ];
    manager.setCandles(candles);

    const newCandle = makeCandle({
      timestamp: 2000,
      open: 150,
      high: 250,
      low: 100,
      close: 200,
    });
    expect(() => manager.appendCandle(newCandle)).not.toThrow();
  });

  it('should update last candle without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    const candles = [
      makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
    ];
    manager.setCandles(candles);

    const updatedCandle = makeCandle({
      timestamp: 1000,
      open: 100,
      high: 220,
      low: 50,
      close: 180,
      closed: false,
    });
    expect(() => manager.updateLastCandle(updatedCandle)).not.toThrow();
  });

  it('should handle pan without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    expect(() => manager.pan(100, 50)).not.toThrow();
  });

  it('should handle zoom without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    expect(() => manager.zoom(1.5, 400, 300)).not.toThrow();
  });

  it('should handle fitToData without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    const candles = [
      makeCandle({ timestamp: 1000, open: 100, high: 200, low: 50, close: 150 }),
      makeCandle({ timestamp: 2000, open: 150, high: 250, low: 100, close: 200 }),
    ];
    manager.setCandles(candles);
    expect(() => manager.fitToData()).not.toThrow();
  });

  it('should set cursor position without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    expect(() => manager.setCursorPosition(100, 200)).not.toThrow();
  });

  it('should toggle crosshair visibility without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    expect(() => manager.setCrosshairVisible(true)).not.toThrow();
    expect(() => manager.setCrosshairVisible(false)).not.toThrow();
  });

  it('should return grid info', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    const info = manager.getGridInfo();
    expect(info).toHaveProperty('horizontalLines');
    expect(info).toHaveProperty('verticalLines');
    expect(Array.isArray(info.horizontalLines)).toBe(true);
    expect(Array.isArray(info.verticalLines)).toBe(true);
  });

  it('should handle resize without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    expect(() => manager.resize(1024, 768)).not.toThrow();
  });

  it('should dispose without throwing', () => {
    const canvas = createMockCanvas();
    const manager = new ChartManager(canvas);
    expect(() => manager.dispose()).not.toThrow();
  });
});
