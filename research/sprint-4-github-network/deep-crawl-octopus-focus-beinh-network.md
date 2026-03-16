# Deep Crawl: OctopusTakopi, focus1691, beinghorizontal Networks
## Date: 2026-03-16

---

## CRITICAL NEW DISCOVERIES

### ianfigueroa/TapeFlow (TypeScript, 11 stars) — MOST FEATURE-COMPLETE OSS TRADING TERMINAL

| Feature | Status |
|---------|--------|
| **Footprint charts** with volume heatmap coloring | YES |
| **DOM Ladder** with price level imbalance detection | YES |
| **CVD (Cumulative Volume Delta)** overlay | YES |
| **Volume Profile** with Point of Control | YES |
| **Open Interest** monitoring with delta tracking | YES |
| **Liquidation heatmap** visualization | YES |
| **Trade tape** (Time & Sales) with whale highlighting | YES |
| **VWAP** (session analytics) | YES |
| **Algorithmic detection**: whale trades, velocity surges, spoofing, walls, iceberg orders | YES |
| Dockable workspace layout | YES |
| Paper trading with slippage simulation | YES |
| Sound alerts and desktop notifications | YES |

**Companion: ianfigueroa/Titan** (C++)
- Real-time orderbook with gap detection/resync
- VWAP computation
- Spread in basis points
- Orderbook imbalance (-1 to +1)
- Whale trade alerts (sigma-based detection)
- WebSocket server streaming metrics every 500ms

### 0xSmartCrypto/hyperfootprint (Python, 1 star) — Hyperliquid-Specific

| Feature | Status |
|---------|--------|
| **Footprint charts** (order flow visualization) | YES |
| **Volume Profile** analysis | YES |
| **CVD** (cumulative volume delta) | YES |
| **Imbalance detection** | YES |
| **Absorption pattern** detection | YES |
| **Delta divergence** detection | YES |
| **Hyperliquid-specific** (SUI data) | YES |
| AI trading signals with confidence ratings | YES |

### sagartarar/Trading (Python + Rust, 0 stars) — Rust-Accelerated TPO

| Feature | Status |
|---------|--------|
| **Market Profile Engine** (TPO, Value Area, POC, Single Prints) | YES |
| **Rust-accelerated** (102x faster than Python via PyO3) | YES |
| Backtesting framework with modular Strategy base class | YES |
| Portfolio simulator with Kelly sizing | YES |
| Multi-timeframe data pipeline (1-min to weekly) | YES |
| Streamlit dashboard | YES |

### nssanta/quant-order-book (JavaScript, 4 stars) — Multi-Exchange Orderbook Suite

| Feature | Status |
|---------|--------|
| **Orderbook heatmap** (depth overlaid on candlestick chart) | YES |
| **CVD chart** (via D3.js) | YES |
| **DOM Ladder** | YES |
| **Depth chart** | YES |
| **Index Alpha** (buyer vs seller strength) | YES |
| **Delta** (buy - sell volume) | YES |
| **Imbalance** (bid/ask %) | YES |
| Multi-exchange: Binance, OKX, Bybit | YES |

### Senior-Architecture/Cryptocurrency-Liquidation-Heatmap (Python, 4 stars)

| Feature | Status |
|---------|--------|
| **Liquidation heatmap** (Coinglass-style) | YES |
| Multi-exchange: Binance, OKX, Bybit via CCXT | YES |
| Multiple leverage levels (5x-125x) | YES |
| Multi-pair support (BTC, ETH, SOL, etc.) | YES |
| Streamlit + Plotly visualization | YES |

---

## OctopusTakopi's Network

### OctopusTakopi's Own Repos (expanded)
| Repo | Lang | Purpose |
|------|------|---------|
| binance_l3_est (208★) | Rust | L3 orderbook reconstruction + heatmap + whale/TWAP detection + K-Means clustering |
| glass-rs (24★) | Rust | Ultra-fast orderbook radix trie, 24x faster than BTreeMap |
| collector | Rust | Optimized HFT data collector (40% less CPU than hftbacktest) |
| sstoikov_microprice | Rust | Stoikov microprice model |
| hawkes | Rust | Hawkes process for trade arrival modeling |
| sbe-collector | Rust | Binance SBE protocol data collection |

### DegenSugarBoo (mutual follow with OctopusTakopi)
| Repo | Stars | Lang | Features |
|------|-------|------|----------|
| **OpenBook** | 122 | Rust | **Bookmap-style depth heatmap**, trade tape with side coloring, Fill:Kill analytics, market impact estimator, dockable workspace, adaptive rendering |
| **cli_ob** | 10 | Rust | TUI orderbook, 60s rolling chart with **trade bubble markers**, spread/latency/imbalance metrics |
| **cross-ex-arb-dashboard** | 3 | Rust | Cross-exchange arb scanner (Hyperliquid, Lighter, Aster, edgeX), funding rate data |

### Other Notable Finds from OctopusTakopi's Network
| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| nkaz001/hftbacktest | ~2K+ | Rust/Python | Full orderbook reconstruction (L2/L3), tick-by-tick simulation |
| QuantDreamGit/HFT-LimitOrderBook | 15 | C++ | Nanosecond L3 LOB + ClickHouse ingestion at 250-400K rows/sec |
| factordynamics/preprocessors | — | Rust | Robust preprocessing for HF microstructure tick data |
| factordynamics/paracas | — | Rust | Parallelized historical tick data downloader |
| wondertrader/wondertrader | 5,900 | C++ | Full quant research & trading framework |

