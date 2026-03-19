import type { OHLCVCandle } from '@terminal/types';

/** Minimum horizontal scale (pixels per ms) to prevent extreme zoom-out. */
const MIN_SCALE_X = 1e-8;
/** Maximum horizontal scale (pixels per ms) to prevent extreme zoom-in. */
const MAX_SCALE_X = 1;
/** Minimum vertical scale (pixels per price unit) to prevent extreme zoom-out. */
const MIN_SCALE_Y = 1e-6;
/** Maximum vertical scale (pixels per price unit) to prevent extreme zoom-in. */
const MAX_SCALE_Y = 1e6;

/**
 * Maps between data coordinates (time, price) and pixel coordinates.
 * Supports pan and zoom operations. Generates orthographic projection
 * matrices for WebGL rendering.
 *
 * Coordinate spaces:
 * - Data space: (timestamp ms, price float) — raw domain values
 * - Pixel space: (px from canvas top-left) — CSS/DOM coordinates
 * - Clip space: ([-1,+1] on both axes) — WebGL NDC
 */
export class ViewportTransform {
  /** Leftmost visible time in unix ms (time at pixel x=0) */
  private _originX: number;
  /** Bottommost visible price (price at pixel y=canvasHeight) */
  private _originY: number;
  /** Pixels per millisecond (horizontal zoom) */
  private _scaleX: number;
  /** Pixels per price unit (vertical zoom, positive = up) */
  private _scaleY: number;
  /** Canvas width in physical pixels */
  private _canvasWidth: number;
  /** Canvas height in physical pixels */
  private _canvasHeight: number;

  constructor(config: { canvasWidth: number; canvasHeight: number }) {
    this._canvasWidth = config.canvasWidth;
    this._canvasHeight = config.canvasHeight;
    // Sensible defaults — will be overwritten by fitToData
    this._originX = 0;
    this._originY = 0;
    this._scaleX = 1.667e-4; // ~10px per minute candle
    this._scaleY = 1;
  }

  /** Canvas width in physical pixels */
  get canvasWidth(): number {
    return this._canvasWidth;
  }

  /** Canvas height in physical pixels */
  get canvasHeight(): number {
    return this._canvasHeight;
  }

  /** Current horizontal scale (pixels per millisecond) */
  get scaleX(): number {
    return this._scaleX;
  }

  /** Current vertical scale (pixels per price unit) */
  get scaleY(): number {
    return this._scaleY;
  }

  /** Current time origin (leftmost visible time in unix ms) */
  get originX(): number {
    return this._originX;
  }

  /** Current price origin (bottommost visible price) */
  get originY(): number {
    return this._originY;
  }

  /**
   * Convert a timestamp in unix ms to pixel-space X coordinate.
   * @param timeMs - Unix timestamp in milliseconds
   * @returns Pixel X coordinate from left edge of canvas
   */
  dataToPixelX(timeMs: number): number {
    return (timeMs - this._originX) * this._scaleX;
  }

  /**
   * Convert a price to pixel-space Y coordinate.
   * Price increases upward; pixel Y increases downward.
   * @param price - Price value
   * @returns Pixel Y coordinate from top edge of canvas
   */
  dataToPixelY(price: number): number {
    // priceOrigin is the bottom price, so:
    // bottom of canvas = canvasHeight, top = 0
    // price at bottom = originY, price at top = originY + canvasHeight/scaleY
    return this._canvasHeight - (price - this._originY) * this._scaleY;
  }

  /**
   * Convert pixel-space X coordinate to a timestamp in unix ms.
   * @param px - Pixel X coordinate
   * @returns Unix timestamp in milliseconds
   */
  pixelToDataX(px: number): number {
    return this._originX + px / this._scaleX;
  }

  /**
   * Convert pixel-space Y coordinate to a price.
   * @param py - Pixel Y coordinate from top
   * @returns Price value
   */
  pixelToDataY(py: number): number {
    return this._originY + (this._canvasHeight - py) / this._scaleY;
  }

  /**
   * Get the visible time range based on current viewport.
   * @returns Object with start and end timestamps in unix ms
   */
  getVisibleTimeRange(): { start: number; end: number } {
    return {
      start: this.pixelToDataX(0),
      end: this.pixelToDataX(this._canvasWidth),
    };
  }

