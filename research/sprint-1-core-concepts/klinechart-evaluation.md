# KLineChart Technical Evaluation
## Date: 2026-03-16

## Developer: liihuu (Wuhan, China)

---

## Overview
- **Repo:** https://github.com/klinecharts/KLineChart (3,625 stars)
- **Language:** TypeScript (76%), HTML5 Canvas rendering
- **Dependencies:** Zero (completely standalone)
- **Bundle size:** ~40-50KB gzipped
- **License:** Apache 2.0 (no attribution required)
- **Framework agnostic:** Yes — works with React, Vue, Svelte, Angular

## Architecture
- Dual-layer Canvas (main + overlay)
- `requestAnimationFrame` with `ResizeObserver` for responsive scaling
- Output formats: ESM, CJS, UMD
- Viewport culling (only draws visible candles)
- Real-time updates via `updateData()` — timestamp-based

## Built-in Features
### Chart Types
- Candlestick (solid, stroke, hybrid), OHLC bars, Area, Line

### Technical Indicators (28 built-in)
- **Trend:** MA, EMA, SMA, BOLL, BBI, SAR, DMA, Ichimoku
- **Momentum:** MACD, RSI, KDJ, TRIX, MTM, ROC, WR, CCI, PSY, EMV, Awesome Oscillator
- **Volume:** VOL, OBV, PVT, VR, AVP
- **Other:** BIAS, BRAR, CR, DMI

### Drawing Tools
- Lines (horizontal, vertical, ray, segment, straight)
- Channels (parallel lines, price channel)
- Fibonacci retracement (7 levels)
- Annotations (price line, text, tags)

### Extensibility
- Custom indicators: Yes (extend base class, implement `calc()`)
- Custom overlays: Yes (extend overlay base, full lifecycle callbacks)
- Custom chart types: Limited — forking core required for fundamentally new types
- Extensible axis system (log scale, percentage)
- Comprehensive theme system (light/dark)

## CRITICAL GAP ANALYSIS

| Feature | Supported? | Notes |
|---|---|---|
| Market Profile / TPO | **NO** | Not built-in, not planned |
| Footprint Charts | **NO** | Community fork exists (jose-donato, June 2025) |
| Heatmaps | **NO** | No orderbook or volume heatmap |
| Volume Profile | **NO** | Not available |
| VWAP | **NO** | Must be custom-built |
| Depth of Market | **NO** | Not a chart-level feature |
| Renko / Point & Figure | **NO** | Only standard candlestick types |
| WebGL rendering | **NO** | Canvas only |
| Tick-level data | **NO** | Operates on OHLC bars only |
| Multi-symbol overlay | **NO** | Not native |

## KLineChart vs TradingView Lightweight Charts

| Dimension | KLineChart | TV Lightweight Charts |
|---|---|---|
| Bundle Size | ~50KB | ~45KB |
| Built-in Indicators | 28 | None (DIY) |
| Built-in Drawing Tools | Yes (10+ types) | None (plugin system) |
| Multi-pane | Yes | No (single pane) |
| Attribution Required | No | Yes (TradingView link) |
| Community | ~3.6K stars | ~10K+ stars |
| Footprint/TPO/Volume Profile | No | No |

## VERDICT

**KLineChart is NOT a viable foundation for a TradingView alternative with order flow features.**

The library's architecture is built around OHLC bar rendering. Retrofitting tick-level/price-level visualization (footprints, heatmaps, volume profile, TPO) would require fundamental changes to the rendering pipeline and data model.

### Recommended Approach:
1. **Build custom rendering engine** (Canvas/WebGL) from scratch with tick-level data as first-class citizen
2. **OR** use KLineChart ONLY for the standard candlestick/indicator layer, and build a SEPARATE rendering pipeline for order flow charts
3. **OR** evaluate commercial SDKs (SciChart, GoCharting's engine)

### Pro Package (klinecharts/pro, 284 stars)
- Pre-built financial chart application built on KLineChart
- Uses Svelte internally
- Shows how to compose KLineChart into a full application
- Good reference for UI/UX patterns

### jose-donato's Fork
- Successfully forked KLineChart to add footprint charts (June 2025)
- Demonstrates it's POSSIBLE but requires core modifications
