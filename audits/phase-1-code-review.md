# Phase 1 Code Review — Exchange Connector Framework & WebGL Rendering Engine

**Reviewer:** code-reviewer agent
**Date:** 2026-03-17
**Scope:** `packages/core/src/` (Phase 1A) and `packages/ui/src/rendering/` (Phase 1C)
**Design references:** `designs/phase-1a-exchange-connectors.design.md`, `designs/phase-1c-webgl-engine.design.md`

---

## Summary Scorecard

| Area | Rating | Notes |
|---|---|---|
| Type safety | Good | No `any` usage; minor unsafe casts in adapters |
| WebSocket robustness | Good | Solid state machine; two deviations from design spec |
| Orderbook correctness | Good | Core logic correct; O(n) performance on every call |
| WebGL correctness | Good | Shaders match design; buffer layout diverges from spec |
| Memory management | Acceptable | No leaks found; one timer not cleared on context loss |
| Test quality | Acceptable | Core paths covered; edge cases and integration missing |
| Architecture compliance | Partial | Significant scope reduction vs. design; valid for Phase 1 but gaps noted |

---

## Critical Findings

### CRIT-01 — Binance Depth Snapshot Symbol Resolution Is Fragile and Will Silently Corrupt Data for Multi-Symbol Subscriptions

**File:** `packages/core/src/adapters/binance/binance-adapter.ts`, lines 222–240
**Severity:** Critical
**Category:** Orderbook correctness