---

## beinghorizontal's Network

### Own Repos (expanded)
| Repo | Stars | Lang | Features |
|------|-------|------|----------|
| **tpo_project** | 130 | Python | TPO charting, POC/VAH/VAL, Initial Balance, Rotational Factor, Plotly/Dash |
| **tpo_btc** | 22 | Python | Live BTC market profile, TPO + Volume Profile modes, multi-day slider |
| **py-market-profile** (fork) | — | Python | POC, Value Area, IB, Open Range, High/Low Value Nodes, Balanced Target |

### Upstream: bfolkens/py-market-profile
- Market Profile (Volume Profile) from Pandas DataFrames
- POC, Value Area, Initial Balance, Open Range
- High/Low Value Nodes, Balanced Target
- pip installable (`marketprofile`)

### beinghorizontal follows: marketcalls
| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| openalgo | 1,500 | Python | Open source algo trading (Indian markets) |
| raptorbt | — | Rust | Backtesting engine with Python bindings |

---

## focus1691 — Account Inaccessible

focus1691's GitHub profile returned 404 on multiple endpoints. Account may be private, renamed, or deleted. The key repo **tiagosiebler/orderflow** (65★) was confirmed as the canonical footprint candle service (originally built by focus1691, now maintained by tiagosiebler).

---

## MASTER FEATURE MATRIX — All Repos Found

| Feature | Repos That Cover It |
|---------|-------------------|
| **Market Profile / TPO** | beinghorizontal/tpo_project, tpo_btc, bfolkens/py-market-profile, sagartarar/Trading (Rust-accelerated) |
| **Custom Session TPO** | beinghorizontal/tpo_project (configurable IB/session), sagartarar/Trading |
| **Heatmaps (orderbook depth)** | DegenSugarBoo/OpenBook, OctopusTakopi/binance_l3_est, nssanta/quant-order-book, ianfigueroa/TapeFlow |
| **Heatmaps (liquidation)** | ianfigueroa/TapeFlow, Senior-Architecture/Cryptocurrency-Liquidation-Heatmap |
| **Heatmaps (Hyperliquid)** | 0xSmartCrypto/hyperfootprint (SUI on Hyperliquid) |
| **Footprint charts** | tiagosiebler/orderflow, ianfigueroa/TapeFlow, 0xSmartCrypto/hyperfootprint |
| **Filtered Footprints** | tiagosiebler/chart-patterns (stacked imbalances, high volume nodes) |
| **Bucketed Trade Size Groups** | OctopusTakopi/binance_l3_est (K-Means clustering on order sizes) |
| **Volume Bubbles** | DegenSugarBoo/OpenBook (closest — Bookmap-style heatmap + trade tape), cli_ob (trade bubble markers) |
| **Aggregated CVD** | ianfigueroa/TapeFlow, nssanta/quant-order-book, 0xSmartCrypto/hyperfootprint |
| **Open Interest / Net Longs-Shorts** | ianfigueroa/TapeFlow (OI monitoring with delta tracking) |
| **VWAP Suite** | ianfigueroa/TapeFlow (session VWAP), ianfigueroa/Titan (VWAP computation) |
| **Orderbook Imbalances / DOM** | ianfigueroa/TapeFlow, nssanta/quant-order-book, VisualHFT, DegenSugarBoo/cli_ob, ianfigueroa/Titan |
| **Orderbook Depth Overlay** | nssanta/quant-order-book (depth overlaid on candlestick chart!) |
| **Custom Scripting / Community** | No open-source implementation found |
| **1s / Custom Timeframes** | tiagosiebler/orderflow (configurable intervals), nssanta/quant-order-book |

---

## NETWORK OVERLAP MAP

- **OctopusTakopi** and **DegenSugarBoo** share 12+ mutual follows (rigtorp, HarryR, folio-qnt22, prdn, sstoikov, richmanbtc)
- **DegenSugarBoo** follows nkaz001 (hftbacktest) and stars beatzxbt/mm-toolbox
- **OctopusTakopi** forked hftbacktest and market-maker-rs
- **beinghorizontal** is relatively isolated (2 follows: marketcalls, JarodMica)
- **ianfigueroa/TapeFlow** is an independent find — single most feature-complete implementation discovered

---

## KEY INSIGHTS

1. **TapeFlow is the #1 new discovery** — covers footprints, DOM, CVD, Volume Profile, OI, liquidation heatmap, VWAP, and algorithmic detection in one TypeScript project
2. **nssanta/quant-order-book has the ONLY orderbook depth overlay on candlestick chart** — fills one of our "must build" gaps
3. **sagartarar/Trading has a Rust-accelerated Market Profile engine** — 102x faster than Python, useful reference for WebAssembly port
4. **0xSmartCrypto/hyperfootprint is the ONLY Hyperliquid-specific footprint implementation**
5. **DegenSugarBoo/OpenBook is the closest to Volume Bubbles** — Bookmap-style heatmap with trade tape and bubble markers
6. **Senior-Architecture/Cryptocurrency-Liquidation-Heatmap** fills the multi-exchange liquidation gap with proper leverage-level support
