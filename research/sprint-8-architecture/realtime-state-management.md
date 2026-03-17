# Real-Time State Management for Trading Applications

## Research Report: High-Frequency Data Synchronization Across Multi-Panel Trading Terminals

**Date:** 2026-03-17
**Scope:** State management patterns, Web Worker communication, cross-panel synchronization, and memory management for a web-based trading terminal with 10+ panels, 10+ exchanges, targeting 60fps rendering.

---

## Table of Contents

1. [Developer/Library Network Map](#1-developerlibrary-network-map)
2. [State Management Approach Comparison](#2-state-management-approach-comparison)
3. [Web Worker Communication Patterns Catalog](#3-web-worker-communication-patterns-catalog)
4. [Cross-Panel Synchronization Architecture](#4-cross-panel-synchronization-architecture)
5. [Memory Management Strategies for Streaming Data](#5-memory-management-strategies-for-streaming-data)
6. [Recommended State Architecture](#6-recommended-state-architecture)

---

## 1. Developer/Library Network Map

### Core Developer Network

```
                          Daishi Kato (dai-shi)
                     ┌──────────┼──────────┐
                     v          v          v
                  Zustand    Jotai     Valtio
                  (56k*)    (21k*)    (10k*)
                     │          │         │
                     └────┬─────┘         │
                          v               v
                     Poimandres ────► valtio-yjs (CRDT bridge)
                     (pmndrs)              │
                          │                v
                          v           Yjs (Kevin Jahns)
                    react-three-fiber      │
                                           v
                                     CRDT ecosystem

         Surma (Google Chrome Labs)
         ┌──────────┼──────────┐
         v          v          v
      Comlink   PROXX    use-workerized-reducer
      (12.6k*)            (ImmerJS patches)
         │
         v
    Actor Model Architecture
    (Off-main-thread state)

         Tucsky
         ┌──────────┐
         v          v
       aggr       aggr-server
    (Vue+Vuex+    (InfluxDB+
     WebWorker)    Collectors)

         TradingView
         ┌──────────┐
         v          v
    lightweight-   charting_library
    charts (v5)    (proprietary)
    (19k*)
```

### Key Repositories Analyzed

| Repository | Stars | Architecture | Key Innovation |
|---|---|---|---|
| [Tucsky/aggr](https://github.com/Tucsky/aggr) | ~3k | Vue + Vuex + Web Workers | Worker-side aggregation of 27 exchange feeds, periodic flush to UI |
| [tradingview/lightweight-charts](https://github.com/tradingview/lightweight-charts) | ~19k | Canvas-based, v5 multi-pane | Data conflation, plugin system, 35kB bundle, 60fps with thousands of points |
| [GoogleChromeLabs/comlink](https://github.com/GoogleChromeLabs/comlink) | ~12.6k | RPC over postMessage | Transparent proxy layer eliminating postMessage boilerplate |
| [pmndrs/zustand](https://github.com/pmndrs/zustand) | ~56k | External store, selectors | Module state accessible outside React, middleware ecosystem |
| [pmndrs/jotai](https://github.com/pmndrs/jotai) | ~21k | Atomic model, bottom-up | Granular re-render control, atom families for dynamic subscriptions |
| [pmndrs/valtio](https://github.com/pmndrs/valtio) | ~10k | Proxy-based mutation | Auto-tracking, micro-subscriptions, works with Yjs via valtio-yjs |
| [padenot/ringbuf.js](https://github.com/padenot/ringbuf.js) | ~400 | SharedArrayBuffer ring buffer | Wait-free, lock-free SPSC ring buffer, 325% faster than buffer copying |
| [surma/use-workerized-reducer](https://github.com/surma/use-workerized-reducer) | ~400 | Worker-side useReducer | Only patches (via ImmerJS) are postMessage'd to main thread |
| [nautechsystems/nautilus_trader](https://github.com/nautechsystems/nautilus_trader) | ~3k | Rust-native, event-driven | Production-grade, deterministic event sourcing, Redis-backed state |
| [yjs/yjs](https://github.com/yjs/yjs) | ~18k | CRDT shared types | Conflict-free sync across tabs/workers/servers |

### Developer Connection Hops

**Hop 1: Daishi Kato** -> Created zustand, jotai, valtio -> Poimandres collective
**Hop 2: Poimandres** -> react-three-fiber (3D rendering) -> Performance optimization patterns applicable to streaming data
**Hop 3: Surma** -> Comlink, PROXX -> Actor model architecture -> Off-main-thread state management patterns
**Hop 4: Kevin Jahns (Yjs)** -> CRDT ecosystem -> valtio-yjs bridge -> SyncedStore (CRDT + React integration)
**Hop 5: Tucsky** -> aggr ecosystem -> aggr-lib community scripts -> Exchange WebSocket handling patterns

---

## 2. State Management Approach Comparison

### Comparison Matrix

| Feature | Zustand | Jotai | Valtio | MobX | RxJS | Redux (worker) | Custom (aggr-style) |
|---|---|---|---|---|---|---|---|
| **Update Model** | Immutable | Immutable | Mutable (proxy) | Mutable (observable) | Stream-based | Immutable | Imperative |
| **Re-render Granularity** | Manual (selectors) | Automatic (atom deps) | Automatic (proxy tracking) | Automatic (observer) | Manual (subscribe) | Manual (connect/selectors) | Manual (event bus) |
| **Outside-React Updates** | Native | Possible | Native | Native | Native | Native (worker) | Native |
| **High-Freq Suitability** | Good (with batching) | Excellent | Excellent | Very Good | Excellent | Good | Excellent |
| **Bundle Size** | ~1kB | ~2kB | ~3kB | ~16kB | ~30kB | ~7kB + Comlink | 0 (custom) |
| **Web Worker Friendly** | Yes (external store) | Partial (React-bound) | Yes (proxy outside React) | Partial | Yes (framework-agnostic) | Yes (designed for it) | Yes (designed for it) |
| **Derived State** | Middleware | Derived atoms | Computed (proxy get) | Computed (lazy) | combineLatest/map | Selectors | Manual |
| **DevTools** | Redux DevTools | Custom | Redux DevTools | MobX DevTools | None standard | Redux DevTools | None |
| **Learning Curve** | Low | Low | Low | Medium | High | Medium | High |
| **Best For** | Global app state, settings | Per-panel state, fine-grained UI | Data-centric apps, real-time sync | Complex dashboards | Complex async flows | CPU-intensive state logic | Raw performance |

### Detailed Analysis by Pattern

#### Zustand: The Global Store
**Strengths for trading:**
- External store can receive WebSocket updates without React lifecycle
- Middleware system supports logging, persistence, devtools
- `subscribeWithSelector` enables fine-grained subscriptions
- Can initialize WebSocket directly inside store creator

**Weaknesses:**
- Selectors must be manually written for render optimization
- Single store can become a bottleneck if not sliced properly

**Pattern:**
```
WebSocket -> Zustand Store (outside React) -> Selectors -> Components
```

#### Jotai: The Atomic Approach
**Strengths for trading:**
- Each data point (price, volume, order book level) can be an independent atom
- Components subscribe only to atoms they read -- zero wasted re-renders
- Atom families enable dynamic subscriptions (e.g., `priceAtom('BTC/USDT')`)
- Derived atoms for computed values (moving averages, RSI) update lazily

**Weaknesses:**
- Tightly coupled to React component tree
- Harder to update from outside React (Web Workers)

**Pattern:**
```
WebSocket -> Buffer (ref) -> rAF flush -> atom.set() -> Components
```

#### Valtio: The Proxy Approach
**Strengths for trading:**
- Mutate objects naturally (no immutable update ceremony)
- Automatic micro-subscriptions via proxy tracking
- `subscribe()` works outside React for worker integration
- valtio-yjs enables CRDT sync across tabs
- Batches multiple mutations in the same tick automatically

**Weaknesses:**
- Proxy overhead for very high-frequency mutations
- Snapshot creation has cost

**Pattern:**
```
WebSocket -> proxy(state).prices.BTC = newPrice -> useSnapshot() -> Components
```

#### RxJS: The Stream Approach
**Strengths for trading:**
- Natural fit for WebSocket streams
- Rich operator library: `bufferTime`, `throttleTime`, `distinctUntilChanged`, `combineLatest`
- BehaviorSubject as state container with last-value semantics
- Framework-agnostic, works in workers natively
- `shareReplay` for multicasting to multiple subscribers

**Weaknesses:**
- Large bundle size (~30kB)
- Steep learning curve
- Memory leak risk from unmanaged subscriptions
- Not optimized for React rendering

**Pattern:**
```
WebSocket -> Observable -> operators (buffer, throttle, map) -> BehaviorSubject -> React subscription
```

#### Custom Worker-Based (aggr pattern)
**Strengths for trading:**
- Maximum control over data pipeline
- Zero framework overhead in worker
- Aggregation/computation happens off-main-thread
- Only processed results cross the worker boundary

**Weaknesses:**
- Significant development effort
- No ecosystem/tooling
- Must build serialization, error handling, reconnection from scratch

**Pattern:**
```
Exchange WS -> Worker (aggregate, compute stats) -> periodic postMessage -> Main thread (Vuex/store) -> Components
```

### Recommendation Matrix

| Scenario | Recommended | Reason |
|---|---|---|
| Per-panel price/indicator state | Jotai atoms | Granular re-renders, atom families for dynamic symbols |
| Global app settings, layout, theme | Zustand | External store, middleware, persistence |
| Real-time data pipeline (worker -> UI) | Zustand + rAF batching | External store updated from worker, selectors for panels |
| Complex derived indicators | RxJS in worker | Rich operator library for stream processing |
| Cross-tab synchronization | Valtio + valtio-yjs | CRDT-based conflict-free sync |

---

## 3. Web Worker Communication Patterns Catalog

### Pattern 1: Structured Clone (Default postMessage)

```
Main Thread                    Worker
    │                            │
    │──── postMessage(obj) ────►│  (deep copy)
    │                            │
    │◄── postMessage(result) ───│  (deep copy)
```

**Performance:** ~100ms for 100KiB on slow devices. Up to 300ms for 32MB.
**Use when:** Small, infrequent messages (< 100KiB). Configuration changes, user actions.
**Avoid when:** High-frequency tick data, large order books.

### Pattern 2: Transferable Objects (Zero-Copy)

```
Main Thread                    Worker
    │                            │
    │── postMessage(buf, [buf])►│  (ownership transfer, zero-copy)
    │   buf is now neutered      │
    │                            │
    │◄─ postMessage(buf, [buf])─│  (ownership transfer back)
    │                            │  buf neutered in worker
```

**Performance:** 6.6ms for 32MB (45x faster than structured clone).
**Use when:** Large datasets (historical OHLCV, order book snapshots), batch updates.
**Caveats:**
- Source loses access after transfer
- Chrome shows exponential time increase with many transferable objects
- Data must be in ArrayBuffer/TypedArray format (no JSON objects)
- Must define marshalling format manually (e.g., Float64Array for prices)

**Best practice for trading data:**
```
// Pack OHLCV into Float64Array: [time, open, high, low, close, volume] x N
const buffer = new Float64Array(candles.length * 6);
// ... pack data ...
worker.postMessage(buffer.buffer, [buffer.buffer]);
```

### Pattern 3: SharedArrayBuffer + Atomics (Shared Memory)

```
Main Thread                    Worker
    │                            │
    │   SharedArrayBuffer        │
    │   ┌────────────────┐       │
    │   │ Read ◄────────────── Write (Atomics.store)
    │   │                │       │
    │   │ Atomics.load ──────► Read
    │   └────────────────┘       │
```

**Performance:** Near-instant (shared memory, no copy, no transfer).
**Use when:** Ultra-high-frequency data that must be shared continuously (real-time price feeds, counters).
**Requirements:**
- Cross-Origin-Isolation headers (`COOP: same-origin`, `COEP: require-corp`)
- Must use `Atomics.store/load` (NOT direct assignment) for thread safety
- Data must be numeric (TypedArray views)

**Architecture for trading:**
```
// Shared price buffer: [exchange_id, symbol_hash, bid, ask, last, volume] x N
const priceBuffer = new SharedArrayBuffer(MAX_INSTRUMENTS * 6 * Float64Array.BYTES_PER_ELEMENT);
const prices = new Float64Array(priceBuffer);

// Worker writes:
Atomics.store(prices, instrumentIndex * 6 + 2, newBid);  // bid
Atomics.store(prices, instrumentIndex * 6 + 3, newAsk);  // ask

// Main thread reads (in rAF loop):
const bid = Atomics.load(prices, instrumentIndex * 6 + 2);
```

### Pattern 4: Comlink RPC (Transparent Proxy)

```
Main Thread                    Worker
    │                            │
    │   const api =              │   Comlink.expose({
    │     Comlink.wrap(worker)   │     getPrice(sym) { ... },
    │                            │     subscribe(sym) { ... }
    │   await api.getPrice('BTC')│   })
    │──── (RPC over postMessage) ──►│
    │◄──── (promise resolution) ───│
```

**Performance:** Minimal overhead over raw postMessage (proxy + promise wrapping).
**Use when:** Complex worker APIs with many methods. Ergonomic developer experience is important.
**Caveats:**
- Every call is async (returns Promise)
- Structured clone still applies to arguments/return values
- Can use `Comlink.transfer()` for transferable objects
- 1.1kB bundle size

### Pattern 5: Surma's Workerized Reducer (Patch-Based)

```
Main Thread                    Worker
    │                            │
    │   useWorkerizedReducer()   │   reducer(state, action) {
    │                            │     state.price = 42; // Immer mutation
    │── dispatch(action) ──────►│   }
    │                            │
    │◄── patches [{op, path}] ──│   (only diffs sent, not full state)
    │   apply patches to         │
    │   main thread copy         │
```

**Performance:** Excellent for large state objects -- only changed paths are transferred.
**Use when:** Complex state with localized updates (order book with individual level changes).
**How it works:** ImmerJS detects mutations and generates JSON patches. Only patches cross the worker boundary.

### Pattern 6: OffscreenCanvas (Worker-Side Rendering)

```
Main Thread                    Worker
    │                            │
    │   canvas.transferControl   │
    │   ToOffscreen() ─────────►│   offscreen.getContext('2d')
    │                            │
    │   (no further messages     │   // Worker renders directly
    │    needed for rendering)   │   // to the canvas
    │                            │   requestAnimationFrame(draw)
```

**Performance:** Rendering completely off main thread. GPU can be bottleneck.
**Use when:** Chart rendering that would block main thread. Multiple chart panels.
**Caveats:**
- Limited Safari support (improving)
- No DOM access in worker
- GPU is shared -- multiple OffscreenCanvas workers compete for GPU resources
- Canvas ownership is permanently transferred

### Communication Pattern Decision Tree

```
                    ┌─────────────────┐
                    │ What kind of    │
                    │ data transfer?  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              v              v              v
        Small/infrequent  Large batches  Continuous
        (< 100KiB)       (> 1MB)        high-freq
              │              │              │
              v              v              v
        Structured      Transferable   SharedArrayBuffer
        Clone           Objects        + Atomics
        (or Comlink)    (ArrayBuffer)  (if COOP/COEP ok)
                                            │
                                       Otherwise:
                                       Transferable +
                                       rAF batching
```

---

## 4. Cross-Panel Synchronization Architecture

### What Needs to Sync Across Panels

| Sync Target | Frequency | Latency Tolerance | Pattern |
|---|---|---|---|
| Crosshair position | 60fps (mouse move) | < 16ms | Direct DOM / ref mutation |
| Time axis scroll | 60fps (scroll) | < 16ms | Shared time scale reference |
| Symbol change | User action | < 100ms | Event bus / pub-sub |
| Price data | 1-100/sec per symbol | < 50ms | Shared data store |
| Drawing tools | User action | < 100ms | Shared state + event bus |
| Layout changes | User action | < 200ms | Global store |
| Indicator parameters | User action | < 200ms | Global store |

### Architecture Pattern: Hub-and-Spoke Synchronization

```
                    ┌──────────────┐
                    │  Sync Hub    │
                    │  (EventBus)  │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
     │ Panel 1 │     │ Panel 2 │     │ Panel 3 │
     │ (Chart) │     │ (Order  │     │ (Depth  │
     │         │     │  Book)  │     │  Chart) │
     └─────────┘     └─────────┘     └─────────┘
```

**How TradingView lightweight-charts does it:**
- `setCrosshairPosition(price, time, series)` programmatically sets crosshair on a chart
- Subscribe to `crosshairMove` event on chart A, call `setCrosshairPosition` on chart B
- Known issue: scroll sync can cause crosshair drift (issue #1608)
- v5 multi-pane support uses shared time scale within a single chart instance

**How aggr does it:**
- Vuex store holds global list of connected pairs across all panes
- Each pane subscribes to relevant pairs from the global list
- When a pane is added, it inherits currently connected pairs
- Worker sends aggregated data; Vuex distributes to relevant panes

### Crosshair Sync Implementation Pattern

```
// Sync Manager (singleton)
class CrosshairSyncManager {
  private panels: Map<string, ChartPanel> = new Map();
  private isUpdating = false;  // prevent infinite loops

  register(panelId, chart) {
    this.panels.set(panelId, chart);
    chart.subscribeCrosshairMove((param) => {
      if (this.isUpdating) return;
      this.isUpdating = true;
      this.panels.forEach((otherChart, id) => {
        if (id !== panelId) {
          otherChart.setCrosshairPosition(param.time, param.price);
        }
      });
      this.isUpdating = false;
    });
  }
}
```

### Time Axis Synchronization

For multiple charts that must share the same time axis:

1. **Shared TimeScale Reference:** All panels reference a single logical time scale. Scroll/zoom on any panel propagates to all others.
2. **Leader-Follower:** One panel is the "leader" whose time scale is authoritative. Others follow.
3. **Event-Based:** Each panel emits time range change events. A coordinator batches and applies to all panels in a single rAF frame.

**Critical: Avoid feedback loops.** When Panel A changes -> notifies Panel B -> Panel B changes -> notifies Panel A. Use a guard flag or sequence number.

### Symbol Linking Groups

Trading terminals typically support "link groups" where panels are color-coded and changing a symbol in one panel of a group changes all panels in that group.

```
// Link Group Architecture
interface LinkGroup {
  id: string;
  color: string;           // visual indicator
  symbol: string;          // currently active symbol
  panelIds: Set<string>;   // member panels
}

// Store slice
{
  linkGroups: {
    'red':    { symbol: 'BTC/USDT', panels: ['chart-1', 'orderbook-1', 'trades-1'] },
    'blue':   { symbol: 'ETH/USDT', panels: ['chart-2', 'depth-2'] },
    'unlinked': { panels: ['watchlist'] }  // independent panels
  }
}
```

### Panel Communication Bus

For a 10+ panel system, direct panel-to-panel communication creates O(n^2) connections. Use a centralized event bus instead:

```
// Event Bus with topic-based routing
class PanelEventBus {
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  // Topics: 'crosshair:move', 'symbol:change', 'timerange:change', 'drawing:add'
  subscribe(topic: string, handler: (data: any) => void) { ... }

  // Debounce high-frequency events per topic
  publish(topic: string, data: any, sourcePanel: string) {
    // Skip notifying the source panel (prevent loops)
    this.subscribers.get(topic)?.forEach(handler => {
      if (handler.panelId !== sourcePanel) handler(data);
    });
  }
}
```

---

## 5. Memory Management Strategies for Streaming Data

### The Core Problem

A trading terminal receiving data from 10 exchanges, each with 50+ symbols, at rates of 10-100 messages/second per symbol, will accumulate data rapidly:

- 10 exchanges x 50 symbols x 50 msgs/sec = **25,000 messages/second**
- Each OHLCV candle ~100 bytes, each trade ~64 bytes
- Unbounded accumulation: **~1.6MB/sec raw trade data, ~86MB/min, ~5.2GB/hour**

### Strategy 1: Ring Buffer (Circular Buffer)

**Best for:** Trade history, tick data, time-series with fixed window.

```
class RingBuffer<T> {
  private buffer: T[];
  private head = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }
  // Oldest data is automatically overwritten
}
```

**Implementation options:**
- [ringbuf.js](https://github.com/padenot/ringbuf.js/) -- SharedArrayBuffer-based, wait-free SPSC, 325% faster than buffer copying
- [CBuffer](https://github.com/trevnorris/cbuffer) -- Implements full Array.prototype as circular buffer

**Sizing guidance:**
- Trade history panel: 1000-5000 entries per symbol (configurable)
- Chart candle data: 500-2000 candles per timeframe per symbol
- Order book snapshots: Keep only latest (no history needed)

### Strategy 2: Time-Based Eviction

**Best for:** Candle/OHLCV data where historical depth varies by timeframe.

```
// Eviction policy per timeframe
const RETENTION = {
  '1s':  5 * 60,      // 5 minutes of 1s candles = 300 entries
  '1m':  24 * 60,     // 24 hours of 1m candles = 1,440 entries
  '5m':  7 * 24 * 12, // 7 days of 5m candles = 2,016 entries
  '1h':  90 * 24,     // 90 days of 1h candles = 2,160 entries
  '1d':  365 * 5,     // 5 years of daily candles = 1,825 entries
};

function evict(candles, timeframe) {
  const maxEntries = RETENTION[timeframe];
  if (candles.length > maxEntries * 1.1) {  // 10% hysteresis
    candles.splice(0, candles.length - maxEntries);
  }
}
```

### Strategy 3: Level-of-Detail (LOD) Aggregation

**Best for:** Charts that need both recent detail and historical context.

```
// As data ages, aggregate to lower resolution
Recent (< 1 hour):    Store every tick
Medium (1h - 24h):    Aggregate to 1-second OHLCV
Old (1d - 7d):        Aggregate to 1-minute OHLCV
Archive (> 7d):       Aggregate to 5-minute OHLCV (or fetch on demand)
```

TradingView lightweight-charts v5.1 implements a version of this called **data conflation**: when bar spacing falls below 0.5px, multiple data points are intelligently combined into single rendered points.

### Strategy 4: Typed Arrays for Dense Data

**Best for:** Numeric financial data (prices, volumes).

Regular JS objects have significant per-object overhead (~64-128 bytes metadata per object). Typed arrays are far more memory-efficient for numeric data:

```
// 1000 OHLCV candles as objects: ~640KB (64 bytes overhead x 1000 + data)
// 1000 OHLCV candles as Float64Array: ~48KB (6 fields x 8 bytes x 1000)
// Memory savings: ~92%

// Layout: [time, open, high, low, close, volume] x N
const ohlcv = new Float64Array(1000 * 6);

// Access candle at index i:
const time   = ohlcv[i * 6 + 0];
const open   = ohlcv[i * 6 + 1];
const high   = ohlcv[i * 6 + 2];
const low    = ohlcv[i * 6 + 3];
const close  = ohlcv[i * 6 + 4];
const volume = ohlcv[i * 6 + 5];
```

### Strategy 5: Subscription-Based Lazy Loading

**Best for:** Panels that aren't always visible or active.

```
// Only maintain data for visible/active panels
class DataSubscriptionManager {
  subscribe(symbol: string, panelId: string) {
    // Track reference count per symbol
    this.refCount[symbol] = (this.refCount[symbol] || 0) + 1;
    if (this.refCount[symbol] === 1) {
      // First subscriber -- start WebSocket feed
      this.worker.postMessage({ type: 'subscribe', symbol });
    }
  }

  unsubscribe(symbol: string, panelId: string) {
    this.refCount[symbol]--;
    if (this.refCount[symbol] === 0) {
      // Last subscriber gone -- stop feed, free memory
      this.worker.postMessage({ type: 'unsubscribe', symbol });
      delete this.dataStore[symbol];
    }
  }
}
```

### Strategy 6: WeakRef + FinalizationRegistry

**Best for:** Caching computed results (indicators, aggregations) that can be recomputed.

```
// Cache indicator results; allow GC to reclaim if memory pressure
const indicatorCache = new Map<string, WeakRef<Float64Array>>();
const registry = new FinalizationRegistry((key) => {
  indicatorCache.delete(key);
});

function getCachedIndicator(key: string, compute: () => Float64Array): Float64Array {
  const ref = indicatorCache.get(key);
  const cached = ref?.deref();
  if (cached) return cached;

  const result = compute();
  indicatorCache.set(key, new WeakRef(result));
  registry.register(result, key);
  return result;
}
```

### Memory Budget Guidelines

For a 10-panel, 10-exchange trading terminal:

| Data Type | Per Symbol | x50 Symbols | Strategy |
|---|---|---|---|
| Latest price/quote | ~100 bytes | ~5KB | SharedArrayBuffer or store |
| Order book (25 levels) | ~2KB | ~100KB | Latest only, no history |
| Recent trades | ~64KB (1000 trades) | ~3.2MB | Ring buffer, 1000 entries |
| 1m candles (24h) | ~69KB (1440 candles) | ~3.5MB | Time-based eviction |
| 5m candles (7d) | ~97KB (2016 candles) | ~4.8MB | Time-based eviction |
| Indicator cache | ~50KB/indicator | Variable | WeakRef cache |
| **Total estimated** | | **~12-15MB** | |

Target: Keep total JS heap under **100MB** including framework overhead, DOM, and rendering buffers.

---

## 6. Recommended State Architecture

### Overview: Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │Chart │ │Order │ │Trades│ │Depth │ │Watch │ │Panel │... │
│  │Panel │ │Book  │ │Panel │ │Chart │ │List  │ │  N   │    │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘    │
│     │        │        │        │        │        │          │
│  Jotai atoms (per-panel, granular subscriptions)            │
│  useSnapshot() for proxy-tracked rendering                  │
├─────────────────────────────────────────────────────────────┤
│                    COORDINATION LAYER                        │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Zustand Store   │  │  Event Bus   │  │  Sync Manager │  │
│  │  (Global State)  │  │  (Panel Sync)│  │  (Crosshair,  │  │
│  │  - Layout        │  │  - Symbol    │  │   TimeScale)  │  │
│  │  - Settings      │  │    changes   │  │               │  │
│  │  - Link Groups   │  │  - Drawings  │  │               │  │
│  │  - Active Symbol │  │              │  │               │  │
│  └─────────────────┘  └──────────────┘  └───────────────┘  │
│                                                              │
│  rAF Scheduler (batches worker->UI updates to animation     │
│  frames, max 1 setState per frame per data stream)          │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER (Web Worker)                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Data Worker                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ WS Manager   │  │ Aggregator   │  │ Indicator  │ │   │
│  │  │ (10 exchange  │  │ (OHLCV build,│  │ Engine     │ │   │
│  │  │  connections) │  │  trade agg,  │  │ (SMA, RSI, │ │   │
│  │  │              │  │  stats)      │  │  MACD etc) │ │   │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │   │
│  │         │                 │                 │        │   │
│  │  ┌──────▼─────────────────▼─────────────────▼──────┐ │   │
│  │  │           Ring Buffers + Typed Arrays            │ │   │
│  │  │    (per-symbol trade history, candle data)       │ │   │
│  │  └─────────────────────┬───────────────────────────┘ │   │
│  │                        │                              │   │
│  │            Periodic flush via postMessage             │   │
│  │            (Transferable ArrayBuffers for             │   │
│  │             large payloads, structured clone          │   │
│  │             for small updates)                        │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│              ┌────────────▼────────────┐                    │
│              │  Optional: SharedArray  │                    │
│              │  Buffer for latest      │                    │
│              │  prices (if COOP/COEP)  │                    │
│              └─────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Layer Details

#### Data Layer (Web Worker)

**Purpose:** All WebSocket connections, data parsing, aggregation, and indicator computation happens off-main-thread.

**Key design decisions:**
1. **Single worker** with internal multiplexing (not one worker per exchange). Reason: Workers have ~5MB memory overhead each; 10 workers = 50MB before any data.
2. **WebSocket connections live in the worker.** Browser WebSocket API is available in workers. This keeps all network I/O off the main thread.
3. **Aggregation in the worker** (aggr pattern). Raw trades are grouped by time bucket and side. Only aggregated OHLCV bars and summary statistics are sent to the main thread.
4. **Ring buffers for trade history** in the worker. Only the latest N trades are kept. When the main thread needs history, it requests a snapshot.
5. **Periodic flush** (every 50-100ms or on rAF callback via MessagePort). Batch all updates since last flush into a single message.

**Communication protocol:**
```typescript
// Worker -> Main thread message types
type WorkerMessage =
  | { type: 'trades'; symbol: string; data: ArrayBuffer }      // transferable
  | { type: 'candle'; symbol: string; tf: string; ohlcv: number[] }  // small, clone
  | { type: 'stats'; data: Record<string, ExchangeStats> }     // periodic stats
  | { type: 'orderbook'; symbol: string; bids: ArrayBuffer; asks: ArrayBuffer }
  | { type: 'indicator'; id: string; values: ArrayBuffer }     // transferable

// Main thread -> Worker message types
type MainMessage =
  | { type: 'subscribe'; symbol: string; exchanges: string[] }
  | { type: 'unsubscribe'; symbol: string }
  | { type: 'set-timeframe'; symbol: string; tf: string }
  | { type: 'add-indicator'; id: string; type: string; params: any }
```

#### Coordination Layer (Main Thread)

**Zustand store** for global application state:
```typescript
// Zustand store structure
interface AppStore {
  // Layout
  panels: Record<string, PanelConfig>;
  layout: LayoutTree;  // grid/split layout

  // Symbol linking
  linkGroups: Record<string, LinkGroup>;

  // Global settings
  theme: 'dark' | 'light';
  timezone: string;

  // Connection status
  exchangeStatus: Record<string, 'connected' | 'disconnected' | 'error'>;

  // Actions
  changeSymbol: (groupId: string, symbol: string) => void;
  addPanel: (type: PanelType) => void;
  removePanel: (panelId: string) => void;
}
```

**Event Bus** for cross-panel coordination:
- Crosshair sync: Direct ref mutations (no React state, no re-renders)
- Time scale sync: Shared reference with guard flag
- Symbol changes: Through Zustand link groups

**rAF Scheduler** (critical for 60fps):
```typescript
class RAFScheduler {
  private pendingUpdates: Map<string, any> = new Map();
  private rafId: number | null = null;

  // Called when worker sends data (potentially 100s of times/sec)
  enqueue(key: string, data: any) {
    this.pendingUpdates.set(key, data);  // Latest wins (overwrites previous)
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private flush() {
    this.rafId = null;
    // One batch setState for all accumulated updates
    const updates = new Map(this.pendingUpdates);
    this.pendingUpdates.clear();
    // Apply to Jotai atoms or Zustand store
    updates.forEach((data, key) => updateAtom(key, data));
  }
}
```

#### Presentation Layer (React Components)

**Jotai atoms** for per-panel reactive state:
```typescript
// Atom family for per-symbol data
const priceAtomFamily = atomFamily((symbol: string) =>
  atom({ bid: 0, ask: 0, last: 0, volume: 0 })
);

const candleAtomFamily = atomFamily(
  ({ symbol, timeframe }: { symbol: string; timeframe: string }) =>
    atom<OHLCV[]>([])
);

// Derived atoms for indicators
const smaAtom = atom((get) => {
  const candles = get(candleAtomFamily({ symbol: 'BTC/USDT', timeframe: '1m' }));
  return calculateSMA(candles, 20);
});
```

**Rendering optimizations:**
- `React.memo` on all panel components
- Crosshair rendering via direct canvas/DOM manipulation (bypass React)
- Order book levels via virtualized list (react-window)
- Trade history via ring buffer + virtualized list

### Data Flow: End-to-End Example

```
1. Binance WS sends trade: {"s":"BTCUSDT","p":"67234.50","q":"0.5","m":false}

2. Worker receives, parses, aggregates into current 1m candle bucket
   - Updates ring buffer of recent trades
   - Updates running OHLCV for current candle
   - Recalculates indicators if needed

3. Worker flush (every ~50ms):
   - Packs latest candle update + trade summary into message
   - postMessage({ type: 'candle', symbol: 'BTC/USDT', ... })

4. Main thread receives in onmessage handler:
   - rafScheduler.enqueue('candle:BTC/USDT:1m', candleData)

5. Next animation frame (~16ms later):
   - rafScheduler.flush()
   - candleAtomFamily({ symbol: 'BTC/USDT', timeframe: '1m' }).set(newCandles)

6. Only chart panels subscribed to BTC/USDT 1m candle atom re-render
   - Other panels (ETH chart, watchlist, settings) are unaffected
```

### Performance Targets and Monitoring

| Metric | Target | How to Achieve |
|---|---|---|
| Main thread frame time | < 16ms (60fps) | Worker offloading, rAF batching |
| Worker -> UI latency | < 50ms | Periodic flush, transferable objects |
| React re-renders per frame | < 3 components | Jotai atom granularity, React.memo |
| Memory usage (JS heap) | < 100MB | Ring buffers, typed arrays, eviction |
| WebSocket message handling | 25,000+/sec | Worker-side processing, aggregation |
| Time to interactive | < 3s | Code splitting, lazy panel loading |
| Bundle size (core) | < 200KB gzipped | Tree-shaking, optional features as plugins |

### Technology Stack Summary

| Layer | Technology | Rationale |
|---|---|---|
| Global State | Zustand | External store, middleware, small bundle, works outside React |
| Panel State | Jotai atom families | Granular subscriptions, dynamic atoms per symbol/timeframe |
| Data Pipeline | Custom Web Worker | Maximum control, aggregation off main thread |
| Worker Communication | Comlink (optional) | Ergonomic API for worker methods; raw postMessage for perf-critical paths |
| Large Data Transfer | Transferable ArrayBuffer | Zero-copy for candle data, order books |
| Latest Prices | SharedArrayBuffer (optional) | Zero-latency price access, requires COOP/COEP |
| Cross-Panel Sync | Custom Event Bus + Refs | Crosshair/timescale sync without React re-renders |
| Chart Rendering | lightweight-charts v5 | 35kB, multi-pane, plugin system, data conflation |
| List Virtualization | react-window | Lightweight, handles high-frequency updates better than react-virtualized |
| Memory Management | Ring buffers + time-based eviction | Bounded memory with configurable retention |
| Streaming Operators | RxJS (in worker only) | bufferTime, throttle, distinctUntilChanged for stream processing |

### Migration Path / Incremental Adoption

**Phase 1 (Foundation):**
- Set up Zustand for global state (layout, settings, link groups)
- Create single Data Worker with WebSocket connections
- Implement rAF scheduler for worker->UI updates
- Basic postMessage communication

**Phase 2 (Optimization):**
- Add Jotai atoms for per-panel state
- Implement ring buffers for trade history
- Add Comlink for ergonomic worker API
- Implement crosshair sync via refs

**Phase 3 (Advanced):**
- Typed arrays for OHLCV data
- Transferable objects for large data transfers
- OffscreenCanvas for chart rendering (experimental)
- SharedArrayBuffer for latest prices (if COOP/COEP feasible)
- Data conflation for zoomed-out charts

**Phase 4 (Scale):**
- Worker pool for indicator computation
- CRDT sync for cross-tab state (valtio-yjs)
- Service Worker for offline data caching
- WebAssembly for compute-intensive indicators

---

## Appendix: Key Sources

### Repositories
- [Tucsky/aggr](https://github.com/Tucsky/aggr) -- Cryptocurrency trades aggregator with Web Worker architecture
- [Tucsky/aggr-server](https://github.com/Tucsky/aggr-server) -- Server-side data collection with InfluxDB
- [tradingview/lightweight-charts](https://github.com/tradingview/lightweight-charts) -- Performant financial charts with multi-pane support
- [GoogleChromeLabs/comlink](https://github.com/GoogleChromeLabs/comlink) -- Web Worker RPC library
- [surma/use-workerized-reducer](https://github.com/surma/use-workerized-reducer) -- Patch-based worker state
- [pmndrs/zustand](https://github.com/pmndrs/zustand) -- External store state management
- [pmndrs/jotai](https://github.com/pmndrs/jotai) -- Atomic state management
- [pmndrs/valtio](https://github.com/pmndrs/valtio) -- Proxy-based state management
- [padenot/ringbuf.js](https://github.com/padenot/ringbuf.js) -- SharedArrayBuffer ring buffer
- [yjs/yjs](https://github.com/yjs/yjs) -- CRDT for collaborative applications
- [nautechsystems/nautilus_trader](https://github.com/nautechsystems/nautilus_trader) -- Production trading engine with event sourcing
- [chrisprice/offscreen-canvas](https://github.com/chrisprice/offscreen-canvas) -- Chart rendering with OffscreenCanvas examples

### Articles and Documentation
- [Is postMessage slow?](https://surma.dev/things/is-postmessage-slow/) -- Surma's benchmark of postMessage performance
- [React + Redux + Comlink = Off-main-thread](https://surma.dev/things/react-redux-comlink/) -- Off-main-thread state architecture
- [When should you be using Web Workers?](https://surma.dev/things/when-workers/) -- Decision framework for worker adoption
- [Rendering charts with OffscreenCanvas](https://blog.scottlogic.com/2020/03/19/offscreen-canvas.html) -- Scott Logic performance analysis
- [OffscreenCanvas guide](https://web.dev/articles/offscreen-canvas) -- Official web.dev guide
- [Streaming Backends & React: Controlling Re-render Chaos](https://www.sitepoint.com/streaming-backends-react-controlling-re-render-chaos/) -- rAF batching pattern for streaming data
- [Transferable Objects: Lightning Fast](https://developer.chrome.com/blog/transferable-objects-lightning-fast) -- Chrome blog on zero-copy transfers
- [Performance issue with massive transferable objects](https://joji.me/en-us/blog/performance-issue-of-using-massive-transferable-objects-in-web-worker/) -- Chrome-specific transferable performance gotchas
- [SharedArrayBuffer MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) -- API reference and security requirements
- [Lightweight Charts Panes Docs](https://tradingview.github.io/lightweight-charts/docs/panes) -- Multi-pane API documentation
- [Lightweight Charts Crosshair Sync Tutorial](https://tradingview.github.io/lightweight-charts/tutorials/how_to/set-crosshair-position) -- Official crosshair sync guide
- [Zustand WebSocket Integration Discussion](https://github.com/pmndrs/zustand/discussions/1651) -- Community patterns for WS + Zustand
- [Jotai Comparison](https://jotai.org/docs/basics/comparison) -- Official comparison with other state libraries
- [CQRS & Event Sourcing for Trading](https://touch-fire.com/en/cqrs-event-sourcing.html) -- Touch-Fire Trading architecture
- [High Load Trading with Reveno CQRS](https://www.infoq.com/articles/High-load-transactions-Reveno-CQRS-Event-sourcing-framework/) -- Millions of TPS with event sourcing
- [The State of Web Workers (Smashing Magazine)](https://www.smashingmagazine.com/2021/06/web-workers-2021/) -- Comprehensive 2021 survey
