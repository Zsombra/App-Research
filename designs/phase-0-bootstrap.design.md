# Phase 0 Bootstrap — Monorepo Architecture Design

**Document type:** Architecture design
**Phase:** 0 — Repository scaffold and shared foundations
**Date:** 2026-03-17
**Status:** Authoritative

---

## Table of Contents

1. [Scope and Goals](#1-scope-and-goals)
2. [Directory Structure](#2-directory-structure)
3. [Package Dependency Graph](#3-package-dependency-graph)
4. [Module Boundaries](#4-module-boundaries)
5. [Three-Layer Architecture Mapping](#5-three-layer-architecture-mapping)
6. [Key Interfaces to Define in Phase 0](#6-key-interfaces-to-define-in-phase-0)
7. [Build Order](#7-build-order)
8. [Tooling and Workspace Configuration](#8-tooling-and-workspace-configuration)
9. [Architectural Decisions and Trade-offs](#9-architectural-decisions-and-trade-offs)

---

## 1. Scope and Goals

Phase 0 produces no user-visible features. Its sole purpose is to establish the structural skeleton that every subsequent phase builds on. When Phase 0 is complete:

- The pnpm workspace exists with all five packages scaffolded and installable
- TypeScript compiles cleanly across every package with project references wired
- The shared type contract (`@terminal/types`) is defined and importable
- Every package has its own `tsconfig.json`, `package.json`, and test runner configured
- Linting, formatting, and git hooks run uniformly across the entire repo
- A single `pnpm build` from the root compiles all packages in dependency order

Phase 0 establishes no runtime behaviour beyond a shell application that renders a placeholder Dockview container.

---

## 2. Directory Structure

The complete tree below shows every directory and every key file that will exist after Phase 0. Files marked `(generated)` are produced by build tools and never committed.

```
crypto-terminal/                          ← repo root
│
├── package.json                          ← root workspace manifest (private: true)
├── pnpm-workspace.yaml                   ← declares packages glob
├── pnpm-lock.yaml                        ← lockfile (committed)
├── turbo.json                            ← Turborepo pipeline (build, test, lint)
├── tsconfig.base.json                    ← shared TS compiler options (inherited by all)
├── .eslintrc.cjs                         ← root ESLint config (extends to all packages)
├── .prettierrc                           ← formatting rules
├── .gitignore
├── .nvmrc                                ← Node version pin
│
├── packages/
│   │
│   ├── types/                            ← @terminal/types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  ← barrel re-export
│   │   │   ├── market/
│   │   │   │   ├── trade.ts              ← NormalizedTrade, RawTrade
│   │   │   │   ├── orderbook.ts          ← OrderbookSnapshot, OrderbookDelta, PriceLevel
│   │   │   │   ├── candle.ts             ← OHLCVCandle, CandleTimeframe
│   │   │   │   ├── ticker.ts             ← Ticker, BBO (best bid/offer)
│   │   │   │   ├── liquidation.ts        ← LiquidationEvent
│   │   │   │   └── instrument.ts         ← Instrument, ExchangeSymbol
│   │   │   ├── exchange/
│   │   │   │   ├── adapter.ts            ← ExchangeAdapter interface
│   │   │   │   ├── connection.ts         ← ConnectionStatus, ConnectionConfig
│   │   │   │   └── subscription.ts       ← SubscriptionRequest, SubscriptionTopic
│   │   │   ├── worker/
│   │   │   │   ├── messages.ts           ← WorkerInboundMessage, WorkerOutboundMessage
│   │   │   │   └── protocol.ts           ← typed message union discriminants
│   │   │   ├── ui/
│   │   │   │   ├── panel.ts              ← PanelType, PanelConfig, LinkColor
│   │   │   │   ├── workspace.ts          ← WorkspaceState, WorkspaceMetadata
│   │   │   │   └── layout.ts             ← LayoutJSON (opaque Dockview JSON wrapper)
│   │   │   └── server/
│   │   │       ├── api.ts                ← REST response shapes
│   │   │       └── websocket.ts          ← ServerOutboundMessage, ClientSubscribeMessage
│   │   └── dist/ (generated)
│   │
│   ├── shared/                           ← @terminal/shared
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── exchanges.ts          ← SUPPORTED_EXCHANGES, exchange display names
│   │   │   │   ├── timeframes.ts         ← TIMEFRAME_MS map, CANDLE_RETENTION config
│   │   │   │   └── limits.ts             ← MAX_PANELS, RING_BUFFER_SIZE, memory budgets
│   │   │   ├── utils/
│   │   │   │   ├── symbol.ts             ← normalizeSymbol(), parseExchangeSymbol()
│   │   │   │   ├── time.ts               ← toUnixMs(), bucketToTimeframe(), formatTs()
│   │   │   │   ├── number.ts             ← formatPrice(), formatVolume(), roundToTick()
│   │   │   │   └── assert.ts             ← typed assertion helpers
│   │   │   ├── buffers/
│   │   │   │   ├── ring-buffer.ts        ← generic RingBuffer<T> implementation
│   │   │   │   └── ohlcv-buffer.ts       ← Float64Array-backed OHLCV ring buffer
│   │   │   └── errors/
│   │   │       └── terminal-error.ts     ← TerminalError base class with error codes
│   │   └── dist/ (generated)
│   │
│   ├── core/                             ← @terminal/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── adapters/
│   │   │   │   ├── base-adapter.ts       ← abstract BaseExchangeAdapter
│   │   │   │   ├── binance/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── connector.ts      ← BinanceAdapter implements ExchangeAdapter
│   │   │   │   │   └── normalizer.ts     ← raw Binance WS → NormalizedTrade
│   │   │   │   └── bybit/
│   │   │   │       ├── index.ts
│   │   │   │       ├── connector.ts
│   │   │   │       └── normalizer.ts
│   │   │   ├── worker/
│   │   │   │   ├── data-worker.ts        ← Worker entry point (WebSocket + aggregation)
│   │   │   │   ├── ws-manager.ts         ← WebSocket lifecycle, reconnection
│   │   │   │   ├── aggregator.ts         ← OHLCV candle building, trade aggregation
│   │   │   │   ├── orderbook-manager.ts  ← L2 snapshot + delta application
│   │   │   │   └── flush-scheduler.ts    ← periodic postMessage batching
│   │   │   └── indicators/
│   │   │       └── index.ts              ← (stub) indicator engine interface
│   │   └── dist/ (generated)
│   │
│   ├── ui/                               ← @terminal/ui
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts                ← Vite config for the app bundle
│   │   ├── index.html                    ← HTML entry point
│   │   ├── src/
│   │   │   ├── main.tsx                  ← React DOM root, store init
│   │   │   ├── App.tsx                   ← Root component, Dockview container
│   │   │   ├── store/
│   │   │   │   ├── app-store.ts          ← Zustand global store (layout, link groups)
│   │   │   │   ├── data-store.ts         ← Zustand slice for market data atoms
│   │   │   │   └── index.ts
│   │   │   ├── worker/
│   │   │   │   ├── worker-client.ts      ← Comlink-wrapped DataWorker proxy
│   │   │   │   └── raf-scheduler.ts      ← rAF batching for worker→React updates
│   │   │   ├── panels/
│   │   │   │   ├── registry.ts           ← panelType string → React component map
│   │   │   │   ├── PlaceholderPanel.tsx  ← default empty panel for Phase 0
│   │   │   │   └── index.ts
│   │   │   ├── layout/
│   │   │   │   ├── WorkspaceShell.tsx    ← outer shell: toolbar + Dockview + statusbar
│   │   │   │   ├── DockviewContainer.tsx ← Dockview mount, serialise/restore
│   │   │   │   └── default-layouts.ts    ← 3 preset layout JSON objects
│   │   │   ├── sync/
│   │   │   │   ├── event-bus.ts          ← Mitt event bus (crosshair, panel events)
│   │   │   │   └── crosshair-sync.ts     ← CrosshairSyncManager
│   │   │   ├── components/
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   └── StatusBar.tsx
│   │   │   └── styles/
│   │   │       ├── global.css
│   │   │       └── theme-dark.css
│   │   └── dist/ (generated)
│   │
│   └── server/                           ← @terminal/server
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                  ← process entry: starts Fastify + WS server
│       │   ├── app.ts                    ← Fastify instance factory
│       │   ├── config.ts                 ← env-driven config (PORT, REDIS_URL, etc.)
│       │   ├── routes/
│       │   │   ├── health.ts             ← GET /health liveness probe
│       │   │   └── index.ts              ← route registration
│       │   ├── websocket/
│       │   │   ├── ws-server.ts          ← uWebSockets.js or Fastify WS setup
│       │   │   ├── subscription-manager.ts ← client topic subscriptions
│       │   │   └── broadcaster.ts        ← fan-out to subscribed clients
│       │   ├── ingestion/
│       │   │   ├── exchange-manager.ts   ← starts/stops exchange connectors (CCXT Pro)
│       │   │   └── normalizer.ts         ← raw → NormalizedTrade (server-side path)
│       │   └── persistence/
│       │       └── redis-client.ts       ← Redis Streams read/write (stub in Phase 0)
│       └── dist/ (generated)
│
├── apps/
│   └── (empty in Phase 0 — @terminal/ui IS the app in this phase)
│
├── tooling/
│   ├── eslint-config/
│   │   └── index.cjs                     ← shared ESLint preset
│   └── tsconfig/
│       └── base.json                     ← tsconfig base (re-exported for IDE use)
│
└── scripts/
    ├── clean.sh                          ← removes all dist/ and node_modules
    └── check-deps.ts                     ← validates no cross-package circular imports
```

---

## 3. Package Dependency Graph

Dependencies flow strictly downward. No package may import from a package above it in this graph. Circular imports are a hard build error.

```
                      ┌──────────────────┐
                      │  @terminal/types │
                      │  (leaf — zero    │
                      │   deps on other  │
                      │   terminal pkgs) │
                      └────────┬─────────┘
                               │
                    ┌──────────▼──────────┐
                    │  @terminal/shared   │
                    │  depends on: types  │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
   ┌──────────▼──────────┐   ┌──────────▼──────────┐
   │   @terminal/core    │   │   @terminal/server  │
   │   depends on:       │   │   depends on:       │
   │   - types           │   │   - types           │
   │   - shared          │   │   - shared          │
   └──────────┬──────────┘   └─────────────────────┘
              │
   ┌──────────▼──────────┐
   │    @terminal/ui     │
   │    depends on:      │
   │    - types          │
   │    - shared         │
   │    - core           │
   └─────────────────────┘
```

### Explicit dependency table

| Package | Depends on (internal) | Depends on (external key libs) |
|---|---|---|
| `@terminal/types` | — | none |
| `@terminal/shared` | `@terminal/types` | none (pure TS utilities) |
| `@terminal/core` | `@terminal/types`, `@terminal/shared` | `comlink`, `ccxt` (CCXT Pro) |
| `@terminal/ui` | `@terminal/types`, `@terminal/shared`, `@terminal/core` | `react`, `dockview-react`, `zustand`, `jotai`, `mitt` |
| `@terminal/server` | `@terminal/types`, `@terminal/shared` | `fastify`, `ws`, `ioredis`, `ccxt` |

### Enforcement

TypeScript project references in each `tsconfig.json` enforce the graph at compile time. ESLint `import/no-restricted-paths` provides a second layer of enforcement at lint time. The root `turbo.json` pipeline mirrors this order, so Turborepo will never attempt to build a downstream package before its upstreams have built successfully.

---

## 4. Module Boundaries

### 4.1 `@terminal/types`

**What it is:** The shared contract layer. Pure TypeScript — no runtime code, no imports from other packages, no side effects.

**What belongs here:**
- All TypeScript `interface` and `type` definitions used by more than one package
- Discriminated union types for inter-process messages (worker ↔ main thread, server ↔ browser)
- Enum-style `const` objects for wire-safe string literals (e.g. `ExchangeId`, `CandleTimeframe`)
- No classes, no functions, no constants with runtime cost

**What does NOT belong here:**
- Utility functions (those go in `@terminal/shared`)
- React component props that are not shared across packages
- Package-internal types (keep those in the package that owns them)

**Rationale:** Keeping types in a dedicated zero-dependency package means any package can import the contract without pulling in unrelated runtime code. It also makes the schema the canonical single source of truth — when a type changes here, TypeScript surfaces every callsite across the monorepo.

---

### 4.2 `@terminal/shared`

**What it is:** Pure utility code with no framework coupling and no I/O.

**What belongs here:**
- Formatting helpers (`formatPrice`, `formatVolume`, `toUnixMs`)
- Symbol normalisation (`normalizeSymbol` — `BTCUSDT` → `BTC/USDT`)
- Ring buffer implementations (generic `RingBuffer<T>` and the typed `OHLCVBuffer`)
- Candle retention constants and time-bucket utilities
- Exchange display metadata (name, logo slug, colour)
- Typed error classes

**What does NOT belong here:**
- Anything that imports from Node.js built-ins (keep server-specific utils in `@terminal/server`)
- Anything that imports from browser APIs (keep UI-specific utils in `@terminal/ui`)
- Anything that manages state or holds mutable global references

**Rationale:** Both `@terminal/core` (which runs in a Web Worker — a browser context without DOM) and `@terminal/server` (a Node.js process) must be able to import from `@terminal/shared`. The package must therefore be environment-agnostic.

---

### 4.3 `@terminal/core`

**What it is:** All real-time data acquisition and processing logic that runs off the main thread in the browser. This package is the Data Layer from the three-layer architecture.

**What belongs here:**
- Exchange adapter implementations (`BinanceAdapter`, `BybitAdapter`, etc.) — each wraps a WebSocket connection and normalises raw exchange messages into `NormalizedTrade`, `OrderbookDelta`, etc.
- The `BaseExchangeAdapter` abstract class that all adapters extend
- The `DataWorker` entry point — the file that becomes the Web Worker bundle
- `WsManager` — connection lifecycle, exponential-backoff reconnection, heartbeat logic
- `Aggregator` — builds OHLCV candles from tick streams, maintains running CVD, computes trade statistics per time bucket
- `OrderbookManager` — applies L2 delta sequences to a snapshot, maintains the current book state
- `FlushScheduler` — batches accumulated updates and emits a single postMessage per flush interval (target: 50–100ms)
- The indicator engine stub (interface definition only in Phase 0)

**What does NOT belong here:**
- React components or any DOM access
- Zustand or Jotai stores (those live in `@terminal/ui`)
- Any Fastify/Node.js server code

**Rationale:** Isolating all WebSocket connections and aggregation logic in a dedicated package makes it independently testable in a Node.js test runner (no jsdom needed). The Web Worker bundle is produced by building just this package through a separate Vite worker entry point. The `@terminal/ui` package imports the worker file path and instantiates it — it never imports `@terminal/core` source directly at runtime except through the Worker boundary.

---

### 4.4 `@terminal/ui`

**What it is:** The complete browser application — React component tree, state stores, rendering pipeline, and the shell that hosts Dockview panels.

**What belongs here:**
- `main.tsx` — React root mount
- `App.tsx` — top-level layout: toolbar → Dockview container → status bar
- Zustand store slices for global state (layout, link groups, exchange connection statuses, theme)
- Jotai atom families for per-panel, per-symbol reactive data (used in later phases; stubs in Phase 0)
- `WorkerClient` — the Comlink-wrapped proxy that communicates with the `DataWorker`
- `RAFScheduler` — receives worker messages and batches store updates to animation frames
- Panel registry — maps the string `panelType` from Dockview's JSON to a React component
- All panel components (`ChartPanel`, `OrderbookPanel`, `TradesPanel`, etc. — stubs in Phase 0)
- `DockviewContainer` — mounts Dockview, saves/restores workspace JSON from localStorage
- `WorkspaceShell` — the outer chrome (toolbar, status bar)
- The Mitt event bus instance and `CrosshairSyncManager`
- CSS / theme files

**What does NOT belong here:**
- Exchange WebSocket logic (that is in `@terminal/core`)
- Fastify routes or Redis access (that is in `@terminal/server`)
- Any Node.js-only API usage

**Rationale:** Keeping the entire browser application in one package keeps Vite config simple — there is a single bundler entrypoint. The boundary between `@terminal/ui` and `@terminal/core` is the Web Worker message protocol defined in `@terminal/types`. No function calls cross this boundary; only serialisable messages do.

---

### 4.5 `@terminal/server`

**What it is:** The backend process — HTTP API, WebSocket relay, exchange ingestion on the server side, and data persistence.

**What belongs here:**
- Fastify app factory and route registration
- `WsServer` — uWebSockets.js or Fastify WebSocket plugin setup
- `SubscriptionManager` — tracks which connected browser client is subscribed to which market topics
- `Broadcaster` — reads from the in-memory aggregation layer and fans out to subscribed clients
- `ExchangeManager` — starts CCXT Pro connections, feeds normalised data into the Redis Streams pipeline
- `RedisClient` wrapper — typed read/write helpers for Redis Streams (stub in Phase 0)
- Server-side normaliser (mirrors the browser-side normaliser in `@terminal/core` but runs in Node.js)
- Configuration module (reads `process.env`, validates with zod)

**What does NOT belong here:**
- React components
- Browser Web Worker code
- Shared types (those stay in `@terminal/types`)

**Rationale:** The server package can be built and run independently of the UI. In production it will be deployed as a separate Docker container. Keeping it as its own package means it has its own dependency tree — it does not carry React or Vite as dependencies, and the UI does not carry Fastify.

---

## 5. Three-Layer Architecture Mapping

The three-layer architecture identified in the state management research maps to packages as follows.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                                       │
│                                                                           │
│  Package: @terminal/ui                                                    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  React Component Tree (Dockview panels)                             │ │
│  │  ChartPanel  OrderbookPanel  TradesPanel  DepthPanel  WatchlistPanel│ │
│  │        │             │            │           │            │         │ │
│  │  Jotai atom families (per-panel, per-symbol subscriptions)          │ │
│  │  useAtom(priceAtomFamily('BTC/USDT')) → only this panel re-renders  │ │
│  └───────────────────────────┬─────────────────────────────────────────┘ │
│                              │ React reads atoms                          │
│                              │                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  RAFScheduler  (src/worker/raf-scheduler.ts)                        │ │
│  │  Receives messages from DataWorker, batches atom.set() calls        │ │
│  │  to requestAnimationFrame — max one React update per frame          │ │
│  └───────────────────────────┬─────────────────────────────────────────┘ │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │ postMessage / Comlink
┌──────────────────────────────┼───────────────────────────────────────────┐
│  COORDINATION LAYER                                                       │
│                                                                           │
│  Package: @terminal/ui  (coordination modules within the package)         │
│                                                                           │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐ │
│  │   Zustand AppStore  │  │   Mitt Event Bus      │  │ CrosshairSync   │ │
│  │   (app-store.ts)    │  │   (event-bus.ts)      │  │ Manager         │ │
│  │                     │  │                       │  │ (sync/)         │ │
│  │  - panels config    │  │  Topics:              │  │                 │ │
│  │  - linkGroups       │  │  'crosshair:move'     │  │ Direct ref      │ │
│  │  - activeWorkspace  │  │  'symbol:change'      │  │ mutation,       │ │
│  │  - exchangeStatus   │  │  'timerange:change'   │  │ no React        │ │
│  │  - theme / tz       │  │  'panel:focus'        │  │ re-renders      │ │
│  └─────────────────────┘  └──────────────────────┘  └─────────────────┘ │
│                                                                           │
│  WorkerClient  (src/worker/worker-client.ts)                              │
│  Comlink.wrap(new Worker(...)) — typed proxy over postMessage             │
│  subscribe / unsubscribe / setTimeframe → DataWorker                      │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │ Web Worker boundary (postMessage)
┌──────────────────────────────┼────────────────────────────────────────────┐
│  DATA LAYER  (Web Worker — off main thread)                               │
│                                                                           │
│  Package: @terminal/core  (bundled as a separate worker chunk by Vite)    │
│                                                                           │
│  ┌───────────────────┐  ┌──────────────────┐  ┌────────────────────────┐│
│  │   WsManager       │  │   Aggregator     │  │  OrderbookManager      ││
│  │ (ws-manager.ts)   │  │ (aggregator.ts)  │  │ (orderbook-manager.ts) ││
│  │                   │  │                  │  │                         ││
│  │  BinanceAdapter   │  │  OHLCV candle    │  │  Snapshot + delta       ││
│  │  BybitAdapter     │  │  building        │  │  application            ││
│  │  OKXAdapter ...   │  │  CVD running sum │  │  25-level book          ││
│  │                   │  │  Trade stats     │  │  merge across           ││
│  │  Reconnect logic  │  │  per time bucket │  │  exchanges              ││
│  └─────────┬─────────┘  └────────┬─────────┘  └───────────┬────────────┘│
│            │                     │                         │              │
│  ┌─────────▼─────────────────────▼─────────────────────────▼────────────┐│
│  │  Ring Buffers + Typed Arrays  (packages/shared/src/buffers/)         ││
│  │  OHLCVBuffer (Float64Array, 6 fields × N candles per symbol/tf)      ││
│  │  RingBuffer<NormalizedTrade> (1000 entries per symbol)               ││
│  └─────────────────────────────────┬──────────────────────────────────── ┘│
│                                    │                                      │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │  FlushScheduler  (flush-scheduler.ts)                               │  │
│  │  Every 50–100ms: pack pending updates into typed messages,          │  │
│  │  postMessage to main thread (Transferable for large buffers,        │  │
│  │  structured clone for small status updates)                         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘

                 ┌──────────────────────────────────────────────────────┐
                 │  SEPARATE PROCESS — @terminal/server                 │
                 │                                                       │
                 │  Parallel to the browser pipeline (not in the        │
                 │  three-layer diagram — runs in Node.js):             │
                 │                                                       │
                 │  Exchange WSs → ExchangeManager → RedisStreams        │
                 │                                      │                │
                 │                              Broadcaster → WsServer  │
                 │                                      │                │
                 │                              Browser clients          │
                 └──────────────────────────────────────────────────────┘
```

### Layer responsibilities summary

| Layer | Package(s) | Key modules | Technology |
|---|---|---|---|
| Presentation | `@terminal/ui` | Panel components, Dockview, WorkspaceShell | React 18, Jotai, Dockview |
| Coordination | `@terminal/ui` | Zustand AppStore, Mitt EventBus, RAFScheduler, CrosshairSyncManager | Zustand, Mitt, rAF |
| Data (browser) | `@terminal/core` | DataWorker, WsManager, Aggregator, OrderbookManager, FlushScheduler | Web Worker, Comlink, CCXT Pro |
| Data (server) | `@terminal/server` | ExchangeManager, Broadcaster, WsServer, RedisClient | Fastify, uWebSockets.js, ioredis, CCXT Pro |
| Shared contract | `@terminal/types` | All interfaces and message unions | Pure TypeScript |
| Shared utilities | `@terminal/shared` | Ring buffers, formatters, constants | Pure TypeScript |

---

## 6. Key Interfaces to Define in Phase 0

These interfaces form the contract that all packages depend on. They must be stable before any downstream package writes substantive code. Each lives in `packages/types/src/` at the path indicated.

### 6.1 `NormalizedTrade` — `market/trade.ts`

```typescript
export interface NormalizedTrade {
  exchange: ExchangeId;        // e.g. 'binance'
  symbol: string;              // normalized form, e.g. 'BTC/USDT'
  timestamp: number;           // unix milliseconds
  side: 'buy' | 'sell';        // taker aggressor side
  price: number;
  amount: number;              // base currency quantity
  cost: number;                // quote currency value (price × amount)
  id: string;                  // exchange-provided trade ID
  liquidation: boolean;        // true if this trade is a forced liquidation
}
```

### 6.2 `OrderbookSnapshot` and `OrderbookDelta` — `market/orderbook.ts`

```typescript
export interface PriceLevel {
  price: number;
  size: number;    // 0 = level removed (for delta messages)
}

export interface OrderbookSnapshot {
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
  bids: PriceLevel[];   // sorted descending by price
  asks: PriceLevel[];   // sorted ascending by price
  sequenceId: number;   // for delta ordering validation
}

export interface OrderbookDelta {
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
  sequenceId: number;
  prevSequenceId: number;
}
```

### 6.3 `OHLCVCandle` — `market/candle.ts`

```typescript
export type CandleTimeframe =
  | '1s' | '5s' | '15s' | '30s'
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '12h'
  | '1d' | '1w';

export interface OHLCVCandle {
  timestamp: number;       // open time, unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;          // base currency volume
  buyVolume: number;       // taker buy volume (for CVD)
  sellVolume: number;      // taker sell volume
  tradeCount: number;
  closed: boolean;         // false = current forming candle
}
```

### 6.4 `ExchangeAdapter` — `exchange/adapter.ts`

```typescript
export interface ExchangeAdapter {
  readonly exchangeId: ExchangeId;
  readonly status: ConnectionStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  subscribeTrades(symbol: string): void;
  subscribeOrderbook(symbol: string, depth?: number): void;
  subscribeTicker(symbol: string): void;

  unsubscribeTrades(symbol: string): void;
  unsubscribeOrderbook(symbol: string): void;
  unsubscribeTicker(symbol: string): void;

  // Callbacks set by WsManager
  onTrade: ((trade: NormalizedTrade) => void) | null;
  onOrderbookSnapshot: ((snapshot: OrderbookSnapshot) => void) | null;
  onOrderbookDelta: ((delta: OrderbookDelta) => void) | null;
  onConnectionStatusChange: ((status: ConnectionStatus) => void) | null;
}
```

### 6.5 `WorkerInboundMessage` and `WorkerOutboundMessage` — `worker/messages.ts`

These are the typed discriminated unions that cross the Web Worker boundary.

```typescript
// Main thread → Worker
export type WorkerInboundMessage =
  | { type: 'subscribe';     symbol: string; exchanges: ExchangeId[]; topics: SubscriptionTopic[] }
  | { type: 'unsubscribe';   symbol: string }
  | { type: 'set-timeframe'; symbol: string; timeframe: CandleTimeframe }
  | { type: 'request-snapshot'; symbol: string; topic: SubscriptionTopic }
  | { type: 'add-indicator'; id: string; kind: string; params: Record<string, unknown> }
  | { type: 'remove-indicator'; id: string };

// Worker → Main thread
export type WorkerOutboundMessage =
  | { type: 'trade-batch';    symbol: string; trades: NormalizedTrade[] }
  | { type: 'candle-update';  symbol: string; timeframe: CandleTimeframe; candle: OHLCVCandle }
  | { type: 'orderbook';      symbol: string; snapshot: OrderbookSnapshot }
  | { type: 'ticker';         symbol: string; ticker: Ticker }
  | { type: 'connection-status'; exchange: ExchangeId; status: ConnectionStatus }
  | { type: 'error';           code: string; message: string };
```

### 6.6 `PanelConfig` and `LinkColor` — `ui/panel.ts`

```typescript
export type LinkColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'none';

export type PanelType =
  | 'chart'
  | 'orderbook'
  | 'trades'
  | 'depth-chart'
  | 'watchlist'
  | 'positions'
  | 'placeholder';

export interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  linkColor: LinkColor;
  symbol: string;
  timeframe?: CandleTimeframe;
  exchanges?: ExchangeId[];
}
```

### 6.7 `WorkspaceState` — `ui/workspace.ts`

```typescript
export interface LinkGroupState {
  symbol: string;
  timeframe: CandleTimeframe;
}

export interface WorkspaceState {
  version: number;                                   // schema version for migrations
  name: string;
  layoutJson: LayoutJSON;                            // Dockview toJSON() output
  panels: Record<string, PanelConfig>;
  linkGroups: Record<LinkColor, LinkGroupState>;
  updatedAt: number;                                 // unix ms
}
```

### 6.8 `ServerOutboundMessage` — `server/websocket.ts`

```typescript
// Server → Browser WebSocket message (will be Protobuf-encoded in later phases)
export type ServerOutboundMessage =
  | { type: 'trade-batch';    symbol: string; trades: NormalizedTrade[] }
  | { type: 'orderbook';      symbol: string; snapshot: OrderbookSnapshot }
  | { type: 'candle-update';  symbol: string; timeframe: CandleTimeframe; candle: OHLCVCandle }
  | { type: 'exchange-status'; exchange: ExchangeId; status: ConnectionStatus }
  | { type: 'subscribed';     channel: string }
  | { type: 'error';          code: string; message: string };

// Browser → Server WebSocket message
export type ClientSubscribeMessage =
  | { action: 'subscribe';   channels: string[] }
  | { action: 'unsubscribe'; channels: string[] };
```

---

## 7. Build Order

Turborepo resolves this automatically from the `dependsOn` declarations in `turbo.json`, but the explicit sequence is:

```
Step 1:  @terminal/types
         No internal dependencies. Must build first.
         Output: packages/types/dist/

Step 2:  @terminal/shared
         Depends on: @terminal/types (must be built)
         Output: packages/shared/dist/

Step 3a: @terminal/core       (parallel with 3b)
         Depends on: @terminal/types, @terminal/shared
         Output: packages/core/dist/

Step 3b: @terminal/server     (parallel with 3a)
         Depends on: @terminal/types, @terminal/shared
         Output: packages/server/dist/

Step 4:  @terminal/ui
         Depends on: @terminal/types, @terminal/shared, @terminal/core
         Output: packages/ui/dist/
```

### `turbo.json` pipeline shape

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

The `^build` notation means "build all packages this package depends on first." Steps 3a and 3b will run in parallel because they share the same set of upstreams and neither depends on the other.

### TypeScript project references

Each `tsconfig.json` must declare its upstream packages in the `references` array so that `tsc --build` respects the same order:

```jsonc
// packages/ui/tsconfig.json (example)
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" },
    { "path": "../shared" },
    { "path": "../core" }
  ]
}
```

---

## 8. Tooling and Workspace Configuration

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'tooling/*'
```

### `tsconfig.base.json` (root)

Key compiler options applied to every package:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true
  }
}
```

`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are deliberately enabled. Trading data is numeric and array-heavy — silent undefined access is a source of subtle bugs (e.g. reading `prices[symbolIndex]` when `symbolIndex` is out of range). The strictness pays for itself immediately.

### Package manager and Node version

- pnpm 9.x (declared in `package.json` `packageManager` field)
- Node 22 LTS (pinned in `.nvmrc`)

### Test runner

Vitest across all packages. Each package has its own `vitest.config.ts`. Tests run through Turborepo:
`pnpm turbo test` runs all packages in dependency order.

### Linting

ESLint flat config at the root, using `@typescript-eslint/eslint-plugin`. The `import/no-restricted-paths` rule enforces the package boundary: `@terminal/ui` may not import from `@terminal/server`, and `@terminal/core` may not import from `@terminal/ui`.

### Git hooks

`simple-git-hooks` + `lint-staged`:
- pre-commit: lint + type-check changed files
- commit-msg: conventional commits format validation

---

## 9. Architectural Decisions and Trade-offs

### Decision 1 — Single `DataWorker` in `@terminal/core`, not one worker per exchange

**Chosen:** Single worker with internal per-exchange adapter instances.

**Trade-off:** One worker handles all exchange connections. This means a bug in one adapter could in theory affect others. The counter-pressure is that spawning one worker per exchange costs roughly 5 MB of memory overhead per worker (V8 isolate setup), which at 10 exchanges is 50 MB before any data is processed. The single-worker pattern — used by aggr.trade for 27 exchanges — handles this scale without the memory penalty. Adapters are isolated classes; if one throws it is caught within the worker's event loop without bringing down the others.

---

### Decision 2 — `@terminal/ui` is also the Vite app, not a separate `apps/` entry

**Chosen:** `packages/ui` holds both the React library code and the Vite `index.html` / `vite.config.ts`.

**Trade-off:** This collocates the app entrypoint with the component library, which is slightly unconventional in monorepos that want to publish UI components separately. The benefit is fewer packages to wire up in Phase 0 and no separate `apps/` layer that does nothing but re-export the UI. If we later need to publish components independently or add a second app (e.g. a mobile web app), moving `index.html` and `vite.config.ts` into a separate `apps/web/` entry is a one-hour refactor, not an architectural change.

---

### Decision 3 — Browser-side data pipeline (`@terminal/core` worker) and server-side pipeline (`@terminal/server`) coexist

**Chosen:** Both pipelines are implemented, with the browser-side worker intended for standalone/offline-friendly use and the server-side pipeline for production deployments serving multiple clients.

**Trade-off:** Some normalisation logic is duplicated between `@terminal/core/src/adapters/*/normalizer.ts` and `@terminal/server/src/ingestion/normalizer.ts`. The duplication is intentional: the browser worker must be self-contained. The shared contract that prevents divergence is `@terminal/types` — both normalisers produce identical output types. A unit test in `@terminal/types` that exercises both normaliser paths against the same raw fixture data enforces parity.

---

### Decision 4 — Dockview over FlexLayout

**Chosen:** `dockview-react` as the layout engine in `@terminal/ui`.

**Trade-off:** Dockview is five years younger than FlexLayout and has a smaller community. The compelling reasons for Dockview in this context are: (a) configurable mount strategy — panels can stay mounted with `display:none`, which is critical for heavyweight chart panels that must not lose their WebGL context on tab switch; (b) zero dependencies reduce bundle risk; (c) built-in floating groups cover the "pop out DOM panel" use case traders expect. FlexLayout's stronger case — built by a financial software company and having border/edge panels out of the box — is noted as a viable alternative if Dockview's floating panel support proves insufficient.

---

### Decision 5 — `@terminal/types` defines the server WebSocket message schema even in Phase 0

**Rationale:** The server is not built until a later phase, but defining `ServerOutboundMessage` now means the browser-side `WorkerOutboundMessage` is designed to mirror it. When the browser switches from direct WebSocket connections to relaying through `@terminal/server`, the UI code changes minimally because both message shapes derive from the same types. Defining types ahead of implementation is low-cost and high-value in a multi-package monorepo.

---

### Decision 6 — Zustand for global coordination state, Jotai for per-panel reactive data

**Chosen:** Zustand manages workspace-level persistent state (layout, link groups, exchange status, theme). Jotai atom families manage per-symbol, per-panel real-time data (prices, candles, orderbook).

**Trade-off:** Two state libraries in one application adds cognitive overhead. The reason they are not unified: Zustand is the right choice for state that must be readable and writable outside React (the rAF scheduler runs in a plain JS class, not a hook), must be persisted to localStorage, and must have middleware (devtools, immer). Jotai is the right choice for state where re-render granularity is the primary concern — atom families allow 50 panels showing 50 different symbols to re-render independently when their symbol's price updates. Using Zustand for per-symbol data would require manual selector optimisation everywhere. The two libraries are used for orthogonal concerns and do not conflict.

---

*End of Phase 0 Bootstrap Architecture Design*
