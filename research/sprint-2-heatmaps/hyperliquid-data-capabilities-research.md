# Hyperliquid Data Capabilities -- Technical Research Document

**Date**: 2026-03-16

---

## 1. Hyperliquid API Overview

Hyperliquid operates a fully on-chain central limit order book (CLOB) DEX. Because all orders, positions, and liquidations are recorded on-chain, it exposes significantly more data than centralized exchanges.

- **Mainnet REST**: `https://api.hyperliquid.xyz`
- **Mainnet WebSocket**: `wss://api.hyperliquid.xyz/ws`
- **Testnet REST**: `https://api.hyperliquid-testnet.xyz`
- **Official Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
- **GitHub Org**: https://github.com/hyperliquid-dex (repos: Python SDK, Rust SDK, node, order_book_server, hyperliquid-stats-web, contracts)

### 1.1 REST API (Info Endpoint)

All info requests are `POST https://api.hyperliquid.xyz/info` with a JSON body specifying `type`.

**Key Perpetuals Endpoints:**

| `type` value | Returns |
|---|---|
| `metaAndAssetCtxs` | Per-asset: mark price, oracle price, **funding rate**, **open interest**, premium, impact prices, daily volume, prev-day price |
| `clearinghouseState` | Per-user: positions (entry price, **liquidation price**, size, leverage, PnL, margin used, cumulative funding), margin summary, withdrawable |
| `fundingHistory` | Historical funding rates + premiums for a coin (paginated by startTime/endTime) |
| `predictedFundings` | Cross-venue predicted funding (Binance, Bybit, Hyperliquid) |
| `perpsAtOpenInterestCap` | Assets currently at OI cap |
| `l2Book` | L2 orderbook snapshot (up to 20 levels per side) |
| `recentTrades` | Recent trades for a coin |
| `userFills` / `userFillsByTime` | User trade history |
| `historicalOrders` | Full order history for a user |
| `openOrders` / `frontendOpenOrders` | Current open orders for a user |
| `userFunding` | Per-user funding payment history |
| `userNonFundingLedgerUpdates` | Deposits, withdrawals, transfers, **liquidations** |
| `activeAssetData` | Per-user per-asset: leverage limits, max trade sizes |
| `allPerpMetas` | Combined metadata + asset contexts for ALL dexes |
| `perpDexLimits` | OI caps, max transfer notional |

### 1.2 WebSocket Subscriptions (22 feeds)

**Market Data:**
- `allMids` -- Mid prices across all assets
- `l2Book` -- Orderbook snapshots (updated >= every 0.5s)
- `bbo` -- Best bid/offer (only on top-of-book change)
- `trades` -- Trade execution stream (price, size, trader identities)
- `candle` -- OHLCV (1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 12h, 1d)
- `activeAssetCtx` -- Per-asset funding, open interest, price metrics

**User-Specific:**
- `orderUpdates` -- Order status changes
- `userFills` -- Trade fills for a specific address
- `userFundings` -- Hourly funding payments
- `userEvents` -- Consolidated: fills + funding + liquidations
- `userNonFundingLedgerUpdates` -- Deposits, withdrawals, transfers, liquidations
- `openOrders` -- Current open orders
- `clearinghouseState` -- Positions, margin, liquidation prices
- `allDexsClearinghouseState` -- Multi-dex position aggregation
- `userTwapSliceFills` / `userTwapHistory` -- TWAP order data

**Other:**
- `activeAssetData`, `spotState`, `webData3`, `notification`, `allDexsAssetCtxs`

### 1.3 Rate Limits

**IP-Based (REST):**
- 1,200 weight per minute aggregate
- Exchange API: weight = 1 + floor(batch_length / 40)
- Light info requests (`l2Book`, `allMids`, `clearinghouseState`): weight 2
- Most info requests: weight 20
- `userRole`: weight 60
- Explorer API: weight 40
- Paginated endpoints add weight per 20 items returned

**WebSocket:**
- Max 10 connections per IP
- Max 30 new connections per minute
- Max 1,000 subscriptions total
- Max 10 unique users across user-specific subscriptions
- Max 2,000 messages/min sent to Hyperliquid
- Max 100 simultaneous inflight post messages

**Per-Address (actions only, not info):**
- 1 request per 1 USDC cumulative traded volume
- Initial buffer: 10,000 requests
- When rate-limited: 1 request per 10 seconds
- Open order limit: 1,000 base + 1 per 5M USDC volume (capped at 5,000)

**EVM RPC:**
- 100 requests/min for `rpc.hyperliquid.xyz/evm`

---

## 2. Data Availability Matrix

