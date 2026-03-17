# WebGL/Canvas Financial Data Rendering: Comprehensive Research Report

**Sprint 8 Architecture Research | March 2026**

This report covers rendering strategies for HD heatmaps, footprint charts, volume bubbles, and orderbook depth visualizations in a web-based trading platform. It is based on a multi-hop crawl through GitHub repos, developer networks, blog posts, and documentation.

---

## Table of Contents

1. [Developer Network Map](#1-developer-network-map)
2. [Repository Catalog with Technical Details](#2-repository-catalog-with-technical-details)
3. [Rendering Architecture Comparison](#3-rendering-architecture-comparison)
4. [Performance Patterns and Benchmarks](#4-performance-patterns-and-benchmarks)
5. [Shader and Texture Strategies](#5-shader-and-texture-strategies)
6. [Recommended Architecture for Our App](#6-recommended-architecture-for-our-app)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Developer Network Map

### Core Network: WebGL Visualization Experts

```
Mikola Lysenko (mikolalysenko)
  ├── Created: regl (5.5k stars) — functional WebGL wrapper
  ├── Created: glslify (2.3k stars) — GLSL module system
  ├── Created: ndarray — multidimensional arrays for JS
  ├── Created: headless-gl (1.9k stars) — server-side WebGL
  │
  ├──> Ricky Reusser (rreusser)
  │     ├── Observable WebGL collection (dozens of notebooks)
  │     ├── regl tools and tutorials
  │     ├── Density-based opacity techniques (cited by regl-scatterplot)
  │     └── WebGL line rendering, domain coloring, simulation notebooks
  │
  ├──> Fritz Lekschas (flekschas)
  │     ├── regl-scatterplot — 20M point scatter plots with WebGL
  │     ├── JOSS published paper on scalable interactive scatter plots
  │     ├── jscatter — Jupyter widget wrapping regl-scatterplot
  │     └── Density-based opacity extending Reusser's work
  │
  └──> Plotly team
        ├── Plotly fork of regl
        ├── scattergl, heatmapgl traces (WebGL-backed)
        └── Used in production at scale

Narayana Swamy (nswamy14)
  ├── Created: visual-heatmap — WebGL heatmap, 500K+ points
  ├── Created: I2Djs — 2D/WebGL rendering framework
  └── Published shader architecture for two-pass heatmap rendering

Florian Boesch (pyalot)
  ├── Created: webgl-heatmap — foundational WebGL heatmap library
  ├── Framebuffer + floating-point texture architecture
  └──> Forked by vrtigo (CommonJS/NPM), ursudio (Leaflet plugin)

Dan Chitnis (danchitnis)
  ├── Created: webgl-plot — real-time 2D WebGL plotting
  ├── Oscilloscope-style streaming data
  └── Benchmarked JS vs Python vs C++ WebGL kernel performance

Hunter G (hunterg325) / ChartGPU team
  ├── Created: ChartGPU — WebGPU charting, 50M points at 60 FPS
  ├── Candlestick support, LTTB downsampling
  └── GPU compute shaders for aggregation
```

### Financial Trading Visualization Network

```
Ivo Elenchev (Elenchev)
  ├── Created: order-book-heatmap (472 stars) — D3/SVG orderbook viz
  ├── Binance WS API integration
  └── Noted SVG→Canvas migration would improve performance

flowsurface-rs team
  ├── Created: flowsurface — Rust/Iced desktop orderflow platform
  ├── Heatmap DOM, footprint charts, candlestick, ladder
  └── Direct exchange WebSocket connections (Binance, Bybit, OKX)

DegenSugarBoo
  ├── Created: OpenBook — Rust/egui depth heatmap
  ├── Two-thread architecture: tokio WS ingestion + egui rendering
  └── Clone-snapshot pattern for heatmap texture updates

Chao Yan (cyanly)
  ├── Created: lbplot-rs — Limit OrderBook heatmap in Rust/WASM
  ├── Uses plotters-rs for Canvas rendering
  └── Also created gotrade (electronic trading system in Go)

gameofbombs
  └── Created: pixi-candles — PixiJS v5 candlestick rendering

TradingView team
  ├── lightweight-charts (Canvas 2D, NOT WebGL)
  ├── fancy-canvas — pixel-perfect canvas rendering
  └── Data conflation (v5.1) for LOD at zoom-out

D3FC / Scott Logic team
  ├── d3fc-webgl — WebGL financial series (candlestick, bar, OHLC)
  ├── 40x faster than canvas batch rendering
  └── Shader-based scaling (bypass D3 scales entirely)
```

### Commercial / Closed-Source References

```
SciChart.js — WebAssembly + WebGL (Visual Xccelerator engine)
  ├── 100M data points at 60 FPS
  ├── SubCharts API: batched draw calls across multiple charts
  ├── Native WebGL text rendering
  └── WebGL context sharing (16 context browser limit workaround)

Bookmap — Java + OpenGL 3.3
  ├── 40 FPS default, GPU-accelerated depth heatmap
  ├── Non-aggregated market data visualization
  └── Fine-tuned for human visual perception

DXcharts (Devexperts) — Professional white-labeled charting
  └── Custom JS indicators, financial charting library
```

---

## 2. Repository Catalog with Technical Details

### Tier 1: Directly Applicable (Financial + High Performance)

#### ChartGPU
- **URL**: https://github.com/ChartGPU/ChartGPU
- **Stars**: Growing rapidly (launched Jan 2026)
- **Rendering**: WebGPU (compute shaders)
- **Performance**: 50M points at 60 FPS, 35M points at ~72 FPS
- **Frame budget**: GPU compute shaders handle all aggregation/downsampling
- **Data strategy**: LTTB + OHLC sampling built-in; GPU-binned density/heatmap mode
- **Architecture**: Functional-first, `ChartGPU.create(...)` owns canvas + WebGPU lifecycle, 11 specialized render modules
- **Financial**: Candlestick series with 5M candles at 100+ FPS, real-time streaming via `appendData()`
- **Limitation**: No Firefox support (WebGPU not available); WebGPU adoption still growing
- **License**: MIT

#### D3FC WebGL (`d3fc-webgl`)
- **URL**: https://github.com/d3fc/d3fc/tree/master/packages/d3fc-webgl
- **Rendering**: WebGL (via custom shader programs)
- **Performance**: ~40x faster than Canvas2D batch rendering
- **Key innovation**: Shader-based scaling — D3 scales re-implemented in GLSL, GPU-side transforms
- **Buffer management**: Data buffers uploaded once; pan/zoom handled via GPU matrix transforms without re-upload
- **Financial series**: WebGL Candlestick, Bar, OHLC, Line, Point, Area
- **Decorate pattern**: Allows shader customization via `webglProgramBuilder`
- **Context management**: Automatic `webglcontextlost`/`webglcontextrestored` handling
- **License**: MIT

#### flowsurface
- **URL**: https://github.com/flowsurface-rs/flowsurface
- **Platform**: Native desktop (Rust/Iced)
- **Features**: Heatmap DOM, footprint charts, candlestick, DOM/ladder
- **Data**: Direct Binance, Bybit, Hyperliquid, OKX WebSocket streams
- **Architecture**: Rust core, memory-efficient, handles heavy bursts smoothly
- **Relevance**: Reference implementation for heatmap + footprint + ladder in a single platform
- **License**: Open source

#### OpenBook
- **URL**: https://github.com/DegenSugarBoo/OpenBook
- **Platform**: Native desktop (Rust/egui/eframe)
- **Architecture**: Two-thread model — background tokio runtime for WS data ingestion, UI thread clones snapshots for rendering
- **Features**: Bookmap-style depth heatmap, order flow analytics, trade tape, Fill:Kill burst detection
- **Relevance**: Clean separation of data and rendering concerns; snapshot cloning pattern

### Tier 2: Core WebGL Libraries (Building Blocks)

#### regl
- **URL**: https://github.com/regl-project/regl
- **Stars**: 5,518
- **Rendering**: Functional WebGL wrapper
- **Performance**: Dynamic code generation + partial evaluation removes almost all overhead
- **Design**: Stateless — two abstractions (resources + commands), no scene graph
- **Ecosystem**: Used by Plotly, regl-scatterplot, dozens of Observable notebooks
- **Testing**: 30,000+ unit tests, 95%+ code coverage
- **License**: MIT

#### visual-heatmap
- **URL**: https://github.com/nswamy14/visual-heatmap
- **Stars**: Growing (updated May 2025)
- **Rendering**: WebGL with custom GLSL shaders
- **Performance**: 500,000+ data points with good framerate
- **Shader architecture (two-pass)**:
  1. **Pass 1 (Gradient)**: Points rendered to off-screen framebuffer using additive blending; attributes: `a_position`, `a_intensity`
  2. **Pass 2 (Colorization)**: Framebuffer texture sampled; alpha channel maps to color gradient via `remap()` function interpolating between `u_colorArr` and `u_offset` uniform arrays
- **License**: MIT

#### pyalot/webgl-heatmap
- **URL**: https://github.com/pyalot/webgl-heatmap
- **Rendering**: WebGL with framebuffer objects (FBOs)
- **Architecture**: Classes for `Framebuffer`, `Heights`, `Shader`, `Texture`, `WebGLHeatmap`
- **Precision**: Supports half-float and single-float textures (checks for extensions)
- **Shader**: Minimal vertex shader (`gl_Position = vec4(position, 0.0, 1.0)`), gradient texture color mapping
- **License**: MIT

#### webgl-plot
- **URL**: https://github.com/danchitnis/webgl-plot
- **Rendering**: Native WebGL, minimal shaders
- **Vertex shader**: `gl_Position = vec4(uscale*line + uoffset, 0.0, 1.0)` — supports log axes via `is_log` uniform
- **Fragment shader**: Simple uniform color output
- **Performance**: CPU-limited (not GPU-limited) in JS; thick lines 6x slower than thin lines
- **v2 direction**: Moving more computation to GPU, migrating to WebGL2
- **License**: MIT

#### regl-scatterplot
- **URL**: https://github.com/flekschas/regl-scatterplot
- **Stars**: Published in JOSS
- **Performance**: Up to 20 million points with smooth pan/zoom
- **Density-based opacity**: Dynamically adjusts point opacity based on density and zoom level
- **Spatial indexing**: Fast lasso selection via spatial index (KDBush)
- **Visual encoding**: Points encoded as `[x, y, value, value]` — values map to color, opacity, or size
- **License**: MIT

### Tier 3: Reference & Ecosystem

#### TradingView lightweight-charts
- **URL**: https://github.com/tradingview/lightweight-charts
- **Rendering**: Canvas 2D only (NOT WebGL)
- **Key innovation**: Data conflation (v5.1) — merges data points when bar spacing < 0.5px
- **Performance**: Pixel-perfect rendering via `fancy-canvas` using `devicePixelContentBox`
- **Bundle size**: 35kB base
- **License**: Apache 2.0

#### KLineChart
- **URL**: https://github.com/klinecharts/KLineChart
- **Rendering**: Canvas 2D only
- **License**: Apache 2.0

#### pixi-candles
- **URL**: https://github.com/gameofbombs/pixi-candles
- **Rendering**: PixiJS v5 (WebGL-backed)
- **Features**: Antialiased bars and lines for candlestick charts

#### Elenchev/order-book-heatmap
- **URL**: https://github.com/Elenchev/order-book-heatmap
- **Stars**: 472
- **Rendering**: D3/SVG (performance-limited)
- **Note**: Author explicitly states replacing SVGs with canvas would improve performance significantly

#### lbplot-rs
- **URL**: https://github.com/cyanly/lbplot-rs
- **Platform**: Rust/WASM via Trunk
- **Rendering**: plotters-rs Canvas backend
- **Data**: Binance WebSocket orderbook data

#### deck.gl
- **URL**: https://github.com/visgl/deck.gl
- **Rendering**: WebGL2 / WebGPU
- **HeatmapLayer**: GPU-based Gaussian Kernel Density Estimation
- **Performance**: 1M points at 60 FPS (ScatterplotLayer), GPU aggregation much faster than CPU for >100K points
- **Texture notes**: 2048x2048 texture = 50-100ms aggregation; 512x512 = 5-7ms
- **Limitation**: iOS Safari falls back to 8-bit precision (no float texture rendering)

---

## 3. Rendering Architecture Comparison

### Canvas 2D vs WebGL vs WebGPU

| Aspect | Canvas 2D | WebGL | WebGPU |
|--------|-----------|-------|--------|
| **Initial load** | ~15ms (fast) | ~40ms (context setup) | ~50ms (adapter/device) |
| **Re-render** | ~1.2ms (CPU-bound) | ~0.01ms (GPU draw) | ~0.01ms (GPU compute+draw) |
| **Pan/zoom** | CPU matrix transforms (slow at scale) | GPU matrix transforms (fast) | GPU compute (fastest) |
| **Comfort zone** | <10K points | 10K - 5M points | 1M - 50M+ points |
| **Draw calls** | 1 per path/shape | Batchable via instancing/atlasing | Batchable + compute |
| **Browser support** | Universal | Universal | Chrome 113+, Safari 18+ (no Firefox) |
| **Data upload** | Every frame (CPU) | Upload once, transform on GPU | Upload once, compute on GPU |
| **Float precision** | N/A | 32-bit (with 64-bit emulation) | 32-bit native |
| **iOS support** | Full | Full (some limitations) | Safari 18+ only |

### When to Use Each

- **Canvas 2D**: UI overlays, axis labels, crosshairs, annotations, small static charts (<10K points)
- **WebGL**: Heatmaps, depth charts, candlestick rendering, volume profiles with 10K-5M points; best browser compatibility
- **WebGPU**: Future-proof for 1M+ point datasets; compute shader aggregation; only viable if Firefox support is not required

### Recommended: Hybrid Canvas 2D + WebGL Architecture

Use WebGL for data-heavy rendering layers (heatmap, depth, volume) and Canvas 2D for UI overlays (labels, crosshairs, tooltips, annotations). This is the approach used by SciChart.js and most professional charting platforms.

---

## 4. Performance Patterns and Benchmarks

### Benchmark Summary

| Library/Approach | Data Points | FPS | Notes |
|-----------------|-------------|-----|-------|
| ChartGPU (WebGPU) | 35M | 72 | Benchmark mode |
| ChartGPU (WebGPU) | 5M candles | 100+ | Live candlestick streaming |
| ChartGPU (WebGPU) | 1M | 60 | Smooth zoom/pan |
| SciChart.js (WebGL+WASM) | 100M | 60 | With SubCharts API batching |
| SciChart.js (WebGL+WASM) | 10M | <25ms | Single render call |
| deck.gl (WebGL2) | 1M | 60 | ScatterplotLayer |
| regl-scatterplot (WebGL) | 20M | Smooth | Pan/zoom maintained |
| D3FC WebGL | 1M | 60 | 40x faster than Canvas batch |
| visual-heatmap (WebGL) | 500K | Good | Two-pass shader pipeline |
| webgl-plot (WebGL) | ~50K lines | 60 | CPU-limited in JS |
| Canvas 2D | 10K | 60 | Beyond this, FPS drops |
| Canvas 2D | 50K | 22 | Noticeably degraded |
| Bookmap (OpenGL) | Non-aggregated | 40 | 1-3% CPU per chart |

### Critical Performance Patterns

#### Pattern 1: Upload Once, Transform on GPU
The most important optimization for pan/zoom performance. Upload data buffers to the GPU once; use uniform-based scale/offset transforms for pan/zoom operations. D3FC and webgl-plot both demonstrate this:

```glsl
// Vertex shader pattern — pan/zoom without data re-upload
gl_Position = vec4(uscale * position + uoffset, 0.0, 1.0);
```

Changing `uscale` and `uoffset` uniforms is essentially free compared to re-uploading vertex buffers.

#### Pattern 2: Instanced Rendering for Repeated Geometry
Candlestick bars, volume bars, and heatmap cells share the same base geometry (a quad). Use WebGL instanced rendering (`ANGLE_instanced_arrays` extension or WebGL2 native) to render thousands of bars in a single draw call:

- Without instancing: 3 WebGL calls per bar * N bars = 3N calls
- With instancing: 2 calls total for all N bars
- SciChart's SubCharts API batches draw calls across multiple charts, yielding 8-10x speedup

#### Pattern 3: Two-Pass Framebuffer Heatmap
Used by both visual-heatmap and pyalot/webgl-heatmap:

1. **Pass 1 — Accumulation**: Render data points to off-screen framebuffer with additive blending. Each point contributes intensity via a radial falloff function.
2. **Pass 2 — Colorization**: Sample the framebuffer texture; map accumulated intensity (alpha channel) to a color gradient using a lookup texture or uniform color array.

This decouples data density accumulation from color mapping, allowing both to be GPU-accelerated.

#### Pattern 4: Data Decimation / Level-of-Detail (LOD)

- **LTTB (Largest Triangle Three Buckets)**: O(n) single-pass algorithm that preserves visual shape while reducing points. Used by ChartGPU, TradingView's data conflation. Ideal for time-series downsample before GPU upload.
- **OHLC Sampling**: For candlestick data, aggregate into OHLC bars at coarser time intervals when zoomed out.
- **TradingView's Data Conflation**: Automatically merges data points when bar spacing < 0.5 pixels. Transparent to developers at typical zoom levels, activates only at extreme zoom-out.
- **MinMax Downsampling**: Keep min/max per bucket to preserve peaks and valleys.

#### Pattern 5: Spatial Indexing for Interaction
Use KD-trees, quadtrees, or R-trees for:
- Hit testing (which data point did the user click?)
- Lasso selection (regl-scatterplot uses KDBush)
- Viewport-based data loading (only process visible data)

#### Pattern 6: Texture-as-Data
Encode time-series or heatmap grid values into GPU textures instead of vertex buffers:
- Use `gl.NEAREST` filtering for precise data texel access
- Address individual pixels: `texcoord = (pixelCoord + 0.5) / textureDimensions`
- Prefer RGBA8 format over RGB8 (RGB8 is surprisingly slow internally)
- For WebGL2, use `texStorage` + `texSubImage` for better performance

#### Pattern 7: Ping-Pong Framebuffers for Stateful Rendering
For effects that depend on previous frame state (e.g., fading heatmap trails, particle systems):
- Maintain two framebuffers (A and B)
- Each frame: read from A, write to B, then swap
- Required because WebGL prohibits simultaneous read/write on the same texture

#### Pattern 8: Debounce Aggregation on Interaction
Large datasets + large kernel radius can cause freezes during pan/zoom. deck.gl's `debounceTimeout` pattern: delay expensive aggregation during active interaction, only recompute after user stops.

---

## 5. Shader and Texture Strategies

### 5.1 Heatmap Shader Strategy

#### Two-Pass Accumulation + Colorization (Recommended)

**Pass 1 — Vertex Shader (Accumulation):**
```glsl
attribute vec2 a_position;
attribute float a_intensity;
uniform vec2 u_resolution;
uniform float u_pointSize;
varying float v_intensity;

void main() {
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);
    gl_PointSize = u_pointSize;
    v_intensity = a_intensity;
}
```

**Pass 1 — Fragment Shader (Radial Falloff + Accumulation):**
```glsl
varying float v_intensity;

void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float falloff = 1.0 - (dist * 2.0);
    falloff = falloff * falloff; // quadratic falloff
    gl_FragColor = vec4(0.0, 0.0, 0.0, v_intensity * falloff);
}
```

Enable additive blending: `gl.blendFunc(gl.ONE, gl.ONE)`

**Pass 2 — Fragment Shader (Color Mapping):**
```glsl
uniform sampler2D u_heatTexture;
uniform vec4 u_colorStops[8];  // color gradient stops
uniform float u_offsets[8];     // gradient stop positions
uniform int u_numStops;

float remap(float value) {
    for (int i = 0; i < 7; i++) {
        if (value >= u_offsets[i] && value <= u_offsets[i + 1]) {
            float t = (value - u_offsets[i]) / (u_offsets[i + 1] - u_offsets[i]);
            // Return interpolated color via mix
        }
    }
}

void main() {
    vec4 texel = texture2D(u_heatTexture, v_texCoord);
    float intensity = texel.a; // accumulated intensity from pass 1
    gl_FragColor = colorFromGradient(intensity);
}
```

#### Alternative: Gradient Texture Lookup
Instead of uniform arrays, bake the color gradient into a 1D texture (256x1 or 512x1). Sample with intensity as the U coordinate:
```glsl
gl_FragColor = texture2D(u_gradientTexture, vec2(intensity, 0.5));
```
This is simpler, faster, and allows dynamic gradient changes by swapping the gradient texture.

### 5.2 Orderbook Depth Heatmap Strategy

For a Bookmap-style rolling depth heatmap:

1. **Data structure**: Ring buffer texture (2D texture where X = time, Y = price level, pixel value = order volume)
2. **Update**: Each tick, write a new column of depth data to the texture using `texSubImage2D` at the current write position
3. **Render**: Sample the texture with a time offset uniform to handle the ring buffer wrap-around
4. **Color mapping**: Map pixel intensity to a heat gradient (blue→green→yellow→red)

```glsl
// Fragment shader for rolling heatmap
uniform sampler2D u_depthTexture;
uniform float u_timeOffset; // ring buffer write position
uniform sampler2D u_colorGradient;

void main() {
    vec2 uv = v_texCoord;
    uv.x = mod(uv.x + u_timeOffset, 1.0); // ring buffer wrap
    float depth = texture2D(u_depthTexture, uv).r;
    float normalizedDepth = clamp(depth / u_maxDepth, 0.0, 1.0);
    gl_FragColor = texture2D(u_colorGradient, vec2(normalizedDepth, 0.5));
}
```

**Texture sizing**: A 2048x1024 texture covers ~2048 time steps x 1024 price levels. At 2 updates/second, that is ~17 minutes of history. For longer history, use multiple textures or reduce time resolution when scrolling back.

### 5.3 Footprint Chart Strategy

Footprint charts overlay volume data (bid/ask) on candlestick bars at each price level within the bar:

1. **Geometry**: Each footprint cell is a quad (4 vertices or 2 triangles). Use instanced rendering — one instance per cell.
2. **Instance attributes**: `[priceLevel, timeIndex, bidVolume, askVolume, imbalanceRatio]`
3. **Color encoding**: Use the fragment shader to color cells based on:
   - Bid/ask imbalance ratio (green for bid-heavy, red for ask-heavy)
   - Volume magnitude (opacity or brightness)
   - Naked POC (point of control) highlighting

```glsl
// Instance attributes
attribute vec2 a_cellPosition;  // price level, time index
attribute vec2 a_volumes;       // bid volume, ask volume
attribute float a_imbalance;    // pre-computed imbalance ratio

// Fragment shader
void main() {
    float totalVolume = a_volumes.x + a_volumes.y;
    float normalizedVolume = clamp(totalVolume / u_maxVolume, 0.0, 1.0);

    vec3 color;
    if (a_imbalance > u_imbalanceThreshold) {
        color = mix(u_neutralColor, u_bidColor, a_imbalance);
    } else if (a_imbalance < -u_imbalanceThreshold) {
        color = mix(u_neutralColor, u_askColor, -a_imbalance);
    } else {
        color = u_neutralColor;
    }

    gl_FragColor = vec4(color, normalizedVolume);
}
```

4. **Text labels**: Render volume numbers using a text atlas texture (pre-rendered digit glyphs). Map digit positions via UV coordinates. This avoids per-frame text rendering overhead.

### 5.4 Volume Bubble Strategy

Volume bubbles show trade volume at price/time coordinates with size proportional to volume:

1. **Geometry**: GL_POINTS with `gl_PointSize` controlled by volume
2. **Fragment shader**: Render circles with soft edges using distance from center

```glsl
// Vertex shader
attribute vec2 a_position;   // time, price
attribute float a_volume;
attribute float a_side;      // 0 = buy, 1 = sell

uniform vec2 u_scale;
uniform vec2 u_offset;
uniform float u_maxPointSize;

varying float v_side;
varying float v_normalizedVolume;

void main() {
    gl_Position = vec4(a_position * u_scale + u_offset, 0.0, 1.0);
    v_normalizedVolume = clamp(a_volume / u_maxVolume, 0.0, 1.0);
    gl_PointSize = mix(2.0, u_maxPointSize, sqrt(v_normalizedVolume));
    v_side = a_side;
}

// Fragment shader
void main() {
    float dist = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (dist > 1.0) discard;

    float alpha = 1.0 - smoothstep(0.7, 1.0, dist); // soft edge
    vec3 color = mix(u_buyColor, u_sellColor, v_side);
    gl_FragColor = vec4(color, alpha * 0.7);
}
```

3. **Performance note**: `GL_POINTS` is extremely fast — a single draw call handles all bubbles. For very large points, consider switching to instanced quads (GL_POINTS has implementation-defined maximum size, typically 64-256px).

### 5.5 Texture Atlas for Text/Labels

For rendering numeric labels (volume numbers, prices) on footprint cells and heatmap overlays:

1. Pre-render all digit glyphs (0-9, comma, period, K, M) into a single texture atlas
2. Each label is a series of instanced quads, each sampling the appropriate glyph region
3. Use UV coordinate offsets to select the correct glyph from the atlas

This avoids the extreme cost of Canvas 2D `fillText()` per frame and keeps everything in a single WebGL draw call. SciChart.js uses a similar approach with their "Native Text" WebGL rendering.

---

## 6. Recommended Architecture for Our App

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  React components, state management, data subscriptions  │
├─────────────────────────────────────────────────────────┤
│                   Rendering Coordinator                  │
│  Frame budget manager, layer compositor, resize handler  │
├──────────┬──────────┬──────────┬────────────────────────┤
│ WebGL    │ WebGL    │ WebGL    │ Canvas 2D              │
│ Heatmap  │ Footprint│ Volume   │ UI Overlay             │
│ Layer    │ Layer    │ Layer    │ Layer                   │
│          │          │          │                         │
│ 2-pass   │ Instanced│ GL_POINTS│ Labels, crosshairs,    │
│ FBO      │ quads    │ + quads  │ tooltips, annotations  │
│ shader   │ + text   │          │                        │
│          │ atlas    │          │                        │
├──────────┴──────────┴──────────┴────────────────────────┤
│                   Data Pipeline                          │
│  Ring buffers, LTTB downsampling, spatial indexing       │
├─────────────────────────────────────────────────────────┤
│                   WebSocket Layer                        │
│  Market data ingestion, orderbook state, trade stream    │
└─────────────────────────────────────────────────────────┘
```

### Layer Stack (Bottom to Top)

1. **WebGL Canvas** (single shared context): Heatmap, footprint cells, volume bubbles, depth area fill
2. **Canvas 2D Overlay**: Price/time axes, labels, crosshairs, tooltips, annotations
3. **HTML Overlay**: Tooltips with rich content, context menus

### Core Design Decisions

#### Decision 1: WebGL (not WebGPU) as Primary Renderer
- **Rationale**: Universal browser support including Firefox and iOS Safari. WebGPU is not yet viable for a production trading platform that must support all browsers.
- **Future path**: Architect with abstraction layer so WebGPU backend can be added later when Firefox supports it. ChartGPU's architecture (modular render coordinator) is a good model.

#### Decision 2: Single WebGL Context with Multiple Render Passes
- **Rationale**: Browser limit of 16 WebGL contexts. A multi-chart trading dashboard can easily exceed this. SciChart.js's SubCharts API validates this approach — batching draw calls into one context doubled their performance.
- **Implementation**: One WebGL context per chart widget. Each visualization type (heatmap, footprint, volume) is a render pass within that context.

#### Decision 3: regl as WebGL Abstraction Layer
- **Rationale**: 5.5K stars, functional/stateless design, minimal overhead via code generation, used by Plotly in production, excellent ecosystem (glslify for shader modules). Removes WebGL state management complexity without adding scene graph overhead.
- **Alternative considered**: Raw WebGL2 for maximum control. Rejected due to development velocity concerns — regl provides the same performance with less boilerplate.

#### Decision 4: Hybrid Data Flow — Snapshot Cloning Pattern
- **Rationale**: OpenBook's architecture proves this pattern works well for trading data. WebSocket data arrives on a background thread/worker. UI thread clones a snapshot of current state each frame. This prevents rendering from blocking data ingestion and vice versa.
- **Implementation**: Use a Web Worker for WebSocket management and orderbook state. Transfer snapshots to main thread via `postMessage` with `Transferable` objects (ArrayBuffers) for zero-copy transfer.

#### Decision 5: Ring Buffer Texture for Depth Heatmap
- **Rationale**: Continuous time-series heatmap (like Bookmap) maps naturally to a ring buffer in a 2D texture. `texSubImage2D` updates are very fast (single column per tick). No need to re-upload entire texture.
- **Sizing**: 2048x1024 (time x price) = 8MB at RGBA8. Acceptable GPU memory footprint.

### Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| WebGL wrapper | regl | Functional, stateless, code-gen optimized, production-proven |
| Shader modules | glslify | Node-style GLSL modules, same ecosystem as regl |
| Data downsampling | Custom LTTB | O(n), preserves visual shape, well-documented |
| Spatial indexing | KDBush / Flatbush | Used by regl-scatterplot, fast point-in-viewport queries |
| Canvas 2D overlay | fancy-canvas or custom | Pixel-perfect rendering (from TradingView's approach) |
| Data transfer | Web Workers + Transferable | Zero-copy ArrayBuffer transfer from WS worker to render thread |
| Framework integration | React + refs | React manages component lifecycle; refs provide direct canvas access |

### GPU Memory Budget

| Resource | Size | Notes |
|----------|------|-------|
| Depth heatmap texture | 8 MB | 2048x1024 RGBA8 |
| Footprint data buffer | 4 MB | ~250K cells * 16 bytes/cell |
| Volume bubble buffer | 2 MB | ~125K trades * 16 bytes |
| Color gradient textures | 4 KB | 256x1 RGBA8 per gradient |
| Text atlas texture | 256 KB | 512x512 RGBA8 digit glyphs |
| Framebuffer (heatmap) | 8 MB | Same as heatmap texture |
| **Total per chart** | **~22 MB** | Well within GPU limits |

### Frame Budget (Targeting 60 FPS = 16.67ms per frame)

| Phase | Budget | Notes |
|-------|--------|-------|
| Data snapshot transfer | 1 ms | Transferable ArrayBuffers |
| LTTB downsampling (if needed) | 2 ms | Only on zoom change |
| Buffer updates | 1 ms | texSubImage2D for new data |
| Heatmap render (2 passes) | 3 ms | GPU-bound |
| Footprint render | 2 ms | Instanced draw |
| Volume bubble render | 1 ms | Single GL_POINTS call |
| Canvas 2D overlay | 2 ms | Labels, crosshairs |
| Compositor/swap | 1 ms | |
| **Total** | **~13 ms** | 3.67ms headroom |

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Set up regl-based rendering pipeline with single WebGL context
2. Implement Canvas 2D overlay system for labels/crosshairs
3. Build Web Worker data pipeline with Transferable ArrayBuffer transfer
4. Create ring buffer texture manager for depth heatmap

### Phase 2: Heatmap (Week 3-4)
1. Implement two-pass heatmap shader (accumulation + colorization)
2. Build ring buffer texture update system (texSubImage2D per tick)
3. Implement zoom/pan via uniform-based scale/offset transforms
4. Add color gradient texture with configurable palettes
5. Integrate with live orderbook WebSocket feed

### Phase 3: Footprint Charts (Week 5-6)
1. Implement instanced quad rendering for footprint cells
2. Build text atlas texture for volume label rendering
3. Implement bid/ask imbalance coloring shader
4. Add POC (Point of Control) and naked POC highlighting
5. Implement OHLC candlestick overlay using instanced rendering

### Phase 4: Volume Bubbles + Depth Chart (Week 7-8)
1. Implement GL_POINTS-based volume bubble rendering
2. Build depth chart area fill using triangle strip geometry
3. Implement LOD / LTTB downsampling for zoom-out scenarios
4. Add spatial indexing (KDBush) for hit testing and tooltips

### Phase 5: Optimization (Week 9-10)
1. Profile and optimize draw calls (target <10 per frame)
2. Implement debounced aggregation during active interaction
3. Add WebGL context loss/restoration handling
4. Memory profiling and texture management optimization
5. Cross-browser testing (Chrome, Firefox, Safari, iOS Safari)

---

## Appendix A: Key References

### Libraries & Repos
- [ChartGPU](https://github.com/ChartGPU/ChartGPU) — WebGPU charting, 50M points at 60 FPS
- [regl](https://github.com/regl-project/regl) — Functional WebGL wrapper
- [d3fc-webgl](https://github.com/d3fc/d3fc/tree/master/packages/d3fc-webgl) — WebGL financial chart series
- [visual-heatmap](https://github.com/nswamy14/visual-heatmap) — WebGL heatmap, 500K+ points
- [pyalot/webgl-heatmap](https://github.com/pyalot/webgl-heatmap) — Foundational WebGL heatmap
- [webgl-plot](https://github.com/danchitnis/webgl-plot) — Real-time WebGL 2D plotting
- [regl-scatterplot](https://github.com/flekschas/regl-scatterplot) — 20M point scatter plots
- [deck.gl](https://github.com/visgl/deck.gl) — WebGL2/WebGPU visualization framework
- [lightweight-charts](https://github.com/tradingview/lightweight-charts) — TradingView Canvas 2D charts
- [flowsurface](https://github.com/flowsurface-rs/flowsurface) — Rust orderflow platform
- [OpenBook](https://github.com/DegenSugarBoo/OpenBook) — Rust/egui depth heatmap
- [order-book-heatmap](https://github.com/Elenchev/order-book-heatmap) — D3 orderbook viz
- [lbplot-rs](https://github.com/cyanly/lbplot-rs) — Rust/WASM orderbook heatmap
- [pixi-candles](https://github.com/gameofbombs/pixi-candles) — PixiJS candlestick rendering
- [Canvas2DtoWebGL](https://github.com/jagenjo/Canvas2DtoWebGL) — Canvas2D API on WebGL

### Articles & Documentation
- [Rendering One Million Datapoints with D3 and WebGL](https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html) — Scott Logic
- [60 to 1500 FPS: Optimising a WebGL Visualisation](https://medium.com/@dhiashakiry/60-to-1500-fps-optimising-a-webgl-visualisation-d79705b33af4) — Dhia Shakiry
- [Canvas vs WebGL Chart Performance](https://digitaladblog.com/2025/05/21/comparing-canvas-vs-webgl-for-javascript-chart-performance/) — DigitalAdBlog
- [WebGL vs 2D Canvas Comparison](https://2dgraphs.netlify.app/) — Interactive benchmark (geeogi/2dgraphs)
- [D3FC WebGL Chart Tutorial](https://blog.scottlogic.com/2020/01/08/creating-a-chart-with-d3fc-and-webgl.html) — Scott Logic
- [D3FC WebGL Performance Analysis](https://blog.scottlogic.com/2020/01/16/performance-of-a-d3fc-webgl-chart.html) — Scott Logic
- [SciChart.js Performance Tips](https://www.scichart.com/documentation/js/v4/2d-charts/performance-tips/performance-tips-and-tricks/) — SciChart
- [SciChart SubCharts Dashboard Optimization](https://www.scichart.com/blog/pushing-the-boundaries-of-javascript-chart-dashboard-performance/) — SciChart
- [deck.gl Performance Optimization](https://deck.gl/docs/developer-guide/performance) — vis.gl
- [deck.gl HeatmapLayer](https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer) — vis.gl
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) — MDN
- [WebGL Instanced Drawing](https://webglfundamentals.org/webgl/lessons/webgl-instanced-drawing.html) — WebGL Fundamentals
- [WebGL Data Textures](https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html) — WebGL Fundamentals
- [Ping-Pong Framebuffer Technique](https://ostefani.dev/tech-notes/ping-pong-technique) — Olha Stefanishyna
- [I2Djs WebGL Heatmap Shader Tutorial](https://nswamy14.gitbook.io/i2djs/tutorial-point/webgl-heatmap) — Narayana Swamy
- [LTTB Downsampling Algorithm](https://dev.to/crate/advanced-downsampling-with-the-lttb-algorithm-3okh) — DEV Community

### Developer Profiles
- [Mikola Lysenko](https://github.com/mikolalysenko) — regl, glslify, ndarray
- [Ricky Reusser](https://observablehq.com/@rreusser) — WebGL notebooks, regl tools
- [Fritz Lekschas](https://github.com/flekschas) — regl-scatterplot
- [Narayana Swamy](https://github.com/nswamy14) — visual-heatmap, I2Djs
- [Florian Boesch](https://github.com/pyalot) — webgl-heatmap
- [Dan Chitnis](https://github.com/danchitnis) — webgl-plot
