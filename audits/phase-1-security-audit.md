# Phase 1 Security Audit

**Date:** 2026-03-17
**Auditor:** Security Audit Agent
**Scope:** Phase 1 implementation — WebSocket manager, Binance/Bybit adapters, data worker, flush scheduler, orderbook manager, WebGL rendering engine

---

## Executive Summary

The Phase 1 codebase is well-structured and avoids the most acute vulnerability classes. No XSS injection surfaces, no prototype pollution, and no user-controlled shader code were found. However, several medium-severity issues and a collection of low-severity weaknesses require attention before a production release. Three known CVEs exist in runtime and development dependencies. Remediation guidance is provided for each finding.

---

## Findings

### SEV-1 (High) — Fastify Content-Type Tab-Character Body Validation Bypass

**File:** `packages/server` (dependency)
**CVE:** GHSA-jx2c-rxcm-jvmq
**Package:** `fastify@4.29.1`

A tab character inserted into the `Content-Type` request header causes Fastify to skip body schema validation entirely. An attacker can send arbitrary payloads that bypass all JSON Schema validation rules applied to routes.

**Remediation:** Upgrade `fastify` to `>=5.7.2`. This is a breaking major-version upgrade (v4 → v5). Review all route handler changes required by the v5 migration guide before deploying.

---

### SEV-2 (Medium) — No Runtime Validation on WorkerInboundMessage

**Files:**
- `packages/core/src/worker/data-worker.ts` — `initializeWorker()`, `handleMessage()`

`initializeWorker()` wires `onmessage` directly to `worker.handleMessage(event.data)` with no type guard or structural validation. `WorkerInboundMessage` is a TypeScript discriminated union, but TypeScript types are erased at runtime. A caller (or a compromised main thread) could post a message with an unexpected shape — missing fields, wrong field types, or an unknown `type` value — and the switch/case dispatcher will silently hit the `default` (no-op) path for unrecognised types but will not guard against fields being the wrong type on recognised branches.

Specific risk: the `subscribe` handler accesses `message.exchanges` and `message.topics` with `for...of` iteration. If either field is not iterable (e.g., `null`, a number, or a string), a runtime `TypeError` is thrown inside the worker. Depending on the worker's error boundary, this may crash the worker entirely and drop all market data until a page reload.

**Remediation:** Add a structural validation function that checks the `type` field is a known string literal and that required fields have the expected types before calling `handleMessage`. Example check at entry point:

```ts
g.onmessage = (event: WorkerMessageEvent) => {
  if (!isValidWorkerInboundMessage(event.data)) {
    console.warn('[DataWorker] Dropped malformed message', event.data);
    return;
  }
  worker.handleMessage(event.data);
};
```

---

### SEV-3 (Medium) — No URL Validation on WebSocket Endpoint

**File:** `packages/core/src/ws/ws-manager.ts` — `WebSocketManagerConfig.url`, `openSocket()`

The `url` field accepted by `WebSocketManagerConfig` is passed directly to `new WSConstructor(this.url)` without validation. If a caller passes a non-`wss://` URL (e.g., `ws://`, `http://`, or a data URI), the connection will be established without TLS. Additionally, the error message exposed on max reconnect failure (`Max reconnect attempts (N) exceeded for ${this.url}`) echoes the raw URL into the `Error` object. If this error is surfaced to a UI component or logged to an external service, a misconfigured URL (which may contain credentials or internal hostnames) can be inadvertently disclosed.

**Remediation:**
1. Validate `url` in the constructor with a `URL` parse and enforce the `wss:` scheme for production builds:
   ```ts
   const parsed = new URL(config.url);
   if (parsed.protocol !== 'wss:') {
     throw new Error('WebSocketManager requires a wss:// endpoint');
   }
   ```
2. In the reconnect failure error message, omit the URL or redact credentials: `Max reconnect attempts exceeded for ${new URL(this.url).hostname}`.

---

### SEV-4 (Medium) — esbuild Dev Server CORS Bypass (Development Dependency)

**CVE:** GHSA-67mh-4wv8-2f99
**Package:** `esbuild@0.21.5` (transitive via `vite@5.4.21` → `vitest@1.6.1`)

The vulnerable version of esbuild allows any website to send requests to the Vite/esbuild development server and read the response, bypassing CORS protection. This is exploitable only when the developer's machine is running the dev server and a malicious website is open in the same browser.

**Remediation:** This is a dev-only dependency. Upgrade Vite to `>=5.4.3` or Vitest to `>=2.0.0` (which pins esbuild `>=0.25.0`). Ensure developers do not load untrusted websites in the same browser profile while running the dev server.

---

### SEV-5 (Low) — Unvalidated Numeric Fields Allow NaN/Infinity into Orderbook State

