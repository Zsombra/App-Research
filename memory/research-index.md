# Trading App Research Index
## Project: TradingView Alternative - Custom Web App

### Research Status
| Sprint | Topic | Status | Last Updated |
|--------|-------|--------|-------------|
| 1 | Core Concepts (Market Profile, TPO, Footprints, CVD, OI) | COMPLETE | 2026-03-16 |
| 2 | Heatmaps & Liquidation Data (+ Hyperliquid API) | COMPLETE | 2026-03-16 |
| 3 | Orderbook & DOM Features | COMPLETE | 2026-03-16 |
| 4 | GitHub Network Crawl (jose-donato + network) | COMPLETE | 2026-03-16 |
| 5 | Advanced Features (VWAP, Bubbles, Scripting, Timeframes) | COMPLETE | 2026-03-16 |

### Research Files
| File | Location |
|------|----------|
| Master Report | `reports/MASTER-RESEARCH-REPORT.md` |
| Trading Concepts Deep Dive | `research/sprint-1-core-concepts/trading-concepts-deep-dive.md` |
| KLineChart Evaluation | `research/sprint-1-core-concepts/klinechart-evaluation.md` |
| Hyperliquid API Research | `research/sprint-2-heatmaps/hyperliquid-data-capabilities-research.md` |
| aggr.trade Research | `research/sprint-4-github-network/tucsky-aggr-trade.md` |
| flowsurface/akenshaw Research | `research/sprint-4-github-network/akenshaw-beatzxbt-rootquant-brunopittini.md` |
| jose-donato/OpenBB Network | `research/sprint-4-github-network/jose-donato-didier-wshobson-levbeta.md` |
| Orderbook/DOM Research | `research/sprint-3-orderbook/orderbook-dom-research.md` |
| Advanced Features | `research/sprint-5-advanced/advanced-features-research.md` |

### Top Reference Projects
1. **aggr.trade** (Tucsky) — 27 exchanges, best aggregation, CVD, liquidations, custom scripting
2. **flowsurface** (akenshaw) — Footprints, heatmaps, DOM, CVD (Rust desktop, archived web)
3. **cryexc-backend** (jose-donato) — Footprints, heatmaps, CVD, DOM, liquidations (Python/FastAPI)
4. **crypto-orderbook** (jose-donato) — Multi-exchange aggregated orderbook (Go+React)
5. **focus1691/orderflow** — TypeScript footprint candle service for 5 exchanges
6. **KLineChart** — Standard candlestick charting only (NOT for order flow)

### Recommended Architecture (from research)
- Web Worker per exchange for non-blocking aggregation
- Custom Canvas/WebGL rendering for order flow (NOT KLineChart)
- TV lightweight-charts fork for standard OHLC layer
- Monaco Editor for custom scripting
- FastAPI + DuckDB for backend
- IndexedDB + protobuf for client storage
- SharedArrayBuffer for worker→main thread data transfer

### Key Hyperliquid Findings
- All positions on-chain and queryable → best for liquidation heatmaps
- L4/MBO data via self-hosted node
- SL/TP orders NOT publicly visible (only gap)
- Net longs/shorts derivable from position data

### Next Steps for Future Sessions
- [ ] Second-hop GitHub crawl (follow users that jose-donato's network follows)
- [ ] Technology stack decision (React vs Vue vs Svelte)
- [ ] Prototype: aggregated orderbook + basic candlestick chart
- [ ] Data layer design: exchange WebSocket abstraction
- [ ] Evaluate focus1691/orderflow as footprint starting point
- [ ] Evaluate fer880220/OrderFlow-Chart-demo for lightweight-charts integration
