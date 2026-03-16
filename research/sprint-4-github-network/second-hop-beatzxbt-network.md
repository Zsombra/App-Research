# Second-Hop Spider Web: beatzxbt's Network
## Date: 2026-03-16

beatzxbt follows 17 users. Multi-hop crawl through HFT/market-making community.
**37 new repos discovered, 7 high-priority for our project.**

---

## TOP NEW DISCOVERIES

### OctopusTakopi — Rust HFT Developer (89 followers)

| Repo | Stars | Lang | What It Does |
|------|-------|------|-------------|
| **binance_l3_est** | 208 | Rust | **L3 orderbook reconstruction from L2 data. Real-time heatmap visualization, whale detection, TWAP detection, participant clustering via K-Means. Spoofing detection.** |
| **glass-rs** | 24 | Rust | **Ultra-fast orderbook data structure (radix trie), 24x faster than BTreeMap** |
| **order_book_server** | 0 | Rust | **Hyperliquid L2/L4 book data WebSocket server with incremental diffs** |
| **sstoikov_microprice** | 1 | Rust | Stoikov microprice model |
| **binance-sbe-rust-sample-app** | 1 | Rust | Binance SBE (Simple Binary Encoding) decoder |
| **wrls** | 15 | Rust | Weighted Recursive Least Squares adaptive filter |

**Relevant to:** DOM/Orderbook, Heatmaps, Footprints, Hyperliquid MBO

### VisualHFT (1,100 stars) — C#
**Real-time market microstructure visualization**
- LOB depth, trade flow, VPIN, LOB Imbalance, Market Resilience
- Plugin architecture for Binance, Bitfinex, Coinbase, Kraken, KuCoin, Gemini, Bitstamp
- **Closest existing open-source project to what we're building**
- **Relevant to:** DOM/Orderbook, Order flow, CVD, Orderbook Imbalances

### crypto-crawler/crypto-crawler-rs (260 stars) — Rust
**Multi-exchange cryptocurrency data crawler library**
- Rock-solid multi-exchange data collection
- **Relevant to:** Aggregated data, Exchange integrations

| Related Repo | Stars | Purpose |
|-------------|-------|---------|
| carbonbot | 73 | CLI data collector |
| crypto-msg-parser | 12 | Exchange message format parser |
| FundingRate | 10 | Perpetual funding rates every 2h |
| coinsignal | 16 | Trading indicators calculator |

### 0xDub — "Crypto HFT | Journey to sub micro tick-to-trade"

| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| figgie-tournament-testnet | 13 | Rust | Matching engine with REST + WebSocket |
| crypto-http-protocols | 15 | Rust | Exchange server protocol monitoring |
| kernel-tuning-base | 28 | Rust | Network latency optimization |
| rust-channel-benchmark | 32 | Rust | IPC channel benchmarks |

---

## EXCHANGE INTEGRATION DISCOVERIES

### Nayshins
| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| **dex-rs** | 12 | Rust | Rust SDK for Perpetual Futures DEXes, starting with Hyperliquid |
| **mcp-server-ccxt** | 62 | Python | CCXT-based market data MCP server |

### LevBeta (deeper look)
| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| **ferrofluid** | 0 | Rust | High-perf Hyperliquid SDK (simd-json, fastwebsockets, zero-copy) |
| **miabook** | 16 | Rust | Orderbook implementation |
| **Agil** | 21 | Rust | HFT/MFT trading framework (evolved from Barter-Data) |

### kanekoshoyu
| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| **exchange-collection** | 22 | Rust | OpenAPI specs for 13+ exchanges with auto-generated clients |
| **guilder** | 5 | Rust | Cross-exchange trading framework |
| **kucoin_arbitrage** | 154 | Rust | Async Rust arbitrage bot |

---

## ORDER FLOW & ANALYSIS

| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| g-tejas/toxic-flow | 12 | Rust | VPIN calculator + gRPC orderbook stream |
| andrewlfc7/BFX-BSI | 22 | Python | Multi-exchange orderflow BSI bot |
| andrewlfc7/funding-arb-bot | 18 | Python | Cross-exchange funding rate scanner |
| ninja-quant/ninjabook | 186 | Rust | High-perf L2 orderbook + trades processor |

---

## LOW-LATENCY INFRASTRUCTURE

| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| rigtorp/SPSCQueue | 1,200 | C++ | Lock-free single-producer queue |
| rigtorp/MPMCQueue | 1,500 | C++ | Lock-free multi-producer queue |
| cyclosresearch/ring-buffers-research | 72 | Rust | HFT ring buffer designs |
| QuantDreamGit/HFT-LimitOrderBook | 15 | C++ | Nanosecond LOB + ClickHouse ingestion |
| hft-team/fastwebsockets-dpdk | 6 | Rust | Kernel-bypass WebSocket |
| wondertrader/wondertrader | 5,900 | C++ | All-in-one quant framework |

---

## FEATURE MAPPING

| Target Feature | Best NEW Repos |
|---------------|---------------|
| **DOM/Orderbook** | binance_l3_est, glass-rs, ninjabook, VisualHFT, miabook, HFT-LimitOrderBook |
| **Heatmaps** | binance_l3_est (built-in liquidity heatmap!) |
| **Footprints/Order Flow** | BFX-BSI, toxic-flow (VPIN), VisualHFT |
| **CVD** | VisualHFT (trade flow), BFX-BSI |
| **Orderbook Imbalances** | VisualHFT (LOB Imbalance indicator) |
| **Hyperliquid** | order_book_server (L2/L4), ferrofluid (SDK), dex-rs (SDK) |
| **Aggregated Data** | crypto-crawler-rs (multi-exchange), exchange-collection (13+ APIs) |
| **Open Interest/Funding** | FundingRate, funding-arb-bot |
| **Market Profile/TPO** | **Still no repos found** |
| **VWAP** | coinsignal (indicator framework) |
| **Volume Bubbles** | **No repos found** |
| **Liquidation Heatmap** | **No new repos** |

---

## TOP 7 RECOMMENDATIONS

1. **VisualHFT** (1,100 stars) — Closest OSS to our target (LOB viz, VPIN, multi-exchange plugins)
2. **binance_l3_est** (208 stars) — Working heatmap + L3 reconstruction, study visualization approach
3. **ninjabook** (186 stars) — Production-grade L2/trades processor for data backend
4. **crypto-crawler-rs** (260 stars) — Best multi-exchange data crawler for aggregated feeds
5. **exchange-collection** (22 stars) — Standardized API specs for 13+ exchanges
6. **glass-rs** (24 stars) — Fast orderbook data structure for rendering
7. **toxic-flow** (12 stars) — Working VPIN implementation
