import type { OHLCVCandle } from '@terminal/types';
import { RenderingContext } from './rendering-context.js';
import { ViewportTransform } from './viewport-transform.js';
import { GridRenderer } from './renderers/grid-renderer.js';
import type { GridInfo } from './renderers/grid-renderer.js';
import { CandlestickRenderer } from './renderers/candlestick-renderer.js';
import { VolumeBarRenderer } from './renderers/volume-bar-renderer.js';
import { VolumeProfileRenderer } from './renderers/volume-profile-renderer.js';
import { CrosshairRenderer } from './renderers/crosshair-renderer.js';
import { LineOverlayRenderer } from './renderers/line-overlay-renderer.js';
import type { LineSeries } from './renderers/line-overlay-renderer.js';
import { OscillatorPaneRenderer } from './renderers/oscillator-pane-renderer.js';
import type { OscillatorConfig, OscillatorLine, HistogramBar } from './renderers/oscillator-pane-renderer.js';
import { FootprintRenderer } from './renderers/footprint-renderer.js';
import type { FootprintCandle } from '@terminal/types';

/**
 * Orchestrates all renderers for a single chart panel.
 * Render order: grid -> volume bars -> candles -> line overlay -> oscillator -> crosshair.
 * Provides a high-level API for data updates, navigation, and interaction.
 */
