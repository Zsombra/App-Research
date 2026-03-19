import REGL from 'regl';
import type { HeatmapColumn } from '@terminal/types';
import { BaseRenderer } from '../base-renderer.js';
import type { RenderingContext } from '../rendering-context.js';
import type { ViewportTransform } from '../viewport-transform.js';

/**
 * HD Heatmap resolution: columns x rows in the texture.
 * 1024x512 gives 524,288 cells — far more than the instanced renderer's 200K limit.
 */
const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 512;

/**
 * High-definition orderbook heatmap using WebGL textures.
 *
 * Instead of instanced quads (one draw per cell), this renderer:
 * 1. Builds a 2D texture where X = time column, Y = price level
 * 2. Each texel encodes: R = bid intensity, G = ask intensity, B = 0, A = 1
 * 3. A fragment shader samples the texture and applies a colormap
 *
 * This allows 500K+ cells at 60fps vs ~200K with instanced rendering.
 */
export class HDHeatmapRenderer extends BaseRenderer {
  private columns: HeatmapColumn[] = [];
  private columnIntervalMs: number = 1000;
  private maxLiquidity: number = 1;
  private priceBucketSize: number = 1;
  private priceMin: number = 0;
  private priceMax: number = 1;

  private texture: REGL.Texture2D | null = null;
  private textureData: Uint8Array;
  private drawCommand: REGL.DrawCommand | null = null;
  private needsTextureUpdate: boolean = false;

  constructor(ctx: RenderingContext, viewport: ViewportTransform) {
    super(ctx, viewport);
    this.textureData = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
  }

