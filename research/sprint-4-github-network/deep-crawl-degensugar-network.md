# Deep Crawl: DegenSugarBoo's GitHub Network

**Date:** 2026-03-16
**Crawl Depth:** 2 hops (DegenSugarBoo → Following → Their Following/Stars)
**Source:** Found via OctopusTakopi's following list

---

## 1. Profile Overview

| Field | Value |
|-------|-------|
| **Username** | [DegenSugarBoo](https://github.com/DegenSugarBoo) |
| **Name** | Sid DegenSugarBoo |
| **Bio** | Quantitative Finance Enthusiast |
| **Affiliation** | @iitmadras, Class of 2026 |
| **Twitter/X** | @DegenSugarBoo |
| **Repos** | 14 |
| **Followers** | 27 |
| **Following** | 15 |
| **Stars** | ~78 repos |

**Profile Summary:** IIT Madras student deeply focused on crypto market microstructure, order flow visualization, and market making. Active in Rust, Python, and WebGL. Their work bridges academic quant finance (Stoikov-Avellaneda) with practical trading tools (real-time heatmaps, cross-exchange arb).

---

## 2. All Repositories

### 2.1 Original Repos

| Repo | Stars | Lang | Description | Feature Relevance |
|------|-------|------|-------------|-------------------|
| [OpenBook](https://github.com/DegenSugarBoo/OpenBook) | 123 ⭐ | Rust | Real-time Binance Futures depth heatmap with egui/eframe, live order flow and trade tape | **HD Heatmaps, Aggregated Orderbooks, Exchange APIs, Real-time data processing, WebGL/Canvas rendering (egui)** |
| [cross-ex-arb-dashboard](https://github.com/DegenSugarBoo/cross-ex-arb-dashboard) | 3 ⭐ | Rust | Cross-exchange perpetual futures arbitrage scanner across 5 exchanges (Lighter, Aster, Extended, edgeX, Hyperliquid) | **Exchange APIs, Hyperliquid MBO, Aggregated Orderbooks, Real-time data processing** |
| [cli_ob](https://github.com/DegenSugarBoo/cli_ob) | 10 ⭐ | Rust | CLI orderbook viewer | **Aggregated DOM, Real-time data processing** |
| [Stoikov-Avellaneda-MM](https://github.com/DegenSugarBoo/Stoikov-Avellaneda-MM) | 21 ⭐ | Jupyter | Market making strategy implementation | **SL/TP Theory** (academic MM theory) |
| [Stat-Arb-in-the-DEFI-index](https://github.com/DegenSugarBoo/Stat-Arb-in-the-DEFI-index) | 5 ⭐ | Jupyter | Statistical arbitrage using Ornstein-Uhlenbeck processes | Academic quant research |
| [webgl_math_shaders](https://github.com/DegenSugarBoo/webgl_math_shaders) | 0 ⭐ | JavaScript | Interactive WebGL2 shader visualizations with domain warping, FBM, orbit traps | **WebGL/Canvas rendering** (shader expertise directly applicable) |
| [ceraviz](https://github.com/DegenSugarBoo/ceraviz) | 0 ⭐ | Python | Crystal structure 3D visualization (PyVista) | Not trading-related (materials science) |
| [Telegram_liquidation_bot](https://github.com/DegenSugarBoo/Telegram_liquidation_bot) | 1 ⭐ | Python | Liquidation alert bot for Telegram | **Liquidation Heatmap** (data source) |
| [market_maker](https://github.com/DegenSugarBoo/market_maker) | 0 ⭐ | Python | Fork of beatzxbt/smm - Bybit market maker | **Exchange APIs** |
| [macdbot](https://github.com/DegenSugarBoo/macdbot) | 0 ⭐ | Python | MACD trading bot | Basic indicator bot |
| [Sid-s-Code-Explainer](https://github.com/DegenSugarBoo/Sid-s-Code-Explainer) | 0 ⭐ | Python | Code explanation tool | Not relevant |
| [task](https://github.com/DegenSugarBoo/task) | 0 ⭐ | Python | Unknown | Not relevant |
| [streamlitapp1](https://github.com/DegenSugarBoo/streamlitapp1) | 0 ⭐ | Python | Streamlit app | Not relevant |
| [DegenSugarBoo.github.io](https://github.com/DegenSugarBoo/DegenSugarBoo.github.io) | 1 ⭐ | — | Personal site | Not relevant |

### 2.2 Key Technical Details

**OpenBook (flagship project):**
- Bookmap-style depth heatmap with interactive history replay
- Live trade tape with color-coded buy/sell
- Market impact estimator
- Fill:Kill analytics with overfill detection
- Dockable multi-pane layout (egui_tiles)
- Adaptive frame rate (high during interaction, low when idle)
- WebSocket feeds: `@depth@100ms`, `@aggTrade`
- REST snapshot + differential update for OB consistency
- Known issue: ~600MB memory on active markets
- Stack: Rust, egui/eframe, tokio, tokio-tungstenite, reqwest, serde

**cross-ex-arb-dashboard:**
- 5 exchanges: Lighter, Aster, Extended, edgeX, **Hyperliquid**
- Spread = sell_bid/buy_ask - taker_fees, only shows positive net bps
- Read-only scanner (no execution)
- egui-based UI
- Hyperliquid uses REST metadata + WS orderbook feeds

**webgl_math_shaders:**
- WebGL2 fragment shaders with 5 modes
- Domain warping, FBM, orbit traps, cosine palettes, tanh tone mapping
- 6 interactive parameters
- Demonstrates strong WebGL/shader knowledge applicable to heatmap rendering

---

## 3. Following List (15 people) — Trading Relevance Analysis

### Tier 1: Highly Trading-Relevant

#### [nkaz001](https://github.com/nkaz001) — "Serious Hobbyist"
**454 followers | Following: 1 (sebjai)**

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [hftbacktest](https://github.com/nkaz001/hftbacktest) | **3,804** ⭐ | Rust/Python | HFT & MM backtesting with L2/L3 OB, queue positions, latency modeling. Live trading on Binance Futures & Bybit |
| [algotrading-example](https://github.com/nkaz001/algotrading-example) | 314 ⭐ | Jupyter | Backtesting using **order book imbalances** |
| [collect-binancefutures](https://github.com/nkaz001/collect-binancefutures) | 107 ⭐ | Python | Binance Futures trade & depth data collector |
| [market-making-backtest](https://github.com/nkaz001/market-making-backtest) | 80 ⭐ | Jupyter | MM backtesting on BitMEX |
| [sample-trading-bot](https://github.com/nkaz001/sample-trading-bot) | 55 ⭐ | Python | Binance Futures sample algo bot |
| [sample-market-maker](https://github.com/nkaz001/sample-market-maker) | 28 ⭐ | Python | Market maker sample |
| [gridtrading](https://github.com/nkaz001/gridtrading) | 25 ⭐ | Jupyter | Grid trading |
| [data-tardis](https://github.com/nkaz001/data-tardis) | 20 ⭐ | Jupyter | Data processing |

**Feature Relevance:** Orderbook Imbalances, Real-time data processing, Exchange APIs, 1s Timeframes (tick data), Bucketed Trades

---

#### [beatzxbt](https://github.com/beatzxbt) — via folio-qnt22 (2nd hop)
**288 followers**

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [smm](https://github.com/beatzxbt/smm) | **598** ⭐ | Python | Simple crypto market maker (Binance, Bybit, OKX). Template repo. DegenSugarBoo forked this. |
| [mm-toolbox](https://github.com/beatzxbt/mm-toolbox) | **230** ⭐ | Python | Fast MM functions: orderbook management, candle aggregation, moving averages, WebSocket, Numba JIT |
| [cxchange](https://github.com/beatzxbt/cxchange) | 3 ⭐ | Python | Exchange connector |

**Feature Relevance:** Exchange APIs, Orderbook Imbalances, Real-time data processing, 1s Timeframes, Custom Timeframes

---

#### [sstoikov](https://github.com/sstoikov) — Sasha Stoikov (Academic)

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [microprice](https://github.com/sstoikov/microprice) | **442** ⭐ | Jupyter | Microprice model — fair price estimation from LOB |

**Feature Relevance:** Orderbook Imbalances, SL/TP Theory (academic microstructure)

---

#### [richmanbtc](https://github.com/richmanbtc) — Crypto ML Trader

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [mlbot_tutorial](https://github.com/richmanbtc/mlbot_tutorial) | **513** ⭐ | Jupyter | ML-based algorithmic trading bot tutorial |
| [alphapool ecosystem](https://github.com/richmanbtc) | Various | Python/JS | Full quant trading platform: trader, analyzer, portfolio, data pipelines |
| [balancer-bot](https://github.com/richmanbtc/balancer-bot) | 5 ⭐ | JS | DEX trading bot |
| [basis-trading-stablecoin](https://github.com/richmanbtc/basis-trading-stablecoin) | 2 ⭐ | TypeScript | Basis trading stablecoin |

**Feature Relevance:** Exchange APIs, Custom Scripting concepts

---

### Tier 2: Moderately Trading-Relevant

#### [gingfacekillah](https://github.com/gingfacekillah) — Andrew Mack (Quant/Sports)

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [Financial-Modelling-in-R](https://github.com/gingfacekillah/Financial-Modelling-in-R) | 64 ⭐ | R | Financial modeling & options scripts |
| [Sports-Modelling-in-R](https://github.com/gingfacekillah/Sports-Modelling-in-R) | 28 ⭐ | R | Sports modeling |
| [commodity-trading-dashboards-in-shiny](https://github.com/gingfacekillah/commodity-trading-dashboards-in-shiny) | — | R | Shiny commodity trading dashboard |
| [Gold-Futures-Algorithmic-Trading-System-in-R](https://github.com/gingfacekillah/Gold-Futures-Algorithmic-Trading-System-in-R) | — | R | Gold futures algo system |
| [DSTrading](https://github.com/gingfacekillah/DSTrading) | — | R | Digital Signal Trading (John Ehlers indicators) |

**Feature Relevance:** Custom Timeframes, Custom Scripting concepts

---

#### [robertmartin8](https://github.com/robertmartin8) — Robert Martin

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [MachineLearningStocks](https://github.com/robertmartin8/MachineLearningStocks) | **1,932** ⭐ | Python | ML stock predictions with scikit-learn |
| [CryptoGraphArb](https://github.com/robertmartin8/CryptoGraphArb) | 182 ⭐ | Python | Graph algorithms for crypto arbitrage |
| [BinancePremiums](https://github.com/robertmartin8/BinancePremiums) | 54 ⭐ | Python | Crypto spot-futures premium dashboard |
| [pValuation](https://github.com/robertmartin8/pValuation) | 154 ⭐ | Jupyter | Quantamental finance research |

**Feature Relevance:** Exchange APIs (Binance), Net Longs/Shorts (premiums imply funding/basis)

---

#### [alexbotsula](https://github.com/alexbotsula) — Quant Finance

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [Price_direction_forecast](https://github.com/alexbotsula/Price_direction_forecast) | 49 ⭐ | Jupyter | Price direction forecasting |
| [XTX_Challenge](https://github.com/alexbotsula/XTX_Challenge) | 28 ⭐ | Jupyter | XTX Forecasting Challenge 2019 (XGBoost, Kalman filter) |
| [Mean_reverting_portfolio](https://github.com/alexbotsula/Mean_reverting_portfolio) | 11 ⭐ | Jupyter | Mean reversion portfolio |

---

#### [folio-qnt22](https://github.com/folio-qnt22) — Quant Trader (35 following)

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [VisualHFT](https://github.com/folio-qnt22/VisualHFT) (fork) | 2 ⭐ | C# | HFT visualization (fork of VisualHFT/VisualHFT) |
| [bybit-smm](https://github.com/folio-qnt22/bybit-smm) | — | Python | Bybit market maker |
| [KDE](https://github.com/folio-qnt22/KDE) | — | Rust | KDE for Polymarket |
| [Binance-fut-correlt](https://github.com/folio-qnt22/Binance-fut-correlt) | 7 ⭐ | Python | Binance futures correlation dashboard |
| [crypto-risk-analysis](https://github.com/folio-qnt22/crypto-risk-analysis) | 3 ⭐ | Jupyter | Volatility analysis for futures |
| [cli-execution](https://github.com/folio-qnt22/cli-execution) | — | Python | CLI execution on Bybit |
| [mev-templates](https://github.com/folio-qnt22/mev-templates) (fork) | — | Solidity | MEV flashloan arb templates |

**Feature Relevance:** Exchange APIs, Real-time data processing. **Key connector node** — follows beatzxbt, beinghorizontal, slurpxbt, OctopusTakopi, CryptoRobotFr

---

#### [justinlent](https://github.com/justinlent) — San Francisco

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [PairTradeR](https://github.com/justinlent/PairTradeR) | 27 ⭐ | R | Pair trading stat arb backtesting GUI |
| [Bayesian_Optimizer_Option_Portfolios](https://github.com/justinlent/Bayesian_Optimizer_Option_Portfolios) | 7 ⭐ | Jupyter | Bayesian optimization for options portfolios |

---

### Tier 3: Non-Trading (Followed for Other Reasons)

| User | Focus | Why Followed |
|------|-------|--------------|
| [rui314](https://github.com/rui314) | C compilers, mold linker (16k ⭐) | Systems programming / Rust inspiration |
| [HarryR](https://github.com/HarryR) | zk-SNARKs, z80ai (1k ⭐), crypto(graphy) | Privacy tech, low-level computing |
| [rigtorp](https://github.com/rigtorp) | Lock-free queues, SPSC/MPMC (1.5k ⭐), C++ perf | **Low-latency infrastructure** — HFT building blocks |
| [ilpomo](https://github.com/ilpomo) | FEM solver (1 repo) | Likely personal connection |
| [dair-ai](https://github.com/dair-ai) | Prompt Engineering Guide (72k ⭐), ML courses | AI/ML education |
| [StatMixedML](https://github.com/StatMixedML) | XGBoostLSS (694 ⭐), probabilistic ML | ML for tabular/time series data |

---

## 4. Starred Repos — Trading-Relevant Gems

### Tier 1: Direct Feature Relevance

| Repo | Stars | Lang | Feature Relevance |
|------|-------|------|-------------------|
| [Elenchev/order-book-heatmap](https://github.com/Elenchev/order-book-heatmap) | 496 ⭐ | JS (D3.js) | **HD Heatmaps, Aggregated Orderbooks** — Binance LOB heatmap with time & sales |
| [bmoscon/cryptofeed](https://github.com/bmoscon/cryptofeed) | 2,771 ⭐ | Python | **Exchange APIs, Real-time data processing, Aggregated OI, Liquidation Heatmap** — 40+ exchanges, L1/L2/L3, liquidations, funding, OI |
| [beatzxbt/mm-toolbox](https://github.com/beatzxbt/mm-toolbox) | 230 ⭐ | Python | **Orderbook Imbalances, Real-time data processing** — Numba JIT, OB management, candles |
| [purefinance/mmb](https://github.com/purefinance/mmb) | 598 ⭐ | Rust | **Exchange APIs** — Rust MM bot for Binance, Bitmex, IBKR, Serum |
| [hello2all/gamma-ray](https://github.com/hello2all/gamma-ray) | 424 ⭐ | C++ | **Exchange APIs, Real-time data processing** — Sub-100μs HFT bot, Avellaneda-Stoikov |
| [jose-donato/crypto-futures-arbitrage-scanner](https://github.com/jose-donato/crypto-futures-arbitrage-scanner) | 117 ⭐ | Go | **Exchange APIs, Hyperliquid MBO** — 9 exchanges incl. Hyperliquid, Paradex, OKX. TradingView Lightweight Charts |
| [rorysroes/SGX-Full-OrderBook-Tick-Data-Trading-Strategy](https://github.com/rorysroes/SGX-Full-OrderBook-Tick-Data-Trading-Strategy) | 2,241 ⭐ | Jupyter | **Orderbook Imbalances, Bucketed Trades** — Full OB tick data HFT strategies |
| [im1235/ISAC](https://github.com/im1235/ISAC) | 151 ⭐ | Python | **SL/TP Theory** — RL-based Avellaneda-Stoikov risk aversion control |
| [jshellen/HFT](https://github.com/jshellen/HFT) | 616 ⭐ | Jupyter | **Orderbook Imbalances** — HF market making |
| [Crypto-toolbox/HFT-Orderbook](https://github.com/Crypto-toolbox/HFT-Orderbook) | 1,325 ⭐ | C | **Aggregated DOM, Real-time data processing** — O(1) cancel/execute LOB in C/Python |
| [bmoscon/orderbook](https://github.com/bmoscon/orderbook) | 311 ⭐ | Python/C | **Aggregated DOM** — Fast L2/L3 orderbook in C for Python |
| [txu2014/binance_orderflow](https://github.com/txu2014/binance_orderflow) | 33 ⭐ | HTML | **Footprints, CVD** — Derive order flow from tick/trade data |
| [sadighian/crypto-rl](https://github.com/sadighian/crypto-rl) | 947 ⭐ | Python | **Real-time data processing** — Deep RL toolkit for LOB replay |
| [sstoikov/microprice](https://github.com/sstoikov/microprice) | 442 ⭐ | Jupyter | **Orderbook Imbalances** — Fair price from LOB |

### Tier 2: Supporting Tools & Education

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [iterativv/NostalgiaForInfinity](https://github.com/iterativv/NostalgiaForInfinity) | 2,960 ⭐ | Python | Freqtrade strategy |
| [freqtrade/freqtrade-strategies](https://github.com/freqtrade/freqtrade-strategies) | 4,935 ⭐ | Python | Freqtrade strategy collection |
| [JerBouma/AlgorithmicTrading](https://github.com/JerBouma/AlgorithmicTrading) | 1,053 ⭐ | Jupyter | Arb strategies (dual listing, options, stat arb) |
| [letianzj/QuantResearch](https://github.com/letianzj/QuantResearch) | 2,842 ⭐ | Jupyter | Quant strategies & backtests |
| [BlackArbsCEO/Adv_Fin_ML_Exercises](https://github.com/BlackArbsCEO/Adv_Fin_ML_Exercises) | 1,892 ⭐ | Jupyter | Advances in Financial ML exercises |
| [CyberPunkMetalHead/Binance-volatility-trading-bot](https://github.com/CyberPunkMetalHead/Binance-volatility-trading-bot) | 3,492 ⭐ | Python | Volatility trading bot |
| [Behappy123/market-maker](https://github.com/Behappy123/market-maker) | 238 ⭐ | Python | BitMEX MM algo |
| [DGabri/manage_binance_orderbook](https://github.com/DGabri/manage_binance_orderbook) | 10 ⭐ | Python | Binance OB management |
| [rayzhudev/Binance-Orderbook](https://github.com/rayzhudev/Binance-Orderbook) | 17 ⭐ | Python | Local Binance OB copy |
| [lucky7323/tick_collector](https://github.com/lucky7323/tick_collector) | 36 ⭐ | Python | Binance tick data collector |
| [cbailes/awesome-deep-trading](https://github.com/cbailes/awesome-deep-trading) | 1,843 ⭐ | — | ML trading resources list |
| [Delgan/loguru](https://github.com/Delgan/loguru) | 23,688 ⭐ | Python | Python logging (utility) |

### Tier 3: Non-Trading Stars

| Repo | Stars | Description |
|------|-------|-------------|
| trasta298/keifu | 690 ⭐ | Git TUI |
| gibbok/typescript-book | 10,138 ⭐ | TypeScript guide |
| mesozoic-egg/tinygrad-notes | 460 ⭐ | Tinygrad tutorials |
| HarryR/z80ai | 1,049 ⭐ | 2-bit LLM on Z80 |
| FFmpeg/asm-lessons | 11,499 ⭐ | Assembly lessons |
| freebendy/ben-books | 47 ⭐ | Books |
| PacktPublishing/The-FPGA-Programming-Handbook | 136 ⭐ | FPGA programming |
| jwasham/coding-interview-university | 337,894 ⭐ | CS study plan |
| gurugio/lowlevelprogramming-university | 12,584 ⭐ | Low-level programming |
| veyselusta/programming-language-research | 262 ⭐ | PL theory |
| ImplFerris/LearnRust | 1,987 ⭐ | Rust learning |

---

## 5. 2nd Hop Discoveries

### 5.1 Via nkaz001 → sebjai

#### [sebjai](https://github.com/sebjai) — Prof. Sebastian Jaimungal (U of Toronto)
**Mathematical Finance Professor — RL + Algorithmic Trading**

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [robust-risk-aware-rl](https://github.com/sebjai/robust-risk-aware-rl) | 36 ⭐ | Jupyter | Robust risk-aware RL for trading |
| [Portfolio-Wasserstein-Ball](https://github.com/sebjai/Portfolio-Wasserstein-Ball) | 15 ⭐ | Jupyter | Distributionally robust portfolio optimization |
| [STA2536](https://github.com/sebjai/STA2536) | 14 ⭐ | Jupyter | Data Science for Risk Modeling course |
| [STA2503](https://github.com/sebjai/STA2503) | 11 ⭐ | Jupyter | Applied Probability in Mathematical Finance |
| [ddpg-stat-arb](https://github.com/sebjai/ddpg-stat-arb) | 7 ⭐ | Jupyter | DDPG for statistical arbitrage |
| [RL-intro](https://github.com/sebjai/RL-intro) | 7 ⭐ | Python | RL examples for financial modeling |

**Feature Relevance:** SL/TP Theory (academic underpinnings), Custom Scripting (RL-based strategy)

---

### 5.2 Via nkaz001's Stars

| Repo | Stars | Lang | Description | Feature Relevance |
|------|-------|------|-------------|-------------------|
| [automatedalgo/apex](https://github.com/automatedalgo/apex) | 70 ⭐ | C++ | Algo trading research & execution platform | Exchange APIs |
| [im1235/EIE](https://github.com/im1235/EIE) | 38 ⭐ | Java | Poisson intensity calibration for limit order execution | Orderbook Imbalances |
| [grayvalley/microprice-calibration](https://github.com/grayvalley/microprice-calibration) | 64 ⭐ | Python | Microprice calibration on BitMEX | Orderbook Imbalances |
| [xhshenxin/Micro_Price](https://github.com/xhshenxin/Micro_Price) | 56 ⭐ | Jupyter | Microprice implementation | Orderbook Imbalances |
| [hfx07/xsimulator](https://github.com/hfx07/xsimulator) | 9 ⭐ | C++ | Exchange simulator for HFT backtesting | Real-time data processing |
| [wcskkk375/CryptoBacktest](https://github.com/wcskkk375/CryptoBacktest) | 18 ⭐ | C++ | C++ crypto tick data backtesting | 1s Timeframes |
| [rburkholder/trade-frame](https://github.com/rburkholder/trade-frame) | 651 ⭐ | C++ | C++17 trading library with sample apps | Exchange APIs |
| [jifengthu/awesome_hft_factors](https://github.com/jifengthu/awesome_hft_factors) | 29 ⭐ | Jupyter | HFT factor research | Bucketed Trades |
| [mmssss/hft-market-making](https://github.com/mmssss/hft-market-making) | 144 ⭐ | Jupyter | HFT backtesting simulator + Stoikov strategy | Orderbook Imbalances |
| [graceyangfan/nautilus_tutorial](https://github.com/graceyangfan/nautilus_tutorial) | 39 ⭐ | Jupyter | Nautilus Trader examples | Exchange APIs |
| [edtechre/pybroker](https://github.com/edtechre/pybroker) | 3,233 ⭐ | Python | Algo trading with ML | Custom Scripting |
| [miroblog/limit_orderbook_prediction](https://github.com/miroblog/limit_orderbook_prediction) | 143 ⭐ | Python | LOB prediction | Orderbook Imbalances |
| [TheFourGreatErrors/alpha-rptr](https://github.com/TheFourGreatErrors/alpha-rptr) | 636 ⭐ | Python | Trading bot for Binance, Bybit, BitMEX | Exchange APIs |
| [ivopetiz/algotrading](https://github.com/ivopetiz/algotrading) | 1,512 ⭐ | Python | Algo trading framework for crypto | Exchange APIs |

---

### 5.3 Via folio-qnt22 → Key Follows

#### [beinghorizontal](https://github.com/beinghorizontal) — Market Profile Specialist
**51 repos | India-based trader**

| Repo | Stars | Lang | Description | Feature Relevance |
|------|-------|------|-------------|-------------------|
| [tpo_project](https://github.com/beinghorizontal/tpo_project) | **130** ⭐ | Python | Live auction market theory charts with TPO, POC, VAH, IB, Rotational Factor | **Market Profile/TPO, Custom Session TPO** |
| [py-market-profile](https://github.com/beinghorizontal/py-market-profile) (fork) | 67 ⭐ | Python | Market/Volume Profile from Pandas DataFrames | **Market Profile/TPO** |
| [tpo_btc](https://github.com/beinghorizontal/tpo_btc) | 22 ⭐ | Python | BTC market profile with live Dash streaming | **Market Profile/TPO** |
| [BhavFnO](https://github.com/beinghorizontal/BhavFnO) | 42 ⭐ | Python | NSE F&O trend analysis | Aggregated OI (derivatives) |
| [tradingview](https://github.com/beinghorizontal/tradingview) | 44 ⭐ | Python | TradingView analytics | Custom Scripting |

**HIGH VALUE FIND** — Only open-source Market Profile/TPO with live data. Uses Plotly/Dash. Calculates POC, VAH, VAL, Initial Balance, Rotational Factor.

---

#### [slurpxbt](https://github.com/slurpxbt) — Crypto Execution Specialist

| Repo | Stars | Lang | Description | Feature Relevance |
|------|-------|------|-------------|-------------------|
| [cli-execution](https://github.com/slurpxbt/cli-execution) | 34 ⭐ | Python | CLI execution for Bybit perps & Binance spot | Exchange APIs |
| [Bybit_execution_cli](https://github.com/slurpxbt/Bybit_execution_cli) | 29 ⭐ | Python | Bybit spot & futures CLI | Exchange APIs |
| [crypto-backtest-module](https://github.com/slurpxbt/crypto-backtest-module) | 21 ⭐ | Python | Backtesting module | Custom Scripting |
| [defillama_library](https://github.com/slurpxbt/defillama_library) | 14 ⭐ | Python | DefiLlama Python connector | Exchange APIs (DeFi) |
| [Binance_cli_execution](https://github.com/slurpxbt/Binance_cli_execution) | 7 ⭐ | Python | Binance spot CLI execution | Exchange APIs |

---

#### [CryptoOda](https://github.com/CryptoOda) — Crypto Trader

| Repo | Stars | Lang | Description | Feature Relevance |
|------|-------|------|-------------|-------------------|
| [lightweight-charts](https://github.com/CryptoOda/lightweight-charts) (fork) | — | TypeScript | Fork of TradingView lightweight-charts | WebGL/Canvas rendering |
| [liquidationCalculator](https://github.com/CryptoOda/liquidationCalculator) (fork) | — | JS | Binance perpetuals liquidation calculator | Liquidation Heatmap |

---

#### [CryptoRobotFr](https://github.com/CryptoRobotFr) — Crypto Bot Builder (522 followers)

| Repo | Stars | Lang | Description | Feature Relevance |
|------|-------|------|-------------|-------------------|
| [HyperLiquid-Copy-Strategy](https://github.com/CryptoRobotFr/HyperLiquid-Copy-Strategy) | 7 ⭐ | Python | **Hyperliquid** copy trading | **Hyperliquid MBO, Exchange APIs** |
| [backtest_tools](https://github.com/CryptoRobotFr/backtest_tools) | 69 ⭐ | Jupyter | Historical analysis tools | Custom Scripting |
| [TrueStrategy](https://github.com/CryptoRobotFr/TrueStrategy) | 68 ⭐ | Jupyter | Strategy framework | Custom Scripting |
| [Backtest-Tools-V2](https://github.com/CryptoRobotFr/Backtest-Tools-V2) | 49 ⭐ | Jupyter | V2 backtesting | Custom Scripting |
| [live_tools](https://github.com/CryptoRobotFr/live_tools) | 42 ⭐ | Python | Live trading tools | Exchange APIs |
| [General-code-trading-bot](https://github.com/CryptoRobotFr/General-code-trading-bot) | 40 ⭐ | Jupyter | Trading bot code | Exchange APIs |

---

#### [kryzhikov](https://github.com/kryzhikov) — HFT Researcher

| Repo | Stars | Lang | Description | Feature Relevance |
|------|-------|------|-------------|-------------------|
| [hftbacktestchecker](https://github.com/kryzhikov/hftbacktestchecker) | — | Python | HFT backtesting with queue positions & latency | Orderbook Imbalances, 1s Timeframes |
| [CryptoBacktest](https://github.com/kryzhikov/CryptoBacktest) | — | C++ | Crypto tick data backtesting | 1s Timeframes |
| [analysis-sharing](https://github.com/kryzhikov/analysis-sharing) | — | Jupyter | Quant analyses on Crypto Lake data | Real-time data processing |
| [awesome_hft_factors_chn](https://github.com/kryzhikov/awesome_hft_factors_chn) | — | Jupyter | HFT factor research (Chinese) | Bucketed Trades |

---

#### [jo-cho](https://github.com/jo-cho) — ML Trading Researcher (via folio-qnt22)

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [Technical_Analysis_and_Feature_Engineering](https://github.com/jo-cho/Technical_Analysis_and_Feature_Engineering) | 198 ⭐ | Jupyter | Feature engineering for financial ML |
| [trading-rules-using-machine-learning](https://github.com/jo-cho/trading-rules-using-machine-learning) | 70 ⭐ | Jupyter | ML-driven trading strategies |

---

### 5.4 Via folio-qnt22 → VisualHFT Project

#### [VisualHFT/VisualHFT](https://github.com/VisualHFT/VisualHFT) (forked by folio-qnt22)
**C# / WPF — Desktop HFT Visualization**

| Feature | Details |
|---------|---------|
| **LOB Depth** | 10+ levels per side, real-time |
| **Analytics** | VPIN, LOB Imbalance, Market Resilience, OTT Ratio |
| **Exchanges** | Binance, Bitfinex, Bitstamp, Coinbase, Gemini, Kraken, KuCoin + generic WS |
| **Architecture** | Plugin-based, MVVM, OxyPlot charting |
| **Platform** | Windows only (WPF) |

**Feature Relevance:** Aggregated DOM, Orderbook Imbalances, Exchange APIs, Real-time data processing

---

## 6. Feature Coverage Matrix

| Feature | Repos Found |
|---------|-------------|
| **HD Heatmaps** | OpenBook, Elenchev/order-book-heatmap |
| **Aggregated Orderbooks** | OpenBook, order-book-heatmap, cryptofeed |
| **Aggregated DOM** | cli_ob, HFT-Orderbook, bmoscon/orderbook, VisualHFT |
| **Footprints** | txu2014/binance_orderflow (order flow from tick data) |
| **Filtered Footprints** | None found directly |
| **CVD** | txu2014/binance_orderflow (derivable from order flow) |
| **Market Profile/TPO** | **beinghorizontal/tpo_project** (130⭐), py-market-profile, tpo_btc |
| **Custom Session TPO** | beinghorizontal/tpo_project (IB, custom sessions) |
| **Orderbook Imbalances** | nkaz001/algotrading-example, sstoikov/microprice, mm-toolbox, VisualHFT, multiple microprice repos |
| **Liquidation Heatmap** | Telegram_liquidation_bot (data), cryptofeed (liquidation feeds), CryptoOda/liquidationCalculator |
| **Volume Bubbles** | None found directly |
| **1s Timeframes** | nkaz001/hftbacktest (tick-by-tick), collect-binancefutures, tick_collector |
| **Custom Timeframes** | beatzxbt/mm-toolbox (candle aggregation), gingfacekillah/DSTrading |
| **Dual Cluster Modes** | None found directly |
| **Net Longs/Shorts** | robertmartin8/BinancePremiums (spot-futures premiums) |
| **Aggregated OI** | cryptofeed (OI feeds from 40+ exchanges) |
| **Bucketed Trades** | SGX-Full-OrderBook (tick data strategies), awesome_hft_factors |
| **SL/TP Theory** | Stoikov-Avellaneda-MM, ISAC (RL risk control), sebjai academic repos |
| **Custom Scripting** | Multiple strategy frameworks (pybroker, freqtrade, backtest_tools) |
| **Community Indicators Marketplace** | None found |
| **WebGL/Canvas rendering** | webgl_math_shaders (WebGL2 shaders), Elenchev/order-book-heatmap (D3.js), CryptoOda/lightweight-charts fork |
| **Exchange APIs** | cryptofeed (40+), mmb (Binance/Bitmex/IBKR), cross-ex-arb-dashboard (5 incl. Hyperliquid), hftbacktest (Binance/Bybit) |
| **Hyperliquid MBO** | cross-ex-arb-dashboard, jose-donato/crypto-futures-arbitrage-scanner, CryptoRobotFr/HyperLiquid-Copy-Strategy |
| **Real-time data processing** | OpenBook, hftbacktest, cryptofeed, cross-ex-arb-dashboard, mm-toolbox |

---

## 7. Network Graph Summary

```
DegenSugarBoo (14 repos, 27 followers)
├── FOLLOWS (15 people)
│   ├── nkaz001 ★★★ → hftbacktest (3.8k⭐), algotrading-example, collect-binancefutures
│   │   └── follows sebjai (U of Toronto prof, RL + algo trading)
│   │   └── stars: microprice ecosystem, HFT-Orderbook, alpha-rptr, pybroker
│   ├── sstoikov ★★ → microprice (442⭐)
│   ├── richmanbtc ★★ → mlbot_tutorial (513⭐), alphapool ecosystem
│   ├── robertmartin8 ★★ → MachineLearningStocks (1.9k⭐), CryptoGraphArb, BinancePremiums
│   ├── folio-qnt22 ★★ (KEY CONNECTOR NODE)
│   │   ├── follows beatzxbt → smm (598⭐), mm-toolbox (230⭐)
│   │   ├── follows beinghorizontal → tpo_project (130⭐) ← MARKET PROFILE!
│   │   ├── follows slurpxbt → cli-execution tools
│   │   ├── follows CryptoRobotFr → Hyperliquid copy strategy
│   │   ├── follows kryzhikov → HFT backtesting
│   │   ├── follows OctopusTakopi (already known)
│   │   └── follows jo-cho → ML trading (198⭐ feature engineering)
│   ├── gingfacekillah ★ → Financial modeling in R, DSTrading (Ehlers)
│   ├── alexbotsula ★ → XTX Challenge, price forecasting
│   ├── justinlent ★ → PairTradeR
│   ├── rigtorp ★ → Low-latency infra (SPSCQueue 1.2k⭐)
│   ├── rui314 → Compilers (not trading)
│   ├── HarryR → zk-SNARKs (not trading)
│   ├── ilpomo → FEM (not trading)
│   ├── dair-ai → ML education
│   └── StatMixedML → Probabilistic ML
│
├── STARS (78 repos) — Key finds:
│   ├── Elenchev/order-book-heatmap (496⭐) — D3.js LOB heatmap
│   ├── bmoscon/cryptofeed (2.8k⭐) — 40+ exchange feed handler
│   ├── Crypto-toolbox/HFT-Orderbook (1.3k⭐) — C LOB implementation
│   ├── purefinance/mmb (598⭐) — Rust MM bot
│   ├── hello2all/gamma-ray (424⭐) — C++ sub-100μs HFT bot
│   ├── jose-donato/crypto-futures-arbitrage-scanner (117⭐) — 9 exchanges incl. Hyperliquid
│   └── txu2014/binance_orderflow (33⭐) — Order flow from tick data
│
└── FORKED: beatzxbt/smm → market_maker (Bybit MM)
```

---

## 8. Most Valuable Finds (Ranked)

### Top 5 Repos for Our Project

1. **nkaz001/hftbacktest** (3,804⭐, Rust/Python) — Most comprehensive open-source HFT framework. L2/L3 OB reconstruction, tick-by-tick simulation, latency modeling, queue position tracking. Live trading on Binance Futures & Bybit. Could be used as a strategy backtesting engine.

2. **beinghorizontal/tpo_project** (130⭐, Python) — **Only open-source Market Profile/TPO with live data found in this network.** Implements POC, VAH, VAL, Initial Balance, Rotational Factor. Uses Plotly/Dash. Directly relevant to Market Profile/TPO and Custom Session TPO features.

3. **bmoscon/cryptofeed** (2,771⭐, Python) — Exchange-agnostic feed handler for 40+ exchanges. L1/L2/L3 orderbooks, trades, funding, OI, liquidations. The backbone for any multi-exchange aggregation feature.

4. **Elenchev/order-book-heatmap** (496⭐, JS/D3.js) — Browser-based Binance LOB heatmap with time & sales. D3.js rendering approach could inform our WebGL heatmap architecture.

5. **beatzxbt/smm + mm-toolbox** (598⭐ + 230⭐, Python) — Production-quality MM framework with Numba JIT optimization. The mm-toolbox's orderbook, candle aggregation, and WebSocket patterns are reusable for our real-time data pipeline.

### Top 5 People to Watch

1. **nkaz001** — Rust HFT specialist, hftbacktest is gold standard for tick-level backtesting
2. **beinghorizontal** — Market Profile/TPO expert, only open-source TPO with live charts
3. **beatzxbt** — Practical MM tools with performance optimization (Numba)
4. **folio-qnt22** — Key connector node linking multiple trading communities
5. **sebjai** (Prof. Jaimungal) — Academic foundation for RL-based trading strategies

### Hidden Gems

- **txu2014/binance_orderflow** (33⭐) — Deriving order flow (footprints/CVD) from tick data. Low-star but directly relevant to Footprints and CVD features.
- **jose-donato/crypto-futures-arbitrage-scanner** (117⭐) — Go backend with Hyperliquid integration and TradingView Lightweight Charts. Architecture reference for our multi-exchange scanner.
- **Crypto-toolbox/HFT-Orderbook** (1,325⭐) — C implementation of LOB with O(1) operations. Performance reference for our orderbook engine.
- **DegenSugarBoo/webgl_math_shaders** — Demonstrates WebGL2 shader expertise (domain warping, FBM, tone mapping) that could be applied to heatmap rendering.
- **grayvalley/microprice-calibration** (64⭐) — Microprice model on BitMEX data. Fair-price estimation from LOB imbalance.

---

## 9. Key Takeaways

1. **DegenSugarBoo is building exactly what we need** — OpenBook (Rust heatmap) + cross-ex-arb (Hyperliquid) + WebGL shader skills. The combination of egui/Rust for desktop and WebGL expertise makes them a potential contributor or reference.

2. **Market Profile/TPO is the scarcest feature** — beinghorizontal's tpo_project is the ONLY open-source implementation found with live charting. This is a high-value differentiator.

3. **Hyperliquid integration is spreading** — Found in DegenSugarBoo's cross-ex-arb, jose-donato's arb scanner, and CryptoRobotFr's copy strategy. The ecosystem is growing.

4. **The nkaz001→sstoikov→microprice pipeline** represents the academic-to-production path for orderbook analytics. Microprice, order imbalance, and queue position modeling are well-researched in this network.

5. **Missing features from this network:** Volume Bubbles, Dual Cluster Modes, Filtered Footprints, and Community Indicators Marketplace have no direct implementations found. These represent our differentiation opportunity.

6. **folio-qnt22 is a key network node** connecting DegenSugarBoo's world to beatzxbt, beinghorizontal, slurpxbt, and CryptoRobotFr. Worth monitoring for new discoveries.
