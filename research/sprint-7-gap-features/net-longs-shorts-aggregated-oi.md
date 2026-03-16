# Sprint 7 Gap Features Research: Net Longs/Shorts & Aggregated Open Interest

**Date:** 2026-03-16
**Research Methodology:** Spider-web approach across GitHub, PyPI, npm, TradingView, exchange API docs
**Status:** Complete

---

## Table of Contents

1. [Concept Definitions](#1-concept-definitions)
2. [Feature 1: Net Longs/Shorts Decomposition](#2-feature-1-net-longsshorts-decomposition)
3. [Feature 2: Aggregated Open Interest](#3-feature-2-aggregated-open-interest)
4. [Found Implementations (Tiered by Relevance)](#4-found-implementations-tiered-by-relevance)
5. [Exchange API Capabilities](#5-exchange-api-capabilities)
6. [Algorithm Deep Dives](#6-algorithm-deep-dives)
7. [Gap Analysis](#7-gap-analysis)
8. [Implementation Recommendations](#8-implementation-recommendations)

---

## 1. Concept Definitions

### Net Longs/Shorts Decomposition

The **long/short ratio** measures the proportion of traders (or positions) that are long vs short on a futures/perpetual contract. There are several variants:

- **Global Long/Short Account Ratio**: Proportion of all accounts holding long vs short positions across all traders on an exchange.
- **Top Trader Long/Short Account Ratio**: Same metric but restricted to the top 20% of traders by margin balance (Binance-specific).
- **Top Trader Long/Short Position Ratio**: Net long vs net short *position sizes* of top 20% traders.
- **Taker Buy/Sell Ratio**: Ratio of taker buy volume vs taker sell volume -- a proxy for aggressive buying/selling pressure.

**Formula:**
```
Long/Short Ratio = Long Account Count / Short Account Count
```
- Ratio > 1: More accounts are long than short (bullish sentiment)
- Ratio < 1: More accounts are short than long (bearish sentiment)

CoinGlass combines all four types across multiple exchanges into a unified dashboard. No standalone open-source repo replicates this full aggregated view.

### Aggregated Open Interest (OI)

**Open Interest** = total number of outstanding derivative contracts (both long and short) that have not been settled. Each contract has both a long and a short side, so OI counts each contract once.

**Aggregated OI** = OI data from multiple exchanges (Binance, Bybit, OKX, Deribit, Bitget, etc.) summed into a single time-series. Must handle:

- Coin-margined vs stablecoin-margined contract normalization (convert to USD)
- Different contract sizes across exchanges
- De-duplication (same asset, different trading pairs like BTC/USDT, BTC/USD, BTC/BUSD)

**OI Delta** = Change in OI over a period. Positive delta + price up = new longs opening. Positive delta + price down = new shorts opening. Negative delta = positions being closed/liquidated.

---

## 2. Feature 1: Net Longs/Shorts Decomposition

### Current Landscape

**Commercial Platforms:**
- CoinGlass: The gold standard -- aggregates L/S ratios from Binance, OKX, Bybit, Bitget, dYdX, and more
- Coinalyze: Similar aggregation with charting
- CryptoQuant: Institutional-grade data with on-chain metrics

**Open-Source Status: SPARSE.** No standalone OSS repo exists that aggregates long/short ratios across multiple exchanges. The functionality exists only as:
1. Single-exchange data dumpers
2. CoinGlass API wrappers (requires paid API key)
3. TradingView Pine Scripts (limited to TV's data feeds)

---

## 3. Feature 2: Aggregated Open Interest

### Current Landscape

**Commercial Platforms:**
- CoinGlass: Aggregated OI OHLC across all major exchanges
- Coinalyze: Aggregated OI with USD normalization
- Laevitas: Derivatives-focused analytics with OI by exchange/expiry/strike
- The Block: Aggregated OI charts (daily granularity)

**Open-Source Status: PARTIAL.** Building blocks exist but no turnkey aggregator:
1. `cryptofeed` can stream OI from individual exchanges via WebSocket
2. `moonStreamProcess` aggregates OI across exchanges but only for BTC
3. CCXT provides unified `fetch_open_interest()` across 100+ exchanges
4. Individual exchange SDKs expose OI endpoints

---

## 4. Found Implementations (Tiered by Relevance)

### Tier 1: Directly Relevant (Core Building Blocks)

#### 4.1 bmoscon/cryptofeed
| Field | Value |
|-------|-------|
| **URL** | https://github.com/bmoscon/cryptofeed |
| **Stars** | ~2,800 |
| **Language** | Python |
| **License** | XFree86 |
| **What it does** | Multi-exchange WebSocket data feed handler with normalized output. Supports OPEN_INTEREST channel across Binance Futures, Bybit, OKX, Deribit, Bitget, and more. Backends include Redis, Kafka, Postgres, InfluxDB. |
| **Relevance** | HIGH -- Best foundation for real-time OI streaming from multiple exchanges. Already handles normalization and supports 25+ exchanges. Does NOT aggregate across exchanges (delivers per-exchange feeds). |
| **Gap** | No built-in aggregation layer. No long/short ratio support. You must build the aggregation/summation logic on top. |

#### 4.2 IndianaBug/moonStreamProcess
| Field | Value |
|-------|-------|
| **URL** | https://github.com/IndianaBug/moonStreamProcess |
| **Stars** | <50 (small project) |
| **Language** | Python |
| **License** | Not specified |
| **What it does** | Crypto data aggregator that processes order books, trades, liquidations, and open interest from 11+ exchanges (Binance, OKX, Bybit, Bitget, BingX, KuCoin, Deribit, Coinbase, HTX, Gate.io, MEXC). Creates 1-minute heatmap summaries. |
| **Relevance** | HIGH -- The closest thing to what we need. Actually aggregates OI across exchanges into unified summaries. |
| **Gap** | BTC-only. No long/short ratio. No web API/dashboard. Caution about Deribit OI data quality issues. |

#### 4.3 ccxt/ccxt
| Field | Value |
|-------|-------|
| **URL** | https://github.com/ccxt/ccxt |
| **Stars** | ~34,000 |
| **Language** | JavaScript/TypeScript/Python/C#/PHP/Go |
| **License** | MIT |
| **What it does** | Unified API for 100+ crypto exchanges. Provides `fetch_open_interest()`, `fetch_open_interest_history()`, and `fetch_funding_rate_history()` with normalized responses. |
| **Relevance** | HIGH -- Best abstraction layer for pulling OI and funding data from any exchange. Handles auth, rate limiting, pagination. |
| **Gap** | No aggregation logic. No long/short ratio endpoints (these are exchange-specific and not standardized in CCXT). REST-only for OI (no WebSocket streaming). |

#### 4.4 dineshpinto/coinglass-api
| Field | Value |
|-------|-------|
| **URL** | https://github.com/dineshpinto/coinglass-api |
| **Stars** | ~54 |
| **Language** | Python |
| **License** | MIT (from LICENSE.md) |
| **What it does** | Python wrapper for CoinGlass API. Returns pandas DataFrames with DateTimeIndex. Covers all CoinGlass endpoints including aggregated OI, long/short ratios, liquidations, funding rates. |
| **Relevance** | HIGH for rapid prototyping -- gives instant access to pre-aggregated data. |
| **Gap** | Requires CoinGlass API key (paid). Deprecated API version (v2, needs update to v4). Dependency on third-party commercial service. |

#### 4.5 ckaraca/coinglass-apiv3
| Field | Value |
|-------|-------|
| **URL** | https://github.com/ckaraca/coinglass-apiv3 |
| **Stars** | <20 |
| **Language** | Python |
| **License** | MIT |
| **What it does** | Fork of dineshpinto's wrapper, updated for CoinGlass API v3. |
| **Relevance** | MEDIUM-HIGH -- More up-to-date than the original, but CoinGlass is now on v4. |
| **Gap** | Same commercial dependency as above. Still one version behind. |

### Tier 2: Useful Components

#### 4.6 tardis-dev/tardis-node
| Field | Value |
|-------|-------|
| **URL** | https://github.com/tardis-dev/tardis-node |
| **Stars** | ~292 |
| **Language** | TypeScript |
| **License** | MPL-2.0 |
| **What it does** | Tick-level historical data replay and real-time streaming for crypto. Supports open interest, funding rates, liquidations across major exchanges. Normalized data format. |
| **Relevance** | MEDIUM-HIGH -- Excellent for historical OI data replay and backtesting. TypeScript-native. |
| **Gap** | Freemium model (tardis.dev API for historical data requires paid plan for full access). No aggregation logic built in. |

#### 4.7 tiagosiebler Exchange SDKs (bybit-api, okx-api, binance)
| Field | Value |
|-------|-------|
| **URL** | https://github.com/tiagosiebler/bybit-api / okx-api / binance |
| **Stars** | ~300-600 each |
| **Language** | TypeScript |
| **License** | MIT |
| **What it does** | Professional Node.js/TypeScript SDKs for individual exchanges. Full REST + WebSocket support. `bybit-api` has `getOpenInterest()`, `getLongShortRatio()`. `okx-api` covers `getOpenInterest()`. |
| **Relevance** | MEDIUM -- Excellent per-exchange SDKs if building TypeScript. Well-maintained, well-typed. |
| **Gap** | Per-exchange only. No cross-exchange aggregation. Must build unification layer. |

#### 4.8 maxisoft/binance-dumper
| Field | Value |
|-------|-------|
| **URL** | https://github.com/maxisoft/binance-dumper |
| **Stars** | ~3 |
| **Language** | Nim |
| **License** | Not specified |
| **What it does** | Saves Binance Futures long/short ratios, open interest, and buy/sell ratios to CSV files. Targets data with no permanent retention on Binance. |
| **Relevance** | LOW-MEDIUM -- Demonstrates the data collection pattern. Nim language limits reusability. |
| **Gap** | Binance-only. Nim language. Tiny community. No aggregation. |

#### 4.9 thepinkboxterminal/Coinglass-API
| Field | Value |
|-------|-------|
| **URL** | https://github.com/thepinkboxterminal/Coinglass-API |
| **Stars** | <20 |
| **Language** | Python |
| **What it does** | Another CoinGlass API wrapper covering futures, options, funding rates, liquidations, long/short ratios. |
| **Relevance** | MEDIUM -- Alternative CoinGlass wrapper if others are outdated. |
| **Gap** | Same commercial API dependency. |

#### 4.10 kir1l/Funding-Arbitrage-Screener
| Field | Value |
|-------|-------|
| **URL** | https://github.com/kir1l/Funding-Arbitrage-Screener |
| **Stars** | <50 |
| **Language** | Python |
| **License** | MIT |
| **What it does** | Funding rate screener across Binance, OKX, Bybit, MEXC. Shows cross-exchange funding rate differences. |
| **Relevance** | LOW-MEDIUM -- Pattern for multi-exchange data fetching. Funding rates correlate with L/S positioning. |
| **Gap** | No OI. No long/short ratio. Focused on arbitrage, not analytics. |

### Tier 3: TradingView Pine Scripts (Reference Implementations)

#### 4.11 BIGTAKER - Major Exchanges Total OI & Long/Short OI Trends
| Field | Value |
|-------|-------|
| **URL** | https://www.tradingview.com/script/FSwMBy3Q |
| **Language** | Pine Script v5 |
| **Open Source** | Yes (published open-source on TradingView) |
| **What it does** | Aggregates OI from Binance, Bybit, OKX, Bitget, HTX, Deribit. Estimates long/short OI decomposition using price + OI delta logic. Supports line and candlestick display. |
| **Relevance** | HIGH for algorithm reference -- contains the estimation algorithm for decomposing OI into longs vs shorts. |
| **Gap** | Pine Script only (cannot run outside TradingView). Limited to TV's data feeds. Estimation starts from 50:50 assumption. |

#### 4.12 Leviathan - Open Interest Delta
| Field | Value |
|-------|-------|
| **URL** | https://www.tradingview.com/script/4EMVvBkC |
| **Language** | Pine Script |
| **Open Source** | Yes |
| **What it does** | Plots OI Delta (change in OI per bar). Includes heatmap visualization and candle coloring for large OI changes. |
| **Relevance** | MEDIUM -- Good reference for OI delta visualization patterns. |

#### 4.13 Alpha Extract - Aggregated Open Interest
| Field | Value |
|-------|-------|
| **URL** | https://www.tradingview.com/script/cM5WCKBL |
| **Language** | Pine Script |
| **What it does** | Aggregated OI across exchanges with OI Candles (OHLC of total OI), OI Delta bars, smart labels for aggressive longs/shorts, and liquidation cascade detection. |
| **Relevance** | HIGH for algorithm reference -- demonstrates the full feature set we want to build. |

### Tier 4: Rust Ecosystem (For Performance Reference)

#### 4.14 barter-rs/barter-rs
| Field | Value |
|-------|-------|
| **URL** | https://github.com/barter-rs/barter-rs |
| **Stars** | ~700+ |
| **Language** | Rust |
| **License** | MIT |
| **What it does** | Event-driven trading/backtesting framework. Multi-exchange WebSocket feeds with normalized data. |
| **Relevance** | LOW for features, HIGH for architecture reference if building in Rust. |
| **Gap** | No OI-specific features. No aggregation. |

#### 4.15 nautechsystems/nautilus_trader
| Field | Value |
|-------|-------|
| **URL** | https://github.com/nautechsystems/nautilus_trader |
| **Stars** | ~2,000+ |
| **Language** | Rust + Python |
| **License** | LGPL-2.1 |
| **What it does** | Production-grade trading engine. Supports crypto exchange integrations. Deterministic event-driven architecture. |
| **Relevance** | LOW for features, MEDIUM for architecture reference. |

### Tier 5: Data Provider SDKs

#### 4.16 Laevitas SDK
| Field | Value |
|-------|-------|
| **URL** | https://github.com/Laevitas/Laevitas-sdk |
| **Language** | Unknown (limited public info) |
| **What it does** | Official SDK for Laevitas derivatives analytics API. Covers OI by exchange, expiry, strike. Historical and real-time. |
| **Relevance** | MEDIUM -- Alternative data source to CoinGlass. Better for options OI. |
| **Gap** | Commercial API. Limited community adoption. |

#### 4.17 hyperliquid-dex/hyperliquid-python-sdk
| Field | Value |
|-------|-------|
| **URL** | https://github.com/hyperliquid-dex/hyperliquid-python-sdk |
| **Language** | Python |
| **License** | MIT |
| **What it does** | Official Hyperliquid SDK. Exposes OI via `metaAndAssetCtxs` endpoint. Also provides user positions, fills, orders. |
| **Relevance** | MEDIUM -- Needed if including Hyperliquid in aggregation (increasingly important DEX). |

---

## 5. Exchange API Capabilities

### Open Interest Endpoints

| Exchange | Endpoint | Auth | Historical | Granularity | Rate Limit |
|----------|----------|------|-----------|-------------|------------|
| **Binance** | `GET /fapi/v1/openInterest` (current) | No | No | Snapshot | Standard |
| **Binance** | `GET /futures/data/openInterestHist` (historical) | No | 30 days | 5m/15m/30m/1h/2h/4h/6h/12h/1d | 1000/5min |
| **Bybit** | `GET /v5/market/open-interest` | No | Yes | 5min/15min/30min/1h/4h/1d | Standard |
| **OKX** | `GET /api/v5/public/open-interest` | No | Snapshot | Current only | Standard |
| **Hyperliquid** | `POST /info` (`metaAndAssetCtxs`) | No | No | Snapshot | Generous |
| **Deribit** | `GET /public/get_book_summary_by_instrument` | No | No | Snapshot | Standard |
| **Bitget** | REST API | No | Limited | Varies | Standard |

### Long/Short Ratio Endpoints

| Exchange | Endpoint | Type | Historical | Granularity |
|----------|----------|------|-----------|-------------|
| **Binance** | `/futures/data/globalLongShortAccountRatio` | All accounts | 30 days | 5m-1d |
| **Binance** | `/futures/data/topLongShortAccountRatio` | Top 20% accounts | 30 days | 5m-1d |
| **Binance** | `/futures/data/topLongShortPositionRatio` | Top 20% positions | 30 days | 5m-1d |
| **Binance** | `/futures/data/takerlongshortRatio` | Taker buy/sell | 30 days | 5m-1d |
| **Bybit** | `/v5/market/account-ratio` | Long/short ratio | Yes | 5min-1d |
| **OKX** | `/api/v5/rubik/stat/contracts-long-short-account-ratio` | Account ratio | Yes | 5m-1d |
| **Hyperliquid** | N/A | Not available | N/A | N/A |
| **Deribit** | N/A | Not available | N/A | N/A |

**Key finding:** Hyperliquid and Deribit do NOT provide long/short ratio data. This data is only available from CEXs (Binance, Bybit, OKX, Bitget).

---

## 6. Algorithm Deep Dives

### 6.1 Aggregated Open Interest Algorithm

```
ALGORITHM: AggregateOpenInterest(symbol, exchanges[], timestamp)

INPUT:
  - symbol: e.g., "BTC"
  - exchanges: list of exchange adapters
  - timestamp: target time

OUTPUT:
  - aggregated_oi_usd: float (total OI in USD)
  - per_exchange_breakdown: dict[exchange -> oi_usd]

STEPS:
  1. For each exchange in parallel:
     a. Fetch OI for all relevant pairs:
        - USDT-margined perpetual (e.g., BTCUSDT)
        - USD-margined perpetual (e.g., BTCUSD)
        - BUSD-margined (if applicable)
        - Quarterly futures (if applicable)
     b. For coin-margined contracts:
        - oi_usd = oi_contracts * contract_size * mark_price
     c. For stablecoin-margined contracts:
        - oi_usd = oi_contracts * contract_size
        (already denominated in USD/USDT)
     d. Sum all pairs for this exchange

  2. aggregated_oi_usd = SUM(per_exchange_oi_usd)

  3. Handle edge cases:
     - Missing data: use last known value with staleness flag
     - Contract size differences: normalize per exchange docs
     - Deribit OI jumps: apply smoothing or anomaly detection

NORMALIZATION NOTE:
  Coinalyze formula:
  BTC_aggregated_OI = OI_coin_margined_USD + OI_stablecoin_margined_USD
  where OI_stablecoin_margined_USD = OI * mark_price_BTC_USD
```

### 6.2 Net Longs/Shorts Estimation Algorithm

There are two approaches:

#### Approach A: Direct API Data (Exchange-Reported)

```
ALGORITHM: AggregatedLongShortRatio(symbol, exchanges[], period)

INPUT:
  - symbol: e.g., "BTCUSDT"
  - exchanges: [binance, bybit, okx, bitget]
  - period: e.g., "1h"

OUTPUT:
  - weighted_ls_ratio: float
  - per_exchange_ratios: dict

STEPS:
  1. For each exchange that provides L/S data:
     a. Fetch long_ratio, short_ratio (or long_short_ratio)
     b. Fetch exchange OI for weighting

  2. Weight by OI contribution:
     weighted_ratio = SUM(exchange_ls_ratio * exchange_oi) / SUM(exchange_oi)

  3. Decompose into absolute values:
     total_long_pct = weighted_ratio / (1 + weighted_ratio)
     total_short_pct = 1 / (1 + weighted_ratio)

NOTE: Different exchanges report different metrics:
  - Binance: separate account ratio vs position ratio
  - Bybit: account-level ratio
  - OKX: account-level ratio
  Must decide which metric to use for cross-exchange comparison.
```

#### Approach B: OI Delta Inference (BIGTAKER Method from TradingView)

This is the approach used when direct L/S data is unavailable (e.g., for DEXs):

```
ALGORITHM: InferLongShortFromOIDelta(oi_series, price_series)

CONCEPT:
  - OI increases + Price increases -> New longs opening (bullish)
  - OI increases + Price decreases -> New shorts opening (bearish)
  - OI decreases + Price increases -> Shorts closing (bullish)
  - OI decreases + Price decreases -> Longs closing (bearish)

STEPS:
  1. Initialize: estimated_long_oi = estimated_short_oi = total_oi / 2

  2. For each bar:
     a. delta_oi = current_oi - previous_oi
     b. delta_price = current_price - previous_price

     c. IF delta_oi > 0 AND delta_price > 0:
          estimated_long_oi += delta_oi  # New longs
     d. ELIF delta_oi > 0 AND delta_price < 0:
          estimated_short_oi += delta_oi  # New shorts
     e. ELIF delta_oi < 0 AND delta_price > 0:
          estimated_short_oi += delta_oi  # Shorts closing (negative delta)
     f. ELIF delta_oi < 0 AND delta_price < 0:
          estimated_long_oi += delta_oi  # Longs closing (negative delta)

  3. Ensure non-negative:
     estimated_long_oi = MAX(0, estimated_long_oi)
     estimated_short_oi = MAX(0, estimated_short_oi)

  4. Periodically recalibrate to total_oi:
     scale = total_oi / (estimated_long_oi + estimated_short_oi)
     estimated_long_oi *= scale
     estimated_short_oi *= scale

LIMITATIONS:
  - Starts from 50:50 assumption
  - Accumulates estimation error over time
  - Does not account for mixed behavior within a bar
  - Should be used as supplementary signal, not primary
```

### 6.3 OI Delta Calculation

```
ALGORITHM: OIDelta(oi_series, price_series)

For each bar:
  oi_delta = oi[t] - oi[t-1]

Classification:
  IF oi_delta > 0 AND price_delta > 0:
    label = "Aggressive Longs" (new longs driving price up)
  ELIF oi_delta > 0 AND price_delta < 0:
    label = "Aggressive Shorts" (new shorts driving price down)
  ELIF oi_delta < 0 AND price_delta > 0:
    label = "Short Liquidation / Short Covering"
  ELIF oi_delta < 0 AND price_delta < 0:
    label = "Long Liquidation / Long Closing"

Spike detection:
  IF abs(oi_delta) > N * stddev(oi_delta_history):
    flag as "significant OI event"
```

---

## 7. Gap Analysis

### What Exists vs What Must Be Built

| Capability | Exists in OSS? | Where? | What's Missing? |
|------------|---------------|--------|-----------------|
| **Single-exchange OI fetch** | YES | CCXT, cryptofeed, exchange SDKs | Nothing -- well covered |
| **Multi-exchange OI streaming** | YES | cryptofeed | No aggregation logic on top |
| **Multi-exchange OI aggregation** | PARTIAL | moonStreamProcess (BTC only) | Multi-asset support, web API, dashboard |
| **Contract normalization (coin vs stablecoin margined)** | PARTIAL | moonStreamProcess, Coinalyze formulas | Needs implementation per exchange |
| **Single-exchange L/S ratio** | YES | Exchange APIs directly | Nothing -- well covered |
| **Multi-exchange L/S aggregation** | NO | Only CoinGlass (commercial) | Must build from scratch |
| **OI-weighted L/S ratio** | NO | Only in Pine Scripts | Must build from scratch |
| **OI Delta classification** | PARTIAL | Pine Scripts (BIGTAKER, Leviathan) | Must port from Pine to Python/TS |
| **L/S decomposition from OI+price** | PARTIAL | Pine Script (BIGTAKER) | Must port algorithm, handle limitations |
| **Historical OI data storage** | YES | tardis-dev (paid), exchange APIs (30d) | Long-term storage needs own infra |
| **Real-time OI WebSocket** | YES | cryptofeed, exchange SDKs | Must build aggregation on top |
| **Unified REST API for aggregated data** | NO | None | Must build entirely |
| **Visualization/charting** | NO | Only Pine Scripts in TradingView | Must build entirely |

### Critical Gaps Summary

1. **No OSS multi-exchange long/short ratio aggregator exists.** This is the biggest gap. Must be built from exchange APIs directly.

2. **No OSS multi-asset aggregated OI service exists.** moonStreamProcess is close but BTC-only and has no API layer.

3. **The OI-to-L/S decomposition algorithm exists only in Pine Script.** Must be ported and improved.

4. **Historical data beyond 30 days requires own infrastructure.** Exchange APIs only retain 30 days of L/S and OI history.

---

## 8. Implementation Recommendations

### Recommended Architecture

```
                    +------------------+
                    |  REST API Layer  |
                    |  (FastAPI/Express)|
                    +--------+---------+
                             |
                    +--------v---------+
                    | Aggregation Engine|
                    | - OI Summation    |
                    | - L/S Weighting   |
                    | - OI Delta Calc   |
                    | - Normalization   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v-----+  +-----v------+
     | Exchange   |  | Exchange   |  | Exchange   |
     | Adapter:   |  | Adapter:   |  | Adapter:   |
     | Binance    |  | Bybit      |  | OKX        |
     +------------+  +------------+  +------------+
     (+ Bitget, Hyperliquid, Deribit adapters)
```

### Option A: Python Stack (Recommended for Speed-to-Market)

**Use `cryptofeed` as the real-time data layer + custom aggregation:**

- **Data Collection**: `cryptofeed` for WebSocket OI streams; CCXT for REST-based L/S ratios and historical OI
- **Aggregation**: Custom Python service that:
  - Normalizes contract values to USD
  - Sums OI across exchanges per asset
  - Fetches and OI-weights L/S ratios from Binance/Bybit/OKX
  - Computes OI delta and classifies (aggressive longs/shorts)
- **Storage**: TimescaleDB or InfluxDB for time-series data
- **API**: FastAPI for serving aggregated data
- **Estimated effort**: 2-3 weeks for core functionality

```python
# Pseudocode for core aggregation service
import ccxt
import asyncio

EXCHANGES = {
    'binance': ccxt.binanceusdm(),
    'bybit': ccxt.bybit({'options': {'defaultType': 'swap'}}),
    'okx': ccxt.okx(),
}

async def fetch_aggregated_oi(symbol='BTC/USDT:USDT'):
    tasks = {}
    for name, exchange in EXCHANGES.items():
        tasks[name] = exchange.fetch_open_interest(symbol)

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    total_oi_usd = sum(
        r['openInterestValue'] for r in results
        if not isinstance(r, Exception)
    )
    return total_oi_usd

async def fetch_aggregated_ls_ratio(symbol='BTCUSDT'):
    # Fetch L/S ratios from each exchange
    # Weight by that exchange's OI contribution
    # Return weighted average
    pass
```

### Option B: TypeScript Stack (If Frontend-First)

**Use tiagosiebler SDKs + tardis-dev:**

- **Data Collection**: `bybit-api`, `okx-api`, `binance` npm packages for REST; `tardis-dev` for historical replay
- **Aggregation**: Custom TypeScript service
- **Storage**: QuestDB or TimescaleDB
- **API**: Express/Fastify
- **Estimated effort**: 3-4 weeks

### Option C: Hybrid (Recommended for Production)

**CoinGlass API for bootstrapping + own collection for independence:**

1. **Phase 1 (Week 1)**: Use `coinglass-api` Python wrapper for immediate access to aggregated data. Build UI/API layer.
2. **Phase 2 (Weeks 2-3)**: Build own exchange adapters using CCXT/cryptofeed. Run in parallel with CoinGlass for validation.
3. **Phase 3 (Week 4)**: Cut over to own data collection. Keep CoinGlass as fallback/validation source.

### Priority Implementation Order

1. **Aggregated OI** (easier, more data sources available)
   - Start with Binance + Bybit + OKX (covers ~80% of futures OI)
   - Add Bitget, Deribit, Hyperliquid later
   - Use CCXT `fetch_open_interest()` for simplicity

2. **Net Longs/Shorts** (harder, fewer data sources)
   - Start with Binance (has 4 different L/S ratio types)
   - Add Bybit and OKX L/S ratios
   - Implement OI-weighted aggregation
   - Add OI delta inference as supplementary signal

3. **OI Delta Classification** (derivative of #1)
   - Compute from aggregated OI series
   - Classify bars as aggressive longs/shorts/liquidations
   - Add spike detection

### Data Freshness Requirements

| Feature | Minimum Update Frequency | Recommended |
|---------|------------------------|-------------|
| Aggregated OI | 5 minutes | 1 minute (WebSocket) |
| L/S Ratio | 5 minutes | 5 minutes (API limit) |
| OI Delta | Same as OI | Same as OI |
| L/S Decomposition | 5 minutes | 5 minutes |

### Key Dependencies to Install

**Python:**
```
pip install ccxt cryptofeed coinglass-api pandas
```

**TypeScript/Node.js:**
```
npm install ccxt bybit-api okx-api tardis-dev
```

---

## Appendix: Source Links

### GitHub Repositories
- cryptofeed: https://github.com/bmoscon/cryptofeed
- moonStreamProcess: https://github.com/IndianaBug/moonStreamProcess
- CCXT: https://github.com/ccxt/ccxt
- coinglass-api: https://github.com/dineshpinto/coinglass-api
- coinglass-apiv3: https://github.com/ckaraca/coinglass-apiv3
- Coinglass-API (pinkbox): https://github.com/thepinkboxterminal/Coinglass-API
- tardis-node: https://github.com/tardis-dev/tardis-node
- bybit-api: https://github.com/tiagosiebler/bybit-api
- okx-api: https://github.com/tiagosiebler/okx-api
- binance SDK: https://github.com/tiagosiebler/binance
- binance-dumper: https://github.com/maxisoft/binance-dumper
- Funding-Arbitrage-Screener: https://github.com/kir1l/Funding-Arbitrage-Screener
- barter-rs: https://github.com/barter-rs/barter-rs
- nautilus_trader: https://github.com/nautechsystems/nautilus_trader
- hyperliquid-python-sdk: https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- Laevitas SDK: https://github.com/Laevitas/Laevitas-sdk

### TradingView Pine Scripts
- BIGTAKER OI + L/S Trends: https://www.tradingview.com/script/FSwMBy3Q
- Leviathan OI Delta: https://www.tradingview.com/script/4EMVvBkC
- Alpha Extract Aggregated OI: https://www.tradingview.com/script/cM5WCKBL

### Exchange API Documentation
- Binance OI: https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Open-Interest-Statistics
- Binance L/S Ratio: https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Long-Short-Ratio
- Bybit OI: https://bybit-exchange.github.io/docs/v5/market/open-interest
- OKX OI: https://www.okx.com/docs-v5/en/#rest-api-public-data-get-open-interest
- Hyperliquid Info: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals

### Package Registries
- cryptofeed (PyPI): https://pypi.org/project/cryptofeed/
- coinglass-api (PyPI): https://pypi.org/project/coinglass-api/
- tardis-dev (npm): https://www.npmjs.com/package/tardis-dev
- bybit-api (npm): https://www.npmjs.com/package/bybit-api
- okx-api (npm): https://www.npmjs.com/package/okx-api

### Commercial Platforms (Reference)
- CoinGlass: https://www.coinglass.com
- Coinalyze: https://coinalyze.net
- Laevitas: https://www.laevitas.ch
- CoinGlass API Docs: https://docs.coinglass.com
