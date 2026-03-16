# GitHub Network Research: akenshaw, beatzxbt, rootquant, brunopittini
## Date: 2026-03-16

---

## 1. akenshaw (Berke) — **HIGHEST PRIORITY REFERENCE**

The most relevant developer found. Has iterated multiple times on the same core idea -- real-time crypto orderflow visualization -- progressing through Python, JavaScript/Vue, Rust+WASM, and finally a full native Rust desktop app.

### Main Project: **flowsurface** (under org `flowsurface-rs/flowsurface`)
- **URL:** https://github.com/flowsurface-rs/flowsurface
- **Stars:** ~1,400 | **Language:** Rust (99.7%) | **GUI:** Iced framework
- **License:** GPL-3.0

### Visualization Types Implemented:
1. **Heatmap (Historical DOM)** — Time-series heatmap from live trades + L2 orderbook, with customizable price grouping, multiple time aggregations, and volume profiles
2. **Candlestick** — Time-based and custom tick-based intervals
3. **Footprint Chart** — Price-grouped, interval-aggregated trade data overlaid on candles, with clustering methods, POC (Point of Control) studies, and configurable imbalance detection
4. **Time & Sales** — Scrollable real-time trade feed
5. **DOM / Ladder** — L2 orderbook with grouped price levels and recent trade volumes
6. **Comparison Chart** — Normalized multi-symbol line graphs (percentage scale)

### Exchange Integrations:
Binance, Bybit, Hyperliquid, OKX (all via public WebSocket + REST APIs, no vendor lock-in)

### Data Architecture:
- WebSocket streams for real-time L2 orderbook and trades
- REST API for historical klines
- Binance historical trade backfilling via data.binance.vision bulk downloads + paginated REST
- ~100ms orderbook update intervals, ~250ms kline intervals
- Trade data aggregated into buffers, synchronized with orderbook snapshots

### Unique Approaches:
- Audio feedback synchronized with trade streams (sonification of market activity)
- Multi-window / multi-monitor with pane linking for synchronized ticker switching
- Persistent layout configs with custom color themes
- Extremely lightweight — Rust + Iced keeps memory footprint tiny compared to Electron-based alternatives

### Earlier Iterations (KEY for web-based approach):

| Repo | Description | Stack |
|------|-------------|-------|
| **flowsurface-web** (archived) | Web app visualizing footprint in crypto markets. Binance Futures, all pairs. Canvas 2D rendering, WebSocket data. | JS, Vite, Canvas 2D |
| **flowsurface-web-rs** | Same concept rewritten in Rust compiled to WASM, rendering orderbook tick data on HTML5 Canvas via wasm-bindgen. | Rust/WASM, TypeScript, Canvas 2D, Webpack |
| **flowsurface-server** | Rust backend server with an `/exchanges` module for exchange integrations. | Rust |
| **btcusdt-orderflow** (34 stars) | Python GUI showing real-time BTC/USDT orderflow: heatmap of market orders, trade size distribution histograms, DOM. | Python, PyQt6, PyQtGraph |
| **cryptoflow-webapp** | Early Vue.js + Chart.js prototype for crypto orderbook visualization. | Vue, Chart.js, Vite |

**KEY TAKEAWAY:** `flowsurface-web` (archived JS version) is the closest reference to our target. Demonstrates footprint charts, orderbook heatmaps, CVD, OI, and volume charts — all rendered on Canvas 2D in the browser using Binance WebSocket APIs. The `flowsurface-web-rs` WASM version shows how to get near-native performance.

---

## 2. beatzxbt — Market Making Algorithms (Data Pipeline Reference)

### **smm** (Simple Market Maker)
- **URL:** https://github.com/beatzxbt/smm
- **Stars:** ~598 | **Language:** Python
- Market making bot for Bybit Futures with optional Binance feed
- Volatility-adjusted spreads, inventory management, multi-level orders
- WebSocket-driven architecture with real-time feature calculation

### **mm-toolbox**
- **URL:** https://github.com/beatzxbt/mm-toolbox
- **Stars:** ~230 | **Language:** Python
- High-performance library: multiple orderbook implementations (standard, HFT-optimized, L3)
- Candlestick aggregation (time/tick/volume triggers), ring buffers
- Moving averages (EMA, SMA, WMA, Hull), Numba JIT-optimized
- WebSocket clients with latency-aware connection pooling
- **Useful for:** building performant data processing layers

---

## 3. rootquant — Not Useful
Only forks (quantstats, FinMathematics). No original trading code.

## 4. brunopittini — Not Useful
No trading-related repos. General software projects only.

---

## Feature Reference Matrix

| Feature Area | Best Reference | Key Insight |
|---|---|---|
| Footprint charts | akenshaw/flowsurface-web, flowsurface | Trade grouping by price/time with imbalance detection, POC studies |
| Orderbook heatmap | akenshaw/flowsurface, btcusdt-orderflow | L2 data rendered as time-series heatmap with configurable price grouping |
| Canvas 2D rendering (web) | akenshaw/flowsurface-web | All charts rendered on raw Canvas 2D (no charting library), Vite bundled |
| WASM for performance | akenshaw/flowsurface-web-rs | Rust logic compiled to WASM for compute-heavy orderbook processing |
| Exchange WebSocket integration | akenshaw/flowsurface, beatzxbt/smm | Binance, Bybit, Hyperliquid, OKX public APIs |
| Data processing primitives | beatzxbt/mm-toolbox | Orderbook implementations, candle aggregation, ring buffers, Numba optimization |
| Volume Profile / CVD / OI | akenshaw/flowsurface-web | CVD derived from trade buffer, OI from periodic snapshots |
| Multi-symbol comparison | akenshaw/flowsurface | Normalized percentage-based overlay charts |
