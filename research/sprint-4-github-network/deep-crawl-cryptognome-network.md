# Deep Crawl: CryptoGnome GitHub Network

**Date:** 2026-03-16
**Source:** GitHub API + WebFetch crawl of CryptoGnome and 2-hop network
**Scope:** Profile, 36 repos, 20 following, 50+ starred repos, 2nd-hop analysis of key connections

---

## 1. CryptoGnome Profile Overview

| Field | Value |
|-------|-------|
| GitHub | [github.com/CryptoGnome](https://github.com/CryptoGnome) |
| Total Public Repos | 36 |
| Focus | Crypto trading bots, liquidation hunting, DeFi, TradingView integration |
| Languages | Python, JavaScript, TypeScript, Solidity |
| Active Since | 2017 (Profit Trailer era) |
| Most Recent Work | Aster DEX lick hunters (2025), ORB miner (2025), WheelForge options (2025) |

---

## 2. All CryptoGnome Repositories

### Tier 1: High-Star Trading Repos (Core)

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [Limit-Sniper](https://github.com/CryptoGnome/Limit-Sniper) | 500 | Python | Mempool sniping bot for ETH/BSC/Matic/Fantom | Real-time data processing, Exchange APIs |
| [Profit-Trailer-Settings](https://github.com/CryptoGnome/Profit-Trailer-Settings) | 334 | - | Trading configs & strategies for Profit Trailer | Custom Scripting patterns |
| [LimitSwap](https://github.com/CryptoGnome/LimitSwap) | 277 | Python | DeFi trading bot for Uniswap/PancakeSwap | Exchange APIs (DEX) |
| [Tradingview-Webhook-Bot](https://github.com/CryptoGnome/Tradingview-Webhook-Bot) | 178 | Python | Flask webhook server bridging TradingView to Bybit/Binance | Exchange APIs, Custom Scripting |
| [LickHunterPRO](https://github.com/CryptoGnome/LickHunterPRO) | 143 | - | Liquidation hunting bot using VWAP offsets across pairs | **Liquidation Heatmap**, VWAP, Exchange APIs |
| [Bybit-Lick-Hunter-v4](https://github.com/CryptoGnome/Bybit-Lick-Hunter-v4) | 142 | JavaScript | Liquidation hunting bot for Bybit in Node.js | **Liquidation Heatmap**, Exchange APIs |
| [Gnome-Feeder](https://github.com/CryptoGnome/Gnome-Feeder) | 123 | Batchfile | Profit Trailer Feeder with strategy settings | Trading strategies reference |
| [Bybit-Futures-Bot](https://github.com/CryptoGnome/Bybit-Futures-Bot) | 114 | Python | Bybit USDT Futures bot - liquidation hunting + DCA + position control | **Liquidation Heatmap**, Exchange APIs |

### Tier 2: Mid-Star & Newer Repos

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [Community-Tools](https://github.com/CryptoGnome/Community-Tools) | 74 | JavaScript | Community-curated trading tools collection | Community Indicators Marketplace pattern |
| [Bybit-Bot](https://github.com/CryptoGnome/Bybit-Bot) | 55 | - | Open beta Bybit trading bot | Exchange APIs |
| [aster_lick_hunter_node](https://github.com/CryptoGnome/aster_lick_hunter_node) | 29 | TypeScript | Liquidation hunter for Aster DEX (Binance perp DEX) | **Liquidation Heatmap**, DEX integration |
| [aster_lick_hunter](https://github.com/CryptoGnome/aster_lick_hunter) | 27 | Python | Python version of Aster DEX lick hunter | **Liquidation Heatmap** |
| [Crypto-Tracker](https://github.com/CryptoGnome/Crypto-Tracker) | 25 | Python | Balance tracker with SQLite & Flask | - |
| [Gnome-Alerts](https://github.com/CryptoGnome/Gnome-Alerts) | 25 | - | Signal alerts for Profit Trailer | - |
| [bybit-degen-bot](https://github.com/CryptoGnome/bybit-degen-bot) | 20 | - | Automated position manager with trailing profit/stop | SL/TP Theory |
| [Bybit-TraidingView-Trader](https://github.com/CryptoGnome/Bybit-TraidingView-Trader) | 18 | - | Gmail scraper for TradingView alerts -> Bybit trades | Exchange APIs |
| [Betfury-Dicebot](https://github.com/CryptoGnome/Betfury-Dicebot) | 17 | Python | Gambling bot | - |
| [DeckTrader](https://github.com/CryptoGnome/DeckTrader) | 15 | Python | Stream Deck trading tool | UX reference |
| [Degen-Bot](https://github.com/CryptoGnome/Degen-Bot) | 14 | - | Deribit TradingView alert bot with stop loss/trailing profit | SL/TP Theory, Exchange APIs |

### Tier 3: Newer/Experimental Repos

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [TradingviewScripts](https://github.com/CryptoGnome/TradingviewScripts) | 9 | PineScript | PineScript collection for Scavenger Bot | Custom Scripting |
| [TerraCore-Smart-Contract](https://github.com/CryptoGnome/TerraCore-Smart-Contract) | 7 | JavaScript | Hive blockchain smart contracts | - |
| [Sentiment-Bot](https://github.com/CryptoGnome/Sentiment-Bot) | 7 | - | Twitter sentiment -> Bybit trading | - |
| [orb_miner](https://github.com/CryptoGnome/orb_miner) | 4 | TypeScript | Solana ORB mining bot | - |
| [WheelForge](https://github.com/CryptoGnome/WheelForge) | 3 | Python | Options Wheel strategy on Alpaca | - |
| [bybit-api-gnome](https://github.com/CryptoGnome/bybit-api-gnome) | 1 | TypeScript | Fork of tiagosiebler's bybit-api | Exchange APIs |
| [pybit-gnome](https://github.com/CryptoGnome/pybit-gnome) | 2 | Python | Fork of official pybit | Exchange APIs |

### Forked Repos of Interest

| Repo | Original | Notes |
|------|----------|-------|
| bybit-api-gnome | tiagosiebler/bybit-api | Customized Bybit Node.js SDK |
| pybit-gnome | bybit/pybit | Customized Bybit Python SDK |
| uniswap-python | uniswap-python/uniswap-python | DeFi integration |
| api-connectors | bybit-exchange/api-connectors | Bybit API libraries |

---

## 3. CryptoGnome Following List (20 users)

### Tier 1: Highly Relevant to Our Features

#### tiagosiebler
**Relevance: CRITICAL** - Exchange API SDK developer, direct collaborator with CryptoGnome

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [orderflow](https://github.com/tiagosiebler/orderflow) | 65 | TypeScript | **Crypto Exchange Orderflow Service for Footprint Candles** | **Footprints, Filtered Footprints, Orderbook Imbalances, CVD** |
| [okx-api](https://github.com/tiagosiebler/okx-api) | 163 | TypeScript | OKX Node.js SDK | Exchange APIs |
| [bitget-api](https://github.com/tiagosiebler/bitget-api) | 72 | TypeScript | Bitget Node.js SDK | Exchange APIs |
| [coinbase-api](https://github.com/tiagosiebler/coinbase-api) | 24 | TypeScript | Coinbase Node.js SDK | Exchange APIs |
| [gateio-api](https://github.com/tiagosiebler/gateio-api) | 18 | TypeScript | Gate.io Node.js SDK | Exchange APIs |
| [kucoin-api](https://github.com/tiagosiebler/kucoin-api) | 13 | TypeScript | KuCoin Node.js SDK | Exchange APIs |
| [bitmart-api](https://github.com/tiagosiebler/bitmart-api) | 7 | TypeScript | BitMart Node.js SDK | Exchange APIs |

**Key Detail on `orderflow` repo:**
- Processes real-time trade data via WebSocket to construct **Footprint Candles**
- Supports: **Binance, Bybit, OKX, Bitget, Gate.io**
- Uses PostgreSQL + TimescaleDB for time-series storage
- Companion `chart-patterns` library provides **Stacked Imbalances** and **High Volume Nodes**
- NestJS backend, TypeScript throughout
- Optional RabbitMQ for event notifications

#### hackingthemarkets (Part Time Larry)
**Relevance: HIGH** - Financial Python educator, TradingView integration specialist

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [binance-tutorials](https://github.com/hackingthemarkets/binance-tutorials) | 994 | Python | Real-time candlestick charts & trading bot using Binance API + WebSockets | Exchange APIs, Real-time data |
| [tradekit](https://github.com/hackingthemarkets/tradekit) | 704 | HTML | Server components for financial data projects & automated trading | Exchange APIs |
| [candlestick-screener](https://github.com/hackingthemarkets/candlestick-screener) | 633 | Python | Web-based technical screener for candlestick patterns | - |
| [tradingview-binance-strategy-alert-webhook](https://github.com/hackingthemarkets/tradingview-binance-strategy-alert-webhook) | 445 | Python | TradingView Strategy Alert Webhook -> Binance trades | Exchange APIs |
| [supertrend-crypto-bot](https://github.com/hackingthemarkets/supertrend-crypto-bot) | 406 | Python | Supertrend bot using ccxt | Exchange APIs |
| [interactive-brokers-web-api](https://github.com/hackingthemarkets/interactive-brokers-web-api) | 250 | HTML | Docker + Flask for IB Web API | Exchange APIs |
| [tradingview-interactive-brokers](https://github.com/hackingthemarkets/tradingview-interactive-brokers) | 194 | Python | TradingView + IB webhook integration | Exchange APIs |
| [ai-trading-agent](https://github.com/hackingthemarkets/ai-trading-agent) | 97 | Python | AI trading agent using IB API | - |

#### AlgoQ
**Relevance: HIGH** - Full-stack quant engineer, Hyperliquid specialist

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [hyperscalper](https://github.com/AlgoQ/hyperscalper) | - | TypeScript | Real-time trading terminal for **Hyperliquid DEX** with TA tools | **Hyperliquid MBO**, Exchange APIs |
| [feda](https://github.com/AlgoQ/feda) | 7 | Python | Library to fetch kline data from multiple exchanges | Exchange APIs |
| [futures-hero](https://github.com/AlgoQ/futures-hero) | 1 | Python | Leveraged trading automation on Binance | Exchange APIs |
| [paradex-rs](https://github.com/AlgoQ/paradex-rs) | - | Rust | Unofficial Rust SDK for Paradex perp DEX | Exchange APIs |
| [ta-rs](https://github.com/AlgoQ/ta-rs) | - | Rust | Technical analysis library in Rust | - |

**Key Detail on `hyperscalper`:**
- Web-based terminal for Hyperliquid DEX
- Multi-timeframe view (1m, 5m, 15m, 1h synchronized)
- Signal scanner: stochastic crossovers, EMA alignment, MACD, RSI, volume spikes
- Uses TradingView lightweight-charts
- No order flow/footprint features, but strong Hyperliquid integration reference

### Tier 2: Moderately Relevant

#### andrecronje
**Relevance: MODERATE** - DeFi pioneer (Yearn, Fantom, Solidly), 218 repos

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| Rarity | 602 | Solidity | D20 SRD reference in Solidity |
| zkftm | 96 | Solidity | Scalable decentralized applications |
| Anyswap-v1-core | 47 | Solidity | Cross-chain AMM swaps |
| 1split | 9 | Solidity | On-chain DEX aggregator (1inch fork) |
| Yearn-protocol | 8 | Solidity | Yearn smart contracts |

*Andre Cronje is the creator of Yearn Finance and other major DeFi protocols. His presence in CryptoGnome's network indicates deep DeFi connections but his repos are more relevant to smart contract architecture than trading visualization.*

#### pegahcarter
**Relevance: MODERATE** - Crypto data & TA tooling

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [TAcharts](https://github.com/pegahcarter/TAcharts) | 153 | Python | TA tools and charts with NumPy | Custom Scripting reference |
| [crypto_ohlcv](https://github.com/pegahcarter/crypto_ohlcv) | 12 | Python | Historical crypto OHLCV data saver | Custom Timeframes data |
| [rebalance](https://github.com/pegahcarter/rebalance) | 17 | JavaScript | Crypto portfolio rebalancer & backtester | - |

#### georgeburry
**Relevance: LOW-MODERATE** - Data science & trading

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| stellarbot | 1 | Python | Trading hourly klines on Stellar network |
| time-series-prediction | 7 | Jupyter | Time-series prediction and anomaly detection |
| Forked: freqtrade, hummingbot | - | - | Major open-source trading bot frameworks |

#### banteg
**Relevance: LOW** - Yearn Finance core contributor, AI agents

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| takopi | 903 | Python | AI helper agent |
| agents | 349 | Python | AI agent workflows for Codex/Claude |
| crimson | 140 | C | Game rewrite |

#### Bennch
**Relevance: MODERATE** - CryptoGnome collaborator on lick hunters

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| aster_lick_hunter_node | 0 (fork) | TypeScript | Fork of CryptoGnome's Aster lick hunter |
| Bybit-Lick-Hunter-v4 | 0 (fork) | JavaScript | Fork of CryptoGnome's Bybit lick hunter |

*Bennch appears to be a direct collaborator or community member testing CryptoGnome's liquidation bots.*

### Tier 3: Lower Relevance

| User | Notes |
|------|-------|
| **taniman** | Profit Trailer creator (786 stars) - legacy trading bot |
| **oneezy** | Web developer, not trading-related |
| **martinshkreli** | Rate limited / sparse repos |
| **JackMcKew** | Python developer, not trading-specific |
| **Psynosaur** | IoT/hardware focus, not trading |
| **ryangodlien** | Sparse profile |
| **ejeric23** | Rate limited |
| **johhonn** | Rate limited |
| **EpicVillage** | Empty/sparse |
| **stackwalk64** | Empty |
| **kappacappa** | Empty |
| **bun919tw** | Rate limited |

---

## 4. CryptoGnome Starred Repos (Trading-Relevant)

### Tier 1: Directly Relevant to Our Features

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [ccxt/ccxt](https://github.com/ccxt/ccxt) | 41,359 | Python | Crypto trading API - 100+ exchanges | **Exchange APIs** (foundation) |
| [ccxt/node-binance-api](https://github.com/ccxt/node-binance-api) | 1,662 | TypeScript | Node Binance API | Exchange APIs |
| [uniswap-python/uniswap-python](https://github.com/uniswap-python/uniswap-python) | 1,005 | Python | Unofficial Uniswap Python client | Exchange APIs (DEX) |
| [taniman/profit-trailer](https://github.com/taniman/profit-trailer) | 786 | Shell | Advanced crypto trading bot | Trading strategies |
| [alpacahq/alpaca-trade-api-python](https://github.com/alpacahq/alpaca-trade-api-python) | 1,860 | Python | Alpaca trading API Python client | Exchange APIs |
| [Taqhee/BTC_TradingBot](https://github.com/Taqhee/BTC_TradingBot) | 20 | Python | **KVO/Signal + VWAP strategies on Bitmex** | **VWAP reference**, Exchange APIs |
| [pegahcarter/crypto_ohlcv](https://github.com/pegahcarter/crypto_ohlcv) | 12 | Python | Historical OHLCV data saver | Custom Timeframes data |
| [ScavengerBot/TradingviewScripts](https://github.com/ScavengerBot/TradingviewScripts) | 47 | PineScript | PineScript collection | Custom Scripting |
| [danieltian/stream-deck-api](https://github.com/danieltian/stream-deck-api) | 79 | JavaScript | Stream Deck API for Node.js | UX reference (DeckTrader) |
| [dgnsrekt/Autochart-TV](https://github.com/dgnsrekt/Autochart-TV) | 25 | Python | TradingView + Flask + Selenium automation | - |

### Tier 2: Infrastructure & Tools

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [anomalyco/opencode](https://github.com/anomalyco/opencode) | 123,384 | TypeScript | Open source coding agent |
| [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | 30,255 | Python | Adaptive web scraping framework |
| [coollabsio/coolify](https://github.com/coollabsio/coolify) | 51,759 | PHP | Self-hosted PaaS |
| [reflex-dev/reflex](https://github.com/reflex-dev/reflex) | 28,231 | Python | Web apps in pure Python |
| [shazow/whatsabi](https://github.com/shazow/whatsabi) | 1,145 | TypeScript | Extract ABI from Ethereum bytecode |
| [brndnmtthws/thetagang](https://github.com/brndnmtthws/thetagang) | 2,486 | Python | IBKR options theta collection bot |
| [shobrook/BitVision](https://github.com/shobrook/BitVision) | 1,226 | JavaScript | Terminal-based Bitcoin trading + forecasting |
| [lovvskillz/python-discord-webhook](https://github.com/lovvskillz/python-discord-webhook) | 540 | Python | Discord webhook library |
| [mehtadone/PTFeeder](https://github.com/mehtadone/PTFeeder) | 180 | - | Profit Trailer feeder companion |
| [mehtadone/CryptoGramBot](https://github.com/mehtadone/CryptoGramBot) | 108 | C# | Telegram bot for balance updates & trade notifications |
| [PeterMalkin/oandapybot](https://github.com/PeterMalkin/oandapybot) | 175 | C | Forex trading bot on Oanda |

### Tier 3: DeFi & Blockchain

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [ARBProtocol/solana-jupiter-bot](https://github.com/ARBProtocol/solana-jupiter-bot) | 792 | JavaScript | Solana arbitrage bot using Jupiter |
| [QuarryProtocol/quarry](https://github.com/QuarryProtocol/quarry) | 229 | TypeScript | Solana liquidity mining protocol |
| [capofficial/protocol](https://github.com/capofficial/protocol) | 10 | Solidity | CAP v4 contracts |
| [regolith-labs/ore-cli](https://github.com/regolith-labs/ore-cli) | 1,505 | Rust | ORE mining CLI |

---

## 5. 2nd Hop Discoveries

### Via tiagosiebler's Following (34 users)

**Most interesting discoveries:**

#### dema-trading-ai
- Organization focused on AI-driven trading
- Limited public repos visible

#### valamidev (via tiagosiebler)
**Relevance: HIGH** - Market data infrastructure developer

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [orderbook-analysis](https://github.com/valamidev/orderbook-analysis) | 14 | TypeScript | Univariate analysis for market depth orderbooks - 30+ analytical methods including wall detection, spread calc, skewness, peak detection | **Aggregated Orderbooks, Orderbook Imbalances** |
| [orderbook-synchronizer](https://github.com/valamidev/orderbook-synchronizer) | 11 | TypeScript | Real-time orderbook snapshot sync from WebSocket | **Aggregated DOM, Real-time data** |
| [DataSynchronizer](https://github.com/valamidev/DataSynchronizer) | 73 | TypeScript | Exchange + sentiment data aggregator (archived) | Aggregated data |
| [candlestick-convert](https://github.com/valamidev/candlestick-convert) | 55 | TypeScript | OHLCV candlestick batcher/converter | **Custom Timeframes** |
| [TraderCore](https://github.com/valamidev/TraderCore) | 41 | TypeScript | Core backtesting module for crypto trading | - |
| [Arbitrage-gun](https://github.com/valamidev/Arbitrage-gun) | 26 | JavaScript | Triangle arbitrage on Binance/KuCoin | Exchange APIs |
| [evm-supernode](https://github.com/valamidev/evm-supernode) | 20 | TypeScript | EVM chain proxy/load-balancer | - |

### Via AlgoQ's Following (79 users)

**Exceptional discoveries from this 2nd hop:**

#### beatzxbt
**Relevance: HIGH** - Professional market maker

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [smm](https://github.com/beatzxbt/smm) | 598 | Python | Simple crypto market maker for Binance/Bybit/OKX | Exchange APIs, Orderbook Imbalances |
| [mm-toolbox](https://github.com/beatzxbt/mm-toolbox) | 230 | Python | **Fast MM-related functions**: HFT orderbook (fastest Python orderbook), candlestick aggregation, moving averages (EMA/HMA/WMA/SMA), WebSocket clients with latency optimization, Numba-accelerated functions | **Aggregated Orderbooks, Real-time data processing, Exchange APIs** |

**Key Detail on `mm-toolbox`:**
- Claims to be the **fastest Python orderbook implementation**
- L3 Orderbook support planned
- WebSocket clients with auto latency-swapping
- Numba JIT optimization throughout
- Discord/Telegram notification support

#### bmoscon (Bryant Moscon)
**Relevance: CRITICAL** - Core market data infrastructure

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [cryptofeed](https://github.com/bmoscon/cryptofeed) | 2,771 | Python | **Cryptocurrency Exchange WebSocket Data Feed Handler** - supports 40+ exchanges | **Exchange APIs, Real-time data processing** |
| [orderbook](https://github.com/bmoscon/orderbook) | 311 | Python/C | **Fast L2/L3 orderbook in C for Python** - 2x faster than pure Python | **Aggregated Orderbooks, Aggregated DOM** |
| [cryptostore](https://github.com/bmoscon/cryptostore) | 413 | Python | Scalable crypto data storage (Redis, MongoDB, PostgreSQL, Kafka) | Real-time data processing |

**Key Detail on `cryptofeed`:**
- **40+ exchanges** including Binance, Bybit, OKX, Coinbase, Kraken, Bitfinex, Gate.io, KuCoin
- Data types: **L1/L2/L3 orderbook, trades, funding, open interest, LIQUIDATIONS, candles, index data**
- 13+ storage backends: Redis, InfluxDB, MongoDB, PostgreSQL, Kafka, RabbitMQ, ZeroMQ, QuestDB
- **Liquidation data feed** directly relevant to our Liquidation Heatmap feature

#### nkaz001
**Relevance: CRITICAL** - HFT & market microstructure specialist

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [hftbacktest](https://github.com/nkaz001/hftbacktest) | 3,804 | Rust | HFT/MM backtesting with full tick data, **L2/L3 order book reconstruction**, queue position simulation, latency modeling | **Aggregated Orderbooks, Aggregated DOM, Footprints, Real-time data** |
| [algotrading-example](https://github.com/nkaz001/algotrading-example) | 314 | Jupyter | **Order book imbalance trading** on BitMEX/Binance | **Orderbook Imbalances** |
| [collect-binancefutures](https://github.com/nkaz001/collect-binancefutures) | 107 | Python | Binance Futures trade + depth feed collector | Real-time data, Exchange APIs |
| [data-tardis](https://github.com/nkaz001/data-tardis) | 20 | Jupyter | Market depth reconstruction & imbalance analysis | **Orderbook Imbalances, Aggregated DOM** |
| [market-making-backtest](https://github.com/nkaz001/market-making-backtest) | 80 | Jupyter | MM backtesting on BitMEX | - |

**Key Detail on `hftbacktest`:**
- Full **L2 (Market-By-Price) and L3 (Market-By-Order)** order book reconstruction
- Queue position simulation for order fill probability
- Multi-asset, multi-exchange backtesting
- Live trading for Binance Futures and Bybit (Rust)
- 3,804 stars - major open source project

#### ninja-quant
**Relevance: HIGH** - High-performance orderbook library

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [ninjabook](https://github.com/ninja-quant/ninjabook) | 186 | Rust | Lightweight high-performance L2 orderbook + trades processor | **Aggregated Orderbooks, Aggregated DOM, Real-time data** |

#### HFTrader
**Relevance: MODERATE** - Low-latency systems (ex-Citadel, ex-JP Morgan)

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| tiny-cpp-perf-stats | 63 | C++ | Performance counter framework |
| hbthreads | 52 | C++ | Coroutine-based reactor library |
| memglass | 45 | C++ | Real-time cross-process shared memory observation |

*No direct trading repos, but deep expertise in HFT infrastructure. The shared memory and coroutine libraries are relevant to high-performance data processing architecture.*

---

## 6. Deep Dive: Liquidation-Related Repos

### CryptoGnome's Liquidation Hunting Evolution

CryptoGnome has built **5 generations** of liquidation hunting bots:

1. **LickHunterPRO** (2020, 143 stars) - Original concept
   - Uses VWAP offsets across all trading pairs
   - Detects large pools of liquidity being liquidated on margin
   - Counter-trades liquidation events
   - Built with CCXT for exchange connectivity
   - Supports Binance Futures and Bybit

2. **Bybit-Futures-Bot** (2021, 114 stars, Python)
   - Bybit USDT Futures specific
   - Liquidation Hunting + Dollar Cost Averaging + Position Control
   - Uses pybit (Bybit Python SDK) with WebSocket connections
   - Full documentation at GitBook

3. **Bybit-Lick-Hunter-v4** (2022, 142 stars, JavaScript)
   - Node.js rewrite for Bybit
   - Uses tiagosiebler's bybit-api SDK
   - CryptoGnome forked bybit-api as `bybit-api-gnome` for custom modifications

4. **aster_lick_hunter** (2025, 27 stars, Python)
   - Adapted for Aster DEX (Binance's perpetual DEX)
   - Real-time liquidation monitoring
   - Paper trading mode with web dashboard
   - Default 20% stop-loss, 1% take-profit
   - Volume filters and leverage controls

5. **aster_lick_hunter_node** (2025, 29 stars, TypeScript)
   - TypeScript/Node rewrite of Aster lick hunter
   - WebSocket auto-reconnection
   - Position limits and safety mechanisms

### Liquidation Detection Strategy (VWAP Offset Method)

Based on analysis of the repos and documentation:

1. **VWAP Calculation**: The bot calculates Volume Weighted Average Price across trading pairs
2. **Offset Detection**: Identifies when price deviates significantly from VWAP (indicating liquidation cascades)
3. **Liquidity Pool Detection**: Monitors for large pools of margin positions getting liquidated
4. **Counter-Trading**: When liquidation events are detected, the bot enters opposing positions to profit from the price snap-back

### Relevance to Our Liquidation Heatmap Feature

| Aspect | CryptoGnome's Approach | Our Feature Need |
|--------|----------------------|------------------|
| Data source | Exchange WebSocket (liquidation feeds) | Same - need liquidation stream data |
| Detection method | VWAP offsets + liquidation event monitoring | We need to visualize this as a heatmap |
| Exchanges | Bybit, Binance, Aster DEX | We need multi-exchange aggregation |
| Visualization | None (bot only) | We need WebGL/Canvas heatmap rendering |
| Historical data | Not stored | We need historical liquidation data for heatmap depth |

### Other Network Repos with Liquidation Data

| Repo | Owner | Relevance |
|------|-------|-----------|
| **cryptofeed** | bmoscon | Has LIQUIDATION data type in WebSocket feeds for 40+ exchanges |
| **hftbacktest** | nkaz001 | Full order book reconstruction could detect forced liquidations |
| **orderflow** | tiagosiebler | Footprint candles could show liquidation volume clusters |
| **collect-binancefutures** | nkaz001 | Collects real-time depth/trade feeds that include liquidation data |

---

## 7. Feature Mapping: Network Repos -> Our 26 Features

| Feature | Relevant Repos from Network | Hop |
|---------|----------------------------|-----|
| **HD Heatmaps** | - | No direct match |
| **Aggregated Orderbooks** | bmoscon/orderbook, bmoscon/cryptofeed, valamidev/orderbook-analysis, ninja-quant/ninjabook, beatzxbt/mm-toolbox | 2nd hop |
| **Aggregated DOM** | bmoscon/orderbook, valamidev/orderbook-synchronizer, nkaz001/hftbacktest | 2nd hop |
| **Footprints** | **tiagosiebler/orderflow** (builds footprint candles) | 1st hop |
| **Filtered Footprints** | tiagosiebler/orderflow (stacked imbalances, high volume nodes) | 1st hop |
| **CVD** | tiagosiebler/orderflow (bid/ask volume tracking) | 1st hop |
| **Market Profile/TPO** | - | No direct match |
| **Custom Session TPO** | - | No direct match |
| **Orderbook Imbalances** | tiagosiebler/orderflow, nkaz001/algotrading-example, nkaz001/data-tardis, valamidev/orderbook-analysis | 1st + 2nd hop |
| **Liquidation Heatmap** | **CryptoGnome/LickHunterPRO**, CryptoGnome/Bybit-Futures-Bot, CryptoGnome/aster_lick_hunter_node, **bmoscon/cryptofeed** (liquidation data type) | Direct + 2nd hop |
| **Volume Bubbles** | tiagosiebler/orderflow (volume at price data) | 1st hop |
| **1s Timeframes** | bmoscon/cryptofeed (tick-level data), nkaz001/hftbacktest | 2nd hop |
| **Custom Timeframes** | valamidev/candlestick-convert, pegahcarter/crypto_ohlcv | 1st + 2nd hop |
| **Dual Cluster Modes** | - | No direct match |
| **Net Longs/Shorts** | bmoscon/cryptofeed (open interest data) | 2nd hop |
| **Aggregated OI** | bmoscon/cryptofeed (open interest feed) | 2nd hop |
| **Bucketed Trades** | tiagosiebler/orderflow, nkaz001/collect-binancefutures | 1st + 2nd hop |
| **SL/TP Theory** | CryptoGnome/bybit-degen-bot, CryptoGnome/Degen-Bot (trailing profit/SL) | Direct |
| **Custom Scripting** | CryptoGnome/TradingviewScripts (PineScript), ScavengerBot/TradingviewScripts | Direct |
| **Community Indicators** | CryptoGnome/Community-Tools (community tool collection pattern) | Direct |
| **WebGL/Canvas** | - | No direct match |
| **Exchange APIs** | tiagosiebler (7 exchange SDKs), ccxt (100+ exchanges), bmoscon/cryptofeed (40+ exchanges), hackingthemarkets/binance-tutorials | All hops |
| **Hyperliquid MBO** | AlgoQ/hyperscalper (Hyperliquid terminal) | 1st hop |
| **Real-time data** | bmoscon/cryptofeed, tiagosiebler/orderflow, nkaz001/collect-binancefutures, beatzxbt/mm-toolbox | All hops |

### Feature Coverage Summary

| Coverage Level | Count | Features |
|----------------|-------|----------|
| **Strong match (code exists)** | 12 | Aggregated Orderbooks, Aggregated DOM, Footprints, Filtered Footprints, CVD, Orderbook Imbalances, Liquidation Heatmap, Custom Timeframes, Exchange APIs, Hyperliquid MBO, Real-time data, Bucketed Trades |
| **Partial match (data available)** | 6 | Volume Bubbles, 1s Timeframes, Net Longs/Shorts, Aggregated OI, SL/TP Theory, Custom Scripting |
| **Pattern reference only** | 1 | Community Indicators Marketplace |
| **No match in network** | 7 | HD Heatmaps, Market Profile/TPO, Custom Session TPO, Dual Cluster Modes, WebGL/Canvas rendering |

---

## 8. Summary: Most Valuable Finds

### Top 5 Most Valuable Repos from This Crawl

1. **tiagosiebler/orderflow** (65 stars, TypeScript) - 1st hop
   - Directly builds footprint candles from exchange WebSocket data
   - Supports 5 exchanges, has stacked imbalance detection
   - **Best reference for our Footprint, CVD, and Orderbook Imbalance features**

2. **bmoscon/cryptofeed** (2,771 stars, Python) - 2nd hop via AlgoQ
   - 40+ exchange WebSocket handler with **liquidation data type**
   - 13+ storage backends
   - **Best reference for our multi-exchange data aggregation layer**

3. **nkaz001/hftbacktest** (3,804 stars, Rust) - 2nd hop via AlgoQ
   - Full L2/L3 order book reconstruction
   - Queue position and latency modeling
   - **Best reference for order book depth and MBO processing**

4. **beatzxbt/mm-toolbox** (230 stars, Python) - 2nd hop via AlgoQ
   - Fastest Python orderbook, Numba-accelerated
   - WebSocket clients with latency optimization
   - **Best reference for high-performance orderbook processing**

5. **CryptoGnome/LickHunterPRO + aster_lick_hunter_node** (143+29 stars) - Direct
   - 5 generations of liquidation detection via VWAP offsets
   - Real-time liquidation monitoring with counter-trading
   - **Best reference for our Liquidation Heatmap detection logic**

### Top 5 Most Valuable People to Watch

1. **tiagosiebler** - Exchange API SDK maintainer, orderflow service builder. Direct CryptoGnome collaborator.
2. **bmoscon** - Core market data infrastructure (cryptofeed, orderbook, cryptostore). Foundation-level tools.
3. **nkaz001** - HFT backtesting with order book reconstruction. Academic rigor + practical implementation.
4. **beatzxbt** - Professional market maker with high-performance open source tooling.
5. **AlgoQ** - Quant engineer with Hyperliquid integration. Gateway to the broader quant network.

### Key Network Insight

CryptoGnome's network forms a clear pipeline:
```
CryptoGnome (liquidation detection strategy)
    -> tiagosiebler (exchange SDKs + orderflow service)
        -> AlgoQ (quant engineering + Hyperliquid)
            -> beatzxbt (market making infrastructure)
            -> bmoscon (data feed infrastructure)
            -> nkaz001 (HFT backtesting + order book reconstruction)
            -> ninja-quant (high-perf orderbook in Rust)
        -> valamidev (orderbook analysis + sync)
```

The **2nd hop via AlgoQ** was the most productive, yielding 4 of the top 5 most valuable repos. This suggests CryptoGnome's direct network is more focused on bot execution, while the deeper network provides the data infrastructure and analysis tools we need for visualization features.

### Gaps Identified

These features have **no coverage** in CryptoGnome's network and will need to be sourced elsewhere:
- **HD Heatmaps** (WebGL rendering of price/volume data)
- **Market Profile/TPO** and **Custom Session TPO**
- **Dual Cluster Modes**
- **WebGL/Canvas rendering** (no visualization-focused repos in this network)

These gaps suggest we need to explore networks focused on **financial data visualization** rather than **trading bot execution**, which is CryptoGnome's primary domain.
