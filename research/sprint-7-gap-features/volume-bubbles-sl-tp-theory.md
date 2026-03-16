# Volume Bubbles & SL/TP Heatmap Theory: Open-Source Research Report

**Date:** 2026-03-16
**Method:** Spider web through GitHub developer networks, TradingView community, academic literature, and commercial platform documentation.

---

## Table of Contents

1. [Feature 1: Volume Bubbles](#feature-1-volume-bubbles)
   - [Concept Definition](#concept-definition)
   - [Tier 1: Full GitHub Repos with Bubble/Circle Visualization](#tier-1-full-github-repos-with-bubblecircle-visualization)
   - [Tier 2: TradingView Pine Script (Open Source)](#tier-2-tradingview-pine-script-open-source)
   - [Tier 3: Platform-Specific Implementations](#tier-3-platform-specific-implementations)
   - [Tier 4: Related Order Flow Repos (No Bubbles, But Foundational)](#tier-4-related-order-flow-repos)
   - [Algorithm Deep Dive: How Volume Bubbles Work](#algorithm-deep-dive-how-volume-bubbles-work)
   - [Commercial Reference: Bookmap & Overcharts](#commercial-reference-bookmap--overcharts)
2. [Feature 2: Stop Loss / Take Profit Heatmaps (General Theory)](#feature-2-stop-loss--take-profit-heatmaps-general-theory)
   - [Concept Definition](#concept-definition-1)
   - [Tier 1: Liquidation Heatmap Repos (GitHub)](#tier-1-liquidation-heatmap-repos-github)
   - [Tier 2: Smart Money / Liquidity Detection (GitHub)](#tier-2-smart-money--liquidity-detection-github)
   - [Tier 3: Liquidity Sweep Detection (GitHub + Pine Script)](#tier-3-liquidity-sweep-detection-github--pine-script)
   - [Tier 4: TradingView Indicators (Open Source Pine Script)](#tier-4-tradingview-indicators-open-source-pine-script)
   - [Academic Research on Stop-Loss Clustering](#academic-research-on-stop-loss-clustering)
   - [Algorithm Deep Dive: How to Estimate SL/TP Levels](#algorithm-deep-dive-how-to-estimate-sltp-levels)
3. [Spider Web Network Map](#spider-web-network-map)
4. [Implementation Recommendations](#implementation-recommendations)

---

## Feature 1: Volume Bubbles

### Concept Definition

Volume Bubbles (also called "Volume Dots", "Trade Dots", "Market Order Bubbles") are circles/bubbles rendered on a price-time chart where:
- **SIZE** = trade volume (larger bubble = more contracts/shares traded)
- **COLOR** = aggressor side (green = buyer-initiated, red = seller-initiated)
- **POSITION** = price and time of execution

Bookmap pioneered this commercially. It is essentially a scatter plot of executions where dot radius encodes volume magnitude.

---

### Tier 1: Full GitHub Repos with Bubble/Circle Visualization

#### 1. Elenchev/order-book-heatmap (496 stars, 110 forks, JS)
- **URL:** https://github.com/Elenchev/order-book-heatmap
- **Live demo:** https://elenchev.github.io/order-book-heatmap/
- **THIS IS THE CLOSEST OPEN-SOURCE VOLUME BUBBLES IMPLEMENTATION ON GITHUB**
- Renders circles on the heatmap where:
  - Circle **size** = total number of traded contracts in the period
  - Circle **color** = ratio of buy vs sell market orders (green = more buys, red = more sells)
  - Circle **intensity** = the dominance ratio between buy and sell
- Tech: D3.js SVG rendering, Binance WebSocket API, custom orderbook structure
- Architecture: `BinanceDataFeed.js` -> `BinanceOrderBook.js` -> `Dashboard.js` (D3 renderer)
- Limitation: Uses SVG (slow for many bubbles); author notes Canvas migration would improve performance
- **Notable forks to check:** CRY-D, IvanLetteri, ShabbirHasan1, traderlabs, ssh352, sunsetcoder, synth-o-stonks, syther-labs (110+ forks total)
- License: BSD-2-Clause

#### 2. suhaspete/Real-Time-Order-Book-Heatmap-and-Market-Data-Visualization (JS)
- **URL:** https://github.com/suhaspete/Real-Time-Order-Book-Heatmap-and-Market-Data-Visualization
- Fork/derivative of Elenchev's work with same circle visualization approach
- Circle sizes = contracts traded; colors = buy/sell ratio
- Also D3.js-based, also plans Canvas migration

#### 3. DegenSugarBoo/OpenBook (122 stars, 42 forks, Rust)
- **URL:** https://github.com/DegenSugarBoo/OpenBook
- Bookmap-style depth heatmap with live trade tape in Rust (egui/eframe)
- Panes: Heatmap, Order Book, Market Impact, Fill:Kill, Trades Tape
- Trade tape shows individual executions with side coloring and min-notional filter
- **Does NOT render trade bubbles on the heatmap** - trades are in a separate tape pane
- Data: Binance Futures WebSocket, 100ms depth updates
- License: Not specified

#### 4. DegenSugarBoo/cli_ob (10 stars, Rust)
- **URL:** https://github.com/DegenSugarBoo/cli_ob
- Terminal UI with "60-second rolling chart with trade bubble markers and volume bars"
- **However, author acknowledges: "The trades are not properly displayed" and "The volume plots are also not good"**
- Essentially abandoned in favor of the GUI OpenBook project
- Tech: Rust, tokio, ratatui TUI framework

#### 5. Ameobea/cryptoviz (79 stars, 32 forks, JS)
- **URL:** https://github.com/Ameobea/cryptoviz
- DOM visualization for Poloniex with trade indicators "rendered with sizing proportional to transaction magnitude"
- Uses dual canvases for performance (one for trade lines/indicators, another for volume)
- Tech: PaperJS rendering, React, DvaJS
- License: MIT
- **Trade indicators ARE sized by volume** making this a partial volume-bubble implementation

#### 6. srlcarlg/srl-ctrader-indicators (49 stars, 17 forks, C#)
- **URL:** https://github.com/srlcarlg/srl-ctrader-indicators
- Order Flow Ticks v2.0 indicator includes **"Bubbles Chart + Levels"** visualization mode
- This is a proper Volume Bubbles implementation for the cTrader platform
- Also has: Volume Profile, TPO Profile, Weis & Wyckoff, Anchored VWAP
- License: Apache-2.0
- **Notable stargazers to spider:** bcronje, YesOrNotCtrader, Taffsigg, lee890720

#### 7. srlcarlg/srl-python-indicators (25 stars, 12 forks, Python)
- **URL:** https://github.com/srlcarlg/srl-python-indicators
- Python port of the above, synced with the C# version
- Has `OrderFlowAggregated` class with a **`plot_bubbles()`** method
- Uses Plotly for rendering
- **This is the most accessible Python volume bubbles implementation**
- License: Apache-2.0

---

### Tier 2: TradingView Pine Script (Open Source)

All of these are viewable/copyable directly on TradingView:

#### 1. Bubbles Volume [BigBeluga]
- **URL:** https://www.tradingview.com/script/bkTt2nSZ-Bubbles-Volume-BigBeluga/
- Open-source Pine Script v5
- Bubble size scales with volume, heatmap coloring option (cool-to-hot gradient)
- Detects significant volume levels shown as horizontal lines
- Customizable threshold for filtering low-volume bubbles

#### 2. Volume Bubbles [R2D2_4Life]
- **URL:** https://www.tradingview.com/script/eHFxSlVl-Volume-Bubbles/
- Open-source Pine Script v5
- **Algorithm:**
  - Calculates 20-period SMA of volume (configurable)
  - Flags candles where volume > SMA * multiplier (default 2x, configurable 2.0-4.0)
  - Bubble sizing tiers: Huge (>1M), Large (500K-1M), Normal (<500K)
  - Green bubbles on bullish candles (at low), red on bearish (at high)
  - Transparency scales with volume ratio
- Includes whale buy/sell alert conditions

#### 3. Delta Volume Bubbles [shui2967]
- **URL:** https://www.tradingview.com/script/b01arIwW-Delta-Volume-Bubbles/
- Open-source Pine Script
- **Statistical z-score approach (most sophisticated):**
  ```
  delta_mean = ta.sma(net_delta, delta_avg_length)
  delta_stdev = ta.stdev(net_delta, delta_avg_length)
  delta_strength = abs((net_delta - delta_mean) / delta_stdev)
  ```
- Size tiers by z-score: Tiny (<0.3), Small (0.3-0.7), Normal (0.7-1.2), Large (1.2-2.0), Huge (>2.0)
- Two color modes: Flow-Based (buy/sell aggression) and Intensity (statistical significance)
- Percentile-based filtering (default: 60th percentile for bubbles, 90th for labels)

#### 4. Market Order Bubbles [VEGAlgo]
- **URL:** https://www.tradingview.com/script/u20dLony-Market-Order-Bubbles/
- Detects deviations in volume using WMA + statistical deviation for "surge intensity"

#### 5. Tick-Based Delta Volume Bubbles [shui2967]
- **URL:** https://www.tradingview.com/script/L6LHUQDG-Tick-Based-Delta-Volume-Bubbles/
- Real-time tick-level delta analysis (not bar-close)

#### 6. Delta Volume Bubble [Quant Z-Score] [tncylyv]
- **URL:** https://www.tradingview.com/script/m2Z0v7Jw-Delta-Volume-Bubble-Quant-Z-Score-by-tncylyv/
- Calculates per-candle VWAP to position bubble at the exact price where heaviest volume occurred
- Z-Score approach with 200-period volume baseline

#### 7. Volume Bubbles & Liquidity Heatmap [LuxAlgo]
- **URL:** https://www.tradingview.com/script/9B93ZOA5-Volume-Bubbles-Liquidity-Heatmap-LuxAlgo/
- Combines volume bubbles with a liquidity heatmap
- Multi-timeframe support, modes: total volume, buy/sell volume, delta volume
- Bubble size proportional to volume, color = dominant side (green=buy, red=sell)
- Renders across last 2,000 bars by default

---

### Tier 3: Platform-Specific Implementations

#### 1. Volume Bubbles (MQL5 / MetaTrader 5)
- **URL:** https://www.mql5.com/en/market/product/152023
- Free download for MT5
- Calculates net volume delta, renders as sized/colored bubbles on price chart
- Uses tick-by-tick estimation for Forex (correlation >80% with actual volume per studies cited)

#### 2. Volume Bubbles OrderFlow Footprint (MQL5)
- **URL:** https://www.mql5.com/en/market/product/162775
- Combines footprint chart with volume bubbles
- Efficient MQL5 library for drawing, configurable max sizes

#### 3. gbzenobi/CSharp-NT8-OrderFlowKit (314 stars, 136 forks, C#)
- **URL:** https://github.com/gbzenobi/CSharp-NT8-OrderFlowKit
- Comprehensive NinjaTrader 8 order flow toolkit
- Includes: Bookmap heatmap, Footprint/Cluster charts, Volume Profile, Volume Filter
- Volume Filter uses circle geometry for detection
- License: Not specified

#### 4. BookmapAPI/python-api (Official)
- **URL:** https://github.com/BookmapAPI/python-api
- Official Bookmap addon API for Python
- Can subscribe to depth data and trade data streams
- Not a standalone implementation but allows building custom volume dot visualizations on top of Bookmap

---

### Tier 4: Related Order Flow Repos (No Bubbles, But Foundational)

| Repo | Stars | Lang | Notes |
|------|-------|------|-------|
| [tysonwu/stack-orderflow](https://github.com/tysonwu/stack-orderflow) | 131 | Python | Orderflow chart GUI with Finplot/PyQtGraph. No bubbles but good foundation. |
| [AndreaFerrante/Orderflow](https://github.com/AndreaFerrante/Orderflow) | ~20 | Python | Reshapes tick data for order flow analysis. |
| [hanxixuana/flowrisk](https://github.com/hanxixuana/flowrisk) | 99 | Python | VPIN implementation (flow toxicity measure). |
| [Is0tope/3D_order_book](https://github.com/Is0tope/3D_order_book) | ~30 | JS | 3D order book visualizer for crypto. |

---

### Algorithm Deep Dive: How Volume Bubbles Work

Based on analysis of all implementations above, here is the canonical algorithm:

#### Step 1: Data Ingestion
- Subscribe to trade/execution feed (WebSocket for crypto, tick data for futures)
- Each trade has: timestamp, price, quantity, side (buy/sell aggressor)

#### Step 2: Aggregation (Multiple Modes)
Overcharts documents 5 modes, which cover the space well:
1. **Every Price Level:** One bubble per price level per bar (sum all trades at that price)
2. **Until Bid/Ask Change:** Accumulate trades until quote changes (captures momentum bursts)
3. **Minimum Size Filter:** Only show trades >= N contracts (filter noise)
4. **Time-Based:** One bubble per X seconds (fixed time windows)
5. **Volume Threshold:** New bubble each time cumulative volume reaches N (equal-volume bins)

#### Step 3: Size Calculation
Three approaches found in the wild:

**A. Linear mapping (simplest):**
```
radius = map(volume, min_volume, max_volume, min_radius, max_radius)
```

**B. Z-score normalization (shui2967/QuantAlgo approach):**
```
mean = SMA(volume, lookback)
stdev = STDEV(volume, lookback)
z_score = (volume - mean) / stdev
radius = map(z_score, 0, 3, min_radius, max_radius)
```

**C. Percentile-based (adaptive):**
```
percentile = rank(volume) / total_count
if percentile > threshold:
    radius = map(percentile, threshold, 1.0, min_radius, max_radius)
```

#### Step 4: Color Determination
Two common approaches:

**A. Binary aggressor side:**
- Green if buyer-initiated (trade at ask), Red if seller-initiated (trade at bid)
- Intensity = dominance ratio

**B. Split/gradient (Bookmap style):**
- Circle split into green and red proportional to buy/sell ratio
- Or gradient from green -> gray -> red based on net delta

#### Step 5: Rendering
- Position: (time, price) on the chart
- SVG circles (D3.js) or Canvas/WebGL for performance
- Cap at N bubbles visible (Overcharts caps at 1000, showing top-N by volume)
- Transparency can encode age or ratio

---

### Commercial Reference: Bookmap & Overcharts

**Bookmap Volume Dots:**
- Each dot = aggregate volume executed during a time period
- Size = number of executed contracts
- Split coloring: green portion = market buys, red = market sells
- Layered directly onto the depth heatmap
- Also detects iceberg orders and large trades

**Overcharts Volume Bubbles:**
- 5 aggregation modes (see above)
- Max 10 bubbles per bar (highest volume ones)
- Max 1000 bubbles on chart (highest volume ones)
- Configurable min/max pixel size
- Two color styles: Solid (split bid/ask) or Gradient (proportional blend)
- Uses 1-tick resolution data

---

## Feature 2: Stop Loss / Take Profit Heatmaps (General Theory)

### Concept Definition

SL/TP Heatmaps visualize where stop-loss and take-profit orders likely cluster on a price chart. Since these are hidden orders (not visible in the order book), they must be **estimated** from:
1. Common placement patterns (below support, above resistance, round numbers, ATR multiples)
2. Liquidation level math (entry + leverage -> liquidation price)
3. Order book analysis (walls/clusters of visible orders)
4. Historical price action (where reversals/sweeps occurred)
5. Smart money concepts (where retail traders predictably place stops)

---

### Tier 1: Liquidation Heatmap Repos (GitHub)

These calculate WHERE leveraged positions would be liquidated, which is functionally equivalent to "where forced stop-losses trigger."

#### 1. vsching/liquidation-heatmap (7 stars, 8 forks, Python)
- **URL:** https://github.com/vsching/liquidation-heatmap
- **Most complete open-source liquidation heatmap**
- **Liquidation formulas:**
  - Long Liquidation Price = Entry Price x (1 - 1/Leverage)
  - Short Liquidation Price = Entry Price x (1 + 1/Leverage)
- Supports: 5x, 10x, 25x, 50x, 100x, 125x leverage
- Exchanges: Binance, OKX, Bybit (via CCXT)
- Visualization: Plotly interactive heatmap (Coinglass color scheme)
- Frontend: Streamlit web dashboard
- Stack: Python, CCXT, Plotly, Streamlit, Docker
- Architecture: `data_fetcher.py` -> `visualizer.py` -> `streamlit_app.py`
- License: MIT

#### 2. aoki-h-jp/py-liquidation-map (119 stars, 26 forks, Python)
- **URL:** https://github.com/aoki-h-jp/py-liquidation-map
- Visualizes liquidation clusters from **actual historical execution data**
- Three filtering modes:
  - **Gross Value:** Filter trades above minimum notional value
  - **Top N:** Only largest N trades
  - **Portion:** Top percentage of trades (e.g., top 1%)
- Data sources: Binance and Bybit historical data
- Key insight: "The denser and higher the liquidation clusters, the greater their impact on price behavior when reached"
- Installable via pip from GitHub
- License: MIT

#### 3. gptcompany/liquidations (0 stars, 511 commits, Python)
- **URL:** https://github.com/gptcompany/liquidations
- **Most sophisticated architecture** - processes 4.1B rows of historical trade data
- **Uses DBSCAN clustering algorithm** to group liquidation levels into zones
- Two calculation models:
  - **OpenInterest Model (recommended):** `volume_at_price = current_OI x (whale_volume_at_price / total_whale_volume)`
  - **Binance Standard Model (legacy):** Direct calculation from trade history
  - **Ensemble Model:** Weighted average
- Pre-aggregates 1.9B rows -> 7K rows (99.9996% reduction) using DuckDB
- REST API: `/liquidations/levels`, `/liquidations/history`, `/liquidations/heatmap`
- Stack: Python, DuckDB, FastAPI, Plotly.js
- Uses Coinglass color scheme (#d9024b, #45bf87, #f0b90b)

#### 4. StephanAkkerman/liquidations-chart (41 stars, 4 forks, Python)
- **URL:** https://github.com/StephanAkkerman/liquidations-chart
- Coinglass-style liquidation chart for any Binance-listed asset
- Shows short/long liquidation volumes with BTC price overlay
- Default: 180 days of data
- Stack: Python, matplotlib
- License: MIT

#### 5. alireza787b/liquidLapse (10 stars, 5 forks, Python)
- **URL:** https://github.com/alireza787b/liquidLapse
- Captures CoinGlass heatmap snapshots over time
- Trains **CNN + LSTM model** on heatmap image sequences to predict price movements
- Pipeline: Selenium capture -> sequence generation -> model training -> FastAPI inference
- Unique approach: treats heatmaps as visual patterns rather than numerical data
- License: Apache-2.0

#### 6. ckaraca/coinglass-apiv3 (Python)
- **URL:** https://github.com/ckaraca/coinglass-apiv3
- RESTful Python client for Coinglass API v3
- Includes liquidation heatmap example visualizing BTC liquidation levels over 1 year

#### 7. Triex/TriexDev-Liquidation-Rekt-Levels-TradingView-Indicator (3 stars, Pine Script)
- **URL:** https://github.com/Triex/TriexDev-Liquidation-Rekt-Levels-TradingView-Indicator
- Shows liquidation lines at 3x, 5x, 10x, 25x, 50x leverage
- Simple but effective: horizontal lines at calculated liquidation prices
- Based on "Mex Rekt Level" indicator

---

### Tier 2: Smart Money / Liquidity Detection (GitHub)

These detect where stop-loss orders CLUSTER by analyzing price action patterns.

#### 1. joshyattridge/smart-money-concepts (1,400 stars, 662 forks, Python)
- **URL:** https://github.com/joshyattridge/smart-money-concepts
- **THE most popular open-source liquidity detection library**
- PyPI: `pip install smartmoneyconcepts`
- **Liquidity detection algorithm:**
  - Identifies price zones where multiple swing highs or lows cluster within a narrow range
  - Parameters: `swing_highs_lows` DataFrame, `range_percent` (default 0.01 = 1%)
  - Returns: Liquidity direction (+1 bullish / -1 bearish), Level, End index, Swept index
- Also includes: Order Blocks, Fair Value Gaps, Break of Structure, Change of Character
- Input: OHLCV DataFrame with lowercase columns
- **Directly relevant for estimating where retail stop-losses cluster**

#### 2. smtlab/smartmoneyconcepts (Python)
- **URL:** https://github.com/smtlab/smartmoneyconcepts
- Fork with: FVG, Highs/Lows, Order Blocks, Liquidity detection
- Usage: `smc.liquidity(ohlc, range_percent=0.01, up_thresh=0.05, down_thresh=-0.05)`

#### 3. sailoo121/ss_smc (Python)
- **URL:** https://github.com/sailoo121/ss_smc
- ICT methods package with detailed liquidity detection
- "Liquidity is when there are multiple highs within a small range of each other, or multiple lows within a small range of each other"

#### 4. tsunafire/PineScript-SMC-Strategy (Pine Script)
- **URL:** https://github.com/tsunafire/PineScript-SMC-Strategy
- Detects liquidity grabs: floors (sweep below lows) and ceilings (sweep above highs)
- Auto-calculates SL/TP based on risk-reward ratio (default 2:1)

---

### Tier 3: Liquidity Sweep Detection (GitHub + Pine Script)

These detect AFTER stop-losses have been triggered (the "sweep"), which is useful for understanding WHERE stops were.

#### 1. mitchell-917/tradingview-pinescript-lab (2 stars, Pine Script)
- **URL:** https://github.com/mitchell-917/tradingview-pinescript-lab
- Includes `liquidity-sweep-reversal-strategy.pine`
- Detection: Bullish when price sweeps below prior lows and closes back inside; bearish when sweeps above prior highs
- Also includes: Market Structure Tool, SMC, Volume Profile Lite, Support/Resistance Zones

#### 2. kulaizki/swch-bot (1 star, Python)
- **URL:** https://github.com/kulaizki/swch-bot
- Automated bot detecting liquidity sweeps + ChoCH on Bybit
- Uses pybit SDK, early-stage/framework only

#### 3. rpanchyk/mt5-liquidity-sweep-ind (13 stars, 3 forks, MQL5)
- **URL:** https://github.com/rpanchyk/mt5-liquidity-sweep-ind
- MetaTrader 5 indicator for liquidity sweep visualization

#### 4. CryptoGnome/LickHunterPRO (143 stars, 47 forks)
- **URL:** https://github.com/CryptoGnome/LickHunterPRO
- Trading bot that "counter trades liquidations along with VWAP offsets"
- Detects "large pools of liquidity getting liquidated on margin trading"
- Supports Binance Futures and Bybit
- Wiki: https://cryptognome.gitbook.io/lick-hunter/

---

### Tier 4: TradingView Indicators (Open Source Pine Script)

#### 1. Simulated Liquidation Heatmap [QuantAlgo]
- **URL:** https://www.tradingview.com/script/lCnd6Qwl-Simulated-Liquidation-Heatmap-QuantAlgo/
- **Open-source, most relevant TradingView SL/TP heatmap**
- **Algorithm:**
  - Fractal-based swing high/low detection with configurable lookback
  - Draws boxes around swing points sized by "Stop/Liquidation Zone Width (%)" parameter
  - Thermal coloring by age: hot (red/yellow) = fresh, cold (blue/purple) = aged
  - Liquidity Decay Period: zones fade over N bars
  - Round Number Filter: restricts to psychologically significant levels
  - Heat Thermometer: aggregate heat score based on age and proximity of all zones
- Key insight: "Large groups of stop orders tend to gather around obvious technical levels (like swing highs and lows)"

#### 2. Liquidity Hunter Heatmap [RickyTSpanish]
- **URL:** https://www.tradingview.com/script/nIylWlQs-Liquidity-Hunter-Heatmap/
- Combines volume surges, candle displacement, VWAP deviation, and HTF wicks
- Infers areas of "trapped traders"

#### 3. Liquidity Swings & Sweeps [outofoptions]
- **URL:** https://www.tradingview.com/script/sheisback-Liquidity-Swings-Sweeps/
- Creates visual representation of liquidity at swing highs/lows
- Rates sweep strength based on time and price

#### 4. Quantura - Liquidity Sweep & Run Levels
- **URL:** https://www.tradingview.com/script/DxbZ0Ib0-Quantura-Liquidity-Sweep-Run-Levels/
- Detects swing-based liquidity zones, visualizes sweep and run events

#### 5. BTC Liquidation Heatmap | Multi-Exchange [ProjectSyndicate]
- **URL:** https://www.tradingview.com/script/BqtqW46d-BTC-Liquidation-Heatmap-Multi-Exchange/
- Open-source, pulls volume from Binance, Coinbase, Bitstamp
- Zones color-coded by volume intensity at each level

---

### Academic Research on Stop-Loss Clustering

#### Seminal Paper: Carol Osler (2002, 2003, 2005)

**"Stop-Loss Orders and Price Cascades in Currency Markets"**
- Federal Reserve Bank of New York Staff Report No. 150
- PDF: https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr150.pdf
- SSRN: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=920687

**Key findings for implementation:**
1. **~10% of all stop-loss and take-profit orders are placed at rates ending in "00"** (round numbers)
2. Take-profit orders cluster **at** round numbers; stop-loss orders cluster **just beyond** round numbers
3. Stop-loss orders propagate trends and trigger in waves -> "price cascades"
4. Cascades most likely when: individual SL orders are unusually large AND clustered together AND offsetting TP orders are small/unclustered
5. This clustering at round numbers provides empirical justification for estimating stop locations

#### "Limit Order Clustering and Price Barriers on Financial Markets" (EFMA 2007)
- PDF: https://efmaefm.org/0efmameetings/efma%20annual%20meetings/2007-Austria/papers/0286.pdf
- Investigates trade price and limit order price clustering on Euronext
- Clustering stems from: psychological preference for prominent numbers + rational order strategies

#### "The Role of Stop-Loss Orders in Market Efficiency and Stability" (ICAART 2024)
- PDF: https://www.scitepress.org/Papers/2024/123714/123714.pdf
- Agent-based simulation of stop-loss effects on price dynamics
- Studies how SL orders affect market behavior in controlled environments

#### "Stop Hunt Detection using Indicators and Expert Advisors in the Forex Market"
- PDF: https://repository.petra.ac.id/18549/1/Publikasi1_01036_5689.pdf
- Detects "stop candles" (the second leg of M/W patterns indicating reversals)
- Green arrows = W pattern (upward reversal), Red arrows = M pattern (downward reversal)
- Backtested using MetaTrader 4 strategy tester

---

### Algorithm Deep Dive: How to Estimate SL/TP Levels

Based on all sources analyzed, here are the main algorithmic approaches:

#### Approach 1: Liquidation Level Math (Crypto Derivatives)
```
For each observed trade at entry_price with leverage L:
    long_liquidation  = entry_price * (1 - 1/L)
    short_liquidation = entry_price * (1 + 1/L)

For each leverage level in [3x, 5x, 10x, 25x, 50x, 100x]:
    Calculate liquidation prices
    Accumulate into price bins weighted by trade volume
    Render as heatmap (color intensity = accumulated volume at that liquidation level)
```
**Implemented by:** vsching/liquidation-heatmap, aoki-h-jp/py-liquidation-map, gptcompany/liquidations

#### Approach 2: Swing High/Low Clustering (Smart Money)
```
1. Detect swing highs and swing lows using lookback period
2. Group nearby swings within range_percent (e.g., 1%)
3. Where multiple swing highs cluster -> bearish liquidity (buy-side SL pool above)
4. Where multiple swing lows cluster -> bullish liquidity (sell-side SL pool below)
5. Track whether each cluster has been "swept" (price broke through and returned)
```
**Implemented by:** joshyattridge/smart-money-concepts (1.4K stars), QuantAlgo Simulated Liquidation Heatmap

#### Approach 3: Round Number + ATR Zones
```
Based on Osler (2002):
1. Identify round number price levels (ending in 00, 50, 000)
2. Stop-losses cluster JUST BEYOND round numbers (e.g., 1.2995 for support at 1.3000)
3. Take-profits cluster AT round numbers
4. Zone width = f(ATR) - wider in volatile markets
5. Weight by: distance from current price, volume at level, number of touches
```
**Partially implemented by:** QuantAlgo Pine Script (with Round Number Filter parameter)

#### Approach 4: Historical Sweep Analysis
```
1. Track all swing points over N periods
2. When price briefly breaks a swing and closes back inside -> "sweep" detected
3. Map all historical sweep locations -> these were confirmed stop clusters
4. Project forward: similar swing formations likely have similar stop clusters
```
**Implemented by:** mitchell-917 Pine Script lab, LuxAlgo Liquidity Sweeps

#### Approach 5: DBSCAN Clustering on Trade Data
```
1. Collect all historical trades for an instrument
2. For each trade, calculate liquidation prices at standard leverage levels
3. Apply DBSCAN (density-based spatial clustering) to group nearby liquidation prices
4. Dense clusters = high-impact liquidation zones
5. Render as time x price heatmap
```
**Implemented by:** gptcompany/liquidations (the most algorithmically advanced approach)

#### Approach 6: ML on Heatmap Images
```
1. Periodically capture liquidation heatmap screenshots (from CoinGlass or self-generated)
2. Create chronological sequences of images
3. Train CNN + LSTM on sequences to predict future price movement
4. Inference: current heatmap image -> predicted direction
```
**Implemented by:** alireza787b/liquidLapse

---

## Spider Web Network Map

### Cross-Repo Connections Found

```
srlcarlg/srl-ctrader-indicators (C#, 49 stars)
    |-> srlcarlg/srl-python-indicators (Python port, 25 stars)
    |-> Stargazers: bcronje, lee890720, Taffsigg (also forkers)
    |-> Forkers: ShabbirHasan1 (12K+ repos, prolific forker)
                 |-> Also forks Elenchev/order-book-heatmap
                 |-> Also forks aoki-h-jp/py-liquidation-map

Elenchev/order-book-heatmap (JS, 496 stars, 110 forks)
    |-> suhaspete/Real-Time-Order-Book-Heatmap (derivative)
    |-> Notable forkers:
        |-> CRY-D -> also forked py-liquidation-map
        |-> ShabbirHasan1 -> HFT repos, NSE data
        |-> traderlabs, ssh352, sunsetcoder (trading infra devs)
        |-> IvanLetteri, synth-o-stonks (algo trading)
        |-> uziinu -> also forked py-liquidation-map
        |-> bmvmx -> also forked py-liquidation-map

aoki-h-jp/py-liquidation-map (Python, 119 stars, 26 forks)
    |-> Forkers also active in:
        |-> CRY-D (cross-link to order-book-heatmap)
        |-> uziinu (cross-link to order-book-heatmap)
        |-> bmvmx (cross-link to order-book-heatmap)
    |-> Inspired: gptcompany/liquidations (DBSCAN approach)

DegenSugarBoo/OpenBook (Rust, 122 stars)
    |-> Evolution of DegenSugarBoo/cli_ob (abandoned TUI)
    |-> No direct stargazer overlap with other clusters

joshyattridge/smart-money-concepts (Python, 1.4K stars, 662 forks)
    |-> smtlab/smartmoneyconcepts (fork)
    |-> rafalsza/smartmoneyconcepts (fork)
    |-> jaydai81/smartmoneyconcepts (fork)
    |-> sailoo121/ss_smc (reimplementation)
    |-> Largest community in the SL estimation space

gbzenobi/CSharp-NT8-OrderFlowKit (C#, 314 stars, 136 forks)
    |-> Standalone NinjaTrader ecosystem
    |-> No direct overlap with crypto-focused repos
```

### Key Cross-Pollination Users
- **ShabbirHasan1**: Forked both order-book-heatmap AND srl-ctrader-indicators AND py-liquidation-map (12K+ repos, aggregator profile)
- **CRY-D**: Forked both order-book-heatmap AND py-liquidation-map
- **uziinu**: Forked both order-book-heatmap AND py-liquidation-map
- **bmvmx**: Forked both order-book-heatmap AND py-liquidation-map
- **lee890720**: Starred AND forked srl-ctrader-indicators

---

## Implementation Recommendations

### For Volume Bubbles

**Best starting points for implementation:**

1. **If building a web app (JS/TS):** Start from Elenchev/order-book-heatmap. It already renders circles sized by volume and colored by buy/sell ratio. Migrate from SVG to Canvas/WebGL for performance. Add the aggregation modes from Overcharts (time-based, volume-threshold, price-level).

2. **If building in Python:** Use srlcarlg/srl-python-indicators which has `plot_bubbles()` already implemented with Plotly. Extend with the z-score sizing approach from shui2967's Delta Volume Bubbles Pine Script.

3. **If building in Rust:** DegenSugarBoo/OpenBook has the data pipeline (Binance WS -> orderbook + trades) but lacks bubble rendering on the heatmap. Add egui circle rendering at trade positions.

4. **Algorithm to implement:**
   - Ingest trade stream (price, volume, side, timestamp)
   - Aggregate by chosen mode (per-price-level or time-window)
   - Normalize volume: z-score against rolling window OR percentile ranking
   - Map normalized value to radius (min_px to max_px, likely log scale)
   - Color: green for net buy, red for net sell, with gradient for mixed
   - Cap visible bubbles (top-N by volume within viewport)

### For SL/TP Heatmaps

**Best starting points for implementation:**

1. **If building liquidation-level based:** Fork vsching/liquidation-heatmap (MIT, Python/Streamlit/Plotly). It has the complete pipeline from exchange data to interactive visualization. Extend with DBSCAN clustering from gptcompany/liquidations approach.

2. **If building swing-based estimation:** Use joshyattridge/smart-money-concepts (pip installable, 1.4K stars) for detecting liquidity pools at swing clusters. Layer with Osler's round-number findings: weight zones at round numbers more heavily.

3. **If building a combined approach:** Merge multiple estimation methods:
   - Liquidation math (leverage-based)
   - Swing high/low clustering (SMC-based)
   - Round number proximity (Osler research)
   - Historical sweep analysis (confirmation)
   - Weight each method and aggregate into a composite heatmap

4. **Key insight from research:** No single method is sufficient. The most powerful approach combines:
   - WHERE stops mathematically MUST be (liquidation levels)
   - WHERE stops TEND to be placed (behavioral: round numbers, swing points)
   - WHERE stops HAVE been triggered historically (sweep analysis)

### Gap Analysis: What Does NOT Exist Yet

1. **No unified volume-bubbles library** exists as a standalone npm/pip package. All implementations are embedded in larger platforms.
2. **No combined SL/TP heatmap** merges liquidation math + swing clustering + round numbers into one tool. Each approach exists independently.
3. **No WebGL/GPU-accelerated volume bubbles** for high-frequency data (thousands of bubbles per second).
4. **No cross-exchange aggregated liquidation heatmap** as open source (CoinGlass does this commercially).
5. **No ML-based stop placement prediction** beyond liquidLapse's image-based approach. A model trained on actual stop-loss order data (e.g., from exchange APIs that expose it) does not exist in open source.
