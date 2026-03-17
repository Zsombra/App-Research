# Exchange WebSocket Protocol Comparison

## Research for Multi-Exchange Trading Terminal Architecture

**Date:** 2026-03-17
**Scope:** Binance, Bybit, OKX, Hyperliquid, dYdX v4, Coinbase, Kraken, Bitfinex, Gate.io, HTX

---

## 1. Developer Network Map

### Tier 1: Multi-Exchange Libraries (Highest Signal)

| Developer / Org | Repo | Language | Exchanges | Focus |
|---|---|---|---|---|
| **ccxt** | [ccxt/ccxt](https://github.com/ccxt/ccxt) | TS/JS/Python/PHP | 100+ | Unified REST + WebSocket (CCXT Pro) across all major exchanges |
| **bmoscon** | [bmoscon/cryptofeed](https://github.com/bmoscon/cryptofeed) | Python | 30+ | Normalized market data feed handler with async callbacks |
| **crypto-crawler** | [crypto-crawler/crypto-crawler-rs](https://github.com/crypto-crawler/crypto-crawler-rs) | Rust | Many | Rock-solid crawler with `crypto-ws-client`, `crypto-msg-parser` |
| **Tucsky** | [Tucsky/aggr](https://github.com/Tucsky/aggr) | Vue.js/TS | 12+ | Browser-based trades aggregator using direct WS connections |
| **hummingbot** | [hummingbot/hummingbot](https://github.com/hummingbot/hummingbot) | Python | 40+ | Market-making bot with OrderBookTracker + UserStreamTracker |
| **tiagosiebler** | binance, bybit-api, okx-api, gateio-api, etc. | TypeScript | 9+ | Per-exchange Node.js SDKs with WS reconnect/resubscribe |
| **kanekoshoyu** | [exchange-collection](https://github.com/kanekoshoyu/exchange-collection) / guilder | Rust | Multiple | OpenAPI/AsyncAPI specs + generated Rust clients |

### Tier 2: Exchange-Specific & Utility Libraries

| Developer / Org | Repo | Focus |
|---|---|---|
| **gmtech-xyz** | [exchanges-latency-test](https://github.com/gmtech-xyz/exchanges-latency-test) | Real-time WS latency measurement tool |
| **gmtech-xyz** | [safe-cex](https://github.com/gmtech-xyz/safe-cex) | TypeScript trading library (Bybit, Binance Futures, OKX, WOO X) |
| **tiagosiebler** | [orderbooks](https://github.com/tiagosiebler/orderbooks) | Snapshot + delta orderbook handler (zero-dep) |
| **JKorf** | HTX.Net, Binance.Net, etc. | C#/.NET exchange SDKs with WS support |
| **bitfinexcom** | [bitfinex-api-go](https://github.com/bitfinexcom/bitfinex-api-go) | Official Go SDK for Bitfinex WS v2 |
| **hyperliquid-dex** | [order_book_server](https://github.com/hyperliquid-dex/order_book_server) | Official order book server + Python SDK |

### Network Crawl Insights

The developer network clusters around three communities:

1. **Python/async community**: bmoscon (cryptofeed) -> ccxt -> hummingbot. These projects share similar async patterns and often reference each other's normalization approaches.

2. **Rust/performance community**: crypto-crawler -> kanekoshoyu (exchange-collection/guilder) -> nash-io/openlimits. Focused on zero-copy parsing, FFI bindings, and sub-millisecond message processing.

3. **TypeScript/browser community**: tiagosiebler (per-exchange SDKs) -> Tucsky/aggr -> gmtech-xyz/safe-cex. Focused on browser compatibility, npm distribution, and reconnection resilience.

---

## 2. Exchange-by-Exchange Protocol Comparison

### 2.1 Connection Details

| Exchange | WS Endpoint (Spot/Futures) | Max Connections | Max Streams/Connection | Connection Lifetime | Auth Method |
|---|---|---|---|---|---|
| **Binance** | `wss://stream.binance.com:9443/ws/` / `wss://fstream.binance.com/ws/` | 300 per 5 min per IP | 1,024 streams | 24 hours | HMAC signature |
| **Bybit** | `wss://stream.bybit.com/v5/public/spot` / `linear` / `inverse` / `option` | Not explicitly documented | Multiple topics per connection | 10 min without ping/data | HMAC signature |
| **OKX** | `wss://ws.okx.com:8443/ws/v5/public` / `private` / `business` | Per-channel limits, 480 sub/unsub per hour | 64 KB total subscription length | 30s without data/ping | HMAC signature |
| **Hyperliquid** | `wss://api.hyperliquid.xyz/ws` | 100 connections per IP | 1,000 subscriptions | Periodic disconnects expected | Ethereum signature |
| **dYdX v4** | `wss://indexer.dydx.trade/v4/ws` | Not explicitly documented | Multiple channels | 30s heartbeat, 10s pong timeout | API key |
| **Coinbase** | `wss://advanced-trade-ws.coinbase.com` (market) / `wss://advanced-trade-ws-user.coinbase.com` (user) | 750/sec per IP | Multiple products per subscription | 60-90s without updates (use heartbeats) | CDP API key / JWT |
| **Kraken** | `wss://ws.kraken.com/v2` | ~150 per 10 min per IP (Cloudflare) | All pairs on single connection | ~1 min inactivity timeout | Session token |
| **Bitfinex** | `wss://api-pub.bitfinex.com/` (public) / `wss://api.bitfinex.com/` (auth) | 20 public/min, 5 auth/15s | 25-30 channels per connection | No explicit limit | API key + secret |
| **Gate.io** | `wss://api.gateio.ws/ws/v4/` (spot) / `wss://fx-ws.gateio.ws/v4/ws/usdt` (futures) | Not explicitly documented | 50 requests/sec per channel | Not specified | APIv4 signature |
| **HTX** | `wss://api.huobi.pro/ws` / `wss://api-aws.huobi.pro/ws` | 5-10 per API key (spot), 30 per UID (futures) | Unlimited sub, 50 req at once | Not specified | API key |

### 2.2 Message Format & Encoding

| Exchange | Format | Compression | Numeric Types | Timestamp Format |
|---|---|---|---|---|
| **Binance** | JSON text frames | None | Strings for decimals, int for timestamps | Milliseconds (UTC) |
| **Bybit** | JSON text frames | None | Strings for prices/sizes | Milliseconds |
| **OKX** | JSON text frames | None | Strings | Milliseconds |
| **Hyperliquid** | JSON text frames | None | Strings for prices/sizes | Milliseconds |
| **dYdX v4** | JSON text frames | None | Strings (price, size, message-id) | ISO-8601 / milliseconds |
| **Coinbase** | JSON text frames | None | Strings | ISO-8601 |
| **Kraken** | JSON text frames | None | Quoted decimals | Quoted decimals |
| **Bitfinex** | JSON arrays (not objects) | None | Floats (positive=bid, negative=ask for book) | Seconds |
| **Gate.io** | JSON text frames | None | Strings | Seconds |
| **HTX** | JSON | **gzip compressed** | Strings | Milliseconds |

**Key Insight:** All exchanges use JSON over text WebSocket frames. No exchange uses binary/protobuf for public WS feeds. HTX is the outlier with gzip compression on messages. Bitfinex is unique in using positional arrays instead of keyed objects, and using sign (positive/negative) to distinguish bids from asks.

### 2.3 Orderbook Delivery

| Exchange | Delivery Model | Depth Levels (WS) | Snapshot Levels (REST) | Push Frequency | Sequence/Nonce |
|---|---|---|---|---|---|
| **Binance** | Partial snapshots (5/10/20) OR diff stream + REST snapshot | 5, 10, 20 (partial); all changed (diff) | Up to 5000 (spot), 1000 (futures) | 1s or 100ms (spot); 100ms/250ms/500ms (futures) | `U`, `u` update IDs; `pu` previous-update (futures) |
| **Bybit** | Snapshot then deltas | 1, 50, 200, 1000 | 1000 | 200ms (was 300ms pre-Nov 2025) | `u` update ID, `seq` sequence number |
| **OKX** | Multiple channels: bbo-tbt (1 level, 10ms), books5 (5 levels, 100ms), books (400 levels, 100ms), books-l2-tbt (400 levels, 10ms, VIP5+), books50-l2-tbt (50 levels, 10ms, VIP4+) | 1, 5, 50, 400 | Via REST | 10ms to 100ms depending on channel | Checksum for validation |
| **Hyperliquid** | Snapshot on subscribe, then updates | Up to 100 levels (default 20) | Via REST | Per-block updates | Block-based |
| **dYdX v4** | Snapshot then updates | Full book | Via REST | As changes occur | Message ID |
| **Coinbase** | level2 channel: full book updates | Full book | Via REST | As changes occur | Sequence numbers |
| **Kraken** | Snapshot then deltas | Configurable | Via REST | As changes occur | CRC32 checksum on top 10 levels |
| **Bitfinex** | Snapshot on connect, then deltas | P0-P3 (aggregated) or R0 (raw/per-order) | Via REST | As changes occur | Optional sequence numbers (enable with flag) |
| **Gate.io** | Snapshot (legacy) or incremental MBP with REST base | 5, 10, 20 (with 20ms interval for 20 levels) | Via REST with `with_id=true` | 20ms to 100ms | Internal update ID, must match REST snapshot |
| **HTX** | Snapshot (`depth.$type`) checked every 100ms, OR incremental MBP (`mbp.$levels`) | 5, 20, 150 levels | Via REST | 100ms (snapshot); tick-by-tick (MBP) | `seqNum` / `prevSeqNum` chain |

### 2.4 Trade Stream Format

| Exchange | Stream Name | Fields | Trade Classification | Aggregation |
|---|---|---|---|---|
| **Binance** | `<symbol>@trade` / `<symbol>@aggTrade` | price, qty, time, isBuyerMaker | `m` (isBuyerMaker) boolean | aggTrade aggregates fills at same price/side/time |
| **Bybit** | `publicTrade.<symbol>` | price, size, side, timestamp, trade ID | Explicit `S` (side) field: `Buy` or `Sell` | Individual trades |
| **OKX** | `trades` channel | price, size, side, timestamp, trade ID | Explicit `side` field | Individual trades |
| **Hyperliquid** | `trades` subscription | coin, side, px, sz, hash, time, tid, users | Explicit `side`, plus `users: [buyer, seller]` | Individual trades with user addresses |
| **dYdX v4** | `v4_trades` channel | price, size, side, createdAt | Explicit side | Individual trades |
| **Coinbase** | `market_trades` channel | trade_id, product_id, price, size, side, time | Explicit `side` field | Individual trades |
| **Kraken** | `trade` channel | price, qty, time, side, type | Explicit side + order type (market/limit) | Individual trades |
| **Bitfinex** | Channel ID based | [ID, MTS, AMOUNT, PRICE] where sign of AMOUNT = side | Sign-based: positive AMOUNT = buy, negative = sell | Individual trades |
| **Gate.io** | `spot.trades` / `futures.trades` | id, create_time, side, price, amount | Explicit `side` field | Individual trades |
| **HTX** | `market.$symbol.trade.detail` | id, ts, price, amount, direction | Explicit `direction`: `buy` or `sell` | Individual trades |

### 2.5 Subscription Model

| Exchange | Model | Subscribe Format | Multi-Symbol |
|---|---|---|---|
| **Binance** | URL path OR JSON subscribe | `{"method":"SUBSCRIBE","params":["btcusdt@trade"],"id":1}` | Yes, up to 1024 per connection |
| **Bybit** | JSON subscribe with args array | `{"op":"subscribe","args":["orderbook.50.BTCUSDT"]}` | Yes, multiple in args |
| **OKX** | JSON subscribe with args objects | `{"op":"subscribe","args":[{"channel":"trades","instId":"BTC-USDT"}]}` | Yes, multiple args objects |
| **Hyperliquid** | JSON method/subscription | `{"method":"subscribe","subscription":{"type":"l2Book","coin":"BTC"}}` | One subscription per message |
| **dYdX v4** | JSON type/channel/id | `{"type":"subscribe","channel":"v4_trades","id":"BTC-USD"}` | One per message |
| **Coinbase** | JSON type/channel/product_ids | `{"type":"subscribe","product_ids":["ETH-USD"],"channel":"level2"}` | Yes, product_ids array |
| **Kraken** | JSON method/params | `{"method":"subscribe","params":{"channel":"book","symbol":["BTC/USD"]}}` | Yes, symbol array |
| **Bitfinex** | JSON event/channel/symbol | `{"event":"subscribe","channel":"book","symbol":"tBTCUSD"}` | One per message, multiple connections needed |
| **Gate.io** | JSON channel/event/payload | `{"channel":"spot.order_book_update","event":"subscribe","payload":["BTC_USDT","100ms"]}` | One per message |
| **HTX** | JSON sub with topic string | `{"sub":"market.btcusdt.depth.step0","id":"id1"}` | One per message |

### 2.6 Heartbeat / Keep-Alive

| Exchange | Server Ping Interval | Pong Timeout | Client Ping Required? | Notes |
|---|---|---|---|---|
| **Binance (Spot)** | Every 20 seconds | 1 minute | Must respond to server ping | Unsolicited pongs allowed but don't prevent disconnect |
| **Binance (Futures)** | Every 3 minutes | 10 minutes | Must respond to server ping | Same as spot |
| **Bybit** | N/A | 10 minutes without any data/ping | Yes, recommended every 20s | Send `{"op":"ping"}`, receive `{"op":"pong"}` |
| **OKX** | N/A | 30 seconds | Yes, send `"ping"` text | Receive `"pong"` text response |
| **Hyperliquid** | N/A | Not documented | Recommended | Handle disconnects gracefully |
| **dYdX v4** | Every 30 seconds | 10 seconds | Must respond to server ping | Standard WS ping/pong frames |
| **Coinbase** | N/A | 60-90 seconds | Subscribe to heartbeats channel | heartbeat_counter for gap detection |
| **Kraken** | N/A | ~1 minute | Any message keeps alive | Server closes on inactivity |
| **Bitfinex** | N/A | Not documented | Not required | Server maintains connection |
| **Gate.io** | N/A | Not documented | Recommended | Exchange-specific ping format |
| **HTX** | Server sends ping | 10 seconds | Must respond with pong containing same timestamp | `{"ping": <ts>}` -> `{"pong": <ts>}` |

### 2.7 Rate Limits Summary

| Exchange | Inbound Message Rate | Subscribe/Unsubscribe Limits | Connection Rate |
|---|---|---|---|
| **Binance** | 5/sec (spot), 10/sec (futures) | Part of message limit | 300 connections per 5 min per IP |
| **Bybit** | WS requests not rate-limited (market data) | No explicit limit | Not documented |
| **OKX** | 3 requests/sec per API key | 480 subscribe/unsubscribe/login per hour per connection | Per-channel connection limits |
| **Hyperliquid** | Not documented | 100 connections, 1000 subscriptions per IP | Per-IP limits |
| **dYdX v4** | Not documented | Not documented | Not documented |
| **Coinbase** | 8 unauthenticated/sec per IP | Part of message limit | 750 connections/sec per IP |
| **Kraken** | Dynamic (system load based) | Varies by tier (standard: 200/sec, pro: 500/sec) | 150 per 10 min per IP |
| **Bitfinex** | Unlimited order ops per connection | 15 new connections per 5 min per account, 30 channels per connection | 20 pub/min, 5 auth/15s |
| **Gate.io** | 50 requests/sec per channel | One subscription per contract per connection | Not documented |
| **HTX** | 50 req at once, unlimited sub | No limit on sub requests | 5-10 per API key |

---

## 3. Quirks and Gotchas

### Binance
- **24-hour disconnect**: Connections are forcefully closed after 24 hours. Must implement automatic reconnection.
- **Spot vs Futures differences**: Different ping intervals (20s vs 3min), different message rate limits (5/s vs 10/s), different depth stream frequencies.
- **Update ID validation**: Spot uses `[U, u]` range check; Futures adds `pu` (previous update) field for chain validation.
- **aggTrade vs trade**: `aggTrade` aggregates multiple fills at same price/time/side into one message. Lower message count but loses individual fill granularity.
- **Weight-based REST rate limits**: Depth snapshots via REST consume API weight, shared with all REST calls.

### Bybit
- **Push frequency change**: Orderbook (1000 depth) push frequency changed from 300ms to 200ms in November 2025.
- **Snapshot re-push**: For level 1 data, if no change for 3 seconds, a snapshot is re-pushed.
- **Higher rate limits via SDK**: Using tiagosiebler's SDK automatically gets higher API rate limits (400 req/s) than the highest VIP tier.
- **Topic-based routing**: Different WS endpoints for spot/linear/inverse/option.

### OKX
- **VIP-gated channels**: The fastest orderbook channels (10ms `tbt` channels) require VIP4+ or VIP5+ trading fee tier.
- **`uly` parameter deprecated**: Use `instFamily` instead; `uly` now returns errors.
- **Channel URL migration**: Some channels moved from `/public` or `/private` to `/business` URL.
- **No-change suppression**: No update sent if depth changes A -> B -> A within an interval.
- **books-elp channel**: Special channel for Enhanced Liquidity Program orders, requires distinguishing valid/invalid parts.

### Hyperliquid
- **DEX with CEX-like API**: Despite being on-chain, provides familiar WebSocket API patterns.
- **Block-based updates**: Orderbook updates are tied to L1 block production, not continuous.
- **L4 book available**: Unique per-order-level data (L4) with order diffs per block.
- **User addresses in trades**: Trade messages include `[buyer, seller]` addresses.
- **50-bit trade ID**: `tid` is a 50-bit hash; globally unique ID requires `(block_time, coin, tid)`.

### dYdX v4
- **Cosmos-based indexer**: WS data comes from the Indexer service, not directly from the chain.
- **Orderbook message-id**: Book entries include a third element: `[price, size, message-id]`.
- **Crossed books possible**: Book may temporarily be crossed; it uncrosses eventually.
- **Batched mode**: Subscribe with `batched: true` for fewer, larger messages.

### Coinbase
- **Separate endpoints**: Market data and user data use different WS URLs.
- **Sequence gaps expected**: Even over TCP, server-side data handling can cause dropped messages.
- **Heartbeat counter**: Use `heartbeat_counter` to detect missed messages.
- **User channel batching**: Open orders are sent in batches of 50 on subscription.
- **JWT authentication**: Uses CDP API keys with JWT, not traditional HMAC.

### Kraken
- **XBT vs BTC**: v2 uses BTC (not XBT) for Bitcoin. Common source of errors.
- **CRC32 checksum**: Provides CRC32 on top 10 bid/ask levels for book validation.
- **Cloudflare protection**: Rate limiting is partially enforced by Cloudflare, not just Kraken.
- **L3 data available**: Individual order-level data with order IDs (authenticated only).
- **Dynamic rate limits**: Message rate limits vary based on system load.

### Bitfinex
- **Array format**: Messages are JSON arrays, not objects. Field positions matter, not keys.
- **Sign-based side detection**: Bid amounts are positive, ask amounts are negative.
- **Precision levels**: P0 (most granular) to P3 (most aggregated), plus R0 (raw per-order).
- **8 calc/sec limit**: Server performs max 8 calculations per second per client.
- **Sequence numbers opt-in**: Must explicitly enable with a flag for packet-loss detection.

### Gate.io
- **REST snapshot alignment critical**: WS subscribed depth level MUST match REST `limit` parameter, or incremental updates break.
- **20ms interval**: Fastest orderbook updates at 20ms, but only for 20 levels.
- **Duplicate subscription errors**: Same contract/pair can only be subscribed once per connection.
- **Absolute sizes**: All sizes in notifications are absolute values (replace, not delta).

### HTX
- **Gzip compression**: All WS messages are gzip-compressed. Must decompress before parsing.
- **Ping/pong with timestamp**: Server sends `{"ping": <timestamp>}`, client must respond with matching `{"pong": <timestamp>}`.
- **AWS-optimized endpoint**: `api-aws.huobi.pro` provides lower latency for AWS-hosted clients.
- **seqNum chain validation**: Incremental MBP uses `seqNum`/`prevSeqNum` chain; mismatch means message loss.
- **Limited connections**: Only 5-10 WS connections per API key for spot.

---

## 4. Normalization Strategy Recommendations

### 4.1 Unified Data Models

Based on analysis of how ccxt, cryptofeed, and crypto-crawler handle normalization:

```
// Normalized Trade
{
  exchange: string,        // "binance", "bybit", etc.
  symbol: string,          // "BTC/USDT" (BASE/QUOTE, always slash-separated)
  tradeId: string,         // Exchange-native trade ID as string
  timestamp: number,       // Unix milliseconds UTC
  side: "buy" | "sell",    // Taker side (normalized from isBuyerMaker, sign, direction, etc.)
  price: string,           // Decimal string (never float)
  amount: string,          // Decimal string
  raw: object              // Original exchange message for debugging
}

// Normalized OrderBook Level
{
  price: string,           // Decimal string
  amount: string,          // Decimal string (0 = remove level)
}

// Normalized OrderBook Update
{
  exchange: string,
  symbol: string,
  timestamp: number,       // Unix milliseconds UTC
  type: "snapshot" | "delta",
  bids: OrderBookLevel[],  // Sorted descending by price
  asks: OrderBookLevel[],  // Sorted ascending by price
  sequenceId: number | string,  // For ordering validation
  checksum?: string        // If exchange provides (Kraken CRC32, OKX checksum)
}
```

### 4.2 Symbol Normalization

Each exchange uses different symbol formats. The normalization layer must map:

| Exchange | Spot Format | Futures Format | Normalized |
|---|---|---|---|
| Binance | `BTCUSDT` | `BTCUSDT` | `BTC/USDT` |
| Bybit | `BTCUSDT` | `BTCUSDT` | `BTC/USDT` |
| OKX | `BTC-USDT` | `BTC-USDT-SWAP` | `BTC/USDT`, `BTC/USDT:USDT` |
| Hyperliquid | `BTC` | `BTC` | `BTC/USD:USD` |
| dYdX v4 | N/A | `BTC-USD` | `BTC/USD:USD` |
| Coinbase | `BTC-USD` | `BIT-28APR25-CDE` | `BTC/USD` |
| Kraken | `BTC/USD` | `PF_XBTUSD` | `BTC/USD` |
| Bitfinex | `tBTCUSD` | `tBTCF0:USTF0` | `BTC/USD` |
| Gate.io | `BTC_USDT` | `BTC_USDT` | `BTC/USDT` |
| HTX | `btcusdt` | `BTC-USDT` | `BTC/USDT` |

**Recommendation:** Use ccxt's symbol normalization as the reference standard (`BASE/QUOTE` for spot, `BASE/QUOTE:SETTLE` for derivatives). It handles the most edge cases and is battle-tested across 100+ exchanges.

### 4.3 Side/Direction Normalization

| Exchange | Field | Buy Value | Sell Value |
|---|---|---|---|
| Binance | `m` (isBuyerMaker) | `false` (taker bought) | `true` (taker sold) |
| Bybit | `S` | `"Buy"` | `"Sell"` |
| OKX | `side` | `"buy"` | `"sell"` |
| Hyperliquid | `side` | `"A"` (ask was hit = buy) | `"B"` (bid was hit = sell) |
| dYdX v4 | `side` | `"BUY"` | `"SELL"` |
| Coinbase | `side` | `"BUY"` | `"SELL"` |
| Kraken | `side` | `"buy"` | `"sell"` |
| Bitfinex | sign of AMOUNT | positive | negative |
| Gate.io | `side` | `"buy"` | `"sell"` |
| HTX | `direction` | `"buy"` | `"sell"` |

**Watch out for Binance `isBuyerMaker`:** This is inverted from what you might expect. `m: true` means the maker was the buyer, so the taker was the seller. `m: false` means the taker was the buyer. Also watch for Hyperliquid's inverted "A"/"B" convention.

### 4.4 Timestamp Normalization

Most exchanges use milliseconds since epoch. Exceptions:
- **Bitfinex**: Milliseconds but in some contexts seconds
- **Coinbase**: ISO-8601 strings
- **Gate.io**: Seconds (must multiply by 1000)
- **Kraken**: Quoted decimal seconds

**Recommendation:** Normalize everything to integer milliseconds UTC internally. Store the original exchange timestamp for latency measurement.

---

## 5. Connection Management Patterns

### 5.1 Reconnection Strategy

```
Recommended: Exponential Backoff with Jitter

Initial delay:  100ms
Max delay:      30 seconds
Backoff factor: 2x
Jitter:         Random 0-50% of current delay
Max retries:    Unlimited (with circuit breaker)

On reconnect:
  1. Re-establish WebSocket connection
  2. Re-authenticate if private channel
  3. Re-subscribe to all previous subscriptions
  4. Request fresh REST snapshot for orderbooks
  5. Reconcile any sequence gaps
```

**Per-Exchange Reconnection Triggers:**

| Trigger | Exchanges Affected |
|---|---|
| 24-hour forced disconnect | Binance |
| Ping/pong timeout | All exchanges |
| No data timeout | OKX (30s), Coinbase (60-90s), Kraken (~60s) |
| Rate limit ban | Binance (2min-3day), Kraken (10min) |
| Sequence gap detected | All exchanges (proactive reconnect) |

### 5.2 Heartbeat Management

```
Per-Exchange Heartbeat Configuration:

Binance Spot:   Respond to server ping within 60s
Binance Futures: Respond to server ping within 10min
Bybit:          Send {"op":"ping"} every 20s
OKX:            Send "ping" string every <30s
Hyperliquid:    Application-level keepalive recommended
dYdX v4:        Respond to server ping within 10s
Coinbase:       Subscribe to heartbeats channel
Kraken:         Send any message within ~60s
Bitfinex:       No explicit requirement
Gate.io:        Exchange-specific ping
HTX:            Respond to {"ping": ts} with {"pong": ts}
```

### 5.3 Backpressure Handling

**Problem:** During high-volatility periods, exchanges can push thousands of messages per second. A multi-exchange terminal must handle backpressure gracefully.

**Recommended Patterns:**

1. **Message Queue with Drop Policy**: Use a bounded queue per exchange. If the queue fills up, drop the oldest orderbook deltas (they'll be superseded) but never drop trade messages.

2. **Throttled Rendering**: Process all messages internally but throttle UI updates to 60fps. Batch orderbook state changes between render frames.

3. **Priority-Based Processing**: Trades > Orderbook snapshots > Orderbook deltas > Ticker updates. Process higher-priority messages first.

4. **Adaptive Subscription Depth**: During high-load periods, automatically downgrade from deep orderbook channels (400 levels) to shallow ones (5-20 levels).

5. **Worker Thread Isolation**: Process each exchange's WebSocket in a separate worker/thread. This prevents one slow exchange from blocking others. (This is exactly how Tucsky/aggr does it -- one Worker per exchange.)

### 5.4 Orderbook Maintenance State Machine

```
States:
  DISCONNECTED -> CONNECTING -> SUBSCRIBING -> BUFFERING -> SYNCING -> SYNCED -> STALE

DISCONNECTED:
  Entry: Close WS, clear local book
  Trigger: Connection lost, sequence gap too large
  Action: Start reconnection with backoff

CONNECTING:
  Entry: Open WS connection
  Trigger: Connection established
  Action: Move to SUBSCRIBING

SUBSCRIBING:
  Entry: Send subscribe message
  Trigger: Subscription confirmed
  Action: Start buffering incoming deltas, move to BUFFERING

BUFFERING:
  Entry: Buffer incoming WS messages
  Trigger: Buffer started
  Action: Request REST snapshot, move to SYNCING

SYNCING:
  Entry: Apply REST snapshot to local book
  Trigger: Snapshot received
  Action: Replay buffered deltas with sequence >= snapshot, move to SYNCED

SYNCED:
  Entry: Apply deltas in real-time
  Trigger: Sequence gap or checksum mismatch
  Action: Move to DISCONNECTED (re-sync)

STALE:
  Entry: No updates received for threshold period
  Action: Move to DISCONNECTED
```

---

## 6. Recommended Multi-Exchange WebSocket Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (Browser/Desktop)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ OrderBook│  │  Trades  │  │  Ticker  │  │  Charts/Candles  ││
│  │  Widget  │  │  Widget  │  │  Widget  │  │     Widget       ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘│
│       └──────────────┴──────────────┴───────────────┘           │
│                          │ Normalized Events                     │
│  ┌───────────────────────┴──────────────────────────────────────┐│
│  │                   Event Bus / State Store                     ││
│  │          (Zustand / Redux with normalized schemas)            ││
│  └───────────────────────┬──────────────────────────────────────┘│
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                  Normalization Layer                              │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  Symbol Mapper │ Side Normalizer │ Timestamp Normalizer      ││
│  │  Price Formatter │ Orderbook Builder │ Checksum Validator    ││
│  └──────────────────────────────────────────────────────────────┘│
│                           │                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │Binance │ │ Bybit  │ │  OKX   │ │  HL    │ │ dYdX   │  ...   │
│  │Adapter │ │Adapter │ │Adapter │ │Adapter │ │Adapter │        │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘        │
│      │          │          │          │          │               │
└──────┼──────────┼──────────┼──────────┼──────────┼──────────────┘
       │          │          │          │          │
┌──────┼──────────┼──────────┼──────────┼──────────┼──────────────┐
│      │    Connection Manager (per-exchange workers)     │        │
│  ┌───┴────┐ ┌───┴────┐ ┌───┴────┐ ┌───┴────┐ ┌───┴────┐       │
│  │Worker 1│ │Worker 2│ │Worker 3│ │Worker 4│ │Worker 5│  ...   │
│  │Binance │ │ Bybit  │ │  OKX   │ │  HL    │ │ dYdX   │       │
│  │  WS    │ │  WS    │ │  WS    │ │  WS    │ │  WS    │       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                                  │
│  Each worker handles:                                            │
│  - WebSocket lifecycle (connect/disconnect/reconnect)            │
│  - Heartbeat/ping-pong per exchange spec                         │
│  - Message decompression (HTX gzip)                              │
│  - Sequence validation                                           │
│  - Backpressure (bounded message queue)                          │
│  - REST snapshot requests for orderbook sync                     │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Technology Stack Recommendations

**For Browser-Based Terminal:**
- **WebSocket Workers**: Dedicated Web Workers per exchange (pattern from Tucsky/aggr)
- **Message Passing**: `postMessage` with `Transferable` objects for zero-copy
- **State Management**: Zustand or similar with immer for efficient orderbook mutations
- **JSON Parsing**: Use `orjson` (Python) or optimized JSON parsers; for JS, native `JSON.parse` is already fast

**For Server-Side / Hybrid:**
- **Runtime**: Node.js with `ws` library, or Rust with `tokio-tungstenite`
- **Multi-Exchange SDK**: tiagosiebler's per-exchange SDKs (best DX for TypeScript), or ccxt Pro (most exchanges)
- **Orderbook Management**: tiagosiebler/orderbooks for snapshot+delta handling
- **Data Pipeline**: cryptofeed (Python) or crypto-crawler-rs (Rust) for raw data ingestion

### 6.3 Exchange Adapter Interface

Each exchange adapter should implement:

```typescript
interface ExchangeAdapter {
  // Identity
  readonly exchangeId: string;
  readonly name: string;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Subscriptions
  subscribeTrades(symbol: string): Promise<void>;
  subscribeOrderbook(symbol: string, depth?: number): Promise<void>;
  subscribeTicker(symbol: string): Promise<void>;
  unsubscribe(symbol: string, channel: string): Promise<void>;

  // Events (normalized)
  on(event: 'trade', handler: (trade: NormalizedTrade) => void): void;
  on(event: 'orderbook', handler: (update: NormalizedOrderbookUpdate) => void): void;
  on(event: 'ticker', handler: (ticker: NormalizedTicker) => void): void;
  on(event: 'error', handler: (error: ExchangeError) => void): void;
  on(event: 'status', handler: (status: ConnectionStatus) => void): void;

  // Symbol mapping
  normalizeSymbol(exchangeSymbol: string): string;
  denormalizeSymbol(normalizedSymbol: string): string;

  // Configuration
  getConnectionConfig(): {
    endpoints: string[];
    maxStreamsPerConnection: number;
    heartbeatInterval: number;
    reconnectBackoff: BackoffConfig;
    compression?: 'gzip' | 'none';
  };
}
```

### 6.4 Connection Pool Strategy

Given the varying connection limits across exchanges:

```
Exchange Connection Budget Planning:

Binance:     1-3 connections (1024 streams each, generous budget)
Bybit:       1-2 connections (generous limits)
OKX:         2-4 connections (480 ops/hr limit, split public/private/business)
Hyperliquid: 1-2 connections (100 max, 1000 subs)
dYdX v4:     1 connection (lightweight)
Coinbase:    2 connections (market + user endpoints)
Kraken:      1 connection (can handle all pairs)
Bitfinex:    2-3 connections (25-30 channels each)
Gate.io:     2-3 connections (spot + futures endpoints)
HTX:         2-5 connections (limited per API key)

Total: ~15-30 WebSocket connections for 10 exchanges
```

### 6.5 Latency Optimization

Based on research from gmtech-xyz/exchanges-latency-test and community benchmarks:

1. **Server Location**: Co-locate with exchange servers. Binance and Bybit in Tokyo/Singapore, Coinbase/Kraken in US, OKX in Hong Kong. For multi-exchange, AWS Tokyo or Singapore provides best average latency to Asian exchanges.

2. **Message Processing Pipeline**: Parse JSON -> Normalize -> Update local state -> Emit event. Each step should be non-blocking. Target <1ms processing per message.

3. **Orderbook Depth Selection**: Use the minimum depth needed. Shallow books (5-20 levels) have faster push rates and lower bandwidth. Only use deep books (200-1000 levels) if strategy requires it.

4. **Connection Warmup**: Pre-establish connections and subscriptions before trading. Cold subscription can take 100-500ms per exchange.

5. **HTX Decompression**: Factor in gzip decompression overhead (~0.1-0.5ms per message). Consider pre-allocated decompression buffers.

---

## 7. Summary Comparison Matrix

| Feature | Binance | Bybit | OKX | Hyperliquid | dYdX v4 | Coinbase | Kraken | Bitfinex | Gate.io | HTX |
|---|---|---|---|---|---|---|---|---|---|---|
| **Fastest Book Update** | 100ms | 200ms | 10ms (VIP) | Per-block | Real-time | Real-time | Real-time | Real-time | 20ms | Tick-by-tick |
| **Max Book Depth (WS)** | 20 (partial) | 1000 | 400 | 100 | Full | Full | Configurable | Full (R0) | 20 (fast) | 150 |
| **Streams per Conn** | 1024 | Many | 64KB limit | 1000 | Multiple | Multiple | All | 25-30 | 1 per pair | Unlimited sub |
| **Compression** | None | None | None | None | None | None | None | None | None | **gzip** |
| **Checksum** | No (use seq IDs) | No (use seq) | Yes | No | No | No | CRC32 | No (opt-in seq) | No (use IDs) | No (use seqNum) |
| **L3 Data** | No | No | No | Yes (L4) | No | No | Yes (auth) | Yes (R0) | No | No |
| **Trade Classification** | isBuyerMaker (inverted) | Explicit side | Explicit side | Side + users | Explicit side | Explicit side | Side + type | Amount sign | Explicit side | Direction |
| **Documentation Quality** | Excellent | Good | Good | Basic | Good | Good | Good | Fair | Fair | Fair |
| **SDK Ecosystem** | Rich | Rich | Good | Growing | Moderate | Good | Moderate | Moderate | Moderate | Limited |

---

## 8. Key Recommendations for Multi-Exchange Terminal

1. **Start with tiagosiebler's SDKs** for Binance, Bybit, OKX, Gate.io if building in TypeScript. They handle reconnection, heartbeat, and authentication out of the box. Use ccxt Pro for exchanges not covered.

2. **Use the Worker-per-exchange pattern** (from Tucsky/aggr) to isolate exchange connections. One slow or misbehaving exchange should never affect others.

3. **Build the normalization layer as a separate module** with per-exchange adapters. Use ccxt's symbol format as the normalization standard.

4. **Implement orderbook state machine** with proper sequence validation. This is the hardest part -- each exchange has different sequencing mechanisms (update IDs, sequence numbers, checksums, seqNum chains).

5. **Plan for VIP tiers on OKX** if you need fast orderbook data. The 10ms `tbt` channels require VIP4+/VIP5+. For non-VIP, OKX is limited to 100ms updates.

6. **Handle Binance's `isBuyerMaker` carefully**. It's the most common source of trade-side normalization bugs across multi-exchange systems.

7. **Monitor connection health actively**. Don't just check "is connected" -- track message frequency, sequence gaps, and latency per exchange. A connected socket receiving no data is worse than a known disconnect.

8. **Use REST snapshots as fallback**. Every orderbook implementation should periodically validate state via REST snapshots, not just rely on WS deltas. Kraken's CRC32 checksum and Binance's update ID ranges make this validation easier.

---

## Sources

### GitHub Repositories
- [ccxt/ccxt](https://github.com/ccxt/ccxt) -- Unified multi-exchange library
- [bmoscon/cryptofeed](https://github.com/bmoscon/cryptofeed) -- Python exchange feed handler
- [crypto-crawler/crypto-crawler-rs](https://github.com/crypto-crawler/crypto-crawler-rs) -- Rust exchange crawler
- [Tucsky/aggr](https://github.com/Tucsky/aggr) -- Browser-based trades aggregator
- [Tucsky/aggr-server](https://github.com/Tucsky/aggr-server) -- Server-side aggregator
- [tiagosiebler/binance](https://github.com/tiagosiebler/binance) -- Binance Node.js SDK
- [tiagosiebler/bybit-api](https://github.com/tiagosiebler/bybit-api) -- Bybit Node.js SDK
- [tiagosiebler/okx-api](https://github.com/tiagosiebler/okx-api) -- OKX Node.js SDK
- [tiagosiebler/orderbooks](https://github.com/tiagosiebler/orderbooks) -- Orderbook snapshot+delta handler
- [kanekoshoyu/exchange-collection](https://github.com/kanekoshoyu/exchange-collection) -- Rust exchange OpenAPI/AsyncAPI specs
- [kanekoshoyu/guilder](https://github.com/kanekoshoyu/guilder) -- Rust exchange abstraction library
- [gmtech-xyz/exchanges-latency-test](https://github.com/gmtech-xyz/exchanges-latency-test) -- WS latency measurement
- [gmtech-xyz/safe-cex](https://github.com/gmtech-xyz/safe-cex) -- TypeScript trading library
- [hummingbot/hummingbot](https://github.com/hummingbot/hummingbot) -- Market-making bot framework
- [hyperliquid-dex/order_book_server](https://github.com/hyperliquid-dex/order_book_server) -- Hyperliquid order book server
- [bitfinexcom/bitfinex-api-go](https://github.com/bitfinexcom/bitfinex-api-go) -- Bitfinex Go SDK

### Exchange Documentation
- [Binance WebSocket Streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)
- [Binance Futures WS](https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams)
- [Bybit V5 WebSocket](https://bybit-exchange.github.io/docs/v5/ws/connect)
- [Bybit Orderbook](https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook)
- [OKX API V5](https://www.okx.com/docs-v5/en/)
- [Hyperliquid WebSocket](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket)
- [dYdX v4 Indexer WebSocket](https://docs.dydx.exchange/api_integration-indexer/indexer_websocket)
- [Coinbase Advanced Trade WS](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-overview)
- [Kraken WebSocket V2](https://docs.kraken.com/websockets-v2/)
- [Gate.io Spot WS](https://www.gate.com/docs/developers/apiv4/ws/en/)
- [Gate.io Futures WS](https://www.gate.com/docs/developers/futures/ws/en/)
- [Bitfinex WS General](https://docs.bitfinex.com/docs/ws-general)
- [HTX/Huobi API](https://huobiapi.github.io/docs/spot/v1/en/)

### Articles & Guides
- [CoinAPI: Live Data for Trading Engines](https://www.coinapi.io/blog/live-crypto-data-trading-engines-latency-normalization-multi-exchange)
- [Hummingbot Connector Architecture](https://hummingbot.org/connectors/connectors/architecture/)
- [Ably: WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [CCXT Pro WebSocket Documentation](https://docs.ccxt.com/en/latest/ccxt.pro.manual.html)
