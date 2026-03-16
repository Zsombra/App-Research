# Master Research Report: TradingView Alternative Web App
## Date: 2026-03-16 | All Sprints Complete + Deep Crawl

---

## Executive Summary

This report consolidates research from 6 parallel research agents covering trading concepts, GitHub developer networks, exchange APIs, and charting library evaluations. The goal: build a web-based trading platform with advanced order flow features that most existing platforms lack.

### Key Findings

1. **No single open-source project covers all required features.** The closest references are:
   - **aggr.trade** (Tucsky) — Best multi-exchange aggregation (27 exchanges), CVD, liquidations, custom scripting. But NO orderbook/heatmap/footprint.
   - **flowsurface** (akenshaw) — Best order flow visualization (footprints, heatmaps, DOM). But desktop-only (Rust), web version archived.
   - **cryexc-backend** (jose-donato) — Most feature-complete backend (footprints, heatmaps, CVD, DOM, liquidations). But Binance-only.

2. **Hyperliquid is uniquely transparent** — all positions are on-chain and queryable, making it the best venue for liquidation heatmaps. L4/MBO data available via self-hosted node.

3. **KLineChart is NOT suitable as the core charting engine** for order flow features. It only handles OHLC bars. A custom Canvas/WebGL rendering engine is needed for footprints, heatmaps, and volume profile.

4. **The Web Worker per exchange pattern** (from aggr.trade) is the recommended architecture for non-blocking multi-exchange data aggregation in the browser.

---

## Reference Project Comparison

| Feature | aggr.trade | flowsurface | cryexc-backend | KLineChart | Our Target |
|---------|-----------|-------------|----------------|------------|------------|
| Exchanges | 27 | 4 | 1 (Binance) | N/A | 10+ |
| Footprint Charts | NO | YES | YES | NO | YES |
| Orderbook Heatmap | NO | YES | YES | NO | YES |
| HD Heatmap | NO | YES | NO | NO | YES |
| Liquidation Heatmap | NO | NO | YES (events) | NO | YES |
| CVD | YES | YES | YES | NO | YES |
| Open Interest | NO | NO | YES | NO | YES |
| DOM/Orderbook | NO | YES | YES | NO | YES |
| Market Profile/TPO | NO | NO | NO | NO | YES |
| Volume Profile | NO | YES | NO | NO | YES |
| VWAP Suite | NO | NO | NO | NO | YES |
| Custom Scripting | YES (Monaco) | NO | NO | NO | YES |
| Volume Bubbles | NO | NO | NO | NO | YES |
| 1s Timeframes | YES | YES | NO | NO | YES |
| Custom Timeframes | YES | YES | NO | NO | YES |
| Hyperliquid MBO | NO | YES (basic) | NO | NO | YES |
| Net Longs/Shorts | NO | NO | NO | NO | YES |
| Audio Alerts | YES | YES | NO | NO | YES |
| Tech Stack | Vue/TS/Canvas | Rust/Iced | Python/FastAPI | TS/Canvas | TBD |

---

## Data Requirements by Feature

| Feature | Data Type | L2 Needed? | Complexity |
|---------|-----------|-----------|------------|
| Market Profile (TPO) | 1-min OHLCV bars | No | Medium |
| Footprint Charts | Tick trades with side | Yes (for classification) | High |
| CVD (aggregated) | Tick trades from multiple exchanges | Yes (for accuracy) | Medium-High |
| Orderbook Heatmap | L2 snapshots at 100ms+ | **Yes (core)** | Medium-High |
| Liquidation Heatmap | Trade data + OI + margin tiers | No | High |
| Volume Profile | 1-min OHLCV bars | No | Low-Medium |
| VWAP Suite | 1-min OHLCV bars | No | Low |
| DOM/Orderbook | L2 real-time updates | **Yes (core)** | Medium |
| Hyperliquid MBO | L4 data (self-hosted node) | N/A | High (infra) |

---

## Hyperliquid Data Scorecard

