import REGL from 'regl';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/** Information about a single horizontal grid line. */
export interface HorizontalGridLine {
  /** Price value at this line */
  price: number;
  /** Pixel Y coordinate */
  y: number;
}

/** Information about a single vertical grid line. */
export interface VerticalGridLine {
  /** Timestamp at this line */
  time: number;
  /** Pixel X coordinate */
  x: number;
}

/** Grid information for HTML overlay labels. */
export interface GridInfo {
  horizontalLines: HorizontalGridLine[];
  verticalLines: VerticalGridLine[];
}

/** Candidate intervals for the price axis nice numbers. */
const PRICE_INTERVALS = [
  0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5,
  1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500,
  1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000,
];

/** Candidate intervals for the time axis (in milliseconds). */
const TIME_INTERVALS = [
  1_000,             // 1s
  5_000,             // 5s
  15_000,            // 15s
  30_000,            // 30s
  60_000,            // 1m
  5 * 60_000,        // 5m
  15 * 60_000,       // 15m
  30 * 60_000,       // 30m
  60 * 60_000,       // 1h
  4 * 60 * 60_000,   // 4h
  24 * 60 * 60_000,  // 1d
];

/** Minimum pixel spacing between horizontal grid lines / price labels. */
const MIN_PRICE_TICK_SPACING_PX = 40;

/** Minimum pixel spacing between vertical grid lines / time labels. */
const MIN_TIME_TICK_SPACING_PX = 80;

/**
 * Renders background grid lines using simple line primitives.
 * Grid lines are computed from the viewport — not stored data.
 * Price/time labels are rendered as HTML overlays by the React component.
 */
export class GridRenderer extends BaseRenderer {
  private drawCommand: REGL.DrawCommand | null = null;
  private positionBuffer: REGL.Buffer | null = null;
  private vertexCount: number = 0;
  private cachedGridInfo: GridInfo = { horizontalLines: [], verticalLines: [] };

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
  }

  /**
   * Initialize regl command and buffer for grid line rendering.
   */
  init(): void {
    const regl = this.ctx.regl;

    this.positionBuffer = regl.buffer({
      usage: 'dynamic',
      type: 'float',
      length: 4096, // pre-allocate reasonable size
    });

    this.drawCommand = regl({
      vert: `
        attribute vec2 a_position;
        uniform mat4 u_projection;
        void main() {
          gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
        }
      `,
      frag: `
        precision mediump float;
        uniform vec4 u_gridColor;
        void main() {
          gl_FragColor = u_gridColor;
        }
      `,
      attributes: {
        a_position: this.positionBuffer as REGL.Buffer,
      },
      uniforms: {
        u_projection: () => this.viewport.getProjectionMatrix(),
        u_gridColor: () => this.getThemeColors().grid,
      },
      count: () => this.vertexCount,
      primitive: 'lines',
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

  /**
   * Compute grid lines and render them.
   */
  render(): void {
    if (!this.drawCommand || !this.positionBuffer) return;

    this.computeGrid();

    if (this.vertexCount > 0) {
      this.drawCommand();
    }

    this.isDirty = false;
  }

  /**
   * Free GPU resources.
   */
  dispose(): void {
    if (this.positionBuffer) {
      this.positionBuffer.destroy();
      this.positionBuffer = null;
    }
    this.drawCommand = null;
  }

  /**
   * Get grid line positions for HTML overlay label rendering.
   * @returns Grid info with horizontal and vertical line positions
   */
  getGridInfo(): GridInfo {
    return this.cachedGridInfo;
  }

  /** Compute grid line positions from the current viewport. */
  private computeGrid(): void {
    const { low: priceLow, high: priceHigh } = this.viewport.getVisiblePriceRange();
    const { start: timeStart, end: timeEnd } = this.viewport.getVisibleTimeRange();

    const horizontalLines: HorizontalGridLine[] = [];
    const verticalLines: VerticalGridLine[] = [];

    // --- Price axis (horizontal lines) ---
    const priceRange = priceHigh - priceLow;
    const targetPriceTicks = Math.max(
      1,
      Math.floor(this.viewport.canvasHeight / MIN_PRICE_TICK_SPACING_PX)
    );
    const rawPriceInterval = priceRange / targetPriceTicks;
    const priceInterval = findNiceInterval(rawPriceInterval, PRICE_INTERVALS);

    if (priceInterval > 0) {
      const firstPriceTick = Math.ceil(priceLow / priceInterval) * priceInterval;
      for (let price = firstPriceTick; price <= priceHigh; price += priceInterval) {
        const y = this.viewport.dataToPixelY(price);
        horizontalLines.push({ price, y });
      }
    }

    // --- Time axis (vertical lines) ---
    const timeRange = timeEnd - timeStart;
    const targetTimeTicks = Math.max(
      1,
      Math.floor(this.viewport.canvasWidth / MIN_TIME_TICK_SPACING_PX)
    );
    const rawTimeInterval = timeRange / targetTimeTicks;
    const timeInterval = findNiceInterval(rawTimeInterval, TIME_INTERVALS);

    if (timeInterval > 0) {
      const firstTimeTick = Math.ceil(timeStart / timeInterval) * timeInterval;
      for (let time = firstTimeTick; time <= timeEnd; time += timeInterval) {
        const x = this.viewport.dataToPixelX(time);
        verticalLines.push({ time, x });
      }
    }

    this.cachedGridInfo = { horizontalLines, verticalLines };

    // Build vertex buffer: each line = 2 vertices (x, y)
    const totalLines = horizontalLines.length + verticalLines.length;
    this.vertexCount = totalLines * 2;

    if (this.vertexCount === 0) return;

    const data = new Float32Array(this.vertexCount * 2);
    let offset = 0;

    // Horizontal lines span full canvas width
    for (const line of horizontalLines) {
      data[offset++] = 0;
      data[offset++] = line.y;
      data[offset++] = this.viewport.canvasWidth;
      data[offset++] = line.y;
    }

    // Vertical lines span full canvas height
    for (const line of verticalLines) {
      data[offset++] = line.x;
      data[offset++] = 0;
      data[offset++] = line.x;
      data[offset++] = this.viewport.canvasHeight;
    }

    this.positionBuffer!.subdata(data);
  }
}

/**
 * Find the smallest candidate interval >= rawInterval.
 * Falls back to the largest candidate if none match.
 */
function findNiceInterval(rawInterval: number, candidates: number[]): number {
  for (const c of candidates) {
    if (c >= rawInterval) return c;
  }
  // If raw interval is larger than all candidates, scale up the largest
  const largest = candidates[candidates.length - 1];
  if (largest === undefined || largest <= 0) return rawInterval;
  const multiplier = Math.ceil(rawInterval / largest);
  return largest * multiplier;
}
