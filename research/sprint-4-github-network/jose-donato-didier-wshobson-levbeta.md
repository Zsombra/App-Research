# GitHub Network Research: jose-donato, DidierRLopes, wshobson, LevBeta, JakubPluta
## Date: 2026-03-16

---

## 1. jose-donato — **PRIMARY REFERENCE DEVELOPER**

Highest concentration of directly relevant trading visualization and data aggregation tools.

### crypto-orderbook (110 stars, Go + TypeScript)
**Multi-exchange real-time orderbook aggregator.**
- **Exchanges:** Binance, Bybit, Kraken, OKX, Coinbase, BingX (spot). Binance Futures, Bybit Futures, Asterdex Futures (perps).
- **Tech stack:** Go backend (WebSocket aggregation, serves ws://localhost:8086/ws), React + Vite + Tailwind CSS frontend. 60% Go, 37% TypeScript.
- **Features:**
  - Per-exchange AND aggregated orderbook views
  - Exchange statistics table (bid/ask spreads)
  - Liquidity analysis at multiple depth levels (0.5%, 2%, 10%)
  - Interactive filtering (All/Spot/Perps), tick size adjustment, theme selection
  - Real-time depth chart visualization

### cryexc-backend (51 stars, Python/FastAPI) — **MOST FEATURE-RICH**
- **Exchange:** Binance Futures (with notes on adapting for Hyperliquid)
- **Tech stack:** Python, FastAPI, DuckDB
- **WebSocket streams provide:**
  - Trade feeds with filtering
  - Order book snapshots with depth grouping
  - **Liquidation events**
  - **Cumulative Volume Delta (CVD)**
  - **Order book statistics**
  - **Depth of Market visualization**
  - **Footprint candles**
  - **Order book heatmaps**
  - Crypto news feeds
- **HTTP endpoints:** Exchange/symbol metadata, market stats (funding rates, open interest, prices), 24h tickers, OHLCV candlestick data

### binancef_l3_estimate_go (27 stars, Go + D3.js)
**L3 orderbook reconstruction from L2 data for Binance Futures.**
- Reconstructs individual order queues from aggregated L2 data using FIFO logic
- K-Means clustering (3-15 clusters) to identify institutional vs. retail orders
- Real-time stacked bar charts, order tables, queue displays
- Age-based and cluster-based coloring
- Auto-caches symbol-specific tick/step sizes from Binance

### crypto-futures-arbitrage-scanner (117 stars, Go + JS)
- **Exchanges:** Binance, Bybit, Hyperliquid, Kraken, OKX, Gate.io, Paradex (futures) + Binance, Bybit (spot)
- **Tech stack:** Go backend with goroutines/channels, vanilla JS + TradingView Lightweight Charts frontend
- Live price matrix, mid-price calculation, configurable alert thresholds

### openbb-polymarket (34 stars, TypeScript)
OpenBB Workspace app connecting to Polymarket API. 12 widgets. Cloudflare Workers.

### openbb-defillama (6 stars, TypeScript)
OpenBB backend for DeFiLlama API. 40+ endpoints. TypeScript + Hono, Cloudflare Workers.

### KLineChart (fork)
Fork of klinecharts/KLineChart — lightweight HTML5 Canvas charting. Zero deps, 40KB gzipped, 50,000+ data points in 37ms.

---

## 2. DidierRLopes — OpenBB Platform (63.2k stars)

- **Current state:** Very active. Python, AGPLv3. Latest release Feb 9, 2026.
- **What it is:** Open-source financial data infrastructure layer — "connect once, consume everywhere"
- **Data sources:** Pluggable data layer — individual providers connect via backend integrations
- **Tech stack:** Python 100%, FastAPI + Uvicorn, Python 3.9-3.12
- **Relevance:** Data backbone that jose-donato's projects plug into. Widget/backend integration architecture.

### Other Repos:
- **openbb-app-builder-agent** — Agent for building OpenBB apps
- **dexter** — Autonomous agent for deep financial research
- **rt-pivot-obb-widget** — Real-time pivot table widget

---

## 3. wshobson — AI-Powered Stock Analysis

### maverick-mcp (426 stars, Python)
FastMCP 2.0 server for professional-grade stock analysis with Claude Desktop.
- **Data:** Tiingo API, FRED, Exa/Tavily web search, OpenRouter (400+ AI models)
- **Features:** 20+ technical indicators, VectorBT backtesting (15+ strategies), S&P 500 screening, portfolio optimization, 39+ MCP tools
- **Tech stack:** Python 3.12+, TA-Lib, VectorBT, NumPy, Pandas, SQLAlchemy, Redis, FastMCP

### financial-chat (225 stars, Python)
AI financial chat — LangChain + LangGraph + OpenBB + Claude 3 Opus. Streamlit + FastAPI.

**Relevance:** Excellent for equities analysis and backtesting. No orderbook/footprint/heatmap work.

---

## 4. LevBeta — DeFi/Solana Infrastructure

- **ferrofluid** — Fork of Hyperliquid Rust SDK (exchange integration)
- **soleana** (9 stars) — Lightweight Solana transaction parser in Rust
- **mrgn-liq-monitor** — Liquidation monitor for MarginFi (Solana DeFi)
- **Relevance:** Hyperliquid SDK and liquidation monitoring. No charting/visualization.

---

## 5. JakubPluta — Minimal Relevance
- **gofu** — Early-stage technical analysis in Go. No charting projects.

---

## MASTER Feature Coverage Matrix

| Feature | jose-donato | akenshaw | wshobson | OpenBB | LevBeta |
|---------|-------------|----------|----------|--------|---------|
| Orderbook visualization | **crypto-orderbook**, cryexc | **flowsurface** | — | — | — |
| Orderbook heatmaps | **cryexc-backend** | **flowsurface** | — | — | — |
| Footprint candles | **cryexc-backend** | **flowsurface** | — | — | — |
| CVD / Volume Delta | **cryexc-backend** | **flowsurface** | — | — | — |
| Depth of Market | **cryexc-backend** | **flowsurface** | — | — | — |
| L3 order flow | **binancef_l3_estimate_go** | — | — | — | — |
| Candlestick charting | **KLineChart** (fork) | **flowsurface** | — | Widgets | — |
| Technical indicators | — | — | **maverick-mcp** | — | — |
| Multi-exchange aggregation | **crypto-orderbook** (9 exch) | **flowsurface** (4 exch) | — | Data layer | — |
| Liquidation events | **cryexc-backend** | — | — | — | **mrgn-liq-monitor** |
| Backtesting | — | — | **maverick-mcp** | — | — |
| Hyperliquid SDK | — | — | — | — | **ferrofluid** |
| Data platform | — | — | — | **OpenBB** (63k⭐) | — |
