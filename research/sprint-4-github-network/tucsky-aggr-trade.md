# Tucsky / aggr.trade Research
## Date: 2026-03-16

---

## Overview
**User:** Tucsky (France) — "Javascript ninja", 389 followers
**Main Project:** aggr.trade — cryptocurrency trades aggregator (1,092 stars)

---

## Repository Ecosystem

| Repo | Stars | Description |
|------|-------|-------------|
| **aggr** | 1,092 | Main frontend — Vue.js trade aggregator |
| **aggr-server** | 203 | Server-side trade collection, InfluxDB storage, resampling |
| **aggr-lib** | 49 | Community-contributed indicators, panes, workspaces |
| **aggr-binaries** | — | CLI tool for trade archive indexing + candle binaries |
| **aggr-tv-extension** | 17 | Browser extension bridging aggr widgets into TradingView |
| **aggr-lib-server** | — | Backend serving community scripts |
| **lightweight-charts** (fork) | 2 | Custom fork of TradingView's lightweight-charts |
| **SignificantTrades** (archived) | 629 | Original predecessor project |

---

## Tech Stack (AGGR Frontend)

| Layer | Technology |
|-------|-----------|
| Framework | Vue 2.7 + Vuex 3, class-based components |
| Language | TypeScript (~46%) + Vue (~48%) + SCSS (~5%) |
| Charting | Custom fork of TradingView `lightweight-charts` (HTML5 Canvas) |
| Code Editor | Monaco Editor (user-written indicator scripts) |
| Build | Vite 4 |
| Workers | Web Workers via vite-plugin-comlink — one worker per exchange |
| Storage | IndexedDB via Dexie + idb; protobufjs + pako for compressed data |
| Layout | vue-grid-layout (draggable/resizable dashboard panes) |
| Audio | TunaJS for dynamic trade audio alerts |
| PWA | vite-plugin-pwa |
| License | GPL v3 |

## Tech Stack (AGGR Server)

- **Runtime:** Node.js
- **Database:** InfluxDB v1.8.X (optional; file-based storage as default)
- **Architecture:** Cluster mode — separate collector and API nodes
- **Deployment:** Docker Compose

---

## Supported Exchanges (27!)

Binance (spot), Binance Futures, Binance US, Bitfinex, Bitget, BitMart, BitMEX, Bitstamp, Bitunix, Bybit, Coinbase, Crypto.com, Deribit, dYdX, Gate.io, HitBTC, Huobi, **Hyperliquid**, Kraken, KuCoin, MEXC, OKEx, Phemex, Poloniex, WhiteBit

---

## Feature Support Matrix

| Feature | Supported? | Details |
|---------|-----------|---------|
| **CVD** | YES | Built-in default indicator. Cumulative buy-sell volume delta |
| **Volume Delta** | YES | Default histogram. Every bar tracks `vbuy` and `vsell` |
| **Liquidations** | YES | Built-in histogram + dedicated "REKTS" pane. Parses `forceOrder` |
| **Custom Scripting** | YES | Monaco Editor embedded. Community indicators via aggr-lib |
| **Audio Alerts** | YES | Dynamic audio based on trade size thresholds |
| **Multi-exchange Aggregation** | YES | Central aggregator merges across all subscribed markets |
| Footprint Charts | **NO** | Not implemented |
| Heatmaps | **NO** | No orderbook depth data ingested |
| Market Profile / TPO | **NO** | Not present |
| DOM / Orderbook | **NO** | Only emits `trades` and `liquidations`, no L2 data |
| Open Interest | **NO** | Not tracked |
| Volume Profile | **NO** | Not built-in |

---

## Real-Time Data Aggregation Architecture (KEY REFERENCE)

This is the most mature aggregation architecture found in any open-source project:

1. **Web Workers per exchange** — Each exchange connection runs in a dedicated Web Worker (non-blocking UI)
2. **WebSocket connections** — Direct to exchange APIs, no intermediary server for live data
3. **Aggregator** — Central `aggregator.ts` in worker thread groups trades by time window, market, side
4. **Bar structure** — Each bar aggregates: `open, high, low, close, vbuy, vsell, cbuy, csell, lbuy, lsell`
5. **Renderer types** — Time-based, tick-based, basis-points-based, and volume-based bar construction
6. **Multi-source merging** — Renderer maintains primary `bar` + `sources` object with per-market bars
7. **Historical data** — Separate aggr-server instance (InfluxDB) resamples on demand

---

## Starred Repos of Interest

| Repo | Stars | Relevance |
|------|-------|-----------|
| **tradingview/lightweight-charts** | 14,021 | Charting engine aggr is built on |
| **tvjsx/trading-vue-js** | 2,273 | Alternative Vue.js trader charting lib |
| **perspective-dev/perspective** | 10,393 | High-perf streaming data viz (C++/WASM) |
| **jbaysolutions/vue-grid-layout** | 7,414 | Dashboard layout (used by aggr) |
| **azidyn/socket2em** | 8 | WebSocket crypto exchange feed normalization |

---

## Key Gaps = Our Differentiation Opportunities

1. **Orderbook / DOM visualization** — aggr does NOT ingest L2 data at all
2. **Heatmap (orderbook depth)** — requires L2 data ingestion
3. **Footprint / Cluster charts** — requires tick-level price-at-volume bucketing
4. **Market Profile / TPO** — requires time-at-price computation
5. **Open Interest tracking** — requires separate API polling
6. **Volume Profile** — not built in
7. **Multi-asset class** — aggr is crypto-only

## What We Can Learn From aggr:
- Web Worker per exchange pattern is excellent for non-blocking aggregation
- Custom fork of lightweight-charts for Canvas rendering
- Monaco Editor integration for custom scripting
- IndexedDB + protobuf for compressed local storage
- InfluxDB for time-series trade storage on the server
- Vue grid layout for customizable dashboard
- PWA support for offline capability
