# Second-Hop Spider Web: liihuu, MattMaximo, azidyn, LevBeta Networks
## Date: 2026-03-16

59 unique users checked, 5 third-hop expansions, ~25 additional users at third hop.
**azidyn's network is the most valuable — nearly every follow is trading-related.**

---

## CRITICAL NEW DISCOVERIES

### beinghorizontal/tpo_project (130 stars) — Python
**ONLY open-source TPO/Market Profile implementation found in ALL research**
- TPO calculation and visualization: POC, VAH, Initial Balance, Rotational Factor
- Interactive Dash/Plotly charts, live and static modes
- Also has py-market-profile fork (67 stars) for Volume Profile
- **FILLS THE BIGGEST GAP in our research — Market Profile/TPO**

### tiagosiebler/orderflow (65 stars) — TypeScript/NestJS
**Production-ready footprint candle builder for 5 exchanges**
- Binance, Bybit, OKX, Bitget, Gate.io
- Real-time WebSocket trade ingestion
- PostgreSQL + TimescaleDB storage
- Stacked imbalance detection, high volume node identification
- RabbitMQ event distribution
- **SUPERIOR to focus1691/orderflow for production use**
- **Relevant to:** Footprints, CVD, Aggregated Footprints

### tiagosiebler/orderbooks (162 stars) — TypeScript
**Zero-dependency orderbook management**
- Snapshot + delta processing, multi-symbol tracking
- Bid-ask spread in bps
- **Relevant to:** DOM/Orderbook, Aggregated Orderbooks

### tiagosiebler Exchange SDK Suite (7 SDKs, 1,533 total stars)
| SDK | Stars | Exchange |
|-----|-------|----------|
| tiagosiebler/binance | 910 | Binance |
| tiagosiebler/bybit-api | 332 | Bybit |
| tiagosiebler/okx-api | 164 | OKX |
| tiagosiebler/bitget-api | 72 | Bitget |
| tiagosiebler/coinbase-api | 24 | Coinbase |
| tiagosiebler/gateio-api | 18 | Gate.io |
| tiagosiebler/kucoin-api | 13 | KuCoin |

All TypeScript with **browser support** — better for web app than ccxt.

### barter-rs/barter-rs (2,000 stars) — Rust
**Event-driven live-trading AND backtesting framework**
- Production-grade, deterministic architecture
- Found via just-a-stream in LevBeta's network

### cryptofeed/cryptofeed (2,800 stars) — Python
**Multi-exchange WebSocket feed handler**
- Normalized callbacks, backend persistence (Postgres, InfluxDB, Redis, Kafka)
- Synthetic NBBO (National Best Bid/Offer) feed
- Alternative to ccxt for real-time data

---

## RENDERING INFRASTRUCTURE

### From liihuu's network:
| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| ecomfe/zrender | 6,300 | TypeScript | 2D Canvas rendering engine (powers ECharts) |
| pissang/claygl | 2,900 | JavaScript | WebGL graphics library |
| apache/echarts | 65,900 | TypeScript | Charting with candlestick, heatmap, custom series |

---

## AZIDYN'S OWN REPOS (all new)

| Repo | Stars | Purpose |
|------|-------|---------|
| azidyn/socket2em | 8 | WebSocket exchange data normalization |
| azidyn/corr | 9 | Live crypto correlation matrix |
| azidyn/larptrader | 44 | No-DB backtesting + live trading |
| azidyn/mextick | 23 | Trade data → tick + candle aggregation |
| azidyn/lob | 5 | Limit order book in O(log n) |
| azidyn/mexaggonal | 5 | Realtime WS price aggregation |

---

## OTHER NOTABLE FINDS

| Repo | Stars | Lang | Purpose |
|------|-------|------|---------|
| yutiansut/QUANTAXIS | 10,100 | Python | Full quant platform with L2/tick data, Rust core |
| rotki/rotki | 3,700 | Python/Vue | Privacy-focused portfolio tracking, 70+ integrations |
| marketcalls/openalgo | 1,500 | Python | Open source algo trading, 20+ broker integrations |
| warproxxx/poly-maker | 939 | Python | Polymarket market making |
| valamidev/candlestick-convert | 55 | TypeScript | OHLCV batcher with **1s base interval support** |
| valamidev/DataSynchronizer | 73 | TypeScript | Exchange + sentiment data fetcher |

---

## FEATURE MAPPING — GAPS FILLED

| Target Feature | Status | Best New Repo |
|---------------|--------|--------------|
| **Market Profile / TPO** | **GAP FILLED** | beinghorizontal/tpo_project (130 stars) |
| **Footprints** | **UPGRADED** | tiagosiebler/orderflow (production NestJS+TimescaleDB) |
| **DOM/Orderbook** | **EXPANDED** | tiagosiebler/orderbooks (162 stars, zero-dep TS) |
| **1s Timeframes** | **NEW TOOL** | valamidev/candlestick-convert (1s base support) |
| **Aggregated Data** | **EXPANDED** | tiagosiebler 7-SDK suite (TypeScript, browser-ready) |
| **Rendering** | **NEW OPTIONS** | ZRender (6.3k), ClayGL (2.9k) |
| **Heatmaps** | No new finds | flowsurface + cryexc remain best |
| **Liquidation Heatmap** | No new finds | Hyperliquid tooling remains best |
| **Volume Bubbles** | **STILL NO OSS** | Still no open-source reference |
| **VWAP** | No dedicated repo | Standard calculation |
| **Net Longs/Shorts** | No new finds | Hyperliquid position data |

---

## KEY NETWORK INSIGHTS

1. **azidyn is the best-connected user** — follows tiagosiebler, warproxxx, beinghorizontal, askmike, prdn (Bitfinex CTO), trading-peter
2. **tiagosiebler/orderflow is the single most important new find** — production-ready footprint service for 5 exchanges
3. **beinghorizontal/tpo_project fills the biggest gap** — Market Profile/TPO was the ONLY feature with zero open-source refs until now
4. **Two SDK strategies:** ccxt (100+ exchanges, multi-language) vs tiagosiebler suite (7 focused TypeScript SDKs with browser support) — tiagosiebler may be better for web app
