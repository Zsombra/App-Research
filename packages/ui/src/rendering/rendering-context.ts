import REGL from 'regl';

/**
 * Manages a regl instance and the render loop for a single chart panel.
 * Handles WebGL context creation, dirty-flag gated rendering, and context loss.
 */
export class RenderingContext {
  private _regl: REGL.Regl;
  private _pixelRatio: number;
  private _dirty: boolean = true;
  private _rafHandle: number = 0;
  private _running: boolean = false;
  private _contextLost: boolean = false;
  private readonly _canvas: HTMLCanvasElement;

  /** Callback invoked each frame when the dirty flag is set. */
  onRender: ((regl: REGL.Regl) => void) | null = null;

  /**
   * Create a RenderingContext bound to a canvas element.
   * @param canvas - The canvas element to bind the WebGL context to
   */
  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

    this._regl = REGL({
      canvas,
      attributes: {
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: false,
      },
      pixelRatio: this._pixelRatio,
    });

    // Register context loss handlers
    this._regl.on('lost', () => this.handleContextLost());
    this._regl.on('restore', () => this.handleContextRestored());
  }

  /** The underlying regl instance. */
  get regl(): REGL.Regl {
    return this._regl;
  }

  /** The device pixel ratio used for canvas sizing. */
  get pixelRatio(): number {
    return this._pixelRatio;
  }

  /** Whether the WebGL context is currently lost. */
  get isContextLost(): boolean {
    return this._contextLost;
  }

  /**
   * Mark the scene as needing a re-render on the next animation frame.
   */
  markDirty(): void {
    this._dirty = true;
  }

  /**
   * Start the requestAnimationFrame render loop.
   * The loop runs continuously but only performs GPU work when dirty.
   */
  startRenderLoop(): void {
    if (this._running) return;
    this._running = true;
    this.tick();
  }

  /**
   * Stop the render loop.
   */
  stopRenderLoop(): void {
    this._running = false;
    if (this._rafHandle !== 0) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = 0;
    }
  }

  /**
   * Release all GPU resources and stop the render loop.
   */
  dispose(): void {
    this.stopRenderLoop();
    this.onRender = null;
    this._regl.destroy();
  }

  /** rAF tick function — only renders when dirty. */
  private tick(): void {
    if (!this._running) return;

    this._rafHandle = requestAnimationFrame(() => this.tick());

    if (!this._dirty || this._contextLost) return;

    this._dirty = false;

    this._regl.clear({
      color: [0.06, 0.06, 0.08, 1],
      depth: 1,
    });

    if (this.onRender) {
      this.onRender(this._regl);
    }
  }

  /** Handle WebGL context loss. */
  private handleContextLost(): void {
    this._contextLost = true;
  }

  /** Handle WebGL context restoration. */
  private handleContextRestored(): void {
    this._contextLost = false;
    this._dirty = true;
  }
}
