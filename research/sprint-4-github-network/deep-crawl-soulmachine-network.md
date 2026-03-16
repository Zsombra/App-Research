# Deep Crawl: soulmachine (Frank Dai) GitHub Network

**Date:** 2026-03-16
**Crawl depth:** 2 hops from soulmachine
**Source:** Found via OctopusTakopi's following list; also the GitHub org "crypto-crawler"

---

## 1. Profile Overview

| Field | Value |
|-------|-------|
| **Username** | [soulmachine](https://github.com/soulmachine) |
| **Real Name** | Frank Dai |
| **Bio** | "I test in prod" |
| **Company** | Google |
| **Location** | Santa Clara, CA |
| **Twitter** | [@soulmachine](https://twitter.com/soulmachine) |
| **Repos** | 174 |
| **Followers** | 3,900+ |
| **Following** | 120 |
| **Achievements** | Starstruck x4, Arctic Code Vault Contributor, Pull Shark x2 |

**Profile Summary:** Senior engineer at Google who runs a significant crypto data infrastructure side project. The crypto-crawler ecosystem is his primary trading-relevant work - a production-grade multi-exchange data pipeline in Rust with TypeScript/Python/C++ bindings. Also has notable non-crypto repos (leetcode: 11.3k stars, machine-learning-cheat-sheet: 8k stars).

---

## 2. All Repositories (Trading-Relevant)

### Tier 1: Core Crypto Infrastructure (via crypto-crawler org)

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [crypto-crawler-rs](https://github.com/crypto-crawler/crypto-crawler-rs) | 260 | Rust | Rock-solid cryptocurrency crawler library | **Exchange APIs, Real-time data processing** |
| [carbonbot](https://github.com/crypto-crawler/carbonbot) | 73 | Rust | CLI tool for crypto data crawling | **Exchange APIs, Real-time data processing** |
| [crypto-crawlers](https://github.com/crypto-crawler/crypto-crawlers) | 54 | TypeScript | All-in-one exchange data crawler (archived, replaced by Rust) | Exchange APIs |
| [coinsignal](https://github.com/crypto-crawler/coinsignal) | 16 | Rust/Go/JS | Trading signal indicators with Grafana dashboard | **CVD, Custom Scripting, Community Indicators** |
| [crypto-msg-parser](https://github.com/crypto-crawler/crypto-msg-parser) | 12 | Rust | Parser for exchange websocket messages | **Real-time data processing** |
| [crypto-crawler-ts](https://github.com/crypto-crawler/crypto-crawler-ts) | 11 | TypeScript | TypeScript crawler (deprecated for Rust) | Exchange APIs |
| [FundingRate](https://github.com/crypto-crawler/FundingRate) | 10 | JavaScript | Perpetual funding rate collection every 2h | **Net Longs/Shorts** |
| [coinmarketcap-crawler](https://github.com/crypto-crawler/coinmarketcap-crawler) | 9 | Python | CoinMarketCap data scraper | Exchange APIs |
| [crypto-market-raw-data](https://github.com/crypto-crawler/crypto-market-raw-data) | 19 | Python | Daily market data crawling | Exchange APIs |
| [crypto-market-metadata](https://github.com/crypto-crawler/crypto-market-metadata) | 5 | Rust | Exchange market metadata scraper | Exchange APIs |
| [bloxroute-go](https://github.com/crypto-crawler/bloxroute-go) | 5 | Go | bloXroute websocket client | Real-time data processing |
| [fullnode-benchmarks](https://github.com/crypto-crawler/fullnode-benchmarks) | 6 | Jupyter | Fullnode performance comparison | Infrastructure |

### Tier 2: soulmachine Personal Crypto Repos

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [crypto-notebooks](https://github.com/soulmachine/crypto-notebooks) | 104 | Jupyter | Crypto analysis notebooks (analysis, backtest, bars, models, strategies) | **Footprints, CVD, Bucketed Trades** |
| [Funding_rate_strategy_monitoring_system](https://github.com/soulmachine/Funding_rate_strategy_monitoring_system) | 0 | Python | Real-time Binance funding rate monitor with Streamlit UI | **Net Longs/Shorts, Aggregated OI** |
| [FlowTrack-Crypto](https://github.com/soulmachine/FlowTrack-Crypto) | 1 | Python | Binance capital flow analysis, order book analysis, anomaly detection | **Aggregated Orderbooks, Orderbook Imbalances, Volume Bubbles** |
| [MacroNews_Analyzer](https://github.com/soulmachine/MacroNews_Analyzer) | 0 | Python | AI-powered macro news market impact analysis (DeepSeek API) | Custom Scripting |
| [stock-crawler](https://github.com/soulmachine/stock-crawler) | 4 | Jupyter | US stocks daily OHLCV data crawler | Exchange APIs |
| [oracle-feeder-go](https://github.com/soulmachine/oracle-feeder-go) | 0 | Go | Terra oracle feeder daemon for price feeds | Real-time data processing |
| [crypto-notebooks1](https://github.com/soulmachine/crypto-notebooks1) | 1 | Jupyter | Additional crypto analysis notebooks | Analysis |
| [GasPrice](https://github.com/soulmachine/GasPrice) | 3 | Python | ETH gas price tool (archived) | Infrastructure |

### Tier 3: Tangentially Relevant

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [reth](https://github.com/soulmachine/reth) | fork | Rust | Ethereum protocol implementation |
| [delimited-protobuf-rs](https://github.com/soulmachine/delimited-protobuf-rs) | 0 | Rust | Length-delimited protobuf (data serialization) |
| [cake_sniper](https://github.com/soulmachine/cake_sniper) | fork | Go | EVM frontrunning tool (forked from Supercycled) |
| [qlib](https://github.com/soulmachine/qlib) | fork | Python | Microsoft's AI quant investment platform |
| [many_abis](https://github.com/soulmachine/many_abis) | 2 | Python | DEX ABI collection for blockchain devs |
| [defi-abigen](https://github.com/soulmachine/defi-abigen) | fork | Go | Pre-generated DeFi contract code |
| [go-blocknative](https://github.com/soulmachine/go-blocknative) | 1 | Go | Blocknative API client |

### Non-Trading Notable Repos

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| leetcode | 11,343 | TeX | LeetCode solutions |
| machine-learning-cheat-sheet | 8,013 | TeX | ML equations and diagrams |
| system-design | 1,366 | - | System design interview questions |
| algorithm-essentials | 786 | JavaScript | Algorithm implementations |
| acm-cheat-sheet | 1,726 | TeX | ACM programming competition cheat sheet |

---

## 3. crypto-crawler Organization - Full Analysis

**Organization:** [crypto-crawler](https://github.com/crypto-crawler) (42 repositories)

This is soulmachine's most significant trading infrastructure contribution. The ecosystem provides a complete pipeline for cryptocurrency market data:

### Architecture

```
Exchange WebSockets/REST APIs
        |
  crypto-crawler-rs (core crawler, Rust)
        |
  crypto-msg-parser (message parsing, Rust)
        |
  carbonbot (CLI orchestration)
        |
  coinsignal (indicator calculation)
        |
  InfluxDB + Grafana (visualization)
```

### Complete Org Repo List

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| crypto-crawler-rs | 260 | Rust | Core crawler library |
| carbonbot | 73 | Rust | CLI data crawling tool |
| crypto-crawlers | 54 | TypeScript | Legacy all-in-one crawler (archived) |
| crypto-market-raw-data | 19 | Python | Daily market data |
| coinsignal | 16 | Rust | Trading indicators |
| crypto-msg-parser | 12 | Rust | Message parser |
| crypto-crawler-ts | 11 | TypeScript | TypeScript crawler (deprecated) |
| FundingRate | 10 | JavaScript | Funding rate collection |
| coinmarketcap-crawler | 9 | Python | CMC scraper |
| fullnode-benchmarks | 6 | Jupyter | Node benchmarks |
| bloxroute-go | 5 | Go | bloXroute client |
| crypto-market-metadata | 5 | Rust | Market metadata |
| crypto-crawler-py | 4 | Python | Python bindings |
| historical-data-downloader | 3 | Python | Historical data scripts |
| crypto-msg-parser-py | 3 | Python | Parser Python bindings |
| crypto-cli-tools | 2 | Rust | CLI processing tools |
| rotating-file | 2 | Rust | Rotating file writer |
| crypto-crawler-workflow | 2 | - | Workflow configs |
| crypto-crawler-ffi | 2 | Rust | FFI bindings |
| crypto-crawler-cpp | 2 | C++ | C++ bindings |
| bitstamp-insights | 2 | Python | Bitstamp data scraper |
| cmc-global-metrics | 2 | Go | CMC global metrics |
| crypto-indicators | 1 | TypeScript | Indicators (archived) |
| crypto-markets-py | 1 | Python | Python market bindings |
| crypto-msg-parser-cpp | 1 | C++ | Parser C++ bindings |
| carbonbot-misc | 1 | Go | Misc data crawler |
| crypto-pair-py | 0 | Python | Pair Python bindings |
| crypto-pair-ffi | 0 | Rust | Pair FFI bindings |
| crypto-markets-ffi | 0 | Rust | Markets FFI bindings |
| crypto-msg-parser-ffi | 0 | Rust | Parser FFI bindings |
| crypto-contract-value-py | 0 | Python | Contract value Python bindings |

### Feature Mapping for crypto-crawler Ecosystem

| Feature | Relevant Component | How It Helps |
|---------|--------------------|--------------|
| **Exchange APIs** | crypto-crawler-rs, crypto-ws-client, crypto-rest-client | Multi-exchange websocket and REST connections |
| **Real-time data processing** | crypto-crawler-rs, crypto-msg-parser | Raw message ingestion and parsing pipeline |
| **Aggregated Orderbooks** | crypto-crawler-rs (orderbook crawling) | Multi-exchange orderbook data collection |
| **1s Timeframes** | carbonbot (continuous crawling) | Sub-second data collection capability |
| **CVD** | coinsignal | Trading signal calculation |
| **Net Longs/Shorts** | FundingRate | Funding rate as proxy for long/short sentiment |
| **Bucketed Trades** | crypto-msg-parser (trade parsing) | Trade data normalization across exchanges |
| **Custom Scripting** | Multi-language bindings (Python, C++, TypeScript) | Extensible via FFI |
| **Aggregated OI** | crypto-market-raw-data | Open interest data collection |

---

## 4. Following List Analysis (120 people)

### Full Following List

**Page 1:** karminski, paradigmxyz, FiloSottile, GalaxySciTech, sCrypt-Inc, amitani, faridk, Supercycled, syndoom, ebenali, ruoguluo, tenderleo, ericliang, xunkai55, crazydonkey200, Atheros1, vbuterin, zhuoluoy, v-ramachandran, will001, xing5, jojozhai, easychen, scmaple, aeromomo, roywei, coblee, atian25, fengmk2, popomore, dead-horse, killme2008, rauchg, okoala, yiminghe, benjycui, afc163, tj, h8liu, hsutter, yyx990803, cowtowncoder, dengliu, rednaxelafx, dreamhead, HungryJake, guyfig, oeddyo, chenshasha, bmahe-tango

**Page 2:** coderplay, JerryLead, jason-dai, zhpengg, mli, cookiebus, NotAndOr, ithlony, dsy88, Geniushjs, whusnoopy, chensoul, yinxusen, chenyf, sonyfe25cp, kylentechwolf, aarondav, haoyuan, flytomylife, camus-zhang, darrenhp, pongba, BYVoid, fxsjy, coder32167, youxiachai, reeze, daizhenyang, laogao, wangzaixiang, BlackNiuza, sproblvem, clockfly, davies, xhliu, egonSchiele, cloudwu, zhongl, fujohnwang, argan, tdunning, lijiankou, ryanlecompte, pwendell, mateiz, rxin, chuanying, bittib, fuwutu, jerryshao

**Page 3:** AnnieKim, snakeDling, liyong3forever, yinwang0, cydu, lipiji, luangong, shenfeng, lookthesea, liancheng, mlzboy, gchen, mdyang, chenshuo, dcaoyuan, lgnlgn, lidaobing, xushiwei, JeffreyZhao, weigj

### Trading-Relevant People Detailed

#### Tier 1: Directly Trading/Crypto Relevant

##### syndoom - Quantitative Trader
| Field | Value |
|-------|-------|
| **Bio** | "Quantitative Trader" |
| **Interests** | Blockchain |
| **Followers** | 11 |
| **Following** | 18 |

**Key Repos:**
| Repo | Language | Description | Relevance |
|------|----------|-------------|-----------|
| [hyperliquid-stats](https://github.com/syndoom/hyperliquid-stats) | Python | Hyperliquid exchange analytics (FastAPI + PostgreSQL) | **Hyperliquid MBO, Liquidation Heatmap** |
| [mbt_gym](https://github.com/syndoom/mbt_gym) | Jupyter | RL environments for HFT market-making | **Orderbook Imbalances, Real-time data** |
| [dlsa-public](https://github.com/syndoom/dlsa-public) | Python | Deep learning statistical arbitrage | **Custom Scripting** |
| [microprice](https://github.com/syndoom/microprice) | Jupyter | Fair price estimation from orderbook state | **Aggregated DOM, Orderbook Imbalances** |
| [pairs_trading](https://github.com/syndoom/pairs_trading) | Jupyter | Pair trading experimentation | Strategies |
| [optionlab](https://github.com/syndoom/optionlab) | Python | Option trading strategy evaluation | Strategies |
| [DynamicDeltaHedge](https://github.com/syndoom/DynamicDeltaHedge) | Python | Options delta hedge simulation | Strategies |
| [kagglejanestreet](https://github.com/syndoom/kagglejanestreet) | Python | Jane Street Kaggle competition solution | Quant strategies |
| [kalman-cpp](https://github.com/syndoom/kalman-cpp) | C++ | Kalman filter implementation | Signal processing |
| Financial-Models-Numerical-Methods | Jupyter | Quantitative finance notebooks | Strategies |

**VERDICT:** HIGH VALUE. A practicing quant trader with direct Hyperliquid experience and deep orderbook/microstructure knowledge.

---

##### Supercycled - MEV/DeFi Developer
**Key Repos:**
| Repo | Stars | Language | Description | Relevance |
|------|-------|----------|-------------|-----------|
| [cake_sniper](https://github.com/Supercycled/cake_sniper) | 1,543 | Go | EVM frontrunning/sniping tool | Exchange APIs, Real-time data |
| [flashloans-toolbox](https://github.com/Supercycled/flashloans-toolbox) | 115 | Solidity | UniV2/V3/AAVE flashloan tools | DeFi infrastructure |
| Alpha-Challenge | fork | - | Wintermute Alpha Challenge | Quant trading |

**VERDICT:** MODERATE VALUE. MEV expertise relevant to understanding on-chain trading dynamics.

---

##### ebenali - Crypto Data Engineer
**Key Repos:**
| Repo | Language | Description | Relevance |
|------|----------|-------------|-----------|
| [crypto-crawler-rs](https://github.com/ebenali/crypto-crawler-rs) | Rust | Fork of soulmachine's crawler | **Exchange APIs** |
| [how-to-dump-crypto-private-ws](https://github.com/ebenali/how-to-dump-crypto-private-ws) | JavaScript | Crypto exchange private WS feed dumping | **Exchange APIs, Real-time data** |
| [alpaca-trade-api-cpp](https://github.com/ebenali/alpaca-trade-api-cpp) | C++ | Alpaca trading API client | Exchange APIs |
| [IXWebSocket](https://github.com/ebenali/IXWebSocket) | C++ | WebSocket client/server library | Real-time data |

**VERDICT:** HIGH VALUE. Active crypto data infrastructure contributor; collaborates on the crypto-crawler ecosystem.

---

##### paradigmxyz - Paradigm (Crypto Investment Firm)
**Key Repos:**
| Repo | Stars | Language | Description | Relevance |
|------|-------|----------|-------------|-----------|
| [reth](https://github.com/paradigmxyz/reth) | 5,476 | Rust | Blazing-fast Ethereum implementation | Infrastructure |
| [Artemis](https://github.com/paradigmxyz/Artemis) | 2,900 | Rust | MEV bot framework | Real-time data, Exchange APIs |
| [cryo](https://github.com/paradigmxyz/cryo) | 1,500 | Rust | Blockchain data extraction to parquet/CSV | Real-time data processing |
| [solar](https://github.com/paradigmxyz/solar) | 535 | Rust | High-perf Solidity compiler | Infrastructure |
| [revmc](https://github.com/paradigmxyz/revmc) | 259 | Rust | JIT/AOT EVM compiler | Infrastructure |

**VERDICT:** MODERATE VALUE. World-class Rust infrastructure but focused on on-chain/MEV rather than trading UI.

---

##### coblee (Charlie Lee) - Litecoin Creator
**Key Repos:**
| Repo | Stars | Language | Description | Relevance |
|------|-------|----------|-------------|-----------|
| [litecoin](https://github.com/coblee/litecoin) | 6 | C++ | Litecoin source | Crypto infrastructure |
| [rotki](https://github.com/coblee/rotki) | fork | Python | Portfolio tracking & analytics | Portfolio management |
| [lionshare-desktop](https://github.com/coblee/lionshare-desktop) | 2 | JavaScript | Crypto price monitor | Exchange APIs |
| [lionshare-api](https://github.com/coblee/lionshare-api) | 0 | JavaScript | Real-time crypto API | Exchange APIs |

**VERDICT:** LOW VALUE for our features. Historical crypto figure, not trading tools.

---

##### vbuterin (Vitalik Buterin) - Ethereum Creator
**Key Repos:**
| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [pybitcointools](https://github.com/vbuterin/pybitcointools) | 1,333 | Python | Bitcoin ECC library |
| [pyethereum](https://github.com/vbuterin/pyethereum) | 256 | Python | Early Ethereum implementation |
| [research](https://github.com/vbuterin/research) | 86 | Python | Ethereum research |

**VERDICT:** LOW VALUE. Protocol research, not trading infrastructure.

---

##### xhliu - Blockchain/Exchange Developer
**Key Repos:**
| Repo | Language | Description | Relevance |
|------|----------|-------------|-----------|
| [dingir-exchange](https://github.com/xhliu/dingir-exchange) | Rust | High-performance crypto trading engine (matching engine) | **Exchange APIs, Real-time data** |
| [CoinExchange_CryptoExchange_Java](https://github.com/xhliu/CoinExchange_CryptoExchange_Java) | Java | Java crypto exchange platform | Exchange APIs |
| [fex](https://github.com/xhliu/fex) | Solidity | Decentralized CashTokens market | DeFi |
| [panda-wallet](https://github.com/xhliu/panda-wallet) | TypeScript | Non-custodial BSV wallet | Infrastructure |

**VERDICT:** MODERATE VALUE. The dingir-exchange matching engine is architecturally relevant.

---

##### GalaxySciTech - DeFi/Blockchain Org
**Key Repos:**
| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| tokencore | 319 | Java | Blockchain wallet backend components |
| java-wallet | 93 | Kotlin | Digital currency wallet backend |
| binance-sniper-bot | - | Python | Binance sniping bot |

**VERDICT:** LOW VALUE. Wallet infrastructure, not trading visualization.

---

##### jane-cloud - Exchange API Developer
**Key Repos:**
| Repo | Stars | Language | Description | Relevance |
|------|-------|----------|-------------|-----------|
| [Open-API-SDK-V5](https://github.com/jane-cloud/Open-API-SDK-V5) | 389 | Java | OKX exchange API SDK | **Exchange APIs** |
| [okex-open-api](https://github.com/jane-cloud/okex-open-api) | 43 | C++ | OKX C++ API client | Exchange APIs |
| [open-api-v3-sdk](https://github.com/jane-cloud/open-api-v3-sdk) | 2 | C++ | OKX v3 multi-language SDK | Exchange APIs |

**VERDICT:** MODERATE VALUE. OKX exchange API expertise.

---

#### Tier 2: Tangentially Relevant

| Person | Relevance | Notes |
|--------|-----------|-------|
| killme2008 | Low | Time-series DB developer (GreptimeDB) - could be useful for data storage |
| sCrypt-Inc | Low | Bitcoin smart contract platform, ZKP resources |
| Atheros1 | Low | Crypto/privacy focus but minimal repos |
| mli | None | ML educator (32k star paper-reading repo) |
| crazydonkey200 | None | Google Brain researcher |
| karminski | None | AI/LLM tools |
| amitani | None | Neuroscience/ML researcher |
| faridk | None | General web dev |
| rauchg | None | Vercel CEO (Next.js) |
| yyx990803 | None | Vue.js creator |
| tj | None | Express.js/Go developer |

---

## 5. Starred Repos - Trading-Relevant Gems

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) | 32,379 | Python | Multi-agent LLM trading framework (fundamental, sentiment, technical analysis agents) | **Custom Scripting, Community Indicators** |
| [cure-lab/LTSF-Linear](https://github.com/cure-lab/LTSF-Linear) | 2,432 | Python | AAAI-23: Transformers for time series forecasting | **Custom Scripting** |
| [milvus-io/milvus](https://github.com/milvus-io/milvus) | 43,366 | Go | High-performance vector database | Data infrastructure |

**Note:** Most starred repos are AI/LLM focused (GPT4All, LLMs-from-scratch, ColossalAI, etc.) rather than trading-specific. The TradingAgents star is the most directly relevant.

---

## 6. Second Hop Discoveries

### Via syndoom (Quantitative Trader)

syndoom follows 18 people. Key 2nd-hop discoveries:

#### sstoikov - Academic Microstructure Researcher
| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [microprice](https://github.com/sstoikov/microprice) | 442 | Jupyter | Fair price estimation from orderbook state | **Aggregated DOM, Orderbook Imbalances** |
| [tradeimbalance](https://github.com/sstoikov/tradeimbalance) | 9 | TeX | Trade imbalance analysis with academic paper | **Orderbook Imbalances, Footprints** |

**VERDICT:** HIGH VALUE. Academic foundations for orderbook imbalance and microprice features.

---

#### DrunkenRandomWalker - HFT/Quant Developer
| Repo | Language | Description | Feature Relevance |
|------|----------|-------------|-----------|
| [ihft](https://github.com/DrunkenRandomWalker/ihft) (fork of proydakov/ihft) | C++ | HFT microframework with lock-free queues, custom allocators | **Real-time data processing** |
| [gs-quant](https://github.com/DrunkenRandomWalker/gs-quant) | Jupyter | Goldman Sachs quantitative finance toolkit | Strategies |
| [sdk-python](https://github.com/DrunkenRandomWalker/sdk-python) | Python | Injective DEX Python SDK | **Exchange APIs** |
| [frontrunner-sdk](https://github.com/DrunkenRandomWalker/frontrunner-sdk) | Python | Frontrunner SDK | DeFi |
| [binance-public-data](https://github.com/DrunkenRandomWalker/binance-public-data) | Python | Binance historical data access | **Exchange APIs** |
| [auto_rewards_staking](https://github.com/DrunkenRandomWalker/auto_rewards_staking) | Python | Automated staking rewards | DeFi |
| [swarm-rs](https://github.com/DrunkenRandomWalker/swarm-rs) | Rust | AI agent orchestration in Rust | Custom Scripting |

**VERDICT:** HIGH VALUE. HFT infrastructure knowledge + Injective DEX + Binance data.

---

#### proydakov/ihft (Original) - HFT Microframework
| Field | Value |
|-------|-------|
| Stars | 51 |
| Language | C++ |
| Description | Lock-free queues, custom allocators, CPU affinity, wait-free logging |
| Feature Relevance | **Real-time data processing, WebGL/Canvas rendering** (low-latency patterns applicable to UI) |

---

#### traderben - Mysterious Trader
- 44 followers, 0 public repos, Starstruck x3 achievement
- Likely a private trader with significant influence (followed by syndoom)

---

#### jane-cloud - OKX API Developer (2nd hop via syndoom -> crypto-crawler)
- Already covered above. OKX exchange API SDKs.

---

#### FinancialMarkets - Academic Finance Org
| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [5MinuteFinance](https://github.com/FinancialMarkets/5MinuteFinance) | 86 | CSS/R | Interactive finance education presentations |

**VERDICT:** LOW VALUE. Educational, not infrastructure.

---

## 7. Feature Coverage Matrix

| Feature | Coverage Level | Key Sources |
|---------|---------------|-------------|
| **HD Heatmaps** | None | - |
| **Aggregated Orderbooks** | STRONG | crypto-crawler-rs (multi-exchange orderbook data), FlowTrack-Crypto |
| **Aggregated DOM** | MODERATE | sstoikov/microprice (fair price from orderbook), syndoom/microprice |
| **Footprints** | MODERATE | crypto-notebooks (bars, analysis), sstoikov/tradeimbalance |
| **Filtered Footprints** | LOW | crypto-notebooks (analysis notebooks) |
| **CVD** | MODERATE | coinsignal (indicator calculation) |
| **Market Profile/TPO** | None | - |
| **Custom Session TPO** | None | - |
| **Orderbook Imbalances** | STRONG | sstoikov/microprice (442 stars), sstoikov/tradeimbalance, FlowTrack-Crypto |
| **Liquidation Heatmap** | MODERATE | syndoom/hyperliquid-stats (liquidation data), Funding_rate_strategy_monitoring_system |
| **Volume Bubbles** | LOW | FlowTrack-Crypto (anomaly detection) |
| **1s Timeframes** | STRONG | crypto-crawler-rs (continuous websocket data) |
| **Custom Timeframes** | MODERATE | crypto-notebooks (bars directory) |
| **Dual Cluster Modes** | None | - |
| **Net Longs/Shorts** | MODERATE | FundingRate, Funding_rate_strategy_monitoring_system |
| **Aggregated OI** | MODERATE | crypto-market-raw-data, Funding_rate_strategy_monitoring_system |
| **Bucketed Trades** | MODERATE | crypto-msg-parser (trade normalization) |
| **SL/TP Theory** | None | - |
| **Custom Scripting** | STRONG | Multi-language bindings (Python, C++, TS), TradingAgents |
| **Community Indicators Marketplace** | LOW | coinsignal (basic indicators) |
| **WebGL/Canvas rendering** | None | - |
| **Exchange APIs** | STRONG | crypto-crawler-rs, carbonbot, Open-API-SDK-V5, dingir-exchange |
| **Hyperliquid MBO** | MODERATE | syndoom/hyperliquid-stats |
| **Real-time data processing** | STRONG | crypto-crawler-rs, crypto-msg-parser, ihft |

---

## 8. Summary of Most Valuable Finds

### Top 5 Discoveries

1. **crypto-crawler ecosystem** (42 repos, Rust-first) - Production-grade multi-exchange data pipeline. The most comprehensive open-source crypto data crawling infrastructure found in any network crawl. Directly useful for Exchange APIs, Real-time data processing, Aggregated Orderbooks, and 1s Timeframes features.

2. **syndoom** (Quantitative Trader) - A practicing quant who bridges soulmachine's data infrastructure with actual trading. His Hyperliquid stats tool, microprice fork, and HFT gym environments directly map to our Hyperliquid MBO, Orderbook Imbalances, and Liquidation Heatmap features.

3. **sstoikov/microprice** (442 stars) - Academic-quality orderbook microprice estimation. The seminal implementation for fair price calculation from orderbook state. Directly applicable to Aggregated DOM and Orderbook Imbalances features.

4. **proydakov/ihft** (51 stars, C++) - Low-latency HFT microframework with lock-free queues and custom allocators. While C++, the architectural patterns (lock-free communication, CPU affinity, wait-free logging) are directly applicable to our real-time data processing needs.

5. **Supercycled/cake_sniper** (1,543 stars) + **paradigmxyz/Artemis** (2,900 stars) - MEV/frontrunning infrastructure showing how to monitor mempools and react to real-time on-chain events. Relevant architectural patterns for our real-time data processing.

### Key Network Insight

soulmachine's network reveals a clear **data infrastructure** cluster: people who build the plumbing for crypto trading rather than the trading UI itself. The network is strongest in:
- Raw data collection from exchanges (crypto-crawler-rs)
- Data parsing and normalization (crypto-msg-parser)
- Indicator calculation (coinsignal)
- Orderbook microstructure analysis (microprice, tradeimbalance)
- HFT infrastructure (ihft, dingir-exchange)

The gap is in **visualization and UI** - no one in this network appears to work on heatmaps, footprint charts, TPO charts, or WebGL rendering. This is a data engineering cluster, not a charting/visualization cluster.

### Recommended Follow-ups

1. **Fork/study crypto-crawler-rs** for Exchange API and data pipeline architecture
2. **Study sstoikov/microprice** for Aggregated DOM/Orderbook Imbalance algorithms
3. **Explore syndoom/hyperliquid-stats** for Hyperliquid-specific data patterns
4. **Examine proydakov/ihft** architecture for low-latency data processing patterns
5. **Review crypto-notebooks** (analysis, backtest, bars, models, strategies directories) for signal calculation approaches applicable to CVD, Footprints, and Bucketed Trades
