import REGL from 'regl';
import type { FootprintCandle, FootprintDisplayMode } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/**
 * Floats per footprint cell instance:
 * centerX, centerY, width, height, r, g, b, a
 */
const FLOATS_PER_INSTANCE = 8;

/** Maximum number of footprint cells to render. */
const MAX_CELLS = 100_000;

/**
 * WebGL renderer for footprint chart cells.
 * Each cell represents buy/sell volume at a specific price level within a candle.
 * Cell color represents delta (buy - sell): green for positive, red for negative.
 * Cell opacity represents volume intensity.
 */
export class FootprintRenderer extends BaseRenderer {
  private footprints: FootprintCandle[] = [];
  private candleWidthMs: number = 60_000;
  private displayMode: FootprintDisplayMode = 'delta';

  private quadBuffer: REGL.Buffer | null = null;
  private instanceBuffer: REGL.Buffer | null = null;
  private drawCommand: REGL.DrawCommand | null = null;

  private instanceData: Float32Array;
  private visibleCellCount: number = 0;

  /** Global max volume across all visible cells for normalization. */
  private globalMaxVolume: number = 1;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
    this.instanceData = new Float32Array(MAX_CELLS * FLOATS_PER_INSTANCE);
  }

  init(): void {
    const regl = this.ctx.regl;

    // Unit quad (6 vertices, 2 triangles)
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

  /** Set footprint data and candle interval. */
  setData(footprints: FootprintCandle[], candleWidthMs: number, displayMode?: FootprintDisplayMode): void {
    this.footprints = footprints;
    this.candleWidthMs = candleWidthMs;
    if (displayMode !== undefined) this.displayMode = displayMode;
    this.updateVisibleCells();
  }

  /** Update display mode without changing data. */
  setDisplayMode(mode: FootprintDisplayMode): void {
    this.displayMode = mode;
    this.updateVisibleCells();
  }

  render(): void {
    if (this.visibleCellCount === 0 || !this.drawCommand) return;
    this.updateVisibleCells();
    this.drawCommand();
  }

  dispose(): void {
    this.quadBuffer?.destroy();
    this.instanceBuffer?.destroy();
    this.quadBuffer = null;
    this.instanceBuffer = null;
    this.drawCommand = null;
  }

  private updateVisibleCells(): void {
    if (this.footprints.length === 0 || !this.instanceBuffer) {
      this.visibleCellCount = 0;
      return;
    }

    const { start, end } = this.viewport.getVisibleTimeRange();
    const data = this.instanceData;
    let cellCount = 0;

    // Find global max for opacity normalization
    this.globalMaxVolume = 1;
    for (const fp of this.footprints) {
      if (fp.timestamp + this.candleWidthMs < start || fp.timestamp > end) continue;
      if (fp.maxLevelVolume > this.globalMaxVolume) {
        this.globalMaxVolume = fp.maxLevelVolume;
      }
    }

    // Cell width in pixels: use 80% of candle slot
    const cellWidthPx = Math.max(2, this.candleWidthMs * this.viewport.scaleX * 0.8);
    const halfCandleMs = this.candleWidthMs / 2;

    for (const fp of this.footprints) {
      if (fp.timestamp + this.candleWidthMs < start || fp.timestamp > end) continue;

      const centerTimePx = this.viewport.dataToPixelX(fp.timestamp + halfCandleMs);

      for (const level of fp.levels) {
        if (cellCount >= MAX_CELLS) break;

        const totalVol = level.buyVolume + level.sellVolume;
        if (totalVol <= 0) continue;

        const centerPricePx = this.viewport.dataToPixelY(level.price + fp.tickSize / 2);
        const cellHeightPx = Math.max(1, fp.tickSize * this.viewport.scaleY);

        const delta = level.buyVolume - level.sellVolume;
        const intensity = Math.min(1, totalVol / this.globalMaxVolume);

        let r: number, g: number, b: number;

        switch (this.displayMode) {
          case 'bid-ask': {
            // Bid side (sell) = red tint, Ask side (buy) = green tint
            // Color based on which side dominates
            const buyRatio = level.buyVolume / totalVol;
            if (buyRatio > 0.6) {
              r = 0.173; g = 0.714; b = 0.463; // green (ask-dominant)
            } else if (buyRatio < 0.4) {
              r = 0.914; g = 0.278; b = 0.278; // red (bid-dominant)
            } else {
              r = 0.6; g = 0.6; b = 0.2; // yellow (balanced)
            }
            break;
          }
          case 'total-volume': {
            // Single color (blue-purple) with intensity based on volume
            r = 0.388; g = 0.400; b = 0.753;
            break;
          }
          case 'bid-ask-delta': {
            // Bid|Ask layout with delta gradient coloring
            const normalizedDelta = this.globalMaxVolume > 0 ? delta / this.globalMaxVolume : 0;
            if (normalizedDelta >= 0) {
              r = 0.173; g = 0.4 + 0.314 * Math.min(1, normalizedDelta * 2); b = 0.463;
            } else {
              r = 0.914; g = 0.278 * (1 + normalizedDelta); b = 0.278;
            }
            break;
          }
          case 'delta':
          default: {
            // Original delta coloring: positive = green, negative = red
            if (delta >= 0) {
              r = 0.173; g = 0.714; b = 0.463;
            } else {
              r = 0.914; g = 0.278; b = 0.278;
            }
            break;
          }
        }

        // Alpha based on volume intensity
        const alpha = 0.15 + intensity * 0.7;

        const offset = cellCount * FLOATS_PER_INSTANCE;
        data[offset] = centerTimePx;
        data[offset + 1] = centerPricePx;
        data[offset + 2] = cellWidthPx;
        data[offset + 3] = cellHeightPx;
        data[offset + 4] = r;
        data[offset + 5] = g;
        data[offset + 6] = b;
        data[offset + 7] = alpha;

        cellCount++;
      }
    }

    this.visibleCellCount = cellCount;
    if (cellCount > 0) {
      this.instanceBuffer.subdata(data.subarray(0, cellCount * FLOATS_PER_INSTANCE));
    }
  }
}
