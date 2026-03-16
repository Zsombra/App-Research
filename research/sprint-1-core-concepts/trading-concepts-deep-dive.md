# Advanced Trading & Charting Concepts: Technical Research Document

---

## Table of Contents

1. [Market Profile / TPO (Time Price Opportunity)](#1-market-profile--tpo-time-price-opportunity)
2. [Footprint Charts](#2-footprint-charts)
3. [CVD (Cumulative Volume Delta)](#3-cvd-cumulative-volume-delta)
4. [Heatmaps: Orderbook & Liquidation](#4-heatmaps-orderbook--liquidation)
5. [Volume Profile (VPVR, VWAP Suite)](#5-volume-profile-vpvr-vwap-suite)
6. [Open Source Implementations Summary](#6-open-source-implementations-summary)
7. [Data Requirements Summary](#7-data-requirements-summary)

---

## 1. Market Profile / TPO (Time Price Opportunity)

### What It Is

Market Profile was developed by J. Peter Steidlmayer at the Chicago Board of Trade (CBOT) in the 1980s. It visualizes **how much time** price spends at each level during a trading session, building a statistical distribution of price acceptance over time. The core unit is the **TPO (Time Price Opportunity)** -- a single letter block representing trading activity at a specific price during a specific time slice.

### How Sessions Are Divided

- A session (typically one trading day) is divided into **equal time periods** (commonly 30 minutes, but configurable to 5, 10, 15, 30, 60, 120, or 240 minutes).
- Each time period is assigned a sequential letter: the first period gets `A`, the second `B`, etc. Sequence goes uppercase A-Z, then lowercase a-z, repeating as necessary.
- For a standard 30-minute TPO on a 6.5-hour RTH session, you get letters A through M (13 periods).

### How TPO Letters Work

For each time period, the letter is "printed" at every price level where trading occurred during that slice. For example, if during period `C` the price traded between $100.00 and $102.00, the letter `C` appears at every tick increment in that range. Over the full session, the horizontal accumulation of letters at each price level forms a bell-curve-like distribution.

### Key Components

| Component | Description |
|---|---|
| **POC (Point of Control)** | The price level with the longest horizontal row of TPO letters -- where the market spent the most time. If multiple prices tie, the one closest to the mid-range wins. |
| **Value Area (VA)** | The price range encompassing ~70% of all TPOs, centered on the POC. Represents the zone of "fair value" or market acceptance. |
| **VAH / VAL** | Value Area High and Value Area Low -- the upper and lower boundaries of the VA. |
| **Initial Balance (IB)** | The price range established during the first 1-2 time periods (typically first hour). Sets the session's initial framework. |
| **Single Prints** | Price levels with only one TPO letter, indicating the market moved through quickly with little acceptance. Often act as support/resistance. |
| **Poor Highs/Lows** | Extremes with multiple TPOs, suggesting the market failed to auction away cleanly -- potential revisit targets. |

### Value Area Calculation Algorithm

1. Count the **total TPO blocks** in the profile.
2. Calculate the **VA target**: `total_blocks * 0.70` (for 70% VA).
3. Start at the **POC row** -- this is the first row in the VA. Initialize `va_count = POC_tpo_count`.
4. **Look one row above** the current VA top: count its TPOs. **Look one row below** the current VA bottom: count its TPOs.
5. Add the row with the **higher TPO count** to the VA. (If tied, add the row above first.)
6. **Repeat** steps 4-5 until `va_count >= VA target`.
7. The final top price = **VAH**, final bottom price = **VAL**.

### Profile Shape Patterns

- **P-shape**: Heavy TPO concentration at the top, thin tail below. Suggests short covering / bullish accumulation.
- **b-shape**: Heavy concentration at the bottom, thin tail above. Suggests long liquidation / bearish distribution.
- **D-shape (Normal)**: Balanced bell curve, market found equilibrium.
- **Double Distribution**: Two distinct clusters separated by a thin zone. Market transitioning between value areas.

### Visualization

Traditionally rendered as a horizontal letter chart where each column of letters extends rightward from the price axis. Modern platforms often render TPO blocks as colored rectangles instead of actual letters, with the current period highlighted differently. POC, VAH, and VAL are drawn as horizontal lines.

### Data Requirements

- **Minimum**: OHLCV candle data at the TPO resolution or finer (e.g., 1-minute or 5-minute bars to build 30-minute TPO periods).
- **Ideal**: Tick-level data for precise price-level assignment.
- **Source**: Any standard price feed (exchange data, broker API). No Level 2 data needed -- only price and time.

### Implementation Complexity

**Medium**. The core algorithm (building TPO distributions, calculating POC and VA) is straightforward -- the main complexity lies in:
- Handling session boundaries (RTH vs ETH/Globex).
- Rendering the letter/block distribution as an interactive chart.
- Supporting multiple sessions overlaid or stacked.
- Composite profiles (multi-day aggregation).

### Open Source Implementations

| Project | Language | Notes |
|---|---|---|
| [beinghorizontal/tpo_project](https://github.com/beinghorizontal/tpo_project) | Python | Full TPO with Plotly/Dash, live charts, IB analysis, rotational factor |
| [bfolkens/py-market-profile](https://github.com/bfolkens/py-market-profile) | Python | PyPI package (`MarketProfile`), supports both TPO and Volume Profile from Pandas DataFrames |
| [sivamgr/tpo_market_profile](https://github.com/sivamgr/tpo_market_profile) | Python | Lightweight, builds TPO from 1-min candles |
| [letianzj/QuantResearch](https://github.com/letianzj/QuantResearch/blob/master/market/market_profile.ipynb) | Python | Jupyter notebook with Plotly, uses Yahoo Finance 1-min data |

---

## 2. Footprint Charts

### What It Is

A footprint chart is a multi-dimensional candlestick that decomposes each bar into **bid volume vs. ask volume at every individual price level**. It reveals the "inside" of each candle -- showing exactly where aggressive buyers and sellers were active, not just the aggregate.

### Core Data Fields Per Price Level

| Field | Calculation | Meaning |
|---|---|---|
| **Bid Volume** | Sum of contracts executed at the bid price | Aggressive selling (market sell orders hitting resting bids) |
| **Ask Volume** | Sum of contracts executed at the ask price | Aggressive buying (market buy orders hitting resting asks) |
| **Delta** | Ask Volume - Bid Volume | Net aggression at that price level |
| **Total Volume** | Ask Volume + Bid Volume | Overall activity density |

### Types of Footprint Charts

1. **Bid x Ask Footprint**: Each cell shows `Bid | Ask` side by side at every price. The most granular view.
2. **Delta Footprint**: Each cell shows only the delta (Ask - Bid). Color-coded green (positive) / red (negative).
3. **Volume Footprint**: Each cell shows total volume. Essentially a per-bar volume profile.
4. **Profile Footprint**: Renders each bar as a mini volume profile histogram.

### Imbalance Detection

Imbalances identify price levels where one side overwhelmingly dominates. Two methods:

**Same-Row Ratio Method:**
- Compare Ask to Bid at the same price level.
- Flag as **buy imbalance** if `Ask / Bid >= threshold` (commonly 3.0x).
- Flag as **sell imbalance** if `Bid / Ask >= threshold`.
- "Zero side" imbalances occur when one side has zero volume.

**Diagonal Method:**
- Compare Ask at price N to Bid at price N-1 (one tick lower).
- Rising diagonal dominance (Ask > lower Bid) = buyers "walking it up."
- Falling diagonal dominance (Bid > higher Ask) = sellers "walking it down."

**Stacked Imbalances:**
3+ consecutive price levels with imbalances in the same direction indicate strong initiative flow. These often mark institutional activity and create significant support/resistance.

### Key Features

- **Unfinished Auctions**: When an extreme price (wick) shows only buyers or only sellers, the auction is "unfinished" and price may revisit.
- **Per-Bar POC**: The price level with the highest volume within a single candle.
- **Cumulative Bar Delta**: The sum of all deltas across all price levels in one bar.
- **Delta Divergence**: Price makes new highs but cumulative bar delta decreases (bearish), or vice versa.

### Visualization

Each candle is expanded into a grid: the vertical axis is price (tick-by-tick), and each row contains the bid/ask numbers. Buy imbalances are highlighted (e.g., blue background), sell imbalances in red. The candle body and wicks are overlaid. POC row is often marked with a distinct background.

### Data Requirements

- **Required**: **Tick-by-tick trade data** (Level 1) with **trade side classification** (buyer-initiated vs. seller-initiated). Each trade must include: timestamp, price, quantity, and aggressor side.
- **Critical**: The data feed MUST classify trades as "at bid" or "at ask." Some feeds only provide total volume without side classification -- these are insufficient. Workarounds exist (comparing trade price to current best bid/ask quote) but introduce classification errors.
- **For crypto**: WebSocket trade streams from exchanges (Binance, Bybit, etc.) typically include a `buyer_is_maker` boolean, making side classification straightforward.
- **For futures**: CME data via CQG, Rithmic, or Databento provides trade-side classification. Rithmic and CQG are the most common for footprint charting.
- **Bandwidth/Storage**: During active markets, a single instrument can generate 1,000+ ticks per second. A full day of ES (S&P 500 futures) may produce 500K-2M+ ticks.

### Implementation Complexity

**High**. Key challenges:
- Real-time aggregation of tick data into price-level buckets within time-based or volume-based bars.
- Efficient data structures for storing bid/ask volumes at potentially hundreds of price levels per bar.
- Rendering performance: each bar can contain 50-200+ price level rows, all needing interactive display.
- Handling aggregation across multiple exchanges (crypto) with different tick sizes and timestamps.
- Imbalance calculation with configurable thresholds and filtering (minimum volume, diagonal vs. same-row).

### Open Source Implementations

| Project | Language | Notes |
|---|---|---|
| [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface) | Rust | Full native desktop app with footprint, heatmap, DOM. Supports Binance, Bybit. |
| [murtazayusuf/OrderflowChart](https://github.com/murtazayusuf/OrderflowChart) | Python | Footprint visualization with Plotly from preprocessed JSON data |
| [gbzenobi/CSharp-NT8-OrderFlowKit](https://github.com/gbzenobi/CSharp-NT8-OrderFlowKit) | C# | NinjaTrader 8 toolkit, BidAsk ladder, delta, volume analysis |
| [FutTrader/footprint-system](https://github.com/FutTrader/footprint-system) | Sierra Chart | Footprint reversal system with P/B profile detection |

---

## 3. CVD (Cumulative Volume Delta)

### What It Is

CVD maintains a **running total** of the net difference between volume executed at the ask (aggressive buys) and volume executed at the bid (aggressive sells). It is essentially the integral of per-bar delta over time. It shows whether buying or selling pressure is accumulating or diminishing across the session or any chosen lookback period.

### Calculation

```
For each bar (or tick):
    delta = ask_volume - bid_volume
    CVD = CVD_previous + delta
```

**Per-bar approximation** (when only OHLCV is available, no tick data):
Some implementations estimate intrabar delta using price position within the bar:
```
estimated_buy_volume = volume * (close - low) / (high - low)
estimated_sell_volume = volume - estimated_buy_volume
delta = estimated_buy_volume - estimated_sell_volume
```
This is a rough approximation and significantly less accurate than tick-level classification.

### CVD Candle Construction

CVD can be rendered as its own candlestick chart:
- **Open**: The cumulative value at the start of the bar (equals previous bar's close, or 0 if period reset).
- **Close**: The cumulative value after adding the current bar's delta.
- **High/Low**: The maximum/minimum cumulative values reached during the bar (requires intrabar resolution).

### Reset Periods

CVD can be configured to reset (return to zero) at intervals:
- **Session reset**: Resets at the start of each trading day.
- **Weekly/Monthly reset**: Longer accumulation periods.
- **No reset (continuous)**: Runs indefinitely from a starting point.
- **Custom anchor**: Resets from a user-selected bar.

### Aggregated CVD Across Exchanges

For crypto markets, a single instrument trades on 5-20+ exchanges simultaneously. **Aggregated CVD** sums the delta from all exchanges to get a comprehensive picture of net order flow.

**Implementation approach:**
1. Subscribe to tick/trade WebSocket streams from multiple exchanges (Binance, Bybit, OKX, Bitget, Coinbase, etc.).
2. Classify each trade as buy or sell on each exchange.
3. Normalize volumes (some exchanges report in base currency, others in quote currency).
4. Sum deltas across all exchanges per time bucket.
5. Accumulate into the CVD running total.

**Key considerations:**
- Timestamp synchronization across exchanges (clock drift).
- Handling different tick sizes and lot sizes.
- Spot vs. Perpetual vs. Quarterly futures may need separate aggregation tracks.
- Some implementations allow enabling/disabling specific exchange pairs to filter signal.

### Trading Applications

- **Divergence**: Price makes a new high but CVD does not (bearish divergence) -- signals weakening buying pressure. Price makes a new low but CVD holds or rises (bullish divergence) -- signals absorption by buyers.
- **Confirmation**: CVD trending in the same direction as price confirms the move is backed by genuine aggressive order flow.
- **Absorption detection**: Price stalls while CVD continues rising = limit sellers absorbing aggressive buying.

### Visualization

Typically displayed as a line chart or candlestick chart in a separate panel below the main price chart. Often color-coded: green when rising, red when falling. Some platforms overlay CVD directly on the price chart.

### Data Requirements

- **Ideal**: Tick-by-tick trade data with aggressor side classification (same as footprint charts).
- **Minimum viable**: Per-bar volume with OHLC for intrabar estimation (less accurate).
- **For aggregated CVD**: Real-time trade streams from multiple exchanges simultaneously.

### Implementation Complexity

**Low-Medium** for single exchange, **Medium-High** for aggregated.
- Single-exchange CVD from tick data: straightforward accumulation.
- Intrabar estimation from OHLCV: simple formula but imprecise.
- Multi-exchange aggregation: requires managing multiple WebSocket connections, normalization, and synchronization.

### Open Source Implementations

| Project | Language | Notes |
|---|---|---|
| [EarnForex/Cumulative-Volume-Delta](https://github.com/EarnForex/Cumulative-Volume-Delta) | MQL4/MQL5/cTrader | MT4/MT5/cTrader indicator, tick volume and real volume support |
| [0xd3lbow/aggr.template](https://github.com/0xd3lbow/aggr.template) | JS (Aggr.Trade) | Delta indicators for Aggr.Trade, includes aggregated CVD across spot and perp |
| [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface) | Rust | Includes CVD as part of the charting platform |
| TradingView community scripts | Pine Script | Multiple open-source CVD scripts including aggregated versions by jeesauce, mxdvt07, and NoveltyTrade |

---

## 4. Heatmaps: Orderbook & Liquidation

### 4a. Order Book Heatmaps

#### What It Is

An order book heatmap is a **time-series visualization of limit order depth** (Level 2 data). It shows the concentration of resting buy and sell limit orders across price levels over time, using color intensity to represent order size. Think of it as a "weather map" of where liquidity sits in the order book.

#### How It Works

1. **Snapshot the order book** at regular intervals (e.g., every 100ms-1s).
2. For each price level, record the total resting order quantity.
3. Map the quantity to a **color intensity** (e.g., black = no orders, yellow = high concentration of orders).
4. Plot time on the X-axis, price on the Y-axis, and color as the Z-dimension.
5. As new snapshots arrive, the heatmap scrolls, creating a continuous visualization.

#### Key Visual Patterns

- **Bright horizontal bands**: Large resting orders at a fixed price -- potential support/resistance.
- **Spoofing patterns**: Large orders that appear and disappear rapidly (bright spots that flash in and out).
- **Liquidity walls**: Dense clusters of orders that price approaches but doesn't cross.
- **Order absorption**: A bright band that gradually dims as aggressive orders eat through it.
- **Liquidity vacuum**: Dark areas with few resting orders -- price can move quickly through these.

#### Data Requirements

- **Required**: **Level 2 (L2) order book data** via WebSocket. This includes all resting bid and ask quantities at each price level (typically top 5-50 levels, or full depth).
- **Optimal**: Full depth of book (all price levels) at high frequency (100ms+ updates).
- **Bandwidth**: Very high. Full order book snapshots at 100ms intervals for a single instrument can generate 10-100MB+ per hour.
- **Storage**: For historical heatmaps, each snapshot is a vector of (price, quantity) pairs. With 500 price levels at 10 snapshots/second = 5,000 data points/second per instrument.

#### Implementation Complexity

**Medium-High**.
- Managing high-frequency L2 data streams.
- Efficient rendering of the 2D heatmap (canvas/WebGL for web, GPU shaders for native).
- Color scaling (linear, logarithmic, percentile-based) to handle the wide range of order sizes.
- Handling order book deltas vs. full snapshots (most exchanges send incremental updates that must be applied to a local book).

### 4b. Liquidation Heatmaps

#### What It Is

A liquidation heatmap **estimates where leveraged positions would be force-liquidated** based on assumed entry prices and leverage levels. It does NOT show actual orders -- it shows **predicted liquidation trigger prices** based on statistical modeling.

#### How Liquidation Levels Are Estimated

The core formula for a single position:

```
Long Liquidation Price = Entry Price * (1 - 1/Leverage + Maintenance_Margin_Rate)
Short Liquidation Price = Entry Price * (1 + 1/Leverage - Maintenance_Margin_Rate)
```

Simplified (ignoring maintenance margin):
```
Long Liquidation = Entry Price - (Entry Price / Leverage)
Short Liquidation = Entry Price + (Entry Price / Leverage)
```

**Heatmap construction algorithm:**
1. For each recent trade (or for positions inferred from open interest data), assume the trade is an open position.
2. For each common leverage level (5x, 10x, 25x, 50x, 100x), calculate the estimated liquidation price.
3. Bucket these liquidation prices into price bins.
4. The more estimated liquidations cluster at a price bin, the brighter/hotter the color.
5. As new trades occur, add their estimated liquidation levels. As price crosses a liquidation level, remove those estimated positions.

**Key insight**: Nobody outside the exchange knows the actual leverage used by each trader. Heatmap providers use a **range of common leverage values** and weight them by statistical frequency. The result is a probability cloud, not a precise map.

#### Factors in Estimation

- **Entry price distribution**: Derived from trade history and open interest changes.
- **Leverage distribution**: Assumed based on exchange defaults and common retail behavior (e.g., crypto retail skews toward 10-50x).
- **Maintenance margin rates**: Vary by exchange and tier (Binance, Bybit, OKX all have different tiered margin schedules).
- **Isolated vs. Cross margin**: Isolated positions have fixed liquidation prices; cross-margin positions shift as account balance changes (harder to estimate).

#### Data Requirements

- **For basic liquidation estimation**: Historical trade data, open interest data, and exchange margin tier schedules.
- **For advanced estimation**: Real-time open interest changes, funding rates, long/short ratios.
- **Exchange APIs**: Binance, Bybit, OKX provide open interest and funding rate endpoints.
- **Critical limitation**: Exact position leverage is private data. All public heatmaps are estimates.

#### Implementation Complexity

**High**. The liquidation math itself is simple, but the estimation model for where positions exist and at what leverage is complex and inherently imprecise. Production-quality liquidation heatmaps require:
- Statistical modeling of position distribution.
- Real-time open interest tracking.
- Per-exchange maintenance margin tier handling.
- Historical data accumulation for pattern recognition.

### Open Source Implementations (Heatmaps)

| Project | Language | Notes |
|---|---|---|
| [Elenchev/order-book-heatmap](https://github.com/Elenchev/order-book-heatmap) | JavaScript/D3.js | Binance WebSocket, live heatmap + time & sales. [Live demo](https://elenchev.github.io/order-book-heatmap/) |
| [DegenSugarBoo/OpenBook](https://github.com/DegenSugarBoo/OpenBook) | Rust (egui) | Real-time depth heatmap, order book, trade tape. Multi-pane workspace. |
| [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface) | Rust | Historical DOM heatmap with volume profiles, footprint, and DOM ladder |
| [JuaanM0/orderbook-heatmap](https://github.com/JuaanM0/orderbook-heatmap) | JavaScript | Color-intensity orderbook heatmap |
| [aloysius-pgast/heatmap-me](https://github.com/aloysius-pgast/heatmap-me) | JavaScript | Price & volume evolution tracking for crypto |

**Note**: No fully open-source liquidation heatmap implementations were found. Liquidation heatmaps are primarily offered by commercial services (Coinglass, CoinAnk, Kingfisher, Trading Different) using proprietary estimation algorithms.

---

## 5. Volume Profile (VPVR, VWAP Suite)

### What It Is

Volume Profile displays the **total volume traded at each price level** over a specified period, rendered as a horizontal histogram alongside the price chart. Unlike Market Profile (which measures time), Volume Profile measures **contracts/shares traded** -- showing where the most conviction (money) was committed.

### Key Concepts

| Concept | Description |
|---|---|
| **HVN (High Volume Node)** | Price levels with significantly above-average volume. Areas of agreement/acceptance where price tends to consolidate ("sticky" levels). |
| **LVN (Low Volume Node)** | Price levels with low volume. Areas of rejection where price moved quickly. Act as potential support/resistance once breached. |
| **POC (Point of Control)** | The single price level with the highest traded volume. The "fairest price" by volume consensus. |
| **Value Area (VA)** | The price range containing 70% of total volume, centered on POC. |
| **VAH / VAL** | Value Area High / Low boundaries. |

### Volume Profile Variants

**VPVR (Volume Profile Visible Range):**
- Calculates the volume profile across whatever price range is currently visible on the chart.
- Dynamically recalculates as you zoom/scroll.
- Most common on TradingView.

**VPFR (Volume Profile Fixed Range):**
- User defines a specific start and end point (date/time or bar range).
- Static calculation, does not change with zoom.

**VPSV (Volume Profile Session Volume):**
- Calculates a separate profile for each trading session (daily, weekly, etc.).
- Displays multiple mini-profiles side by side.

### Volume Profile vs. Market Profile: Key Differences

| Aspect | Market Profile (TPO) | Volume Profile |
|---|---|---|
| **Measures** | Time spent at price | Volume traded at price |
| **Unit** | TPO blocks (30-min letters) | Contracts / shares / coins |
| **POC meaning** | Most time = acceptance/comfort | Most volume = conviction/commitment |
| **Session sensitivity** | Session-neutral (equal weight to all hours) | Skewed toward high-volume hours (RTH typically dominates) |
| **Data needed** | Price + time (OHLCV at TPO resolution) | Price + volume (tick or bar-level) |
| **Visualization** | Letter blocks building a distribution | Horizontal histogram bars |
| **Best for** | Understanding market structure, day types, auction theory | Identifying support/resistance, liquidity zones |

**When they diverge**: A price level can have high TPO count (lots of time) but low volume (quiet trading), or low TPO count but high volume (fast institutional sweep). Cross-referencing both reveals whether "acceptance" (time) aligns with "conviction" (volume).

### VWAP (Volume Weighted Average Price)

VWAP is a single-line indicator, not a distribution:

```
VWAP = Cumulative(Price * Volume) / Cumulative(Volume)
```

Calculated continuously from a starting anchor point (typically session open). It represents the average price paid by all participants weighted by how much they traded.

**VWAP Suite typically includes:**
- **Session VWAP**: Resets daily. The primary institutional benchmark.
- **Anchored VWAP**: User-selected starting point (e.g., from a swing low, earnings date, etc.).
- **VWAP Bands**: Standard deviation bands around VWAP (1SD, 2SD, 3SD), similar to Bollinger Bands but anchored to volume-weighted price.
- **Rolling VWAP**: Uses a rolling window (e.g., 20 bars) instead of resetting.
- **Weekly/Monthly VWAP**: Resets at longer intervals.

**VWAP vs. Volume Profile**: VWAP gives you a single dynamic line (the average), while Volume Profile gives you the full distribution. VWAP tells you the "center of gravity"; Volume Profile shows you the entire landscape. They are complementary: the VWAP line typically passes through or near the POC of the corresponding Volume Profile.

### Data Requirements

- **Volume Profile**: Per-bar OHLCV data at a granularity matching desired price resolution. For tick-level precision, tick data is needed. For most use cases, 1-minute bars suffice.
- **VWAP**: Per-bar OHLCV data (1-minute bars typical for intraday VWAP). Requires volume data, which means instruments/feeds that report volume.
- **No Level 2 data needed** for either. These work with standard price + volume feeds.

### Implementation Complexity

**Low-Medium**.
- **Volume Profile**: Iterate through all bars in range, bucket each bar's volume into its price level (or distribute across the high-low range), then find POC and calculate VA. The main subtlety is how to distribute a bar's volume across its price range (uniform distribution, triangle distribution weighted toward close, etc.).
- **VWAP**: Simple running accumulation -- trivially implementable. VWAP bands require tracking running variance.
- **Rendering**: Horizontal histogram requires coordinate transformation (volume axis perpendicular to price axis). More complex than standard chart indicators but well-understood.

### Open Source Implementations

| Project | Language | Notes |
|---|---|---|
| [bfolkens/py-market-profile](https://github.com/bfolkens/py-market-profile) | Python | Supports both TPO and Volume Profile from DataFrames |
| [eslazarev/vwap-backtrader](https://github.com/eslazarev/vwap-backtrader) | Python | Intraday and rolling VWAP for Backtrader framework |
| [harshgupta1810/VWAP_stockmarket](https://github.com/harshgupta1810/VWAP_stockmarket) | Python | Basic VWAP calculator with matplotlib |
| [flowsurface-rs/flowsurface](https://github.com/flowsurface-rs/flowsurface) | Rust | Volume profiles (fixed and visible range) built into the charting platform |
| GitHub topic: [volume-profile](https://github.com/topics/volume-profile) | Various | Collection of repos including Python + mplfinance/plotly implementations |

---

## 6. Open Source Implementations Summary

### Comprehensive Platforms (Multiple Features)

| Project | Language | Features | Link |
|---|---|---|---|
| **flowsurface** | Rust | Footprint, Heatmap, DOM, Volume Profile, CVD. Native desktop (Win/Mac/Linux). Supports Binance, Bybit. | [GitHub](https://github.com/flowsurface-rs/flowsurface) |
| **OrderFlowKit (NT8)** | C# | BidAsk ladder, Delta, Volume analysis, Footprint. NinjaTrader 8 platform. | [GitHub](https://github.com/gbzenobi/CSharp-NT8-OrderFlowKit) |

### Single-Purpose Libraries

| Project | Language | Feature | Link |
|---|---|---|---|
| **py-market-profile** | Python | Market Profile + Volume Profile | [GitHub](https://github.com/bfolkens/py-market-profile) |
| **tpo_project** | Python | TPO with Plotly/Dash | [GitHub](https://github.com/beinghorizontal/tpo_project) |
| **OrderflowChart** | Python | Footprint charts with Plotly | [GitHub](https://github.com/murtazayusuf/OrderflowChart) |
| **order-book-heatmap** | JS/D3 | Order book heatmap (Binance) | [GitHub](https://github.com/Elenchev/order-book-heatmap) |
| **OpenBook** | Rust | Depth heatmap + trade tape | [GitHub](https://github.com/DegenSugarBoo/OpenBook) |
| **Cumulative-Volume-Delta** | MQL4/5 | CVD for MetaTrader | [GitHub](https://github.com/EarnForex/Cumulative-Volume-Delta) |
| **aggr.template** | JS | Aggregated CVD for Aggr.Trade | [GitHub](https://github.com/0xd3lbow/aggr.template) |
| **vwap-backtrader** | Python | VWAP for Backtrader | [GitHub](https://github.com/eslazarev/vwap-backtrader) |

---

## 7. Data Requirements Summary

| Concept | Minimum Data | Ideal Data | Level 2 Needed? | Multi-Exchange? |
|---|---|---|---|---|
| **Market Profile (TPO)** | 1-min OHLCV bars | Tick data | No | No |
| **Footprint Charts** | Tick trades with side classification | Full tick stream + L2 quotes | Yes (for side classification) | Optional (for aggregation) |
| **CVD** | Per-bar OHLCV (estimated) or tick trades with side | Tick trades with side from all venues | Yes (for accurate side) | Yes (for aggregated CVD) |
| **Orderbook Heatmap** | L2 snapshots at regular intervals | Full-depth L2 at 100ms+ frequency | **Yes (core requirement)** | Optional |
| **Liquidation Heatmap** | Trade data + open interest | OI changes + funding rates + margin tiers | No | Yes (aggregated OI) |
| **Volume Profile** | 1-min OHLCV bars | Tick data with volume | No | No |
| **VWAP** | 1-min OHLCV bars | 1-min bars sufficient | No | No |

### Data Feed Sources

**Crypto:**
- Exchange WebSocket APIs (Binance, Bybit, OKX, Coinbase, Bitget) -- free, real-time
- Aggregators: CoinAPI, Tardis.dev (historical tick replay), Kaiko

**Futures (CME, etc.):**
- CQG, Rithmic (primary footprint data providers, ~$50-100/month + exchange fees)
- Databento (modern API, tick-level, ~$0.01-0.05 per million messages)
- dxFeed, IQFeed

**Equities:**
- NYSE/NASDAQ consolidated feeds (expensive for full depth)
- Polygon.io (tick data, $99+/month)
- IEX Cloud (limited depth)

---

## Sources

- [TradingView TPO Indicator](https://www.tradingview.com/support/solutions/43000713306-time-price-opportunity-tpo-indicator/)
- [TradingView TPO Charts Explained](https://www.tradingview.com/support/solutions/43000725590-time-price-opportunity-charts-explained/)
- [Sierra Chart TPO Reference](https://www.sierrachart.com/index.php?page=doc/StudiesReference/TimePriceOpportunityCharts.html)
- [GoCharting Market Profile Docs](https://gocharting.com/docs/orderflow/market-profile-aka-tpo-charts)
- [CQG Value Area Calculation](https://help.cqg.com/cqgic/25/Documents/marketprofilevalueareasmpva.htm)
- [TradingView Volume Footprint Guide](https://www.tradingview.com/support/solutions/43000726164-volume-footprint-charts-a-complete-guide/)
- [TradingView CVD](https://www.tradingview.com/support/solutions/43000725058-cumulative-volume-delta/)
- [Bookmap Heatmap Guide](https://bookmap.com/blog/heatmap-in-trading-the-complete-guide-to-market-depth-visualization)
- [CoinAnk Liquidation Heatmap](https://coinank.com/articles/64f056cdc736db3fca4c3d7d)
- [Coinglass Liquidity Heatmap](https://www.coinglass.com/LiquidityHeatmap)
- [Good Crypto Volume Profile Guide](https://goodcrypto.app/ultimate-guide-to-volume-profile-vpvr-vpsv-vpfr-explained/)
- [Market Profile vs Volume Profile](https://www.warriortrading.com/volume-profile-vs-market-profile/)
- [Quantower DOM Surface](https://www.quantower.com/dom-surface)
- [Bybit Tick Data Collection Guide](https://medium.com/@eeiaao/step-by-step-guide-collecting-tick-data-from-bybit-trades-order-book-b33a206baf08)
- [AMSFlow Liquidation Guide](https://amsflow.com/blog/the-complete-guide-to-leveraged-trading-and-liquidation-understanding-the-math-behind-it)
