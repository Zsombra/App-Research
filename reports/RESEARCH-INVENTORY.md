# Research Inventory Report
## Date: 2026-03-16

---

## Overall Stats

- **Total research files:** 25
- **Total lines of research:** 8,084
- **Sprints completed:** 7

---

## Inventory by Feature (Original 26-Feature List)

| # | Feature | Research Depth | Key Files | Lines | Verdict |
|---|---------|---------------|-----------|-------|---------|
| 1 | **Market Profile / TPO** | DEEP | trading-concepts-deep-dive.md, tpo_project (130★), EarnForex/MarketProfile (177★) | ~80 lines + sprint-7 deep dive | Sufficient |
| 2 | **Custom Session TPO** | GOOD | custom-session-tpo-community-marketplace.md (767 lines), chart-patterns npm, EarnForex MQL sessions | 767 | Sufficient |
| 3 | **Hyperliquid MBO Profile** | GOOD | hyperliquid-data-capabilities-research.md (302 lines), order_book_server (118★) | 302 | Sufficient |
| 4 | **Aggregated Heatmaps** | MODERATE | deep-crawl-degensugar (OpenBook), deep-crawl-octopus (binance_l3_est), Elenchev (496★) | ~200 across files | Sufficient — multiple refs found |
| 5 | **HD Heatmaps** | MODERATE | flowsurface analysis, Elenchev/order-book-heatmap (SVG), WebGL notes in master report | ~100 | Needs more — WebGL rendering strategy not deeply researched |
| 6 | **Liquidation Heatmap** | DEEP | TapeFlow (12+ features), Senior-Architecture repo, py-liquidation-map (119★), volume-bubbles-sl-tp-theory.md | ~200+ | Sufficient |
| 7 | **Hyperliquid Liquidation Heatmap** | GOOD | hyperliquid-data-capabilities-research.md, moondevonyt API, thunderhead-labs | 302 shared | Sufficient |
| 8 | **Hyperliquid SL Heatmap** | DEEP | volume-bubbles-sl-tp-theory.md — 6 estimation algorithms, joshyattridge/smart-money-concepts (1.4K★), DBSCAN, Osler research | 664 | Sufficient — 6 algo approaches documented |
| 9 | **Hyperliquid TP Heatmap** | DEEP | Same file — TP clusters at round numbers per Osler (2002), same 6 estimation frameworks | 664 shared | Sufficient |
| 10 | **Aggregated Footprints** | GOOD | tiagosiebler/orderflow (65★, 5 exchanges), deep-crawl-tiagosiebler (363 lines) | 363+ | Sufficient |
| 11 | **Filtered Footprints** | GOOD | filtered-footprints-bucketed-trades.md, gbzenobi/OrderFlowKit VolumeFilter.cs (314★), ATAS ClusterSearch | 198 | Sufficient — C# source analyzed, TS port plan clear |
| 12 | **Dual Cluster Modes** | MODERATE | flowsurface analysis (multiple clustering methods noted) | ~50 | Sufficient — straightforward feature |
| 13 | **Bucketed Trade Size Groups** | GOOD | filtered-footprints-bucketed-trades.md, OctopusTakopi K-Means (208★), TradingView 3-tier sizing | 198 shared | Sufficient |
| 14 | **Aggregated CVD** | DEEP | aggr.trade research (120 lines), trading-concepts-deep-dive.md (~60 lines CVD section) | ~180 | Sufficient |
| 15 | **Aggregated Open Interest** | DEEP | net-longs-shorts-aggregated-oi.md (666 lines), cryptofeed, coinglass-api, exchange APIs documented | 666 | Sufficient |
| 16 | **Net Longs/Shorts** | DEEP | net-longs-shorts-aggregated-oi.md (666 lines), exchange API endpoints listed, aggregation patterns | 666 shared | Sufficient |
| 17 | **VWAP Suite** | MODERATE | TapeFlow + Titan found, advanced-features-research.md | ~80 | Sufficient — standard feature, well-understood |
| 18 | **Volume Bubbles** | DEEP | volume-bubbles-sl-tp-theory.md (664 lines), Elenchev (496★), srlcarlg plot_bubbles(), 7 Pine Scripts | 664 | Sufficient |
| 19 | **Custom Scripting** | GOOD | tucsky-aggr-trade.md (120 lines), deep-crawl-azidyn (Lua VMs, JS sandboxes, 457 lines) | 577 | Sufficient |
| 20 | **Community Indicator Marketplace** | GOOD | custom-session-tpo-community-marketplace.md (767 lines), aggr-lib pattern, Open VSX architecture, react-pluggable | 767 shared | Sufficient — marketplace architecture well-documented |
| 21 | **Aggregated Orderbooks** | GOOD | orderbook-dom-research.md (192 lines), jose-donato/crypto-orderbook (9 exchanges) | 192+ | Sufficient |
| 22 | **Aggregated DOM** | GOOD | orderbook-dom-research.md, tiagosiebler/orderbooks (162★) | 192 shared | Sufficient |
| 23 | **Orderbook Imbalances** | GOOD | VisualHFT (1,100★), flowsurface, orderbook-dom-research.md | 192 shared | Sufficient |
| 24 | **Orderbook Depth Overlay** | GOOD | nssanta/quant-order-book (depth on candlestick!), deep-crawl-octopus | ~100 | Sufficient |
| 25 | **1s Timeframes** | MODERATE | valamidev/candlestick-convert (55★), aggr.trade | ~40 | Sufficient — simple feature |
| 26 | **Custom Timeframes** | MODERATE | aggr.trade + candlestick-convert | ~40 | Sufficient — simple feature |

