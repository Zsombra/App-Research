# Targeted GitHub Search: Features With No Open-Source Implementations
## Date: 2026-03-16

---

## DEFINITIVE STATUS: 10 Hardest Features

### 1. Volume Bubbles — **ZERO OSS**
- No dedicated implementation anywhere on GitHub
- Closest: Ameobea/cryptoviz (Poloniex DOM viz with sized circles, personal project)
- All real implementations: Bookmap (commercial), LuxAlgo (Pine Script), BigBeluga (Pine Script)
- **Must build from scratch:** Canvas/WebGL, render each trade as circle sized by volume on price-time grid

### 2. Hyperliquid Liquidation Heatmap — **Data exists, no viz**
- **itay747/perspective-hyperliquid** — Orderbook heatmap demo using Perspective/WASM (not a real trading tool)
- **moondevonyt/Hyperliquid-Data-Layer-API** (93-128 stars) — API with liquidation data, whale tracking. Requires API key.
- **thunderhead-labs/hyperliquid-stats** — Cumulative liquidated notional, daily liquidations by leverage. PostgreSQL backend.
- Kiyotaka.ai has the real-time viz but is proprietary
- **Must build:** Heatmap rendering layer on top of existing data APIs

### 3. Hyperliquid SL/TP Heatmap — **NOTHING EXISTS**
- Zero repos, zero implementations, zero articles
- Trigger orders ARE on-chain on Hyperliquid (unlike CEXes where they're hidden)
- But no one has built a tool to aggregate and visualize them
- **Must build entirely from scratch + research if trigger orders are actually queryable**

### 4. HD Heatmaps — **Definition + no HD-grade OSS**
HD = Non-aggregated, pixel-level precision, per-pixel time resolution, no smoothing, ~40 FPS
- **Elenchev/order-book-heatmap** (472 stars, JS/D3/SVG) — Good concept but SVG cannot achieve HD performance
- **suhaspete/Real-Time-Order-Book-Heatmap** — Fork of Elenchev
- **BookmapAPI/python-api** — Requires Bookmap license
- **Must build:** WebGL renderer with high-perf orderbook data structure (glass-rs pattern)

### 5. Filtered Footprints — **No filtering in any OSS footprint**
"Filtered" = minimum volume threshold, hiding small trades to show only institutional activity
- flowsurface has footprints but no filtering
- gbzenobi/CSharp-NT8-OrderFlowKit (312 stars) — Most complete footprint, NinjaTrader-only
- **Must build:** Add threshold filter on top of existing footprint implementation. Straightforward once footprints work.

### 6. Net Longs/Shorts Indicator — **Trivial API wrappers only**
- **joemccann/api-long-short-ratio** (5 stars) — Bitfinex-only, Google Cloud Functions
- **serkor1/cryptoQuotes** (R) — Can fetch from Binance `get_lsratio()`
- Decomposition formula: OI_change + price_change → longs opening/closing/shorts opening/closing
- Exists in Pine Script but not as standalone library
- **Must build:** Multi-exchange aggregation + decomposition + visualization

### 7. Aggregated Open Interest — **ZERO dedicated tool**
- **tann9949/chompk-bot** — Personal Telegram bot, only mention of aggregated OI
- CCXT/cryptofeed can fetch OI per-exchange
- CoinGlass/Coinalyze provide it but proprietary
- **Must build:** Aggregate OI from Binance + Bybit + OKX + Hyperliquid via their APIs

### 8. Custom Session TPO — **Partial coverage**
- **EarnForex/MarketProfile** (177 stars, MQL5/MQL4/C#) — Most configurable: rectangle sessions, custom VA%, TPO letter sizing. But MetaTrader-locked.
- **beinghorizontal/tpo_project** (123 stars, Python) — Auto-detected sessions, not user-configurable
- **sivamgr/tpo_market_profile** — Basic, from 1-min candles
- **Must build:** Extend tpo_project with configurable session boundaries for web

### 9. Orderbook Depth Overlay — **ZERO OSS**
Concept: translucent overlay of orderbook depth on candlestick chart (not separate pane)
- TRDR (commercial) has this exact feature
- flowsurface shows depth as separate heatmap pane, not overlaid
- **Must build:** Canvas overlay layer rendering cumulative bid/ask as semi-transparent area on price chart

### 10. Community Indicators Marketplace — **ZERO OSS**
- No open-source marketplace exists anywhere
- TradingView community scripts (150K+), NinjaTrader Ecosystem, cTrader store — all proprietary
- StockSharp has visual strategy builder but no marketplace
- aggr-lib is closest (GitHub-backed community indicators) but no browse/rate/install UI
- **Must build:** Novel feature if built — browse, install, rate, share indicators

---

## Additional Repos Discovered

| Repo | Stars | Lang | Feature |
|------|-------|------|---------|
| Ameobea/cryptoviz | low | JS | Volume bubble-adjacent (DOM viz with sized circles) |
| EarnForex/MarketProfile | 177 | MQL | Most configurable TPO (custom sessions) |
| gbzenobi/CSharp-NT8-OrderFlowKit | 312 | C# | Complete order flow toolkit (NT8 only) |
| tysonwu/stack-orderflow | 131 | Python | Orderflow + market profile desktop GUI |
| suhaspete/Real-Time-Order-Book-Heatmap | low | JS | Fork of Elenchev heatmap |

---

## KEY INSIGHT: What Makes This App Unique

**Of the 10 hardest features, NONE have production-quality open-source implementations.**

This means building this app would create the **first open-source platform** covering:
- Volume Bubbles
- Real-time liquidation heatmaps
- HD orderbook heatmaps (WebGL)
- Filtered footprints
- Net Longs/Shorts decomposition
- Aggregated Open Interest
- Custom Session TPO (web-based)
- Orderbook depth overlay on candlesticks
- Community indicator marketplace

**flowsurface** (1,400 stars, Rust) is the closest competitor but is desktop-only and doesn't cover these specific features.