  init(): void {
    const regl = this.ctx.regl;

    this.texture = regl.texture({
      width: TEXTURE_WIDTH,
      height: TEXTURE_HEIGHT,
      format: 'rgba',
      type: 'uint8',
      min: 'nearest',
      mag: 'nearest',
      wrap: 'clamp',
    });

    this.drawCommand = regl({
      vert: `
        precision highp float;
        attribute vec2 a_position;
        varying vec2 v_uv;
        uniform vec4 u_rect; // x0, y0, x1, y1 in pixel space

        void main() {
          // Map quad [0,1]x[0,1] to pixel rectangle
          vec2 pos = mix(u_rect.xy, u_rect.zw, a_position);
          // Manually map pixel coords to clip space
          vec2 viewport = vec2(${TEXTURE_WIDTH}.0, ${TEXTURE_HEIGHT}.0);
          gl_Position = vec4(pos, 0.0, 1.0);
          v_uv = a_position;
        }
      `,
      frag: `
        precision highp float;
        varying vec2 v_uv;
        uniform sampler2D u_heatmap;

        // Colormap: bid intensity → blue-cyan, ask intensity → orange-yellow
        vec3 bidColor(float t) {
          return vec3(0.0, 0.2 + t * 0.5, 0.4 + t * 0.6);
        }
        vec3 askColor(float t) {
          return vec3(0.5 + t * 0.5, 0.2 + t * 0.3, 0.0);
        }

        void main() {
          vec4 texel = texture2D(u_heatmap, v_uv);
          float bidIntensity = texel.r;
          float askIntensity = texel.g;

          if (bidIntensity < 0.01 && askIntensity < 0.01) {
            discard;
          }

          vec3 color;
          float alpha;
          if (bidIntensity > askIntensity) {
            color = bidColor(bidIntensity);
            alpha = 0.1 + bidIntensity * 0.5;
          } else {
            color = askColor(askIntensity);
            alpha = 0.1 + askIntensity * 0.5;
          }

          gl_FragColor = vec4(color, alpha);
        }
      `,
      attributes: {
        a_position: regl.buffer([
          [0, 0], [1, 0], [1, 1],
          [0, 0], [1, 1], [0, 1],
        ]),
      },
      uniforms: {
        u_heatmap: () => this.texture,
        u_rect: () => this.computeRect(),
      },
      count: 6,
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

  /** Set heatmap data. */
  setData(
    columns: HeatmapColumn[],
    columnIntervalMs: number,
    maxLiquidity: number,
    priceBucketSize: number,
  ): void {
    this.columns = columns;
    this.columnIntervalMs = columnIntervalMs;
    this.maxLiquidity = Math.max(1, maxLiquidity);
    this.priceBucketSize = Math.max(0.01, priceBucketSize);
    this.needsTextureUpdate = true;
  }

  render(): void {
    if (this.columns.length === 0 || !this.drawCommand || !this.texture) return;

    if (this.needsTextureUpdate) {
      this.rebuildTexture();
      this.needsTextureUpdate = false;
    }

    this.drawCommand();
  }

  dispose(): void {
    this.texture?.destroy();
    this.texture = null;
    this.drawCommand = null;
  }

  /** Rebuild the texture from heatmap columns. */
  private rebuildTexture(): void {
    if (!this.texture || this.columns.length === 0) return;

    const data = this.textureData;
    data.fill(0);

    // Determine price range from visible data
    let minP = Infinity;
    let maxP = -Infinity;
    for (const col of this.columns) {
      for (const [price] of col.bids) {
        if (price < minP) minP = price;
        if (price > maxP) maxP = price;
      }
      for (const [price] of col.asks) {
        if (price < minP) minP = price;
        if (price > maxP) maxP = price;
      }
    }
    if (minP === Infinity) return;

    this.priceMin = minP;
    this.priceMax = maxP + this.priceBucketSize;

    const priceRange = this.priceMax - this.priceMin;
    if (priceRange <= 0) return;

    const colCount = Math.min(this.columns.length, TEXTURE_WIDTH);
    const startIdx = Math.max(0, this.columns.length - colCount);

    for (let ci = 0; ci < colCount; ci++) {
      const col = this.columns[startIdx + ci] as HeatmapColumn;
      const texX = ci;

      // Bids → red channel
      for (const [price, size] of col.bids) {
        const norm = (price - this.priceMin) / priceRange;
        const texY = Math.floor(norm * (TEXTURE_HEIGHT - 1));
        if (texY < 0 || texY >= TEXTURE_HEIGHT) continue;

        const intensity = Math.min(1, size / this.maxLiquidity);
        const idx = (texY * TEXTURE_WIDTH + texX) * 4;
        data[idx] = Math.floor(intensity * 255);     // R = bid
        data[idx + 3] = 255;                          // A
      }

      // Asks → green channel
      for (const [price, size] of col.asks) {
        const norm = (price - this.priceMin) / priceRange;
        const texY = Math.floor(norm * (TEXTURE_HEIGHT - 1));
        if (texY < 0 || texY >= TEXTURE_HEIGHT) continue;

        const intensity = Math.min(1, size / this.maxLiquidity);
        const idx = (texY * TEXTURE_WIDTH + texX) * 4;
        data[idx + 1] = Math.floor(intensity * 255); // G = ask
        data[idx + 3] = 255;                          // A
      }
    }

    this.texture({
      width: TEXTURE_WIDTH,
      height: TEXTURE_HEIGHT,
      data,
    });
  }

  /** Compute the screen-space rectangle for the heatmap quad in clip coordinates. */
  private computeRect(): [number, number, number, number] {
    if (this.columns.length === 0) return [0, 0, 0, 0];

    const colCount = Math.min(this.columns.length, TEXTURE_WIDTH);
    const startIdx = Math.max(0, this.columns.length - colCount);

    // Time range of the texture data
    const t0 = (this.columns[startIdx] as HeatmapColumn).timestamp;
    const t1 = (this.columns[this.columns.length - 1] as HeatmapColumn).timestamp + this.columnIntervalMs;

    // Map to pixel space then clip space
    const px0 = this.viewport.dataToPixelX(t0);
    const px1 = this.viewport.dataToPixelX(t1);
    const py0 = this.viewport.dataToPixelY(this.priceMax); // top (higher price = lower pixel y in WebGL)
    const py1 = this.viewport.dataToPixelY(this.priceMin); // bottom

    // Convert pixel to clip space [-1, 1]
    const w = this.viewport.canvasWidth;
    const h = this.viewport.canvasHeight;

    const cx0 = (px0 / w) * 2 - 1;
    const cx1 = (px1 / w) * 2 - 1;
    const cy0 = 1 - (py0 / h) * 2;
    const cy1 = 1 - (py1 / h) * 2;

    return [cx0, cy0, cx1, cy1];
  }
}
