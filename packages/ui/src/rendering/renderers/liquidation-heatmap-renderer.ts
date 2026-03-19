import REGL from 'regl';
import type { LiquidationHeatmapCell } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/**
 * Maximum number of cells (instances) to render.
 */
const MAX_CELLS = 100_000;

/**
 * Liquidation heatmap renderer.
 * Renders liquidation events as colored cells on the price chart.
 * Long liquidations = green/cyan, Short liquidations = red/magenta.
 * Intensity maps to volume relative to max.
 */
export class LiquidationHeatmapRenderer extends BaseRenderer {
  private cells: LiquidationHeatmapCell[] = [];
  private maxVolume: number = 1;
  private priceBucketSize: number = 1;
  private timeBucketMs: number = 60_000;

  private instanceBuffer: REGL.Buffer | null = null;
  private instanceData: Float32Array;
  private drawCommand: REGL.DrawCommand | null = null;
  private instanceCount: number = 0;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
    // 8 floats per instance: centerX, centerY, width, height, r, g, b, a
    this.instanceData = new Float32Array(MAX_CELLS * 8);
  }

  init(): void {
    const regl = this.ctx.regl;

    this.instanceBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: MAX_CELLS * 8 * 4,
    });

    this.drawCommand = regl({
      vert: `
        precision highp float;
        attribute vec2 a_corner;
        attribute float a_centerX, a_centerY, a_width, a_height;
        attribute float a_r, a_g, a_b, a_a;
        varying vec4 v_color;

        void main() {
          vec2 pos = vec2(a_centerX, a_centerY) + a_corner * vec2(a_width, a_height) * 0.5;
          gl_Position = vec4(pos, 0.0, 1.0);
          v_color = vec4(a_r, a_g, a_b, a_a);
        }
      `,
      frag: `
        precision highp float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `,
      attributes: {
        a_corner: regl.buffer([[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]),
        a_centerX: { buffer: () => this.instanceBuffer, offset: 0, stride: 32, divisor: 1 },
        a_centerY: { buffer: () => this.instanceBuffer, offset: 4, stride: 32, divisor: 1 },
        a_width: { buffer: () => this.instanceBuffer, offset: 8, stride: 32, divisor: 1 },
        a_height: { buffer: () => this.instanceBuffer, offset: 12, stride: 32, divisor: 1 },
        a_r: { buffer: () => this.instanceBuffer, offset: 16, stride: 32, divisor: 1 },
        a_g: { buffer: () => this.instanceBuffer, offset: 20, stride: 32, divisor: 1 },
        a_b: { buffer: () => this.instanceBuffer, offset: 24, stride: 32, divisor: 1 },
        a_a: { buffer: () => this.instanceBuffer, offset: 28, stride: 32, divisor: 1 },
      },
      count: 6,
      instances: () => this.instanceCount,
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

  /** Set liquidation heatmap cells. */
  setData(
    cells: LiquidationHeatmapCell[],
    maxVolume: number,
    priceBucketSize: number,
    timeBucketMs: number,
  ): void {
    this.cells = cells;
    this.maxVolume = Math.max(1, maxVolume);
    this.priceBucketSize = priceBucketSize;
    this.timeBucketMs = timeBucketMs;
    this.rebuildInstances();
  }

  render(): void {
    if (this.instanceCount === 0 || !this.drawCommand) return;
    this.drawCommand();
  }

  dispose(): void {
    this.instanceBuffer?.destroy();
    this.instanceBuffer = null;
    this.drawCommand = null;
  }

  private rebuildInstances(): void {
    if (!this.instanceBuffer) return;

    const data = this.instanceData;
    let count = 0;
    const w = this.viewport.canvasWidth;
    const h = this.viewport.canvasHeight;

    for (const cell of this.cells) {
      if (count >= MAX_CELLS) break;

      const totalVol = cell.longVolume + cell.shortVolume;
      if (totalVol <= 0) continue;

      // Map to pixel space
      const px = this.viewport.dataToPixelX(cell.timestamp + this.timeBucketMs / 2);
      const py = this.viewport.dataToPixelY(cell.price + this.priceBucketSize / 2);

      const cellW = Math.abs(this.viewport.dataToPixelX(cell.timestamp + this.timeBucketMs) - this.viewport.dataToPixelX(cell.timestamp));
      const cellH = Math.abs(this.viewport.dataToPixelY(cell.price) - this.viewport.dataToPixelY(cell.price + this.priceBucketSize));

      // Clip check
      if (px + cellW < 0 || px - cellW > w || py + cellH < 0 || py - cellH > h) continue;

      // Convert to clip space
      const cx = (px / w) * 2 - 1;
      const cy = 1 - (py / h) * 2;
      const cw = (cellW / w) * 2;
      const ch = (cellH / h) * 2;

      // Color: long = green-cyan, short = red-magenta
      const intensity = Math.min(1, totalVol / this.maxVolume);
      const longRatio = cell.longVolume / totalVol;
      const shortRatio = cell.shortVolume / totalVol;

      const r = shortRatio * (0.6 + intensity * 0.4);
      const g = longRatio * (0.4 + intensity * 0.6);
      const b = intensity * 0.3;
      const a = 0.15 + intensity * 0.55;

      const off = count * 8;
      data[off] = cx;
      data[off + 1] = cy;
      data[off + 2] = cw;
      data[off + 3] = ch;
      data[off + 4] = r;
      data[off + 5] = g;
      data[off + 6] = b;
      data[off + 7] = a;
      count++;
    }

    this.instanceCount = count;
    if (count > 0) {
      (this.instanceBuffer as REGL.Buffer).subdata(data.subarray(0, count * 8));
    }
    this.markDirty();
  }
}