| Data | Available? | Method |
|------|-----------|--------|
| L2 Orderbook (20 levels) | YES | Public API |
| L4/MBO Orderbook (100 levels) | YES | Self-hosted node + order_book_server |
| Open Interest | YES | `metaAndAssetCtxs` REST + WS |
| Funding Rates | YES | Current + historical + predicted cross-venue |
| Liquidation Events | YES | Real-time WS + historical REST + S3 bulk |
| Liquidation Prices | YES | `clearinghouseState` for ANY wallet |
| Stop Loss Levels | **NO** | Untriggered trigger orders hidden |
| Take Profit Levels | **NO** | Untriggered trigger orders hidden |
| Net Longs/Shorts | DERIVABLE | Aggregate from position data |
| Whale Tracking | YES | Query any wallet's full state |

---

## Top GitHub Repos Discovered

### Tier 0 — NEW: Most Feature-Complete OSS Trading Terminal
| Repo | Stars | Why It Matters |
|------|-------|---------------|
| **ianfigueroa/TapeFlow** | 11 | **Covers 12+ of our 26 features in ONE repo**: Footprints, DOM, CVD, Volume Profile, OI, Liquidation Heatmap, VWAP, Trade Tape, Algo Detection (whales, spoofing, icebergs), Paper Trading |
| **ianfigueroa/Titan** | — | C++ companion: real-time orderbook, VWAP, imbalance, whale alerts via WebSocket |

