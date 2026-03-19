import REGL from 'regl';
import { BaseRenderer } from '../base-renderer.js';
import type { RGBAColor } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/** A series of connected data points to render as a line. */
export interface LineSeries {
  id: string;
  color: RGBAColor;
  width: number;
  points: { timestamp: number; value: number | null }[];
}

/** Number of floats per line segment instance: x1, y1, x2, y2 */
const FLOATS_PER_SEGMENT = 4;

/** Max segments per draw call. */
const MAX_SEGMENTS = 50_000;

/**
 * Renders indicator lines (SMA, EMA, Bollinger) overlaid on the price chart.
 * Uses instanced quad-extruded line segments for clean rendering at any DPI.
 * Each series is drawn as a separate draw call with its own color.
 */
export class LineOverlayRenderer extends BaseRenderer {
  private allSeries: LineSeries[] = [];

  // GPU resources
  private quadBuffer: REGL.Buffer | null = null;
  private segmentBuffer: REGL.Buffer | null = null;
  private drawCommand: REGL.DrawCommand | null = null;

  // Per-draw-call state
  private currentColor: RGBAColor = [1, 1, 1, 1];
  private currentLineWidth: number = 1.5;
  private currentSegmentCount: number = 0;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
  }

  init(): void {
    const regl = this.ctx.regl;

    // Quad for line segment: 6 vertices forming a rectangle
    // a_quad.x = along-segment (0 or 1), a_quad.y = perpendicular (-0.5 or 0.5)
    // prettier-ignore
    this.quadBuffer = regl.buffer([
      [0.0, -0.5],
      [1.0, -0.5],
      [1.0,  0.5],
      [0.0, -0.5],
      [1.0,  0.5],
      [0.0,  0.5],
    ]);

    this.segmentBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: MAX_SEGMENTS * FLOATS_PER_SEGMENT * 4,
    });

    this.drawCommand = regl({
      vert: `
        attribute vec2 a_quad;
        attribute vec2 a_p1;
        attribute vec2 a_p2;

        uniform mat4 u_projection;
        uniform float u_lineWidth;

        void main() {
          // Direction along the segment
          vec2 dir = a_p2 - a_p1;
          float len = length(dir);
          if (len < 0.001) {
            gl_Position = vec4(-2.0, -2.0, 0.0, 1.0); // offscreen
            return;
          }
          vec2 forward = dir / len;
          // Perpendicular
          vec2 perp = vec2(-forward.y, forward.x);

          // Position along segment + offset perpendicular
          vec2 pos = mix(a_p1, a_p2, a_quad.x) + perp * a_quad.y * u_lineWidth;

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
        a_p1: {
          buffer: this.segmentBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_SEGMENT * 4,
          offset: 0,
        },
        a_p2: {
          buffer: this.segmentBuffer as REGL.Buffer,
          divisor: 1,
          stride: FLOATS_PER_SEGMENT * 4,
          offset: 8,
        },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
        u_color: () => this.currentColor,
        u_lineWidth: () => this.currentLineWidth,
      },
      count: 6,
      instances: () => this.currentSegmentCount,
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
    if (!this.drawCommand || !this.segmentBuffer || this.allSeries.length === 0) return;

    const { start, end } = this.viewport.getVisibleTimeRange();

    for (const series of this.allSeries) {
      const segmentData = this.buildSegments(series.points, start, end);
      if (segmentData.length === 0) continue;

      const segmentCount = segmentData.length / FLOATS_PER_SEGMENT;
      if (segmentCount > MAX_SEGMENTS) continue;

      this.segmentBuffer.subdata(new Float32Array(segmentData));
      this.currentColor = series.color;
      this.currentLineWidth = series.width;
      this.currentSegmentCount = segmentCount;
      this.drawCommand();
    }

    this.isDirty = false;
  }

  dispose(): void {
    if (this.quadBuffer) { this.quadBuffer.destroy(); this.quadBuffer = null; }
    if (this.segmentBuffer) { this.segmentBuffer.destroy(); this.segmentBuffer = null; }
    this.drawCommand = null;
  }

  /** Update the line series data. */
  setSeries(series: LineSeries[]): void {
    this.allSeries = series;
    this.markDirty();
  }

  /**
   * Build line segment float data for a point series within the visible time range.
   * Skips null values (creating gaps in the line).
   */
  private buildSegments(
    points: { timestamp: number; value: number | null }[],
    startTime: number,
    endTime: number
  ): number[] {
    const data: number[] = [];
    const len = points.length;

    // Find visible range via binary search
    let lo = 0;
    let hi = len;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((points[mid] as { timestamp: number; value: number | null }).timestamp < startTime) lo = mid + 1;
      else hi = mid;
    }
    const visStart = Math.max(0, lo - 1);

    lo = visStart;
    hi = len;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((points[mid] as { timestamp: number; value: number | null }).timestamp <= endTime) lo = mid + 1;
      else hi = mid;
    }
    const visEnd = Math.min(len, lo + 1);

    let prevX: number | null = null;
    let prevY: number | null = null;

    for (let i = visStart; i < visEnd; i++) {
      const pt = points[i] as { timestamp: number; value: number | null };
      if (pt.value === null) {
        prevX = null;
        prevY = null;
        continue;
      }

      const px = this.viewport.dataToPixelX(pt.timestamp);
      const py = this.viewport.dataToPixelY(pt.value);

      if (prevX !== null && prevY !== null) {
        data.push(prevX, prevY, px, py);
      }

      prevX = px;
      prevY = py;
    }

    return data;
  }
}
