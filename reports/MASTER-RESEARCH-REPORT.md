# Master Research Report: TradingView Alternative Web App
## Date: 2026-03-16 | Sprint 1 Complete

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

### Tier 1 — Direct References
| Repo | Stars | Why It Matters |
|------|-------|---------------|
| [Tucsky/aggr](https://github.com/Tucsky/aggr) | 1,092 | Best multi-exchange aggregation architecture |
| [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface) | 1,400 | Most complete order flow visualization |
| [jose-donato/cryexc-backend](https://github.com/jose-donato/cryexc-backend) | 51 | Most feature-complete trading backend |
| [jose-donato/crypto-orderbook](https://github.com/jose-donato/crypto-orderbook) | 110 | Multi-exchange aggregated orderbook (Go+React) |

### Tier 2 — Specific Components
| Repo | Stars | Component |
|------|-------|-----------|
| [klinecharts/KLineChart](https://github.com/klinecharts/KLineChart) | 3,625 | Standard candlestick charting (28 indicators) |
| [beatzxbt/mm-toolbox](https://github.com/beatzxbt/mm-toolbox) | 230 | High-perf orderbook data structures |
| [jose-donato/binancef_l3_estimate_go](https://github.com/jose-donato/binancef_l3_estimate_go) | 27 | L3 reconstruction from L2 with clustering |
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

## Next Steps (Future Sprints)
- [ ] Sprint 3: Deep dive on orderbook/DOM implementation patterns
- [ ] Sprint 5: VWAP, Volume Bubbles, Custom Scripting, 1s timeframes
- [ ] Second-hop GitHub crawl: follow users that jose-donato's network follows
- [ ] Technology stack decision: React vs Vue vs Svelte, Canvas vs WebGL, backend language
- [ ] Prototype: Start with aggregated orderbook + basic candlestick chart
- [ ] Data layer design: Exchange WebSocket abstraction, normalization, storage

---

## Research Files Index

| File | Location | Content |
|------|----------|---------|
| Research Index | `memory/research-index.md` | Master tracking document |
| Trading Concepts Deep Dive | `research/sprint-1-core-concepts/trading-concepts-deep-dive.md` | TPO, Footprints, CVD, Heatmaps, Volume Profile (522 lines) |
| KLineChart Evaluation | `research/sprint-1-core-concepts/klinechart-evaluation.md` | Library assessment + gap analysis |
| Hyperliquid API Research | `research/sprint-2-heatmaps/hyperliquid-data-capabilities-research.md` | Full API documentation + data availability (302 lines) |
| aggr.trade Research | `research/sprint-4-github-network/tucsky-aggr-trade.md` | Architecture, features, 27 exchanges |
| akenshaw/flowsurface Research | `research/sprint-4-github-network/akenshaw-beatzxbt-rootquant-brunopittini.md` | Order flow visualization reference |
| jose-donato/OpenBB Network | `research/sprint-4-github-network/jose-donato-didier-wshobson-levbeta.md` | Feature coverage matrix |
