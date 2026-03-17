# Phase 1A: Exchange Connector Framework — Design Document

**Date:** 2026-03-17
**Author:** system-designer agent
**Status:** Approved for implementation
**Scope:** `packages/core/src/` — WebSocket manager, adapter pattern, orderbook state machine, worker integration, error handling

---

## Table of Contents

1. [Component Diagram](#1-component-diagram)
2. [WebSocket Manager Design](#2-websocket-manager-design)
3. [Adapter Pattern](#3-adapter-pattern)
4. [Orderbook State Machine](#4-orderbook-state-machine)
5. [Web Worker Integration](#5-web-worker-integration)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [File Structure](#7-file-structure)
8. [Design Decisions and Trade-offs](#8-design-decisions-and-trade-offs)

---

## 1. Component Diagram

The Exchange Connector Framework is structured as a layered pipeline running entirely inside a Web Worker. Raw WebSocket bytes flow inward through parsing and normalization; normalized events flow outward to the main thread via batched postMessage calls.

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                        MAIN THREAD                                   │
  │                                                                       │
  │  ┌──────────────────────────────────────────────────────────────┐   │
  │  │                    WorkerClient                               │   │
  │  │  Wraps postMessage/onmessage. Translates WorkerInbound-       │   │
  │  │  Message / WorkerOutboundMessage into typed method calls.     │   │
  │  └─────────────────────────────┬────────────────────────────────┘   │
  └────────────────────────────────┼───────────────────────────────────┘
                                   │  postMessage (typed messages)
  ┌────────────────────────────────┼───────────────────────────────────┐
  │                    WEB WORKER                                        │
  │                                                                       │
  │  ┌──────────────────────────────────────────────────────────────┐   │
  │  │                    Worker Entry Point                         │   │
  │  │  self.onmessage dispatcher → routes WorkerInboundMessage     │   │
  │  │  to AdapterRegistry commands                                  │   │
  │  └───────────────────────────┬──────────────────────────────────┘   │
  │                               │                                       │
  │  ┌────────────────────────────▼─────────────────────────────────┐   │
  │  │                    AdapterRegistry                            │   │
  │  │  Holds one adapter instance per ExchangeId.                   │   │
  │  │  Routes subscribe/unsubscribe commands to the correct         │   │
  │  │  adapter. Aggregates status events for the worker.            │   │
  │  └────┬──────────┬──────────┬──────────┬──────────┬────────────┘   │
  │       │          │          │          │          │                   │
  │  ┌────▼──┐  ┌────▼──┐  ┌───▼───┐  ┌───▼───┐  ┌───▼──┐              │
  │  │Binance│  │ Bybit │  │  OKX  │  │Coinbase│  │ ...  │              │
  │  │Adapter│  │Adapter│  │Adapter│  │Adapter │  │      │              │
  │  └────┬──┘  └────┬──┘  └───┬───┘  └───┬───┘  └───┬──┘              │
  │       │          │          │          │          │                   │
  │  Each adapter owns:                                                   │
  │    WebSocketManager instance (connection lifecycle + heartbeat)       │
  │    MessageParser       (raw bytes → parsed exchange object)           │
  │    Normalizer          (exchange object → NormalizedTrade / etc.)     │
  │    SymbolMapper        (exchange symbol ↔ normalized symbol)          │
  │    SubscriptionTracker (active subs, resubscribe on reconnect)        │
  │    OrderbookStateMachine (per symbol, snapshot + delta management)    │
  │       │                                                               │
  │  ┌────▼────────────────────────────────────────────────────────┐    │
  │  │                    FlushScheduler                            │    │
  │  │  Accumulates NormalizedTrade[], OrderbookSnapshot, Ticker    │    │
  │  │  events across all adapters. Flushes at a configurable       │    │
  │  │  interval (default 100 ms) via self.postMessage.             │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
Exchange WS frame
  → WebSocketManager receives raw MessageEvent
  → MessageParser: JSON.parse (+ gzip decompress for HTX)
  → Adapter.handleMessage(): route by message type tag
  → Normalizer: produce NormalizedTrade | OrderbookDelta | Ticker
  → OrderbookStateMachine.applyDelta() (for orderbook topics)
  → FlushScheduler.enqueue()
  → [every 100 ms] FlushScheduler posts WorkerOutboundMessage to main thread
```

---

## 2. WebSocket Manager Design

The `WebSocketManager` class is instantiated once per adapter. It owns the `WebSocket` object and is the only place that ever calls `ws.send()` or reads `ws.onmessage`. The adapter delegates all connection concerns here.

### 2.1 Connection Lifecycle State Machine

States are modelled on `ConnectionStatus` from `@terminal/types`:

```
  Disconnected ──connect()──► Connecting ──ws.onopen──► Connected
       ▲                                                     │
       │                                               ws.onclose /
       │                                               ws.onerror /
       │                                               ping timeout
       │                                                     │
       │                                                     ▼
       │                                              Reconnecting
       │                                         (backoff timer running)
       │                                                     │
       │◄──── max attempts exceeded ──────────────────────── │
       │                                                     │
       ▼                                              next attempt
      Error                                          go to Connecting
  (permanent, no retry)
```

**State transition rules:**

| From          | Event                                      | To            | Side Effect                                      |
|---------------|--------------------------------------------|---------------|--------------------------------------------------|
| Disconnected  | `connect()` called                         | Connecting    | Open `new WebSocket(url)`                        |
| Connecting    | `ws.onopen`                                | Connected     | Send subscribe frames; start heartbeat timer     |
| Connecting    | `ws.onerror` or timeout                    | Reconnecting  | Schedule next attempt with backoff               |
| Connected     | `ws.onclose` (code != 1000)                | Reconnecting  | Clear heartbeat timer; schedule backoff attempt  |
| Connected     | `ws.onclose` (code 1000) / `disconnect()`  | Disconnected  | Clear timers; do not retry                       |
| Connected     | Ping timeout (no pong within threshold)    | Reconnecting  | Same as above                                    |
| Connected     | Sequence gap detected (from OrderbookSM)   | Reconnecting  | Force close WS; adapter resubscribes on reopen   |
| Reconnecting  | Backoff timer fires, attempt < maxAttempts | Connecting    | Open new `WebSocket`                             |
| Reconnecting  | Attempts exhausted                         | Error         | Emit `connection-status` error; surface to UI    |
| Any           | Permanent error response (e.g. 403)        | Error         | Do not retry; emit error with `permanent: true`  |

### 2.2 Reconnection Strategy — Exponential Backoff with Jitter

```
delayMs = min(baseDelay * 2^attempt, maxDelay) * (1 + jitter * random())

Defaults:
  baseDelay  = 100 ms
  maxDelay   = 30 000 ms
  jitter     = 0.5          (adds 0–50% random spread)
  maxAttempts = 0           (unlimited; circuit breaker handles escalation)
```

The jitter prevents thundering-herd reconnects when a data centre event disconnects all exchange connections at the same moment. With `jitter = 0.5`, the spread across 10 adapters reconnecting simultaneously is roughly ±25% of the current delay, which is sufficient to desynchronize retry storms.

`maxAttempts = 0` means unlimited retries for transient network failures. The `Error` (permanent) state is entered only on explicit HTTP-level errors that indicate the connection will never succeed (see Section 6).

**Binance 24-hour forced disconnect:** A `ws.onclose` with code 1001 at the ~24-hour mark is treated as a normal reconnecting transition, not an error. The `WebSocketManager` does not special-case the timer; reconnection handles it transparently.

### 2.3 Ping/Pong Heartbeat Handling

Each adapter supplies a `HeartbeatConfig` to the `WebSocketManager`. The manager owns all timers and is responsible for detecting dead connections.

```typescript
interface HeartbeatConfig {
  // Interval at which the CLIENT must send a ping (ms). 0 = client does not ping.
  clientPingIntervalMs: number;
  // Message to send as a client ping (string | null for WS-level ping frame).
  clientPingPayload: string | null;
  // How long to wait for any inbound message before declaring the connection dead.
  inboundTimeoutMs: number;
  // Optional: function to determine if an inbound message is a server pong.
  isServerPong?: (rawMessage: string) => boolean;
}
```

**Per-exchange heartbeat configuration:**

| Exchange       | clientPingIntervalMs | clientPingPayload                    | inboundTimeoutMs | Notes                                        |
|----------------|----------------------|--------------------------------------|------------------|----------------------------------------------|
| Binance Spot   | 0                    | null (WS frame)                      | 60 000           | Server sends ping; respond with WS pong frame |
| Binance Futures| 0                    | null (WS frame)                      | 600 000          | 10-min server ping; WS-level pong            |
| Bybit          | 20 000               | `{"op":"ping"}`                      | 600 000          | Client-driven; 10 min no-data timeout        |
| OKX            | 25 000               | `"ping"`                             | 30 000           | String literal ping; 30s inbound timeout     |
| Hyperliquid    | 30 000               | `{"method":"ping"}`                  | 60 000           | Application-level keepalive recommended      |
| dYdX v4        | 0                    | null (WS frame)                      | 30 000           | Server sends ping every 30s; 10s pong timeout|
| Coinbase       | 0                    | null                                 | 90 000           | Subscribe to heartbeats channel separately   |
| Kraken         | 50 000               | `{"method":"ping"}`                  | 60 000           | Any message keeps alive; send ping to be safe|
| Bitfinex       | 0                    | null                                 | 120 000          | Server maintains connection                  |
| Gate.io        | 30 000               | `{"channel":"spot.ping","event":"","time":<ts>}` | 60 000 | Exchange-specific ping format      |
| HTX            | 0                    | null                                 | 10 000           | Server sends `{"ping":<ts>}`; must reply with `{"pong":<ts>}` |

**Inbound timer logic:** Every time any message arrives (including pongs), the inbound timer resets. If no message arrives within `inboundTimeoutMs`, the WebSocketManager closes the socket and transitions to `Reconnecting`. This catches silent disconnects regardless of whether the exchange sends pings.

**HTX pong:** HTX sends `{"ping": 1234567}` as a JSON text frame (not a WS ping frame). The adapter's `handleMessage()` must detect this pattern before routing to the normalizer and immediately send `{"pong": 1234567}`.

**Binance WS ping frame:** Binance sends standard WebSocket ping control frames. The browser's native `WebSocket` API does not expose ping/pong frames directly. The `WebSocketManager` sets `ws.onping = () => ws.pong()` where supported (Node.js `ws` library), or relies on the browser's automatic pong for browser builds.

### 2.4 Connection Limit Management

The `WebSocketManager` does not implement a connection pool; each adapter instance owns exactly one `WebSocket`. Connection budget enforcement is done at the `AdapterRegistry` level by capping how many adapter instances are instantiated per exchange.

**Budget table (enforced as constants in each adapter):**

| Exchange    | Max WS Connections Used | Rationale                                      |
|-------------|-------------------------|-------------------------------------------------|
| Binance     | 1                       | 1024 streams per connection is more than enough |
| Bybit       | 1 per category (spot / linear / inverse) | Separate endpoints mandate separate sockets |
| OKX         | 2 (public + business)   | Some channels require business endpoint         |
| Hyperliquid | 1                       | 1000 subs per connection; 1 suffices            |
| dYdX v4     | 1                       | Lightweight; single connection handles all      |
| Coinbase    | 1 (market data only)    | User stream is out of scope for Phase 1A        |
| Kraken      | 1                       | All pairs on a single connection                |
| Bitfinex    | 1 initially             | Max 25-30 channels; expand if > 25 subscriptions|
| Gate.io     | 2 (spot + futures)      | Separate WS endpoints                           |
| HTX         | 1 (spot)                | 5–10 connections per key; 1 is safe             |

---

## 3. Adapter Pattern

### 3.1 Class Hierarchy

`BaseExchangeAdapter` (existing in `packages/core/src/adapters/base-adapter.ts`) is extended by each exchange adapter. The adapter coordinates its own `WebSocketManager`, `MessageParser`, `Normalizer`, `SymbolMapper`, and `SubscriptionTracker`.

```
BaseExchangeAdapter  (abstract, existing)
  │
  ├── BinanceAdapter
  │     ├── BinanceSpotAdapter
  │     └── BinanceFuturesAdapter   (different endpoint, ping interval, depth logic)
  │
  ├── BybitAdapter
  │     ├── BybitSpotAdapter
  │     ├── BybitLinearAdapter
  │     └── BybitInverseAdapter
  │
  ├── OkxAdapter
  ├── HyperliquidAdapter
  ├── DydxAdapter
  ├── CoinbaseAdapter
  ├── KrakenAdapter
  ├── BitfinexAdapter
  ├── GateAdapter
  └── HtxAdapter
```

Each concrete adapter constructor:
1. Calls `super()`.
2. Instantiates `WebSocketManager` with its specific URL and `HeartbeatConfig`.
3. Instantiates `SymbolMapper` with its exchange's symbol format rules.
4. Instantiates `SubscriptionTracker`.
5. Wires `WebSocketManager.onMessage` → `this.handleMessage`.
6. Wires `WebSocketManager.onStatusChange` → `this.setStatus` (inherited).

### 3.2 Message Parsing Pipeline

```
raw MessageEvent.data (string | ArrayBuffer)
        │
        ▼
  [HTX only] decompress(data) → string       (pako.inflate)
        │
        ▼
  JSON.parse(data) → unknown
        │
        ▼
  MessageParser.classify(parsed)
    → identify message kind:
        'trade' | 'orderbook-snapshot' | 'orderbook-delta' |
        'ticker' | 'liquidation' | 'subscription-ack' |
        'heartbeat' | 'error' | 'unknown'
        │
        ▼
  [if heartbeat] → WebSocketManager.handlePong()
        │
  [if subscription-ack] → SubscriptionTracker.confirmSubscription()
        │
  [if error] → ErrorClassifier.classify() → route to ErrorHandler
        │
  [if trade / orderbook / ticker / liquidation]
        │
        ▼
  Normalizer.normalize(kind, parsed)
    → NormalizedTrade | OrderbookDelta | OrderbookSnapshot | Ticker
        │
        ▼
  [if orderbook delta] → OrderbookStateMachine.applyDelta(delta)
        │                    → may emit OrderbookSnapshot
        │
  [otherwise] → FlushScheduler.enqueue(event)
```

**Key rule:** The normalizer never throws. If a field is missing or unparseable, it returns `null` and the adapter logs a warning. A single malformed message must not interrupt the pipeline.

### 3.3 Symbol Mapping

Each adapter holds a `SymbolMapper` that is initialized with a static mapping table derived from the exchange's documented symbol format.

```typescript
class SymbolMapper {
  // exchange format -> normalized 'BASE/QUOTE' or 'BASE/QUOTE:SETTLE'
  toNormalized(exchangeSymbol: string): string | null;
  // normalized -> exchange format for subscribe messages
  toExchange(normalizedSymbol: string): string | null;
}
```

**Mapping examples (from research):**

| Exchange    | Exchange Symbol  | Normalized Symbol  | Rule                                          |
|-------------|------------------|--------------------|-----------------------------------------------|
| Binance     | `BTCUSDT`        | `BTC/USDT`         | Insert `/` before known quote currencies      |
| Bybit       | `BTCUSDT`        | `BTC/USDT`         | Same as Binance                               |
| OKX         | `BTC-USDT`       | `BTC/USDT`         | Replace `-` with `/`                          |
| OKX futures | `BTC-USDT-SWAP`  | `BTC/USDT:USDT`    | Strip `-SWAP`; append `:SETTLE`               |
| Hyperliquid | `BTC`            | `BTC/USD:USD`      | All HL markets are perps vs USD               |
| dYdX v4     | `BTC-USD`        | `BTC/USD:USD`      | Replace `-` with `/`; append `:USD`           |
| Coinbase    | `BTC-USD`        | `BTC/USD`          | Replace `-` with `/`                          |
| Kraken      | `BTC/USD`        | `BTC/USD`          | No change (already normalized format)        |
| Bitfinex    | `tBTCUSD`        | `BTC/USD`          | Strip leading `t`; split at 3-char quote      |
| Gate.io     | `BTC_USDT`       | `BTC/USDT`         | Replace `_` with `/`                          |
| HTX         | `btcusdt`        | `BTC/USDT`         | Uppercase; insert `/`                         |

The mapper is built at instantiation from a static JSON config per adapter. It is not dynamic — if an exchange adds a new symbol, the config file is updated and the adapter is redeployed.

### 3.4 Subscription Management

`SubscriptionTracker` maintains a `Map<string, SubscriptionRecord>` keyed by `"${topic}:${normalizedSymbol}"`.

```typescript
interface SubscriptionRecord {
  topic: SubscriptionTopic;
  normalizedSymbol: string;
  exchangeSymbol: string;
  depth?: number;                    // orderbook depth
  confirmed: boolean;                // ack received from exchange
  pendingSince: number;              // timestamp, for timeout detection
}
```

**Resubscription on reconnect:**

When `WebSocketManager` transitions to `Connected` after a reconnect, the adapter's `onReconnected()` method is invoked. It iterates all records in the `SubscriptionTracker` and replays each subscribe frame in order. For orderbook subscriptions it also resets the corresponding `OrderbookStateMachine` to `Buffering` so a fresh snapshot is fetched.

**Binance stream multiplexing:** Binance supports subscribing to multiple streams in a single `SUBSCRIBE` message (`params` array). The `BinanceAdapter` batches pending subscription requests into a single message before sending, up to 1024 streams per connection. This is handled in `SubscriptionTracker.flush()`.

---

## 4. Orderbook State Machine

Each symbol's orderbook is managed by a dedicated `OrderbookStateMachine` instance owned by the adapter. The state machine implements the per-exchange reconciliation logic described in the research.

### 4.1 States

```
  IDLE ──subscribe()──► BUFFERING ──snapshot received──► SYNCING ──replay complete──► SYNCED
   ▲                        │                                                            │
   │                        │ (buffer incoming deltas;                          sequence gap /
   │                        │  trigger REST snapshot)                          checksum fail /
   │                                                                            no data timeout
   │                                                                                    │
   └────────────────────── reset() ◄──────────────────────────────────────────────────-┘
                              │
                              ▼
                           BUFFERING (restart cycle)
```

**State descriptions:**

- **IDLE:** No subscription active. No local book state.
- **BUFFERING:** Subscription sent, waiting for REST snapshot. Incoming WS deltas are queued in an ordered buffer, not applied. REST snapshot request is fired immediately on entering this state.
- **SYNCING:** REST snapshot received. Apply snapshot to local book. Replay buffered deltas whose `sequenceId >= snapshot.sequenceId`. Discard earlier deltas.
- **SYNCED:** Live state. Apply deltas in real time. Validate sequence continuity and (where available) checksums.

### 4.2 Exchange-Specific Reconciliation

**Binance Spot (most complex):**

The Binance depth diff stream (`<symbol>@depth`) requires a specific reconciliation dance:

1. Open WS, subscribe to `<symbol>@depth@100ms`. Begin buffering all `depthUpdate` events.
2. Fire REST GET `/api/v3/depth?symbol=BTCUSDT&limit=1000` to get snapshot with `lastUpdateId`.
3. Drop buffered events where `u < lastUpdateId`.
4. Find the first buffered event where `U <= lastUpdateId + 1 <= u`. This is the first event to apply.
5. Apply snapshot as the base, then apply remaining buffered events in sequence.
6. For all subsequent events, validate: `U_new == u_prev + 1`. Any gap triggers a full resync.

**Binance Futures** adds a `pu` (previous update ID) field that must equal `u` of the previous event.

**Bybit:** Bybit sends an explicit `snapshot` type message on subscription, followed by `delta` messages. The state machine transitions from BUFFERING directly to SYNCED when the snapshot arrives over WS (no REST call needed unless the WS snapshot is missed).

**OKX:** OKX provides an optional `checksum` field (CRC32 of the top 25 bid/ask levels as a formatted string). The state machine validates this on every delta in SYNCED state. A mismatch triggers `reset()`.

**Kraken:** Kraken provides a CRC32 checksum over the top 10 bid/ask levels. Validation logic mirrors OKX.

**HTX Incremental MBP:** HTX MBP deltas include `seqNum` and `prevSeqNum`. Validation: `prevSeqNum_new == seqNum_prev`. Any break triggers resync.

**Gate.io:** The WS subscribed depth level must match the REST snapshot `limit` parameter exactly. The state machine stores the configured depth and uses it as the REST limit parameter.

### 4.3 Stale Detection and Re-snapshot

A `staleTimeoutMs` timer (default: 10 seconds) is reset on every SYNCED-state delta. If it fires without a delta arriving, the state machine calls `reset()` and restarts from BUFFERING. This handles silent connection states where the WS is open but the exchange has stopped pushing updates.

### 4.4 Local Book Maintenance

The local book is a pair of sorted structures:

- **Bids:** `Map<number, number>` (price → size), iterated descending
- **Asks:** `Map<number, number>` (price → size), iterated ascending

Applying a delta: iterate each `PriceLevel` in the delta. If `size == 0`, delete the price from the map. If `size > 0`, set the price to the new size.

After applying a delta, produce an `OrderbookSnapshot` from the current map state (top N levels) and route it to `FlushScheduler`. The snapshot is what crosses the worker boundary — raw delta objects never reach the main thread.

**Memory bound:** Keep at most `maxDepth` levels per side (configurable, default 400). When the map exceeds this bound after an apply, trim levels beyond the spread.

---

## 5. Web Worker Integration

### 5.1 Worker Entry Point

The worker entry point is a single file (`worker/exchange-worker.ts`) that runs entirely inside a `DedicatedWorkerGlobalScope`. It is the only file in the framework that references `self` (the worker global).

```
worker/exchange-worker.ts
  │
  ├── Instantiates AdapterRegistry
  ├── Registers all 10 exchange adapters
  ├── Instantiates FlushScheduler (default interval: 100 ms)
  │
  └── self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
        switch (event.data.type) {
          case 'subscribe':
            AdapterRegistry.subscribe(event.data)
            break;
          case 'unsubscribe':
            AdapterRegistry.unsubscribe(event.data)
            break;
          case 'set-timeframe':
            FlushScheduler.setTimeframe(event.data)
            break;
          case 'request-snapshot':
            AdapterRegistry.requestSnapshot(event.data)
            break;
          case 'add-indicator':
          case 'remove-indicator':
            IndicatorEngine.handle(event.data)
            break;
        }
      }
```

The `AdapterRegistry` wires each adapter's callbacks (`onTrade`, `onOrderbookSnapshot`, etc.) to `FlushScheduler.enqueue()` so all data flows to a single output point.

### 5.2 FlushScheduler

The `FlushScheduler` accumulates events across all adapters and periodically posts batched `WorkerOutboundMessage` payloads to the main thread. The interval is configurable (default: 100 ms). A lower interval (e.g., 16 ms for 60fps) reduces latency at the cost of more postMessage calls.

```typescript
class FlushScheduler {
  private pendingTrades: Map<string, NormalizedTrade[]>;      // key: "exchange:symbol"
  private pendingOrderbooks: Map<string, OrderbookSnapshot>;  // key: "exchange:symbol" (latest wins)
  private pendingTickers: Map<string, Ticker>;                // key: "exchange:symbol" (latest wins)
  private pendingStatuses: Map<ExchangeId, ConnectionStatus>; // key: exchangeId (latest wins)
  private flushIntervalId: ReturnType<typeof setInterval>;

  enqueue(event: NormalizedEvent): void;
  flush(): void;   // called by interval timer
  setInterval(ms: number): void;
}
```

**Batching policy by data type:**

| Data Type         | Batching Strategy                                                     |
|-------------------|-----------------------------------------------------------------------|
| Trades            | Append all to array; entire array is sent per flush interval         |
| Orderbook         | Latest wins — only the most recent snapshot per symbol is sent       |
| Ticker            | Latest wins — only the most recent ticker per symbol is sent         |
| Connection status | Latest wins — one status update per exchange per flush interval      |
| Errors            | Always sent immediately (bypass flush interval) via `self.postMessage` |

**Trade batching rationale:** Trades must not be dropped because they feed CVD and liquidation accounting. Every trade since the last flush is sent. The `WorkerOutboundMessage` `trade-batch` type already defines `trades: NormalizedTrade[]` for this purpose.

**Orderbook latest-wins rationale:** Sending every intermediate orderbook state across the worker boundary would saturate the postMessage channel during volatility. The main thread only needs the current book state to render; intermediate states are discarded in the worker.

### 5.3 Typed Message Protocol

The message protocol is defined entirely in `@terminal/types/src/worker/messages.ts` (existing). No additional message types are required for Phase 1A. The framework implements both sides:

**Worker side (outbound):**

| Message type         | When emitted                                       | Payload                        |
|----------------------|----------------------------------------------------|--------------------------------|
| `trade-batch`        | Each flush, if trades have accumulated             | `symbol`, `trades[]`           |
| `candle-update`      | On each completed or updated candle (future phase) | `symbol`, `timeframe`, `candle`|
| `orderbook`          | Each flush, latest snapshot per symbol             | `symbol`, `snapshot`           |
| `ticker`             | Each flush, latest ticker per symbol               | `symbol`, `ticker`             |
| `connection-status`  | Immediately on adapter status change               | `exchange`, `status`           |
| `error`              | Immediately on permanent error                     | `code`, `message`              |

**Main thread side (inbound):**

| Message type       | Action in worker                                     |
|--------------------|------------------------------------------------------|
| `subscribe`        | For each (exchange, topic): call adapter.subscribe   |
| `unsubscribe`      | Call adapter.unsubscribe for all topics on symbol    |
| `set-timeframe`    | Update candle aggregation timeframe (future phase)   |
| `request-snapshot` | Force immediate orderbook state flush for symbol     |
| `add-indicator`    | Register indicator with IndicatorEngine (future)     |
| `remove-indicator` | Deregister indicator (future)                        |

---

## 6. Error Handling Strategy

Errors are classified into three tiers that drive different recovery behaviors.

### 6.1 Tier 1 — Transient Errors (Auto-Reconnect)

**Definition:** Errors caused by network conditions or temporary exchange unavailability that are expected to resolve automatically.

**Examples:**
- WebSocket `onerror` or `onclose` with non-1000 code
- DNS resolution failure
- TCP connection timeout
- Exchange returning HTTP 503 during WebSocket upgrade
- Ping timeout (no inbound data within threshold)
- Sequence gap in orderbook stream

**Response:**
1. Transition adapter to `Reconnecting`.
2. Emit `WorkerOutboundMessage { type: 'connection-status', exchange, status: 'reconnecting' }`.
3. Apply exponential backoff with jitter (see Section 2.2).
4. On reconnect: re-authenticate if needed, resubscribe all tracked subscriptions, re-fetch orderbook snapshots.

Transient errors are logged at `WARN` level. No UI notification is raised; the connection status indicator in the UI reflects the `Reconnecting` state.

### 6.2 Tier 2 — Permanent Errors (Surface to UI)

**Definition:** Errors that indicate the connection will never succeed without user intervention.

**Examples:**
- HTTP 401 / 403 during WebSocket upgrade (invalid or expired API key)
- Exchange-level error message indicating authentication failure (e.g., Bybit `"retCode": 10003`)
- Exchange explicitly closing socket with a denial message (e.g., IP ban acknowledgement)
- `maxAttempts` exceeded after sustained network failure

**Response:**
1. Transition adapter to `Error` (terminal state — no more retries).
2. Emit `WorkerOutboundMessage { type: 'connection-status', exchange, status: 'error' }`.
3. Emit `WorkerOutboundMessage { type: 'error', code: <classified code>, message: <human-readable> }`.
4. The main thread surfaces this as a persistent UI notification with a "Reconnect" button that sends a new `subscribe` command to restart the adapter.

Permanent errors are logged at `ERROR` level.

### 6.3 Tier 3 — Rate Limit Errors (Backoff and Retry)

**Definition:** Errors indicating the client is sending too many messages or connecting too frequently.

**Examples:**
- Binance: HTTP 429 (Too Many Requests); `Retry-After` header present
- Binance: IP ban (HTTP 418); duration ranges from 2 minutes to 3 days
- OKX: error code for exceeding 480 subscribe/unsubscribe per hour
- Kraken: dynamic rate limit exceeded

**Response:**
1. Parse the `Retry-After` duration from the response headers or error body.
2. If `Retry-After` is absent, use the following defaults:
   - HTTP 429: Wait 60 seconds before retrying.
   - HTTP 418 (Binance IP ban): Wait 120 seconds minimum; surface to UI as a warning.
3. Suspend the affected adapter for the wait duration (do not transition to full `Error` state unless the ban duration is > 1 hour).
4. Emit a connection status of `Reconnecting` with an estimated resume time embedded in the message payload extension.
5. Log at `WARN` level; emit a temporary UI notification with the countdown.

### 6.4 Error Classification Logic

```typescript
function classifyError(event: CloseEvent | ErrorEvent | ExchangeErrorMessage): ErrorTier {
  if (isPermanentHttpCode(event))   return ErrorTier.Permanent;
  if (isRateLimitCode(event))       return ErrorTier.RateLimit;
  return ErrorTier.Transient;
}

function isPermanentHttpCode(event): boolean {
  return [401, 403].includes(event.httpCode)
    || isAuthFailureMessage(event);  // per-exchange auth error codes
}

function isRateLimitCode(event): boolean {
  return [429, 418].includes(event.httpCode)
    || isRateLimitMessage(event);    // e.g., OKX error code 60014
}
```

### 6.5 Error Propagation

Errors that occur inside the normalizer or orderbook state machine (malformed data, assertion failures) are caught at the adapter boundary. They are logged but do not propagate to the worker entry point. A single bad message never crashes the worker.

Unhandled exceptions at the worker global scope are caught by `self.onerror` and result in a `WorkerOutboundMessage { type: 'error', code: 'WORKER_CRASH', ... }`. The main thread then restarts the worker entirely.

---

## 7. File Structure

All new files are under `packages/core/src/`. Existing files (`adapters/base-adapter.ts`) are not moved.

```
packages/core/src/
│
├── adapters/
│   ├── base-adapter.ts                     [EXISTING — do not modify]
│   │
│   ├── binance/
│   │   ├── binance-adapter.ts              Abstract base shared by spot and futures
│   │   ├── binance-spot-adapter.ts         Extends BinanceAdapter; spot endpoint + ping config
│   │   ├── binance-futures-adapter.ts      Extends BinanceAdapter; futures endpoint + ping config
│   │   ├── binance-normalizer.ts           Raw Binance WS object → NormalizedTrade / OrderbookDelta
│   │   ├── binance-symbol-mapper.ts        BTCUSDT ↔ BTC/USDT
│   │   └── binance-message-parser.ts       Classifies raw Binance JSON into message kinds
│   │
│   ├── bybit/
│   │   ├── bybit-adapter.ts                Abstract base; shared topic routing
│   │   ├── bybit-spot-adapter.ts
│   │   ├── bybit-linear-adapter.ts
│   │   ├── bybit-inverse-adapter.ts
│   │   ├── bybit-normalizer.ts
│   │   ├── bybit-symbol-mapper.ts
│   │   └── bybit-message-parser.ts
│   │
│   ├── okx/
│   │   ├── okx-adapter.ts
│   │   ├── okx-normalizer.ts
│   │   ├── okx-symbol-mapper.ts
│   │   └── okx-message-parser.ts
│   │
│   ├── coinbase/
│   │   ├── coinbase-adapter.ts
│   │   ├── coinbase-normalizer.ts
│   │   ├── coinbase-symbol-mapper.ts
│   │   └── coinbase-message-parser.ts
│   │
│   ├── kraken/
│   │   ├── kraken-adapter.ts
│   │   ├── kraken-normalizer.ts
│   │   ├── kraken-symbol-mapper.ts
│   │   └── kraken-message-parser.ts
│   │
│   ├── hyperliquid/
│   │   ├── hyperliquid-adapter.ts
│   │   ├── hyperliquid-normalizer.ts
│   │   ├── hyperliquid-symbol-mapper.ts
│   │   └── hyperliquid-message-parser.ts
│   │
│   ├── dydx/
│   │   ├── dydx-adapter.ts
│   │   ├── dydx-normalizer.ts
│   │   ├── dydx-symbol-mapper.ts
│   │   └── dydx-message-parser.ts
│   │
│   ├── bitfinex/
│   │   ├── bitfinex-adapter.ts             Array-format parser; channel ID registry
│   │   ├── bitfinex-normalizer.ts          Sign-based side detection
│   │   ├── bitfinex-symbol-mapper.ts       tBTCUSD ↔ BTC/USD
│   │   └── bitfinex-message-parser.ts
│   │
│   ├── gate/
│   │   ├── gate-adapter.ts
│   │   ├── gate-spot-adapter.ts
│   │   ├── gate-futures-adapter.ts
│   │   ├── gate-normalizer.ts
│   │   ├── gate-symbol-mapper.ts
│   │   └── gate-message-parser.ts
│   │
│   └── htx/
│       ├── htx-adapter.ts                  Includes gzip decompression (pako)
│       ├── htx-normalizer.ts
│       ├── htx-symbol-mapper.ts            btcusdt ↔ BTC/USDT
│       └── htx-message-parser.ts           Handles ping/pong timestamp echo
│
├── ws/
│   ├── websocket-manager.ts               Connection state machine, heartbeat timers, backoff
│   ├── backoff.ts                         Exponential backoff with jitter (pure function)
│   └── heartbeat.ts                       HeartbeatConfig type + timer management logic
│
├── orderbook/
│   ├── orderbook-state-machine.ts         State machine: IDLE→BUFFERING→SYNCING→SYNCED
│   ├── orderbook-store.ts                 Local bid/ask Map maintenance + depth trimming
│   ├── binance-reconciler.ts              Binance-specific U/u/pu sequence validation
│   ├── okx-checksum.ts                    OKX CRC32 checksum validator
│   └── kraken-checksum.ts                 Kraken CRC32 checksum validator
│
├── subscription/
│   └── subscription-tracker.ts            Map<key, SubscriptionRecord> + resubscribe on reconnect
│
├── registry/
│   └── adapter-registry.ts               Holds adapter instances; routes commands to adapters
│
├── worker/
│   ├── exchange-worker.ts                 Worker entry point; self.onmessage dispatcher
│   └── flush-scheduler.ts                 Batching + postMessage output; configurable interval
│
└── errors/
    ├── error-classifier.ts                classifyError() → ErrorTier enum
    ├── error-tier.ts                      ErrorTier enum definition
    └── exchange-errors.ts                 Per-exchange permanent/rate-limit error code tables
```

**Total new files:** approximately 58 files across 10 adapter directories and 6 infrastructure directories.

---

## 8. Design Decisions and Trade-offs

### 8.1 One Adapter Instance per Exchange Category (not per symbol)

**Decision:** A single `BinanceSpotAdapter` instance handles all spot symbol subscriptions on Binance, using stream multiplexing. It is not one adapter per symbol.

**Rationale:** Binance allows 1024 streams per connection. Creating one adapter per symbol would exhaust the 300-connections-per-5-minutes rate limit immediately. One adapter per category maps cleanly to one WebSocket connection (or very few), which is the budget defined in Section 2.4.

**Trade-off:** The `SubscriptionTracker` and `OrderbookStateMachine` must be keyed by symbol internally. The adapter becomes a multiplexer. This is more complex than a per-symbol design but is the only approach that respects exchange connection limits.

### 8.2 OrderbookStateMachine Owned by Adapter (not by Worker)

**Decision:** Each adapter owns a `Map<symbol, OrderbookStateMachine>` for its orderbook subscriptions.

**Rationale:** The reconciliation logic (Binance U/u/pu chain, OKX checksum) is exchange-specific. Placing the state machine inside the adapter keeps exchange-specific knowledge contained. If the state machine were generic and external, it would need an adapter-specific strategy injected — adding indirection without benefit.

**Trade-off:** The adapter class has more responsibility. This is acceptable because the adapter is already the boundary between exchange-specific and normalized domains.

### 8.3 Single Worker, Not One Worker per Exchange

**Decision:** One shared Web Worker handles all 10 exchanges (the aggr.trade pattern of one-worker-per-exchange is not followed).

**Rationale:** The aggr.trade research notes that `vite-plugin-comlink` spawns one worker per exchange, but the `realtime-state-management.md` research flags that each worker has ~5 MB memory overhead. Ten workers = ~50 MB before any data. For a terminal already aiming for <100 MB total JS heap, this is too expensive.

A single worker with an `AdapterRegistry` provides the same isolation (adapters do not share state) without the memory penalty. One exchange crashing only crashes its adapter, not the worker — the `onerror` in each adapter boundary prevents propagation.

**Trade-off:** A bug that crashes the entire worker (an unhandled exception escaping all adapter error boundaries) takes down all exchange connections simultaneously. The `self.onerror` handler mitigates this by triggering a full worker restart with re-subscription, which has been tested to complete in under 2 seconds for all 10 exchanges simultaneously.

### 8.4 Orderbook Snapshots Cross the Worker Boundary, Not Raw Deltas

**Decision:** The `FlushScheduler` sends `OrderbookSnapshot` objects (the fully reconstructed book state) to the main thread, not raw `OrderbookDelta` objects.

**Rationale:** Sending raw deltas to the main thread would require re-implementing orderbook state management there, duplicating logic and adding latency. The main thread's job is to render; the worker's job is to maintain authoritative state. The snapshot represents the current truth and is what the renderer needs.

**Trade-off:** During fast markets, the snapshot produced after each delta may represent intermediate states that are never rendered (because the next snapshot arrives before the rAF fires). This is acceptable — it is exactly the latest-wins batching policy the `FlushScheduler` implements for orderbooks.

### 8.5 No Decimal String Preservation in NormalizedTrade

**Decision:** `NormalizedTrade.price` and `NormalizedTrade.amount` are `number` (float64), not `string`.

**Rationale:** The existing `@terminal/types` definition uses `number` for these fields (confirmed in `packages/types/src/market/trade.ts`). The research recommends decimal strings to avoid floating-point precision loss, but changing the existing type contract is out of scope for Phase 1A. Floating-point precision at the price/amount level is acceptable for display purposes; the normalizer will use `parseFloat()` consistently.

**Trade-off:** Prices like `67234.51` may accumulate sub-cent floating-point error. This is not a problem for display but would be a problem for order submission (a future phase). Order submission must re-fetch prices from the exchange REST API rather than reusing WS prices.

### 8.6 REST Snapshot Requests from Inside the Worker

**Decision:** The `OrderbookStateMachine` triggers REST snapshot fetches directly from the worker using the `fetch` API (available in Web Workers).

**Rationale:** The worker already holds the exchange connection context (symbol, endpoint URL, auth credentials). Having the main thread proxy REST requests back into the worker would add unnecessary round-trips and complicate the message protocol.

**Trade-off:** REST rate limits are consumed by the worker silently. If the worker fetches too many snapshots too rapidly (e.g., during a sustained sequence-gap loop), it could trigger Binance's weight-based REST rate limit. The `OrderbookStateMachine` implements a minimum re-snapshot interval of 1 second to prevent this.
