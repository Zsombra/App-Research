import REGL from 'regl';
import type { OHLCVCandle } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/** Number of floats per candle instance in the body buffer. */
const BODY_FLOATS_PER_INSTANCE = 5;

/** Number of floats per candle instance in the wick buffer. */
const WICK_FLOATS_PER_INSTANCE = 4;

/** Default maximum candle capacity for GPU buffers. */
const DEFAULT_MAX_CANDLES = 50_000;

/** Default body width in pixels. */
const DEFAULT_BODY_WIDTH_PX = 8;

/** Default wick width in pixels. */
const DEFAULT_WICK_WIDTH_PX = 1.5;

/**
 * Renders OHLCV candles using instanced rendering.
 * Two draw calls per frame: one for candle bodies, one for wicks.
 * Viewport culling ensures only visible candles are uploaded to the GPU.
 */
export class CandlestickRenderer extends BaseRenderer {
  private candles: OHLCVCandle[] = [];
  private maxCandles: number;
  private bodyWidth: number;
  private wickWidth: number;

  // GPU resources
  private quadBuffer: REGL.Buffer | null = null;
  private bodyBuffer: REGL.Buffer | null = null;
  private wickBuffer: REGL.Buffer | null = null;
  private drawBodies: REGL.DrawCommand | null = null;
  private drawWicks: REGL.DrawCommand | null = null;

  // Current visible slice
  private visibleStart: number = 0;
  private visibleCount: number = 0;

  constructor(
    ctx: RenderingContext,
    viewport: ViewportTransform,
    options?: { maxCandles?: number; bodyWidth?: number; wickWidth?: number }
  ) {
    super(ctx, viewport);
    this.maxCandles = options?.maxCandles ?? DEFAULT_MAX_CANDLES;
    this.bodyWidth = options?.bodyWidth ?? DEFAULT_BODY_WIDTH_PX;
    this.wickWidth = options?.wickWidth ?? DEFAULT_WICK_WIDTH_PX;
  }

