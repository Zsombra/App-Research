import type { RenderingContext } from './rendering-context.js';
import type { ViewportTransform } from './viewport-transform.js';

/** RGBA color tuple with components in [0, 1] range. */
export type RGBAColor = [number, number, number, number];

/** Theme color palette for chart rendering. */
export interface ThemeColors {
  /** Bullish (close >= open) candle color */
  bullish: RGBAColor;
  /** Bearish (close < open) candle color */
  bearish: RGBAColor;
  /** Grid line color */
  grid: RGBAColor;
  /** Background color */
  background: RGBAColor;
  /** Text/foreground color */
  text: RGBAColor;
}

/**
 * Abstract base class for all WebGL renderers.
 * Provides shared access to the rendering context, viewport transform,
 * dirty flag management, and theme colors.
 */
export abstract class BaseRenderer {
  protected ctx: RenderingContext;
  protected viewport: ViewportTransform;
  protected isDirty: boolean = true;

  /**
   * @param ctx - The rendering context (owns the regl instance)
   * @param viewport - The viewport transform for coordinate conversions
   */
  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    this.ctx = ctx;
    this.viewport = viewport;
  }

  /**
   * Initialize GPU resources: create regl commands, allocate buffers.
   * Must be called once before the first render.
   */
  abstract init(): void;

  /**
   * Execute draw calls for this renderer.
   * Called each frame when the scene is dirty.
   */
  abstract render(): void;

  /**
   * Free all GPU resources allocated by this renderer.
   */
  abstract dispose(): void;

  /**
   * Mark this renderer as needing a re-render.
   */
  markDirty(): void {
    this.isDirty = true;
    this.ctx.markDirty();
  }

  /**
   * Update the viewport transform reference.
   * @param viewport - New viewport transform
   */
  setViewport(viewport: ViewportTransform): void {
    this.viewport = viewport;
  }

  /**
   * Get the current theme color palette.
   * Uses a dark theme by default.
   * @returns Theme colors with RGBA values in [0, 1]
   */
  protected getThemeColors(): ThemeColors {
    return {
      bullish: [0.173, 0.714, 0.463, 1.0],    // #2CB776 green
      bearish: [0.914, 0.278, 0.278, 1.0],     // #E94747 red
      grid: [1.0, 1.0, 1.0, 0.08],             // subtle white
      background: [0.06, 0.06, 0.08, 1.0],     // dark background
      text: [0.8, 0.8, 0.8, 1.0],              // light gray text
    };
  }
}
