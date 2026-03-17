# Phase 1c — WebGL Rendering Engine Design

**Document type:** Architecture design
**Phase:** 1c — WebGL rendering engine for financial chart panels
**Date:** 2026-03-17
**Status:** Authoritative

---

## Table of Contents

1. [Rendering Architecture Overview](#1-rendering-architecture-overview)
2. [Coordinate System Design](#2-coordinate-system-design)
3. [CandlestickRenderer Implementation Plan](#3-candlestickrenderer-implementation-plan)
4. [GridRenderer Implementation Plan](#4-gridrenderer-implementation-plan)
5. [Shader Infrastructure](#5-shader-infrastructure)
6. [Performance Design](#6-performance-design)
7. [React Integration](#7-react-integration)
8. [File Structure](#8-file-structure)
9. [Architectural Decisions and Trade-offs](#9-architectural-decisions-and-trade-offs)

---

## 1. Rendering Architecture Overview

### Context and Scope

Phase 1c delivers the rendering substrate for chart panels in the trading terminal. The primary input types are `OHLCVCandle` (candlestick charts) and `OrderbookSnapshot` (depth heatmap), both defined in `@terminal/types`. Each chart panel is configured via `PanelConfig`, which carries the symbol, timeframe, and panel identity.

The rendering engine lives entirely within `packages/ui/src/rendering/`. It has no knowledge of WebSocket connections or application state — it receives plain data arrays and a viewport description, and it draws pixels.

### Why WebGL via regl

Canvas 2D becomes CPU-bound beyond roughly 10,000 points per frame. A single candlestick chart at 1-minute timeframe with 6 months of history already carries ~260,000 candles. WebGL instanced rendering handles that dataset in a single draw call. WebGPU would be faster still but lacks Firefox support as of March 2026; the architecture is designed so a WebGPU backend can be substituted later without touching React components.

regl (5,500+ GitHub stars, used by Plotly in production) is chosen over raw WebGL2 for development velocity. Its functional/stateless design — two abstractions: resources and commands — eliminates WebGL state management bugs without adding a scene graph or frame-graph overhead. Dynamic code generation in regl's internals makes per-command overhead negligible.

### One regl Instance Per Panel

Each chart panel owns exactly one regl instance, bound to its own `<canvas>` element. This avoids the browser's hard limit of 16 simultaneous WebGL contexts across the page: because our terminal can display many panels, a shared-context design would require a complex draw-call batching and texture-sharing layer before any charting code could be written. Isolating contexts per panel:

- Eliminates cross-panel state contamination
- Allows panels to be independently suspended or destroyed
- Trades theoretical batching gains for far simpler cleanup: `regl.destroy()` on unmount releases all GPU resources for that panel

Context count is bounded by the number of visible chart panels, not total workspace panels. Non-chart panel types (`orderbook`, `trades`, `watchlist`) do not create WebGL contexts.

### Render Loop

The engine uses a `requestAnimationFrame` loop gated by a dirty flag. The loop itself runs continuously so that smooth 60 FPS animations (pan inertia, zoom easing) are possible without restarting the loop, but GPU work is skipped entirely when the flag is clear.

```
rAF callback fires
  if (!dirty) return
  dirty = false
  commandGrid()
  commandCandles()
  commandCrosshair()   // only if pointer is active
```

The dirty flag is set by:
- New candle data arriving (append or replace)
- Viewport pan or zoom input
- Canvas resize events
- Crosshair pointer movement
- Theme change

### Layer Compositing Order

Within each `requestAnimationFrame` pass, layers render in back-to-front order using a shared WebGL context. No explicit framebuffer compositing is needed for Phase 1 — all layers write to the default framebuffer with appropriate depth/blend settings.

```
Layer 1 (bottom)  Grid lines          — GridRenderer, opaque, renders first
Layer 2           Candle bodies/wicks — CandlestickRenderer, opaque
Layer 3           Volume bars         — VolumeRenderer (stub for Phase 1)
Layer 4 (top)     Crosshair           — CrosshairRenderer, uses discard
```

HTML/CSS overlay sits above the canvas in the DOM stacking order and carries axis tick labels. It is not a WebGL layer.

### Hybrid WebGL + HTML Overlay

Rendering text glyphs in WebGL requires a font atlas texture and bespoke UV mapping — justified for very high point-count annotations but premature for Phase 1. Axis labels (price on Y, time on X) are rendered as absolutely-positioned HTML elements managed by the `AxisLabelManager` class, which reads the current `ViewportTransform` each frame and updates element `style.transform` or `style.left`/`style.top`. This is the same approach used by TradingView's lightweight-charts.

The WebGL canvas and the HTML overlay share the same bounding rectangle. The HTML overlay has `pointer-events: none` so all mouse events pass through to the canvas.

---

## 2. Coordinate System Design

### Three Coordinate Spaces

Every position in the chart exists simultaneously in three coordinate spaces. Conversions are performed by the `ViewportTransform` class.

```
Data space     — (timestamp ms, price float)      — the raw domain values
Pixel space    — (px from canvas top-left)        — CSS/DOM coordinates
Clip space     — ([-1, +1] on both axes)          — WebGL NDC
```

Pixel space is the intermediate. All interaction logic (hit testing, label placement) works in pixel space. GPU shaders receive a projection matrix that converts pixel-space positions directly to clip space, so vertex shader arithmetic stays simple.

### ViewportTransform Class

```typescript
class ViewportTransform {
  // Viewport state
  timeOrigin: number;        // unix ms at pixel x=0
  pixelsPerMs: number;       // zoom level on time axis
  priceOrigin: number;       // price at pixel y=canvasHeight (bottom)
  pixelsPerPrice: number;    // zoom level on price axis (positive = up)
  canvasWidth: number;
  canvasHeight: number;

  // Data space -> Pixel space
  timeToPixel(timestampMs: number): number;
  priceToPixel(price: number): number;

  // Pixel space -> Data space
  pixelToTime(px: number): number;
  pixelToPrice(py: number): number;

  // Pixel space -> Clip space (for uniform upload)
  buildProjectionMatrix(): Float32Array;  // 4x4 orthographic, column-major

  // Viewport queries
  visibleTimeRange(): [number, number];   // [startMs, endMs]
  visiblePriceRange(): [number, number];  // [low, high]

  // Mutations (return new instance — immutable update pattern)
  pan(dxPx: number, dyPx: number): ViewportTransform;
  zoomAround(cursorPx: number, cursorPy: number, factor: number): ViewportTransform;
  fitToData(candles: OHLCVCandle[]): ViewportTransform;
}
```

`ViewportTransform` instances are immutable. Pan and zoom operations return a new instance, making it straightforward to implement undo, animation interpolation between two states, and React state comparison.

### Orthographic Projection Matrix

The projection matrix maps pixel space to clip space for a 2D orthographic view. Given canvas dimensions W x H:

```
scaleX  =  2 / W
scaleY  = -2 / H      (negative: flip Y so pixel-y=0 is top, clip-y=+1 is top)
transX  = -1
transY  = +1

Matrix (column-major, GLSL mat4):
[ scaleX   0       0   0 ]
[ 0        scaleY  0   0 ]
[ 0        0       1   0 ]
[ transX   transY  0   1 ]
```

Vertex shaders receive this matrix as `u_projection` and apply it to pixel-space positions computed from instance data and pan/zoom uniforms. This means pan and zoom changes require only a uniform update — no vertex buffer re-upload.

### Time Axis

- **Internal representation:** Unix milliseconds (`number`). All `OHLCVCandle.timestamp` values are already in this unit.
- **Pixels per millisecond** (`pixelsPerMs`): Configurable per timeframe. Default values:
  - 1m candles: candle body occupies 8px, gap 2px → 10px per 60,000ms = 1.667e-4 px/ms
  - The canonical formula is `candleWidthPx / timeframeDurationMs`
- **Tick spacing:** The `GridRenderer` computes nice time intervals (1m, 5m, 15m, 1h, 4h, 1d) based on `pixelsPerMs` and a minimum pixel separation of 60px between labels.

### Price Axis

- **Internal representation:** Raw float price (e.g., 65432.10 for BTC/USDT).
- **Auto-scale on load:** `ViewportTransform.fitToData()` computes the visible high/low across all loaded candles, adds 5% padding, and sets `priceOrigin` and `pixelsPerPrice` accordingly.
- **Auto-scale on pan/zoom (optional):** When `autoScaleY` is enabled, the price axis rescales vertically whenever the visible time range changes, keeping all visible candles in frame. This is implemented by recomputing `fitToData()` for the currently visible candle subset after each horizontal viewport change.
- **Tick spacing:** Nice number series (see GridRenderer section).

---

## 3. CandlestickRenderer Implementation Plan

### Instanced Rendering Overview

All visible candles are drawn in two draw calls:
1. One draw call for candle bodies (wide quads)
2. One draw call for candle wicks (narrow quads)

Both use WebGL2 instanced rendering (`drawArraysInstanced` via regl). The base geometry for one instance is a unit quad (2 triangles, 6 vertices or 4 vertices + index buffer). Per-instance data is uploaded as vertex buffer attributes with `divisor: 1`.

This approach is directly validated by the D3FC WebGL implementation, which achieves ~40x speedup over Canvas 2D batch rendering using the same pattern for financial bar charts.

### Instance Attribute Layout

Each candle occupies one instance. Attributes are packed into two `Float32Array` buffers for cache efficiency.

**Body buffer** (6 floats per candle):
```
[0] centerX     — pixel-space X of candle center (derived from timestamp)
[1] openY       — pixel-space Y of open price
[2] closeY      — pixel-space Y of close price
[3] bodyWidth   — pixel width of body (configurable, default 8px)
[4] isBullish   — 1.0 if close >= open, 0.0 otherwise
[5] _padding    — align to vec4 boundary
```

**Wick buffer** (4 floats per candle):
```
[0] centerX     — same as body
[1] highY       — pixel-space Y of high price
[2] lowY        — pixel-space Y of low price
[3] wickWidth   — pixel width of wick (default 1–2px)
```

Pixel-space positions are pre-computed on the CPU when candles are loaded or the viewport changes. This keeps the vertex shader arithmetic minimal.

### Vertex Shader (Bodies)

```glsl
// Attributes (per instance)
attribute float a_centerX;
attribute float a_openY;
attribute float a_closeY;
attribute float a_bodyWidth;
attribute float a_isBullish;

// Attributes (per vertex of the base quad)
attribute vec2 a_quadCorner;  // one of (-0.5,-0.5), (0.5,-0.5), (0.5,0.5), (-0.5,0.5)

uniform mat4 u_projection;

varying float v_isBullish;

void main() {
  float topY    = min(a_openY, a_closeY);
  float bottomY = max(a_openY, a_closeY);
  float height  = max(bottomY - topY, 1.0);  // min 1px to keep degenerate candles visible

  vec2 pixelPos = vec2(
    a_centerX + a_quadCorner.x * a_bodyWidth,
    topY      + (a_quadCorner.y + 0.5) * height
  );

  gl_Position = u_projection * vec4(pixelPos, 0.0, 1.0);
  v_isBullish = a_isBullish;
}
```

### Fragment Shader (Bodies)

```glsl
precision mediump float;

uniform vec3 u_bullishColor;  // e.g. vec3(0.173, 0.714, 0.463) — green
uniform vec3 u_bearishColor;  // e.g. vec3(0.914, 0.278, 0.278) — red

varying float v_isBullish;

void main() {
  gl_FragColor = vec4(mix(u_bearishColor, u_bullishColor, v_isBullish), 1.0);
}
```

The wick shaders are structurally identical; the only difference is that the quad expands vertically from `highY` to `lowY` and the body width is replaced with `wickWidth`.

### Buffer Update Strategy — Ring Buffer with Partial Updates

The GPU buffer is allocated once at `maxCandles` capacity (50,000 entries by default). As new candles arrive, the ring buffer strategy avoids reallocating or re-uploading the entire buffer.

```
Ring buffer state:
  writeHead: number      — index of next write position (0..maxCandles-1)
  count: number          — number of valid candles currently in buffer (≤ maxCandles)
  oldestIndex: number    — ring buffer read start

On new candle append:
  1. Write instance data at position writeHead
  2. writeHead = (writeHead + 1) % maxCandles
  3. count = min(count + 1, maxCandles)
  4. Call regl buffer subdata update (partial upload, O(1))
  5. Set dirty flag

On live candle update (last candle still forming):
  1. Overwrite instance data at (writeHead - 1 + maxCandles) % maxCandles
  2. Partial subdata update of that single entry
  3. Set dirty flag

On viewport pan/zoom:
  1. Recompute pixel-space X/Y for all visible candles
  2. Full subdata update of visible range only
  3. Set dirty flag
```

The ring buffer's physical layout does not match temporal order once it wraps. The draw call uses `count` instances starting from `oldestIndex`, with the shader treating the buffer as a circular array via a uniform `u_ringOffset`. This is more complex than a simple linear buffer but eliminates the O(n) shift cost of evicting old candles.

For Phase 1 simplicity, an alternative is acceptable: allocate a buffer of fixed capacity and do a full re-upload whenever the visible window changes significantly. Full re-upload of 50,000 candles * 6 floats * 4 bytes = 1.2MB takes roughly 0.5ms on a mid-range GPU — within frame budget. The ring buffer optimization can be deferred to Phase 2 if needed.

### Viewport Culling

Before uploading, the renderer computes the visible time range from `ViewportTransform.visibleTimeRange()` and binary-searches the sorted candle array for the first and last visible index. Only those candles are written to the GPU buffer, keeping upload size proportional to screen width rather than total history length.

```
visibleStart = binarySearch(candles, viewport.visibleTimeRange()[0])
visibleEnd   = binarySearch(candles, viewport.visibleTimeRange()[1])
instanceCount = visibleEnd - visibleStart
```

---

## 4. GridRenderer Implementation Plan

### Adaptive Tick Spacing

The grid must place tick marks at "nice" intervals that feel intuitive to the user and never crowd the labels. The algorithm for both axes is identical in structure.

**Price axis nice numbers:**

```
candidateIntervals = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, ...]

priceRange = visiblePriceRange[1] - visiblePriceRange[0]
targetTickCount = floor(canvasHeight / minTickSpacingPx)   // minTickSpacingPx = 40
rawInterval = priceRange / targetTickCount

// Find the smallest candidate >= rawInterval
niceInterval = candidateIntervals.find(c => c >= rawInterval)

// Generate tick values
firstTick = ceil(visiblePriceRange[0] / niceInterval) * niceInterval
ticks = [firstTick, firstTick + niceInterval, firstTick + 2*niceInterval, ...]
       while tick <= visiblePriceRange[1]
```

**Time axis nice intervals** (in milliseconds):

```
candidateIntervals = [
  60_000,          // 1m
  5 * 60_000,      // 5m
  15 * 60_000,     // 15m
  30 * 60_000,     // 30m
  60 * 60_000,     // 1h
  4 * 60 * 60_000, // 4h
  24 * 60 * 60_000 // 1d
]
```

The same selection logic applies: find the smallest candidate that produces at least `minTickSpacingPx` (60px) between adjacent labels.

### Grid Lines — Single Draw Call

All horizontal grid lines are submitted as one draw call using `LINES` primitives (pairs of vertices). Similarly all vertical grid lines. Two draw calls total for the grid geometry regardless of tick count.

The vertex buffer for grid lines is rebuilt each frame from the current tick list — it is small (N ticks * 2 vertices * 2 floats, typically a few KB) and building it on the CPU each frame costs less than 0.1ms.

```glsl
// Grid line vertex shader — minimal
attribute vec2 a_position;  // pixel space endpoint
uniform mat4 u_projection;
void main() {
  gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
}

// Grid line fragment shader
precision mediump float;
uniform vec4 u_gridColor;  // e.g. vec4(1.0, 1.0, 1.0, 0.08) — subtle white
void main() {
  gl_FragColor = u_gridColor;
}
```

### Axis Labels — HTML Overlay

Price labels (right side) and time labels (bottom) are rendered as HTML `<span>` elements inside a `position: absolute; inset: 0; pointer-events: none` overlay div. The `AxisLabelManager` class maintains a pool of pre-allocated DOM elements and repositions them each frame using `element.style.transform = 'translateY(Npx)'`.

Label pooling avoids `createElement`/`removeChild` churn each frame. The pool is sized to the maximum tick count (typically 20 price ticks + 20 time ticks per visible area). Elements outside the visible range have `visibility: hidden`.

This design deliberately avoids WebGL text rendering (font atlas texture + UV mapping) for Phase 1. The trade-off is that HTML labels render above the WebGL canvas in the compositing stack and cannot be occluded by WebGL content — acceptable for axis labels, which always belong on top.

---

## 5. Shader Infrastructure

### Shared Uniforms

All regl commands in the engine inherit a set of shared uniforms via regl's `scope` mechanism. A scope command is created once at engine initialization and wraps every render call:

```typescript
const sharedScope = regl({
  uniforms: {
    u_projection:  () => viewport.buildProjectionMatrix(),
    u_resolution:  () => [canvas.width, canvas.height],
    u_pixelRatio:  () => window.devicePixelRatio,
    u_theme:       () => theme === 'dark' ? 0 : 1,
  }
});
```

Inside the frame loop:
```typescript
sharedScope(() => {
  commandGrid();
  commandCandles();
  commandWicks();
  if (crosshairActive) commandCrosshair();
});
```

This ensures every shader has access to viewport and theme information without each command re-declaring the same uniforms.

### Candle Shader Pair

File: `packages/ui/src/rendering/shaders/candle.vert.glsl` and `candle.frag.glsl`

The vertex shader expands per-instance data into a quad as described in section 3. The fragment shader outputs a solid color based on `v_isBullish`. Both shaders import the shared projection uniform from the scope.

Theme color values are passed as uniforms (`u_bullishColor`, `u_bearishColor`, `u_wickColor`) rather than baked into the shader, so theme switching requires only a uniform update.

### Wick Shader Pair

File: `wick.vert.glsl` / `wick.frag.glsl`

Structurally identical to the candle shaders but uses the wick attribute buffer. In practice the fragment shader is the same file; only the vertex shader differs. A future optimization can combine body + wick into a single draw call using a mode flag attribute, but the two-call approach is cleaner for Phase 1.

### Grid Line Shader Pair

File: `grid.vert.glsl` / `grid.frag.glsl`

The simplest shader in the engine: vertex positions come directly in pixel space, the projection matrix maps them to clip space, and the fragment shader outputs a fixed semi-transparent color. The grid color respects the `u_theme` uniform to switch between light and dark palettes.

### Crosshair Shader

File: `crosshair.vert.glsl` / `crosshair.frag.glsl`

The crosshair is a fullscreen quad (4 vertices covering clip space [-1,+1] x [-1,+1]) with a fragment shader that discards all fragments not on the crosshair lines. The cursor position is passed as uniform `u_cursorPx: vec2`.

```glsl
// crosshair.frag.glsl
precision mediump float;
uniform vec2  u_cursorPx;
uniform vec2  u_resolution;
uniform float u_lineWidth;   // default 1.0px
uniform vec4  u_color;       // e.g. vec4(1,1,1,0.5)

void main() {
  vec2 fragPx = gl_FragCoord.xy;
  // gl_FragCoord.y is bottom-up; flip to match our top-down pixel space
  fragPx.y = u_resolution.y - fragPx.y;

  float onH = step(abs(fragPx.y - u_cursorPx.y), u_lineWidth * 0.5);
  float onV = step(abs(fragPx.x - u_cursorPx.x), u_lineWidth * 0.5);

  if (onH + onV < 0.5) discard;
  gl_FragColor = u_color;
}
```

Using `discard` means the crosshair draw call does not overdraw non-crosshair pixels, preserving correct alpha blending of content underneath.

---

## 6. Performance Design

### Dirty Flag System

The dirty flag is a simple boolean on the `ChartEngine` class. It starts `false`. Setting it schedules a redraw on the next animation frame. Clearing it happens at the start of each frame's render work.

Sources that set the dirty flag:
- `appendCandles(newCandles)` — new data arrived
- `updateLastCandle(candle)` — live candle tick
- `setViewport(transform)` — pan or zoom interaction
- `setCursorPosition(px, py)` — crosshair movement
- `resize(width, height)` — canvas dimensions changed
- `setTheme(theme)` — light/dark switch

The render loop itself never sets the flag — only external events do. This prevents runaway renders when the scene is static.

### Viewport Culling Details

The visible time range determines which candles are processed each frame:

```typescript
const [tStart, tEnd] = viewport.visibleTimeRange();
// Add one candle-width of margin on each side to avoid pop-in
const margin = timeframeDurationMs;
const lo = binarySearchFirst(candles, tStart - margin);
const hi = binarySearchLast(candles, tEnd + margin);
const visibleCandles = candles.slice(lo, hi);
```

`binarySearchFirst` and `binarySearchLast` are O(log n). For 260,000 candles, that is ~18 comparisons. The resulting slice is typically 200–400 candles for a standard screen width at 1m timeframe — well within GPU buffer budget.

### GPU Memory Budget

| Resource | Count | Per-entry size | Total |
|---|---|---|---|
| Candle body buffer | 50,000 instances | 6 floats = 24 bytes | 1.2 MB |
| Candle wick buffer | 50,000 instances | 4 floats = 16 bytes | 0.8 MB |
| Grid line buffer | ~100 segments | 4 floats = 16 bytes | ~6 KB |
| Crosshair quad | 4 vertices | 2 floats = 8 bytes | ~32 bytes |
| **Total per panel** | | | **~2.0 MB** |

This budget is intentionally conservative for Phase 1c (candlestick only). Phase 1d (heatmap) will add the ring buffer texture (~8 MB) and footprint buffers (~4 MB), bringing the per-panel total to ~14 MB — still well within GPU limits for 4–6 simultaneous chart panels.

### Ring Buffer Eviction Policy

When `count` reaches `maxCandles` (50,000), the oldest entry is evicted on the next append. The `oldestIndex` pointer advances. No memory is freed or reallocated — the write position simply overwrites the oldest slot. This maintains a sliding window of the most recent 50,000 candles.

At 1-minute timeframe, 50,000 candles covers approximately 34 days of continuous trading. At 1-second timeframe, it covers 13.9 hours. If the user scrolls further back than the buffer holds, historical data must be fetched from the server and a full buffer rebuild is triggered.

### ResizeObserver Integration

The canvas is observed by a `ResizeObserver` rather than listening to `window.resize`. This eliminates false triggers (window resize events fire even when the canvas size did not change) and correctly handles panel resizes driven by the Dockview layout engine.

```typescript
const ro = new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  canvas.width  = Math.round(width  * devicePixelRatio);
  canvas.height = Math.round(height * devicePixelRatio);
  canvas.style.width  = `${width}px`;
  canvas.style.height = `${height}px`;
  viewport = viewport.resize(canvas.width, canvas.height);
  dirty = true;
});
ro.observe(canvas);
```

Setting `canvas.width` and `canvas.height` directly (not via CSS) is critical for pixel-perfect rendering on high-DPI displays. The projection matrix accounts for the physical pixel dimensions; CSS sizing keeps the canvas visually the right size.

### WebGL Context Loss Handling

regl provides built-in `contextlost` / `contextrestored` event handling. The engine registers callbacks:

```typescript
regl.on('lost', () => {
  // Pause the render loop; notify React layer via callback
  onContextLost?.();
});

regl.on('restore', () => {
  // Rebuild all buffers from in-memory candle array
  rebuildBuffers(candles);
  dirty = true;
  onContextRestored?.();
});
```

Context loss is rare in practice but happens on mobile when the app is backgrounded. The in-memory `candle` array is the source of truth; GPU buffers are always rebuildable from it.

---

## 7. React Integration

### `useWebGLChart` Hook

This hook is the sole React entry point for the rendering engine. It accepts chart data and configuration, manages the entire engine lifecycle, and returns only a `ref` to attach to the canvas element.

```typescript
interface UseWebGLChartOptions {
  candles: OHLCVCandle[];
  config: PanelConfig;
  theme: 'dark' | 'light';
  onViewportChange?: (viewport: ViewportTransform) => void;
}

interface UseWebGLChartResult {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewport: ViewportTransform;
  setViewport: (vp: ViewportTransform) => void;
}

function useWebGLChart(options: UseWebGLChartOptions): UseWebGLChartResult;
```

Internal lifecycle:
1. `useEffect([], [])` — runs once on mount. Creates the `ChartEngine` instance, passes `canvasRef.current` as the canvas, starts the render loop.
2. `useEffect([options.candles])` — when candles change, calls `engine.setCandles(candles)` which triggers a buffer update and dirty flag.
3. `useEffect([options.theme])` — when theme changes, calls `engine.setTheme(theme)` which updates color uniforms and sets dirty.
4. `useEffect` cleanup — calls `engine.destroy()` which calls `regl.destroy()`, cancels the animation frame, disconnects the `ResizeObserver`, and removes all event listeners.

The hook deliberately does not hold `ChartEngine` in React state (which would cause re-renders on every engine mutation). Instead it holds it in a `useRef`, keeping engine mutations out of the React render cycle entirely.

### `ChartPanel` Component

`ChartPanel` wraps `useWebGLChart` and composes the full panel UI:

```typescript
interface ChartPanelProps {
  config: PanelConfig;
  candles: OHLCVCandle[];
  theme: 'dark' | 'light';
}

function ChartPanel({ config, candles, theme }: ChartPanelProps): React.ReactElement {
  const { canvasRef } = useWebGLChart({ candles, config, theme });

  return (
    <div className="chart-panel" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* WebGL canvas — fills the container */}
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* HTML overlay for axis labels — pointer-events: none so clicks pass through */}
      <div className="axis-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* AxisLabelManager writes directly into this element via DOM mutations */}
      </div>
    </div>
  );
}
```

`ChartPanel` accepts `candles` as a prop, which means data fetching and subscription logic lives in a parent component or data layer — `ChartPanel` has no awareness of WebSockets or application state. This matches the established package boundary: `@terminal/ui` receives data, it does not fetch it.

### Cleanup on Unmount

`useWebGLChart`'s cleanup function calls `engine.destroy()`:

```typescript
engine.destroy() {
  cancelAnimationFrame(this.rafHandle);
  this.resizeObserver.disconnect();
  this.canvas.removeEventListener('mousemove', this.onMouseMove);
  this.canvas.removeEventListener('wheel', this.onWheel);
  this.regl.destroy();    // releases all GPU buffers and the WebGL context
}
```

`regl.destroy()` is comprehensive — it destroys all buffers, textures, framebuffers, and shaders allocated through that regl instance, and loses the WebGL context. No GPU resource leaks are possible after destroy.

---

## 8. File Structure

All rendering engine files live under `packages/ui/src/rendering/`. The structure below reflects Phase 1c scope. Stubs are created for Phase 1d renderers so the module graph is consistent.

```
packages/ui/src/rendering/
│
├── index.ts                          ← public API barrel: exports useWebGLChart, ChartPanel,
│                                       ViewportTransform, ChartEngine
│
├── ChartEngine.ts                    ← top-level engine class: owns regl instance, render loop,
│                                       dirty flag, all renderer instances
│
├── ViewportTransform.ts              ← coordinate space conversions, projection matrix,
│                                       pan/zoom mutations, fitToData, visibleTimeRange/Price
│
├── AxisLabelManager.ts               ← HTML overlay label pool: manages <span> elements for
│                                       price and time axis ticks, repositions them each frame
│
├── renderers/
│   ├── CandlestickRenderer.ts        ← creates regl commands for bodies and wicks,
│   │                                   manages instance attribute buffers, ring buffer logic
│   ├── GridRenderer.ts               ← adaptive tick computation, grid line vertex buffer,
│   │                                   regl command for line primitives
│   ├── CrosshairRenderer.ts          ← fullscreen quad command, cursor uniform, discard shader
│   └── VolumeRenderer.ts             ← stub for Phase 1d: volume bar instanced rendering
│
├── shaders/
│   ├── candle.vert.glsl              ← instance expansion: quad corners → body corners
│   ├── candle.frag.glsl              ← bullish/bearish color output
│   ├── wick.vert.glsl                ← instance expansion: high/low → thin quad
│   ├── wick.frag.glsl                ← wick color output (same uniform as candle)
│   ├── grid.vert.glsl                ← pixel-space passthrough with projection
│   ├── grid.frag.glsl                ← semi-transparent grid color
│   ├── crosshair.vert.glsl           ← fullscreen clip-space quad
│   └── crosshair.frag.glsl           ← discard non-crosshair fragments
│
├── hooks/
│   └── useWebGLChart.ts              ← React hook: canvas ref, engine lifecycle,
│                                       candle/theme effect handlers, cleanup
│
├── components/
│   └── ChartPanel.tsx                ← React component: canvas + HTML overlay wrapper,
│                                       receives OHLCVCandle[] and PanelConfig as props
│
├── utils/
│   ├── niceNumbers.ts                ← nice number / tick interval selection algorithm
│   ├── binarySearch.ts               ← binarySearchFirst / binarySearchLast on sorted arrays
│   ├── ringBuffer.ts                 ← RingBuffer<T> generic with writeHead, count, evict
│   └── pixelRatio.ts                 ← devicePixelRatio helpers, canvas sizing
│
└── types.ts                          ← rendering-internal types: RendererOptions, ThemeColors,
                                        CandleInstanceData, GridTick — not exported from index
```

### Module Dependency Graph (within rendering/)

```
ChartPanel.tsx
  └── useWebGLChart.ts
        └── ChartEngine.ts
              ├── ViewportTransform.ts
              ├── AxisLabelManager.ts
              │     └── ViewportTransform.ts
              ├── renderers/CandlestickRenderer.ts
              │     ├── shaders/candle.vert.glsl
              │     ├── shaders/candle.frag.glsl
              │     ├── shaders/wick.vert.glsl
              │     ├── shaders/wick.frag.glsl
              │     ├── utils/ringBuffer.ts
              │     ├── utils/binarySearch.ts
              │     └── ViewportTransform.ts
              ├── renderers/GridRenderer.ts
              │     ├── shaders/grid.vert.glsl
              │     ├── shaders/grid.frag.glsl
              │     ├── utils/niceNumbers.ts
              │     └── ViewportTransform.ts
              └── renderers/CrosshairRenderer.ts
                    ├── shaders/crosshair.vert.glsl
                    └── shaders/crosshair.frag.glsl
```

No module in `rendering/` imports from `rendering/` siblings at the same level except through `ChartEngine.ts`, which is the single composition root. This prevents circular dependencies and makes individual renderers independently testable.

---

## 9. Architectural Decisions and Trade-offs

### Decision 1: One regl Context Per Panel

**Chosen:** Each chart panel creates its own regl instance bound to its own canvas.

**Alternative considered:** A single shared WebGL context with all panels rendered into sub-regions of a single canvas, as done by SciChart.js's SubCharts API.

**Trade-off:** The shared-context approach can batch draw calls across panels and avoids the browser's 16-context limit entirely. However it requires a framebuffer management layer, explicit render target switching between panels, and a global draw call scheduler. This adds significant complexity before any charting code is written. The per-panel isolation approach is simpler, more debuggable, and sufficient for a trading terminal where the number of visible chart panels is typically 1–6. If context count becomes a constraint in a later phase (dashboard mode with 12+ panels), a shared-context renderer can be introduced as an alternative backend behind the same `ChartEngine` interface.

### Decision 2: CPU Pre-computation of Pixel Positions

**Chosen:** Pixel-space X/Y coordinates for candle instances are computed on the CPU before upload. The vertex shader does minimal arithmetic.

**Alternative considered:** Upload raw `(timestamp, price)` pairs and perform the full data-to-pixel transform in the vertex shader using pan/zoom uniforms.

**Trade-off:** The shader-side transform approach means a pan or zoom operation requires only changing two uniforms — no buffer re-upload at all. The CPU pre-computation approach requires re-uploading the visible slice (up to ~400 candles * 24 bytes = ~9.6KB) on each pan/zoom step. At 60 FPS this is 576KB/s of upload — entirely within GPU bus bandwidth. The CPU approach is chosen because it keeps the vertex shaders simple and makes the coordinate transform logic testable in plain TypeScript rather than requiring shader unit tests. The performance difference is negligible at the data volumes this phase targets.

### Decision 3: HTML Overlay for Axis Labels

**Chosen:** Axis tick labels are HTML `<span>` elements positioned absolutely over the canvas.

**Alternative considered:** Render tick labels as textured quads using a pre-baked font atlas (the approach SciChart.js calls "Native Text").

**Trade-off:** Font atlas text is GPU-efficient and integrates cleanly into the WebGL compositing stack. However, building and maintaining a font atlas texture (handling different locales, decimal separators, font size changes) is substantial engineering work. HTML text benefits from the browser's text rendering pipeline (subpixel antialiasing, locale-aware number formatting, accessibility). For Phase 1, axis labels are simple numeric strings that do not require per-frame GPU compositing. The HTML overlay approach is the correct trade-off for this phase. Font atlas text rendering is explicitly deferred to Phase 2 when in-chart annotations (order level labels, alert lines) will justify the investment.

### Decision 4: Immutable ViewportTransform

**Chosen:** `ViewportTransform` instances are immutable. Pan and zoom return new instances.

**Alternative considered:** A mutable class with `pan()` and `zoom()` methods that update in place.

**Trade-off:** Immutability adds a small allocation cost per interaction (one `ViewportTransform` object per mouse event). The benefits are: easy equality comparison for memoization, straightforward animation interpolation between two transforms, and no risk of a renderer holding a stale reference after a viewport update. Given that `ViewportTransform` is a small object (~10 numeric fields), allocation cost is negligible.

### Decision 5: Two Draw Calls for Candles (Bodies + Wicks Separate)

**Chosen:** Candle bodies and wicks are rendered in separate draw calls with separate instance buffers.

**Alternative considered:** A single draw call that renders both body and wick geometry per instance, using a per-vertex mode flag to switch between body and wick geometry.

**Trade-off:** A single draw call reduces WebGL call overhead but forces body and wick geometry into the same instance layout, complicating the vertex shader and buffer management. Two draw calls at ~400 visible candles is negligible — the GPU processes them back-to-back within the same frame with no state change between them (same shader program, same uniforms via scope). The two-call approach is chosen for clarity.
