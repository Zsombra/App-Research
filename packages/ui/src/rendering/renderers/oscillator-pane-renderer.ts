import REGL from 'regl';
import { BaseRenderer } from '../base-renderer.js';
import type { RGBAColor } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/** Configuration for the oscillator pane. */
export interface OscillatorConfig {
  /** Fraction from top where pane starts (e.g. 0.75 = bottom 25%). */
  paneTopFraction: number;
  /** Fraction of canvas height for this pane. */
  paneHeightFraction: number;
  /** Fixed Y-axis minimum (e.g. 0 for RSI). */
  yMin: number;
  /** Fixed Y-axis maximum (e.g. 100 for RSI). */
  yMax: number;
  /** Horizontal reference lines (e.g. [30, 70] for RSI). */
  referenceLines?: number[];
}

/** Line data for oscillator rendering. */
export interface OscillatorLine {
  color: RGBAColor;
  width: number;
  points: { timestamp: number; value: number | null }[];
}

/** Histogram bar data (for MACD). */
export interface HistogramBar {
  timestamp: number;
  value: number;
}

/** Number of floats per line segment. */
const FLOATS_PER_SEGMENT = 4;
const MAX_SEGMENTS = 50_000;

/** Number of floats per histogram bar instance. */
const HIST_FLOATS_PER_INSTANCE = 3; // centerX, height (signed), barWidth

/**
 * Renders oscillator indicators (RSI, MACD) in a separate pane
 * at the bottom of the chart canvas.
 */
export class OscillatorPaneRenderer extends BaseRenderer {
  private config: OscillatorConfig = {
    paneTopFraction: 0.75,
    paneHeightFraction: 0.25,
    yMin: 0,
    yMax: 100,
  };
  private lines: OscillatorLine[] = [];
  private histogram: HistogramBar[] = [];

  // Line GPU resources
  private lineQuadBuffer: REGL.Buffer | null = null;
  private lineSegmentBuffer: REGL.Buffer | null = null;
  private drawLineCommand: REGL.DrawCommand | null = null;
  private currentColor: RGBAColor = [1, 1, 1, 1];
  private currentLineWidth: number = 1.5;
  private currentSegmentCount: number = 0;

  // Histogram GPU resources
  private histQuadBuffer: REGL.Buffer | null = null;
  private histInstanceBuffer: REGL.Buffer | null = null;
  private drawHistCommand: REGL.DrawCommand | null = null;
  private histVisibleCount: number = 0;

