import REGL from 'regl';
import type { HeatmapColumn } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/**
 * Floats per heatmap cell instance:
 * centerX, centerY, width, height, r, g, b, a
 */
const FLOATS_PER_INSTANCE = 8;

/** Maximum number of heatmap cells to render per frame. */
const MAX_CELLS = 200_000;

/**
 * Renders orderbook heatmap behind candlesticks.
 * Each cell represents liquidity at a specific (time, price) position.
 * Bid liquidity is shown in blue, ask liquidity in orange/yellow.
 * Intensity maps to the amount of liquidity.
 */
export class HeatmapRenderer extends BaseRenderer {
  private columns: HeatmapColumn[] = [];
  private columnIntervalMs: number = 1000;
  private maxLiquidity: number = 1;
  private priceBucketSize: number = 1;

  private quadBuffer: REGL.Buffer | null = null;
  private instanceBuffer: REGL.Buffer | null = null;
  private drawCommand: REGL.DrawCommand | null = null;

  private instanceData: Float32Array;
  private visibleCellCount: number = 0;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
    this.instanceData = new Float32Array(MAX_CELLS * FLOATS_PER_INSTANCE);
  }

  init(): void {
    const regl = this.ctx.regl;

    this.quadBuffer = regl.buffer([
      [-0.5, -0.5],
      [ 0.5, -0.5],
      [ 0.5,  0.5],
      [-0.5, -0.5],
      [ 0.5,  0.5],
      [-0.5,  0.5],
    ]);

    this.instanceBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: MAX_CELLS * FLOATS_PER_INSTANCE * 4,
    });

    this.drawCommand = regl({
      vert: `
        precision highp float;
        attribute vec2 a_quad;
        attribute vec2 a_center;
        attribute vec2 a_size;
        attribute vec4 a_color;
        uniform mat4 u_projection;
        varying vec4 v_color;

        void main() {
          vec2 pos = a_center + a_quad * a_size;
          gl_Position = u_projection * vec4(pos, 0.0, 1.0);
          v_color = a_color;
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
        a_quad: {
          buffer: this.quadBuffer,
          divisor: 0,
        },
        a_center: {
          buffer: this.instanceBuffer,
          divisor: 1,
          offset: 0,
          stride: FLOATS_PER_INSTANCE * 4,
        },
        a_size: {
          buffer: this.instanceBuffer,
          divisor: 1,
          offset: 2 * 4,
          stride: FLOATS_PER_INSTANCE * 4,
        },
        a_color: {
          buffer: this.instanceBuffer,
          divisor: 1,
          offset: 4 * 4,
          stride: FLOATS_PER_INSTANCE * 4,
        },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
      },
      count: 6,
      instances: () => this.visibleCellCount,
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

  /** Set heatmap data. */
  setData(
    columns: HeatmapColumn[],
    columnIntervalMs: number,
    maxLiquidity: number,
    priceBucketSize: number,
  ): void {
    this.columns = columns;
    this.columnIntervalMs = columnIntervalMs;
    this.maxLiquidity = Math.max(1, maxLiquidity);
    this.priceBucketSize = priceBucketSize;
  }

  render(): void {
    if (this.columns.length === 0 || !this.drawCommand) return;
    this.updateVisibleCells();
    if (this.visibleCellCount > 0) {
      this.drawCommand();
    }
  }

  dispose(): void {
    this.quadBuffer?.destroy();
    this.instanceBuffer?.destroy();
    this.quadBuffer = null;
    this.instanceBuffer = null;
    this.drawCommand = null;
  }

  private updateVisibleCells(): void {
    if (this.columns.length === 0 || !this.instanceBuffer) {
      this.visibleCellCount = 0;
      return;
    }

    const { start, end } = this.viewport.getVisibleTimeRange();
    const data = this.instanceData;
    let cellCount = 0;

    // Cell dimensions in pixels
    const cellWidthPx = Math.max(1, this.columnIntervalMs * this.viewport.scaleX);
    const cellHeightPx = Math.max(1, this.priceBucketSize * this.viewport.scaleY);
    const halfInterval = this.columnIntervalMs / 2;
    const halfBucket = this.priceBucketSize / 2;

    for (const col of this.columns) {
      if (col.timestamp + this.columnIntervalMs < start || col.timestamp > end) continue;

      const centerTimePx = this.viewport.dataToPixelX(col.timestamp + halfInterval);

      // Render bid levels (blue/cyan)
      for (const [price, size] of col.bids) {
        if (cellCount >= MAX_CELLS) break;

        const intensity = Math.min(1, size / this.maxLiquidity);
        if (intensity < 0.01) continue;

        const centerPricePx = this.viewport.dataToPixelY(price + halfBucket);

        const offset = cellCount * FLOATS_PER_INSTANCE;
        data[offset] = centerTimePx;
        data[offset + 1] = centerPricePx;
        data[offset + 2] = cellWidthPx;
        data[offset + 3] = cellHeightPx;
        // Bid color: blue-cyan gradient based on intensity
        data[offset + 4] = 0.0;
        data[offset + 5] = 0.2 + intensity * 0.5;
        data[offset + 6] = 0.4 + intensity * 0.6;
        data[offset + 7] = 0.1 + intensity * 0.5;

        cellCount++;
      }

      // Render ask levels (orange/yellow)
      for (const [price, size] of col.asks) {
        if (cellCount >= MAX_CELLS) break;

        const intensity = Math.min(1, size / this.maxLiquidity);
        if (intensity < 0.01) continue;

        const centerPricePx = this.viewport.dataToPixelY(price + halfBucket);

        const offset = cellCount * FLOATS_PER_INSTANCE;
        data[offset] = centerTimePx;
        data[offset + 1] = centerPricePx;
        data[offset + 2] = cellWidthPx;
        data[offset + 3] = cellHeightPx;
        // Ask color: orange-yellow gradient based on intensity
        data[offset + 4] = 0.5 + intensity * 0.5;
        data[offset + 5] = 0.2 + intensity * 0.3;
        data[offset + 6] = 0.0;
        data[offset + 7] = 0.1 + intensity * 0.5;

        cellCount++;
      }
    }

    this.visibleCellCount = cellCount;
    if (cellCount > 0) {
      this.instanceBuffer.subdata(data.subarray(0, cellCount * FLOATS_PER_INSTANCE));
    }
  }
}