  /**
   * Get the visible price range based on current viewport.
   * @returns Object with low and high price values
   */
  getVisiblePriceRange(): { low: number; high: number } {
    return {
      low: this.pixelToDataY(this._canvasHeight),
      high: this.pixelToDataY(0),
    };
  }

  /**
   * Pan the viewport by a pixel delta.
   * Positive deltaPixelX moves the view to the right (shows earlier data).
   * Positive deltaPixelY moves the view down (shows higher prices).
   * @param deltaPixelX - Horizontal pan in pixels
   * @param deltaPixelY - Vertical pan in pixels
   */
  pan(deltaPixelX: number, deltaPixelY: number): void {
    this._originX -= deltaPixelX / this._scaleX;
    this._originY += deltaPixelY / this._scaleY;
  }

  /**
   * Zoom the viewport around a center point in pixel coordinates.
   * Factor > 1 zooms in, factor < 1 zooms out.
   * @param factor - Zoom factor
   * @param centerPixelX - X coordinate of zoom center in pixels
   * @param centerPixelY - Y coordinate of zoom center in pixels
   */
  zoom(factor: number, centerPixelX: number, centerPixelY: number): void {
    // Convert center to data coordinates before zoom
    const centerTime = this.pixelToDataX(centerPixelX);
    const centerPrice = this.pixelToDataY(centerPixelY);

    // Apply zoom to scale
    this._scaleX *= factor;
    this._scaleY *= factor;

    // Clamp scales to prevent extreme zoom
    this._scaleX = Math.max(MIN_SCALE_X, Math.min(MAX_SCALE_X, this._scaleX));
    this._scaleY = Math.max(MIN_SCALE_Y, Math.min(MAX_SCALE_Y, this._scaleY));

    // Adjust origin so the center point stays in the same pixel position
    this._originX = centerTime - centerPixelX / this._scaleX;
    this._originY = centerPrice - (this._canvasHeight - centerPixelY) / this._scaleY;
  }

  /**
   * Fit the viewport to show all provided candles with optional padding.
   * @param candles - Array of OHLCV candles to fit
   * @param paddingPercent - Percentage of padding to add (default 5%)
   */
  fitToData(candles: readonly OHLCVCandle[], paddingPercent: number = 0.05): void {
    if (candles.length === 0) return;

    let minTime = Infinity;
    let maxTime = -Infinity;
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const c of candles) {
      if (c.timestamp < minTime) minTime = c.timestamp;
      if (c.timestamp > maxTime) maxTime = c.timestamp;
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    // Add time padding: add one candle width on each side
    const timeRange = maxTime - minTime;
    const timePadding = timeRange > 0 ? timeRange * paddingPercent : 60_000;
    minTime -= timePadding;
    maxTime += timePadding;

    // Add price padding
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange > 0 ? priceRange * paddingPercent : 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    // Compute scales
    const adjustedTimeRange = maxTime - minTime;
    const adjustedPriceRange = maxPrice - minPrice;

    this._scaleX = adjustedTimeRange > 0 ? this._canvasWidth / adjustedTimeRange : 1.667e-4;
    this._scaleY = adjustedPriceRange > 0 ? this._canvasHeight / adjustedPriceRange : 1;

    // Set origins
    this._originX = minTime;
    this._originY = minPrice;
  }

  /**
   * Update canvas dimensions (e.g., on resize).
   * @param width - New canvas width in physical pixels
   * @param height - New canvas height in physical pixels
   */
  resize(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
  }

  /**
   * Generate a 4x4 orthographic projection matrix for WebGL.
   * Maps pixel space to clip space [-1, +1].
   * Column-major order for GLSL mat4 consumption.
   * @returns Float32Array of 16 elements (4x4 matrix, column-major)
   */
  getProjectionMatrix(): Float32Array {
    const w = this._canvasWidth;
    const h = this._canvasHeight;

    // Orthographic projection: pixel space → clip space
    // X: [0, W] → [-1, +1]  →  scaleX = 2/W, transX = -1
    // Y: [0, H] → [+1, -1]  →  scaleY = -2/H, transY = +1 (flip Y)
    const sx = 2 / w;
    const sy = -2 / h;
    const tx = -1;
    const ty = 1;

    // Column-major 4x4 matrix
    // prettier-ignore
    return new Float32Array([
      sx, 0,  0, 0,
      0,  sy, 0, 0,
      0,  0,  1, 0,
      tx, ty, 0, 1,
    ]);
  }
}