  // Reference line GPU resources
  private drawRefLineCommand: REGL.DrawCommand | null = null;
  private refLineBuffer: REGL.Buffer | null = null;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
  }

  init(): void {
    const regl = this.ctx.regl;

    // --- Line rendering (same technique as LineOverlayRenderer) ---
    // prettier-ignore
    this.lineQuadBuffer = regl.buffer([
      [0.0, -0.5], [1.0, -0.5], [1.0, 0.5],
      [0.0, -0.5], [1.0,  0.5], [0.0, 0.5],
    ]);

    this.lineSegmentBuffer = regl.buffer({
      usage: 'dynamic', type: 'float',
      length: MAX_SEGMENTS * FLOATS_PER_SEGMENT * 4,
    });

    this.drawLineCommand = regl({
      vert: `
        attribute vec2 a_quad;
        attribute vec2 a_p1;
        attribute vec2 a_p2;
        uniform mat4 u_projection;
        uniform float u_lineWidth;
        void main() {
          vec2 dir = a_p2 - a_p1;
          float len = length(dir);
          if (len < 0.001) { gl_Position = vec4(-2.0, -2.0, 0.0, 1.0); return; }
          vec2 forward = dir / len;
          vec2 perp = vec2(-forward.y, forward.x);
          vec2 pos = mix(a_p1, a_p2, a_quad.x) + perp * a_quad.y * u_lineWidth;
          gl_Position = u_projection * vec4(pos, 0.0, 1.0);
        }
      `,
      frag: `
        precision mediump float;
        uniform vec4 u_color;
        void main() { gl_FragColor = u_color; }
      `,
      attributes: {
        a_quad: { buffer: this.lineQuadBuffer as REGL.Buffer, divisor: 0 },
        a_p1: { buffer: this.lineSegmentBuffer as REGL.Buffer, divisor: 1, stride: FLOATS_PER_SEGMENT * 4, offset: 0 },
        a_p2: { buffer: this.lineSegmentBuffer as REGL.Buffer, divisor: 1, stride: FLOATS_PER_SEGMENT * 4, offset: 8 },
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
        func: { srcRGB: 'src alpha', srcAlpha: 'one', dstRGB: 'one minus src alpha', dstAlpha: 'one minus src alpha' },
      },
      depth: { enable: false },
    });

    // --- Histogram rendering (for MACD) ---
    // prettier-ignore
    this.histQuadBuffer = regl.buffer([
      [-0.5, 0.0], [0.5, 0.0], [0.5, 1.0],
      [-0.5, 0.0], [0.5, 1.0], [-0.5, 1.0],
    ]);

    this.histInstanceBuffer = regl.buffer({
      usage: 'dynamic', type: 'float',
      length: MAX_SEGMENTS * HIST_FLOATS_PER_INSTANCE * 4,
    });

    this.drawHistCommand = regl({
      vert: `
        attribute vec2 a_quad;
        attribute float a_centerX;
        attribute float a_height;
        attribute float a_barWidth;
        uniform mat4 u_projection;
        uniform float u_zeroY;
        void main() {
          vec2 pos = vec2(
            a_centerX + a_quad.x * a_barWidth,
            u_zeroY - a_quad.y * a_height
          );
          gl_Position = u_projection * vec4(pos, 0.0, 1.0);
        }
      `,
      frag: `
        precision mediump float;
        uniform vec4 u_color;
        void main() { gl_FragColor = u_color; }
      `,
      attributes: {
        a_quad: { buffer: this.histQuadBuffer as REGL.Buffer, divisor: 0 },
        a_centerX: { buffer: this.histInstanceBuffer as REGL.Buffer, divisor: 1, stride: HIST_FLOATS_PER_INSTANCE * 4, offset: 0 },
        a_height: { buffer: this.histInstanceBuffer as REGL.Buffer, divisor: 1, stride: HIST_FLOATS_PER_INSTANCE * 4, offset: 4 },
        a_barWidth: { buffer: this.histInstanceBuffer as REGL.Buffer, divisor: 1, stride: HIST_FLOATS_PER_INSTANCE * 4, offset: 8 },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
        u_zeroY: () => this.valueToPixelY(0),
        u_color: () => this.currentColor,
      },
      count: 6,
      instances: () => this.histVisibleCount,
      blend: {
        enable: true,
        func: { srcRGB: 'src alpha', srcAlpha: 'one', dstRGB: 'one minus src alpha', dstAlpha: 'one minus src alpha' },
      },
      depth: { enable: false },
    });

    // --- Reference line rendering ---
    this.refLineBuffer = regl.buffer({
      usage: 'dynamic', type: 'float', length: 4 * 4, // 2 vertices * 2 floats
    });

    this.drawRefLineCommand = regl({
      vert: `
        attribute vec2 a_pos;
        uniform mat4 u_projection;
        void main() { gl_Position = u_projection * vec4(a_pos, 0.0, 1.0); }
      `,
      frag: `
        precision mediump float;
        void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 0.12); }
      `,
      attributes: {
        a_pos: { buffer: this.refLineBuffer as REGL.Buffer },
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
      },
      count: 2,
      primitive: 'lines',
      depth: { enable: false },
      blend: {
        enable: true,
        func: { srcRGB: 'src alpha', srcAlpha: 'one', dstRGB: 'one minus src alpha', dstAlpha: 'one minus src alpha' },
      },
    });
  }

  render(): void {
    if (this.lines.length === 0 && this.histogram.length === 0) return;

    // Draw pane background (subtle separator)
    // Reference lines first
    this.renderReferenceLines();

    // Draw histogram (MACD)
    this.renderHistogram();

    // Draw lines
    this.renderLines();

    this.isDirty = false;
  }

  dispose(): void {
    for (const buf of [this.lineQuadBuffer, this.lineSegmentBuffer, this.histQuadBuffer, this.histInstanceBuffer, this.refLineBuffer]) {
      if (buf) buf.destroy();
    }
    this.lineQuadBuffer = null;
    this.lineSegmentBuffer = null;
    this.histQuadBuffer = null;
    this.histInstanceBuffer = null;
    this.refLineBuffer = null;
    this.drawLineCommand = null;
    this.drawHistCommand = null;
    this.drawRefLineCommand = null;
  }

  setConfig(config: OscillatorConfig): void {
    this.config = config;
    this.markDirty();
  }

  setLines(lines: OscillatorLine[]): void {
    this.lines = lines;
    this.markDirty();
  }

  setHistogram(data: HistogramBar[]): void {
    this.histogram = data;
    this.markDirty();
  }

  /** Get the reference line Y positions for HTML labels. */
  getReferenceLinePositions(): { value: number; pixelY: number }[] {
    if (!this.config.referenceLines) return [];
    const dpr = this.ctx.pixelRatio;
    return this.config.referenceLines.map((val) => ({
      value: val,
      pixelY: this.valueToPixelY(val) / dpr,
    }));
  }

  /** Convert an oscillator value to pixel Y within the pane. */
  private valueToPixelY(value: number): number {
    const canvasH = this.viewport.canvasHeight;
    const paneTop = canvasH * this.config.paneTopFraction;
    const paneH = canvasH * this.config.paneHeightFraction;
    const fraction = (value - this.config.yMin) / (this.config.yMax - this.config.yMin);
    return paneTop + paneH - fraction * paneH;
  }

  private renderReferenceLines(): void {
    if (!this.drawRefLineCommand || !this.refLineBuffer || !this.config.referenceLines) return;

    const w = this.viewport.canvasWidth;
    for (const refVal of this.config.referenceLines) {
      const y = this.valueToPixelY(refVal);
      this.refLineBuffer.subdata(new Float32Array([0, y, w, y]));
      this.drawRefLineCommand();
    }
  }

  private renderLines(): void {
    if (!this.drawLineCommand || !this.lineSegmentBuffer) return;

    const { start, end } = this.viewport.getVisibleTimeRange();

    for (const line of this.lines) {
      const segData = this.buildLineSegments(line.points, start, end);
      if (segData.length === 0) continue;

      const count = segData.length / FLOATS_PER_SEGMENT;
      this.lineSegmentBuffer.subdata(new Float32Array(segData));
      this.currentColor = line.color;
      this.currentLineWidth = line.width;
      this.currentSegmentCount = count;
      this.drawLineCommand();
    }
  }

  private renderHistogram(): void {
    if (!this.drawHistCommand || !this.histInstanceBuffer || this.histogram.length === 0) return;

    const { start, end } = this.viewport.getVisibleTimeRange();
    const data: number[] = [];
    const barWidth = 4;

    for (const bar of this.histogram) {
      if (bar.timestamp < start || bar.timestamp > end) continue;
      const px = this.viewport.dataToPixelX(bar.timestamp);
      const height = this.valueToPixelY(0) - this.valueToPixelY(bar.value);
      data.push(px, height, barWidth);
    }

    if (data.length === 0) return;

    this.histVisibleCount = data.length / HIST_FLOATS_PER_INSTANCE;
    this.histInstanceBuffer.subdata(new Float32Array(data));
    // Green for positive, red for negative — use green as default
    this.currentColor = [0.173, 0.714, 0.463, 0.6];
    this.drawHistCommand();
  }

  private buildLineSegments(
    points: { timestamp: number; value: number | null }[],
    startTime: number,
    endTime: number
  ): number[] {
    const data: number[] = [];
    const len = points.length;

    // Binary search for visible start
    let lo = 0;
    let hi = len;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (points[mid]!.timestamp < startTime) lo = mid + 1;
      else hi = mid;
    }
    const visStart = Math.max(0, lo - 1);

    lo = visStart;
    hi = len;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (points[mid]!.timestamp <= endTime) lo = mid + 1;
      else hi = mid;
    }
    const visEnd = Math.min(len, lo + 1);

    let prevX: number | null = null;
    let prevY: number | null = null;

    for (let i = visStart; i < visEnd; i++) {
      const pt = points[i]!;
      if (pt.value === null) { prevX = null; prevY = null; continue; }

      const px = this.viewport.dataToPixelX(pt.timestamp);
      const py = this.valueToPixelY(pt.value);

      if (prevX !== null && prevY !== null) {
        data.push(prevX, prevY, px, py);
      }

      prevX = px;
      prevY = py;
    }

    return data;
  }
}
