# Filtered Footprints & Bucketed Trade Size Groups: Open-Source Research

**Date:** 2026-03-16
**Method:** Spider web through developer networks starting from known repos, targeted GitHub searches, web searches for articles/scripts

---

## Feature 1: FILTERED FOOTPRINTS

**Definition:** Applying a minimum volume or delta threshold to footprint chart data, hiding small trades to show only institutional/whale activity. A filter on bid/ask volume at each price level — only showing levels where volume exceeds X contracts.

### FOUND: Open-Source Implementations

#### 1. gbzenobi/CSharp-NT8-OrderFlowKit — `VolumeFilter.cs` (BEST MATCH)
- **URL:** https://github.com/gbzenobi/CSharp-NT8-OrderFlowKit
- **Stars:** 314 | **Language:** C# (NinjaTrader 8)
- **License:** Not specified
- **File:** `VolumeFilter.cs`
- **What it does:** A true filtered footprint implementation. Applies a configurable minimum volume threshold (`minVolumeFilter`) at the price-level cluster level within each bar. Price levels where volume falls below the threshold are hidden entirely (`if( T < this.minVolumeFilter ){ return; }`).
- **Configurable parameters:**
  - **Min Volume Filter** — the primary threshold; clusters below this are not rendered
  - **Aggressive Level** (2-10) — scales geometry size relative to volume, multiplied by the min filter value
  - **Formula Mode** — Toggle between "Total" (all volume) and "Delta" (bid-ask imbalance); for delta mode, `Math.Abs(D)` is compared against threshold
  - **Geometry** — Circle or rectangle shapes for clusters
  - **Color coding** — Separate bid (red), ask (green), total (blue) with individual opacity
- **Relevance:** This is exactly the "filtered footprint" concept — a configurable volume threshold that hides low-volume price levels in footprint charts.
- **Also found as submodule in:** Linus404/Linus-Indicator-Collection (19 stars, NinjaTrader 8, MIT license)

#### 2. AtasPlatform/Indicators — `ClusterSearch.cs` (STRONG MATCH)
- **URL:** https://github.com/AtasPlatform/Indicators
- **Stars:** 107 | **Forks:** 65 | **Language:** C#
- **File:** `Technical/ClusterSearch.cs`
- **What it does:** Searches footprint/cluster data for price levels matching specific filter criteria. A multi-dimensional filtered footprint search engine.
- **Configurable filters:**
  - Min/Max volume value thresholds (with auto-filter option)
  - Min/Max volume percentage of candle
  - Min/Max average trade size
  - Delta imbalance percentage
  - Calculation modes: Volume, Tick count, Delta, Bid/Ask
  - Location filters: candle direction, price location (High/Low/Body/Wicks)
  - Time-based filtering
- **Relevance:** Applies volume/delta thresholds to cluster (footprint) data to find significant levels. More of a "cluster scanner" than a filtered display, but implements the core filtering logic.

#### 3. AtasPlatform/Indicators — `BarVolumeFilter.cs` (PARTIAL MATCH)
- **URL:** https://github.com/AtasPlatform/Indicators
- **File:** `Technical/BarVolumeFilter.cs`
- **What it does:** Colors bars based on volume criteria with min/max thresholds. Filters by Volume, Ticks, Delta, Bid volume, or Ask volume. Includes time-based filtering.
- **Relevance:** Bar-level filter rather than price-level footprint filter, but demonstrates the filtering pattern in ATAS's open-source indicator ecosystem.

#### 4. TradingView Pine Script — `request.footprint()` (PLATFORM, NOT REPO)
- **URL:** https://www.tradingview.com/blog/en/volume-footprints-in-pine-scripts-56908/
- **Released:** January 2026 (Pine Script v6)
- **What it does:** Native footprint data access in Pine Script. Enables building custom filtered footprint indicators. The `imbalance` parameter sets percentage difference threshold for detecting volume imbalances (default 300%).
- **Relevance:** Not a standalone repo, but an open scriptable platform where filtered footprints can be built. Requires Premium/Ultimate plan.

#### 5. TradingView — Volume Footprint Anomaly Scanner [PhenLabs] (OPEN-SOURCE PINE SCRIPT)
- **URL:** https://www.tradingview.com/script/h8lyPQjz-Volume-Footprint-Anomaly-Scanner-PhenLabs/
- **What it does:** Detects significant imbalances in buying/selling pressure using Z-score statistical analysis on Delta. Configurable Z-Score Anomaly Threshold controls sensitivity.
- **Relevance:** Statistical approach to filtering footprint data — not a simple volume threshold but achieves similar goal of highlighting significant activity.

### NEAR-MISSES (Related but not exact matches)

| Repo | Stars | What it has | Why it's not a match |
|------|-------|-------------|---------------------|
| flowsurface-rs/flowsurface | 1,390 | Footprint with imbalance/naked-POC studies | No volume threshold filter documented |
| ianfigueroa/TapeFlow | 11 | Footprint charts with whale detection ($50K threshold) | Whale detection is separate from footprint rendering |
| WaleeTheRobot/beer-money | 10 | Imbalance detection with ratio/difference thresholds | Imbalance detection, not volume-level filtering |
| murtazayusuf/OrderflowChart | 223 | Python footprint chart visualization | No filtering parameters |
| tysonwu/stack-orderflow | 131 | Orderflow chart GUI | No documented filtering |
| AndreaFerrante/Orderflow | 117 | Python tick data reshaping for orderflow | VWAP/Profile focus, no filtering |