| Data Type | Available? | How to Access |
|---|---|---|
| **Open Interest** | YES | `metaAndAssetCtxs` (per asset), `activeAssetCtx` WS subscription |
| **Funding Rates** | YES | `metaAndAssetCtxs` (current), `fundingHistory` (historical), `predictedFundings` (predicted), `userFundings` WS |
| **Liquidation Data** | YES | `userNonFundingLedgerUpdates` (per-user), `userEvents` WS (real-time). All positions + liquidation prices visible via `clearinghouseState` for any address. |
| **Historical Liquidation Data** | YES | Via `userNonFundingLedgerUpdates` with time filters. Third-party: thunderhead-labs/hyperliquid-stats provides aggregated historical liquidation stats. Also available via Allium (hyperliquid.allium.so/liquidations). |
| **Stop Loss Levels** | PARTIAL | SL/TP are trigger orders. A user's OWN open trigger orders are visible via `frontendOpenOrders`. However, **other users' untriggered trigger orders are NOT publicly visible** -- the order_book_server explicitly states it "does not show untriggered trigger orders." |
| **Take Profit Levels** | PARTIAL | Same as above -- only your own TP orders are visible. Not visible for other users. |
| **Net Longs/Shorts** | DERIVABLE | No dedicated endpoint. However, since all positions are on-chain, you can query `clearinghouseState` for individual addresses. Third-party services (CoinGlass, Coinalyze, Nansen) compute aggregate long/short ratios. Moon Dev's Data Layer API also provides this. |
| **Orderbook (L2)** | YES | `l2Book` REST + WS (up to 20 levels default, 100 via order_book_server) |
| **Orderbook (L4/MBO)** | YES | Requires running self-hosted order_book_server connected to a non-validating node |
| **Trades** | YES | `trades` WS subscription, `recentTrades` REST |
| **Candles/OHLCV** | YES | `candle` WS, `candleSnapshot` REST |
| **Individual Positions** | YES | Any user's positions visible via `clearinghouseState` with their address |

---

## 3. MBO (Market By Order) / L4 Order Book

Hyperliquid's standard public API provides **L2 data** (aggregated price levels, up to 20 levels per side). However, the protocol also supports **L4 data** which is the equivalent of Market-By-Order (MBO):

**L4 Book Characteristics:**
- Shows individual orders with order IDs and user addresses
- First sends a full book snapshot, then streams incremental diffs batched per block
- Provides per-order-level visibility (not just aggregated price levels)

