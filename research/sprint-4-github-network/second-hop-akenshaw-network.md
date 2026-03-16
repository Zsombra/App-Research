# Second-Hop Spider Web: akenshaw's Network
## Date: 2026-03-16

akenshaw follows only 5 users: hecrj, Lokathor, Tucsky, robcarver17, xmatthias
Multi-hop crawl through xmatthias → ccxt/freqtrade ecosystem → HFT community

---

## MAJOR NEW DISCOVERIES

### nautechsystems/nautilus_trader (21,200 stars) — Rust/Python
**Production-grade trading engine with deterministic event-driven architecture**
- Exchange integrations: Binance, Bybit, OKX, Kraken, Interactive Brokers, Polymarket
- Handles quote tick, trade tick, bar, order book data at **nanosecond resolution**
- Order types: OCO, OUO, OTO, icebergs, post-only, reduce-only
- Rust-native with Python bindings via PyO3
- **Relevant to:** DOM/Orderbook, 1s Timeframes, Exchange integrations, Multi-exchange aggregation

### ninja-quant/ninjabook (186 stars) — Rust/Python
**Lightweight high-performance orderbook for L2 and trades data**
- Designed specifically for Level 2 orderbook processing
- Rust core with Python bindings
- **Relevant to:** DOM/Orderbook, Footprints, Heatmaps

### g-tejas/toxic-flow (12 stars) — Rust
**VPIN calculator for crypto — measures flow toxicity**
- Streams merged orderbook data via gRPC
- Volume-synchronized Probability of Informed Trading
- Binance integration, Monte Carlo simulation
- **Relevant to:** Order flow analysis, CVD-adjacent, Orderbook processing

### andrewlfc7/BFX-BSI (22 stars) — Python
**Orderflow trading bot based on Buy-Sell Imbalance**
- Directly implements order flow imbalance detection
- **Relevant to:** Footprints, Orderbook Imbalances, CVD

### andrewlfc7/funding-arb-bot (18 stars) — Python
**Cross-exchange funding rate arbitrage**
- **Relevant to:** Aggregated indicators, Open Interest, cross-exchange data

### kanekoshoyu/exchange-collection (22 stars) — Rust
**Collection of crypto exchange OpenAPI and generated clients**
- Multi-exchange API aggregation framework
- **Relevant to:** Aggregated Orderbooks, Exchange integrations

### kanekoshoyu/kucoin_arbitrage (154 stars) — Rust
**Event-driven async Rust cross-exchange framework**
- **Relevant to:** Multi-exchange aggregation, Rust infrastructure

---

## RENDERING INFRASTRUCTURE

| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| iced-rs/iced | 29,800 | Rust | GPU cross-platform GUI (powers flowsurface) |
| gfx-rs/wgpu | 16,700 | Rust | WebGPU rendering backend |
| grovesNL/glyphon | 700 | Rust | Fast text rendering for wgpu |
| JakkuSakura/gpui-plot | 55 | Rust | Plotting by HFT quant dev |

---

## EXCHANGE API ECOSYSTEM

| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| ccxt/ccxt | 41,400 | Multi | 100+ exchange unified API |
| freqtrade/freqtrade | 47,700 | Python | Trading bot, massive ecosystem |
| freqtrade/technical | 984 | Python | VWAP + indicator implementations |
| sammchardy/python-binance | 7,100 | Python | Widely-used Binance connector |
| robcarver17/pysystemtrade | 3,200 | Python | Systematic futures trading |

---

## HFT INFRASTRUCTURE (Rust)

| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| 0xDub/figgie-tournament-testnet | 13 | Rust | Matching engine with REST + WebSocket |
| 0xDub/crypto-http-protocols | 15 | Rust | Exchange server protocol monitoring |
| cyclosresearch/ring-buffers-research | 72 | Rust | Ring buffers for low-latency systems |
| hft-team/fastwebsockets-dpdk | 6 | Rust | Kernel-bypass WebSocket |
| rigtorp/SPSCQueue | 1,200 | C++ | Lock-free queue |
| rigtorp/MPMCQueue | 1,500 | C++ | Lock-free concurrent queue |

---

## Feature Coverage from This Crawl

| Target Feature | Best New Repos |
|---------------|---------------|
| DOM/Orderbook | ninjabook, nautilus_trader, toxic-flow |
| Footprints/Order Flow | BFX-BSI (BSI imbalance), toxic-flow (VPIN) |
| Exchange integrations | ccxt (100+), nautilus_trader (6 exchanges), exchange-collection |
| 1s Timeframes | nautilus_trader (nanosecond resolution) |
| VWAP | freqtrade/technical |
| Aggregated across exchanges | ccxt, exchange-collection, funding-arb-bot |
| Rendering | iced (29.8k), wgpu (16.7k), glyphon |
| Market Profile/TPO | **No repos found** — remains a gap |
