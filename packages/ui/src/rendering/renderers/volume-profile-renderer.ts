import REGL from 'regl';
import type { OHLCVCandle } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/** Number of floats per volume profile bar instance. */
const FLOATS_PER_INSTANCE = 4; // priceY, barWidth, barHeight, buyRatio

/** Default number of price bins. */
const DEFAULT_NUM_BINS = 50;

/** Maximum width of a volume profile bar as fraction of canvas width. */
const MAX_BAR_WIDTH_FRACTION = 0.25;

/**
 * Renders a session volume profile as horizontal bars on the right side
 * of the chart. Each bar represents the total volume traded at a price
 * level, split into buy (green) and sell (red) portions.
 */
export class VolumeProfileRenderer extends BaseRenderer {
  private candles: OHLCVCandle[] = [];
  private numBins: number;

  private quadBuffer: REGL.Buffer | null = null;
  private instanceBuffer: REGL.Buffer | null = null;
  private drawBuyCommand: REGL.DrawCommand | null = null;
  private drawSellCommand: REGL.DrawCommand | null = null;

  private barCount: number = 0;

  constructor(
    ctx: RenderingContext,
    viewport: ViewportTransform,
    options?: { numBins?: number }
  ) {
    super(ctx, viewport);
    this.numBins = options?.numBins ?? DEFAULT_NUM_BINS;
  }

  init(): void {
    const regl = this.ctx.regl;

    // Unit quad
    // prettier-ignore
    this.quadBuffer = regl.buffer([
      [0.0, -0.5],
      [1.0, -0.5],
      [1.0,  0.5],
      [0.0, -0.5],
      [1.0,  0.5],
      [0.0,  0.5],
    ]);

    this.instanceBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: this.numBins * FLOATS_PER_INSTANCE * 4 * 2, // x2 for safety
    });

    const makeCommand = (isBuyPortion: boolean): REGL.DrawCommand => regl({
      vert: `
        attribute vec2 a_quad;
        attribute float a_priceY;
        attribute float a_barWidth;
        attribute float a_barHeight;
        attribute float a_buyRatio;

        uniform mat4 u_projection;
        uniform float u_canvasWidth;
        uniform bool u_isBuy;

        void main() {
          float totalWidth = a_barWidth;
          float buyWidth = totalWidth * a_buyRatio;
          float sellWidth = totalWidth * (1.0 - a_buyRatio);

          float startX;
          float width;
          if (u_isBuy) {
            startX = u_canvasWidth - totalWidth;
            width = buyWidth;
          } else {
            startX = u_canvasWidth - sellWidth;
            width = sellWidth;
          }

          vec2 pos = vec2(
            startX + a_quad.x * width,
            a_priceY + a_quad.y * a_barHeight
          );

          gl_Position = u_projection * vec4(pos, 0.0, 1.0);
        }
      `,
      frag: `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
          gl_FragColor = u_color;
        }
      `,
      attributes: {
        a_quad: {
          buffer: this.quadBuffer as REGL.Buffer,
          divisor: 0,
        },
        a_priceY: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 0,
        },
        a_barWidth: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 4,
        },
        a_barHeight: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 8,
        },
        a_buyRatio: {
          buffer: this.instanceBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_INSTANCE * 4,
          offset: 12,
        },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
        u_canvasWidth: () => this.viewport.canvasWidth,
        u_isBuy: isBuyPortion,
        u_color: isBuyPortion
          ? () => [this.getThemeColors().bullish[0], this.getThemeColors().bullish[1], this.getThemeColors().bullish[2], 0.25]
          : () => [this.getThemeColors().bearish[0], this.getThemeColors().bearish[1], this.getThemeColors().bearish[2], 0.25],
      },
      count: 6,
      instances: () => this.barCount,
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

    this.drawBuyCommand = makeCommand(true);
    this.drawSellCommand = makeCommand(false);
  }

  render(): void {
    if (!this.drawBuyCommand || !this.drawSellCommand || this.candles.length === 0) return;
    this.updateBuffers();
    if (this.barCount > 0) {
      this.drawBuyCommand();
      this.drawSellCommand();
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
    this.drawBuyCommand = null;
    this.drawSellCommand = null;
  }

  setData(candles: OHLCVCandle[]): void {
    this.candles = candles;
    this.markDirty();
  }

  private updateBuffers(): void {
    if (!this.instanceBuffer) return;

    // Compute price range from visible candles
    const { low: priceLow, high: priceHigh } = this.viewport.getVisiblePriceRange();
    const priceRange = priceHigh - priceLow;
    if (priceRange <= 0) {
      this.barCount = 0;
      return;
    }

    const binSize = priceRange / this.numBins;

    // Accumulate volume into bins
    const buyVolumes = new Float32Array(this.numBins);
    const sellVolumes = new Float32Array(this.numBins);

    for (const candle of this.candles) {
      // Use candle's VWAP approximation (midpoint of high/low)
      const midPrice = (candle.high + candle.low) / 2;
      const binIdx = Math.floor((midPrice - priceLow) / binSize);
      if (binIdx >= 0 && binIdx < this.numBins) {
        buyVolumes[binIdx] = (buyVolumes[binIdx] ?? 0) + candle.buyVolume;
        sellVolumes[binIdx] = (sellVolumes[binIdx] ?? 0) + candle.sellVolume;
      }
    }

    // Find max total volume for normalization
    let maxVol = 0;
    for (let i = 0; i < this.numBins; i++) {
      const total = buyVolumes[i]! + sellVolumes[i]!;
      if (total > maxVol) maxVol = total;
    }
    if (maxVol === 0) {
      this.barCount = 0;
      return;
    }

    // Build instance data
    const maxBarWidthPx = this.viewport.canvasWidth * MAX_BAR_WIDTH_FRACTION;
    const barHeightPx = Math.max(1, (this.viewport.canvasHeight / this.numBins) * 0.85);
    this.barCount = 0;

    const data = new Float32Array(this.numBins * FLOATS_PER_INSTANCE);

    for (let i = 0; i < this.numBins; i++) {
      const total = buyVolumes[i]! + sellVolumes[i]!;
      if (total <= 0) continue;

      const price = priceLow + (i + 0.5) * binSize;
      const priceY = this.viewport.dataToPixelY(price);
      const barWidth = (total / maxVol) * maxBarWidthPx;
      const buyRatio = buyVolumes[i]! / total;

      const idx = this.barCount * FLOATS_PER_INSTANCE;
      data[idx] = priceY;
      data[idx + 1] = barWidth;
      data[idx + 2] = barHeightPx;
      data[idx + 3] = buyRatio;
      this.barCount++;
    }

    this.instanceBuffer.subdata(data.subarray(0, this.barCount * FLOATS_PER_INSTANCE));
  }
}