### Tier 1 — Direct Architecture References
| Repo | Stars | Why It Matters |
|------|-------|---------------|
| [Tucsky/aggr](https://github.com/Tucsky/aggr) | 1,092 | Best multi-exchange aggregation architecture |
| [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface) | 1,400 | Most complete order flow visualization (desktop) |
| [jose-donato/cryexc-backend](https://github.com/jose-donato/cryexc-backend) | 51 | Most feature-complete trading backend |
| [VisualHFT](https://github.com/silahian/VisualHFT) | 1,100 | LOB viz, VPIN, imbalance, multi-exchange plugins |

### Tier 2 — Specific Components
| Repo | Stars | Component |
|------|-------|-----------|
| [beatzxbt/mm-toolbox](https://github.com/beatzxbt/mm-toolbox) | 230 | High-perf orderbook data structures |
| [nssanta/quant-order-book](https://github.com/nssanta/quant-order-book) | 4 | **Orderbook depth overlay on candlestick chart** + DOM + CVD (Binance/OKX/Bybit) |
| [DegenSugarBoo/OpenBook](https://github.com/DegenSugarBoo/OpenBook) | 122 | **Bookmap-style heatmap** + trade tape (closest to Volume Bubbles) |
| [sagartarar/Trading](https://github.com/sagartarar/Trading) | 0 | **Rust-accelerated Market Profile** (102x faster via PyO3) |
| [0xSmartCrypto/hyperfootprint](https://github.com/0xSmartCrypto/hyperfootprint) | 1 | **Only Hyperliquid-specific footprint** (SUI, with absorption/divergence detection) |
| [Senior-Architecture/Cryptocurrency-Liquidation-Heatmap](https://github.com/Senior-Architecture/Cryptocurrency-Liquidation-Heatmap) | 4 | Multi-exchange liquidation heatmap (5x-125x leverage) |
| [Tucsky/aggr-server](https://github.com/Tucsky/aggr-server) | 203 | InfluxDB trade collection + resampling |
| [Tucsky/aggr-lib](https://github.com/Tucsky/aggr-lib) | 49 | Community indicator library pattern |

### Tier 3 — Hyperliquid-Specific
| Repo | Stars | What It Does |
|------|-------|-------------|
| [hyperliquid-dex/hyperliquid-python-sdk](https://github.com/hyperliquid-dex/hyperliquid-python-sdk) | 1,462 | Official Python SDK |
| [hyperliquid-dex/order_book_server](https://github.com/hyperliquid-dex/order_book_server) | 118 | L2/L4 orderbook server |
| [thunderhead-labs/hyperliquid-stats](https://github.com/thunderhead-labs/hyperliquid-stats) | — | 30+ endpoints (volume, liquidations, OI) |
| [moondevonyt/Hyperliquid-Data-Layer-API](https://github.com/moondevonyt/Hyperliquid-Data-Layer-API) | — | Liquidation heatmaps, whale tracking |
| [itay747/perspective-hyperliquid](https://github.com/itay747/perspective-hyperliquid) | — | Real-time orderbook heatmap (WASM) |

### Tier 4 — Data Platforms & Analysis
| Repo | Stars | Use Case |
|------|-------|---------|
| [OpenBB-finance/OpenBB](https://github.com/OpenBB-finance/OpenBB) | 63,200 | Data infrastructure platform |
| [wshobson/maverick-mcp](https://github.com/wshobson/maverick-mcp) | 426 | AI stock analysis, 20+ indicators, backtesting |
| [jose-donato/openbb-defillama](https://github.com/jose-donato/openbb-defillama) | 6 | DeFi data via DeFiLlama |

---

## Architectural Patterns Worth Adopting

### 1. Web Worker Per Exchange (from aggr.trade)
Each exchange WebSocket connection runs in a dedicated Web Worker, preventing UI blocking. Central aggregator merges data.

### 2. Custom Canvas Fork (from aggr.trade)
Fork TradingView's lightweight-charts for standard candlestick rendering, but build custom Canvas/WebGL for order flow visualizations.

### 3. Dual Rendering Pipeline
- **Layer 1:** KLineChart or lightweight-charts fork for standard OHLC + indicators
- **Layer 2:** Custom Canvas/WebGL engine for footprints, heatmaps, volume profile, TPO

### 4. Backend Data Processing (from cryexc-backend)
FastAPI + DuckDB for server-side aggregation of historical data. WebSocket passthrough for real-time.

### 5. Monaco Editor for Custom Scripting (from aggr.trade)
Embedded code editor with sandboxed execution for user-written indicators.

### 6. IndexedDB for Client Storage (from aggr.trade)
Dexie + protobuf + pako for compressed local trade data caching.

---

## Commercial Platforms for Comparison
- **Kiyotaka** (kiyotaka.ai) — Hyperliquid liquidation heatmaps
- **Trading Different** (tradingdifferent.com) — Free Hyperliquid liquidation tools
- **CoinGlass** (coinglass.com) — Liquidation maps, OI, long/short ratios
- **Bookmap** — HD heatmaps, volume bubbles (commercial, ~$50/month)
- **Exocharts** — Footprint charts (commercial)
- **ATAS** — Order flow charting (commercial)
- **Quantower** — DOM surface, multi-exchange (commercial)

---

---

## DEFINITIVE FEATURE GAP ANALYSIS (from Deep Crawl)

### All 26 Features — Final Status

| # | Feature | OSS Exists? | Best Reference | Status |
|---|---------|-------------|---------------|--------|
| 1 | Market Profile / TPO | YES | beinghorizontal/tpo_project (130★) | **COVERED** |
| 2 | Custom Session TPO | NO | tpo_project has basic sessions only | **MUST BUILD** |
| 3 | Hyperliquid MBO Profile | YES | hyperliquid-dex/order_book_server (L4 data) | **COVERED** (infra needed) |
| 4 | Aggregated Heatmaps | PARTIAL | flowsurface (single exchange only) | **PARTIAL** |
| 5 | HD Heatmaps | PARTIAL | flowsurface (desktop), Elenchev/order-book-heatmap (SVG, not HD perf) | **MUST BUILD WebGL** |
| 6 | Liquidation Heatmap | YES | **ianfigueroa/TapeFlow** + Senior-Architecture/Cryptocurrency-Liquidation-Heatmap + aoki-h-jp/py-liquidation-map | **COVERED** |
| 7 | Hyperliquid Liquidation Heatmap | PARTIAL | moondevonyt API + Hyperliquid position data | **PARTIAL** (API only, no viz) |
| 8 | Hyperliquid SL Heatmap | NO | SL orders hidden by protocol | **IMPOSSIBLE** (must estimate) |
| 9 | Hyperliquid TP Heatmap | NO | Same as above | **IMPOSSIBLE** (must estimate) |
| 10 | Aggregated Footprints | YES | tiagosiebler/orderflow (65★, 5 exchanges) | **COVERED** |
| 11 | Filtered Footprints | NO | flowsurface has footprints but no filtering | **MUST BUILD** |
| 12 | Dual Cluster Modes | YES | flowsurface (multiple clustering methods) | **COVERED** |
| 13 | Bucketed Trade Size Groups | NO | beatzxbt/mm-toolbox has data structures only | **MUST BUILD** |
| 14 | Aggregated CVD | YES | aggr.trade (27 exchanges) | **COVERED** |
| 15 | Aggregated Open Interest | PARTIAL | **ianfigueroa/TapeFlow** (OI delta tracking, single exchange) | **PARTIAL** (need aggregation) |
| 16 | Net Longs/Shorts | NO | Pine Script only, no OSS repo | **MUST BUILD** |
| 17 | VWAP Suite | YES | **ianfigueroa/TapeFlow** (session VWAP) + ianfigueroa/Titan (computation) | **COVERED** |
| 18 | Volume Bubbles | PARTIAL | DegenSugarBoo/OpenBook (Bookmap-style) + cli_ob (bubble markers) | **PARTIAL** (need dedicated impl) |
| 19 | Custom Scripting | YES | aggr.trade (Monaco Editor + JS) | **COVERED** |
| 20 | Community Indicators | PARTIAL | aggr-lib (GitHub-backed, no browse/rate UI) | **MUST BUILD marketplace** |
| 21 | Aggregated Orderbooks | YES | jose-donato/crypto-orderbook (9 exchanges) | **COVERED** |
| 22 | Aggregated DOM | YES | tiagosiebler/orderbooks (162★) | **COVERED** |
| 23 | Orderbook Imbalances | YES | VisualHFT (1,100★) + flowsurface | **COVERED** |
| 24 | Orderbook Depth Overlay | YES | **nssanta/quant-order-book** (depth overlaid on candlestick chart!) | **COVERED** |
| 25 | 1s Timeframes | YES | valamidev/candlestick-convert (55★) | **COVERED** |
| 26 | Custom Timeframes | YES | aggr.trade + candlestick-convert | **COVERED** |

### Summary: 15 COVERED, 4 PARTIAL, 5 MUST BUILD, 2 IMPOSSIBLE (estimate only)

**UPDATE (Deep Crawl Round 2):** TapeFlow discovery upgraded Liquidation Heatmap → COVERED, VWAP → COVERED, OI → PARTIAL, Orderbook Depth Overlay → COVERED. OpenBook upgraded Volume Bubbles → PARTIAL.

---

## COMPLETE REPO CATALOG (from Multi-Hop Crawl)

### Tier 0 — CRITICAL: Most Feature-Complete OSS Trading Terminal
| Repo | Stars | Lang | Why It Matters |
|------|-------|------|---------------|
| **ianfigueroa/TapeFlow** | 11 | TypeScript | **Covers 12+ features**: Footprints, DOM, CVD, Volume Profile, OI, Liquidation Heatmap, VWAP, Trade Tape, Algo Detection, Paper Trading |
| **ianfigueroa/Titan** | — | C++ | Companion: real-time orderbook, VWAP computation, whale alerts via WebSocket |

### Tier 1 — Direct Architecture References
| Repo | Stars | Lang | Why It Matters |
|------|-------|------|---------------|
| Tucsky/aggr | 1,092 | Vue/TS | Best multi-exchange aggregation (27 exchanges), CVD, custom scripting |
| flowsurface-rs/flowsurface | 1,400 | Rust/Iced | Most complete order flow visualization (footprints, heatmaps, DOM) |
| jose-donato/cryexc-backend | 51 | Python/FastAPI | Most feature-complete trading backend |
| VisualHFT (silahian) | 1,100 | C#/WPF | LOB viz, VPIN, imbalance, multi-exchange plugins |

### Tier 2 — Order Flow & Footprints
| Repo | Stars | Lang | Component |
|------|-------|------|-----------|
| tiagosiebler/orderflow | 65 | TS/NestJS | Production footprint candle builder (5 exchanges, TimescaleDB) |
| gbzenobi/CSharp-NT8-OrderFlowKit | 312 | C# | Most complete footprint (NinjaTrader-only) |
| tysonwu/stack-orderflow | 131 | Python | Orderflow + market profile desktop GUI |
| AndreaFerrante/Orderflow | 117 | Python | Imbalances as core feature |
| andrewlfc7/BFX-BSI | 22 | Python | Order flow BSI imbalance detection |
| g-tejas/toxic-flow | 12 | Rust | VPIN calculator + gRPC orderbook stream |

### Tier 3 — Orderbook & DOM
| Repo | Stars | Lang | Component |
|------|-------|------|-----------|
| OctopusTakopi/binance_l3_est | 208 | Rust | L3 orderbook reconstruction + heatmap + whale detection |
| OctopusTakopi/glass-rs | 24 | Rust | Ultra-fast orderbook data structure (radix trie, 24x faster) |
| tiagosiebler/orderbooks | 162 | TypeScript | Zero-dep orderbook management |
| ninja-quant/ninjabook | 186 | Rust | High-perf L2 orderbook + trades processor |
| jose-donato/crypto-orderbook | 110 | Go/React | Multi-exchange aggregated orderbook (9 exchanges) |
| beatzxbt/mm-toolbox | 230 | Python | HFT orderbook implementations, Numba-optimized |
| Elenchev/order-book-heatmap | 496 | JS/D3 | Live browser-based LOB heatmap |
| DegenSugarBoo/OpenBook | 122 | Rust | Bookmap-style depth heatmap |

### Tier 4 — Market Profile / TPO
| Repo | Stars | Lang | Component |
|------|-------|------|-----------|
| beinghorizontal/tpo_project | 130 | Python | ONLY OSS TPO/Market Profile (POC, VAH, IB) |
| EarnForex/MarketProfile | 177 | MQL | Most configurable TPO (custom sessions, custom VA%) |
| sivamgr/tpo_market_profile | low | Python | Basic TPO from 1-min candles |

### Tier 5 — Liquidation & Heatmaps
| Repo | Stars | Lang | Component |
|------|-------|------|-----------|
| aoki-h-jp/py-liquidation-map | 119 | Python | Actual liquidation heatmap images (Binance + Bybit) |
| StephanAkkerman/liquidations-chart | 41 | Python | CoinGlass-style liquidation bar charts |
| moondevonyt/Hyperliquid-Data-Layer-API | 93-128 | Python | Liquidation data + whale tracking API |
| thunderhead-labs/hyperliquid-stats | — | Python | Cumulative liquidated notional, daily liquidations |
| itay747/perspective-hyperliquid | — | JS/WASM | Orderbook heatmap demo using Perspective |

### Tier 6 — Exchange SDKs & Data Infrastructure
| Repo | Stars | Lang | Component |
|------|-------|------|-----------|
| ccxt/ccxt | 41,400 | Multi | 100+ exchange unified API |
| cryptofeed/cryptofeed | 2,800 | Python | Multi-exchange WebSocket feed handler |
| crypto-crawler/crypto-crawler-rs | 260 | Rust | Multi-exchange data crawler |
| tiagosiebler/binance | 910 | TypeScript | Binance SDK (browser support) |
| tiagosiebler/bybit-api | 332 | TypeScript | Bybit SDK |
| tiagosiebler/okx-api | 164 | TypeScript | OKX SDK |
| kanekoshoyu/exchange-collection | 22 | Rust | OpenAPI specs for 13+ exchanges |
| nautechsystems/nautilus_trader | 21,200 | Rust/Python | Production trading engine, nanosecond resolution |

### Tier 7 — Rendering & Infrastructure
| Repo | Stars | Lang | Component |
|------|-------|------|-----------|
| iced-rs/iced | 29,800 | Rust | GPU cross-platform GUI (powers flowsurface) |
| gfx-rs/wgpu | 16,700 | Rust | WebGPU rendering backend |
| ecomfe/zrender | 6,300 | TypeScript | 2D Canvas engine (powers ECharts) |
| pissang/claygl | 2,900 | JavaScript | WebGL graphics library |
| valamidev/candlestick-convert | 55 | TypeScript | OHLCV batcher with 1s base interval |

### Tier 8 — Trading Frameworks
| Repo | Stars | Lang | Component |
|------|-------|------|-----------|
| freqtrade/freqtrade | 47,700 | Python | Trading bot, massive ecosystem |
| barter-rs/barter-rs | 2,000 | Rust | Event-driven live-trading + backtesting |
| yutiansut/QUANTAXIS | 10,100 | Python | Full quant platform with L2/tick data |
| LevBeta/ferrofluid | 0 | Rust | High-perf Hyperliquid SDK (simd-json, zero-copy) |

---

## WHAT MAKES THIS APP UNIQUE

**Of the 26 target features, 8 have ZERO production-quality open-source implementations and 2 are technically impossible without estimation:**

Features that would be **FIRST in open-source** (as production web app):
1. **Volume Bubbles** — OpenBook is closest but not a dedicated bubble renderer
2. **Filtered Footprints** — No filtering capability in any OSS footprint tool
3. **Net Longs/Shorts decomposition** — Only exists in Pine Script
4. **Custom Session TPO** — beinghorizontal has basic sessions but not fully configurable web UI
5. **Community Indicator Marketplace** — No browse/rate/install UI
6. **Bucketed Trade Size Groups** — binance_l3_est has K-Means clustering but no dedicated visualization
7. **Hyperliquid SL/TP Heatmaps** — Must estimate statistically (trigger orders hidden)

**Previously "MUST BUILD" now has references:**
- **Orderbook Depth Overlay** → nssanta/quant-order-book has it!
- **VWAP Suite** → TapeFlow + Titan have full implementations
- **Liquidation Heatmap** → TapeFlow + Senior-Architecture repo cover this
- **Aggregated OI** → TapeFlow has single-exchange OI tracking (need to add aggregation)

**flowsurface** (1,400 stars, Rust) is the closest competitor but is desktop-only and doesn't cover most of these.

---

## Next Steps
- [ ] Technology stack decision: React vs Vue vs Svelte, Canvas vs WebGL, backend language
- [ ] Prototype: Start with aggregated orderbook + basic candlestick chart
- [ ] Data layer design: Exchange WebSocket abstraction, normalization, storage
- [ ] Evaluate tiagosiebler/orderflow as footprint starting point
- [ ] Evaluate flowsurface's rendering approach for WebGL heatmap design
- [ ] Build Volume Bubbles proof-of-concept (first-ever OSS implementation)

---

## Research Files Index

| File | Location | Content |
|------|----------|---------|
| Research Index | `memory/research-index.md` | Master tracking document |
| Trading Concepts Deep Dive | `research/sprint-1-core-concepts/trading-concepts-deep-dive.md` | TPO, Footprints, CVD, Heatmaps, Volume Profile (522 lines) |
| KLineChart Evaluation | `research/sprint-1-core-concepts/klinechart-evaluation.md` | Library assessment + gap analysis |
| Hyperliquid API Research | `research/sprint-2-heatmaps/hyperliquid-data-capabilities-research.md` | Full API documentation + data availability (302 lines) |
| Orderbook/DOM Research | `research/sprint-3-orderbook/orderbook-dom-research.md` | Aggregation, imbalance detection, rendering |
| aggr.trade Research | `research/sprint-4-github-network/tucsky-aggr-trade.md` | Architecture, features, 27 exchanges |
| flowsurface/akenshaw Research | `research/sprint-4-github-network/akenshaw-beatzxbt-rootquant-brunopittini.md` | Order flow visualization reference |
| jose-donato/OpenBB Network | `research/sprint-4-github-network/jose-donato-didier-wshobson-levbeta.md` | Feature coverage matrix |
| Second-hop: akenshaw network | `research/sprint-4-github-network/second-hop-akenshaw-network.md` | nautilus_trader, ninjabook, toxic-flow |
| Second-hop: beatzxbt network | `research/sprint-4-github-network/second-hop-beatzxbt-network.md` | VisualHFT, binance_l3_est, glass-rs, 37 repos |
| Second-hop: liihuu/azidyn/LevBeta | `research/sprint-4-github-network/second-hop-liihuu-matt-azidyn-levbeta.md` | tpo_project, tiagosiebler orderflow/SDKs |
| Deep crawl: Feature gap analysis | `research/sprint-4-github-network/deep-crawl-feature-gap-analysis.md` | 15 covered, 4 partial, 5 open gaps |
| Deep crawl: Targeted feature search | `research/sprint-4-github-network/deep-crawl-targeted-feature-search.md` | 10 hardest features, zero OSS status |
| Deep crawl: OctopusTakopi/focus/beinh | `research/sprint-4-github-network/deep-crawl-octopus-focus-beinh-network.md` | TapeFlow discovery, Rust TPO, depth overlay |
| Advanced Features | `research/sprint-5-advanced/advanced-features-research.md` | VWAP, Volume Bubbles, Scripting, Timeframes |