  /**
   * Create regl commands and allocate GPU buffers.
   */
  init(): void {
    const regl = this.ctx.regl;

    // Unit quad: 4 corners → 6 vertices (2 triangles)
    // prettier-ignore
    this.quadBuffer = regl.buffer([
      [-0.5, -0.5],
      [ 0.5, -0.5],
      [ 0.5,  0.5],
      [-0.5, -0.5],
      [ 0.5,  0.5],
      [-0.5,  0.5],
    ]);

    // Pre-allocate instance buffers
    this.bodyBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: this.maxCandles * BODY_FLOATS_PER_INSTANCE * 4,
    });

    this.wickBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: this.maxCandles * WICK_FLOATS_PER_INSTANCE * 4,
    });

    // --- Body draw command ---
    this.drawBodies = regl({
      vert: `
        attribute vec2 a_quadCorner;
        attribute float a_centerX;
        attribute float a_openY;
        attribute float a_closeY;
        attribute float a_bodyWidth;
        attribute float a_isBullish;

        uniform mat4 u_projection;

        varying float v_isBullish;

        void main() {
          float topY    = min(a_openY, a_closeY);
          float bottomY = max(a_openY, a_closeY);
          float height  = max(bottomY - topY, 1.0);

          vec2 pixelPos = vec2(
            a_centerX + a_quadCorner.x * a_bodyWidth,
            topY      + (a_quadCorner.y + 0.5) * height
          );

          gl_Position = u_projection * vec4(pixelPos, 0.0, 1.0);
          v_isBullish = a_isBullish;
        }
      `,
      frag: `
        precision mediump float;
        uniform vec3 u_bullishColor;
        uniform vec3 u_bearishColor;
        varying float v_isBullish;

        void main() {
          gl_FragColor = vec4(mix(u_bearishColor, u_bullishColor, v_isBullish), 1.0);
        }
      `,
      attributes: {
        a_quadCorner: {
          buffer: this.quadBuffer as REGL.Buffer,
          divisor: 0,
        },
        a_centerX: {
          buffer: this.bodyBuffer as REGL.Buffer,
          divisor: 1,
          stride: BODY_FLOATS_PER_INSTANCE * 4,
          offset: 0,
        },
        a_openY: {
          buffer: this.bodyBuffer as REGL.Buffer,
          divisor: 1,
          stride: BODY_FLOATS_PER_INSTANCE * 4,
          offset: 4,
        },
        a_closeY: {
          buffer: this.bodyBuffer as REGL.Buffer,
          divisor: 1,
          stride: BODY_FLOATS_PER_INSTANCE * 4,
          offset: 8,
        },
        a_bodyWidth: {
          buffer: this.bodyBuffer as REGL.Buffer,
          divisor: 1,
          stride: BODY_FLOATS_PER_INSTANCE * 4,
          offset: 12,
        },
        a_isBullish: {
          buffer: this.bodyBuffer as REGL.Buffer,
          divisor: 1,
          stride: BODY_FLOATS_PER_INSTANCE * 4,
          offset: 16,
        },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
        u_bullishColor: () => {
          const c = this.getThemeColors().bullish;
          return [c[0], c[1], c[2]];
        },
        u_bearishColor: () => {
          const c = this.getThemeColors().bearish;
          return [c[0], c[1], c[2]];
        },
      },
      count: 6, // vertices per quad
      instances: () => this.visibleCount,
      depth: { enable: false },
    });

    // --- Wick draw command ---
    this.drawWicks = regl({
      vert: `
        attribute vec2 a_quadCorner;
        attribute float a_centerX;
        attribute float a_highY;
        attribute float a_lowY;
        attribute float a_wickWidth;

        uniform mat4 u_projection;

        void main() {
          float topY    = min(a_highY, a_lowY);
          float bottomY = max(a_highY, a_lowY);
          float height  = max(bottomY - topY, 1.0);

          vec2 pixelPos = vec2(
            a_centerX + a_quadCorner.x * a_wickWidth,
            topY      + (a_quadCorner.y + 0.5) * height
          );

          gl_Position = u_projection * vec4(pixelPos, 0.0, 1.0);
        }
      `,
      frag: `
        precision mediump float;
        uniform vec4 u_wickColor;

        void main() {
          gl_FragColor = u_wickColor;
        }
      `,
      attributes: {
        a_quadCorner: {
          buffer: this.quadBuffer as REGL.Buffer,
          divisor: 0,
        },
        a_centerX: {
          buffer: this.wickBuffer as REGL.Buffer,
          divisor: 1,
          stride: WICK_FLOATS_PER_INSTANCE * 4,
          offset: 0,
        },
        a_highY: {
          buffer: this.wickBuffer as REGL.Buffer,
          divisor: 1,
          stride: WICK_FLOATS_PER_INSTANCE * 4,
          offset: 4,
        },
        a_lowY: {
          buffer: this.wickBuffer as REGL.Buffer,
          divisor: 1,
          stride: WICK_FLOATS_PER_INSTANCE * 4,
          offset: 8,
        },
        a_wickWidth: {
          buffer: this.wickBuffer as REGL.Buffer,
          divisor: 1,
          stride: WICK_FLOATS_PER_INSTANCE * 4,
          offset: 12,
        },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
        u_wickColor: () => this.getThemeColors().text,
      },
      count: 6,
      instances: () => this.visibleCount,
      depth: { enable: false },
    });
  }

  /**
   * Execute draw calls for visible candles.
   */
  render(): void {
    if (!this.drawBodies || !this.drawWicks) return;
    if (this.candles.length === 0) return;

    this.updateBuffers();

    if (this.visibleCount > 0) {
      this.drawBodies();
      this.drawWicks();
    }

    this.isDirty = false;
  }

  /**
   * Free all GPU resources.
   */
  dispose(): void {
    if (this.quadBuffer) {
      this.quadBuffer.destroy();
      this.quadBuffer = null;
    }
    if (this.bodyBuffer) {
      this.bodyBuffer.destroy();
      this.bodyBuffer = null;
    }
    if (this.wickBuffer) {
      this.wickBuffer.destroy();
      this.wickBuffer = null;
    }
    this.drawBodies = null;
    this.drawWicks = null;
  }

  /**
   * Replace all candle data.
   * @param candles - Array of OHLCV candles (must be sorted by timestamp)
   */
  setData(candles: OHLCVCandle[]): void {
    this.candles = candles;
    this.markDirty();
  }

  /**
   * Append a new candle to the end of the data array.
   * @param candle - The new candle to append
   */
  appendCandle(candle: OHLCVCandle): void {
    this.candles.push(candle);
    this.markDirty();
  }

  /**
   * Update the last candle in the array (currently forming candle).
   * @param candle - Updated candle data
   */
  updateLastCandle(candle: OHLCVCandle): void {
    if (this.candles.length > 0) {
      this.candles[this.candles.length - 1] = candle;
      this.markDirty();
    }
  }

  /** Compute visible slice and upload to GPU buffers. */
  private updateBuffers(): void {
    if (!this.bodyBuffer || !this.wickBuffer) return;

    const { start, end } = this.viewport.getVisibleTimeRange();

    // Binary search for visible range with one-candle margin
    this.visibleStart = this.binarySearchFirst(start);
    const visibleEnd = this.binarySearchLast(end);
    this.visibleCount = Math.min(
      visibleEnd - this.visibleStart,
      this.maxCandles
    );

    if (this.visibleCount <= 0) {
      this.visibleCount = 0;
      return;
    }

    // Build body and wick data
    const bodyData = new Float32Array(this.visibleCount * BODY_FLOATS_PER_INSTANCE);
    const wickData = new Float32Array(this.visibleCount * WICK_FLOATS_PER_INSTANCE);

    for (let i = 0; i < this.visibleCount; i++) {
      const candle = this.candles[this.visibleStart + i] as OHLCVCandle;

      const centerX = this.viewport.dataToPixelX(candle.timestamp);
      const openY = this.viewport.dataToPixelY(candle.open);
      const closeY = this.viewport.dataToPixelY(candle.close);
      const highY = this.viewport.dataToPixelY(candle.high);
      const lowY = this.viewport.dataToPixelY(candle.low);
      const isBullish = candle.close >= candle.open ? 1.0 : 0.0;

      // Body: centerX, openY, closeY, bodyWidth, isBullish
      const bIdx = i * BODY_FLOATS_PER_INSTANCE;
      bodyData[bIdx] = centerX;
      bodyData[bIdx + 1] = openY;
      bodyData[bIdx + 2] = closeY;
      bodyData[bIdx + 3] = this.bodyWidth;
      bodyData[bIdx + 4] = isBullish;

      // Wick: centerX, highY, lowY, wickWidth
      const wIdx = i * WICK_FLOATS_PER_INSTANCE;
      wickData[wIdx] = centerX;
      wickData[wIdx + 1] = highY;
      wickData[wIdx + 2] = lowY;
      wickData[wIdx + 3] = this.wickWidth;
    }

    this.bodyBuffer.subdata(bodyData);
    this.wickBuffer.subdata(wickData);
  }

  /** Binary search for the first candle at or after the given timestamp. */
  private binarySearchFirst(timestamp: number): number {
    let lo = 0;
    let hi = this.candles.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.candles[mid] as OHLCVCandle).timestamp < timestamp) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    // Include one extra candle before for partial visibility
    return Math.max(0, lo - 1);
  }

  /** Binary search for the last candle at or before the given timestamp. */
  private binarySearchLast(timestamp: number): number {
    let lo = 0;
    let hi = this.candles.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.candles[mid] as OHLCVCandle).timestamp <= timestamp) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    // Include one extra candle after for partial visibility
    return Math.min(this.candles.length, lo + 1);
  }
}
