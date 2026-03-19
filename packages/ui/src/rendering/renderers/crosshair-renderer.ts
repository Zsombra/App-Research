import REGL from 'regl';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/** Default crosshair line width in physical pixels. */
const CROSSHAIR_LINE_WIDTH = 1.0;

/** Default crosshair color (white with alpha). */
const CROSSHAIR_COLOR: readonly [number, number, number, number] = [1.0, 1.0, 1.0, 0.4];

/**
 * Renders a crosshair (horizontal + vertical lines) at the cursor position.
 * Uses a fullscreen quad with a fragment shader that discards non-crosshair pixels.
 */
export class CrosshairRenderer extends BaseRenderer {
  private drawCommand: REGL.DrawCommand | null = null;
  private quadBuffer: REGL.Buffer | null = null;
  private cursorX: number = 0;
  private cursorY: number = 0;
  private visible: boolean = false;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
  }

  /**
   * Create the regl command for crosshair rendering.
   */
  init(): void {
    const regl = this.ctx.regl;

    // Fullscreen quad in clip space
    // prettier-ignore
    this.quadBuffer = regl.buffer([
      [-1, -1],
      [ 1, -1],
      [ 1,  1],
      [-1, -1],
      [ 1,  1],
      [-1,  1],
    ]);

    this.drawCommand = regl({
      vert: `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `,
      frag: `
        precision mediump float;
        uniform vec2  u_cursorPx;
        uniform vec2  u_resolution;
        uniform float u_lineWidth;
        uniform vec4  u_color;

        void main() {
          vec2 fragPx = gl_FragCoord.xy;
          // gl_FragCoord.y is bottom-up; flip to match top-down pixel space
          fragPx.y = u_resolution.y - fragPx.y;

          float onH = step(abs(fragPx.y - u_cursorPx.y), u_lineWidth * 0.5);
          float onV = step(abs(fragPx.x - u_cursorPx.x), u_lineWidth * 0.5);

          if (onH + onV < 0.5) discard;
          gl_FragColor = u_color;
        }
      `,
      attributes: {
        a_position: this.quadBuffer as REGL.Buffer,
      },
      uniforms: {
        u_cursorPx: () => [
          this.cursorX * this.ctx.pixelRatio,
          this.cursorY * this.ctx.pixelRatio,
        ],
        u_resolution: () => [this.viewport.canvasWidth, this.viewport.canvasHeight],
        u_lineWidth: CROSSHAIR_LINE_WIDTH,
        u_color: [...CROSSHAIR_COLOR],
      },
      count: 6,
      depth: { enable: false },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 'one',
          dstRGB: 'one minus src alpha',
          dstAlpha: 'one minus src alpha',
        },
      },
    });
  }

  /**
   * Render the crosshair if visible.
   */
  render(): void {
    if (!this.drawCommand || !this.visible) return;
    this.drawCommand();
    this.isDirty = false;
  }

  /**
   * Free GPU resources.
   */
  dispose(): void {
    if (this.quadBuffer) {
      this.quadBuffer.destroy();
      this.quadBuffer = null;
    }
    this.drawCommand = null;
  }

  /**
   * Set the cursor position in CSS pixel coordinates.
   * @param pixelX - X coordinate relative to canvas left
   * @param pixelY - Y coordinate relative to canvas top
   */
  setCursorPosition(pixelX: number, pixelY: number): void {
    this.cursorX = pixelX;
    this.cursorY = pixelY;
    if (this.visible) {
      this.markDirty();
    }
  }

  /**
   * Show or hide the crosshair.
   * @param visible - Whether the crosshair should be visible
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.markDirty();
  }
}
