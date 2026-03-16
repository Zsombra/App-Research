# Deep Crawl: Feature Gap Analysis + crypto-crawler + VisualHFT
## Date: 2026-03-16

---

## FEATURE GAP STATUS (Final Assessment)

| # | Feature | OSS Exists? | Best Reference | Gap Status |
|---|---------|-------------|---------------|------------|
| 1 | Market Profile / TPO | YES | beinghorizontal/tpo_project (130 stars) | **COVERED** |
| 2 | Custom Session TPO | NO | tpo_project has basic sessions only | **OPEN GAP** |
| 3 | Hyperliquid MBO Profile | YES | hyperliquid-dex/order_book_server (L4 data) | **COVERED** (infra needed) |
| 4 | Aggregated Heatmaps | PARTIAL | flowsurface (single exchange only) | **PARTIAL** |
| 5 | HD Heatmaps | YES | flowsurface-rs/flowsurface (1,400 stars) | **MOSTLY COVERED** |
| 6 | Liquidation Heatmap | PARTIAL | aoki-h-jp/py-liquidation-map (119 stars, historical only) | **PARTIAL** (no real-time) |
| 7 | Hyperliquid Liquidation Heatmap | PARTIAL | moondevonyt API + Hyperliquid position data | **PARTIAL** (API only) |
| 8 | Hyperliquid Stop Loss Heatmap | NO | SL/TP orders hidden by protocol | **IMPOSSIBLE** (must estimate) |
| 9 | Hyperliquid Take Profit Heatmap | NO | Same as above | **IMPOSSIBLE** (must estimate) |
| 10 | Aggregated Footprints | YES | tiagosiebler/orderflow (65 stars, 5 exchanges) | **COVERED** |
| 11 | Filtered Footprints | NO | flowsurface has basic footprint only | **OPEN GAP** |
| 12 | Dual Cluster Modes | YES | flowsurface (multiple clustering methods) | **COVERED** |
| 13 | Bucketed Trade Size Groups | NO | Concept exists in beatzxbt/mm-toolbox | **OPEN GAP** |
| 14 | Aggregated CVD | YES | aggr.trade (27 exchanges) | **COVERED** |
| 15 | Aggregated Open Interest | NO | cryptofeed provides data pipes only | **OPEN GAP** |
| 16 | Net Longs/Shorts | NO | Pine Script only, no OSS repo | **OPEN GAP** |
| 17 | VWAP Suite | PARTIAL | Standard formula, no dedicated suite | **BUILD OURSELVES** |
| 18 | Volume Bubbles | BARELY | srlcarlg/srl-ctrader-indicators (cTrader only) | **OPEN GAP** |
| 19 | Custom Scripting | YES | aggr.trade (Monaco Editor + JS) | **COVERED** |
| 20 | Community Indicators | YES | aggr-lib (GitHub-backed) | **COVERED** |
| 21 | Aggregated Orderbooks | YES | jose-donato/crypto-orderbook (9 exchanges) | **COVERED** |
| 22 | Aggregated DOM | YES | tiagosiebler/orderbooks (162 stars) | **COVERED** |
| 23 | Orderbook Imbalances | YES | VisualHFT (1,100 stars) + flowsurface | **COVERED** |
| 24 | Orderbook Depth Overlay | PARTIAL | amCharts demo, no dedicated OSS | **PARTIAL** |
| 25 | 1s Timeframes | YES | valamidev/candlestick-convert (55 stars) | **COVERED** |
| 26 | Custom Timeframes | YES | aggr.trade + candlestick-convert | **COVERED** |

### Summary: 15 COVERED, 4 PARTIAL, 5 OPEN GAP, 2 IMPOSSIBLE (must estimate)

---

## NEW REPOS DISCOVERED

### Liquidation Visualization
| Repo | Stars | Lang | What It Does |
|------|-------|------|-------------|
| **aoki-h-jp/py-liquidation-map** | 119 | Python | Generates actual liquidation heatmap images from execution data (Binance + Bybit) |
| **StephanAkkerman/liquidations-chart** | 41 | Python | Coinglass-style liquidation bar charts |

### Orderbook Heatmap
| Repo | Stars | Lang | What It Does |
|------|-------|------|-------------|
| **DegenSugarBoo/OpenBook** | 122 | Rust | Bookmap-style depth heatmap, fill:kill analytics, trade tape |
| **Elenchev/order-book-heatmap** | 496 | JS/D3 | Live browser-based LOB heatmap with demo |

### Order Flow
| Repo | Stars | Lang | What It Does |
|------|-------|------|-------------|
| **tysonwu/stack-orderflow** | 131 | Python/PyQt | Orderflow charts WITH market profile |
| **AndreaFerrante/Orderflow** | 117 | Python | Imbalances as core feature (in dev) |
| **srlcarlg/srl-ctrader-indicators** | 49 | C# | Volume Bubbles + Levels mode (cTrader) |

---

## CRYPTO-CRAWLER ORG (42 repos)

Pure **data ingestion** pipeline — no visualization. Key repos:

| Repo | Stars | Purpose |
|------|-------|---------|
| crypto-crawler-rs | 260 | Multi-exchange market data crawler (Rust) |
| carbonbot | 73 | CLI data collector |
| crypto-msg-parser | 12 | Exchange message format parser |
| FundingRate | 10 | Perpetual funding rates every 2h |
| coinsignal | 16 | Trading indicators calculator |
| crypto-market-raw-data | 19 | Daily data crawling |

---

## VISUALHFT DEEP DIVE

- Creator: **silahian** (Ariel Silahian, NY, 10+ years HFT)
- Solo project, Apache-2.0, C#/WPF/.NET 7.0
- **VisualHFT-L3** account suggests commercial tier beyond OSS
- Uses OxyPlot for charting (forked into org)

### Features Implemented:
- Real-time LOB rendering (10+ depth levels)
- VPIN indicator
- LOB Imbalance
- Market Resilience metric
- Interactive depth charts
- Spread analysis
- Multi-venue price comparison
- Plugin architecture (7 exchanges)

---

## FEATURES WE MUST BUILD FROM SCRATCH

These have **no open-source implementation** anywhere:

1. **Volume Bubbles** — Only exists in Bookmap (commercial) and one cTrader indicator. Must build custom Canvas/WebGL renderer.

2. **Filtered Footprints** — Filtering by delta/volume threshold on footprint data. Logic is straightforward once footprints work — just add threshold filters.

3. **Net Longs/Shorts Indicator** — Decomposition: OI change + price change → longs opening/closing/shorts opening/closing. Formula exists in Pine Script, needs porting.

4. **Aggregated Open Interest** — cryptofeed provides OI data from 37+ exchanges. Aggregation logic must be built on top.

5. **Bucketed Trade Size Groups** — Classify trades by notional value, render as separate CVD/histogram per bucket. beatzxbt/mm-toolbox has data structures, visualization must be built.

6. **Custom Session TPO** — Extend beinghorizontal/tpo_project with configurable session boundaries.

7. **Hyperliquid SL/TP Heatmaps** — Must be estimated statistically from position data + common SL/TP placement patterns. No direct data available.
