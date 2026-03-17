# Phase 0 Monorepo Scaffold — Code Review

**Date:** 2026-03-17
**Reviewer:** code-reviewer agent
**Scope:** All source files in `packages/types`, `packages/shared`, `packages/core`, `packages/ui`, `packages/server`, plus root configs.

---

## Summary

The scaffold is well-structured for a Phase 0 baseline. Type safety is largely sound, package boundaries are respected, and the build toolchain is correctly wired. The findings below are real issues that should be tracked, not nitpicks. No `any` types, no circular dependencies, and no suppressed type errors were found.

---

## Findings

### Critical

---

#### C-1 — `BaseExchangeAdapter` casts a string literal instead of using the enum

**File:** `packages/core/src/adapters/base-adapter.ts:36`

```ts
this._status = 'disconnected' as ConnectionStatus;
```

The comment directly above this line admits the reason: *"avoid circular issues"*. This cast bypasses the type system entirely — any string can be forced into `ConnectionStatus` with this pattern. The real problem is that `ConnectionStatus` is an enum exported from `@terminal/types`, which is already a declared dependency of `@terminal/core`, so there is no circular dependency here. The comment is incorrect and the cast is unnecessary.

The same unsafe cast appears in the test file at lines 9 and 13 in `packages/core/src/__tests__/core.test.ts`.

**Fix:** Import and use the enum value directly.

```ts
// base-adapter.ts
import { ConnectionStatus } from '@terminal/types';
// ...
this._status = ConnectionStatus.Disconnected;

// core.test.ts
import { ConnectionStatus } from '@terminal/types'; // remove `type` keyword
// ...
this.setStatus(ConnectionStatus.Connected);
```

---

#### C-2 — `ExchangeAdapter` interface is missing `Ticker` and `Liquidation` callbacks and subscriptions

**File:** `packages/types/src/exchange/adapter.ts`

The interface exposes `subscribeTicker` / `unsubscribeTicker` but provides no `onTicker` callback. `LiquidationEvent` is a fully-defined type in `packages/types/src/market/liquidation.ts` and `'liquidations'` is a valid `SubscriptionTopic`, yet there is no `subscribeLiquidations`, `unsubscribeLiquidations`, or `onLiquidation` on the interface.

The `WorkerOutboundMessage` type in `packages/types/src/worker/messages.ts` already has a `'ticker'` message variant, which means the worker layer expects ticker data to flow through but the adapter contract has no way to deliver it. This will force every downstream implementor to invent their own ad-hoc callback property, breaking the normalization contract.

**Fix:** Add the missing members to `ExchangeAdapter` and stub them in `BaseExchangeAdapter`.

```ts
// adapter.ts — additions
import type { Ticker } from '../market/ticker.js';
import type { LiquidationEvent } from '../market/liquidation.js';

subscribeLiquidations(symbol: string): void;
unsubscribeLiquidations(symbol: string): void;

onTicker: ((ticker: Ticker) => void) | null;
onLiquidation: ((event: LiquidationEvent) => void) | null;
```

---

### High

---

#### H-1 — `@terminal/core` declares `@terminal/shared` as a dependency but never imports it

**File:** `packages/core/package.json:22`, `packages/core/tsconfig.json` references `../shared`

No file under `packages/core/src/` imports anything from `@terminal/shared`. The unused dependency adds an unnecessary build-order constraint via the `tsconfig.json` project reference and will mislead future contributors into thinking `shared` utilities are available from the base adapter.

**Fix:** Remove `"@terminal/shared": "workspace:*"` from `packages/core/package.json` and remove `{ "path": "../shared" }` from `packages/core/tsconfig.json`.

---

#### H-2 — `vite.config.ts` uses `__dirname` in an ESM context

**File:** `packages/ui/vite.config.ts:9`

```ts
'@': path.resolve(__dirname, './src'),
```

The `packages/ui/package.json` declares `"type": "module"`, making all `.ts` / `.js` files in the package ES modules. `__dirname` is not available in native ESM; it is a CommonJS global. Vite currently polyfills `__dirname` for config files, but this is an implicit runtime behaviour that is not guaranteed across Vite versions and will silently fail if the config is ever run outside Vite (e.g., in a custom script or test).

**Fix:** Use `import.meta.url` with `fileURLToPath`:

```ts
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
```

---

#### H-3 — `isMainModule` detection in server entry is fragile

**File:** `packages/server/src/index.ts:37-40`

```ts
const isMainModule =
  typeof import.meta.url === 'string' &&
  import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') ?? '');
```

This approach has two problems:

1. `import.meta.url` is always a `string` in an ESM context, so the `typeof` guard is dead code.
2. `import.meta.url` is a full `file://` URL (e.g., `file:///home/user/.../dist/index.js`). `process.argv[1]` is a POSIX path (e.g., `/home/user/.../dist/index.js`). The `endsWith` check happens to work on Linux because the POSIX path is a suffix of the URL string, but it breaks if `argv[1]` is a relative path (e.g., when invoked as `node ./dist/index.js`), and it is fragile on Windows even with the backslash replace.