---

## Inventory by Research File

| # | File | Sprint | Lines | Coverage |
|---|------|--------|-------|----------|
| 1 | trading-concepts-deep-dive.md | 1 | 522 | TPO, Footprints, CVD, Heatmaps, Volume Profile |
| 2 | klinechart-evaluation.md | 1 | 92 | Library assessment + gap analysis |
| 3 | hyperliquid-data-capabilities-research.md | 2 | 302 | Full Hyperliquid API + data availability |
| 4 | orderbook-dom-research.md | 3 | 192 | Orderbook aggregation, imbalance, rendering |
| 5 | tucsky-aggr-trade.md | 4 | 120 | aggr.trade architecture, 27 exchanges |
| 6 | akenshaw-beatzxbt-rootquant-brunopittini.md | 4 | 92 | flowsurface, mm-toolbox, order flow |
| 7 | jose-donato-didier-wshobson-levbeta.md | 4 | 120 | cryexc-backend, OpenBB network |
| 8 | second-hop-akenshaw-network.md | 4 | 99 | nautilus_trader, ninjabook, toxic-flow |
| 9 | second-hop-beatzxbt-network.md | 4 | 129 | VisualHFT, binance_l3_est, glass-rs |
| 10 | second-hop-liihuu-matt-azidyn-levbeta.md | 4 | 120 | tpo_project, tiagosiebler SDKs |
| 11 | deep-crawl-feature-gap-analysis.md | 6 | 114 | 26-feature gap matrix |
| 12 | deep-crawl-targeted-feature-search.md | 6 | 101 | 10 hardest features search |
| 13 | deep-crawl-octopus-focus-beinh-network.md | 6 | 330 | TapeFlow discovery, Rust TPO |
| 14 | deep-crawl-tiagosiebler-network.md | 6 | 363 | 8 exchange SDKs, footprint service |
| 15 | deep-crawl-degensugar-network.md | 6 | 515 | OpenBook heatmap, sstoikov connection |
| 16 | deep-crawl-soulmachine-network.md | 6 | 452 | crypto-crawler org, microprice (442★) |
| 17 | deep-crawl-azidyn-network.md | 6 | 457 | Custom scripting research, Lua/JS sandboxes |
| 18 | deep-crawl-cryptognome-network.md | 6 | 510 | 5 generations of liquidation bots |
| 19 | deep-crawl-marketcalls-network.md | 6 | 399 | PineTS transpiler, OrderFlowKit (314★) |
| 20 | deep-crawl-lubluniky-network.md | 6 | 489 | AVX-512 MM, glass-rs, QuantDreamGit LOB |
| 21 | advanced-features-research.md | 5 | 271 | VWAP, Bubbles, Scripting, Timeframes |
| 22 | filtered-footprints-bucketed-trades.md | 7 | 198 | VolumeFilter.cs, K-Means clustering |
| 23 | volume-bubbles-sl-tp-theory.md | 7 | 664 | Bubbles, 6 SL/TP estimation algorithms |
| 24 | net-longs-shorts-aggregated-oi.md | 7 | 666 | Exchange APIs, cryptofeed, aggregation |
| 25 | custom-session-tpo-community-marketplace.md | 7 | 767 | Custom TPO sessions, marketplace arch |

---

## Summary Verdict

| Status | Count | Features |
|--------|-------|----------|
| **Sufficient** | 24 | All except HD Heatmaps (partially) |
| **Could use more** | 1 | HD Heatmaps — WebGL rendering strategy for financial heatmaps at scale (resolution, frame budgets, GPU memory) |
| **Truly novel / must-build** | 1 | Community Marketplace UI — but architecture patterns (Open VSX, aggr-lib) are well-documented |

### GitHub Network Crawl Coverage
- **15 primary developers** deeply profiled
- **~80+ repos** catalogued across 8 tiers
- **Cross-connections mapped** (tight-knit HFT community confirmed)
- **2-hop depth** on all major nodes

### What We DON'T Have (and may want)
1. **WebGL/Canvas rendering benchmarks** — No research on frame budgets, GPU memory for 100K+ price level heatmaps
2. **Backend architecture deep-dive** — We have patterns (Web Workers, FastAPI+DuckDB) but no detailed system design doc
3. **Exchange WebSocket protocol comparison** — ccxt/cryptofeed noted but no latency/throughput benchmarks
4. **UI/UX design patterns** — No research on how Bookmap/ATAS/Quantower lay out their multi-panel interfaces
5. **State management patterns** — No research on how to sync real-time data across 10+ chart panels efficiently

### Bottom Line
**Research phase is essentially complete for all 26 features.** The remaining gaps are implementation-level concerns (rendering performance, system design, UX patterns) that are better addressed during prototyping than during research.