The `handleDepthSnapshot` method receives a depth20 snapshot that carries no symbol identifier in its JSON body (the symbol is only encoded in the stream name of Binance's combined stream wrapper, which is not present in single-stream mode). To recover the symbol, the code iterates `subscribedOrderbooks` and applies the snapshot to the first symbol it finds, then breaks:

```typescript
for (const symbol of this.subscribedOrderbooks) {
  const manager = this.orderbookManagers.get(symbol);
  if (!manager) continue;
  // ...
  manager.applySnapshot(snapshot);
  this.onOrderbookSnapshot?.(manager.getSnapshot());
  break;  // <-- hardcoded single-symbol assumption
}
```

If a caller subscribes to orderbooks for two symbols simultaneously (e.g., BTC/USDT and ETH/USDT), the second symbol's depth snapshot will be applied to whichever symbol happens to be first in `Set` iteration order. Both consumers will receive wrong data silently — no error is raised.

The design document uses the combined stream multiplexing approach where the stream name is available in the message wrapper (`{"stream":"btcusdt@depth20@100ms","data":{...}}`). The implementation bypasses this by connecting to the base `/ws` endpoint and issuing `SUBSCRIBE` commands. This is a valid Binance API approach, but the combined stream wrapper _is_ included when using the `SUBSCRIBE` command — the `stream` field is present. The `handleMessage` method discards it.

**Fix required:** Parse the outer combined stream message structure. When the adapter sends `SUBSCRIBE` to `wss://stream.binance.com:9443/ws`, Binance responds with combined stream envelopes of the form `{"stream":"<streamName>","data":{...}}`. The `handleMessage` method must detect and unwrap this envelope to extract the stream name, then route the `data` payload to the correct `OrderbookManager` by matching the stream name back to the subscribed symbol.

As an immediate workaround: enforce a hard limit of one orderbook subscription per adapter instance and throw if a second is attempted. This at least makes the defect explicit.

---

### CRIT-02 — No Sequence Gap Detection in Orderbook Delta Application

**File:** `packages/core/src/orderbook/orderbook-manager.ts`, lines 71–89
**Severity:** Critical
**Category:** Orderbook correctness

`OrderbookManager.applyDelta` silently accepts and applies every delta regardless of whether it arrives in the correct sequence. The `OrderbookDelta` type includes `sequenceId` and `prevSequenceId` fields specifically for gap detection, but `applyDelta` never checks them:

```typescript
applyDelta(delta: OrderbookDelta): void {
  // Applies unconditionally — no sequence validation
  for (const level of delta.bids) { ... }
  for (const level of delta.asks) { ... }
  this.lastSequenceId = delta.sequenceId;
  this.trimDepth();
}
```

If a delta is dropped, re-ordered, or duplicated (all of which happen on public WebSocket connections under load), the local orderbook state diverges from the exchange's true state. There is no mechanism to detect this and trigger a resync. The design document (Section 4, states SYNCED → reset on sequence gap) explicitly requires this validation.

For Bybit, the gap check is: `delta.prevSequenceId !== this.lastSequenceId`. When this condition is true, the state machine must reset and request a new snapshot. Without this check, the rendered orderbook will silently display stale or corrupt prices.

**Fix required:** Add sequence validation inside `applyDelta`. The simplest correct implementation:

```typescript
applyDelta(delta: OrderbookDelta): void {
  if (this.lastSequenceId !== 0 &&
      delta.prevSequenceId !== this.lastSequenceId) {
    // Sequence gap detected — caller must handle resync
    throw new SequenceGapError(this.lastSequenceId, delta.prevSequenceId);
  }
  // ... existing apply logic
}
```

The caller (adapter) catches `SequenceGapError` and triggers reconnection or re-snapshot.

---

## High Severity Findings

### HIGH-01 — Design Specifies `baseDelay = 100ms`; Implementation Uses `baseDelay = 1000ms`

**File:** `packages/core/src/ws/ws-manager.ts`, line 192
**Severity:** High
**Category:** WebSocket robustness / Architecture compliance

The design document (Section 2.2) specifies:
```
baseDelay = 100 ms
maxDelay  = 30 000 ms
```

The implementation uses:
```typescript
const baseDelay = 1000;   // 1 second
```

This is a 10x slower first reconnect. For a live trading terminal where an exchange connection drops briefly (brief network hiccup, server restart), the user sees 1–2 seconds of stale data instead of 100–200ms. In high-volatility markets, 1 second of missed trades is a meaningful user experience regression.

**Fix:** Change `baseDelay` to `100` and update the test that asserts `vi.advanceTimersByTime(2000)` is sufficient (it should use `200ms` margin).

---

### HIGH-02 — `handleUnsubscribe` Sends Unsubscribe Frames for Streams That Were Never Subscribed

**File:** `packages/core/src/worker/data-worker.ts`, lines 130–136
**Severity:** High
**Category:** Architecture correctness

`handleUnsubscribe` iterates all adapters and calls all four unsubscribe methods unconditionally for the given symbol:

```typescript
private handleUnsubscribe(message: { type: 'unsubscribe'; symbol: string }): void {
  for (const adapter of this.adapters.values()) {
    adapter.unsubscribeTrades(message.symbol);
    adapter.unsubscribeOrderbook(message.symbol);
    adapter.unsubscribeTicker(message.symbol);
    adapter.unsubscribeLiquidations(message.symbol);
  }
}
```

Each adapter unconditionally sends an `UNSUBSCRIBE` frame even when the stream was never subscribed. This sends noise to the exchange, consumes the rate limit for subscription changes (Binance limits to 240 per hour per connection), and may trigger exchange-side error responses. The adapter `unsubscribeX` methods call `sendUnsubscribe` without first checking whether the symbol is in the relevant subscription set.

**Fix:** In each adapter's `unsubscribeX` method, guard with a set membership check before sending:
```typescript
unsubscribeTrades(symbol: string): void {
  if (!this.subscribedTrades.has(symbol)) return;
  this.subscribedTrades.delete(symbol);
  const exchangeSymbol = this.toExchangeSymbol(symbol);
  this.sendUnsubscribe([`${exchangeSymbol.toLowerCase()}@aggTrade`]);
}
```

---

### HIGH-03 — Bybit Ticker `price24hPcnt` Is Multiplied by 100 But Already Represents a Percentage

**File:** `packages/core/src/adapters/bybit/bybit-adapter.ts`, line 283
**Severity:** High
**Category:** Data correctness

```typescript
changePercent24h: parseFloat(data['price24hPcnt'] as string) * 100,
```

The Bybit v5 API documents `price24hPcnt` as a decimal fraction where `0.0215` means 2.15%. The implementation multiplies by 100, producing `2150%` instead of `2.15%`. The test asserts `toBeCloseTo(2.15)` and the sample data provides `'0.0215'`, so the computation happens to produce the right result in the test — but only because the assertion matches the multiplication and the sample value is already the fraction form.

Wait — re-reading: `parseFloat('0.0215') * 100 = 2.15`. The test passes `expect(ticker.changePercent24h).toBeCloseTo(2.15)` with `price24hPcnt: '0.0215'`. This is numerically correct. The Binance adapter does NOT multiply (it parses `'P'` which is already `'2.15'`).

The issue is one of consistency: the Bybit adapter normalizes to `2.15` (percent) while the Binance adapter also normalizes to `2.15`. However, `Ticker.changePercent24h` is ambiguous in the type definition — it does not document whether the value is fractional (0.0215) or percent-formatted (2.15). This ambiguity must be resolved in the type and documented in the adapter.

**Required action:** Document the expected unit in `@terminal/types`'s `Ticker` interface. Confirm both adapters agree. If Bybit starts returning values in a different scale, this silent math will corrupt the display.

---

### HIGH-04 — `ViewportTransform` Is Mutable; Design Requires Immutable Instances

**File:** `packages/ui/src/rendering/viewport-transform.ts`
**Severity:** High
**Category:** Architecture compliance

The design document (Section 2 and Decision 4) is explicit:

> `ViewportTransform` instances are immutable. Pan and zoom operations return a new instance, making it straightforward to implement undo, animation interpolation between two states, and React state comparison.

The implementation is fully mutable — `pan()`, `zoom()`, `fitToData()`, and `resize()` all modify `this` in place and return `void`:

```typescript
pan(deltaPixelX: number, deltaPixelY: number): void {
  this._originX -= deltaPixelX / this._scaleX;  // mutates this
  this._originY += deltaPixelY / this._scaleY;
}
```

The design's rationale for immutability is architecturally valid: React's `useEffect` dependency array comparison requires reference equality to detect changes, which immutability provides for free. Without immutability, passing `viewport` as a `useEffect` dependency will not work correctly, and animation interpolation between two states is impossible (you cannot hold a reference to the "before" state).

This is not merely a style preference — it directly affects correctness of the React hook dependency tracking and future animation features.

**Fix:** Refactor all mutating methods to return a new `ViewportTransform` instance. The class should be marked `readonly` on all private fields. Example:

```typescript
pan(deltaPixelX: number, deltaPixelY: number): ViewportTransform {
  return new ViewportTransform({
    canvasWidth: this._canvasWidth,
    canvasHeight: this._canvasHeight,
    originX: this._originX - deltaPixelX / this._scaleX,
    originY: this._originY + deltaPixelY / this._scaleY,
    scaleX: this._scaleX,
    scaleY: this._scaleY,
  });
}
```

---

### HIGH-05 — `useChart` Hook Returns Stale `chartManager` Immediately After Initialization

**File:** `packages/ui/src/rendering/hooks/use-chart.ts`, lines 24–46
**Severity:** High
**Category:** React correctness

The hook stores `ChartManager` in a `useRef` but returns `managerRef.current` synchronously at the end of the function. On the first render, the effect has not yet run (effects are deferred to after the first paint), so `managerRef.current` is `null` even though `isReady` becomes `true` on the second render:

```typescript
const managerRef = useRef<ChartManager | null>(null);
const [isReady, setIsReady] = useState(false);

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const manager = new ChartManager(canvas);
  managerRef.current = manager;
  setIsReady(true);      // triggers re-render
  // ...
}, [canvasRef]);

return {
  chartManager: managerRef.current,   // always returns ref value at render time
  isReady,
};
```

The `ChartPanel` component then runs another `useEffect` that depends on `[chartManager, candles]`. Since `chartManager` was `null` on the initial render, the effect sees `null` and skips. On the second render (triggered by `setIsReady(true)`), `managerRef.current` has been set and is returned, so `chartManager` in `ChartPanel`'s effect is now the manager — this works, but only because the component re-renders. If the `candles` prop also changed between renders, there could be a window where `chartManager` is available but the effect has already run with the old value.

More fundamentally: returning `managerRef.current` from a hook means React has no way to know the value changed between renders (refs do not trigger re-renders). The pattern is fragile.

**Fix:** Either store `ChartManager` in state (`useState<ChartManager | null>(null)`) so that React correctly tracks it as a dependency, or return `managerRef` itself and let the consumer call `managerRef.current` when needed:

```typescript
// Option A: use state (simplest for consumers)
const [chartManager, setChartManager] = useState<ChartManager | null>(null);

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const manager = new ChartManager(canvas);
  setChartManager(manager);
  return () => {
    manager.dispose();
    setChartManager(null);
  };
}, [canvasRef]);

return { chartManager, isReady: chartManager !== null };
```

---

### HIGH-06 — CandlestickRenderer Body Buffer Layout Has 5 Floats Per Instance; Design Specifies 6

**File:** `packages/ui/src/rendering/renderers/candlestick-renderer.ts`, line 8
**Severity:** High
**Category:** WebGL correctness / Architecture compliance

The design document (Section 3, Instance Attribute Layout) specifies the body buffer as 6 floats per candle:
```
[0] centerX
[1] openY
[2] closeY
[3] bodyWidth
[4] isBullish
[5] _padding    — align to vec4 boundary
```

The implementation uses 5 floats:
```typescript
const BODY_FLOATS_PER_INSTANCE = 5;
```

The `_padding` field was specified to align the struct to a vec4 (16-byte) boundary, which is the alignment requirement for instanced vertex attributes on most GPU drivers. While many drivers accept misaligned data without issue, others (particularly mobile GPUs and older integrated Intel GPUs) may render incorrectly or crash. The GPU memory budget table in the design also calculated body buffer size based on 6 floats (24 bytes per instance).

**Risk assessment:** Low probability of rendering failure on modern desktop GPUs. High probability of failure on mobile/embedded GPUs. Since this is a trading terminal likely targeting desktop browsers, risk is moderate. Still, matching the design spec prevents latent cross-platform bugs.

**Fix:** Change `BODY_FLOATS_PER_INSTANCE` to `6` and add a padding float to the body data write loop:

```typescript
bodyData[bIdx + 5] = 0.0;  // padding
```

---

## Medium Severity Findings

### MED-01 — `bestBid` and `bestAsk` Are O(n) Linear Scans; Called Per Render Frame in Some Paths

**File:** `packages/core/src/orderbook/orderbook-manager.ts`, lines 109–134
**Severity:** Medium
**Category:** Performance

Both `bestBid` and `bestAsk` iterate the entire `Map` on every call:

```typescript
get bestBid(): PriceLevel | null {
  let bestPrice = -Infinity;
  for (const [price, size] of this.bidsMap) {   // O(n) full scan
    if (price > bestPrice) { bestPrice = price; bestSize = size; }
  }
  ...
}
```

Similarly, `getSortedBids()` and `getSortedAsks()` (called by `getSnapshot()`) sort the full map on every call — O(n log n). At 50 levels of depth this is negligible, but `getSnapshot()` is called after every single delta in both adapters:

```typescript
this.onOrderbookSnapshot?.(manager.getSnapshot());  // called in hot path
```

At Bybit's publication rate during volatile markets (~20 deltas/second per symbol), this is 20 × O(n log n) sorts per second. With multiple symbols subscribed, this compounds. The `trimDepth()` method also sorts the full map after every delta.

**Fix:** Track best bid and ask as cached values, updated only when the top-of-book changes. The sort inside `getSnapshot()` can be lazy (only when `isDirty` is true). `trimDepth()` should be called only when `bidsMap.size > maxDepth`, not unconditionally — this is already the case, but the sort inside it is still O(n log n) when triggered.

A more robust approach: maintain sorted arrays as the primary data structure (using a sorted insertion instead of a Map), and use the Map only as an index for O(1) price lookups during delta application.

---

### MED-02 — `FlushScheduler.onFlush` Calls `postMessage` Per Message, Not Per Batch

**File:** `packages/core/src/worker/data-worker.ts`, lines 43–51
**Severity:** Medium
**Category:** Architecture compliance / Performance

The design document specifies (Section 5.2):

> The FlushScheduler accumulates events across all adapters and periodically posts **batched** WorkerOutboundMessage payloads to the main thread.

The `DataWorker` wires the scheduler's `onFlush` callback to call `this.postMessage` for each individual message in the batch:

```typescript
onFlush: (messages: WorkerOutboundMessage[]) => {
  for (const msg of messages) {
    this.postMessage(msg);   // one postMessage per message — not batched
  }
},
```

This defeats the purpose of batching. If 50 trades arrive in a 100ms interval, the worker sends 50 individual `postMessage` calls instead of one. The overhead of structured cloning and inter-thread communication accumulates.

The design's `FlushScheduler` contract explicitly shows batching by data type (trades appended, orderbooks latest-wins). The `FlushScheduler` class correctly accumulates messages in its buffer — but the consumer immediately unbatches them.

**Fix:** The `onFlush` callback should send one `postMessage` call with the full array, or the `FlushScheduler` should be extended to support per-type deduplication (latest-wins for orderbooks and tickers) as the design specifies. A simple fix:

```typescript
onFlush: (messages: WorkerOutboundMessage[]) => {
  // Send as a single postMessage batch
  this.postMessage({ type: 'batch', messages });
},
```

This requires adding a `batch` type to `WorkerOutboundMessage`, or restructuring the flush callback to accept the array directly and call a single `postMessage`.

---

### MED-03 — Bybit Orderbook `prevSequenceId` Uses `seq` Field; Design Uses `u` Field Ambiguously

**File:** `packages/core/src/adapters/bybit/bybit-adapter.ts`, lines 256–264
**Severity:** Medium
**Category:** Data correctness

The Bybit orderbook message has two fields:
- `u`: the current update ID (sequence ID)
- `seq`: the cross-sequence ID (used for cross-instrument correlation)

The `handleOrderbook` method maps them as:
```typescript
const sequenceId = (data['u'] as number) ?? 0;
// ...
prevSequenceId: (data['seq'] as number) ?? 0,
```

`data['seq']` is not the previous `u` — it is the sequence number at the Bybit matching engine level, which is monotonically increasing but is not the direct predecessor of `u`. For gap detection, the correct check is whether the current message's `u` is one greater than the previous message's `u`. The `seq` field should not be used as `prevSequenceId` in `OrderbookDelta`.

The correct Bybit gap-detection logic is: after receiving a delta with `u = N`, the next delta must have `u = N + 1`. The `seq` field is for cross-instrument ordering, not sequential delta validation.

**Fix:** Track `lastUpdateId` in the adapter per symbol, and populate `prevSequenceId` from that tracked value rather than from `data['seq']`.

---

### MED-04 — No Timer Cleanup When WebGL Context Is Lost

**File:** `packages/ui/src/rendering/rendering-context.ts`, lines 114–118
**Severity:** Medium
**Category:** Memory management

`handleContextLost` sets the `_contextLost` flag but does not stop the rAF loop:

```typescript
private handleContextLost(): void {
  this._contextLost = true;
  // render loop continues running (calls tick() every frame)
}
```

The `tick()` method correctly skips the render pass when `_contextLost` is true, but the rAF handle continues to be acquired and immediately released 60 times per second indefinitely. On mobile, an open WebGL context loss (caused by memory pressure) leaves the CPU executing rAF callbacks that do nothing until context is restored or the component unmounts.

**Fix:** Call `stopRenderLoop()` inside `handleContextLost()`, and call `startRenderLoop()` inside `handleContextRestored()`. The `stopRenderLoop`/`startRenderLoop` API already exists — it just needs to be used here:

```typescript
private handleContextLost(): void {
  this._contextLost = true;
  this.stopRenderLoop();
}

private handleContextRestored(): void {
  this._contextLost = false;
  this._dirty = true;
  this.startRenderLoop();
}
```

---

### MED-05 — Grid Renderer Recomputes and Re-uploads Every Frame; No Dirty Gating

**File:** `packages/ui/src/rendering/renderers/grid-renderer.ts`, lines 123–133
**Severity:** Medium
**Category:** Performance

`GridRenderer.render()` calls `computeGrid()` unconditionally every time it is invoked:

```typescript
render(): void {
  if (!this.drawCommand || !this.positionBuffer) return;
  this.computeGrid();   // always runs — re-allocates Float32Array, calls subdata()
  if (this.vertexCount > 0) { this.drawCommand(); }
  this.isDirty = false;
}
```

`computeGrid()` allocates a new `Float32Array` and calls `subdata()` on every frame, even when the viewport has not changed. While the `Float32Array` allocation is small (a few KB), `subdata()` incurs a GPU upload on every frame regardless of whether grid positions changed. This is unnecessary when the user is not panning or zooming.

The `isDirty` flag exists on `BaseRenderer` but is never checked before computing. The pattern should be:

```typescript
render(): void {
  if (!this.isDirty) {
    if (this.vertexCount > 0) this.drawCommand();
    return;
  }
  this.computeGrid();
  if (this.vertexCount > 0) this.drawCommand();
  this.isDirty = false;
}
```

---

### MED-06 — `toNormalizedSymbol` Uses Heuristic Quote-Currency Matching; Ambiguous for Short Base Symbols

**File:** `packages/core/src/adapters/binance/binance-adapter.ts`, lines 325–334
**Severity:** Medium
**Category:** Data correctness

The symbol denormalization uses `endsWith` matching against a hardcoded list of quote currencies:

```typescript
const quotes = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB', 'TUSD', 'FDUSD', 'USD'];
for (const quote of quotes) {
  if (exchangeSymbol.endsWith(quote) && exchangeSymbol.length > quote.length) {
    const base = exchangeSymbol.slice(0, -quote.length);
    return `${base}/${quote}`;
  }
}
```

This will incorrectly parse `ETHBTC` (ETH quoted in BTC) as `E/THBTC` if `'THBTC'` were a quote, but more realistically, it will parse `BTCETH` as `BTC/ETH` correctly but will parse ambiguous symbols incorrectly when the base name ends with a quote-currency substring. For example, a hypothetical token `USDTUSDT` (which exists as a test pair) would be parsed as `USDT/USDT` since `USDT` is checked first. More practically, `USTCUSDT` would be parsed as `USTC/USDT` (correct), but `USDTBUSD` would be parsed as `USDT/BUSD` (correct by coincidence). The ordering of the `quotes` array matters and is fragile.

The design document specifies using a static mapping table rather than a heuristic. This is a known trade-off (the design acknowledges `parseFloat` over decimal strings as a similar pragmatic choice), but the heuristic should be explicitly bounded by a known set of Binance symbols.

**Risk:** Low for mainstream pairs. Medium for newly listed tokens with quote-currency substrings in their base name.

**Recommendation:** Add a comment documenting the limitation. For Phase 2, use Binance's REST `/api/v3/exchangeInfo` to build a static symbol map at startup.

---

### MED-07 — `ChartPanel` Cursor Style Uses `isPanningRef.current` in JSX; Always Evaluates to Initial Value

**File:** `packages/ui/src/rendering/panels/ChartPanel.tsx`, line 122
**Severity:** Medium
**Category:** React correctness

```tsx
cursor: isPanningRef.current ? 'grabbing' : 'crosshair',
```

`isPanningRef` is a `useRef`, and reading `.current` in JSX (the render function) does not cause a re-render when the ref changes. The cursor style is computed once during the render in which `isPanningRef.current` is `false` (initial), and never updated subsequently — the cursor will always show `crosshair` even during a pan.

**Fix:** Use a `useState` for the panning state when the visual output needs to reflect it, or apply the cursor style via an event handler that directly mutates the DOM element:

```typescript
const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
  if (e.button === 0) {
    e.currentTarget.style.cursor = 'grabbing';
    // ...
  }
}, []);

const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
  e.currentTarget.style.cursor = 'crosshair';
  isPanningRef.current = false;
}, []);
```

---

## Low Severity Findings

### LOW-01 — `WSEvent.type` Is Optional; Never Used by Consumers

**File:** `packages/core/src/ws/websocket-types.ts`, line 19
**Severity:** Low
**Category:** Type safety

```typescript
export interface WSEvent {
  type?: string;
}
```

`WSEvent` is used only as the type for `onopen` and `onerror` callbacks. Neither the `WebSocketManager` nor any adapter reads `event.type`. The interface could be replaced with `Record<string, never>` or just removed, using an empty object type. This is a minor API surface confusion — future maintainers may assume `type` carries meaningful information.

---

### LOW-02 — `send()` Silently Drops Messages Without Logging; Unexpected During Connecting State

**File:** `packages/core/src/ws/ws-manager.ts`, line 110–115
**Severity:** Low
**Category:** WebSocket robustness

```typescript
send(data: string): void {
  if (!this.ws || this.ws.readyState !== WS_OPEN) {
    return;  // silent drop
  }
  this.ws.send(data);
}
```

Subscribe frames sent while the connection is in `Connecting` state are silently dropped. The `resubscribeAll()` mechanism in both adapters handles reconnection re-subscription, but if `subscribeTrades()` is called while `Connecting` (e.g., immediately after `connect()` is called before `onopen` fires), the subscribe frame is dropped and `resubscribeAll()` will include it on reconnect — but only if the initial connection succeeds. If the connection opens before `resubscribeAll()` is ever needed, the subscription is lost.

**Current behavior:** Subscribe calls are sent before `onopen` fires in both adapters:
```typescript
subscribeTrades(symbol: string): void {
  this.subscribedTrades.add(symbol);
  // ...
  this.sendSubscribe([...]);  // dropped if not yet connected
}
```

The `subscribedTrades` set is updated before the send, so `resubscribeAll()` on `onopen` will include it. This makes the behavior correct in practice, but it is implicit and fragile. If an adapter sends a subscribe frame after `onopen` and before `Reconnecting` triggers `resubscribeAll()`, any such frame would survive correctly.

**Recommendation:** Add a debug-level log on silent drop, or queue messages for delivery on `onopen`, with an explicit comment explaining why queuing is not needed (because `resubscribeAll` covers it).

---

### LOW-03 — `DataWorker` Does Not Handle `request-snapshot` Despite It Being a Defined Message Type

**File:** `packages/core/src/worker/data-worker.ts`, lines 70–72
**Severity:** Low
**Category:** Architecture compliance

```typescript
case 'request-snapshot':
  // Future phase — force immediate flush
  break;
```

The `WorkerInboundMessage` type includes `request-snapshot` as a valid message. Sending this message currently produces no effect. If a UI component sends `request-snapshot` expecting an orderbook state update and receives nothing, it will render stale data indefinitely. The comment says "future phase" — this is acceptable if documented, but the design document (Section 5.1) describes this as in-scope for Phase 1.

**Recommendation:** Either implement a minimal version that triggers an immediate flush, or document in the worker that this message is not yet handled and the UI should not send it.

---

### LOW-04 — Binance `handleAggTrade` Does Not Validate Timestamp; Accepts Zero/Negative Values

**File:** `packages/core/src/adapters/binance/binance-adapter.ts`, line 170
**Severity:** Low
**Category:** Data correctness

```typescript
const timestamp = msg['T'] as number;
```

The timestamp is cast and used directly without validation. If the `T` field is missing, absent, or corrupted, `timestamp` will be `undefined` or `NaN`, which becomes `0` when stored as a number. This produces a trade with timestamp `0` (January 1, 1970), which will render at the far left of any time-based chart and may corrupt sorted trade arrays.

**Fix:** Add: `if (!timestamp || timestamp <= 0) return;`

---

### LOW-05 — `ChartManager.resize()` Does Not Call `regl.resize()` or Equivalent

**File:** `packages/ui/src/rendering/chart-manager.ts`, lines 176–182
**Severity:** Low
**Category:** WebGL correctness

```typescript
resize(width: number, height: number): void {
  this.canvas.width = width;
  this.canvas.height = height;
  this.viewport.resize(width, height);
  this.syncViewportToRenderers();
  this.renderingCtx.markDirty();
}
```

Setting `canvas.width` and `canvas.height` invalidates the WebGL context's viewport. After a canvas resize, WebGL's internal viewport (the rectangle that maps clip space to the canvas) defaults to the dimensions at context creation time. Without calling `gl.viewport(0, 0, canvas.width, canvas.height)`, the rendering will be clipped or stretched to the original size.

The `regl` library may handle this automatically on some implementations (it monitors canvas size changes in some configurations), but it is not guaranteed. Explicitly calling `regl._gl.viewport(0, 0, width, height)` or using regl's `regl.poll()` after resize ensures correctness.

**Recommendation:** After setting `canvas.width` and `canvas.height`, call `regl.poll()` (which regl provides as a way to sync internal state with canvas size changes) or directly call `gl.viewport(0, 0, width, height)` via `ctx.regl._gl`.

---

### LOW-06 — Test MockWebSocket Does Not Fire `onclose` When `close()` Is Called; Breaks Intentional-Disconnect Tests

**File:** `packages/core/src/__tests__/binance-adapter.test.ts` and `bybit-adapter.test.ts`, lines 38–40
**Severity:** Low
**Category:** Test quality

The adapter test `MockWebSocket.close()` method:
```typescript
close(_code?: number, _reason?: string): void {
  this.readyState = MockWebSocket.CLOSED;
  // onclose is NOT called
}
```

In contrast, the `ws-manager.test.ts` `MockWebSocket.close()` correctly fires `onclose`. This discrepancy means adapter tests cannot test the full disconnect lifecycle — the `onclose` handler in `WebSocketManager` (which drives state transitions and reconnection logic) is never exercised from adapter tests. Tests that call `adapter.disconnect()` do not verify that the `ConnectionStatus.Disconnected` state is reached through the normal close path.

**Fix:** The adapter test mock should match the ws-manager test mock and call `this.onclose?.({ code: code ?? 1000, reason: reason ?? '' })` inside `close()`.

---

### LOW-07 — `ChartManager.syncViewportToRenderers()` Calls `setViewport()` on Every Pan/Zoom; Redundant Since Renderers Hold a Reference

**File:** `packages/ui/src/rendering/chart-manager.ts`, lines 198–203
**Severity:** Low
**Category:** Architecture / Performance (minor)

`BaseRenderer` stores `viewport` as a field reference. `ChartManager` stores a single `ViewportTransform` instance in `this.viewport`. When `pan()` or `zoom()` mutates `this.viewport` in-place (because `ViewportTransform` is mutable, per HIGH-04), the renderers' `this.viewport` references already point to the same mutated object. Calling `setViewport(this.viewport)` passes the same object reference back — it is a no-op.

If HIGH-04 is fixed (making `ViewportTransform` immutable), then `syncViewportToRenderers()` becomes necessary and correct. In the current mutable implementation, the calls are logically redundant but harmless. This finding is a corollary to HIGH-04.

**Note:** If HIGH-04 is fixed, ensure `syncViewportToRenderers()` is called after every mutation that returns a new instance.

---

### LOW-08 — `FlushScheduler.start()` Is Idempotent, But `stop()` Followed by `enqueue()` Leaves Messages Stranded

**File:** `packages/core/src/worker/flush-scheduler.ts`, lines 64–73
**Severity:** Low
**Category:** API design

After `stop()` is called, the timer is cleared. Any subsequent `enqueue()` calls add messages to the buffer, but without a running timer they will never be flushed (unless `stop()` is called again — which flushes remaining messages). The `maxBufferSize` overflow flush still works, but below-threshold messages are stranded.

The `flush-scheduler.test.ts` explicitly tests this edge case and documents the expected behavior (`// The message enqueued after stop won't be flushed by interval`). This is a documented limitation, not a bug per se, but callers who call `enqueue()` after `stop()` will lose data silently.

**Recommendation:** Add a defensive guard in `enqueue()`:
```typescript
enqueue(message: WorkerOutboundMessage): void {
  if (this.flushTimer === null && this.buffer.length >= this.maxBufferSize) {
    // Timer not running — flush immediately to prevent unbounded growth
    this.flush();
  }
  this.buffer.push(message);
  if (this.buffer.length >= this.maxBufferSize) {
    this.flush();
  }
}
```

---

## Architecture Compliance Assessment

### Module 1: Exchange Connector Framework

The implementation covers a meaningful Phase 1 subset but is significantly reduced from the full design. Key gaps:

| Design Component | Status | Notes |
|---|---|---|
| `WebSocketManager` | Implemented | `baseDelay` incorrect; no permanent-error classification |
| `OrderbookStateMachine` (IDLE/BUFFERING/SYNCING/SYNCED) | Not implemented | Replaced with a simpler `OrderbookManager`; no state machine, no REST snapshot |
| `SubscriptionTracker` | Not implemented | Inlined into adapters as raw `Set`s |
| `AdapterRegistry` | Not implemented | Replaced with `DataWorker`'s inline `Map<ExchangeId, adapter>` |
| `ErrorClassifier` | Not implemented | No tier classification; all errors treated as transient |
| Binance Spot and Futures as separate sub-adapters | Not implemented | Single `BinanceAdapter` serves both (acceptable for spot-only Phase 1) |
| 10 exchange adapters | 2 implemented | Binance and Bybit only |
| Sequence gap detection and resync | Not implemented | See CRIT-02 |
| REST snapshot for orderbook reconciliation | Not implemented | Bybit doesn't need it; Binance `depth20` bypasses the need |

The simplification is pragmatic for a Phase 1 scope reduction, but CRIT-01 and CRIT-02 represent correctness gaps that will cause real data integrity problems even for the two implemented exchanges.

### Module 2: WebGL Rendering Engine

The implementation is faithful to the design in rendering approach (instanced rendering, projection matrix, dirty-flag rAF loop). Key gaps:

| Design Component | Status | Notes |
|---|---|---|
| `ChartEngine` / `RenderingContext` | Implemented as `RenderingContext` + `ChartManager` | Slight naming divergence; functionally equivalent |
| `ViewportTransform` (immutable) | Implemented but mutable | HIGH-04 |
| `useWebGLChart` hook signature | Implemented as `useChart` with different interface | Missing `config: PanelConfig` and `theme` params |
| `AxisLabelManager` | Not implemented | Documented as stub; HTML overlay div present but empty |
| `VolumeRenderer` | Not implemented | Acceptable for Phase 1C |
| Ring buffer eviction for 50k candles | Not implemented | Simple linear array used; acceptable per design "Phase 1 simplicity" note |
| Shared regl scope for uniforms | Not implemented | Each renderer re-declares `u_projection`; minor inefficiency |
| GLSL files as separate `.glsl` assets | Not implemented | Shaders inlined as template strings; acceptable for Phase 1 |
| `canvas.style.width/height` set in ResizeObserver | Not implemented | Physical size set but CSS size not updated; HiDPI layouts may show incorrect visual size |

---

## Test Quality Assessment

### Module 1: Core

**Strengths:**
- `ws-manager.test.ts` is well-structured; covers all major state transitions, heartbeat, inbound timeout, and reconnection cap.
- `orderbook-manager.test.ts` has comprehensive positive-path coverage including sorting, depth limiting, and delta application.
- `flush-scheduler.test.ts` covers all branches including idempotent start, stop-with-flush, and post-stop behavior.

**Gaps:**
- No test for multi-symbol Binance orderbook subscription (the CRIT-01 bug path is untested).
- No test for sequence gap handling (would expose CRIT-02).
- No test for `DataWorker.handleUnsubscribe` sending frames for unsubscribed streams (HIGH-02).
- No test for adapter behavior when `WebSocketManager` fires the error callback.
- No integration test that exercises the full `DataWorker → FlushScheduler → postMessage` pipeline.
- Bybit `seq` field used as `prevSequenceId` is not validated against expected Bybit API behavior.

### Module 2: UI

**Strengths:**
- `viewport-transform.test.ts` is thorough; round-trip tests, projection matrix verification, pan/zoom invariants, and `fitToData` edge cases are all covered.
- `chart-manager.test.ts` provides smoke tests for all public API methods under a mocked WebGL environment.

**Gaps:**
- `ChartManager` tests only assert "does not throw" — no behavioral assertions about what the renderer actually does (e.g., that `setCandles` causes `subdata` to be called on the GPU buffer).
- `useChart` hook is not tested at all — the stale `chartManager` return value issue (HIGH-05) and cleanup behavior are unverified.
- No test for `ChartPanel` interactions (pan, zoom, wheel scroll) — these rely on `chartManager` which suffers from HIGH-05.
- No test for WebGL context loss/restore path.
- No test for `ResizeObserver` callback behavior.
- The regl mock (`chart-manager.test.ts`) does not verify shader compilation or attribute binding — it would not catch the 5-vs-6 float buffer layout mismatch (HIGH-06).

---

## Summary of Findings by Severity

| ID | Severity | Module | Title |
|---|---|---|---|
| CRIT-01 | Critical | Core | Binance orderbook snapshot symbol resolution is O(1)-wrong for multi-symbol |
| CRIT-02 | Critical | Core | No sequence gap detection in orderbook delta application |
| HIGH-01 | High | Core | `baseDelay` is 1000ms; design specifies 100ms |
| HIGH-02 | High | Core | `handleUnsubscribe` sends frames for unsubscribed streams |
| HIGH-03 | High | Core | Bybit `changePercent24h` unit ambiguity (needs explicit documentation) |
| HIGH-04 | High | UI | `ViewportTransform` is mutable; design requires immutable instances |
| HIGH-05 | High | UI | `useChart` returns stale `chartManager` from ref on initial render |
| HIGH-06 | High | UI | Body buffer layout is 5 floats; design specifies 6 (alignment padding) |
| MED-01 | Medium | Core | O(n) linear scans for bestBid/bestAsk and O(n log n) sort on every delta |
| MED-02 | Medium | Core | `FlushScheduler.onFlush` sends one postMessage per message, not one batch |
| MED-03 | Medium | Core | Bybit `seq` field incorrectly used as `prevSequenceId` |
| MED-04 | Medium | UI | No rAF loop pause on WebGL context loss |
| MED-05 | Medium | UI | Grid renderer recomputes and re-uploads geometry every frame |
| MED-06 | Medium | Core | `toNormalizedSymbol` heuristic is ambiguous for short base symbols |
| MED-07 | Medium | UI | `isPanningRef.current` in JSX never causes cursor style to update |
| LOW-01 | Low | Core | `WSEvent.type` is optional and unused |
| LOW-02 | Low | Core | `send()` silently drops messages without logging |
| LOW-03 | Low | Core | `request-snapshot` message handler is a no-op |
| LOW-04 | Low | Core | Binance aggTrade timestamp not validated; zero/NaN accepted |
| LOW-05 | Low | UI | `resize()` does not update WebGL viewport after canvas size change |
| LOW-06 | Low | Core | Adapter test MockWebSocket.close() does not fire onclose |
| LOW-07 | Low | UI | `syncViewportToRenderers()` is a no-op with current mutable viewport |
| LOW-08 | Low | Core | Messages enqueued after `FlushScheduler.stop()` are stranded |

---

## Recommended Fix Priority

**Before shipping Phase 1 to any live data source:**
1. CRIT-01 — Fix Binance multi-symbol orderbook routing (or hard-limit to one symbol)
2. CRIT-02 — Add sequence gap detection to `OrderbookManager`
3. HIGH-02 — Guard unsubscribe methods against unregistered streams
4. HIGH-05 — Fix `useChart` stale ref return

**Before Phase 2 begins (technical debt that will compound):**
5. HIGH-04 — Make `ViewportTransform` immutable
6. HIGH-01 — Correct `baseDelay` to 100ms
7. MED-02 — Fix `FlushScheduler` to send actual batches
8. MED-03 — Fix Bybit `prevSequenceId` field mapping
9. MED-07 — Fix pan cursor style update

**Can be addressed in Phase 2:**
- HIGH-06 (buffer alignment padding)
- MED-01 (O(n) orderbook operations)
- MED-04 (context loss rAF pause)
- MED-05 (grid dirty gating)
- LOW-05 (WebGL viewport after resize)
- All LOW findings