The idiomatic Node.js ESM pattern is:

```ts
import { fileURLToPath } from 'node:url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
```

---

#### H-4 — `App.test.tsx` imports `act` from the deprecated `react-dom/test-utils` path

**File:** `packages/ui/src/__tests__/App.test.tsx:4`

```ts
import { act } from 'react-dom/test-utils';
```

`react-dom/test-utils` was deprecated in React 18 and removed in React 19. The correct import since React 18 is:

```ts
import { act } from 'react';
```

This will produce a deprecation warning today and will be a broken import in any future React 19 upgrade.

---

#### H-5 — `OHLCVCandle` has no `exchange` or `symbol` fields, making it unidentifiable in isolation

**File:** `packages/types/src/market/candle.ts`

Every other market data type (`NormalizedTrade`, `OrderbookSnapshot`, `Ticker`, `LiquidationEvent`) carries `exchange: ExchangeId` and `symbol: string` for traceability. `OHLCVCandle` has neither. The `WorkerOutboundMessage` for `candle-update` carries `symbol` at the message level, but the candle itself cannot be passed around independently without losing its origin.

**Fix:** Add `exchange: ExchangeId` and `symbol: string` to `OHLCVCandle`, or document explicitly (with a JSDoc note) that the candle is always used within a context that carries those fields, so the omission is intentional.

---

### Medium

---

#### M-1 — `normalizeSymbol` does not handle hyphen-separated symbols

**File:** `packages/shared/src/utils/symbol.ts:11`

The function correctly handles slashed symbols (`BTC/USDT`) and concatenated symbols (`BTCUSDT`), but exchanges such as Coinbase and Kraken use hyphen-separated symbols (`BTC-USDT`). Passing `'BTC-USDT'` through the current function returns `'BTC-/USDT'` because `-USDT` is tested as an endsWith match.

**Fix:** Add a hyphen check before the concatenated-symbol path:

```ts
if (symbol.includes('-')) {
  const [base, quote] = symbol.split('-');
  if (base && quote) return `${base.toUpperCase()}/${quote.toUpperCase()}`;
}
```

---

#### M-2 — `normalizeSymbol` has no input validation; `NaN`/`Infinity` inputs to number utilities are unguarded

**File:** `packages/shared/src/utils/symbol.ts`, `packages/shared/src/utils/number.ts`

`normalizeSymbol('')` returns an empty string silently. `formatPrice(NaN)` returns the string `"NaN"` and `formatPrice(Infinity)` returns `"∞"`, both of which would render in a UI without any indication of a data error. For a financial terminal, silent bad values are dangerous.

This is a Medium because Phase 0 has no real data flow yet, but the functions need guards before Phase 1 connects live data.

---

#### M-3 — `PanelConfig.timeframe` and `PanelConfig.exchanges` use redundant `| undefined` with `exactOptionalPropertyTypes`

**File:** `packages/types/src/ui/panel.ts:38-40`

```ts
timeframe?: CandleTimeframe | undefined;
exchanges?: ExchangeId[] | undefined;
```

With `exactOptionalPropertyTypes: true` in `tsconfig.base.json`, an optional property `field?: T` already means the property may be absent. Explicitly writing `| undefined` is redundant and slightly misleading — it implies the author was uncertain about the semantics of `exactOptionalPropertyTypes`. Under this flag, if you need to explicitly assign `undefined`, you should write `| undefined`; if you only want the field to be potentially absent, just `?: T` is sufficient. Given these fields represent absence of a choice (not an explicit "set to undefined"), the `| undefined` should be removed.

**Fix:**

```ts
timeframe?: CandleTimeframe;
exchanges?: ExchangeId[];
```

---

#### M-4 — `TIMEFRAMES_SORTED` relies on `Object.keys` insertion order

**File:** `packages/shared/src/constants/timeframes.ts:28-30`

```ts
export const TIMEFRAMES_SORTED: readonly CandleTimeframe[] = (
  Object.keys(TIMEFRAME_MS) as CandleTimeframe[]
).sort((a, b) => TIMEFRAME_MS[a] - TIMEFRAME_MS[b]);
```

The `.sort()` call does produce a correctly sorted array, but it receives `Object.keys(TIMEFRAME_MS)` which depends on the insertion order of the object literal in the source file. This creates a hidden coupling: if someone adds a new timeframe to `TIMEFRAME_MS` out of order, `TIMEFRAMES_SORTED` will still sort correctly (the `.sort()` is real), but only as long as `TIMEFRAME_MS[key]` is always defined for every key. With `noUncheckedIndexedAccess: true`, the cast `as CandleTimeframe[]` suppresses the `string[]` type that `Object.keys` returns, which means if `TIMEFRAME_MS` gains new keys, the cast silently includes them without any type error.

The real fix is to derive `TIMEFRAMES_SORTED` from a typed constant rather than `Object.keys`:

```ts
export const TIMEFRAMES_SORTED: readonly CandleTimeframe[] = [
  '1s', '5s', '15s', '30s',
  '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h', '6h', '12h',
  '1d', '1w',
] as const;
```

This is exhaustiveness-checked at compile time (TypeScript will error if you remove an entry or misspell one) and requires no runtime sort.

---

#### M-5 — `buildServer` in `@terminal/server` has no explicit return type annotation

**File:** `packages/server/src/index.ts:7`

```ts
export function buildServer() {
```

The return type is inferred as the Fastify instance type, which is correct but opaque to readers. For a public export that tests depend on, an explicit return type (`FastifyInstance`) makes the API contract clear and guards against Fastify version upgrades silently changing the inferred shape.

---

#### M-6 — ESLint config does not enforce React-specific rules

**File:** `eslint.config.js`

The config only applies `tseslint.configs.recommended`. For the `@terminal/ui` package this means no enforcement of React hooks rules (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`) or React-specific best practices. Phase 0 has a trivial App component, but this will be a source of bugs the moment hooks are introduced in Phase 1.

**Fix:** Add `eslint-plugin-react-hooks` to the workspace devDependencies and configure it for files under `packages/ui/src`.

---

### Low

---

#### L-1 — `ConnectionStatus` enum vs union type inconsistency

**File:** `packages/types/src/exchange/connection.ts:19`

`ConnectionStatus` is a `const enum`-style string enum while `ExchangeId`, `SubscriptionTopic`, `CandleTimeframe`, `PanelType`, and `LinkColor` are all union types. The project's own review criteria flag "correct use of enums vs union types." Enums carry a runtime cost (they emit a JavaScript object), require a value import (not `import type`), and create friction when crossing the worker boundary (values must be serializable). Union types have none of these costs.

This is Low because the enum is already used consistently and changing it is a breaking refactor. The decision to use an enum here may be intentional (to enable `Object.values(ConnectionStatus)` in tests), but the inconsistency should be documented or resolved.

---

#### L-2 — `server.test.ts` creates a single server instance shared across tests but closes it after each test

**File:** `packages/server/src/__tests__/server.test.ts:5-9`

```ts
const server = buildServer();

afterEach(async () => {
  await server.close();
});
```

`buildServer()` is called once at module scope, creating a single server. After the first test, `afterEach` closes it. The second test (if added) would call `server.inject` on a closed server. This pattern should be `beforeEach` / `afterEach` with `let server` to recreate a fresh instance per test.

---

#### L-3 — `@terminal/types` barrel exports `PanelType` as a `type` but it is used as a value in application code

**File:** `packages/types/src/index.ts:19`

```ts
export type { PanelType, PanelConfig, LinkColor } from './ui/panel.js';
```

`PanelType` and `LinkColor` are union types (no runtime value), so `export type` is correct. However, when a developer needs to write a `switch` or comparison against `PanelType` values in application code, they will need the string literals directly. This is fine as-is, but worth noting: if `PanelType` were ever changed to an enum, the `export type` would break all value-site usages silently under `isolatedModules`.

---

## Missing Pieces

The following interfaces or utilities are absent but will be needed before Phase 1 begins meaningful implementation:

| Missing Item | Suggested Location | Rationale |
|---|---|---|
| `SubscriptionState` interface tracking per-symbol subscription status | `packages/types/src/exchange/subscription.ts` | Workers and adapters need to track what is subscribed; a shared type prevents ad-hoc `Map<string, boolean>` usage. |
| `AdapterError` or `ExchangeError` interface | `packages/types/src/exchange/` | The `WorkerOutboundMessage` has an `error` variant with only `code: string; message: string`. A structured error type enables typed error handling. |
| `WorkspaceLayout` interface | `packages/types/src/ui/` | `PanelConfig` describes a single panel; there is no type for the grid layout that holds multiple panels. Phase 1 layout state will need this. |
| Guard functions for `ExchangeId` and `CandleTimeframe` | `packages/shared/src/utils/` | Both types are used as index keys and receive external input (URL params, postMessage data); runtime `isExchangeId(x)` and `isCandleTimeframe(x)` guards are needed to validate untrusted input before use. |

---

## Build Configuration Notes

- **`tsconfig.base.json`** is well-configured: `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, and `isolatedModules` are all enabled. This is a strong baseline.
- **Project references** are correctly wired: `shared` references `types`; `core` references `types` and `shared` (though `shared` is unused — see H-1); `ui` and `server` reference `types` and `shared`.
- **`composite: true`** is set on all library packages, enabling incremental project build with `tsc --build`.
- **`@terminal/ui`** has no `"main"` or `"exports"` field in `package.json`, which is correct since it is a Vite application, not a library.
- **`vitest.workspace.ts`** correctly enumerates all five packages. Each per-package `vitest.config.ts` uses `globals: false`, which is the correct choice to avoid polluting the global scope.
- **Fastify version** is `^4.27.0`. Fastify 5 was released and has breaking changes to the plugin and hook APIs. Consider pinning explicitly if upgrade timing matters.