**Files:**
- `packages/core/src/adapters/binance/binance-adapter.ts` — `handleDepthSnapshot()`
- `packages/core/src/adapters/bybit/bybit-adapter.ts` — `handleOrderbook()`
- `packages/core/src/orderbook/orderbook-manager.ts` — `applySnapshot()`, `applyDelta()`

Both adapters call `parseFloat()` on the `price` and `size` string fields from WebSocket messages and pass the results directly to `OrderbookManager` without a subsequent `isNaN` / `isFinite` check. In `handleAggTrade` and `handlePublicTrade` the adapters do check `isNaN(price) || isNaN(amount)` for trades, but the depth snapshot paths do not apply the same guard.

If an exchange sends a malformed orderbook level (e.g., `["", "0"]` or `["NaN", "1.5"]`), `parseFloat("")` returns `NaN`, which is then set as a Map key in `OrderbookManager`. `NaN` as a `Map` key behaves correctly in JavaScript (it is coalesced to a single key), but `NaN`-keyed levels will survive indefinitely because the delete-on-zero-size logic compares `level.size === 0`, which is `false` for `NaN`. The NaN entry also infects any spread or best-bid/ask computation that flows downstream. `Infinity` as a price would similarly corrupt the best bid/ask getters.

**Remediation:** Add a guard in both snapshot and delta paths, mirroring what is done for trades:

```ts
const bids: PriceLevel[] = rawBids
  .map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) }))
  .filter(l => isFinite(l.price) && l.price > 0 && isFinite(l.size) && l.size >= 0);
```

Apply the same filter to asks. Additionally, add the same guard at the entry point of `applySnapshot` and `applyDelta` in `OrderbookManager` as a defensive layer.

---

### SEV-6 (Low) — Fastify DoS via Unbounded Memory Allocation in `sendWebStream`

**File:** `packages/server` (dependency)
**CVE:** GHSA-mrq3-vjjr-p77c
**Package:** `fastify@4.29.1`

A crafted streaming response can cause unbounded memory growth in the Fastify server process. This is only relevant if the server uses `reply.send()` with a `ReadableStream`. The Phase 1 server scope is not fully audited here, but the vulnerability exists in the installed package.

**Remediation:** Addressed by the same `fastify >=5.7.3` upgrade recommended in SEV-1.

---

### SEV-7 (Low) — Symbol Validation Insufficient Against Injection into Subscription Topic Strings

**Files:**
- `packages/core/src/adapters/binance/binance-adapter.ts` — `subscribeTrades()`, `subscribeOrderbook()`, `subscribeTicker()`
- `packages/core/src/adapters/bybit/bybit-adapter.ts` — same methods

Both adapters build subscription topic strings by interpolating the caller-provided `symbol` argument directly:

```ts
// Binance
`${exchangeSymbol.toLowerCase()}@aggTrade`
// Bybit
`publicTrade.${exchangeSymbol}`
```

`toExchangeSymbol` only strips the `/` separator. If a caller passes a symbol containing special characters (e.g., `BTC/USDT\n{"method":"UNSUBSCRIBE",...}`), the resulting JSON subscription frame could be malformed or, in degenerate parsing scenarios, inject additional JSON keys. The `WorkerInboundMessage` `symbol` field is typed as `string` with no length or character-set restriction.

In the current architecture this requires a compromised main thread (the worker only receives messages from the same origin), so severity is low. It becomes more relevant if subscription APIs are exposed to user-configurable symbols from external input.

**Remediation:** Validate the `symbol` argument in each subscribe method against an allowlist regex before use:

```ts
private validateSymbol(symbol: string): void {
  if (!/^[A-Z0-9]{1,10}\/[A-Z0-9]{1,10}$/.test(symbol)) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }
}
```

---

### SEV-8 (Low) — Candles Array Grows Without Bound

**Files:**
- `packages/ui/src/rendering/chart-manager.ts` — `appendCandle()`
- `packages/ui/src/rendering/renderers/candlestick-renderer.ts` — `appendCandle()`

`ChartManager.appendCandle()` pushes new candles onto a plain JS array with no maximum length check. For a long-running session receiving 1-minute candles, the array grows by ~1440 entries per day, ~525 000 per year. While the GPU buffer is bounded by `DEFAULT_MAX_CANDLES = 50_000`, the JavaScript-side array is unbounded. This leads to steadily increasing GC pressure and, in extreme cases, an OOM crash of the renderer tab.

**Remediation:** Enforce a maximum candle count in `appendCandle()`, evicting the oldest entry when the limit is reached. A ring buffer or a simple `if (this.candles.length > MAX) this.candles.shift()` is sufficient for Phase 1.

---

### SEV-9 (Low) — Error Messages from Adapter Connection Failures Sent to Main Thread Verbatim

**File:** `packages/core/src/worker/data-worker.ts` — `getOrCreateAdapter()` error handler

```ts
adapter.connect().catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  this.postMessage({
    type: 'error',
    code: 'CONNECT_FAILED',
    message: `Failed to connect to ${exchangeId}: ${errorMessage}`,
  });
});
```

