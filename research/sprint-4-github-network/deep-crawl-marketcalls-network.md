# Deep Crawl: marketcalls GitHub Network

**Date:** 2026-03-16
**Subject:** [marketcalls](https://github.com/marketcalls) (Marketcalls)
**Found via:** beinghorizontal (TPO/Market Profile developer) following list

---

## 1. Profile Summary

| Field | Value |
|-------|-------|
| **Login** | marketcalls |
| **Name** | Marketcalls |
| **Bio** | Creator of OpenAlgo - OpenSource Algo Trading framework for Indian Traders |
| **Location** | Bangalore, India |
| **Blog** | https://www.marketcalls.in |
| **Public Repos** | 159 |
| **Followers** | 614 |
| **Following** | 2 (sivakspt, theanh97) |
| **Created** | 2014-09-10 |

Marketcalls runs a long-standing Indian financial blog (since 2007) and has built one of the most popular open-source algo trading frameworks for the Indian market. The entire OpenAlgo ecosystem was reportedly built using AI agentic coding tools.

---

## 2. Key Original Repos (by marketcalls)

### Tier 1 - Flagship Projects

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| **[openalgo](https://github.com/marketcalls/openalgo)** | 1,501 | Python | Open source algo trading platform - 30+ Indian broker integrations, unified API, WebSocket proxy, TradingView Lightweight Charts |
| **[vectorbt-backtesting-skills](https://github.com/marketcalls/vectorbt-backtesting-skills)** | 97 | Python | Agentic coding skills for VectorBT backtesting - Indian, US, Crypto markets |
| **[historify](https://github.com/marketcalls/historify)** | 42 | JavaScript | Full stack historical data management app |
| **[fyers-websockets](https://github.com/marketcalls/fyers-websockets)** | 38 | HTML | Fyers broker WebSocket integration |
| **[Algomirror](https://github.com/marketcalls/Algomirror)** | 31 | Python | Multi-account (self + family) order handler |

### Tier 2 - Charting & Orderflow

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| **[opencase](https://github.com/marketcalls/opencase)** | 19 | TypeScript | Self-hosting alternative to Smallcase (portfolio baskets) |
| **[openalgo-flow](https://github.com/marketcalls/openalgo-flow)** | 17 | TypeScript | No-code trading workflow automation |
| **[Agentic-Trader](https://github.com/marketcalls/Agentic-Trader)** | 16 | Python | AI agentic trader |
| **[finnews-ai](https://github.com/marketcalls/finnews-ai)** | 16 | HTML | Financial news AI |
| **[openalgo-pinets](https://github.com/marketcalls/openalgo-pinets)** | 14 | HTML | TradingView Lightweight Charts with PineTS framework integration |
| **[openalgo-mobile](https://github.com/marketcalls/openalgo-mobile)** | 13 | Dart | Mobile trading terminal |
| **[pyindicators](https://github.com/marketcalls/pyindicators)** | 13 | Python | Technical indicators library - built with Claude Code |
| **[OpenAlgoPlugin](https://github.com/marketcalls/OpenAlgoPlugin)** | 13 | C++ | AmiBroker plugin for OpenAlgo |
| **[openengine](https://github.com/marketcalls/openengine)** | 13 | Python | Backtesting engine for Indian traders |
| **[sector-rotation-map](https://github.com/marketcalls/sector-rotation-map)** | 12 | JavaScript | Interactive RRG dashboard for NSE sectors |
| **[openquest](https://github.com/marketcalls/openquest)** | 11 | Python | Realtime stock data aggregator in QuestDB with TradingView streaming charts |
| **[openalgo-mcp](https://github.com/marketcalls/openalgo-mcp)** | 11 | Python | MCP server for AI agent integration |
| **[stock-dashboard](https://github.com/marketcalls/stock-dashboard)** | 10 | HTML | Stock market dashboard |

### Tier 3 - Interesting Smaller Projects

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| **[openalgo-chart](https://github.com/marketcalls/openalgo-chart)** | 0 | JavaScript | TradingView Lightweight Charts integration |
| **[order-flow-chart](https://github.com/marketcalls/order-flow-chart)** | 2 | n/a | Fork - Real-time order flow chart for NIFTY using D3.js |
| **[openalgo-indicator-skills](https://github.com/marketcalls/openalgo-indicator-skills)** | 5 | Python | 100+ technical indicators, Plotly charts, Dash dashboards, Numba, WebSocket feeds |
| **[Crypto-Realtime-QuestDB](https://github.com/marketcalls/Crypto-Realtime-QuestDB)** | 2 | Python | Crypto realtime dashboard |
| **[proxy-websockets](https://github.com/marketcalls/proxy-websockets)** | 4 | Python | Simple proxy WebSocket server |

---

## 3. Critical Forked Repos (Network Discovery)

These forks reveal what marketcalls is studying and integrating. Each traces to a different developer/org in the trading tools ecosystem.

### 3a. flowsurface-rs/flowsurface - MAJOR FIND

| Field | Value |
|-------|-------|
| **Original Repo** | [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface) |
| **Stars** | 1,390 |
| **Language** | Rust (Iced GUI) |
| **License** | GPL-3.0 |
| **Author** | **akenshaw** (Berke) - 427 contributions |
| **Status** | Actively maintained, last updated 2026-03-16 |

**Why this matters:** Flowsurface is the most feature-complete open-source crypto orderflow workstation. It is a direct TradingView/Bookmap alternative built in Rust.

**Features directly relevant to our 26 targets:**
- HD Heatmaps (Historical DOM heatmap from L2 orderbook)
- Aggregated Orderbooks (multi-exchange: Binance, Bybit, Hyperliquid, OKX)
- Footprints (price-grouped, interval-aggregated trade visualization)
- Filtered Footprints (configurable imbalance and naked-POC studies)
- CVD (via footprint clustering methods)
- Market Profile/TPO (fixed or visible range volume profiles)
- Orderbook Imbalances (configurable imbalance studies)
- Volume Bubbles (time & sales visualization)
- 1s Timeframes (tick-based aggregation)
- Custom Timeframes (both time-based and tick-based intervals)
- Dual Cluster Modes (different clustering methods in footprint view)
- Exchange APIs (Binance, Bybit, Hyperliquid, OKX)
- Hyperliquid MBO (supported exchange)
- Real-time data processing (all processed locally, no 3rd-party servers)
- DOM / Ladder (current L2 orderbook alongside trade volumes)

**Feature coverage: ~15 of 26 target features**

**Hop 2 - akenshaw's full project history:**

| Repo | Stars | Description |
|------|-------|-------------|
| [btcusdt-orderflow](https://github.com/akenshaw/btcusdt-orderflow) | 34 | Python GUI - real-time market trading activity visualization (precursor to flowsurface) |
| [flowsurface-web-rs](https://github.com/akenshaw/flowsurface-web-rs) | 12 | Rust/WASM web version of flowsurface |
| [flowsurface-web](https://github.com/akenshaw/flowsurface-web) | 7 | JavaScript web app for crypto footprint visualization |
| [flowsurface-server](https://github.com/akenshaw/flowsurface-server) | 2 | Rust server component |
| [cryptoflow-webapp](https://github.com/akenshaw/cryptoflow-webapp) | 2 | Vue.js crypto flow webapp |

**Key insight:** akenshaw evolved from Python (btcusdt-orderflow) to JavaScript (flowsurface-web) to Rust (flowsurface), progressively optimizing for performance. The web-rs variant suggests a WASM deployment path exists.

### 3b. QuantForgeOrg/PineTS - MAJOR FIND

| Field | Value |
|-------|-------|
| **Original Repo** | [QuantForgeOrg/PineTS](https://github.com/QuantForgeOrg/PineTS) |
| **Stars** | 277 |
| **Language** | TypeScript |
| **License** | AGPL-3.0 (commercial license available) |
| **Status** | Very active, updated 2026-03-16 |

**Why this matters:** PineTS is a Pine Script transpiler and runtime for JavaScript/TypeScript. This directly enables custom scripting and community indicators in any web app.

**Features directly relevant:**
- Custom Scripting (Pine Script v5/v6 compatibility in JS/TS)
- Community Indicators Marketplace (60+ built-in indicators, extensible)
- Real-time data processing (browser-native execution)

**QuantForge Ecosystem (all repos):**

| Repo | Stars | Description |
|------|-------|-------------|
| [PineTS](https://github.com/QuantForgeOrg/PineTS) | 277 | Pine Script transpiler & runtime for Node.js/browser |
| [QFChart](https://github.com/QuantForgeOrg/QFChart) | 40 | Charting library built on Apache ECharts - candlestick, indicators, drawing tools |
| [pinets-cli](https://github.com/QuantForgeOrg/pinets-cli) | 2 | CLI wrapper to run .pine files from terminal |
| Playground | - | Browser-based Pine Script IDE at [quantforge.org](https://quantforge.org/) |

**Integration proof:** marketcalls already built [openalgo-pinets](https://github.com/marketcalls/openalgo-pinets) which integrates PineTS with TradingView Lightweight Charts. This validates the PineTS + charting library integration pattern.

### 3c. gbzenobi/CSharp-NT8-OrderFlowKit - Reference Implementation

| Field | Value |
|-------|-------|
| **Original Repo** | [gbzenobi/CSharp-NT8-OrderFlowKit](https://github.com/gbzenobi/CSharp-NT8-OrderFlowKit) |
| **Stars** | 314 |
| **Language** | C# |
| **Author** | Gabriel Zenobi |

**Why this matters:** This is a comprehensive reference implementation of orderflow analysis concepts for NinjaTrader 8. While C#/NT8-specific, the algorithms and concepts are directly portable.

**Key components:**
- **Bookmap.cs** - DOM heatmap, depth of market visualization, capital injection detection
- **OrderFlow.cs** - Footprint chart with POC (Point of Control) and POI (Point of Imbalance - Zenobi's concept)
- **MarketVolume.cs** - Bid/Ask/Total volume tracking
- **VolumeAnalysisProfile.cs** - Volume profile analysis
- **VolumeFilter.cs** - Filtered volume analysis

**Features directly relevant:**
- Footprints, Filtered Footprints, HD Heatmaps, Orderbook Imbalances, Market Profile/TPO, CVD

### 3d. tradex-app/TradeX-chart

| Field | Value |
|-------|-------|
| **Original Repo** | [tradex-app/TradeX-chart](https://github.com/tradex-app/TradeX-chart) |
| **Stars** | 169 |
| **Language** | JavaScript (vanilla) |
| **License** | GPL-3.0 |
| **Rendering** | Canvas-based |

**Why this matters:** TradeX-chart is a Canvas-rendered trading chart with no framework dependency. Mobile support included. Uses Web Components (`<tradex-chart>` element).

**Features directly relevant:**
- WebGL/Canvas rendering (Canvas-based)
- Custom Timeframes (OHLCV data format)
- talib integration (TA-Lib via WebAssembly)

**Ecosystem includes:** talib-web (TA-Lib C compiled to WASM), TradeX-Chart-Vue-JS

### 3e. alphabench/raptorbt

| Field | Value |
|-------|-------|
| **Original Repo** | [alphabench/raptorbt](https://github.com/alphabench/raptorbt) |
| **Stars** | 10 |
| **Language** | Rust |

**Description:** High-performance backtesting engine in Rust with Python bindings (PyO3). Drop-in replacement for VectorBT with significant performance improvements and full metric parity.

### 3f. Azhagesan-dev - Order Flow & PineScript Developer

| Repo | Stars | Description |
|------|-------|-------------|
| [order-flow-chart](https://github.com/Azhagesan-dev/order-flow-chart) | 17 | Real-time order flow chart for NIFTY futures using Angelone API, Flask, and Lightweight-Charts canvas rendering |
| [oakscriptJS](https://github.com/Azhagesan-dev/oakscriptJS) | 0 | JavaScript/TypeScript implementation of PineScript (early stage) |
| [openalgo-chart](https://github.com/Azhagesan-dev/openalgo-chart) | 0 | OpenAlgo chart variant |
| [chartink_fyers5s_orderflow](https://github.com/Azhagesan-dev/chartink_fyers5s_orderflow) | 0 | ChartInk + Fyers 5s orderflow |
| [openalgo-chrome](https://github.com/Azhagesan-dev/openalgo-chrome) | 3 | OpenAlgo Chrome Extension |

**Key insight:** Azhagesan-dev is building oakscriptJS (independent PineScript implementation) and real-time orderflow charts using Lightweight Charts. Active OpenAlgo ecosystem contributor.

---

## 4. Starred Repos Analysis

marketcalls has starred only 12 repos, making each one significant:

| Repo | Stars | Relevance |
|------|-------|-----------|
| [marketcalls/openalgo](https://github.com/marketcalls/openalgo) | 1,501 | Own flagship project |
| [crypt0inf0/openalgo-chart](https://github.com/crypt0inf0/openalgo-chart) | 21 | Community fork of OpenAlgo charting - indicates external contributors building charting variants |
| [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) | 56,314 | AI/LLM - all-in-one productivity accelerator |
| [makerever/rever](https://github.com/makerever/rever) | 510 | AI-powered finance automation for CFOs |
| [DeepanshuTIET/openalgo-chatbot](https://github.com/DeepanshuTIET/openalgo-chatbot) | 4 | Community: AI chatbot for OpenAlgo |
| [twentyhq/twenty](https://github.com/twentyhq/twenty) | 40,509 | CRM alternative - community-powered platform reference |
| [x1xhlol/system-prompts-and-models-of-ai-tools](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools) | 131,517 | AI tools system prompts collection |
| [Kalaiviswa/openalgo](https://github.com/Kalaiviswa/openalgo) | 4 | Community fork of OpenAlgo |
| [computerhistory/AlexNet-Source-Code](https://github.com/computerhistory/AlexNet-Source-Code) | 2,845 | Historical ML reference |
| [crypt0inf0/openalgo](https://github.com/crypt0inf0/openalgo) | 3 | Another community fork |
| [usebruno/bruno](https://github.com/usebruno/bruno) | 41,850 | Open-source API testing (Postman alternative) |
| [marketcalls/sketchmaker](https://github.com/marketcalls/sketchmaker) | 40 | Digital creative machine for teams |

**Key starred insight:** marketcalls is watching **crypt0inf0** closely - both their openalgo fork and openalgo-chart fork are starred. crypt0inf0 appears to be a key community contributor building charting extensions.

---

## 5. Following List Analysis (2 people)

### sivakspt
- **Public repos:** 210
- **Followers:** 11
- **No trading-relevant repos found** (likely a personal connection)

### theanh97
- **Profile not found / rate limited** (possibly deleted or renamed)

The tiny following list (2 people) confirms marketcalls follows almost nobody - meaning the forked repos are the real signal for what they're studying.

---

## 6. Network Map (Visual)

```
                        marketcalls (614 followers, 159 repos)
                        ├── OPENALGO ECOSYSTEM
                        │   ├── openalgo (1,501★) - flagship
                        │   ├── openalgo-pinets (14★) - PineTS + LW Charts
                        │   ├── openalgo-flow (17★) - no-code automation
                        │   ├── openalgo-mcp (11★) - AI agent integration
                        │   ├── openalgo-desktop (3★) - Tauri/Rust desktop
                        │   ├── openalgo-mobile (13★) - Dart mobile
                        │   └── openalgo-chart (0★) - LW Charts integration
                        │
                        ├── FORKED/STUDIED (network discovery)
                        │   ├── flowsurface-rs/flowsurface (1,390★) ← CRITICAL
                        │   │   └── Author: akenshaw (Berke)
                        │   │       ├── btcusdt-orderflow (34★)
                        │   │       ├── flowsurface-web-rs (12★) ← WASM version
                        │   │       └── flowsurface-web (7★)
                        │   │
                        │   ├── QuantForgeOrg/PineTS (277★) ← CRITICAL
                        │   │   ├── QFChart (40★) - charting library
                        │   │   ├── pinets-cli (2★)
                        │   │   └── quantforge.org Playground
                        │   │
                        │   ├── gbzenobi/CSharp-NT8-OrderFlowKit (314★)
                        │   │   └── Bookmap, Footprint, Volume Profile, POC/POI
                        │   │
                        │   ├── tradex-app/TradeX-chart (169★)
                        │   │   └── Canvas-rendered, vanilla JS, mobile support
                        │   │
                        │   ├── alphabench/raptorbt (10★)
                        │   │   └── Rust backtesting engine (VectorBT replacement)
                        │   │
                        │   ├── Azhagesan-dev/order-flow-chart (17★)
                        │   │   └── NIFTY orderflow + oakscriptJS (PineScript in JS)
                        │   │
                        │   └── jrstokka/NinjaTraderNCDFiles
                        │       └── NinjaTrader NCD file reader
                        │
                        └── STARRED (community watching)
                            ├── crypt0inf0/openalgo-chart (21★)
                            └── crypt0inf0/openalgo (3★)
```

---

## 7. Feature Coverage Matrix

Mapping discoveries to our 26 target features:

| # | Feature | Flowsurface | PineTS/QFChart | OrderFlowKit | TradeX-chart | marketcalls repos |
|---|---------|-------------|----------------|--------------|--------------|-------------------|
| 1 | HD Heatmaps | **YES** - Historical DOM | - | **YES** - Bookmap.cs | - | - |
| 2 | Aggregated Orderbooks | **YES** - Multi-exchange | - | - | - | - |
| 3 | Aggregated DOM | **YES** - L2 DOM/Ladder | - | **YES** | - | - |
| 4 | Footprints | **YES** - Full footprint | - | **YES** - Multiple styles | - | order-flow-chart |
| 5 | Filtered Footprints | **YES** - Imbalance studies | - | **YES** - VolumeFilter | - | - |
| 6 | CVD | **YES** - Via clustering | - | **YES** | - | - |
| 7 | Market Profile/TPO | **YES** - Volume profiles | - | **YES** - VolumeAnalysisProfile | - | - |
| 8 | Custom Session TPO | Partial | - | Partial | - | - |
| 9 | Orderbook Imbalances | **YES** - Configurable | - | **YES** - POI concept | - | - |
| 10 | Liquidation Heatmap | Partial (depth data) | - | - | - | - |
| 11 | Volume Bubbles | **YES** - Time & Sales | - | - | - | - |
| 12 | 1s Timeframes | **YES** - Tick-based | - | - | - | - |
| 13 | Custom Timeframes | **YES** - Time + tick | - | - | **YES** | openquest (QuestDB) |
| 14 | Dual Cluster Modes | **YES** | - | - | - | - |
| 15 | Net Longs/Shorts | - | - | - | - | - |
| 16 | Aggregated OI | - | - | - | - | - |
| 17 | Bucketed Trades | **YES** - Footprint clustering | - | **YES** | - | - |
| 18 | SL/TP Theory | - | - | - | - | - |
| 19 | Custom Scripting | - | **YES** - Pine Script runtime | - | - | openalgo-pinets |
| 20 | Community Indicators | - | **YES** - 60+ indicators | - | **YES** (talib-web) | pyindicators |
| 21 | WebGL/Canvas | Rust/Iced (GPU) | ECharts (Canvas) | - | **YES** (Canvas) | - |
| 22 | Exchange APIs | **YES** - Binance, Bybit, HL, OKX | - | - | - | **YES** (30+ brokers) |
| 23 | Hyperliquid MBO | **YES** | - | - | - | - |
| 24 | Real-time data | **YES** - Local processing | **YES** - Browser native | - | - | **YES** (WebSocket proxy) |
| 25 | DOM/Ladder | **YES** | - | **YES** | - | - |
| 26 | Drawing Tools | - | **YES** (QFChart plugins) | - | - | - |

**Coverage summary:**
- **Flowsurface** covers ~17/26 features (strongest single source)
- **PineTS + QFChart** covers ~5/26 features (scripting + charting layer)
- **OrderFlowKit** covers ~8/26 features (reference algorithms, C#)
- **TradeX-chart** covers ~3/26 features (Canvas rendering, indicators)
- **marketcalls ecosystem** covers ~4/26 features (exchange APIs, data pipeline)

---

## 8. Key Takeaways & Recommendations

### Critical Discoveries

1. **Flowsurface is the closest open-source competitor to our target feature set.** Built in Rust with Iced GUI, it already has heatmaps, footprints, orderbook visualization, DOM ladder, and multi-exchange support including Hyperliquid. The WASM variant (flowsurface-web-rs) suggests web deployment is feasible.

2. **PineTS + QFChart is the enabling stack for custom scripting.** marketcalls has already validated this integration (openalgo-pinets). PineTS provides Pine Script v5/v6 compatibility in the browser, and QFChart provides the charting canvas. AGPL license requires attention for commercial use.

3. **The OrderFlowKit by gbzenobi is the best open-source reference for orderflow algorithms** - footprint calculation, volume profiling, imbalance detection, and the novel POI (Point of Imbalance) concept. While C#/NinjaTrader, the algorithms are directly portable.

4. **marketcalls is building a bridge between Indian equity trading and crypto** - studying flowsurface (crypto orderflow), PineTS (TradingView alternative scripting), and building their own charting integrations.

### Architecture Insights from the Network

- **Rendering:** Flowsurface uses Rust/Iced (GPU-accelerated), TradeX uses Canvas, QFChart uses ECharts. For web deployment, Canvas/WebGL is the path.
- **Data pipeline:** Flowsurface streams directly from exchange WebSocket APIs with local processing. marketcalls uses QuestDB for time-series storage (openquest) and ZeroMQ for message distribution.
- **Scripting layer:** PineTS is the only viable open-source Pine Script runtime. oakscriptJS by Azhagesan-dev is an alternative attempt but very early stage.

### Developers to Watch

| Developer | Why | Priority |
|-----------|-----|----------|
| **akenshaw** | Flowsurface author - the most complete orderflow workstation | CRITICAL |
| **QuantForgeOrg** | PineTS + QFChart - scripting + charting ecosystem | CRITICAL |
| **gbzenobi** | OrderFlowKit - reference algorithms for footprint/heatmap | HIGH |
| **tradex-app** | TradeX-chart - Canvas-based vanilla JS charting | MEDIUM |
| **Azhagesan-dev** | oakscriptJS + order-flow-chart - PineScript alt + orderflow | MEDIUM |
| **alphabench** | raptorbt - Rust backtesting (performance reference) | LOW |
| **crypt0inf0** | OpenAlgo community contributor, charting extensions | LOW |

### Gaps Not Covered by This Network

The following features have **no coverage** from marketcalls's network:
- **Net Longs/Shorts** - No open-source implementation found
- **Aggregated OI** - Not addressed in any discovered repo
- **SL/TP Theory** - No implementation found
- **Liquidation Heatmap** - Only partially addressed by flowsurface depth data

These gaps may be covered by other networks in the sprint-4 research (particularly the Coinalyze/exchange-specific data providers).

---

## 9. Cross-References with Other Sprint-4 Research

- **akenshaw** was already discovered in [akenshaw-beatzxbt-rootquant-brunopittini.md](./akenshaw-beatzxbt-rootquant-brunopittini.md) and [second-hop-akenshaw-network.md](./second-hop-akenshaw-network.md) - this marketcalls crawl confirms his central position in the orderflow open-source ecosystem
- The **flowsurface** project connects to the broader Rust trading tools network
- **PineTS/QuantForgeOrg** appears to be a new discovery not found in other crawls - significant finding for the custom scripting feature requirement
- **gbzenobi/OrderFlowKit** algorithms (particularly POI - Point of Imbalance) could complement the footprint implementations found in other networks

---

## Sources

- [marketcalls GitHub Profile](https://github.com/marketcalls)
- [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface)
- [Flowsurface Website](https://flowsurface.com/)
- [QuantForgeOrg/PineTS](https://github.com/QuantForgeOrg/PineTS)
- [QuantForgeOrg/QFChart](https://github.com/QuantForgeOrg/QFChart)
- [QuantForge Website & Playground](https://quantforge.org/)
- [gbzenobi/CSharp-NT8-OrderFlowKit](https://github.com/gbzenobi/CSharp-NT8-OrderFlowKit)
- [tradex-app/TradeX-chart](https://github.com/tradex-app/TradeX-chart)
- [alphabench/raptorbt](https://github.com/alphabench/raptorbt)
- [Azhagesan-dev/order-flow-chart](https://github.com/Azhagesan-dev/order-flow-chart)
- [akenshaw/btcusdt-orderflow](https://github.com/akenshaw/btcusdt-orderflow)
- [akenshaw/flowsurface-web-rs](https://github.com/akenshaw/flowsurface-web-rs)
