# Trading App Research Index
## Project: TradingView Alternative - Custom Web App
## Last Updated: 2026-03-16

### Research Status
| Sprint | Topic | Status | Last Updated |
|--------|-------|--------|-------------|
| 1 | Core Concepts (Market Profile, TPO, Footprints, CVD, OI) | COMPLETE | 2026-03-16 |
| 2 | Heatmaps & Liquidation Data (+ Hyperliquid API) | COMPLETE | 2026-03-16 |
| 3 | Orderbook & DOM Features | COMPLETE | 2026-03-16 |
| 4 | GitHub Network Crawl (jose-donato + multi-hop spider web) | COMPLETE | 2026-03-16 |
| 5 | Advanced Features (VWAP, Bubbles, Scripting, Timeframes) | COMPLETE | 2026-03-16 |
| 6 | Deep Crawl (3rd/4th hop, targeted feature search) | COMPLETE | 2026-03-16 |
| 7 | Gap Feature Deep Research (Filtered Footprints, Bucketed Trades, Volume Bubbles, SL/TP Heatmaps) | COMPLETE | 2026-03-16 |

### Research Files
| File | Location |
|------|----------|
| **Master Report** | `reports/MASTER-RESEARCH-REPORT.md` |
| Trading Concepts Deep Dive | `research/sprint-1-core-concepts/trading-concepts-deep-dive.md` |
| KLineChart Evaluation | `research/sprint-1-core-concepts/klinechart-evaluation.md` |
| Hyperliquid API Research | `research/sprint-2-heatmaps/hyperliquid-data-capabilities-research.md` |
| Orderbook/DOM Research | `research/sprint-3-orderbook/orderbook-dom-research.md` |
| aggr.trade Research | `research/sprint-4-github-network/tucsky-aggr-trade.md` |
| flowsurface/akenshaw Research | `research/sprint-4-github-network/akenshaw-beatzxbt-rootquant-brunopittini.md` |
| jose-donato/OpenBB Network | `research/sprint-4-github-network/jose-donato-didier-wshobson-levbeta.md` |
| Second-hop: akenshaw network | `research/sprint-4-github-network/second-hop-akenshaw-network.md` |
| Second-hop: beatzxbt network | `research/sprint-4-github-network/second-hop-beatzxbt-network.md` |
| Second-hop: liihuu/azidyn/LevBeta | `research/sprint-4-github-network/second-hop-liihuu-matt-azidyn-levbeta.md` |
| Deep crawl: Feature gap analysis | `research/sprint-4-github-network/deep-crawl-feature-gap-analysis.md` |
| Deep crawl: Targeted feature search | `research/sprint-4-github-network/deep-crawl-targeted-feature-search.md` |
| Deep crawl: OctopusTakopi/focus/beinh | `research/sprint-4-github-network/deep-crawl-octopus-focus-beinh-network.md` |
| Deep crawl: tiagosiebler network | `research/sprint-4-github-network/deep-crawl-tiagosiebler-network.md` |
| Advanced Features | `research/sprint-5-advanced/advanced-features-research.md` |
| Gap: Filtered Footprints + Bucketed Trades | `research/sprint-7-gap-features/filtered-footprints-bucketed-trades.md` |
| Gap: Volume Bubbles + SL/TP Heatmaps | `research/sprint-7-gap-features/volume-bubbles-sl-tp-theory.md` |
| Gap: Net Longs/Shorts + Aggregated OI | `research/sprint-7-gap-features/net-longs-shorts-aggregated-oi.md` |
| Gap: Custom Session TPO + Community Marketplace | `research/sprint-7-gap-features/custom-session-tpo-community-marketplace.md` |

### Feature Gap Summary (26 Features)
- **13 COVERED** by existing OSS (TPO, MBO, Footprints, Dual Cluster, CVD, Scripting, Orderbooks, DOM, Imbalances, 1s/Custom Timeframes)
- **3 PARTIAL** (Aggregated Heatmaps, Liquidation Heatmap, Hyperliquid Liq Heatmap)
- **1 MUST BUILD** (Community Indicator Marketplace — no OSS trading marketplace UI exists)
- **9 PARTIALLY COVERED** after Sprint 7 (Volume Bubbles, Filtered Footprints, Bucketed Trades, Net Longs/Shorts, Aggregated OI, Custom Session TPO, HD Heatmaps, Aggregated Heatmaps, Hyperliquid Liq Heatmap)
- **2 ESTIMABLE** (Hyperliquid SL/TP Heatmaps — 6 algorithmic approaches documented, trigger orders hidden)

### Top Reference Projects (by relevance)
1. **aggr.trade** (1,092★) — 27 exchanges, best aggregation, CVD, liquidations, custom scripting
2. **flowsurface** (1,400★) — Footprints, heatmaps, DOM, CVD (Rust desktop)
3. **VisualHFT** (1,100★) — LOB viz, VPIN, imbalance, multi-exchange plugins
4. **cryexc-backend** (51★) — Most feature-complete backend (Python/FastAPI)
5. **tiagosiebler/orderflow** (65★) — Production footprint service (5 exchanges, NestJS)
6. **OctopusTakopi/binance_l3_est** (208★) — L3 reconstruction + heatmap viz
7. **beinghorizontal/tpo_project** (130★) — Only OSS TPO/Market Profile
8. **aoki-h-jp/py-liquidation-map** (119★) — Liquidation heatmap images

### Recommended Architecture
- Web Worker per exchange for non-blocking aggregation (aggr.trade pattern)
- Custom Canvas/WebGL rendering for order flow (NOT KLineChart)
- TV lightweight-charts fork for standard OHLC layer
- Monaco Editor for custom scripting
- FastAPI + DuckDB (or TimescaleDB) for backend
- IndexedDB + protobuf for client storage
- SharedArrayBuffer for worker→main thread data transfer
- glass-rs radix trie pattern for orderbook data structure

### Key Hyperliquid Findings
- All positions on-chain and queryable → best for liquidation heatmaps
- L4/MBO data via self-hosted node + order_book_server
- SL/TP orders NOT publicly visible (must estimate statistically)
- Net longs/shorts derivable from position data

### Next Steps
- [x] Deep-crawl agents complete (tiagosiebler, OctopusTakopi/focus1691/beinghorizontal)
- [ ] Technology stack decision (React vs Vue vs Svelte)
- [ ] Prototype: aggregated orderbook + basic candlestick chart
- [ ] Data layer design: exchange WebSocket abstraction
- [ ] Build Volume Bubbles proof-of-concept (first-ever OSS)