### NETWORK SPIDER RESULTS (Feature 1)

**tiagosiebler/orderflow stargazers checked (30):** No relevant repos with filtered footprint found. Users like gty3 (orderflow-helpers) and TagHaendler had no filtering implementations.

**gbzenobi/CSharp-NT8-OrderFlowKit stargazers checked (30):** Found connection to Linus404 (who includes the OrderFlowKit as a submodule). Users like quant-geek-ind, pseudocodes had no filtered footprint repos.

**flowsurface-rs/flowsurface stargazers checked (30):** Users like CoCoMilkyWay, graceyangfan, ShabbirHasan1 had no filtered footprint repos. jose-donato has a flowsurface fork but no filter additions.

---

## Feature 2: BUCKETED TRADE SIZE GROUPS

**Definition:** Classifying trades by notional value into buckets (e.g., <$10K, $10K-$100K, $100K-$1M, >$1M) and rendering separate CVD/histograms per bucket. Shows what retail vs institutional traders are doing.

### FOUND: Open-Source Implementations (Partial/Adjacent)

#### 1. OctopusTakopi/binance_l3_est — K-Means Trade Size Clustering (CLOSEST MATCH)
- **URL:** https://github.com/OctopusTakopi/binance_l3_est
- **Stars:** 208 | **Language:** Rust
- **What it does:** Estimates L3 orderbook data from Binance's L2 feed. Includes K-Means clustering that "automatically classifies market participants in real-time based on order sizes and trading frequencies." Also includes separate "Whale" order highlighting and an Algorithmic TWAP Detector.
- **Relevance:** Uses unsupervised clustering (K-Means) rather than fixed buckets, but achieves the same goal of separating trades by participant type. The clustering dynamically determines trade size categories rather than using hardcoded thresholds.
- **Gap:** Does not produce separate CVD per bucket; the clustering is for identification, not for generating bucketed CVD charts.

#### 2. TradingView — CVD & Big Trade Detector By HK (OPEN-SOURCE PINE SCRIPT)
- **URL:** https://www.tradingview.com/script/ZPa2riNh/
- **Author:** colacorn (HK)
- **Source:** Open-source Pine Script
- **What it does:** CVD visualization using floating bars with statistical whale detection. Uses standard deviation (configurable Sigma, default 3.0) over a lookback period (default 50) to detect volume anomalies. Green/Red dots mark "Big Buy"/"Big Sell" events on CVD bars.
- **Relevance:** Detects statistically significant trades overlaid on CVD, but does NOT separate CVD into size buckets. It's whale detection on top of aggregate CVD, not decomposed CVD.

#### 3. TradingView — Big Trades Whale Detector [Volume Anomalies] By HK (OPEN-SOURCE PINE SCRIPT)
- **URL:** https://www.tradingview.com/script/BJHQwxxN-Big-Trades-Whale-Detector-Volume-Anomalies-By-HK/
- **Author:** colacorn (HK)
- **Source:** Open-source Pine Script
- **What it does:** Inspects candles using lower timeframe data (5-second ticks). Uses standard deviation to detect volume anomalies. **3-tier size categorization: Small, Medium, Extreme** — with bubble size correlating to significance. Configurable "Minimum Volume" threshold.
- **Relevance:** Has a 3-tier trade size categorization, which is conceptually adjacent to bucketing. However, it doesn't produce separate CVD/histograms per bucket.

#### 4. Tripudium/cooc — Trade Flow Decomposition (ACADEMIC)
- **URL:** https://github.com/Tripudium/cooc
- **Stars:** 1 | **Language:** Python
- **What it does:** Implements the academic paper "Trade Co-occurrence, Trade Flow Decomposition, and Conditional Order Imbalance in Equity Markets" (Lu, Reinert, Cucuringu). Decomposes trading activity into components based on co-occurrence patterns and order flow characteristics.
- **Relevance:** Academic trade flow decomposition — related conceptual framework for separating order flow into components, but focused on co-occurrence patterns rather than notional-value bucketing.

#### 5. 0xd3lbow/sizefrequency — Trade Size Distribution Analysis
- **URL:** https://github.com/0xd3lbow/sizefrequency
- **Stars:** 1 | **Language:** Python
- **What it does:** Pulls historical trading data and plots the frequency distribution of order sizes. Applies a size threshold filter to cut noise. Creates histogram visualizations of trade size distributions.
- **Relevance:** Analyzes trade size distribution with histograms, but no bucketing into categories or separate CVD per bucket.

#### 6. quan-digital/whale-watcher — Whale Order Book Tracking
- **URL:** https://github.com/quan-digital/whale-watcher
- **Language:** Python (Dash app)
- **What it does:** Tracks whale activity in BitMEX XBTUSD. Identifies orders >= 1% of orderbook volume within +/-5% of market price. Uses algorithmic sizing (square root transformation) for visualization.
- **Relevance:** Relative (percentile-based) whale detection on orderbook data. Not trade-level bucketing with CVD.