Raw error messages from failed WebSocket connections are forwarded directly to the main thread. Node.js or browser network errors can contain internal details (e.g., hostnames, proxy addresses, TLS certificate subject information) that should not be exposed to the UI layer or any downstream telemetry.

**Remediation:** Sanitise the error message before forwarding. Log the full error internally (with a structured logger) and send only a safe, generic message to the main thread:

```ts
this.postMessage({
  type: 'error',
  code: 'CONNECT_FAILED',
  message: `Connection to ${exchangeId} failed. See worker logs for details.`,
});
```

---

### SEV-10 (Informational) — WebGL Shaders Use Only Static, Hardcoded Source

**Files:**
- `packages/ui/src/rendering/renderers/candlestick-renderer.ts`
- `packages/ui/src/rendering/renderers/crosshair-renderer.ts`
- `packages/ui/src/rendering/renderers/grid-renderer.ts`

All GLSL shader source code is defined as static string literals inline in the renderer `init()` methods. There is no user-controlled or externally-loaded shader code. Shader compilation errors are handled by regl internally and do not reach the DOM.

**No action required.** This finding is recorded for completeness. Any future feature that loads shader source from user configuration or remote URLs must undergo a separate review.

---

### SEV-11 (Informational) — JSON Parsing Is Wrapped in Try/Catch; No Prototype Pollution Risk

**Files:**
- `packages/core/src/adapters/binance/binance-adapter.ts` — `handleMessage()`
- `packages/core/src/adapters/bybit/bybit-adapter.ts` — `handleMessage()`

Both adapters wrap `JSON.parse()` in `try/catch` and return early on failure. The parsed result is typed as `Record<string, unknown>`, which means field access is explicit and keyed — there is no use of `Object.assign`, `_.merge`, or recursive property copying from untrusted input. The `__proto__`, `constructor`, and `prototype` keys cannot influence the object prototype chain through plain property access on a `Record<string, unknown>`.

**No action required.** Document this pattern in the contributing guide to prevent future use of deep-merge utilities on untrusted JSON.

---

### SEV-12 (Informational) — WebSocket `onerror` Exposes URL in Error Object

**File:** `packages/core/src/ws/ws-manager.ts` — `openSocket()`

```ts
this.ws.onerror = () => {
  this.onError?.(new Error(`WebSocket error on ${this.url}`));
};
```

The URL is included in the error object passed to `onError`. For the Binance and Bybit adapters this surfaces as a `console.warn`. If a future consumer forwards these errors to an external error tracking service (e.g., Sentry), the exchange endpoint URL including any query parameters would be transmitted. Currently the default URLs contain no secrets, but this is worth noting.

**Remediation:** Same as SEV-3 point 2: redact the URL to hostname only in error messages.

---

## Checklist Summary

| # | Area | Finding | Severity | Status |
|---|------|---------|----------|--------|
| SEV-1 | Dependencies | `fastify@4.29.1` Content-Type validation bypass (GHSA-jx2c-rxcm-jvmq) | High | Open |
| SEV-2 | Worker | No runtime validation on `WorkerInboundMessage` before dispatch | Medium | Open |
| SEV-3 | WebSocket | No URL scheme enforcement; URL leaked in error messages | Medium | Open |
| SEV-4 | Dependencies | `esbuild@0.21.5` dev server CORS bypass (GHSA-67mh-4wv8-2f99) | Medium | Open |
| SEV-5 | Orderbook | `NaN`/`Infinity` admitted to orderbook Maps via unguarded `parseFloat` | Low | Open |
| SEV-6 | Dependencies | `fastify@4.29.1` DoS via streaming unbounded memory (GHSA-mrq3-vjjr-p77c) | Low | Open |
| SEV-7 | Adapters | Symbol string not validated; injectable into subscription topic frames | Low | Open |
| SEV-8 | Rendering | `candles` array grows without bound; no eviction policy | Low | Open |
| SEV-9 | Worker | Raw network error messages forwarded verbatim to main thread | Low | Open |
| SEV-10 | WebGL | Shader source is static — no user-controlled input | Info | Closed |
| SEV-11 | JSON | `JSON.parse` guarded; no prototype pollution path found | Info | Closed |
| SEV-12 | WebSocket | URL exposed in `onerror` event error object | Info | Open |

---

## Recommended Remediation Priority

1. **Immediately (before any public deployment):** SEV-1 — upgrade Fastify to v5.7.3+.
2. **Before Beta:** SEV-2 (worker message validation), SEV-3 (WSS enforcement and URL redaction), SEV-4 (upgrade Vite/Vitest for dev environments), SEV-5 (NaN guard in orderbook paths).
3. **Before GA:** SEV-7 (symbol validation allowlist), SEV-8 (candle array eviction), SEV-9 (sanitise worker error messages), SEV-12 (redact URL from onerror).
