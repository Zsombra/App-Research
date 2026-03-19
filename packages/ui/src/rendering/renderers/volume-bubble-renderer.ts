import REGL from 'regl';
import type { NormalizedTrade } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/**
 * Floats per bubble instance:
 * centerX, centerY, radius, r, g, b, a
 */
const FLOATS_PER_INSTANCE = 7;

/** Maximum number of bubbles to render. */
const MAX_BUBBLES = 10_000;

/** Number of vertices per circle approximation. */
const CIRCLE_SEGMENTS = 16;

/** Minimum bubble radius in pixels. */
const BUBBLE_RADIUS_MIN = 3;
/** Maximum additional radius based on trade size. */
const BUBBLE_RADIUS_RANGE = 17;
/** Minimum bubble alpha. */
const BUBBLE_ALPHA_MIN = 0.3;
/** Alpha range added proportionally to trade size. */
const BUBBLE_ALPHA_RANGE = 0.4;

/** Buy bubble color (green). */
const BUBBLE_COLOR_BUY = { r: 0.173, g: 0.714, b: 0.463 } as const;
/** Sell bubble color (red). */
const BUBBLE_COLOR_SELL = { r: 0.914, g: 0.278, b: 0.278 } as const;

/**
 * Renders volume bubbles on the chart.
 * Each trade above a threshold is shown as a circle sized by volume.
 * Buy trades are green, sell trades are red.
 * Larger trades get bigger, more opaque bubbles.
 */
export class VolumeBubbleRenderer extends BaseRenderer {
  private trades: NormalizedTrade[] = [];
  private minTradeSize: number = 0;

  private circleBuffer: REGL.Buffer | null = null;
  private instanceBuffer: REGL.Buffer | null = null;
  private drawCommand: REGL.DrawCommand | null = null;

  private instanceData: Float32Array;
  private visibleBubbleCount: number = 0;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
    this.instanceData = new Float32Array(MAX_BUBBLES * FLOATS_PER_INSTANCE);
  }

  init(): void {
    const regl = this.ctx.regl;

    // Unit circle vertices (triangle fan)
    const circleVerts: number[] = [];
    for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
      const a1 = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      const a2 = ((i + 1) / CIRCLE_SEGMENTS) * Math.PI * 2;
      // Triangle from center to two edge points
      circleVerts.push(0, 0);
      circleVerts.push(Math.cos(a1), Math.sin(a1));
      circleVerts.push(Math.cos(a2), Math.sin(a2));
    }
    this.circleBuffer = regl.buffer(new Float32Array(circleVerts));

    this.instanceBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: MAX_BUBBLES * FLOATS_PER_INSTANCE * 4,
    });

    this.drawCommand = regl({
      vert: `
        precision highp float;
        attribute vec2 a_circle;
        attribute vec2 a_center;
        attribute float a_radius;
        attribute vec4 a_color;
        uniform mat4 u_projection;
        varying vec4 v_color;

        void main() {
          vec2 pos = a_center + a_circle * a_radius;
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
        a_circle: {
          buffer: this.circleBuffer,
          divisor: 0,
        },
        a_center: {
          buffer: this.instanceBuffer,
          divisor: 1,
          offset: 0,
          stride: FLOATS_PER_INSTANCE * 4,
        },
        a_radius: {
          buffer: this.instanceBuffer,
          divisor: 1,
          offset: 2 * 4,
          stride: FLOATS_PER_INSTANCE * 4,
        },
        a_color: {
          buffer: this.instanceBuffer,
          divisor: 1,
          offset: 3 * 4,
          stride: FLOATS_PER_INSTANCE * 4,
        },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
      },
      count: CIRCLE_SEGMENTS * 3,
      instances: () => this.visibleBubbleCount,
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

  /** Set trade data and minimum trade size for bubble display. */
  setData(trades: NormalizedTrade[], minTradeSize: number = 0): void {
    this.trades = trades;
    this.minTradeSize = minTradeSize;
  }

  render(): void {
    if (this.trades.length === 0 || !this.drawCommand) return;
    this.updateVisibleBubbles();
    if (this.visibleBubbleCount > 0) {
      this.drawCommand();
    }
  }

  dispose(): void {
    this.circleBuffer?.destroy();
    this.instanceBuffer?.destroy();
    this.circleBuffer = null;
    this.instanceBuffer = null;
    this.drawCommand = null;
  }

  private updateVisibleBubbles(): void {
    if (this.trades.length === 0 || !this.instanceBuffer) {
      this.visibleBubbleCount = 0;
      return;
    }

    const { start, end } = this.viewport.getVisibleTimeRange();
    const data = this.instanceData;
    let count = 0;

    // Find max trade size for normalization
    let maxSize = 0;
    for (const trade of this.trades) {
      if (trade.amount > maxSize) maxSize = trade.amount;
    }
    if (maxSize === 0) maxSize = 1;

    for (const trade of this.trades) {
      if (count >= MAX_BUBBLES) break;
      if (trade.timestamp < start || trade.timestamp > end) continue;
      if (trade.amount < this.minTradeSize) continue;

      const cx = this.viewport.dataToPixelX(trade.timestamp);
      const cy = this.viewport.dataToPixelY(trade.price);

      const sizeNorm = Math.sqrt(trade.amount / maxSize);
      const radius = BUBBLE_RADIUS_MIN + sizeNorm * BUBBLE_RADIUS_RANGE;

      const isBuy = trade.side === 'buy';
      const color = isBuy ? BUBBLE_COLOR_BUY : BUBBLE_COLOR_SELL;
      const alpha = BUBBLE_ALPHA_MIN + sizeNorm * BUBBLE_ALPHA_RANGE;

      const offset = count * FLOATS_PER_INSTANCE;
      data[offset] = cx;
      data[offset + 1] = cy;
      data[offset + 2] = radius;
      data[offset + 3] = color.r;
      data[offset + 4] = color.g;
      data[offset + 5] = color.b;
      data[offset + 6] = alpha;

      count++;
    }

    this.visibleBubbleCount = count;
    if (count > 0) {
      this.instanceBuffer.subdata(data.subarray(0, count * FLOATS_PER_INSTANCE));
    }
  }
}
