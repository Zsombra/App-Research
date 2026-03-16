# Sprint 7 Gap Features Research: Custom Session TPO & Community Indicator Marketplace

> **Research Date:** 2026-03-16
> **Methodology:** Spider-web approach across GitHub, npm, PyPI, platform docs, and OSS marketplace patterns

---

## Table of Contents

1. [Feature 1: Custom Session TPO (Market Profile)](#feature-1-custom-session-tpo-market-profile)
   - [Concept Definitions](#11-concept-definitions)
   - [Found Implementations (Tiered by Relevance)](#12-found-implementations-tiered-by-relevance)
   - [Algorithm Deep Dive](#13-algorithm-deep-dive)
   - [Gap Analysis](#14-gap-analysis)
   - [Implementation Recommendations](#15-implementation-recommendations)
2. [Feature 2: Community Indicator Marketplace](#feature-2-community-indicator-marketplace)
   - [Concept Definitions](#21-concept-definitions)
   - [Found Implementations (Tiered by Relevance)](#22-found-implementations-tiered-by-relevance)
   - [Architecture Deep Dive](#23-architecture-deep-dive)
   - [Gap Analysis](#24-gap-analysis)
   - [Implementation Recommendations](#25-implementation-recommendations)
3. [Cross-Feature Synergies](#cross-feature-synergies)
4. [Final Prioritized Recommendations](#final-prioritized-recommendations)

---

## Feature 1: Custom Session TPO (Market Profile)

### 1.1 Concept Definitions

**Market Profile** is a charting technique developed by J. Peter Steidlmayer at the CBOT in the 1980s. It organizes price and time data into a distribution curve (bell-shaped) that reveals where price spent the most time during a trading session.

**TPO (Time Price Opportunity)** is the core unit of Market Profile. Each TPO represents a single price level visited during a specific time period (typically 30-minute intervals). Letters of the alphabet (A, B, C...) are assigned to consecutive time periods, and stacked horizontally at each price level visited during that period.

**Key Market Profile Components:**

| Component | Definition |
|-----------|-----------|
| **POC (Point of Control)** | The price level with the highest number of TPOs -- where the market spent the most time |
| **Value Area (VA)** | The range of prices encompassing ~70% of TPO activity (configurable, typically 68-70%) |
| **VAH / VAL** | Value Area High / Value Area Low -- the boundaries of the value area |
| **Initial Balance (IB)** | The range established during the first hour (first two 30-min periods) of trading |
| **Single Prints** | Price levels with only one TPO letter -- indicating fast price movement through that level |
| **Excess** | TPOs at the extreme highs or lows indicating strong rejection |
| **Ledges** | Multiple sessions' POCs at similar price levels forming horizontal support/resistance |
| **Poor Highs/Lows** | Session extremes without single prints, indicating incomplete auction |

**Custom Sessions** allow traders to define arbitrary time windows for profile calculation rather than using standard exchange sessions. Common custom sessions include:

- **Asian Session**: ~00:00-08:00 UTC
- **London Open**: ~07:00-08:30 UTC
- **NY Open**: ~13:00-14:30 UTC
- **Overlap (London-NY)**: ~13:00-16:00 UTC
- **Custom hours**: User-defined start/end for any arbitrary time window

### 1.2 Found Implementations (Tiered by Relevance)

#### Tier 1: Directly Relevant (Core TPO/Market Profile Logic)

##### 1. `chart-patterns` (npm)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/focus1691/chart-patterns |
| **Docs** | https://focus1691.github.io/chart-patterns/ |
| **Stars** | ~15 (small but active) |
| **Language** | TypeScript |
| **npm** | `chart-patterns` (~104 weekly downloads) |
| **License** | Not explicitly stated (check repo) |
| **What it does** | Comprehensive TS library for Market Profile (TPO), Volume Profile, Order Flow (footprint candles), and candlestick pattern recognition. Supports session-based API with configurable candle grouping periods, tick size, price precision, and timezone. Includes Single Prints, Excess, Ledges, Initial Balance, and Value Area calculations. |
| **Relevance** | **HIGHEST** -- This is the only JavaScript/TypeScript package found with native TPO Market Profile support. Can be used directly in a web app. Session-based API means custom sessions are feasible. |
| **Key API** | `ta.MarketProfile.build({ candles, candleGroupingPeriod, tickSize, pricePrecision, tickMultiplier, timezone })` |

##### 2. `bfolkens/py-market-profile` (Python/PyPI)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/bfolkens/py-market-profile |
| **Stars** | 386 |
| **Language** | Python |
| **PyPI** | `MarketProfile` v0.2.0 (~311 weekly downloads) |
| **License** | BSD |
| **What it does** | Calculates Market Profile (TPO and Volume Profile) from Pandas DataFrames. Supports `MarketProfileSlice` with `open_range()` and `initial_balance()`. Distinguishes between TPO mode (time-based) and VOL mode (volume-based). |
| **Relevance** | **HIGH** -- Most popular Python Market Profile library. Algorithm is well-documented and can be ported to TypeScript. However, it lacks custom session configuration out of the box. Last updated 2020. |
| **Gap** | No custom session definitions; assumes standard session boundaries from DataFrame timestamps. |

##### 3. `EarnForex/MarketProfile` (MQL4/MQL5/cTrader)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/EarnForex/MarketProfile |
| **Stars** | ~177 |
| **Language** | MQL4, MQL5, C# (cTrader) |
| **License** | Not explicitly stated |
| **What it does** | The most feature-complete TPO implementation found. Supports: Intraday, daily, weekly, monthly, quarterly, semiannual, annual, and free-form rectangle sessions. Custom `ValueAreaPercentage` (default 70%). VAH/VAL rays. Alerts for crossing POC, VA, and Single Print zones. Up to 5 custom sessions per day with configurable start/end times. Rectangle-based arbitrary session definition. |
| **Relevance** | **HIGH** for algorithm reference -- Has the most configurable session system of any OSS implementation. MQL is not web-compatible but the logic/algorithms are directly portable. |
| **Key Feature** | Free-form rectangle session mode: draw a rectangle named 'MPR' on the chart and it calculates the profile for that arbitrary time range. |

##### 4. `beinghorizontal/tpo_project` (Python/Dash)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/beinghorizontal/tpo_project |
| **Stars** | ~125 |
| **Language** | Python (Plotly + Dash) |
| **License** | Not explicitly listed |
| **What it does** | Pure Python TPO visualization using Plotly/Dash. Calculates session time and Initial Balance automatically from 1-min data. Renders interactive TPO charts with letter-based profiles in the browser. Live streaming mode via Dash. Originally designed to feed TPO visuals to CNN for ML experimentation. |
| **Relevance** | **MEDIUM-HIGH** -- Has a web UI (Dash-based), but sessions are auto-calculated, not user-configurable. The TPO letter rendering logic and Plotly visualization approach are valuable references for building a web-based TPO chart. |
| **Related** | Same author has `tpo_btc` repo specifically for BTC data streaming. |

#### Tier 2: Supplementary / Partial Implementations

##### 5. `ColinEberhardt/market-profile-d3` (D3.js Gist)
| Field | Details |
|-------|---------|
| **URL** | https://gist.github.com/ColinEberhardt/0391a200d09c05883f8181f8093268f2 |
| **Blog** | https://blog.scottlogic.com/2017/08/23/market-profile.html |
| **Language** | JavaScript (D3 + d3fc) |
| **License** | N/A (Gist) |
| **What it does** | A D3-based Market Profile chart renderer. Groups prices into discrete time-periods, renders horizontal histograms showing volume at each price interval. Uses d3fc components. |
| **Relevance** | **MEDIUM** -- Excellent reference for the rendering/visualization layer. Shows how to build the horizontal histogram UI with D3. Does not include session configuration or TPO letter logic. |

##### 6. `sivamgr/tpo_market_profile` (Python)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/sivamgr/tpo_market_profile |
| **Stars** | 5 |
| **Language** | Python |
| **License** | Not listed |
| **What it does** | Minimal code to build TPO Market Profile charts from 1-min candles. |
| **Relevance** | **LOW** -- Very small, minimal implementation. Useful only as a quick algorithmic reference. |

##### 7. `pranshu0210/market-profile` (Python/PyPI)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/pranshu0210/market-profile |
| **PyPI** | `market-profile` v0.1.1 |
| **Language** | Python |
| **License** | Not listed |
| **What it does** | Generates Market Profile from OHLC data as Python list or Pandas DataFrame. Supports Normal Profile (distinct timeframes) and Compacted Profile (merged timeframes). CSV export. |
| **Relevance** | **LOW** -- Basic implementation without session configuration. |

##### 8. `VanHes1ng/Cryptocurrencies-volume-profile` (Python/Streamlit)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/VanHes1ng/Cryptocurrencies-volume-profile |
| **Language** | Python (Streamlit) |
| **License** | Not listed |
| **What it does** | Web app for crypto volume profile visualization with gradient color maps. Fetches data from Yahoo Finance. Interactive charts. |
| **Relevance** | **LOW** -- Volume Profile only (not TPO). But demonstrates a web-based crypto volume visualization pattern. |

#### Tier 3: Platform/Desktop Implementations (Reference Only)

##### 9. `flowsurface-rs/flowsurface` (Rust, Desktop)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/flowsurface-rs/flowsurface |
| **Stars** | 636 |
| **Language** | Rust |
| **License** | GPL-3.0 |
| **What it does** | Native desktop charting platform for crypto markets. Heatmap (Historical DOM), Footprint charts, Candlestick, Time & Sales, DOM/Ladder. Supports Binance, Bybit, Hyperliquid, OKX. Fixed or visible range volume profiles. |
| **Relevance** | **LOW-MEDIUM** -- Desktop-only (not web), but has volume profile with configurable aggregation. The Rust algorithms could be referenced for price grouping and aggregation logic. Most relevant as a crypto-native orderflow reference. |

##### 10. `react-financial/react-financial-charts` (TypeScript/React)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/react-financial/react-financial-charts |
| **Language** | TypeScript (React, D3) |
| **License** | MIT |
| **What it does** | TypeScript fork of react-stockcharts. Financial charting library for React. Extensible series system. No native Market Profile support, but the series architecture could be extended to add TPO rendering. |
| **Relevance** | **LOW-MEDIUM** -- No TPO out of the box, but the best React charting foundation if building a custom TPO series component. |

#### Commercial/Closed-Source References (For Algorithm Study)

| Platform | Custom Sessions | VA% Config | Key Insight |
|----------|----------------|------------|-------------|
| **TradingView** | Yes -- STPO indicator supports multiple custom session instances per chart | Yes | Multiple STPO instances can divide a day into custom periods. Each gets its own independent TPO profile. |
| **Sierra Chart** | Yes -- Up to 5 custom sessions per day with configurable begin/end times | Yes | Most granular session config in any platform. |
| **MotiveWave** | Yes -- Up to 3 session colors with custom time definitions | Yes | Color-coded sessions approach. |
| **NinjaTrader** | Yes -- TPO Profile Charts with session configuration | Yes | Web platform version recently added TPO. |
| **GoCharting** | Yes -- Multi-day profile merging, tick data volume profiles | Yes | Web-based but closed source. |

### 1.3 Algorithm Deep Dive

#### TPO Calculation Algorithm (derived from py-market-profile and chart-patterns)

```
ALGORITHM: Build TPO Market Profile

INPUT:
  - candles[]: Array of OHLCV candles (1-min or 5-min)
  - session: { start: Time, end: Time, timezone: string }
  - tickSize: number (price quantization step)
  - tpoInterval: number (minutes per TPO letter, default 30)
  - valueAreaPercent: number (default 0.70)

STEPS:

1. FILTER candles to session window:
   sessionCandles = candles.filter(c => c.time >= session.start && c.time < session.end)

2. ASSIGN TPO letters to time periods:
   letterIndex = 0
   currentPeriodStart = session.start
   FOR each tpoInterval chunk:
     letter = ALPHABET[letterIndex % 26]
     periodCandles = sessionCandles in this interval
     letterIndex++

3. QUANTIZE prices to tick grid:
   FOR each candle in period:
     lowTick = floor(candle.low / tickSize) * tickSize
     highTick = ceil(candle.high / tickSize) * tickSize
     FOR price = lowTick TO highTick STEP tickSize:
       tpoGrid[price].add(letter)

4. CALCULATE POC (Point of Control):
   poc = price with MAX tpoGrid[price].length

5. CALCULATE Value Area (expanding from POC):
   totalTPOs = sum of all tpoGrid[price].length
   targetTPOs = totalTPOs * valueAreaPercent

   vaTPOs = tpoGrid[poc].length
   upperPrice = poc
   lowerPrice = poc

   WHILE vaTPOs < targetTPOs:
     upperCandidate = sum of TPOs one tick above upperPrice
     lowerCandidate = sum of TPOs one tick below lowerPrice
     IF upperCandidate >= lowerCandidate:
       upperPrice += tickSize
       vaTPOs += upperCandidate
     ELSE:
       lowerPrice -= tickSize
       vaTPOs += lowerCandidate

   VAH = upperPrice
   VAL = lowerPrice

6. CALCULATE Initial Balance:
   ibCandles = first 2 TPO periods (first hour)
   IBH = max(ibCandles.high)
   IBL = min(ibCandles.low)

7. DETECT Single Prints:
   FOR each price in tpoGrid:
     IF tpoGrid[price].length == 1:
       singlePrints.add(price)

8. DETECT Excess:
   profileHigh = max price in tpoGrid
   profileLow = min price in tpoGrid
   IF tpoGrid[profileHigh].length >= 2: excessHigh = true
   IF tpoGrid[profileLow].length >= 2: excessLow = true

RETURN: { tpoGrid, poc, vah, val, ibh, ibl, singlePrints, excess }
```

#### Custom Session Management

The key architectural decision is how sessions are defined and stored:

```
SessionDefinition {
  id: string
  name: string              // "London Open", "Asian Session", etc.
  startTime: string         // "07:00" (HH:MM)
  endTime: string           // "08:30"
  timezone: string          // "Europe/London"
  daysOfWeek: number[]      // [1,2,3,4,5] (Mon-Fri)
  tpoInterval: number       // 30 (minutes)
  tickSize: number          // auto or manual
  valueAreaPercent: number   // 0.70
  color: string             // for multi-session overlay
  enabled: boolean
}
```

The EarnForex implementation uses the most sophisticated session model: sessions can be predefined (daily/weekly/monthly) or free-form rectangles. For a web app, the recommended approach is a **session template system** with preset templates (Asian, London, NY, Full Day) plus a custom session editor.

### 1.4 Gap Analysis

| Capability | chart-patterns (TS) | py-market-profile | EarnForex (MQL) | tpo_project (Python) | What We Need |
|------------|---------------------|-------------------|-----------------|---------------------|-------------|
| TPO letter assignment | Yes | Yes | Yes | Yes | Yes |
| Value Area calculation | Yes | Yes | Yes (configurable %) | Yes | Yes (configurable %) |
| POC detection | Yes | Yes | Yes | Yes | Yes |
| Initial Balance | Yes | Yes | Yes | Yes (auto) | Yes |
| Single Prints | Yes | No | Yes + alerts | No | Yes |
| Custom session times | Partial (timezone) | No | Yes (5 per day) | No | **Yes -- full UI** |
| Multiple sessions overlay | No | No | Yes | No | **Yes** |
| Free-form time selection | No | No | Yes (rectangle) | No | **Nice to have** |
| Web-based rendering | Calc only (no UI) | No (Python) | No (MQL) | Yes (Dash) | **Yes (React/Canvas)** |
| Real-time streaming | No | No | Yes | Yes (Dash) | **Yes** |
| Crypto exchange support | No (bring your data) | No | Forex only | BTC variant exists | **Yes (multi-exchange)** |
| Configurable tick size | Yes | Implicit | Yes | Auto | **Yes** |
| Session presets | No | No | Yes (daily/weekly/etc) | No | **Yes** |

**Critical Gaps (no OSS solution exists):**
1. No web-based (React/Canvas) TPO renderer with interactive session configuration UI
2. No implementation combines TPO calculation + custom session editor + real-time crypto data
3. No drag-to-select arbitrary time range for ad-hoc profile calculation
4. No multi-session overlay rendering in any web-based implementation

### 1.5 Implementation Recommendations

#### Recommended Architecture

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer (React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Session       │  │ TPO Chart    │  │ Profile    │ │
│  │ Config Panel  │  │ Renderer     │  │ Stats      │ │
│  │ (presets +    │  │ (Canvas/     │  │ (POC, VA,  │ │
│  │  custom)      │  │  WebGL)      │  │  IB, etc.) │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
├─────────────────────────────────────────────────────┤
│              Calculation Engine (TypeScript)          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ TPO Builder  │  │ Value Area   │  │ Session    │ │
│  │ (port from   │  │ Calculator   │  │ Manager    │ │
│  │  chart-      │  │              │  │            │ │
│  │  patterns)   │  │              │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
├─────────────────────────────────────────────────────┤
│                Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ WebSocket    │  │ Historical   │  │ Candle     │ │
│  │ Live Feed    │  │ API          │  │ Aggregator │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Build vs. Integrate Decision

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Use `chart-patterns` as calculation engine** | Already TypeScript, has TPO + VP + IB + Single Prints | Small community, 104 downloads/week, may need session customization patches | **Start here** -- fork or wrap |
| **Port `py-market-profile` to TypeScript** | Most popular algo (386 stars), BSD license, well-tested | Effort to port, no session support | Use as algorithm reference |
| **Port EarnForex session logic** | Most configurable sessions (5 per day, rectangles) | MQL is hard to read, license unclear | Use as session design reference |
| **Build from scratch** | Full control, crypto-optimized | Most effort | Only if chart-patterns proves inadequate |

#### Recommended Phased Approach

**Phase 1 -- Core TPO Engine (1-2 weeks)**
- Fork/wrap `chart-patterns` npm package for TPO calculation
- Add custom session definition support (start/end time, timezone, days of week)
- Add session preset templates (Asian, London, NY, Full Day, Custom)
- Port Value Area percentage configuration from EarnForex approach

**Phase 2 -- Web Renderer (2-3 weeks)**
- Build Canvas/WebGL TPO chart renderer (reference D3 gist for layout math)
- Render TPO letters horizontally at each price level
- Color-code by session (reference MotiveWave's 3-color approach)
- Overlay POC, VAH, VAL, IB lines with labels
- Highlight Single Prints and Excess zones

**Phase 3 -- Interactive Session Config UI (1 week)**
- Session preset selector dropdown
- Custom session editor (time picker for start/end, timezone selector, day checkboxes)
- Multi-session overlay toggle
- Drag-to-select for ad-hoc profile on chart (reference EarnForex's rectangle mode)

**Phase 4 -- Real-time Streaming (1 week)**
- Connect to existing WebSocket candle feed
- Incrementally update TPO profile as new candles arrive
- Animate current period's TPO letter assignment

---

## Feature 2: Community Indicator Marketplace

### 2.1 Concept Definitions

A **Community Indicator Marketplace** is a platform feature that allows users to:
1. **Browse** community-contributed indicators, strategies, and chart configurations
2. **Rate/Review** contributions (stars, comments, usage counts)
3. **Install** indicators into their workspace with one click
4. **Share** their own custom indicators with the community
5. **Update** installed indicators when authors publish new versions

This pattern exists in various forms across the software ecosystem:

| Platform | Marketplace Name | Scale | Model |
|----------|-----------------|-------|-------|
| TradingView | Community Scripts | 150,000+ scripts | Pine Script, open/protected/invite-only |
| NinjaTrader | Ecosystem / User App Share | 1,000+ apps | NinjaScript (C#), free + paid |
| MetaTrader | MQL5 Market | 10,000+ products | MQL4/MQL5, free + paid |
| cTrader | cTrader Plugins | Hundreds | C#, mostly free |
| VS Code | Extension Marketplace | 50,000+ extensions | JavaScript/TypeScript |
| Grafana | Plugin Catalog | Hundreds | React/Go plugins |

### 2.2 Found Implementations (Tiered by Relevance)

#### Tier 1: Trading-Specific Community Indicator Systems

##### 1. `Tucsky/aggr-lib` (GitHub-backed community indicators for aggr.trade)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/Tucsky/aggr-lib |
| **Stars** | ~44 |
| **Language** | JSON (indicator definitions), JavaScript |
| **License** | Not explicitly listed |
| **What it does** | Community-driven repository for sharing indicators, panes, and workspaces for aggr.trade. The aggr.trade app directly pulls indicators from this GitHub repo -- new/updated indicators are available on the site automatically. Contributors fork the repo, add their indicator JSON, and submit a PR. |
| **Relevance** | **HIGHEST** -- This is the closest existing OSS implementation to what we need. It demonstrates a working Git-backed indicator sharing system for a crypto trading app. However, it lacks: a browse/search UI, ratings, versioning, and one-click install from within the app. |
| **Architecture** | Git repo as the indicator registry. PR-based contribution flow. App fetches indicator list from GitHub API at runtime. |

##### 2. `Tucsky/aggr-lib-server` (Community script aggregator)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/Tucsky/aggr-lib-server |
| **Stars** | ~5 |
| **Language** | JavaScript |
| **What it does** | Server-side aggregator that serves community scripts from aggr-lib to the aggr.trade application. Acts as a proxy/cache between the GitHub repo and the app. |
| **Relevance** | **HIGH** -- Shows the server-side pattern for serving community indicators. This is the missing "marketplace backend" layer between the Git repo and the app. |

##### 3. `Tucsky/aggr` (Main aggr.trade application)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/Tucsky/aggr |
| **Stars** | ~2,000+ |
| **Language** | Vue.js, TypeScript |
| **License** | Not listed |
| **What it does** | Cryptocurrency trades aggregator with live charts. The main app that consumes community indicators from aggr-lib. Has a built-in indicator system with custom scripting support. |
| **Relevance** | **HIGH** -- Reference for how a crypto trading app integrates community indicators. The indicator format (JSON-based definitions) and the import/export workflow are directly relevant. |

##### 4. `aggr-templates` repositories (Community templates)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/cryptorife/aggr-templates, https://github.com/0xd3lbow/aggr.template |
| **What they do** | Community-created indicator templates and workspace configurations for aggr.trade. Delta indicators, CVD plots, exchange-specific panels. Distributed as JSON files that users download and import. |
| **Relevance** | **MEDIUM** -- Shows the organic community template ecosystem that emerges around a trading app. Templates are distributed via GitHub repos, blog posts, and Discord -- not through an in-app marketplace. |

#### Tier 2: Generic Plugin/Extension Marketplace Implementations

##### 5. `eclipse/openvsx` (Open VSX Registry)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/eclipse/openvsx |
| **Stars** | 1,878 |
| **Language** | Java (Spring Boot backend), TypeScript/React (frontend) |
| **License** | EPL-2.0 |
| **What it does** | Full-featured open-source extension marketplace for VS Code extensions. Browse/search UI, publisher accounts, extension versioning, reviews, download counts, categories, security scanning (secret detection, blocklist, typosquat prevention). Hosted publicly at open-vsx.org with 2M+ monthly downloads. |
| **Relevance** | **HIGH** -- The gold standard for OSS marketplace architecture. The React-based browse UI, search/filter system, publisher model, and security scanning patterns are directly applicable. Way over-engineered for our initial needs, but the architecture is the reference. |
| **Stack** | Spring Boot, PostgreSQL, Elasticsearch, Redis/Caffeine cache, React frontend, S3/Azure/GCS storage, OAuth2 auth |

##### 6. `coder/code-marketplace` (Lightweight VS Code marketplace)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/coder/code-marketplace |
| **Stars** | ~200 |
| **Language** | Go |
| **License** | Not listed |
| **What it does** | Minimal open-source extension marketplace. Single binary, no database, reads extensions from filesystem or Artifactory. Provides API for editors to search/download. In-memory caching with configurable TTL. Designed for air-gapped enterprise deployments. |
| **Relevance** | **MEDIUM-HIGH** -- Shows that a marketplace can be extremely simple: no database, filesystem-backed, single binary. Good model for an MVP marketplace. However, has no web UI frontend. |
| **Key Insight** | No database pattern: scans filesystem on demand, caches extension list in memory. Adding an extension = dropping a file in a directory. |

##### 7. Grafana Plugin Catalog
| Field | Details |
|-------|---------|
| **URL** | https://github.com/grafana/grafana-plugin-repository (deprecated) |
| **Docs** | https://grafana.com/developers/plugin-tools/ |
| **What it does** | In-app plugin catalog with browse/search/install. Three plugin types: Panels, Data Sources, Apps. New submission flow with automated validation + manual code review. Plugin signing required. One-click install from Grafana UI. |
| **Relevance** | **MEDIUM** -- Good reference for the in-app install experience and plugin type categorization. The review/validation pipeline is relevant for quality control. Grafana's plugin architecture (React-based panels) is conceptually similar to trading indicators. |
| **Key Insight** | Plugin types map well to trading: Panels=Chart Types, Data Sources=Exchange Connectors, Apps=Indicator Bundles. |

##### 8. `GeekyAnts/react-pluggable` (React plugin architecture)
| Field | Details |
|-------|---------|
| **URL** | https://github.com/GeekyAnts/react-pluggable |
| **Stars** | ~400 |
| **Language** | TypeScript/React |
| **License** | MIT |
| **What it does** | Plugin system for React apps. Features: PluginStore for install/uninstall, plugin lifecycle (init/activate/deactivate), event system, dependency injection. Think of app as set of features, not components. |
| **Relevance** | **MEDIUM** -- Useful for the client-side plugin runtime architecture. Shows how to dynamically install/uninstall features in a React app with proper lifecycle management. Does not include a marketplace UI. |

#### Tier 3: General Marketplace Platforms (Architecture Reference)

##### 9. TradingView Community Scripts (Closed Source Reference)
| Field | Details |
|-------|---------|
| **URL** | https://www.tradingview.com/scripts/ |
| **Scale** | 150,000+ community scripts |
| **What it does** | The canonical trading indicator marketplace. Browse by category, search, sort by popularity/recency. Star ratings, comments, usage counts. Three visibility modes: open-source, protected (obfuscated), invite-only. Pine Script runtime with sandboxed execution. Version history. Author profiles with follower counts. |
| **Relevance** | **HIGH as design reference** -- This is the UX gold standard. Key patterns: category taxonomy, "trending" algorithm, author reputation system, script visibility modes, fork/modify workflow. |
| **Key Patterns** | Categories: Trend Analysis, Oscillators, Volume, Volatility, Moving Averages, Bill Williams, Candlestick, etc. Each script shows: author, description, Pine version, likes, comments, chart preview. |

##### 10. NinjaTrader Ecosystem
| Field | Details |
|-------|---------|
| **URL** | https://ninjatraderecosystem.com/ |
| **Docs** | https://developer.ninjatrader.com/docs/ecosystem |
| **What it does** | Marketplace for indicators, strategies, and add-ons. All scripts are open-source (NinjaScript/C#). User App Share for free community contributions. Forum-based submission with review. Hundreds of free indicators. |
| **Relevance** | **MEDIUM** -- Shows a marketplace where all code is open-source by default. The "User App Share" model (community forum + download) is simpler than TradingView's approach. |
| **Key Insight** | Open-source-by-default policy simplifies the marketplace significantly. No DRM, no licensing complexity. Community self-moderates through forum. |

### 2.3 Architecture Deep Dive

#### Pattern Comparison: Three Marketplace Architectures

##### Pattern A: Git-Backed Registry (aggr-lib model)
```
┌─────────────┐     PR      ┌──────────────┐    fetch    ┌─────────┐
│  Contributor │───────────→ │  GitHub Repo │ ──────────→ │   App   │
│  (fork+PR)  │             │  (aggr-lib)  │            │ (aggr)  │
└─────────────┘             └──────────────┘            └─────────┘
                                   │
                              aggr-lib-server
                              (aggregator/cache)
```
- **Pros:** Zero infrastructure, version control built-in, PR review process, familiar to developers
- **Cons:** No ratings/reviews, no search UI, no non-developer contributions, PR bottleneck
- **Best for:** Developer-focused communities, MVP phase

##### Pattern B: Lightweight Filesystem Marketplace (code-marketplace model)
```
┌─────────────┐   upload    ┌──────────────┐   browse    ┌─────────┐
│   Author    │───────────→ │  Marketplace │ ←─────────→ │   App   │
│             │             │   Server     │   install   │         │
└─────────────┘             │  (Go binary) │            └─────────┘
                            │  filesystem  │
                            └──────────────┘
```
- **Pros:** Simple deployment (single binary), no database, fast reads from filesystem
- **Cons:** No ratings, limited search, no user accounts, single-server
- **Best for:** Internal/enterprise deployments, small communities

##### Pattern C: Full Marketplace Platform (Open VSX model)
```
┌─────────────┐  publish    ┌──────────────────────────────────────┐
│   Author    │───────────→ │         Marketplace Platform         │
│  (CLI tool) │             │  ┌────────┐ ┌─────┐ ┌────────────┐  │
└─────────────┘             │  │ API    │ │ DB  │ │ Search     │  │
                            │  │ Server │ │(PG) │ │(Elastic)   │  │
┌─────────────┐  browse     │  └────────┘ └─────┘ └────────────┘  │
│    User     │←──────────→ │  ┌────────────────┐ ┌────────────┐  │
│   (App)     │  install    │  │  React Web UI  │ │  Storage   │  │
└─────────────┘             │  │  (browse/rate)  │ │  (S3/FS)  │  │
                            │  └────────────────┘ └────────────┘  │
                            └──────────────────────────────────────┘
```
- **Pros:** Full-featured (search, ratings, reviews, versioning, security scanning), scalable
- **Cons:** Complex infrastructure, significant development effort
- **Best for:** Large communities, production platforms

#### Indicator Format Design

Based on analysis of aggr-lib's JSON format and TradingView's Pine Script approach:

```json
{
  "manifest": {
    "id": "community/rsi-divergence-v2",
    "name": "RSI Divergence Detector",
    "version": "2.1.0",
    "author": {
      "name": "CryptoTrader99",
      "github": "cryptotrader99"
    },
    "description": "Detects bullish and bearish RSI divergences with configurable lookback",
    "category": "oscillators",
    "tags": ["rsi", "divergence", "reversal"],
    "license": "MIT",
    "compatibility": ">=1.0.0",
    "inputs": [
      { "name": "rsiLength", "type": "number", "default": 14, "min": 2, "max": 100 },
      { "name": "lookback", "type": "number", "default": 5, "min": 2, "max": 50 }
    ],
    "outputs": [
      { "name": "rsi", "type": "line", "color": "#7E57C2" },
      { "name": "bullDiv", "type": "marker", "shape": "triangle_up" },
      { "name": "bearDiv", "type": "marker", "shape": "triangle_down" }
    ]
  },
  "code": "... indicator calculation logic ...",
  "preview": "https://cdn.example.com/previews/rsi-divergence-v2.png"
}
```

### 2.4 Gap Analysis

| Capability | aggr-lib (Git) | TradingView (Closed) | Open VSX (OSS) | Grafana (OSS) | What We Need |
|------------|---------------|---------------------|----------------|---------------|-------------|
| Browse UI | No | Yes (web) | Yes (web+IDE) | Yes (in-app) | **Yes (in-app)** |
| Search/Filter | No | Yes (category, type) | Yes (Elasticsearch) | Yes (category) | **Yes** |
| Ratings/Reviews | No | Yes (likes, comments) | Yes (stars) | No | **Yes (stars + comments)** |
| One-click Install | No (manual import) | Yes | Yes | Yes | **Yes** |
| Author Profiles | No (GitHub user) | Yes (followers, bio) | Yes (publisher) | No | **Nice to have** |
| Version Management | Git tags (implicit) | Yes | Yes (semver) | Yes | **Yes** |
| Category Taxonomy | Folder structure | Rich taxonomy | Categories + tags | 3 types | **Yes** |
| Security Scanning | PR review | Internal | Yes (secrets, blocklist) | Yes (signing) | **Phase 2** |
| Paid/Premium | No | Yes (protected/invite) | No | Yes (enterprise) | **Phase 3 maybe** |
| Fork/Modify | Yes (Git fork) | Yes (Pine fork) | No | No | **Yes** |
| Preview/Screenshot | No | Yes (live chart) | Yes (screenshots) | Yes | **Yes** |
| Offline/Local | Yes (clone) | No | Yes (self-host) | Yes | **Nice to have** |
| Contribution Flow | Fork + PR | Publish button | CLI publish | CLI + review | **Web UI publish** |

**Critical Gaps:**
1. No OSS trading app has a full browse/rate/install marketplace UI for community indicators
2. aggr-lib is the closest but lacks any marketplace UI -- it is purely a Git repo
3. No existing solution combines: trading-specific indicator format + marketplace UI + crypto context
4. Rating/review systems exist in generic marketplaces (Open VSX) but not in any trading-specific OSS project
5. No OSS implementation has TradingView-style live chart previews for community indicators

### 2.5 Implementation Recommendations

#### Recommended Architecture: Hybrid Git + API Marketplace

Combine the simplicity of aggr-lib's Git-backed model with a lightweight marketplace API and in-app browse UI.

```
┌─────────────────────────────────────────────────────────────────┐
│                        In-App Marketplace UI                     │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ Browse /   │ │  Indicator   │ │  Ratings   │ │  My        │ │
│  │ Search     │ │  Detail      │ │  & Reviews │ │  Installed │ │
│  │ (grid view │ │  (preview,   │ │            │ │  (manage)  │ │
│  │  + filters)│ │   params,    │ │            │ │            │ │
│  │            │ │   install)   │ │            │ │            │ │
│  └────────────┘ └──────────────┘ └────────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Marketplace API (Backend)                    │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Registry       │  │ Ratings /    │  │ GitHub Sync          │ │
│  │ (list, search, │  │ Reviews      │  │ (fetch indicators    │ │
│  │  detail, dl)   │  │ (stars, text)│  │  from community repo)│ │
│  └────────────────┘  └──────────────┘  └──────────────────────┘ │
│         ↕                    ↕                    ↕              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        Database (PostgreSQL or SQLite)                    │   │
│  │  indicators | ratings | installs | authors | versions    │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                   Indicator Sources                               │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐ │
│  │ GitHub Repo   │  │ Direct Upload  │  │ Built-in /          │ │
│  │ (community    │  │ (web form)     │  │ Official            │ │
│  │  PRs, like    │  │                │  │ Indicators          │ │
│  │  aggr-lib)    │  │                │  │                     │ │
│  └───────────────┘  └────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Recommended Phased Approach

**Phase 1 -- Indicator Format & Runtime (2 weeks)**
- Define indicator manifest schema (JSON, inspired by aggr-lib format)
- Build indicator sandbox/runtime (execute community code safely)
- Implement indicator lifecycle: load, configure (inputs), calculate, render (outputs)
- Support indicator import/export as JSON files (baseline, like aggr templates)
- Reference: `react-pluggable` for plugin lifecycle pattern (init/activate/deactivate)

**Phase 2 -- Git-Backed Community Repo (1 week)**
- Create a community indicators GitHub repo (follow aggr-lib pattern)
- Build GitHub sync service: periodically fetch indicator list from repo
- Organize by category in folder structure
- PR-based contribution flow with automated validation (lint, schema check)

**Phase 3 -- In-App Marketplace UI (2-3 weeks)**
- Browse view: grid/list of indicators with category filters, search, sort (popular/recent/trending)
- Detail view: description, author info, preview screenshot, parameter list, install button
- Installed view: list of installed indicators, enable/disable, update available badge
- Rating system: 1-5 stars + optional text review (stored in backend DB)
- Reference: Open VSX React frontend for browse/search patterns, Grafana for in-app install UX

**Phase 4 -- Direct Publish Flow (1-2 weeks)**
- Web UI for authors to publish indicators (upload JSON + preview image)
- Automated validation pipeline (schema validation, basic security checks)
- Version management with semver
- Author profiles with published indicators list and aggregate ratings

**Phase 5 -- Advanced Features (Ongoing)**
- Live chart preview generation (render indicator on sample data, screenshot)
- Fork/modify existing community indicators
- Collections/bundles (curated indicator sets)
- Usage analytics (install count, active users)
- Security scanning (reference Open VSX's secret detection pattern)

#### Client-Side Plugin Runtime Architecture

```typescript
interface IndicatorPlugin {
  manifest: IndicatorManifest;

  // Lifecycle
  init(context: IndicatorContext): void;
  calculate(candles: Candle[], params: Record<string, any>): IndicatorOutput;
  dispose(): void;
}

interface IndicatorContext {
  // Provided by the app
  symbol: string;
  timeframe: string;
  exchange: string;
}

interface IndicatorOutput {
  series: { name: string; data: number[]; type: 'line' | 'histogram' | 'marker' }[];
  overlays: { price: number; label: string; color: string }[];
}

class PluginStore {
  private plugins: Map<string, IndicatorPlugin>;

  install(indicator: IndicatorManifest & { code: string }): void;
  uninstall(id: string): void;
  enable(id: string): void;
  disable(id: string): void;
  getInstalled(): IndicatorPlugin[];
  calculate(id: string, candles: Candle[], params: Record<string, any>): IndicatorOutput;
}
```

For security, community indicator code should run in a **Web Worker** or **sandboxed iframe** to prevent access to the main app's DOM, storage, or network. This is critical for user trust.

---

## Cross-Feature Synergies

The two features intersect in important ways:

1. **Custom Session TPO as a Community Indicator**: Once the marketplace exists, the TPO/Market Profile feature itself could be distributed as a "premium built-in" indicator, demonstrating the marketplace's capability. Community members could create session presets (e.g., "Crypto Whale Session" based on on-chain analysis, "CME Gap Fill Session") and share them through the marketplace.

2. **Session Presets as Shareable Content**: Custom session definitions (London Open, Asian Session, etc.) are themselves a type of community content. The marketplace could have a "Sessions" category alongside "Indicators" and "Templates."

3. **Indicator + Profile Combos**: Community indicators that combine TPO data with other signals (e.g., "TPO + Volume Delta Divergence", "Session POC with RSI") would be natural marketplace content.

4. **Template Workspaces**: Like aggr-templates, users could share entire workspace configurations that include specific session TPO setups combined with community indicators, creating a "Strategy Template" marketplace category.

---

## Final Prioritized Recommendations

### Priority Matrix

| Feature | Effort | Impact | OSS Foundation | Priority |
|---------|--------|--------|---------------|----------|
| TPO Calculation Engine (based on chart-patterns) | Low (1-2 weeks) | High | Strong (chart-patterns npm) | **P0** |
| Custom Session Configuration UI | Medium (1 week) | High | Partial (EarnForex logic) | **P0** |
| TPO Chart Renderer (Canvas/WebGL) | Medium-High (2-3 weeks) | High | Weak (D3 gist only) | **P0** |
| Indicator Format + Runtime | Medium (2 weeks) | High | Medium (aggr-lib format) | **P1** |
| Git-Backed Community Repo | Low (1 week) | Medium | Strong (aggr-lib pattern) | **P1** |
| In-App Marketplace Browse UI | Medium (2-3 weeks) | High | Medium (Open VSX React) | **P1** |
| Ratings & Reviews System | Low (1 week) | Medium | Medium (Open VSX) | **P2** |
| Direct Publish Flow | Medium (1-2 weeks) | Medium | Medium (Open VSX CLI) | **P2** |
| Security Sandbox (Web Worker) | Medium (1 week) | High (security) | Weak | **P2** |
| Live Preview Generation | High (2 weeks) | Low-Medium | None | **P3** |

### Key OSS Dependencies to Track

| Package/Repo | What We Use It For | Risk Level |
|-------------|-------------------|------------|
| `chart-patterns` (npm) | TPO calculation engine | Medium (small community, single maintainer) |
| `react-financial-charts` | Chart rendering foundation | Low (established, MIT) |
| `react-pluggable` | Plugin lifecycle pattern | Low (MIT, reference only) |
| `aggr-lib` pattern | Community repo structure | None (pattern, not dependency) |
| Open VSX architecture | Marketplace design reference | None (reference only) |
| `py-market-profile` | Algorithm validation reference | None (Python, reference only) |

### Technology Stack Recommendation

- **TPO Engine:** TypeScript (fork/wrap `chart-patterns` or build from scratch using its algorithms)
- **Chart Renderer:** HTML5 Canvas with React wrapper (or integrate with existing charting lib)
- **Marketplace Backend:** Node.js/Express or existing app backend + PostgreSQL
- **Marketplace Frontend:** React components (in-app, not separate site)
- **Indicator Runtime:** Web Workers for sandboxed execution
- **Community Repo:** GitHub with automated CI validation
- **Search:** PostgreSQL full-text search (MVP) or Elasticsearch (scale)