export class ChartManager {
  private renderingCtx: RenderingContext;
  private viewport: ViewportTransform;
  private gridRenderer: GridRenderer;
  private candlestickRenderer: CandlestickRenderer;
  private volumeBarRenderer: VolumeBarRenderer;
  private volumeProfileRenderer: VolumeProfileRenderer;
  private crosshairRenderer: CrosshairRenderer;
  private lineOverlayRenderer: LineOverlayRenderer;
  private oscillatorRenderer: OscillatorPaneRenderer | null = null;
  private footprintRenderer: FootprintRenderer;
  private candles: OHLCVCandle[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private readonly canvas: HTMLCanvasElement;

  /** Tracks whether the user has manually panned/zoomed (disables auto-fit). */
  private userHasInteracted: boolean = false;

  /** Optional callback fired after each render with updated grid positions. */
  onGridInfoUpdate: ((info: GridInfo) => void) | null = null;

  /** Optional callback fired with oscillator reference line positions. */
  onOscillatorInfoUpdate: ((lines: { value: number; pixelY: number }[]) => void) | null = null;

  /**
   * Create a ChartManager bound to a canvas element.
   * @param canvas - The canvas element to render into
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize canvas size
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width * pixelRatio) || 800;
    const height = Math.round(rect.height * pixelRatio) || 600;
    canvas.width = width;
    canvas.height = height;

    this.viewport = new ViewportTransform({
      canvasWidth: width,
      canvasHeight: height,
    });

    this.renderingCtx = new RenderingContext(canvas);

    // Create renderers
    this.gridRenderer = new GridRenderer(this.renderingCtx, this.viewport);
    this.candlestickRenderer = new CandlestickRenderer(this.renderingCtx, this.viewport);
    this.volumeBarRenderer = new VolumeBarRenderer(this.renderingCtx, this.viewport);
    this.volumeProfileRenderer = new VolumeProfileRenderer(this.renderingCtx, this.viewport);
    this.crosshairRenderer = new CrosshairRenderer(this.renderingCtx, this.viewport);
    this.lineOverlayRenderer = new LineOverlayRenderer(this.renderingCtx, this.viewport);
    this.footprintRenderer = new FootprintRenderer(this.renderingCtx, this.viewport);

    // Initialize renderers
    this.gridRenderer.init();
    this.candlestickRenderer.init();
    this.volumeBarRenderer.init();
    this.volumeProfileRenderer.init();
    this.crosshairRenderer.init();
    this.lineOverlayRenderer.init();
    this.footprintRenderer.init();

    // Set up render callback
    this.renderingCtx.onRender = () => {
      this.gridRenderer.render();
      this.volumeProfileRenderer.render();
      this.volumeBarRenderer.render();
      this.candlestickRenderer.render();
      this.footprintRenderer.render();
      this.lineOverlayRenderer.render();
      if (this.oscillatorRenderer) {
        this.oscillatorRenderer.render();
        this.onOscillatorInfoUpdate?.(this.oscillatorRenderer.getReferenceLinePositions());
      }
      this.crosshairRenderer.render();
      // Notify React of grid positions for HTML axis labels
      this.onGridInfoUpdate?.(this.gridRenderer.getGridInfo());
    };

    // Start the render loop
    this.renderingCtx.startRenderLoop();

    // Set up ResizeObserver
    this.setupResizeObserver();
  }

  // --- Data ---

  /**
   * Replace all candle data and fit viewport to show all candles.
   * Only auto-fits if the user hasn't manually panned/zoomed.
   * @param candles - Array of OHLCV candles (should be sorted by timestamp)
   */
  setCandles(candles: OHLCVCandle[]): void {
    this.candles = candles;
    this.candlestickRenderer.setData(candles);
    this.volumeBarRenderer.setData(candles);
    this.volumeProfileRenderer.setData(candles);
    if (!this.userHasInteracted) {
      this.viewport.fitToData(candles);
      this.syncViewportToRenderers();
    }
    this.renderingCtx.markDirty();
  }

  /**
   * Append a new candle to the end of the data.
   * @param candle - The new candle to append
   */
  appendCandle(candle: OHLCVCandle): void {
    this.candles.push(candle);
    this.candlestickRenderer.appendCandle(candle);
    this.volumeBarRenderer.appendCandle(candle);
    this.renderingCtx.markDirty();
  }

  /**
   * Update the last (currently forming) candle.
   * @param candle - Updated candle data
   */
  updateLastCandle(candle: OHLCVCandle): void {
    if (this.candles.length > 0) {
      this.candles[this.candles.length - 1] = candle;
      this.candlestickRenderer.updateLastCandle(candle);
      this.volumeBarRenderer.updateLastCandle(candle);
      this.renderingCtx.markDirty();
    }
  }

  // --- Indicators ---

  /** Set overlay indicator line series (SMA, EMA, Bollinger). */
  setOverlaySeries(series: LineSeries[]): void {
    this.lineOverlayRenderer.setSeries(series);
    this.renderingCtx.markDirty();
  }

  /** Configure and set data for the oscillator pane (RSI, MACD). */
  setOscillatorData(
    config: OscillatorConfig,
    lines: OscillatorLine[],
    histogram?: HistogramBar[]
  ): void {
    if (!this.oscillatorRenderer) {
      this.oscillatorRenderer = new OscillatorPaneRenderer(this.renderingCtx, this.viewport);
      this.oscillatorRenderer.init();
    }
    this.oscillatorRenderer.setConfig(config);
    this.oscillatorRenderer.setLines(lines);
    if (histogram) {
      this.oscillatorRenderer.setHistogram(histogram);
    }
    this.renderingCtx.markDirty();
  }

  /** Set footprint chart data. */
  setFootprintData(footprints: FootprintCandle[], candleWidthMs: number): void {
    this.footprintRenderer.setData(footprints, candleWidthMs);
    this.renderingCtx.markDirty();
  }

  /** Clear footprint data. */
  clearFootprint(): void {
    this.footprintRenderer.setData([], 60_000);
    this.renderingCtx.markDirty();
  }

  /** Remove the oscillator pane. */
  clearOscillator(): void {
    if (this.oscillatorRenderer) {
      this.oscillatorRenderer.dispose();
      this.oscillatorRenderer = null;
      this.renderingCtx.markDirty();
    }
  }

  // --- Navigation ---

  /**
   * Pan the viewport by a pixel delta.
   * @param dx - Horizontal pan in pixels
   * @param dy - Vertical pan in pixels
   */
  pan(dx: number, dy: number): void {
    this.userHasInteracted = true;
    this.viewport.pan(dx, dy);
    this.syncViewportToRenderers();
    this.renderingCtx.markDirty();
  }

  /**
   * Zoom the viewport around a center point.
   * @param factor - Zoom factor (> 1 = zoom in, < 1 = zoom out)
   * @param cx - X coordinate of zoom center in pixels
   * @param cy - Y coordinate of zoom center in pixels
   */
  zoom(factor: number, cx: number, cy: number): void {
    this.userHasInteracted = true;
    this.viewport.zoom(factor, cx, cy);
    this.syncViewportToRenderers();
    this.renderingCtx.markDirty();
  }

  /**
   * Fit the viewport to show all loaded candle data.
   * Resets the user interaction flag.
   */
  fitToData(): void {
    this.userHasInteracted = false;
    this.viewport.fitToData(this.candles);
    this.syncViewportToRenderers();
    this.renderingCtx.markDirty();
  }

  // --- Interaction ---

  /**
   * Set the cursor position for the crosshair.
   * @param x - X coordinate in CSS pixels relative to canvas
   * @param y - Y coordinate in CSS pixels relative to canvas
   */
  setCursorPosition(x: number, y: number): void {
    this.crosshairRenderer.setCursorPosition(x, y);
  }

  /**
   * Show or hide the crosshair.
   * @param visible - Whether to show the crosshair
   */
  setCrosshairVisible(visible: boolean): void {
    this.crosshairRenderer.setVisible(visible);
  }

  // --- Grid info ---

  /**
   * Get grid line positions for HTML overlay labels.
   * @returns Grid info with horizontal and vertical line positions
   */
  getGridInfo(): GridInfo {
    return this.gridRenderer.getGridInfo();
  }

  // --- Lifecycle ---

  /**
   * Handle canvas resize.
   * @param width - New width in physical pixels
   * @param height - New height in physical pixels
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport.resize(width, height);
    this.syncViewportToRenderers();
    this.renderingCtx.markDirty();
  }

  /**
   * Clean up all resources: stop render loop, disconnect observers, free GPU resources.
   */
  dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.gridRenderer.dispose();
    this.candlestickRenderer.dispose();
    this.volumeBarRenderer.dispose();
    this.volumeProfileRenderer.dispose();
    this.crosshairRenderer.dispose();
    this.lineOverlayRenderer.dispose();
    this.footprintRenderer.dispose();
    if (this.oscillatorRenderer) {
      this.oscillatorRenderer.dispose();
    }
    this.renderingCtx.dispose();
  }

  /** Synchronize viewport reference to all renderers. */
  private syncViewportToRenderers(): void {
    this.gridRenderer.setViewport(this.viewport);
    this.candlestickRenderer.setViewport(this.viewport);
    this.volumeBarRenderer.setViewport(this.viewport);
    this.volumeProfileRenderer.setViewport(this.viewport);
    this.crosshairRenderer.setViewport(this.viewport);
    this.lineOverlayRenderer.setViewport(this.viewport);
    this.footprintRenderer.setViewport(this.viewport);
    if (this.oscillatorRenderer) {
      this.oscillatorRenderer.setViewport(this.viewport);
    }
  }

  /** Set up ResizeObserver for automatic canvas resizing. */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    const pixelRatio = this.renderingCtx.pixelRatio;

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      const physicalWidth = Math.round(width * pixelRatio);
      const physicalHeight = Math.round(height * pixelRatio);

      this.resize(physicalWidth, physicalHeight);
    });

    this.resizeObserver.observe(this.canvas);
  }
}
