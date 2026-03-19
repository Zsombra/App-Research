import REGL from 'regl';
import type { OHLCVCandle } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/** Number of floats per volume bar instance. */
const FLOATS_PER_INSTANCE = 4; // centerX, height, barWidth, isBullish

/** Default maximum bar capacity. */
const DEFAULT_MAX_BARS = 50_000;

/** Fraction of canvas height used for volume pane (bottom 20%). */
const VOLUME_PANE_FRACTION = 0.20;

/** Default bar width in pixels when no option provided. */
const DEFAULT_BAR_WIDTH_PX = 6;

/** Opacity of volume bars. */
const VOLUME_BAR_OPACITY = 0.35;

/**
 * Renders volume bars at the bottom of the chart canvas using instanced rendering.
 * Bars are colored bullish/bearish based on candle close vs open.
 * Occupies the bottom 20% of the canvas height.
 */
export class VolumeBarRenderer extends BaseRenderer {
  private candles: OHLCVCandle[] = [];
  private maxBars: number;
  private barWidthPx: number;

  private quadBuffer: REGL.Buffer | null = null;
  private instanceBuffer: REGL.Buffer | null = null;
  private drawCommand: REGL.DrawCommand | null = null;

  private visibleStart: number = 0;
  private visibleCount: number = 0;
  private maxVisibleVolume: number = 1;

  constructor(
    ctx: RenderingContext,
    viewport: ViewportTransform,
    options?: { maxBars?: number; barWidthPx?: number }
  ) {
    super(ctx, viewport);
    this.maxBars = options?.maxBars ?? DEFAULT_MAX_BARS;
    this.barWidthPx = options?.barWidthPx ?? DEFAULT_BAR_WIDTH_PX;
  }

  init(): void {
    const regl = this.ctx.regl;

    // Unit quad (6 vertices, 2 triangles)
    // prettier-ignore
    this.quadBuffer = regl.buffer([
      [-0.5,  0.0],
      [ 0.5,  0.0],
      [ 0.5,  1.0],
      [-0.5,  0.0],
      [ 0.5,  1.0],
      [-0.5,  1.0],
    ]);

    this.instanceBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: this.maxBars * FLOATS_PER_INSTANCE * 4,
    });

    this.drawCommand = regl({
      vert: `
        attribute vec2 a_quad;
        attribute float a_centerX;
        attribute float a_height;
        attribute float a_barWidth;
        attribute float a_isBullish;

        uniform mat4 u_projection;
        uniform float u_paneTop;     // pixel Y where volume pane starts
        uniform float u_paneHeight;  // pixel height of volume pane

        varying float v_isBullish;

        void main() {
          // Bar grows upward from bottom of pane
          float baseY = u_paneTop + u_paneHeight;
          float barHeight = a_height * u_paneHeight;

          vec2 pos = vec2(
            a_centerX + a_quad.x * a_barWidth,
            baseY - a_quad.y * barHeight
          );

          gl_Position = u_projection * vec4(pos, 0.0, 1.0);
          v_isBullish = a_isBullish;
        }
      `,
      frag: `
        precision mediump float;
        uniform vec3 u_bullishColor;
        uniform vec3 u_bearishColor;
        uniform float u_opacity;
        varying float v_isBullish;

        void main() {
          vec3 color = mix(u_bearishColor, u_bullishColor, v_isBullish);
          gl_FragColor = vec4(color, u_opacity);
        }
      `,
      attributes: {
        a_quad: {
          buffer: this.quadBuffer as REGL.Buffer,
          divisor: 0,
        },
        a_centerX: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 0,
        },
        a_height: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 4,
        },
        a_barWidth: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 8,
        },
        a_isBullish: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 12,
        },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
        u_paneTop: () => this.viewport.canvasHeight * (1 - VOLUME_PANE_FRACTION),
        u_paneHeight: () => this.viewport.canvasHeight * VOLUME_PANE_FRACTION,
        u_bullishColor: () => {
          const c = this.getThemeColors().bullish;
          return [c[0], c[1], c[2]];
        },
        u_bearishColor: () => {
          const c = this.getThemeColors().bearish;
          return [c[0], c[1], c[2]];
        },
        u_opacity: VOLUME_BAR_OPACITY,
      },
      count: 6,
      instances: () => this.visibleCount,
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 'one',
          dstRGB: 'one minus src alpha',
          dstAlpha: 'one minus src alpha',
        },
      },
      depth: { enable: false },
    });
  }

  render(): void {
    if (!this.drawCommand || this.candles.length === 0) return;
    this.updateBuffers();
    if (this.visibleCount > 0) {
      this.drawCommand();
    }
    this.isDirty = false;
  }

  dispose(): void {
    if (this.quadBuffer) {
      this.quadBuffer.destroy();
      this.quadBuffer = null;
    }
    if (this.instanceBuffer) {
      this.instanceBuffer.destroy();
      this.instanceBuffer = null;
    }
    this.drawCommand = null;
  }

  setData(candles: OHLCVCandle[]): void {
    this.candles = candles;
    this.markDirty();
  }

  appendCandle(candle: OHLCVCandle): void {
    this.candles.push(candle);
    this.markDirty();
  }

  updateLastCandle(candle: OHLCVCandle): void {
    if (this.candles.length > 0) {
      this.candles[this.candles.length - 1] = candle;
      this.markDirty();
    }
  }

  private updateBuffers(): void {
    if (!this.instanceBuffer) return;

    const { start, end } = this.viewport.getVisibleTimeRange();

    this.visibleStart = this.binarySearchFirst(start);
    const visibleEnd = this.binarySearchLast(end);
    this.visibleCount = Math.min(visibleEnd - this.visibleStart, this.maxBars);

    if (this.visibleCount <= 0) {
      this.visibleCount = 0;
      return;
    }

    // Find max volume for normalization
    this.maxVisibleVolume = 0;
    for (let i = 0; i < this.visibleCount; i++) {
      const vol = (this.candles[this.visibleStart + i] as OHLCVCandle).volume;
      if (vol > this.maxVisibleVolume) this.maxVisibleVolume = vol;
    }
    if (this.maxVisibleVolume === 0) this.maxVisibleVolume = 1;

    const data = new Float32Array(this.visibleCount * FLOATS_PER_INSTANCE);

    for (let i = 0; i < this.visibleCount; i++) {
      const candle = this.candles[this.visibleStart + i] as OHLCVCandle;
      const idx = i * FLOATS_PER_INSTANCE;

      data[idx] = this.viewport.dataToPixelX(candle.timestamp);
      data[idx + 1] = candle.volume / this.maxVisibleVolume; // normalized 0..1
      data[idx + 2] = this.barWidthPx;
      data[idx + 3] = candle.close >= candle.open ? 1.0 : 0.0;
    }

    this.instanceBuffer.subdata(data);
  }

  private binarySearchFirst(timestamp: number): number {
    let lo = 0;
    let hi = this.candles.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.candles[mid] as OHLCVCandle).timestamp < timestamp) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - 1);
  }

  private binarySearchLast(timestamp: number): number {
    let lo = 0;
    let hi = this.candles.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.candles[mid] as OHLCVCandle).timestamp <= timestamp) lo = mid + 1;
      else hi = mid;
    }
    return Math.min(this.candles.length, lo + 1);
  }
}
