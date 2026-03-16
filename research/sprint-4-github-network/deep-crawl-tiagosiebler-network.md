# Deep Crawl: tiagosiebler GitHub Network for TradingView Alternative

**Date:** 2026-03-16
**Subject:** Comprehensive analysis of tiagosiebler's GitHub network (repos, following, stars) mapped to 26 target features for a TradingView alternative web app.

---

## 1. Profile Overview

**tiagosiebler** — "Developer, algorithmic trader, 'quant'"
- 154 public repos | 455 followers | 34 following
- Primary language: TypeScript
- Core focus: Exchange API SDKs, orderflow analysis, real-time WebSocket data

---

## 2. tiagosiebler's Own Repos (Trading-Relevant)

| Repo | Stars | Language | Description | Relevance |
|------|-------|----------|-------------|-----------|
| [binance](https://github.com/tiagosiebler/binance) | 910 | TypeScript | Node.js SDK for Binance REST APIs & WebSockets | Exchange API connectivity |
| [bybit-api](https://github.com/tiagosiebler/bybit-api) | 332 | TypeScript | Node.js SDK for Bybit APIs and WebSockets | Exchange API connectivity |
| [okx-api](https://github.com/tiagosiebler/okx-api) | 164 | TypeScript | Node.js SDK for OKX APIs and WebSockets | Exchange API connectivity |
| [orderflow](https://github.com/tiagosiebler/orderflow) | 65 | TypeScript | Footprint candle builder for 5 exchanges (NestJS+TimescaleDB) | Footprints, CVD, volume at price |
| [orderbooks](https://github.com/tiagosiebler/orderbooks) | 162 | TypeScript | Zero-dep orderbook snapshot & delta management | Orderbook management, DOM |
| [TriangularArbitrage](https://github.com/tiagosiebler/TriangularArbitrage) | 604 | JavaScript | Real-time triangular arbitrage detection on Binance via WebSockets | Real-time data processing |
| [bitget-api](https://github.com/tiagosiebler/bitget-api) | 72 | TypeScript | Node.js SDK for Bitget APIs | Exchange API connectivity |
| [ftx-api](https://github.com/tiagosiebler/ftx-api) | 121 | TypeScript | Node.js SDK for FTX APIs (archived exchange) | Exchange API patterns |
| [coinbase-api](https://github.com/tiagosiebler/coinbase-api) | 24 | TypeScript | Node.js SDK for Coinbase APIs | Exchange API connectivity |
| [gateio-api](https://github.com/tiagosiebler/gateio-api) | 18 | TypeScript | Node.js SDK for Gate.io APIs | Exchange API connectivity |
| [kucoin-api](https://github.com/tiagosiebler/kucoin-api) | 13 | TypeScript | Node.js SDK for KuCoin APIs | Exchange API connectivity |
| [bitmart-api](https://github.com/tiagosiebler/bitmart-api) | 7 | TypeScript | Node.js SDK for BitMart APIs | Exchange API connectivity |

### Key Repo Deep-Dives

#### orderflow (Footprint Candle Builder)
- **Exchanges:** Binance, Bybit, OKX, Bitget, Gate.io
- **Data:** Footprint candles showing bid/ask volume distribution per price level
- **Features:** Stacked imbalances detection, high-volume node identification, historical backfill (Binance)
- **Stack:** NestJS, TimescaleDB, RabbitMQ (optional), Docker
- **Direct feature coverage:** Aggregated Footprints, Filtered Footprints, Dual Cluster Modes (partial)

#### orderbooks (Orderbook Management)
- **Exchanges:** Exchange-agnostic (examples for Binance, Bybit)
- **Features:** Snapshot/delta processing, best bid/ask at any depth, spread calculation (basis points), slippage estimation, depth trimming
- **Zero dependencies**, minimal footprint
- **Limitations:** No imbalance calculation, no visual DOM, no aggregation by price buckets
- **Direct feature coverage:** Aggregated Orderbooks (partial), Aggregated DOM (partial)

---

## 3. Network: Followed Users with Trading-Relevant Repos

tiagosiebler follows 34 users. Below are all with trading-relevant repositories.

### JJ-Cro (Collaborator on exchange SDKs)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [accountstate](https://github.com/JJ-Cro/accountstate) | — | TypeScript | In-memory exchange account state management (balances, positions, orders, leverage) |
| [orderbooks](https://github.com/JJ-Cro/orderbooks) | — | TypeScript | Fork of tiagosiebler/orderbooks |
| binance, bybit-api, okx-api, etc. | — | TypeScript | Forks/contributions to all exchange SDKs |
| [kraken-api](https://github.com/JJ-Cro/kraken-api) | — | TypeScript | Kraken exchange SDK (adds Kraken coverage) |

**Key insight:** JJ-Cro appears to be a direct collaborator. The `accountstate` library is useful for tracking positions/PnL in real-time. The `kraken-api` adds an exchange not in tiagosiebler's set.

### CryptoGnome (Trading bots & liquidation hunting)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [Limit-Sniper](https://github.com/CryptoGnome/Limit-Sniper) | 500 | Python | Mempool sniping bot for ETH/BSC/Matic/Fantom |
| [LimitSwap](https://github.com/CryptoGnome/LimitSwap) | 277 | Python | DeFi trading bot for Uniswap/PancakeSwap |
| [Tradingview-Webhook-Bot](https://github.com/CryptoGnome/Tradingview-Webhook-Bot) | 178 | Python | Flask webhook server bridging TradingView alerts to Bybit/Binance Futures |
| [LickHunterPRO](https://github.com/CryptoGnome/LickHunterPRO) | 143 | Mixed | Liquidation hunting bot using VWAP offsets across trading pairs |
| [Bybit-Lick-Hunter-v4](https://github.com/CryptoGnome/Bybit-Lick-Hunter-v4) | 142 | JavaScript | Liquidation hunting bot for Bybit |
| [Bybit-Futures-Bot](https://github.com/CryptoGnome/Bybit-Futures-Bot) | 114 | Python | Bybit USDT Futures bot with liquidation hunting strategy |
| [DeckTrader](https://github.com/CryptoGnome/DeckTrader) | 15 | Python | Stream Deck trading tool |

**Key insight:** LickHunterPRO's liquidation detection via VWAP offsets is directly relevant to our Liquidation Heatmap feature. The TradingView webhook pattern is relevant for Custom Scripting integration.

### valamidev (Candlestick conversion & DeFi tools)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [candlestick-convert](https://github.com/valamidev/candlestick-convert) | 55 | TypeScript | OHLCV candlestick batcher/converter - custom timeframe aggregation |
| [web3-defi-honeypot-and-slippage-checker](https://github.com/valamidev/web3-defi-honeypot-and-slippage-checker) | 131 | Solidity | DeFi token analysis |

**Key insight:** `candlestick-convert` is directly applicable to Custom Time-Frames feature. Supports OHLCV arrays (CCXT format), JSON objects, tick data, and trade data with buy/sell sides. Zero dependencies, single-loop processing. Converts any integer-second interval.

### phl3x0r (VWAP & Binance data tools)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [binance-funding-rates](https://github.com/phl3x0r/binance-funding-rates) | 7 | TypeScript | Binance funding rate tracking |
| [binance-x-vwap](https://github.com/phl3x0r/binance-x-vwap) | 1 | TypeScript | VWAP calculations for Binance (Angular app, WIP) |
| [binance-futures-history](https://github.com/phl3x0r/binance-futures-history) | 4 | TypeScript | Tools for Binance historical data consolidation |
| [lick-sniper-dashboard](https://github.com/phl3x0r/lick-sniper-dashboard) | — | TypeScript | Liquidation sniper dashboard |
| [trading-evolved](https://github.com/phl3x0r/trading-evolved) | 2 | Jupyter | Trading research notebooks |
| [backtrader](https://github.com/phl3x0r/backtrader) | — | Python | Backtesting indicators |

**Key insight:** `binance-x-vwap` directly relevant to VWAP Suite. `lick-sniper-dashboard` relevant to liquidation visualization. `binance-funding-rates` useful for funding rate overlays.

### raftheunis87 (TradingView integration & multi-exchange bots)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [tradingview-alerts-processor](https://github.com/raftheunis87/tradingview-alerts-processor) | — | TypeScript | TradingView webhook processor for 6 exchanges (Binance, KuCoin, Kraken, etc.) |
| [tradingview-alerts-processor-v2](https://github.com/raftheunis87/tradingview-alerts-processor-v2) | — | TypeScript | V2 of webhook processor |
| [passivbot](https://github.com/raftheunis87/passivbot) | — | Python | Grid/DCA bot for Bybit, Binance, OKX, KuCoin, Bitget, BingX, Hyperliquid |
| [bybit-data-scraper](https://github.com/raftheunis87/bybit-data-scraper) | — | — | Bybit exchange data scraper |

**Key insight:** The TradingView alerts processor shows the webhook integration pattern useful for Custom Scripting. Passivbot's Hyperliquid support confirms viability of that exchange integration.

### ocignis (Binance trade data tools)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [tradezap](https://github.com/ocignis/tradezap) | 34 | TypeScript | CLI tool for downloading historical Binance trade data |
| [ocignis-bot](https://github.com/ocignis/ocignis-bot) | 18 | TypeScript | Binance trading bot with strategy scheduling API |
| [ocignis-fe](https://github.com/ocignis/ocignis-fe) | 4 | TypeScript | React + Material UI trading bot dashboard |

**Key insight:** `tradezap` useful for historical trade data ingestion. `ocignis-fe` is a React trading dashboard reference.

### dextertd (Bybit API & TradingView webhooks)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [tv-bybit-webhook](https://github.com/dextertd/tv-bybit-webhook) | 11 | Python | TradingView to Bybit webhook handler via AWS Lambda |
| [bybit-market-maker](https://github.com/dextertd/bybit-market-maker) | 1 | Python | Sample market maker bot for Bybit |

### mogstendev (Trading bots)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| crypto-trading-bot | 6 | JavaScript | Multi-exchange trading bot (Bitfinex, Bitmex, Binance, Bybit) |
| mm-crypto-bot-master | 4 | JavaScript | Market maker bot |

### kenchambers (MetaTrader & trading tools)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| mcp-metatrader5-server | — | Python | MetaTrader 5 MCP server for market data and trading |
| ken_gold_candle | — | Python | Trading bot for Tradelocker with backtrader |
| TriangularArbitrage | — | JavaScript | Fork of tiagosiebler's arbitrage detector |

### LikeCarpacho (Portfolio & tax tools)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| Various Binance bots | — | Mixed | Multiple Binance futures/spot trading bots |
| rotki (fork) | — | — | Portfolio tracking, analytics, accounting & tax reporting |

### bluebell136 (Quantitative trading)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| backtrader_binance | — | Python | Binance API + Backtrader for backtesting & live trading |
| qstock | — | Python | Quantitative investment package with backtesting |
| AlphaGPT | — | Python | AI-driven factor mining for financial markets |
| ta_cn | — | Python | Chinese technical indicators library |

### pegahcarter (Portfolio & technical analysis)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [rebalance](https://github.com/pegahcarter/rebalance) | 17 | JavaScript | Cryptocurrency portfolio rebalancing & backtesting (React) |
| All-Things-TA | — | Python | Technical analysis tools |

---

## 4. Starred Repos (Trading-Relevant)

| Repo | Stars | Language | Description | Relevance |
|------|-------|----------|-------------|-----------|
| [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) | 32,328 | Python | Multi-agent LLM trading framework with technical analysis (MACD, RSI, Bollinger Bands) | Community Indicators, Custom Scripting patterns |
| [ivebotunac/PrimoAgent](https://github.com/ivebotunac/PrimoAgent) | 291 | Python | Multi-agent stock analysis (SMA, RSI, MACD, Bollinger, ADX, CCI) | Technical indicator implementations |
| [jakobildstad/QuantDash](https://github.com/jakobildstad/QuantDash) | 38 | Python | Algorithmic trading backtesting platform (React+FastAPI+Plotly) | Dashboard UI patterns, interactive charting |
| [Quod-Financial/quantreplay](https://github.com/Quod-Financial/quantreplay) | 27 | C++ | Multi-asset market simulator with L2 orderbook depth, matching engine | Orderbook depth, DOM simulation, market replay |
| [its-maestro-baby/maestro](https://github.com/its-maestro-baby/maestro) | 907 | TypeScript | "Bloomberg Terminal for CLI Agents" | Terminal-style UI patterns |
| [sidequestjs/sidequest](https://github.com/sidequestjs/sidequest) | 957 | TypeScript | Scalable background job processor for Node.js | Real-time data pipeline architecture |

---

## 5. Feature Mapping Table

Mapping discovered repos to the 26 target features for our TradingView alternative.

### Charting & Visualization Features

| Feature | Relevant Repos | Coverage Level | Notes |
|---------|---------------|----------------|-------|
| **Market Profile / TPO** | None found | None | Gap - no open-source TPO implementations in network |
| **Custom Session TPO** | None found | None | Gap |
| **Hyperliquid MBO Profile** | None found | None | Gap - Hyperliquid support exists in passivbot but no MBO profile |
| **Aggregated Heatmaps** | None found | None | Gap - no heatmap rendering found |
| **HD Heatmaps** | None found | None | Gap |
| **Liquidation Heatmap** | CryptoGnome/LickHunterPRO, phl3x0r/lick-sniper-dashboard | Low | Liquidation detection logic exists but no visualization/heatmap rendering |
| **Hyperliquid Liquidation/SL/TP Heatmaps** | None found | None | Gap |
| **Aggregated Footprints** | tiagosiebler/orderflow | Medium-High | Production footprint candle builder for 5 exchanges; needs frontend rendering |
| **Filtered Footprints** | tiagosiebler/orderflow | Low | Data pipeline exists; filtering logic needs to be built |
| **Dual Cluster Modes** | tiagosiebler/orderflow | Low | Underlying data available; cluster mode logic needed |
| **Bucketed Trade Size Groups** | None found | None | Gap |
| **Aggregated CVD** | tiagosiebler/orderflow (partial) | Low | Bid/ask volume tracked per level; CVD aggregation across exchanges needed |
| **Aggregated Open Interest** | None found | None | Gap - exchange SDKs can fetch OI but no aggregation tool |
| **Net Longs/Shorts Indicator** | None found | None | Gap |
| **VWAP Suite** | phl3x0r/binance-x-vwap, CryptoGnome/LickHunterPRO (uses VWAP offsets) | Low | WIP Angular app for Binance VWAP; concept proven but incomplete |
| **Volume Bubbles** | None found | None | Gap |

### Scripting & Community Features

| Feature | Relevant Repos | Coverage Level | Notes |
|---------|---------------|----------------|-------|
| **Custom Scripting** | TauricResearch/TradingAgents, raftheunis87/tradingview-alerts-processor | Low | Agent frameworks show scripting patterns; webhook processors show alert integration |
| **Community Indicators** | ivebotunac/PrimoAgent, TauricResearch/TradingAgents | Low | Technical indicator implementations (RSI, MACD, Bollinger, etc.) as reference |

### Orderbook & DOM Features

| Feature | Relevant Repos | Coverage Level | Notes |
|---------|---------------|----------------|-------|
| **Aggregated Orderbooks** | tiagosiebler/orderbooks | Medium | Multi-symbol tracking, snapshot/delta; needs cross-exchange aggregation |
| **Aggregated DOM** | tiagosiebler/orderbooks, JJ-Cro/accountstate | Low | Basic orderbook state exists; no DOM visualization or aggregation layer |
| **Orderbook Imbalances** | tiagosiebler/orderflow (stacked imbalances) | Low | Imbalance detection in footprint context; not standalone orderbook imbalances |
| **Orderbook Depth Overlay** | Quod-Financial/quantreplay (L2 depth) | Low | L2 depth subscriptions in simulator; no overlay visualization |

### Timeframe & Data Features

| Feature | Relevant Repos | Coverage Level | Notes |
|---------|---------------|----------------|-------|
| **1s Time-Frames** | valamidev/candlestick-convert | Medium | Supports any integer-second interval including 1s; zero-dep TypeScript |
| **Custom Time-Frames** | valamidev/candlestick-convert | High | Core purpose is timeframe conversion; supports OHLCV, tick, and trade data |

### Infrastructure Features

| Feature | Relevant Repos | Coverage Level | Notes |
|---------|---------------|----------------|-------|
| **WebGL/Canvas Rendering** | None found | None | Major gap - no rendering libraries in network |
| **Real-time Data Processing** | tiagosiebler/* (all SDKs), tiagosiebler/orderflow, tiagosiebler/orderbooks, sidequestjs/sidequest | High | Excellent WebSocket infrastructure across 8+ exchanges |
| **Exchange APIs** | tiagosiebler/* (8 SDKs), JJ-Cro/kraken-api | Very High | Production-grade TypeScript SDKs for Binance, Bybit, OKX, Bitget, Coinbase, Gate.io, KuCoin, BitMart + Kraken |

---

## 6. Coverage Summary

| Coverage Level | Count | Features |
|---------------|-------|----------|
| **Very High** | 1 | Exchange APIs |
| **High** | 2 | Custom Time-Frames, Real-time Data Processing |
| **Medium-High** | 1 | Aggregated Footprints |
| **Medium** | 2 | Aggregated Orderbooks, 1s Time-Frames |
| **Low** | 8 | Liquidation Heatmap, Filtered Footprints, Dual Cluster Modes, CVD, VWAP Suite, Custom Scripting, Community Indicators, DOM, Imbalances, Depth Overlay |
| **None** | 13 | Market Profile/TPO, Custom Session TPO, Hyperliquid MBO, Aggregated Heatmaps, HD Heatmaps, Hyperliquid Liquidation Heatmaps, Bucketed Trade Size Groups, Aggregated OI, Net Longs/Shorts, Volume Bubbles, WebGL/Canvas Rendering |

---

## 7. Key Insights

### What We Can Directly Reuse

1. **Exchange SDKs (8 exchanges):** tiagosiebler's TypeScript SDKs are production-grade, well-maintained, MIT-licensed, and cover the major exchanges. These are the backbone for all real-time data features. Combined with JJ-Cro's Kraken SDK, we have 9 exchanges.

2. **Footprint Candle Pipeline:** `orderflow` provides a complete NestJS+TimescaleDB pipeline for building footprint candles from raw trade data across 5 exchanges. This is the most directly reusable component for our Aggregated Footprints feature.

3. **Orderbook State Management:** `orderbooks` handles snapshot/delta processing with zero dependencies. We can extend it for aggregation across exchanges and add imbalance calculations.

4. **Custom Timeframe Conversion:** `candlestick-convert` from valamidev is a drop-in solution for 1s and custom timeframes. Zero-dep TypeScript, supports multiple input formats.

5. **Account State Tracking:** JJ-Cro's `accountstate` provides exchange-agnostic position/balance/order tracking that could power a portfolio overlay.

### Architecture Patterns Worth Adopting

1. **WebSocket-first design:** All exchange SDKs use WebSocket streams as primary data source with REST fallback. This pattern should drive our real-time architecture.

2. **TimescaleDB for time-series:** The orderflow repo validates TimescaleDB as the right choice for storing footprint/candle/trade data at scale.

3. **NestJS service architecture:** The orderflow repo demonstrates a clean monorepo service pattern with separate apps and libraries.

4. **TradingView webhook pattern:** Multiple repos (CryptoGnome, raftheunis87, dextertd) implement TradingView alert webhook processing, validating the demand and showing integration patterns for Custom Scripting.

### Critical Gaps to Fill Externally

1. **WebGL/Canvas rendering** - Nothing in the network. Need to look at libraries like lightweight-charts, scichart, pixi.js, or d3-based solutions.

2. **Market Profile / TPO** - No implementations found. This is a niche visualization that will need custom development.

3. **Heatmap rendering** (all variants) - No heatmap visualization code found. The liquidation detection logic exists but rendering is absent.

4. **Aggregated Open Interest / Net Longs-Shorts** - Exchange SDKs can fetch this data, but no aggregation or visualization layer exists.

5. **Volume Bubbles** - No implementations found in the network.

6. **Hyperliquid-specific features** - Hyperliquid is supported by passivbot for trading, but no MBO profile, liquidation map, or SL/TP heatmap tools exist.

### Network Collaboration Potential

- **JJ-Cro** is clearly a direct collaborator (contributor to all SDKs + accountstate library). High potential for collaboration or library adoption.
- **valamidev** created a clean, reusable utility (candlestick-convert) that aligns with our needs.
- **CryptoGnome** has the most relevant liquidation-hunting logic that could inform our Liquidation Heatmap feature design.
- **phl3x0r** has started VWAP work and a liquidation dashboard that could be referenced.

### Recommended Priority for Integration

| Priority | Component | Source | Effort |
|----------|-----------|--------|--------|
| 1 | Exchange WebSocket SDKs | tiagosiebler/* | Low - npm install |
| 2 | Orderbook state management | tiagosiebler/orderbooks | Low - npm install + extend |
| 3 | Footprint candle pipeline | tiagosiebler/orderflow | Medium - deploy NestJS service |
| 4 | Custom timeframe conversion | valamidev/candlestick-convert | Low - npm install |
| 5 | Account state tracking | JJ-Cro/accountstate | Low - npm install |
| 6 | Liquidation detection logic | CryptoGnome/LickHunterPRO | Medium - extract & adapt VWAP offset logic |
| 7 | Historical trade data ingestion | ocignis/tradezap | Low - CLI tool for backfill |
| 8 | Market simulation/replay | Quod-Financial/quantreplay | High - C++ service, complex integration |

---

## 8. Complete Followed Users Audit

For completeness, here are all 34 followed accounts with relevance assessment:

| Username | Trading-Relevant Repos | Relevance |
|----------|----------------------|-----------|
| JJ-Cro | Exchange SDKs, accountstate, orderbooks | **High** |
| CryptoGnome | LickHunterPRO, Tradingview-Webhook-Bot, liquidation bots | **High** |
| valamidev | candlestick-convert | **High** |
| phl3x0r | binance-x-vwap, binance-funding-rates, lick-sniper-dashboard | **Medium** |
| raftheunis87 | tradingview-alerts-processor, passivbot, bybit-data-scraper | **Medium** |
| ocignis | tradezap, ocignis-bot, ocignis-fe | **Medium** |
| dextertd | tv-bybit-webhook, bybit-market-maker | **Medium** |
| mogstendev | crypto-trading-bot, market-maker bot | **Low** |
| kenchambers | mcp-metatrader5-server, TriangularArbitrage fork | **Low** |
| LikeCarpacho | Binance bot forks, portfolio tools | **Low** |
| bluebell136 | backtrader_binance, qstock, AlphaGPT | **Low** |
| pegahcarter | rebalance, All-Things-TA | **Low** |
| dream2672 | wallet (Flutter exchange), mexc-api-sdk | **Low** |
| 369Martin369 | Binance_robo-trading, Crypto-Tracker hardware | **Low** |
| casey-bowman | Bitcoin/Lightning tools (not trading visualization) | **None** |
| Austin-Williams | Security research | **None** |
| andrepav1 | General dev (NestJS, Deno) | **None** |
| C451 | General web dev, brain wallet | **None** |
| llSourcell | ML/AI content, ChatGPT Sports Betting Bot | **None** |
| MrKhay | Not trading-related | **None** |
| princeofcode000 | Not trading-related | **None** |
| tyrneh | Not trading-related | **None** |
| ahmet | Not trading-related | **None** |
| jamuna-r7o | Not trading-related | **None** |
| total-typescript | TypeScript education | **None** |
| H4ckd4ddy | Security | **None** |
| samyk | Security research | **None** |
| oskardudycz | Event sourcing (.NET) | **None** |
| SensorsIot | IoT/hardware | **None** |
| gdbinit | Security/reverse engineering | **None** |
| rentzsch | macOS development | **None** |
| ahbit | Binance fork, DeFi protocol forks | **None** |
| dema-trading-ai | Empty profile | **None** |

---

## 9. Conclusion

tiagosiebler's network is strongest in **exchange connectivity infrastructure** (8 production TypeScript SDKs) and **orderflow data processing** (footprint candles, orderbook management). These components can serve as the real-time data backbone for a TradingView alternative.

However, the network has significant gaps in **visualization/rendering** (no WebGL/Canvas, no heatmaps, no chart rendering), **advanced analytics** (no TPO/Market Profile, no aggregated OI, no volume bubbles), and **Hyperliquid-specific features**. These will require sourcing from outside this network or custom development.

The most actionable next step is to integrate tiagosiebler's exchange SDKs + orderflow + orderbooks as the data layer, then source visualization components from the broader open-source ecosystem (lightweight-charts, scichart, d3, pixi.js).