### NOT FOUND: True Bucketed CVD Implementation

No open-source repository was found that implements the full feature of:
- Classifying trades into fixed notional-value buckets
- Computing separate CVD lines/histograms per bucket
- Displaying them together to show retail vs institutional divergence

This feature exists in **commercial platforms only:**

| Platform | Implementation |
|----------|---------------|
| **Hyblock Capital** | CVD by trade size buckets (0-100, 1K-100K, 100K-1M, 10M+) |
| **ATAS** | CVD Pro with min/max trade volume filters for computing separate CVDs |
| **Bookmap** | CVD with trade size filter (equal to or smaller than selected size) |
| **CoinGlass** | Professional order flow analytics with size segmentation |
| **Amberdata** | Normalized CVD by order size for retail/institutional separation |

### NETWORK SPIDER RESULTS (Feature 2)

**beatzxbt/mm-toolbox stargazers checked (30):** Users like 0xrinegade, ShabbirHasan1, MANU-TR3XX had no trade-size-bucketing repos. beatzxbt's own repos (mm-toolbox, smm) focus on market making internals.

**OctopusTakopi/binance_l3_est stargazers checked (30):** Users like crypt0grapher, maxholloway had no relevant repos. jose-donato has crypto-orderbook (110 stars) but no size bucketing.

**Tucsky/aggr ecosystem checked:** aggr uses "buckets" internally for market grouping (not trade size). aggr-lib and aggr-templates provide delta indicators but no trade-size bucketing. The dieselbabyy/aggrtrade-profiles repo mentions threshold-based liquidation filtering ($20K/$50K/$100K) which is conceptually similar.

---

## SUMMARY OF GITHUB SEARCHES PERFORMED

| Search Query | Results |
|-------------|---------|
| "filtered footprint" | 0 relevant (only PCB/aerial imaging) |
| "footprint filter volume" | 0 relevant |
| "trade size bucket" / "trade size group" | 0 relevant trading repos |
| "institutional flow" / "whale tracking" orderflow | Found gbzenobi, murtazayusuf, etc. (already known) |
| "large trade" filter crypto | 0 results |
| "trade classification" size | Found jktis/Trade-Classification-Algorithms (158 stars) — buyer/seller-initiated classification, not size bucketing |
| "flow decomposition" trading | Found Tripudium/cooc (1 star) |
| orderflow filter volume | 1 irrelevant result |
| "cluster search" / "cluster filter" footprint | Found existing known repos |
| footprint-chart topic | Found Linus404/Linus-Indicator-Collection (19 stars) |
| quantower indicator | Found Quantower/Examples (112 stars), agalindoc/quantower (25 stars) |
| "volume profile" filter threshold | Found bfolkens/py-market-profile (388 stars) — no filtering |
| "whale cvd" / "trade size cvd" | 0 results |
| `request.footprint` filter Pine Script | 0 GitHub results |

---

## CONCLUSIONS & RECOMMENDATIONS

### Feature 1: Filtered Footprints — PARTIALLY AVAILABLE

**Best open-source implementation:** gbzenobi/CSharp-NT8-OrderFlowKit `VolumeFilter.cs` (314 stars, C#/NinjaTrader 8)

This is a complete, production-quality filtered footprint with configurable min volume threshold, delta mode, and aggressive level scaling. The ATAS `ClusterSearch.cs` adds multi-dimensional cluster filtering. Both are NinjaTrader/ATAS platform-specific (C#).

**Gap for our use case:** No TypeScript/Rust/Python implementation exists. The logic is straightforward to port — the core is simply: for each price level in a footprint candle, skip rendering if `volume < threshold` (or `abs(delta) < threshold` in delta mode).

### Feature 2: Bucketed Trade Size Groups — NOT AVAILABLE IN OPEN SOURCE

**Closest open-source:** OctopusTakopi/binance_l3_est (208 stars, Rust) for K-Means trade clustering; TradingView Pine Scripts by colacorn for statistical whale detection with 3-tier sizing.

**The full feature (separate CVD per size bucket) exists only in commercial platforms** (Hyblock Capital, ATAS CVD Pro, Bookmap). No open-source repo implements the complete pipeline of: raw trades -> classify by notional bucket -> compute separate CVD/histogram per bucket -> render together.

**Implementation approach if building from scratch:**
1. Ingest raw trade stream (timestamp, price, size, side)
2. Compute notional value: `size * price`
3. Classify into buckets: e.g., `<$10K`, `$10K-$100K`, `$100K-$1M`, `>$1M`
4. For each bucket, maintain running CVD: `cvd += (side == 'buy' ? notional : -notional)`
5. Render separate CVD lines or stacked histograms per bucket

The raw data handling infrastructure exists in repos like tiagosiebler/orderflow, Tucsky/aggr, and OctopusTakopi/binance_l3_est. The bucketing and per-bucket CVD computation would need to be built on top.