**How to Access L4/MBO:**
- Run the open-source `order_book_server` (https://github.com/hyperliquid-dex/order_book_server)
- Requires operating a Hyperliquid non-validating node first
- Subscribe via WebSocket: `{"method": "subscribe", "subscription": {"type": "l4Book", "coin": "BTC"}}`
- Third-party providers (e.g., Dwellir) also offer authenticated L4 streams

**Differences from Standard L2:**

| Feature | L2 (Public API) | L4/MBO (Order Book Server) |
|---|---|---|
| Price levels | Up to 20 per side | Up to 100 (configurable) |
| Granularity | Aggregated by price | Individual orders |
| Order IDs | No | Yes |
| User addresses | No | Yes |
| Infrastructure | None (public API) | Non-validating node + order_book_server |
| Latency | ~500ms snapshots | Block-level batched diffs |
| Untriggered orders | N/A | NOT shown |
| Spot support | Yes | No |

---

## 4. Heatmap & Visualization Feasibility

### 4.1 Liquidation Heatmap

**Can you build it? YES -- and it is arguably easier on Hyperliquid than any CEX.**

Since all positions are on-chain and queryable:
1. Query `clearinghouseState` for any address to get their positions + liquidation prices
2. The `userEvents` / `userNonFundingLedgerUpdates` WebSocket feeds provide real-time liquidation events
3. Historical liquidation data available through time-filtered queries and S3 bulk data

The liquidation price formula is: `liq_price = price - side * margin_available / position_size / (1 - l * side)` where `l = 1 / MAINTENANCE_LEVERAGE`.

**Existing implementations:**
- Kiyotaka (kiyotaka.ai) -- real-time liquidation heatmaps built on Hyperliquid on-chain data
- Trading Different (tradingdifferent.com) -- shows actual liquidation points, free tool
- CoinGlass -- whale liquidation tracking
- Glassnode -- institutional-grade liquidation heatmaps (Hyperliquid = ~16% global OI share)
- Moon Dev's Hyperliquid Data Layer API -- includes liquidation heatmap endpoints

### 4.2 Stop Loss Heatmap

**Can you build it? NO -- not from public data.**

Untriggered trigger orders (SL/TP) are explicitly NOT exposed by Hyperliquid's API or order_book_server. These orders sit in an internal state until their trigger price is hit, at which point they become market/limit orders visible on the book.

**Workaround approaches:**
- Estimate SL clusters statistically based on known position entries, leverage, and common SL placement patterns
- Monitor when triggered SL orders hit the book (visible as sudden sell/buy orders at specific prices)
- Use liquidation price clusters as a proxy (traders often set SL near liquidation zones)

### 4.3 Take Profit Heatmap

**Same as Stop Loss -- NO direct access to other users' TP orders.**

Same workarounds apply. Some commercial tools (Trading Different, Kiyotaka) claim to derive likely TP zones from position data and statistical modeling.

### 4.4 Net Longs/Shorts

**Derivable but requires aggregation work.**

No single endpoint returns aggregate long/short ratios. Options:
- Enumerate known addresses and aggregate their `clearinghouseState` positions
- Use third-party APIs: CoinGlass, Coinalyze, Nansen, Moon Dev Data Layer
- Moon Dev's API provides position snapshots filterable by `side` (long/short) with aggregate stats

---

## 5. Open Source Projects for Hyperliquid Data Visualization

### 5.1 Official / Org Repos (github.com/hyperliquid-dex)

| Repo | Description | Stars |
|---|---|---|
| [hyperliquid-python-sdk](https://github.com/hyperliquid-dex/hyperliquid-python-sdk) | Official Python SDK for API trading | 1,462 |
| [hyperliquid-rust-sdk](https://github.com/hyperliquid-dex/hyperliquid-rust-sdk) | Rust SDK | 430 |
| [node](https://github.com/hyperliquid-dex/node) | Non-validating node (Docker) | 420 |
| [order_book_server](https://github.com/hyperliquid-dex/order_book_server) | L2/L4 orderbook server (Rust) | 118 |
| [hyperliquid-stats-web](https://github.com/hyperliquid-dex/hyperliquid-stats-web) | Protocol statistics dashboard (TypeScript) | 34 |

### 5.2 Community Visualization Projects

| Project | What It Does | Stack |
|---|---|---|
| [thunderhead-labs/hyperliquid-stats](https://github.com/thunderhead-labs/hyperliquid-stats) | 30+ API endpoints: volume, liquidations, OI, funding, user analytics, liquidator PnL. Includes web dashboard. | FastAPI, PostgreSQL, Docker, S3 |
| [itay747/perspective-hyperliquid](https://github.com/itay747/perspective-hyperliquid) | Real-time orderbook heatmap using Perspective (WebAssembly visualization engine). Streams L2 data and renders per-tick heatmap. | TypeScript, Webpack, Perspective |
| [moondevonyt/Hyperliquid-Data-Layer-API](https://github.com/moondevonyt/Hyperliquid-Data-Layer-API) | Comprehensive data layer: liquidation heatmaps, whale position tracking (182 symbols), top/bottom 100 traders, HLP strategy monitoring, Z-score sentiment, position snapshots within 15% of liquidation. | Python |
| [vsching/liquidation-heatmap](https://github.com/vsching/liquidation-heatmap) | Liquidation heatmap with multi-exchange support (Binance, OKX, Bybit via CCXT). Plotly visualizations, leverage analysis (5x-125x), Streamlit dashboard. | Python, Plotly, Streamlit |
| [FajarArrizki/mcp-technical-analysis](https://github.com/FajarArrizki/mcp-technical-analysis) | MCP server for AI-assisted trading: risk management, SL/TP calculations, whale position/liquidation tracking, L2 orderbook data. 104 components. | Python |
| [jose-donato/crypto-orderbook](https://github.com/jose-donato/crypto-orderbook) | Multi-exchange real-time orderbook (Go backend, React+Vite frontend). Not Hyperliquid-specific but relevant architecture. | Go, React, Vite |

### 5.3 Commercial Platforms with Hyperliquid Liquidation/Heatmap Data

- **Kiyotaka** (kiyotaka.ai) -- Real-time liquidation heatmaps purpose-built for Hyperliquid
- **Trading Different** (tradingdifferent.com) -- Free liquidation heatmap on Hyperliquid DEX
- **CoinGlass** (coinglass.com) -- Whale liquidation maps, long/short ratios, OI
- **Glassnode** -- Institutional liquidation heatmaps (Hyperliquid as primary data source)
- **Coinalyze** -- Aggregated liquidation charts and long/short ratio
- **Nansen** -- API for Hyperliquid perp positions, smart money tracking

---

## 6. Specific GitHub User Research

### jose-donato (https://github.com/jose-donato)

86 repositories total. Crypto-relevant projects:
- **crypto-orderbook** -- Multi-exchange real-time orderbook (Go + React). 110 stars. Not Hyperliquid-specific.
- **crypto-futures-arbitrage-scanner** -- Go-based futures arbitrage scanner. 117 stars.
- **binancef_l3_estimate_go** -- Binance futures L3 estimation. 27 stars.
- **cryexc-backend** -- Crypto exchange backend (Python). 51 stars.
- **flowsurface** (fork) -- Native desktop charting for crypto with orderflow visualizations (Rust).
- No Hyperliquid-specific repositories found.

### MattMaximo (https://github.com/MattMaximo)

Visible repositories:
- **CryptoBB** -- FastAPI backend for OpenBB Workspace. Aggregates data from CoinGecko, Velodata, Glassnode, CCData, Google Trends. 25 stars. **No direct Hyperliquid integration found** in the README, though the data sources (Glassnode, Velodata) may include Hyperliquid-derived data.
- **artemis_py**, **coingecko_exporter**, **polymarket**, **SpicyUI** -- Other crypto/data projects, none specifically Hyperliquid-focused.

---

## 7. Key Architectural Insight: Why Hyperliquid Is Uniquely Transparent

Unlike centralized exchanges, Hyperliquid's on-chain design means:

1. **Every position is publicly queryable** -- You can look up any wallet's positions, leverage, liquidation price, and PnL via `clearinghouseState`.
2. **Liquidation prices are computable** -- Given position data, you can calculate exactly where every position will be liquidated.
3. **Liquidation events are streamed** -- Real-time WebSocket feeds for liquidation events.
4. **Historical data is available via S3** -- Bulk historical data is available from Hyperliquid's S3 buckets for backtesting and analysis.
5. **The only blind spot is untriggered trigger orders** -- SL/TP orders are not publicly visible until they trigger. This is the single most significant data gap.

This transparency is why multiple commercial and open-source projects have emerged specifically to build liquidation heatmaps on Hyperliquid data -- it is the only major venue where you can see real positions rather than estimating them.

---

## 8. Summary: Data Availability Scorecard

| Feature | Available | Notes |
|---|---|---|
| Real-time trades | YES | WebSocket `trades` feed |
| L2 Orderbook | YES | Public API, up to 20 levels (100 with order_book_server) |
| L4/MBO Orderbook | YES | Requires self-hosted node + order_book_server |
| Open Interest | YES | Per-asset via `metaAndAssetCtxs` |
| Funding Rates (current) | YES | `metaAndAssetCtxs` |
| Funding Rates (historical) | YES | `fundingHistory` endpoint |
| Predicted Funding | YES | `predictedFundings` (cross-venue) |
| Liquidation Events (real-time) | YES | `userEvents`, `userNonFundingLedgerUpdates` WS |
| Liquidation Events (historical) | YES | REST queries + S3 bulk data |
| Individual Position Data | YES | `clearinghouseState` for any address |
| Liquidation Prices | YES | Returned in `clearinghouseState` or computable |
| Stop Loss / Take Profit Levels | NO | Untriggered trigger orders are hidden |
| Net Long/Short Ratio | DERIVABLE | Aggregate from position data; third-party APIs available |
| Candles/OHLCV | YES | REST + WebSocket (1m to 1d) |
| Whale Tracking | YES | Query any wallet's full state |

---

## Sources

- [Hyperliquid API Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Hyperliquid WebSocket Subscriptions](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions)
- [Hyperliquid Perpetuals Info Endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals)
- [Hyperliquid Rate Limits](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits)
- [Hyperliquid TP/SL Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/take-profit-and-stop-loss-orders-tp-sl)
- [Hyperliquid Liquidations Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations)
- [Hyperliquid Funding Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding)
- [Hyperliquid Order Book Server](https://github.com/hyperliquid-dex/order_book_server)
- [Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)
- [thunderhead-labs/hyperliquid-stats](https://github.com/thunderhead-labs/hyperliquid-stats)
- [itay747/perspective-hyperliquid](https://github.com/itay747/perspective-hyperliquid)
- [moondevonyt/Hyperliquid-Data-Layer-API](https://github.com/moondevonyt/Hyperliquid-Data-Layer-API)
- [vsching/liquidation-heatmap](https://github.com/vsching/liquidation-heatmap)
- [Kiyotaka Liquidation Heatmaps](https://kiyotaka.ai/blog/liquidation-heatmaps-for-hyperliquid/)
- [Trading Different](https://tradingdifferent.com/dashboard/liquidation-heatmap)
- [CoinGlass Hyperliquid Liquidation Map](https://www.coinglass.com/hyperliquid-liquidation-map)
- [Glassnode Liquidation Heatmaps](https://insights.glassnode.com/liquidation-heatmaps/)
- [Chainstack clearinghouseState Reference](https://docs.chainstack.com/reference/hyperliquid-info-clearinghousestate)
- [Nansen Hyperliquid API](https://docs.nansen.ai/api/hyperliquid)
