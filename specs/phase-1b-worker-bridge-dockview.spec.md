# Phase 1b: Worker Bridge, Market Data Stores, and Dockview Layout Shell

**Version:** 1.0.0
**Date:** 2026-03-17
**Status:** Draft
**Phase:** 1b of N
**Depends on:** Phase 0 (Bootstrap), Phase 1a (WebGL Rendering Engine — ChartPanel, ChartManager, renderers)
**Blocks:** Phase 2 (Live Exchange Data), Phase 3 (TradesPanel and OrderbookPanel implementations)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Acceptance Criteria](#2-acceptance-criteria)
3. [API Contracts](#3-api-contracts)
4. [File Locations](#4-file-locations)
5. [Dependencies to Add](#5-dependencies-to-add)
6. [Out of Scope](#6-out-of-scope)

---

## 1. Overview

Phase 1b connects the `DataWorker` (already implemented in `packages/core`) to the React UI layer, and replaces the single-panel demo layout with a multi-panel dockable workspace.

Three deliverables are built in this phase:

**WorkerBridge** — A class in `packages/ui` that owns the lifecycle of the Web Worker process running `DataWorker`. It provides typed `send` / `subscribe` / `unsubscribe` methods and fans out incoming `WorkerOutboundMessage` payloads to registered listener callbacks. The rest of the UI treats WorkerBridge as a stable event bus; nothing else in the frontend touches `postMessage` directly.

**Zustand Market Data Stores** — Two Zustand stores (`useMarketStore` and `useConnectionStore`) that hold the authoritative client-side view of live market data. WorkerBridge listeners write into these stores through discrete actions. React components read from them through memoized selectors. The stores are the single source of truth for all real-time data in the UI process.

**Dockview Layout Shell** — The root `App` component is replaced by a `DockviewReact`-backed workspace. A panel registry maps `PanelType` strings to React components. The default layout renders four panels: chart (centre), trades list (bottom-left), orderbook (right), ticker bar (top). The layout serialises to `localStorage` and is restored on reload. Panels can be added, removed, and rearranged through the Dockview API.

### Architectural Boundaries

```
packages/core/src/worker/
  data-worker.ts          <- already exists, no changes in this phase
  flush-scheduler.ts      <- already exists, no changes in this phase

packages/ui/src/
  worker/
    data-worker.entry.ts  <- new: thin Worker entry point (calls initializeWorker)
    WorkerBridge.ts       <- new: owns Worker lifecycle + typed messaging

  stores/
    market-store.ts       <- new: Zustand store for trade/orderbook/ticker state
    connection-store.ts   <- new: Zustand store for per-exchange connection status

  layout/
    panel-registry.ts     <- new: maps PanelType to React component
    default-layout.ts     <- new: serialisable default layout descriptor
    DockviewShell.tsx     <- new: root layout component

  rendering/panels/
    ChartPanel.tsx        <- already exists, receives candles from market-store
    TradesPanel.tsx       <- new: placeholder
    OrderbookPanel.tsx    <- new: placeholder
    TickerBar.tsx         <- new: placeholder

  App.tsx                 <- modified: renders DockviewShell instead of bare ChartPanel
```

---

## 2. Acceptance Criteria

All criteria must be met for the phase to be considered complete. Criteria are grouped by feature area and numbered for traceability.

### 2.1 Worker Entry Point

**AC-1.** A file `packages/ui/src/worker/data-worker.entry.ts` exists and contains a single call to `initializeWorker()` imported from `@terminal/core`. The file has no other logic.

**AC-2.** `packages/ui/vite.config.ts` does not require any additional `worker` configuration block — the entry point is referenced via the inline `new Worker(new URL(..., import.meta.url), { type: 'module' })` syntax, which Vite handles automatically with its default worker configuration.

### 2.2 WorkerBridge

**AC-3.** `WorkerBridge` can be instantiated without arguments. The constructor must not spawn the Worker; spawning is deferred to an explicit `start()` call.

**AC-4.** Calling `start()` on a `WorkerBridge` instance spawns exactly one Web Worker using `new Worker(new URL('../worker/data-worker.entry.ts', import.meta.url), { type: 'module' })`.

**AC-5.** Calling `start()` a second time on an already-running bridge is a no-op and does not spawn an additional Worker.

**AC-6.** `send(message: WorkerInboundMessage)` posts the message to the running Worker. If `send` is called before `start()`, it throws an `Error` with the message `"WorkerBridge: worker is not running"`.

**AC-7.** `subscribe(symbol, exchanges, topics)` calls `send` with a `WorkerInboundMessage` of type `'subscribe'`.

**AC-8.** `unsubscribe(symbol)` calls `send` with a `WorkerInboundMessage` of type `'unsubscribe'`.

**AC-9.** `addListener(listener: WorkerMessageListener)` registers a callback. All registered listeners are called in registration order for each `WorkerOutboundMessage` received from the Worker.

**AC-10.** `removeListener(listener: WorkerMessageListener)` removes a previously registered callback by reference. Subsequent messages are not delivered to that callback.

**AC-11.** When the Worker emits a `MessageEvent`, `WorkerBridge` calls all registered listeners with the `event.data` payload typed as `WorkerOutboundMessage`.

**AC-12.** When the Worker emits an `ErrorEvent`, `WorkerBridge` logs the error via `console.error` and calls all registered listeners with a synthesised `WorkerOutboundMessage` of type `'error'` containing the `ErrorEvent.message` as the `message` field and `'WORKER_ERROR'` as the `code` field.

**AC-13.** `terminate()` calls `Worker.terminate()`, clears the internal Worker reference, and removes all listeners. Subsequent calls to `terminate()` on an already-stopped bridge are no-ops.

**AC-14.** `WorkerBridge` exposes a read-only `isRunning: boolean` property that returns `true` only when a live Worker instance exists.

**AC-15.** `WorkerBridge` is exported from `packages/ui/src/worker/WorkerBridge.ts` as a named export. It is not a singleton; callers construct instances.

### 2.3 Zustand Market Data Stores

**AC-16.** `useMarketStore` is created with `zustand` (not `zustand/react`) so it can be used both inside and outside React components. The store is a module-level singleton exported from `packages/ui/src/stores/market-store.ts`.

**AC-17.** The market store holds a `trades` map keyed by `symbol`. Each value is a fixed-length ring buffer array of `NormalizedTrade` objects. The ring buffer capacity is `RING_BUFFER_SIZE` (imported from `@terminal/shared`). When the buffer is full, the oldest entry is evicted before the new one is appended.

**AC-18.** `processTradeBatch(symbol: string, trades: NormalizedTrade[])` appends each trade from the batch to the ring buffer for the given symbol, evicting the oldest entries as needed. A symbol key is created on first write.

**AC-19.** The market store holds an `orderbooks` map keyed by `symbol`. Each value is an `OrderbookSnapshot | null`. `processOrderbook(snapshot: OrderbookSnapshot)` replaces the value at `snapshot.symbol`.

**AC-20.** The market store holds a `tickers` map keyed by `symbol`. Each value is a `Ticker | null`. `processTicker(ticker: Ticker)` replaces the value at `ticker.symbol`.

**AC-21.** `useConnectionStore` is a separate Zustand store exported from `packages/ui/src/stores/connection-store.ts`. It holds a `statuses` map keyed by `ExchangeId`, each value being a `ConnectionStatus` enum value. `processConnectionStatus(exchange: ExchangeId, status: ConnectionStatus)` updates the map.

**AC-22.** `useMarketStore` exports the following memoised selectors as standalone functions (not inline arrow functions passed directly to the store hook, so that referential equality is stable across renders):
  - `selectTrades(symbol: string)` — returns the ring buffer array for that symbol, or an empty array if the symbol has no data yet
  - `selectOrderbook(symbol: string)` — returns the snapshot or `null`
  - `selectTicker(symbol: string)` — returns the ticker or `null`

**AC-23.** `useConnectionStore` exports `selectConnectionStatus(exchange: ExchangeId)` as a stable selector that returns the `ConnectionStatus` for that exchange, defaulting to `ConnectionStatus.Disconnected` if absent.

**AC-24.** A `WorkerBridgeListener` function is exported from `packages/ui/src/stores/market-store.ts`. When registered with a `WorkerBridge` instance, it routes each `WorkerOutboundMessage` to the correct store action:
  - `'trade-batch'` routes to `useMarketStore.getState().processTradeBatch`
  - `'orderbook'` routes to `useMarketStore.getState().processOrderbook`
  - `'ticker'` routes to `useMarketStore.getState().processTicker`
  - `'connection-status'` routes to `useConnectionStore.getState().processConnectionStatus`
  - `'error'` and `'candle-update'` are no-ops (handled in a later phase or ignored)

### 2.4 Dockview Layout Shell

**AC-25.** `dockview-react` is added as a runtime dependency of `packages/ui`. The `dockview` peer dependency is satisfied by adding `dockview` as well.

**AC-26.** A panel registry object is exported from `packages/ui/src/layout/panel-registry.ts`. It maps every `PanelType` string value to a React component compatible with the Dockview `components` prop shape. For `'chart'` it returns `ChartPanel`. For `'trades'`, `'orderbook'`, `'depth-chart'`, `'watchlist'`, `'positions'`, and `'placeholder'` it returns the corresponding placeholder component.

**AC-27.** `DockviewShell` renders a `DockviewReact` component that fills the entire viewport (`width: 100%; height: 100vh`). The `DockviewReact` `components` prop is wired to the panel registry.

**AC-28.** The default layout descriptor in `packages/ui/src/layout/default-layout.ts` defines four panels:
  - `chart-main` of type `'chart'`, title `"Chart"`, positioned in the centre group
  - `trades-main` of type `'trades'`, title `"Trades"`, positioned in a bottom-left group
  - `orderbook-main` of type `'orderbook'`, title `"Orderbook"`, positioned in a right group
  - `ticker-bar` of type `'placeholder'`, title `"Ticker"`, positioned in a top group

**AC-29.** On first load (no `localStorage` data), `DockviewShell` applies the default layout by calling the Dockview API's `fromJSON` method with the default layout descriptor.

**AC-30.** When the Dockview layout changes (panels moved, added, or closed), `DockviewShell` serialises the current layout via the Dockview API's `toJSON` method and writes the result to `localStorage` under the key `'terminal:layout'`.

**AC-31.** On subsequent loads where `localStorage` key `'terminal:layout'` exists and contains a valid JSON string, `DockviewShell` restores the persisted layout via `fromJSON` instead of applying the default. If the stored JSON is malformed or `fromJSON` throws, the default layout is applied and the malformed entry is removed from `localStorage`.

**AC-32.** `TradesPanel`, `OrderbookPanel`, and `TickerBar` are React components that render a `<div>` filling their container with a visible placeholder label (e.g., `"Trades — coming in Phase 2"`). They accept no required props beyond those injected by Dockview and do not fetch any data.

**AC-33.** `ChartPanel` is registered in the panel registry. When rendered inside Dockview, it receives candle data from `useMarketStore` via the `selectTrades` selector. Because candle aggregation is out of scope for this phase, the panel renders its loading state (no candles present) when the store contains no candle data.

**AC-34.** `App.tsx` renders `DockviewShell` as its sole child inside a full-viewport `<div>`. The demo candle generation code and the bare `ChartPanel` usage that existed prior to this phase are removed.

**AC-35.** The Dockview dark theme class (such as `dockview-theme-abyss`) is applied to the `DockviewReact` root element via the `theme` prop or `className` prop as appropriate for the installed version, and the corresponding CSS is imported in `DockviewShell.tsx`.

### 2.5 Integration

**AC-36.** `DockviewShell` constructs a `WorkerBridge` instance, calls `start()` on mount inside a `useEffect`, registers `WorkerBridgeListener` via `addListener`, and calls `terminate()` in the effect cleanup. The bridge instance is held in a `useRef`, not in React state, to avoid triggering re-renders.

**AC-37.** On mount, `DockviewShell` calls `workerBridge.subscribe('BTC/USDT', ['binance', 'bybit'], ['trades', 'orderbook', 'ticker'])` as a default subscription so that data flows end-to-end without requiring user interaction.

**AC-38.** The TypeScript compiler reports zero errors (`tsc --noEmit`) across all packages after implementing this phase.

**AC-39.** All existing tests in `packages/core`, `packages/types`, and `packages/shared` continue to pass without modification.

---

## 3. API Contracts

### 3.1 WorkerBridge

```typescript
// packages/ui/src/worker/WorkerBridge.ts

import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  ExchangeId,
  SubscriptionTopic,
} from '@terminal/types';

/** Callback type for messages received from the DataWorker. */
export type WorkerMessageListener = (message: WorkerOutboundMessage) => void;

export class WorkerBridge {
  /** True when a live Worker instance is running. */
  readonly isRunning: boolean;

  /**
   * Spawns the Web Worker and begins processing messages.
   * No-op if the worker is already running.
   */
  start(): void;

  /**
   * Posts a typed message to the running Worker.
   * Throws if the worker has not been started.
   */
  send(message: WorkerInboundMessage): void;

  /**
   * Convenience method: sends a 'subscribe' message.
   */
  subscribe(
    symbol: string,
    exchanges: ExchangeId[],
    topics: SubscriptionTopic[]
  ): void;

  /**
   * Convenience method: sends an 'unsubscribe' message.
   */
  unsubscribe(symbol: string): void;

  /**
   * Registers a listener for outbound Worker messages.
   * Listeners are called in registration order.
   */
  addListener(listener: WorkerMessageListener): void;

  /**
   * Removes a previously registered listener by reference.
   */
  removeListener(listener: WorkerMessageListener): void;

  /**
   * Terminates the Worker, clears the listener registry, and
   * resets isRunning to false. No-op if not running.
   */
  terminate(): void;
}
```

### 3.2 Market Store

```typescript
// packages/ui/src/stores/market-store.ts

import type { NormalizedTrade, OrderbookSnapshot, Ticker } from '@terminal/types';
import type { WorkerMessageListener } from '../worker/WorkerBridge.js';

export interface MarketState {
  /** Ring buffer of recent trades, keyed by normalised symbol. */
  trades: Record<string, NormalizedTrade[]>;
  /** Latest orderbook snapshot per symbol. */
  orderbooks: Record<string, OrderbookSnapshot | null>;
  /** Latest ticker per symbol. */
  tickers: Record<string, Ticker | null>;

  processTradeBatch(symbol: string, trades: NormalizedTrade[]): void;
  processOrderbook(snapshot: OrderbookSnapshot): void;
  processTicker(ticker: Ticker): void;
}

export declare const useMarketStore: import('zustand').UseBoundStore<
  import('zustand').StoreApi<MarketState>
>;

/**
 * Returns a selector function for the trade ring buffer of a given symbol.
 * Returns an empty array if the symbol has no data yet.
 * The returned function reference is stable across calls with the same symbol.
 */
export declare function selectTrades(
  symbol: string
): (state: MarketState) => NormalizedTrade[];

/**
 * Returns a selector function for the orderbook snapshot of a given symbol.
 */
export declare function selectOrderbook(
  symbol: string
): (state: MarketState) => OrderbookSnapshot | null;

/**
 * Returns a selector function for the ticker of a given symbol.
 */
export declare function selectTicker(
  symbol: string
): (state: MarketState) => Ticker | null;

/**
 * WorkerBridge listener that routes WorkerOutboundMessages to store actions.
 * Register with WorkerBridge.addListener().
 */
export declare const WorkerBridgeListener: WorkerMessageListener;
```

### 3.3 Connection Store

```typescript
// packages/ui/src/stores/connection-store.ts

import type { ExchangeId, ConnectionStatus } from '@terminal/types';

export interface ConnectionState {
  /** Connection status per exchange. */
  statuses: Partial<Record<ExchangeId, ConnectionStatus>>;

  processConnectionStatus(exchange: ExchangeId, status: ConnectionStatus): void;
}

export declare const useConnectionStore: import('zustand').UseBoundStore<
  import('zustand').StoreApi<ConnectionState>
>;

/**
 * Returns a selector function for the ConnectionStatus of a given exchange.
 * Defaults to ConnectionStatus.Disconnected when no status has been recorded.
 */
export declare function selectConnectionStatus(
  exchange: ExchangeId
): (state: ConnectionState) => ConnectionStatus;
```

### 3.4 Panel Registry

```typescript
// packages/ui/src/layout/panel-registry.ts

import type { PanelType } from '@terminal/types';
import type { IDockviewPanelProps } from 'dockview-react';

/**
 * Maps every PanelType to a React component compatible with
 * the Dockview `components` prop shape.
 */
export type PanelRegistry = Record<
  PanelType,
  React.ComponentType<IDockviewPanelProps>
>;

export declare const panelRegistry: PanelRegistry;
```

### 3.5 Default Layout Descriptor

```typescript
// packages/ui/src/layout/default-layout.ts

import type { SerializedDockview } from 'dockview-react';

/**
 * The serialised layout applied on first load or when persisted
 * layout data is missing or malformed.
 * Must be a valid argument to DockviewApi.fromJSON().
 */
export declare const defaultLayout: SerializedDockview;
```

### 3.6 Placeholder Panel Component Signatures

```typescript
// packages/ui/src/rendering/panels/TradesPanel.tsx
import type { IDockviewPanelProps } from 'dockview-react';
export declare function TradesPanel(props: IDockviewPanelProps): React.JSX.Element;

// packages/ui/src/rendering/panels/OrderbookPanel.tsx
import type { IDockviewPanelProps } from 'dockview-react';
export declare function OrderbookPanel(props: IDockviewPanelProps): React.JSX.Element;

// packages/ui/src/rendering/panels/TickerBar.tsx
import type { IDockviewPanelProps } from 'dockview-react';
export declare function TickerBar(props: IDockviewPanelProps): React.JSX.Element;
```

### 3.7 DockviewShell

```typescript
// packages/ui/src/layout/DockviewShell.tsx

/**
 * Root layout component. Renders the DockviewReact workspace,
 * manages layout persistence, and owns the WorkerBridge lifecycle.
 * Takes no props.
 */
export declare function DockviewShell(): React.JSX.Element;
```

### 3.8 Worker Entry Point

```typescript
// packages/ui/src/worker/data-worker.entry.ts

// No exports. Side-effect only.
// Calls initializeWorker() from @terminal/core, which wires
// self.onmessage and self.postMessage to a DataWorker instance.
import { initializeWorker } from '@terminal/core';
initializeWorker();
```

---

## 4. File Locations

All paths are relative to the monorepo root.

### New Files

| Path | Purpose |
|---|---|
| `packages/ui/src/worker/data-worker.entry.ts` | Web Worker entry point; calls `initializeWorker()` |
| `packages/ui/src/worker/WorkerBridge.ts` | Worker lifecycle manager and typed message bus |
| `packages/ui/src/stores/market-store.ts` | Zustand store for trades, orderbooks, and tickers |
| `packages/ui/src/stores/connection-store.ts` | Zustand store for per-exchange connection status |
| `packages/ui/src/layout/panel-registry.ts` | `PanelType` to React component mapping |
| `packages/ui/src/layout/default-layout.ts` | Default `SerializedDockview` layout descriptor |
| `packages/ui/src/layout/DockviewShell.tsx` | Root Dockview workspace component |
| `packages/ui/src/rendering/panels/TradesPanel.tsx` | Placeholder panel component |
| `packages/ui/src/rendering/panels/OrderbookPanel.tsx` | Placeholder panel component |
| `packages/ui/src/rendering/panels/TickerBar.tsx` | Placeholder panel component |

### Modified Files

| Path | Change |
|---|---|
| `packages/ui/src/App.tsx` | Remove demo candle generation and bare `ChartPanel`; render `DockviewShell` |
| `packages/ui/package.json` | Add `dockview`, `dockview-react`, and `zustand` to `dependencies` |
| `packages/ui/vite.config.ts` | Confirm no changes needed; Worker `type: 'module'` is already supported by Vite 5 defaults |

### Unchanged Files

| Path | Notes |
|---|---|
| `packages/core/src/worker/data-worker.ts` | `initializeWorker()` is already exported; no changes needed |
| `packages/core/src/worker/flush-scheduler.ts` | No changes |
| `packages/types/src/worker/messages.ts` | All required message types already exist |
| `packages/types/src/ui/panel.ts` | `PanelType` and `PanelConfig` already defined |
| `packages/shared/src/constants/limits.ts` | `RING_BUFFER_SIZE = 1_000` already exported |
| `packages/ui/src/rendering/panels/ChartPanel.tsx` | Component unchanged; only its usage in `App.tsx` changes |

---

## 5. Dependencies to Add

All additions go to `packages/ui/package.json` under `dependencies` (runtime, not `devDependencies`, because they are bundled into the Vite output).

| Package | Version Constraint | Rationale |
|---|---|---|
| `dockview` | `^4.0.0` | Core Dockview library; peer dependency of `dockview-react` |
| `dockview-react` | `^4.0.0` | React bindings for the Dockview layout engine |
| `zustand` | `^5.0.0` | Minimal subscription-based state management; no Provider wrapper required |

### Version Compatibility Notes

- Dockview 4.x requires React 18, which is already present in `packages/ui`.
- Zustand 5.x removes built-in `immer` middleware. If immer-based state updates are needed in a later phase, add `immer` separately at that time.
- No changes are required to `packages/core`, `packages/types`, or `packages/shared` `package.json` files.

### CSS Import

Dockview requires its stylesheet to be imported exactly once. The import belongs in `DockviewShell.tsx` to keep the dependency co-located with the component that needs it:

```typescript
import 'dockview-react/dist/styles/dockview.css';
```

---

## 6. Out of Scope

The following items are explicitly deferred to later phases and must not be partially implemented in Phase 1b, as partial implementations introduce unclear ownership across phase boundaries.

**Candle aggregation and chart data flow.** `ChartPanel` will render in its loading state inside Dockview because no candle data flows through the stores in this phase. Wiring `candle-update` messages into a candle store and passing live data to `ChartPanel` is Phase 2 work.

**Functional TradesPanel and OrderbookPanel.** The panel components created here are placeholders only. Rendering trade rows and order book levels from `useMarketStore` selectors is Phase 2 work.

**TickerBar implementation.** Rendering live ticker data (last price, 24h change, high, low, volume) is Phase 2 work.

**Panel context menu and add-panel UI.** A user-facing mechanism to open new panels (right-click menu, toolbar button, keyboard shortcut) is deferred. Panels can only be added by modifying the default layout descriptor in code during this phase.

**Symbol and timeframe controls.** UI controls for changing the subscribed symbol or chart timeframe are deferred.

**Cross-panel link color synchronisation.** `PanelConfig.linkColor` is defined in `packages/types` but the synchronisation logic that broadcasts symbol and timeframe changes across panels sharing a link color is deferred.

**Multiple simultaneous symbol subscriptions.** The default subscription hard-codes a single `'BTC/USDT'` subscription. A subscription manager that tracks per-panel symbol requirements and reconciles subscribe/unsubscribe calls is deferred.

**Worker error recovery and automatic restart.** When the Worker emits an `ErrorEvent`, WorkerBridge synthesises an error message for listeners (AC-12) but does not attempt a restart. Automatic restart with backoff is deferred.

**SharedArrayBuffer zero-copy data transfer.** The DataWorker passes data via structured cloning through `postMessage`. Migrating hot paths to `SharedArrayBuffer` and `Atomics` is a future performance optimisation phase.

**Unit and integration tests for WorkerBridge and stores.** Tests verifying the full Worker-to-store pipeline are desirable but are deferred to a dedicated testing phase. The existing tests in `packages/core`, `packages/types`, and `packages/shared` must continue to pass (AC-39) but no new test files are required by this phase.

**Server-side rendering.** `DockviewShell` uses `localStorage` and browser-only APIs. SSR is not a goal for this project.
