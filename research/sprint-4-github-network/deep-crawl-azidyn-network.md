# Deep Crawl: azidyn's GitHub Network

**Date:** 2026-03-16
**Scope:** Full profile, all repos, following list (17 users), starred repos (30), 2nd-hop analysis of key connections

---

## 1. Profile Overview

| Field | Value |
|-------|-------|
| **Username** | [azidyn](https://github.com/azidyn) |
| **Display Name** | Azimuth Dynamics |
| **Bio** | programmer |
| **Location** | Yorkshire, UK |
| **Twitter** | [@azidynamics](https://twitter.com/azidynamics) |
| **Public Repos** | 16 |
| **Followers** | 94 |
| **Following** | 17 |
| **Created** | 2019-11-21 |

**Profile Assessment:** azidyn is a focused crypto derivatives infrastructure builder. Every original repo relates to real-time exchange data processing, order books, or algorithmic trading. JavaScript-dominant stack. The 94 followers with only 16 repos indicates high signal-to-noise ratio and community respect.

---

## 2. All Repositories

### Original Repos (Trading Infrastructure)

| Repo | Stars | Language | Description | Feature Relevance |
|------|-------|----------|-------------|-------------------|
| [larptrader](https://github.com/azidyn/larptrader) | 44 | JavaScript | Algorithmic backtesting + live trading, no DB required | **Exchange APIs, Real-time data processing** |
| [mextick](https://github.com/azidyn/mextick) | 23 | JavaScript | Parse historical trade data into ticks and aggregate trade bin events | **Bucketed Trades, 1s Timeframes, Custom Timeframes, Real-time data processing** |
| [corr](https://github.com/azidyn/corr) | 9 | JavaScript | Live crypto correlation matrix over WebSocket | **Real-time data processing** |
| [socket2em](https://github.com/azidyn/socket2em) | 8 | JavaScript | Browser WS exchange data normalization (BitMEX, Bybit) | **Exchange APIs, Aggregated Orderbooks, Real-time data processing** |
| [ftxtract](https://github.com/azidyn/ftxtract) | 7 | JavaScript | Pull FTX historical data | **Exchange APIs** |
| [mexaggonal](https://github.com/azidyn/mexaggonal) | 5 | JavaScript | Realtime WS price aggregation | **Real-time data processing, Exchange APIs** |
| [lob](https://github.com/azidyn/lob) | 5 | JavaScript | Limit order book in O(log n) | **Aggregated DOM, Orderbook Imbalances** |
| [tachyoff](https://github.com/azidyn/tachyoff) | 5 | JavaScript | Crypto API response timing measurement | **Exchange APIs** |
| [silverstonewww](https://github.com/azidyn/silverstonewww) | 0 | JavaScript | "Silverstone - algorithmic development and execution platform for crypto derivatives" (early stage, 2 files) | **Exchange APIs, Custom Scripting** |
| [avgentry](https://github.com/azidyn/avgentry) | 1 | N/A | Average entry price calculator for inverse derivative contracts | **Exchange APIs** |
| [regionlatency](https://github.com/azidyn/regionlatency) | 0 | JavaScript | Network latency testing | Infrastructure |
| [notebooks](https://github.com/azidyn/notebooks) | 1 | Jupyter Notebook | Analysis notebooks | Research |

### Forks

| Repo | Original | Description | Relevance |
|------|----------|-------------|-----------|
| [trading-vue-js](https://github.com/azidyn/trading-vue-js) | C451/trading-vue-js | Hackable charting lib for traders (NOT maintained) | **WebGL/Canvas rendering, Custom Scripting** - azidyn forked the predecessor to Night Vision |
| [bybit-api](https://github.com/azidyn/bybit-api) | tiagosiebler/bybit-api | Bybit API wrapper | **Exchange APIs** |

### Key Insight
azidyn's `silverstonewww` is described as an "algorithmic development and execution platform" - this may be an unreleased private project that represents a more complete trading platform vision.

---

## 3. Following List Analysis (17 Users)

### Tier 1: Highly Trading-Relevant (Must-Watch)

#### [tiagosiebler](https://github.com/tiagosiebler) - Exchange SDK Ecosystem Builder
**Followers:** 500+ | **Repos:** 14+ visible

The single most valuable connection. Maintains the dominant Node.js/TypeScript exchange SDK ecosystem.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [binance](https://github.com/tiagosiebler/binance) | 910 | TypeScript | **Exchange APIs** - Full Binance SDK |
| [bybit-api](https://github.com/tiagosiebler/bybit-api) | 332 | TypeScript | **Exchange APIs** - Full Bybit SDK |
| [okx-api](https://github.com/tiagosiebler/okx-api) | 163 | TypeScript | **Exchange APIs** - Full OKX SDK |
| [ftx-api](https://github.com/tiagosiebler/ftx-api) | 121 | TypeScript | **Exchange APIs** - FTX SDK (historical) |
| [bitget-api](https://github.com/tiagosiebler/bitget-api) | 72 | TypeScript | **Exchange APIs** - Bitget SDK |
| **[orderflow](https://github.com/tiagosiebler/orderflow)** | **65** | **TypeScript** | **Footprints, Filtered Footprints, Orderbook Imbalances, Real-time data processing** |
| [TriangularArbitrage](https://github.com/tiagosiebler/TriangularArbitrage) | 604 | JavaScript | **Exchange APIs, Real-time data processing** |
| [coinbase-api](https://github.com/tiagosiebler/coinbase-api) | 24 | TypeScript | **Exchange APIs** |
| [gateio-api](https://github.com/tiagosiebler/gateio-api) | 18 | TypeScript | **Exchange APIs** |
| [kucoin-api](https://github.com/tiagosiebler/kucoin-api) | 13 | TypeScript | **Exchange APIs** |
| [bitmart-api](https://github.com/tiagosiebler/bitmart-api) | 7 | TypeScript | **Exchange APIs** |

**CRITICAL FIND: `orderflow`** - Builds real-time footprint candles from exchange WebSocket trade data. Supports Binance, Bybit, OKX, Bitget, Gate.io. Includes stacked imbalance detection and high-volume node identification. Uses NestJS + TimescaleDB. This is directly relevant to Footprints, Filtered Footprints, and Orderbook Imbalances features.

#### [beinghorizontal](https://github.com/beinghorizontal) - Market Profile / TPO Specialist
**Followers:** 375 | **Repos:** 51

The go-to person for Market Profile / TPO implementations.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| **[tpo_project](https://github.com/beinghorizontal/tpo_project)** | **130** | **Python** | **Market Profile/TPO, Custom Session TPO** - Interactive TPO visualization with Plotly/Dash |
| [py-market-profile](https://github.com/beinghorizontal/py-market-profile) | 67 | Python | **Market Profile/TPO** - pip-installable library for MP calculation |
| [tradingview](https://github.com/beinghorizontal/tradingview) | 44 | Python | Trading tools |
| [BhavFnO](https://github.com/beinghorizontal/BhavFnO) | 42 | Python | Derivatives trend analysis (NSE) |
| [tpo_btc](https://github.com/beinghorizontal/tpo_btc) | 22 | Python | **Market Profile/TPO** - Bitcoin-specific TPO with Dash |
| [Quantext](https://github.com/beinghorizontal/Quantext) | 7 | HTML | YouTube channel educational content |
| [range_reversal](https://github.com/beinghorizontal/range_reversal) | 6 | Jupyter Notebook | Range reversal analysis |
| [lightweight-charts-python](https://github.com/beinghorizontal/lightweight-charts-python) | 3 | Python | TradingView lightweight charts wrapper |
| [transformers_for_trading](https://github.com/beinghorizontal/transformers_for_trading) | - | Python | Fine-tuned LLama for financial QA |

**Key features from tpo_project:** Live interactive TPO charts, color-coded POC indicators, Initial Balance (IB) period calculations (60-min windows), rotational factor on minute bars, alphabet-marked TPO blocks. Originally designed to feed to CNNs for pattern recognition.

#### [askmike](https://github.com/askmike) - Gekko Creator (Legend)
**Followers:** 900+ | **Repos:** 12+

Creator of Gekko, one of the most successful open-source crypto trading bots ever (10K+ stars, now archived).

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [gekko](https://github.com/askmike/gekko) | 10,181 | JavaScript | **Exchange APIs, Custom Scripting, Real-time data processing** (archived) |
| [deribit-v2-ws](https://github.com/askmike/deribit-v2-ws) | 22 | JavaScript | **Exchange APIs** - Deribit WS wrapper |
| [ftx-api-ws](https://github.com/askmike/ftx-api-ws) | 19 | JavaScript | **Exchange APIs** - FTX WS wrapper |
| [kraken-ws](https://github.com/askmike/kraken-ws) | 9 | JavaScript | **Exchange APIs** - Kraken WS wrapper |
| [bitmex-simple-ws](https://github.com/askmike/bitmex-simple-ws) | 4 | JavaScript | **Exchange APIs** - BitMEX WS wrapper |
| [bitstamp](https://github.com/askmike/bitstamp) | 78 | JavaScript | **Exchange APIs** - Bitstamp REST |
| [bybit-simple-rest](https://github.com/askmike/bybit-simple-rest) | 3 | JavaScript | **Exchange APIs** - Bybit REST |

**Pattern:** askmike builds lightweight, single-exchange WS wrappers. The Gekko architecture (plugin-based, event-driven) is a well-documented reference for trading bot design.

#### [warproxxx](https://github.com/warproxxx) - Polymarket & Crypto Analysis
**Followers:** moderate | **Repos:** 30+

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [poly-maker](https://github.com/warproxxx/poly-maker) | 939 | Python | Market making bot for Polymarket |
| [poly_data](https://github.com/warproxxx/poly_data) | 623 | Jupyter Notebook | Polymarket data retriever/processor |
| [CryptoTrader](https://github.com/warproxxx/CryptoTrader) | 16 | Jupyter Notebook | Reddit/Twitter/Google + TA-based trader |
| [liveTrader](https://github.com/warproxxx/liveTrader) | 1 | Python | Live trading system |
| [grid-trading](https://github.com/warproxxx/grid-trading) | 0 | Python | Grid trading bot |
| [sample-market-maker](https://github.com/warproxxx/sample-market-maker) | 1 | Python | BitMEX market maker (fork) |
| [kalshi_analysis](https://github.com/warproxxx/kalshi_analysis) | 2 | Jupyter Notebook | Kalshi prediction market analysis |

**Notable:** warproxxx follows nobody (0 following) - terminal node in the graph. Strong prediction market focus (Polymarket, Kalshi).

#### [trading-peter](https://github.com/trading-peter) - PlusEV Platform Builder
**Followers:** 83 | **Repos:** 150

Builds the "PlusEV" trading platform ecosystem in Go.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [tv-enhance](https://github.com/trading-peter/tv-enhance) | 7 | JavaScript | Chrome extension enhancing TradingView charts |
| [KLineChart](https://github.com/trading-peter/KLineChart) | - | TypeScript | Lightweight k-line chart, zero dependencies (fork) |
| [chart-elements](https://github.com/trading-peter/chart-elements) | 264 | JavaScript | Chart.js as Polymer elements (archived) |
| [nexapi](https://github.com/trading-peter/nexapi) | - | Go | Multi-exchange API integration library |
| [go-woo](https://github.com/trading-peter/go-woo) | - | Go | WOO exchange API client |
| [kraken-go-api-client](https://github.com/trading-peter/kraken-go-api-client) | - | Go | Kraken API client |
| plusev_datasource_binance_plugin | - | Go | PlusEV Binance data source |
| plusev_datasource_woox_plugin | - | Go | PlusEV WOO X data source |
| plusev_datasource_kraken_ohlcv_files | - | Go | PlusEV Kraken OHLCV data |
| plusev_planner_economic_calendar_plugin | - | Go | Economic calendar integration |
| plusev_tax_woox_plugin | - | Go | Tax tracking for WOO X |

**Pattern:** Building a Go-based modular trading platform (PlusEV) with plugin architecture for data sources, tax tracking, and economic calendar. The plugin naming convention (`plusev_datasource_*`, `plusev_tax_*`, `plusev_planner_*`) reveals a sophisticated platform structure.

#### [prdn](https://github.com/prdn) - Paolo Ardoino (Tether/Bitfinex CTO)
**Followers:** 200+ | **Repos:** 41

This is **Paolo Ardoino**, CTO of Tether and Bitfinex. Following this person signals azidyn's deep connection to the crypto exchange world.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [pigato](https://github.com/prdn/pigato) | 303 | JavaScript | High-performance microservices framework (used at Bitfinex?) |
| Various Hyperswarm/DHT repos | - | JavaScript | P2P infrastructure, decentralized networking |

#### [darkrenaissance](https://github.com/darkrenaissance) - DarkFi / Privacy-First Crypto
| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [darkfi](https://github.com/darkrenaissance/darkfi) | 1,316 | Rust | Anonymous, uncensored, sovereign L1 blockchain |
| [whallets](https://github.com/darkrenaissance/whallets) | 9 | Python | Whale wallet monitoring on-chain |

### Tier 2: Partially Relevant

#### [DenisCJN](https://github.com/DenisCJN) - trading-vue-js Forker
- Forked trading-vue-js (same as azidyn) - suggests collaboration or shared interest
- Also forked node-binance-api
- Mix of PHP, AI, and trading repos

#### [twk4050](https://github.com/twk4050) - Early-Stage Crypto Dev
- `news-trader-gui` - News-based trading GUI (JavaScript)
- `coinbase-wrapper` - Coinbase API wrapper (TypeScript)
- Small repos, early career

#### [alechp](https://github.com/alechp) - DevOps/Crypto Dabbler
- `ftx-auto-lend` (Go) - FTX lending automation
- `satoshis-version` - Annotated Bitcoin source code
- Mostly DevOps/infrastructure focused

### Tier 3: Non-Trading (Context/Personal)

| User | Description |
|------|-------------|
| [markwylde](https://github.com/markwylde) | 187 repos, prolific JS dev. Notable: `workerbox` (152 stars) - secure sandbox for untrusted JS in browser. azidyn starred this - likely for **Custom Scripting** sandboxing. |
| [gridsound](https://github.com/gridsound) | Browser-based DAW (1,763 stars). WebAudio expertise, Canvas/WebGL UI. Relevant for **WebGL/Canvas rendering** patterns. |
| [vswarte](https://github.com/vswarte) | Unknown - no public repos visible |
| [revoltchat](https://github.com/revoltchat) | Open-source Discord alternative. Likely personal interest. |
| [RCFLearning](https://github.com/RCFLearning) | 0 public repos |
| [adumitrescu18](https://github.com/adumitrescu18) | 5 repos, beginner-level |
| [viscositysolutions](https://github.com/viscositysolutions) | 0 public repos |

---

## 4. Starred Repos Analysis (30 Repos)

### Trading & Charting (HIGH RELEVANCE)

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| **[project-nv/night-vision](https://github.com/project-nv/night-vision)** | **311** | **JavaScript** | **WebGL/Canvas rendering, Custom Scripting** - Continuation of trading-vue-js, Svelte-based, designed for pro traders |
| [valamidev/candlestick-convert](https://github.com/valamidev/candlestick-convert) | 55 | TypeScript | **Custom Timeframes, 1s Timeframes** - OHLCV batcher/converter |
| [cathino/talib-web](https://github.com/cathino/talib-web) | 10 | C | **Community Indicators Marketplace** - TA-Lib ported to WebAssembly for browser use |

### Rendering & Visualization (HIGH RELEVANCE)

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| **[jagenjo/Canvas2DtoWebGL](https://github.com/jagenjo/Canvas2DtoWebGL)** | **349** | **JavaScript** | **WebGL/Canvas rendering** - GPU-accelerate Canvas2D calls via WebGL |
| [scrapjs/gl-fourier](https://github.com/scrapjs/gl-fourier) | 49 | JavaScript | **WebGL/Canvas rendering** - WebGL Fourier transform experiments |
| [zingchart/awesome-charting](https://github.com/zingchart/awesome-charting) | 2,082 | - | Reference list for charting/dataviz libraries |
| [RainingComputers/picograph.js](https://github.com/RainingComputers/picograph.js) | 14 | JavaScript | Tiny graphing library |
| [chartist-js/chartist](https://github.com/chartist-js/chartist) | 13,404 | TypeScript | Responsive charts library |
| [bubkoo/html-to-image](https://github.com/bubkoo/html-to-image) | 7,064 | TypeScript | DOM node to image conversion |

### Sandboxing & Custom Scripting (HIGH RELEVANCE)

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| **[markwylde/workerbox](https://github.com/markwylde/workerbox)** | **152** | **JavaScript** | **Custom Scripting** - Secure sandbox for untrusted user JS in browser |
| [engine262/engine262](https://github.com/engine262/engine262) | 932 | TypeScript | **Custom Scripting** - Full ECMA-262 JS implementation in JS |
| [fengari-lua/fengari](https://github.com/fengari-lua/fengari) | 1,977 | JavaScript | **Custom Scripting** - Lua VM in JS for browser |
| [teoxoy/lua-in-js](https://github.com/teoxoy/lua-in-js) | 106 | TypeScript | **Custom Scripting** - Lua to JS transpiler |
| [svaarala/duktape](https://github.com/svaarala/duktape) | 6,191 | JavaScript | **Custom Scripting** - Embeddable JS engine, compact footprint |
| [zhennann/sandbox-webworker](https://github.com/zhennann/sandbox-webworker) | 1 | JavaScript | **Custom Scripting** - Sandbox via web workers |

**CRITICAL PATTERN:** azidyn has starred 6 sandboxing/scripting-engine repos. This strongly suggests active research into building a **Custom Scripting** feature for a trading platform. The range from Lua VMs (fengari, lua-in-js) to JS sandboxes (workerbox, duktape, engine262) to web worker sandboxes indicates evaluating multiple approaches.

### Visual Programming

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [retejs/rete](https://github.com/retejs/rete) | 11,932 | TypeScript | **Custom Scripting** - Visual programming framework (node-based editor) |

### Other Starred Repos

| Repo | Stars | Language | Description |
|------|-------|----------|-------------|
| [raysan5/raylib](https://github.com/raysan5/raylib) | 31,552 | C | Game programming library |
| [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) | 98,197 | C++ | LLM inference |
| [facebookresearch/dino](https://github.com/facebookresearch/dino) | 7,476 | Python | Vision Transformers / self-supervised learning |
| [use-strict/7z-wasm](https://github.com/use-strict/7z-wasm) | 155 | JavaScript | 7-Zip for WASM |
| [n0madic/twitter-scraper](https://github.com/n0madic/twitter-scraper) | 975 | Go | Twitter scraping |
| [solzimer/skmeans](https://github.com/solzimer/skmeans) | 76 | JavaScript | k-means clustering |
| [kach/nearley](https://github.com/kach/nearley) | 3,738 | JavaScript | Parser toolkit (for custom scripting language?) |
| [freddie-nelson/vue3-slider](https://github.com/freddie-nelson/vue3-slider) | 49 | Vue | Vue.js slider component |
| [Maronato/vue-toastification](https://github.com/Maronato/vue-toastification) | 3,383 | TypeScript | Vue notifications |
| [lifepillar/csv2keepassxml](https://github.com/lifepillar/csv2keepassxml) | 33 | Ruby | CSV to KeePass converter |
| [AylmerTH/social-housing-map](https://github.com/AylmerTH/social-housing-map) | 3 | Python | Choropleth map |
| [shiehn/SignalsAndSorcery](https://github.com/shiehn/SignalsAndSorcery) | 35 | JavaScript | VueJS WebAudio tool |
| [Rajspeaks/clash-of-space](https://github.com/Rajspeaks/clash-of-space) | 8 | JavaScript | Space shooter game |

---

## 5. 2nd Hop Discoveries

### From tiagosiebler's Following (34 people)

#### [JJ-Cro](https://github.com/JJ-Cro) - Exchange SDK Collaborator
Appears to be tiagosiebler's primary collaborator. Maintains forks/mirrors of all the same exchange SDKs.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [orderbooks](https://github.com/JJ-Cro/orderbooks) | - | TypeScript | **Aggregated Orderbooks, Aggregated DOM** - Orderbook snapshot + delta management |
| [accountstate](https://github.com/JJ-Cro/accountstate) | - | TypeScript | In-memory exchange/position/trade state management |
| All exchange SDKs (binance, bybit, okx, bitget, kucoin, gateio, bitmart, coinbase, kraken) | - | TypeScript | **Exchange APIs** |

**`orderbooks` is notable** - lightweight utility for managing orderbook state across exchanges with depth trimming, best bid/ask, spread calculation. Zero dependencies.

#### [valamidev](https://github.com/valamidev) - Candlestick Convert Author
Already in azidyn's starred repos. tiagosiebler also follows this person.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [candlestick-convert](https://github.com/valamidev/candlestick-convert) | 55 | TypeScript | **Custom Timeframes** - OHLCV batcher/converter |
| [web3-defi-honeypot-and-slippage-checker](https://github.com/valamidev/web3-defi-honeypot-and-slippage-checker) | 131 | Solidity | DeFi safety tool |
| [evm-supernode](https://github.com/valamidev/evm-supernode) | 20 | TypeScript | EVM RPC proxy/load-balancer |

#### [CryptoGnome](https://github.com/CryptoGnome) - Trading Bot Ecosystem
Prolific trading bot builder across multiple platforms.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [Limit-Sniper](https://github.com/CryptoGnome/Limit-Sniper) | 500 | Python | Mempool sniping bot |
| [LimitSwap](https://github.com/CryptoGnome/LimitSwap) | 277 | Python | DeFi trading bot |
| [Tradingview-Webhook-Bot](https://github.com/CryptoGnome/Tradingview-Webhook-Bot) | 178 | Python | **Exchange APIs** - TradingView webhook to Bybit/Binance |
| [Bybit-Lick-Hunter-v4](https://github.com/CryptoGnome/Bybit-Lick-Hunter-v4) | 142 | JavaScript | **Liquidation Heatmap** - Liquidation hunting bot |
| [LickHunterPRO](https://github.com/CryptoGnome/LickHunterPRO) | 143 | - | **Liquidation Heatmap** - Liquidation pool counter-trading |
| [Bybit-Futures-Bot](https://github.com/CryptoGnome/Bybit-Futures-Bot) | 114 | Python | Liquidation hunting strategy |
| [DeckTrader](https://github.com/CryptoGnome/DeckTrader) | 15 | Python | Stream Deck trading controls |
| [TradingviewScripts](https://github.com/CryptoGnome/TradingviewScripts) | 9 | - | PineScript collection |

**NOTABLE:** CryptoGnome's "Lick Hunter" series specifically targets liquidation events - directly relevant to our **Liquidation Heatmap** feature. The strategy of counter-trading liquidations reveals the kind of data traders want from liquidation visualization.

#### [dextertd](https://github.com/dextertd) - Bybit Official (?)
Appears to be a Bybit employee/associate based on repo patterns.

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [tv-bybit-webhook](https://github.com/dextertd/tv-bybit-webhook) | 11 | Python | TradingView webhook to Bybit via AWS Lambda |
| Various Bybit docs/API repos | - | Various | **Exchange APIs** |

### From beinghorizontal's Following (2 people)

#### [marketcalls](https://github.com/marketcalls) - OpenAlgo Platform (1,500+ stars)
**Followers:** 614 | **Repos:** 159

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| **[openalgo](https://github.com/marketcalls/openalgo)** | **1,501** | **Python** | **Exchange APIs, Custom Scripting** - Open-source algo trading platform, 30+ broker integrations |
| [openchart](https://github.com/marketcalls/openchart) | 47 | Python | Historical data downloader |
| [sector-rotation-map](https://github.com/marketcalls/sector-rotation-map) | 12 | JavaScript | Interactive RRG dashboard |
| [openalgo-flow](https://github.com/marketcalls/openalgo-flow) | 17 | TypeScript | Visual node-based strategy builder (React Flow) |
| [openalgo-python-library](https://github.com/marketcalls/openalgo-python-library) | 30 | Python | Python API wrapper |
| [openalgo-mcp](https://github.com/marketcalls/openalgo-mcp) | 11 | Python | MCP server for AI assistant trading |

**OpenAlgo is a full trading platform** with Flask + React, unified REST API, WebSocket streaming via ZeroMQ, visual strategy builder, paper trading with virtual capital, and Telegram integration. Indian broker-focused but architecture is reusable.

### From tiagosiebler's Stars

| Repo | Stars | Language | Feature Relevance |
|------|-------|----------|-------------------|
| [Quod-Financial/quantreplay](https://github.com/Quod-Financial/quantreplay) | 27 | C++ | Multi-asset market simulator with matching engine, FIX protocol, order book replay |
| [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) | 32,379 | Python | Multi-agent LLM trading framework |
| [jakobildstad/QuantDash](https://github.com/jakobildstad/QuantDash) | 38 | Python | Quantitative finance dashboard |

---

## 6. Network Graph Summary

```
                              azidyn (94 followers, 17 following)
                                    |
            +-----------+-----------+-----------+-----------+
            |           |           |           |           |
     tiagosiebler  beinghorizontal  askmike    warproxxx   trading-peter
     (Exchange SDKs) (TPO/Profile) (Gekko)  (Polymarket)  (PlusEV)
            |           |
     +------+------+    +---> marketcalls (OpenAlgo, 1.5K stars)
     |      |      |
   JJ-Cro  valamidev  CryptoGnome
   (orderbooks) (candlestick-convert) (Lick Hunter / Liquidation bots)
```

---

## 7. Feature Coverage Matrix

| Target Feature | Relevant Repos Found | Best Source |
|----------------|---------------------|-------------|
| **HD Heatmaps** | - | Not found in network |
| **Aggregated Orderbooks** | socket2em, JJ-Cro/orderbooks | socket2em (azidyn's own) |
| **Aggregated DOM** | lob, JJ-Cro/orderbooks | lob (azidyn's own) |
| **Footprints** | **tiagosiebler/orderflow** | **orderflow** (65 stars, production-ready) |
| **Filtered Footprints** | **tiagosiebler/orderflow** (stacked imbalances) | **orderflow** |
| **CVD** | - | Not found directly (derivable from orderflow data) |
| **Market Profile/TPO** | **beinghorizontal/tpo_project**, py-market-profile | **tpo_project** (130 stars) |
| **Custom Session TPO** | **beinghorizontal/tpo_project** (IB calculations) | **tpo_project** |
| **Orderbook Imbalances** | **tiagosiebler/orderflow** (stacked imbalances) | **orderflow** |
| **Liquidation Heatmap** | **CryptoGnome/LickHunterPRO**, Bybit-Lick-Hunter-v4 | CryptoGnome's liquidation bots |
| **Volume Bubbles** | - | Not found in network |
| **1s Timeframes** | mextick, candlestick-convert | mextick (azidyn's own) |
| **Custom Timeframes** | **candlestick-convert**, mextick | **candlestick-convert** (55 stars) |
| **Dual Cluster Modes** | - | Not found in network |
| **Net Longs/Shorts** | - | Not found directly |
| **Aggregated OI** | - | Not found directly |
| **Bucketed Trades** | **mextick** | mextick (azidyn's own) |
| **SL/TP Theory** | - | Not found in network |
| **Custom Scripting** | **workerbox, fengari, engine262, duktape, lua-in-js, rete** | Multiple sandbox approaches starred by azidyn |
| **Community Indicators Marketplace** | talib-web (TA-Lib in WASM) | talib-web |
| **WebGL/Canvas rendering** | **Canvas2DtoWebGL, night-vision**, gl-fourier, trading-vue-js | Canvas2DtoWebGL (349 stars) |
| **Exchange APIs** | **tiagosiebler ecosystem** (all major exchanges) | tiagosiebler + JJ-Cro SDKs |
| **Hyperliquid MBO** | - | Not found in network |
| **Real-time data processing** | socket2em, mextick, orderflow, larptrader | Distributed across azidyn + tiagosiebler |

**Coverage: 15/26 features** have directly relevant repos in the network.

---

## 8. Most Valuable Finds (Ranked)

### 1. tiagosiebler/orderflow (65 stars)
**Why:** Production-ready footprint candle builder from WebSocket trade data. Supports 5 exchanges. Includes stacked imbalance detection and high-volume node identification. NestJS + TimescaleDB architecture. Directly implements our Footprints, Filtered Footprints, and Orderbook Imbalances features.

### 2. beinghorizontal/tpo_project (130 stars)
**Why:** The most complete open-source Market Profile/TPO implementation found anywhere. Interactive Plotly/Dash visualization with POC tracking, IB calculations, and alphabet-marked TPO blocks. Python-based but the algorithms are portable.

### 3. azidyn's Scripting Research Pattern (6 starred repos)
**Why:** The constellation of starred repos (workerbox, fengari, lua-in-js, engine262, duktape, sandbox-webworker) reveals azidyn is actively researching how to build secure custom scripting for a trading platform. Combined with the `rete` visual programming framework star, this suggests a planned feature for visual + code-based strategy creation.

### 4. tiagosiebler Exchange SDK Ecosystem (2,000+ combined stars)
**Why:** The most comprehensive TypeScript/Node.js exchange connectivity layer available. Covers Binance (910 stars), Bybit (332), OKX (163), Bitget (72), Coinbase (24), Gate.io (18), KuCoin (13), BitMart (7). All actively maintained with WebSocket support.

### 5. jagenjo/Canvas2DtoWebGL (349 stars)
**Why:** GPU-accelerates Canvas2D operations via WebGL. Directly applicable to our charting renderer - could enable smooth rendering of complex visualizations (heatmaps, footprints) by offloading to GPU while maintaining Canvas2D API simplicity.

### 6. project-nv/night-vision (311 stars)
**Why:** Direct successor to trading-vue-js (which azidyn forked). Svelte-based, designed specifically for professional traders. Still in development but represents the most serious open-source TradingView alternative charting library.

### 7. CryptoGnome's Liquidation Hunting Bots (400+ combined stars)
**Why:** Demonstrates the market demand for liquidation data visualization. LickHunterPRO and Bybit-Lick-Hunter specifically target liquidation events for counter-trading, validating our Liquidation Heatmap feature priority.

### 8. marketcalls/openalgo (1,501 stars)
**Why:** Full open-source algo trading platform with visual strategy builder (React Flow), unified REST API, WebSocket streaming, and paper trading. Architecture reference for Custom Scripting and Exchange API integration patterns.

### 9. JJ-Cro/orderbooks (TypeScript)
**Why:** Lightweight, zero-dependency orderbook state manager with snapshot + delta support, depth trimming, and spread calculations. Directly usable for our Aggregated DOM and Aggregated Orderbooks features.

### 10. cathino/talib-web (WASM)
**Why:** TA-Lib compiled to WebAssembly with TypeScript support. Enables running 200+ technical analysis functions directly in the browser at near-native speed. Foundation for Community Indicators Marketplace.

---

## 9. Undiscovered Connections & Patterns

### Pattern: azidyn is Building Something
The starred repos reveal a clear product vision:
1. **Charting:** night-vision, trading-vue-js fork, Canvas2DtoWebGL, chartist
2. **Scripting:** workerbox, fengari, lua-in-js, engine262, duktape, rete
3. **Data:** candlestick-convert, talib-web, nearley (parser toolkit)
4. **Exchange connectivity:** socket2em (own), bybit-api (fork)

This pattern strongly suggests azidyn is building (or planning) a comprehensive trading platform with:
- GPU-accelerated charting
- Custom scripting language (possibly Lua-based given 2 Lua stars)
- Visual programming (rete)
- Browser-native exchange connectivity

### Connection: azidyn -> prdn (Paolo Ardoino / Bitfinex CTO)
Following the CTO of Tether/Bitfinex suggests either personal connection or deep involvement in the crypto exchange ecosystem. This is unusual for a developer with only 94 followers.

### Connection: azidyn -> C451 (trading-vue-js creator)
Both azidyn and DenisCJN forked trading-vue-js. C451 is the original creator. night-vision (in starred repos) is C451's spiritual successor. This triangulation confirms azidyn's charting library research.

### Connection: tiagosiebler -> Quod-Financial/quantreplay
A C++ multi-asset market simulator with FIX protocol support and matching engine. This could be valuable for backtesting infrastructure that goes beyond simple OHLCV replay.

### Missing from Network
No repos found for: HD Heatmaps, Volume Bubbles, Dual Cluster Modes, Net Longs/Shorts, Aggregated OI, SL/TP Theory, Hyperliquid MBO. These represent gaps that could differentiate our platform.

---

## 10. Recommended Next Steps

1. **Deep-dive tiagosiebler/orderflow** - Clone and analyze the footprint candle construction logic, stacked imbalance detection algorithm, and TimescaleDB schema
2. **Port beinghorizontal/tpo_project algorithms** - The Python TPO calculation logic needs to be ported to TypeScript/JavaScript for browser rendering
3. **Evaluate scripting approaches** - Test workerbox vs fengari vs engine262 for custom indicator scripting sandboxing
4. **Integrate Canvas2DtoWebGL** - Benchmark GPU-accelerated Canvas2D for heatmap and footprint rendering
5. **Contact azidyn** - Their starred repos and project pattern suggest strong alignment with our platform goals. Could be a valuable contributor or advisor.
6. **Crawl C451 (trading-vue-js/night-vision creator)** - Not yet in our network analysis but central to the charting library lineage
7. **Explore tiagosiebler's full star list** - He has 66 repos in a "Trading/Convert" star list and 29 in a "Crypto" list that were not fully paginated
