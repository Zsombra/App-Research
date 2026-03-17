# Phase 0: Project Bootstrap — Technical Specification

**Version:** 1.0.0
**Date:** 2026-03-17
**Status:** Draft
**Phase:** 0 of N
**Depends on:** None (this is the foundation)
**Blocks:** Phase 1 (UI Shell), Phase 2 (Exchange Connectors), Phase 3 (Rendering)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Acceptance Criteria](#2-acceptance-criteria)
3. [Package Structure](#3-package-structure)
4. [Dependencies](#4-dependencies)
5. [TypeScript Configuration](#5-typescript-configuration)
6. [Build System](#6-build-system)
7. [Test Configuration](#7-test-configuration)
8. [Lint Configuration](#8-lint-configuration)
9. [Scripts](#9-scripts)
10. [Git Configuration](#10-git-configuration)
11. [Environment Configuration](#11-environment-configuration)
12. [CI Readiness Checklist](#12-ci-readiness-checklist)

---

## 1. Overview

Phase 0 establishes the monorepo skeleton for a crypto trading terminal. Nothing functional is built here. The output is a fully configured workspace that all subsequent phases build on top of.

### Architectural Constraints Informing This Phase

The research in `/home/user/App-Research/research/sprint-8-architecture/` establishes the following non-negotiable architectural decisions that the bootstrap must support:

- **Monorepo with pnpm workspaces** — the frontend, backend, and shared packages must live in separate workspace packages so they can be independently versioned, tested, and built.
- **Web Workers for exchange data processing** — the frontend package must be configured for TypeScript worker entry points, including `SharedArrayBuffer` support requirements (COOP/COEP headers).
- **Fastify + uWebSockets.js backend** — Node.js 20+ ESM-capable backend with separate entry points for the HTTP API and the WebSocket server.
- **regl (WebGL) rendering** — the frontend build must support GLSL shader files (via plugin) and the `regl` package's CommonJS interop.
- **Redis + QuestDB on the server** — the backend package must include connection client libraries but not initialize connections during bootstrap.
- **CCXT Pro exchange connectivity** — the exchange connector package requires a separate workspace because CCXT Pro is a licensed library with a distinct dependency surface.
- **Strict type safety** — TypeScript 5.x in strict mode throughout. No `any` unless explicitly suppressed with an explanatory comment.

### What Phase 0 Does Not Include

- No application logic of any kind.
- No database schema or migrations.
- No exchange connections.
- No UI components.
- No Docker or deployment configuration (deferred to a later infrastructure phase).

---

## 2. Acceptance Criteria

The following must all be true before Phase 0 is considered complete. Each criterion is independently testable.

### 2.1 Workspace Structure

- **AC-01:** The root `package.json` must define a `workspaces` field listing all workspace packages. Running `pnpm install` from the root must install all dependencies for all workspaces without errors.
- **AC-02:** Running `pnpm -r build` from the root must complete without error across all packages that have a `build` script. Packages without a `build` script must be skipped gracefully (not cause an error).
- **AC-03:** Each workspace package must have its own `package.json` with `name`, `version`, `private: true` (for non-published packages), and a `scripts` block.
- **AC-04:** The root workspace must use `pnpm` version 9.x or later (enforced via `packageManager` field in root `package.json`).
- **AC-05:** Cross-package imports must use the workspace package name (e.g., `import { ... } from '@trading/shared'`), not relative paths across package boundaries.

### 2.2 TypeScript

- **AC-06:** Running `pnpm -r typecheck` from the root must exit with code 0 across all packages.
- **AC-07:** Each package's `tsconfig.json` must extend a root base config (`tsconfig.base.json`). No package may redefine properties already enforced in the base (such as `strict: true`).
- **AC-08:** TypeScript version must be 5.4.x or later (pinned in root `devDependencies`).
- **AC-09:** Each package must produce type declarations (`.d.ts` files) as part of its build output for packages that are consumed by other packages.
- **AC-10:** The `@trading/shared` package's type declarations must be usable in both `@trading/frontend` and `@trading/backend` without type errors.

### 2.3 Build

- **AC-11:** `@trading/frontend` must build with Vite 5.x. The output must be a valid static asset bundle in `packages/frontend/dist/`.
- **AC-12:** `@trading/backend` must compile with `tsc` to `packages/backend/dist/`. The compiled output must be executable with `node dist/index.js` without runtime import errors (even if the application exits immediately due to missing config).
- **AC-13:** `@trading/shared` must compile to both CommonJS (`dist/cjs/`) and ESM (`dist/esm/`) formats to support consumption by both the Vite frontend (ESM) and Node.js backend (CommonJS or ESM).
- **AC-14:** Build outputs must be excluded from version control via `.gitignore`.

### 2.4 Testing

- **AC-15:** Running `pnpm -r test` from the root must execute the Vitest suite for every package and exit with code 0. Each package must contain at least one placeholder test that passes.
- **AC-16:** The Vitest configuration must support a workspace-aware setup where each package's `vitest.config.ts` feeds into a root `vitest.workspace.ts`.
- **AC-17:** Test coverage reporting must be enabled. Running `pnpm test:coverage` from the root must produce a coverage report in `coverage/` without error.
- **AC-18:** The `@trading/frontend` test environment must be `jsdom`. The `@trading/backend` test environment must be `node`.

### 2.5 Linting and Formatting

- **AC-19:** Running `pnpm lint` from the root must run ESLint across all packages and exit with code 0 on the initial scaffold (no pre-existing violations).
- **AC-20:** Running `pnpm format:check` from the root must confirm all files are formatted per Prettier rules and exit with code 0.
- **AC-21:** ESLint must use the flat config format (`eslint.config.ts` or `eslint.config.js` at the root). No `.eslintrc.*` files are permitted.
- **AC-22:** ESLint must enforce `@typescript-eslint/no-explicit-any` as an error. Exceptions require an inline `// eslint-disable-next-line` with a comment explaining why.

### 2.6 Git Hygiene

- **AC-23:** A `.gitignore` at the root must exclude `node_modules`, `dist`, `coverage`, `.env*` files, and OS artifacts.
- **AC-24:** A `.gitattributes` file must enforce LF line endings for all text files.
- **AC-25:** The `main` branch must have at least one commit after Phase 0 completion, with a conventional commit message format (e.g., `feat: scaffold monorepo with pnpm workspaces`).

---

## 3. Package Structure

```
trading-terminal/                  ← monorepo root
├── package.json                   ← root package (workspace coordinator)
├── pnpm-workspace.yaml            ← pnpm workspace definition
├── pnpm-lock.yaml                 ← lockfile (committed to git)
├── tsconfig.base.json             ← shared TypeScript base config
├── eslint.config.ts               ← root ESLint flat config
├── .prettierrc.json               ← Prettier config
├── .prettierignore
├── .gitignore
├── .gitattributes
├── vitest.workspace.ts            ← root Vitest workspace file
│
├── packages/
│   ├── shared/                    ← @trading/shared
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts           ← package entry point
│   │       ├── types/             ← shared TypeScript interfaces
│   │       │   ├── market-data.ts ← NormalizedTrade, NormalizedOrderBook, etc.
│   │       │   ├── worker-protocol.ts ← WorkerMessage, MainMessage types
│   │       │   └── index.ts
│   │       └── __tests__/
│   │           └── types.test.ts  ← placeholder type-smoke test
│   │
│   ├── frontend/                  ← @trading/frontend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json     ← config for vite.config.ts itself
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx           ← React entry point
│   │       ├── App.tsx            ← root component (placeholder)
│   │       ├── workers/           ← Web Worker entry points
│   │       │   └── .gitkeep
│   │       ├── store/             ← Zustand + Jotai stores
│   │       │   └── .gitkeep
│   │       └── __tests__/
│   │           └── App.test.tsx   ← placeholder render test
│   │
│   ├── backend/                   ← @trading/backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts           ← server entry point (placeholder)
│   │       ├── http/              ← Fastify HTTP server
│   │       │   └── .gitkeep
│   │       ├── ws/                ← uWebSockets.js WebSocket server
│   │       │   └── .gitkeep
│   │       ├── redis/             ← Redis client setup
│   │       │   └── .gitkeep
│   │       └── __tests__/
│   │           └── health.test.ts ← placeholder test
│   │
│   └── connectors/                ← @trading/connectors
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts
│           ├── adapters/          ← per-exchange adapter stubs
│           │   └── .gitkeep
│           └── __tests__/
│               └── adapters.test.ts ← placeholder test
```

### Package Responsibilities

| Package | Responsibility | Consumed By |
|---|---|---|
| `@trading/shared` | TypeScript type definitions and utility functions shared across all packages. Dual CJS/ESM build. No runtime dependencies beyond what Node.js/browser provides natively. | `@trading/frontend`, `@trading/backend`, `@trading/connectors` |
| `@trading/frontend` | React 18 SPA. Vite build. Dockview layout. Zustand/Jotai state. regl WebGL rendering. Web Workers for exchange data. | End users via browser |
| `@trading/backend` | Fastify HTTP API. uWebSockets.js WebSocket server. Redis pub/sub consumer. QuestDB client. CCXT Pro orchestration. | `@trading/frontend` via WebSocket/HTTP |
| `@trading/connectors` | Exchange adapter implementations using CCXT Pro. Normalization layer. Orderbook state machines. Separate package so exchange SDK dependencies are isolated from the HTTP/WS server runtime. | `@trading/backend` |

---

## 4. Dependencies

Version pinning strategy: pin major versions (`^` prefix is acceptable) for actively maintained libraries. Pin exact versions (`=`) for libraries with a history of breaking patch releases or those with security implications.

### 4.1 Root `devDependencies` (workspace-wide tooling)

```json
{
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/node": "^20.12.7",
    "eslint": "^9.3.0",
    "@typescript-eslint/eslint-plugin": "^7.9.0",
    "@typescript-eslint/parser": "^7.9.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-import-x": "^0.5.1",
    "prettier": "^3.2.5",
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0",
    "@vitest/ui": "^1.6.0",
    "tsx": "^4.10.5"
  }
}
```

**Rationale for key choices:**
- `typescript@^5.4.5` — 5.4 introduces `NoInfer<T>` utility type and improved type narrowing, both useful for trading data models.
- `eslint@^9.x` — required for flat config format. ESLint 8.x will reach EOL in 2025.
- `tsx` — used to run TypeScript config files (ESLint flat config, Vitest workspace) without a separate compilation step.

### 4.2 `@trading/shared`

```json
{
  "dependencies": {},
  "devDependencies": {
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

Shared has no runtime dependencies. Everything is types and pure functions. The `workspace:*` protocol tells pnpm to use the version installed at the root.

### 4.3 `@trading/frontend`

```json
{
  "dependencies": {
    "@trading/shared": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.2",
    "jotai": "^2.8.2",
    "dockview": "^1.14.0",
    "regl": "^2.1.0",
    "glslify": "^7.1.1",
    "mitt": "^3.0.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.11",
    "vite-plugin-glslify": "^1.2.0",
    "@vitest/browser": "^1.6.0",
    "@testing-library/react": "^15.0.6",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^24.0.0",
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

**Rationale for key choices:**
- `dockview@^1.14.0` — recommended in research over FlexLayout for its zero-dependency design, `display:none` mount strategy (prevents costly chart re-mounts), and floating panel support. See `ui-ux-multipanel-layouts.md` Section 6.
- `regl@^2.1.0` — WebGL abstraction for heatmap, footprint, and volume bubble rendering. Chosen over raw WebGL for its functional/stateless design and 30,000+ unit tests. See `webgl-canvas-financial-rendering.md` Section 6.
- `zustand@^4.5.2` + `jotai@^2.8.2` — dual state management: Zustand for global app state (layout, settings, link groups) updatable from Web Workers; Jotai atom families for per-panel granular subscriptions. See `realtime-state-management.md` Section 6.
- `mitt@^3.0.1` — 200-byte event bus for transient cross-panel events (crosshair sync, notifications) that should not go through React state. See `ui-ux-multipanel-layouts.md` Section 4.
- `vite-plugin-glslify` — required to inline GLSL shader modules via `glslify` for the regl rendering pipeline.

### 4.4 `@trading/backend`

```json
{
  "dependencies": {
    "@trading/shared": "workspace:*",
    "@trading/connectors": "workspace:*",
    "fastify": "^4.27.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/websocket": "^10.0.1",
    "uWebSockets.js": "github:uNetworking/uWebSockets.js#v20.44.0",
    "ioredis": "^5.3.2",
    "@questdb/nodejs-client": "^3.1.0",
    "pino": "^9.1.0",
    "zod": "^3.23.4"
  },
  "devDependencies": {
    "@types/node": "workspace:*",
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

**Rationale for key choices:**
- `fastify@^4.27.0` — fastest Node.js HTTP framework. Used for the REST API layer (historical data, OHLCV endpoints). JSON schema-based validation built in.
- `uWebSockets.js@v20.44.0` — C++ WebSocket server with Node.js bindings. Used by BitMEX, Bitfinex, Coinbase in production. 5-10x more concurrent connections than Socket.IO. Built-in pub/sub for topic-based broadcasting. Per-connection backpressure detection via `getBufferedAmount()`. See `backend-system-architecture.md` Section 4. Installed from GitHub because it ships as a pre-built binary, not from npm.
- `ioredis@^5.3.2` — Redis client for Streams, pub/sub, and caching. Supports Redis 7+ Streams API required by the tiered pipeline architecture.
- `@questdb/nodejs-client@^3.1.0` — official QuestDB Node.js client. Supports InfluxDB Line Protocol (ILP) for high-speed ingestion, which is the chosen ingest path per `backend-system-architecture.md` Section 4.
- `zod@^3.23.4` — runtime schema validation for incoming WebSocket messages and REST request bodies.
- `pino@^9.1.0` — structured JSON logging compatible with Fastify's logger interface.

### 4.5 `@trading/connectors`

```json
{
  "dependencies": {
    "@trading/shared": "workspace:*",
    "ccxt": "^4.3.22",
    "ioredis": "^5.3.2",
    "zod": "^3.23.4"
  },
  "devDependencies": {
    "@types/node": "workspace:*",
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

**Note on CCXT:** `ccxt@^4.x` includes CCXT Pro WebSocket support in the unified package as of 4.x. No separate `ccxt.pro` package is required. Verify the installed version includes `ccxt.pro` exports after install:

```sh
node -e "const ccxt = require('ccxt'); console.log(typeof ccxt.pro)"
# Expected output: object
```

If the installed version does not include Pro, pin to a version that does and add a comment in `package.json` explaining why.

**Rationale for separating connectors:** CCXT is a large package (~20MB). Isolating it in its own workspace package means the backend server process can import `@trading/connectors` and CCXT is only loaded when connectors are initialized. It also makes it straightforward to replace or augment CCXT with tiagosiebler's per-exchange SDKs in a later phase without modifying the backend package's dependency tree.

---

## 5. TypeScript Configuration

### 5.1 Root Base Config: `tsconfig.base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Rationale for notable settings:**
- `target: "ES2022"` — supports native `class` fields, `Error.cause`, top-level `await`. Node 20+ and all modern browsers support this.
- `moduleResolution: "bundler"` — correct resolution mode for Vite. Avoids `node16`/`nodenext` restrictions on file extensions in imports. Backend package overrides this to `node16`.
- `verbatimModuleSyntax: true` — forces `import type` for type-only imports. Prevents accidental runtime imports of type-only modules. Critical for avoiding side effects in the rendering pipeline.
- `noUncheckedIndexedAccess: true` — array/object index access returns `T | undefined`. Essential for safe order book level access patterns.
- `exactOptionalPropertyTypes: true` — `{ x?: string }` means the property is absent, not `undefined`. Tighter type safety for message schemas.
- `skipLibCheck: false` — check all `.d.ts` files. Catches type errors from packages we depend on early. Accept the slower compilation.

### 5.2 `@trading/shared` — `packages/shared/tsconfig.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist/esm",
    "module": "ESNext",
    "declaration": true,
    "declarationDir": "dist/types"
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/__tests__/**", "dist"]
}
```

A second `tsconfig.cjs.json` exists alongside it for the CommonJS build:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "dist/cjs",
    "declaration": false
  }
}
```

Declarations are only generated once (from the ESM build). Both output formats share the same `dist/types/` directory.

### 5.3 `@trading/frontend` — `packages/frontend/tsconfig.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`packages/frontend/tsconfig.node.json` (for Vite config file itself):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

**Key additions for frontend:**
- `"lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"]` — Web Worker types (`SharedArrayBuffer`, `Atomics`, `postMessage`) are in the `WebWorker` lib, not `DOM`. Both are needed because main thread code and worker code coexist in `src/`.
- `"jsx": "react-jsx"` — uses the new JSX transform. No `import React from 'react'` required in JSX files.
- `"noEmit": true` — Vite handles the actual compilation. TypeScript is only used for type checking.

### 5.4 `@trading/backend` — `packages/backend/tsconfig.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/__tests__/**", "dist"]
}
```

**Backend-specific overrides:**
- `module: "NodeNext"` + `moduleResolution: "NodeNext"` — correct for Node.js 20+ ESM. Requires `.js` extensions in import paths when writing ESM modules. This is stricter than `bundler` resolution but correct for Node runtime.
- `declaration: false` — backend is not consumed by other packages as a library.

### 5.5 `@trading/connectors` — `packages/connectors/tsconfig.json`

Same as backend config, with `rootDir`, `outDir` adjusted:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationDir": "dist/types"
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/__tests__/**", "dist"]
}
```

Declarations are generated here because `@trading/backend` imports from `@trading/connectors` and needs types.

---

## 6. Build System

### 6.1 `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

All directories directly under `packages/` are workspace packages. No glob nesting (`packages/**`) to keep the workspace flat and predictable.

### 6.2 Root `package.json` (essential fields)

```json
{
  "name": "trading-terminal",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@9.1.2",
  "engines": {
    "node": ">=20.12.0",
    "pnpm": ">=9.1.0"
  },
  "scripts": {
    "build": "pnpm -r --filter='./packages/*' build",
    "build:shared": "pnpm --filter @trading/shared build",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest run --workspace vitest.workspace.ts",
    "test:watch": "vitest --workspace vitest.workspace.ts",
    "test:coverage": "vitest run --workspace vitest.workspace.ts --coverage",
    "test:ui": "vitest --workspace vitest.workspace.ts --ui",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "pnpm -r clean && rimraf coverage"
  },
  "devDependencies": {
    "...": "see Section 4.1"
  }
}
```

**Build ordering:** `@trading/shared` must be built before `@trading/frontend`, `@trading/backend`, and `@trading/connectors` because they consume its type declarations. This is handled by the `build:shared` pre-step in CI and by the `--filter` flag with dependency ordering in the `build` script.

For local development, Vite's dev server resolves workspace packages by their `source` field (see below), so `@trading/shared` does not need to be built first during frontend development.

### 6.3 `@trading/shared` Build

The shared package needs dual CJS/ESM output. Its `package.json` exports field:

```json
{
  "name": "@trading/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/cjs/index.js"
      }
    }
  },
  "scripts": {
    "build": "pnpm build:esm && pnpm build:cjs",
    "build:esm": "tsc --project tsconfig.json",
    "build:cjs": "tsc --project tsconfig.cjs.json",
    "typecheck": "tsc --project tsconfig.json --noEmit",
    "test": "vitest run",
    "clean": "rimraf dist"
  }
}
```

### 6.4 `@trading/frontend` Build

`packages/frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glslify from 'vite-plugin-glslify';

export default defineConfig({
  plugins: [
    react(),
    glslify(),  // enables `import shader from './shader.glsl'`
  ],
  resolve: {
    alias: {
      // Map workspace packages to their source during dev
      // (avoids needing to build @trading/shared first)
      '@trading/shared': new URL('../shared/src/index.ts', import.meta.url).pathname,
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  worker: {
    format: 'es',
    // Worker entry points use the same Vite transform pipeline
    // ensuring GLSL and TypeScript work inside workers
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (used by Web Workers for
      // zero-copy price data transfer per realtime-state-management.md)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

`packages/frontend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "clean": "rimraf dist"
  }
}
```

### 6.5 `@trading/backend` Build

The backend compiles with `tsc` directly. No bundler — Node.js loads the compiled JS natively.

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "clean": "rimraf dist"
  }
}
```

The `dev` script uses `tsx` for fast TypeScript execution without a compilation step, which is sufficient for development. The compiled `dist/` output is used in production.

### 6.6 `@trading/connectors` Build

```json
{
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "clean": "rimraf dist"
  }
}
```

---

## 7. Test Configuration

### 7.1 Root Vitest Workspace: `vitest.workspace.ts`

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared/vitest.config.ts',
  'packages/frontend/vitest.config.ts',
  'packages/backend/vitest.config.ts',
  'packages/connectors/vitest.config.ts',
]);
```

Each package owns its Vitest config. The root workspace file aggregates them for `pnpm test` at the root. This approach allows each package to run its tests independently (`pnpm --filter @trading/frontend test`) without loading unrelated test configs.

### 7.2 `@trading/shared` Vitest Config

`packages/shared/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared',
    environment: 'node',
    globals: false,
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**'],
    },
  },
});
```

### 7.3 `@trading/frontend` Vitest Config

`packages/frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import glslify from 'vite-plugin-glslify';

export default defineConfig({
  plugins: [react(), glslify()],
  test: {
    name: 'frontend',
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/main.tsx',
        'src/workers/**',
      ],
    },
  },
});
```

`packages/frontend/src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom';
// Additional global test setup goes here in later phases
```

### 7.4 `@trading/backend` Vitest Config

`packages/backend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend',
    environment: 'node',
    globals: false,
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
    },
  },
});
```

### 7.5 `@trading/connectors` Vitest Config

`packages/connectors/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'connectors',
    environment: 'node',
    globals: false,
    include: ['src/**/__tests__/**/*.test.ts'],
    // Exchange adapter tests that require live network are in a
    // separate 'integration' suite, not included in the default run:
    exclude: ['src/**/__tests__/**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/adapters/**/*.integration.ts',
      ],
    },
  },
});
```

### 7.6 Placeholder Tests

Each package must have at least one passing test on bootstrap. These are smoke tests that validate the package's own type exports, not application logic.

`packages/shared/src/__tests__/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
// Import something from the package to verify the module resolves
import type { NormalizedTrade } from '../types/market-data.js';

describe('@trading/shared types', () => {
  it('exports the NormalizedTrade type', () => {
    // Type-level test: if NormalizedTrade is not exported, tsc fails.
    // This test just verifies the module itself is loadable.
    expect(true).toBe(true);
  });
});
```

`packages/frontend/src/__tests__/App.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App.js';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });
});
```

`packages/backend/src/__tests__/health.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('@trading/backend', () => {
  it('module loads without error', async () => {
    // Placeholder: importing index.ts would start the server.
    // Future tests will import individual route handlers.
    expect(true).toBe(true);
  });
});
```

---

## 8. Lint Configuration

### 8.1 Root ESLint Flat Config: `eslint.config.ts`

The flat config format is required (ESLint 9.x). The config uses `tsx` to execute (invoked via `eslint --flag unstable_ts_config` or by running through `tsx`).

```typescript
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import-x';
import type { Linter } from 'eslint';

const config: Linter.FlatConfig[] = [
  // Global ignores — must be the first entry
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.git/**',
      'pnpm-lock.yaml',
    ],
  },

  // Base JavaScript rules (applies to all JS/TS files)
  js.configs.recommended,

  // TypeScript rules — all packages
  {
    files: ['packages/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,               // uses nearest tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'import-x': importPlugin,
    },
    rules: {
      ...tsPlugin.configs['strict-type-checked'].rules,
      ...tsPlugin.configs['stylistic-type-checked'].rules,

      // Enforce `import type` for type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // No `any` without explicit suppression
      '@typescript-eslint/no-explicit-any': 'error',

      // Require return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // No floating promises — critical for async exchange connectors
      '@typescript-eslint/no-floating-promises': 'error',

      // No unused vars
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Import ordering
      'import-x/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },

  // React-specific rules — frontend only
  {
    files: ['packages/frontend/src/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',       // new JSX transform
      'react/prop-types': 'off',               // TypeScript handles this
      'react-hooks/exhaustive-deps': 'error',  // prevent stale closures
    },
  },

  // Test files — relax some rules
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];

export default config;
```

### 8.2 Prettier Config: `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": []
}
```

### 8.3 `.prettierignore`

```
dist/
node_modules/
coverage/
pnpm-lock.yaml
*.d.ts
```

### 8.4 ESLint and Prettier Integration

Prettier and ESLint are run as separate tools (not via `eslint-plugin-prettier`). The `eslint-config-prettier` package is installed as a dev dependency to disable any ESLint rules that conflict with Prettier formatting. The recommended approach (endorsed by Prettier's documentation since 2023) is to run `prettier --write` in the `format` script and `eslint` in the `lint` script, without interleaving them.

Add to root `devDependencies`:
```json
"eslint-config-prettier": "^9.1.0"
```

Add as the last entry in `eslint.config.ts`:
```typescript
import prettierConfig from 'eslint-config-prettier';
// ... in the config array, add as the final element:
prettierConfig,
```

---

## 9. Scripts

### 9.1 Root-Level Scripts Summary

| Script | Command | Purpose |
|---|---|---|
| `pnpm install` | (standard) | Install all workspace dependencies |
| `pnpm build` | `pnpm -r --filter='./packages/*' build` | Build all packages in dependency order |
| `pnpm build:shared` | `pnpm --filter @trading/shared build` | Build only shared (prerequisite for others) |
| `pnpm typecheck` | `pnpm -r typecheck` | Run `tsc --noEmit` across all packages |
| `pnpm test` | `vitest run --workspace vitest.workspace.ts` | Run all tests once (CI mode) |
| `pnpm test:watch` | `vitest --workspace vitest.workspace.ts` | Watch mode for development |
| `pnpm test:coverage` | `vitest run ... --coverage` | Run tests and generate coverage |
| `pnpm test:ui` | `vitest ... --ui` | Open Vitest browser UI |
| `pnpm lint` | `eslint .` | Lint all packages |
| `pnpm lint:fix` | `eslint . --fix` | Auto-fix lint violations |
| `pnpm format` | `prettier --write .` | Format all files |
| `pnpm format:check` | `prettier --check .` | Check formatting (CI mode) |
| `pnpm clean` | `pnpm -r clean && rimraf coverage` | Remove all build artifacts |

### 9.2 Per-Package Scripts Summary

Every package implements this standard set. Deviations must be documented.

| Script | `@trading/shared` | `@trading/frontend` | `@trading/backend` | `@trading/connectors` |
|---|---|---|---|---|
| `build` | `tsc` (ESM) + `tsc` (CJS) | `tsc --noEmit && vite build` | `tsc` | `tsc` |
| `dev` | `tsc --watch` | `vite` | `tsx watch src/index.ts` | N/A |
| `typecheck` | `tsc --noEmit` | `tsc --noEmit` | `tsc --noEmit` | `tsc --noEmit` |
| `test` | `vitest run` | `vitest run` | `vitest run` | `vitest run` |
| `clean` | `rimraf dist` | `rimraf dist` | `rimraf dist` | `rimraf dist` |

`rimraf` is installed at the root as a dev dependency for cross-platform `rm -rf` in clean scripts:
```json
"rimraf": "^5.0.7"
```

### 9.3 pnpm Filtering Patterns

Useful during development (not in `package.json`, just reference):

```sh
# Run a script only for packages that have changed since main
pnpm -r --filter='...[origin/main]' test

# Run a script for a package and all its dependencies
pnpm --filter @trading/backend... build

# Run a script for a package and all packages that depend on it
pnpm --filter ...@trading/shared build
```

---

## 10. Git Configuration

### 10.1 `.gitignore`

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.tsbuildinfo

# Test / coverage
coverage/
.nyc_output/

# Environment and secrets
.env
.env.*
!.env.example

# Editor
.vscode/settings.json
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# pnpm
.pnpm-debug.log*

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
ehthumbs.db
Desktop.ini

# Vite
vite.config.ts.timestamp-*

# Vitest
vitest.config.ts.timestamp-*
```

### 10.2 `.gitattributes`

```gitattributes
# Force LF line endings for all text files.
# This prevents CRLF/LF conflicts between Windows and Unix contributors.
* text=auto eol=lf

# Declare binary files that should never be modified.
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.wasm binary

# Generated lock files — diff as text but do not normalize
pnpm-lock.yaml -diff

# GLSL shader files — treat as text
*.glsl text
*.vert text
*.frag text
```

### 10.3 Conventional Commits

All commits must follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Enforced via `commitlint` (optional for Phase 0, mandatory from Phase 1 onward).

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`.

Scope (optional but encouraged): the package name abbreviated — `shared`, `frontend`, `backend`, `connectors`, `infra`, `root`.

Examples:
```
feat(shared): add NormalizedTrade type definition
chore(root): scaffold pnpm workspace with four packages
build(frontend): configure Vite with GLSL plugin and COOP headers
```

### 10.4 Optional: Husky + lint-staged

Husky pre-commit hooks are recommended but optional for Phase 0. If added:

Install:
```sh
pnpm add -Dw husky lint-staged
pnpm exec husky init
```

`.husky/pre-commit`:
```sh
pnpm exec lint-staged
```

`lint-staged` config in root `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yaml,yml}": [
      "prettier --write"
    ]
  }
}
```

If Husky is not added in Phase 0, the CI pipeline (Phase 1 prerequisite) must enforce lint and format checks before merging.

---

## 11. Environment Configuration

### 11.1 `.env.example` (committed to git)

```dotenv
# Backend server configuration
PORT=3000
WS_PORT=3001
NODE_ENV=development

# Redis connection (required for backend and connectors)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# QuestDB connection (required for backend)
QUESTDB_HOST=localhost
QUESTDB_ILP_PORT=9009
QUESTDB_HTTP_PORT=9000

# Exchange API credentials (optional during development)
# Phase 0: not required. Phase 2: add per-exchange keys.
BINANCE_API_KEY=
BINANCE_SECRET=
BYBIT_API_KEY=
BYBIT_SECRET=

# CCXT Pro license key (required if using CCXT Pro features)
CCXT_PRO_LICENSE=

# Frontend Vite environment variables (must be prefixed with VITE_)
VITE_WS_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3000
```

### 11.2 Environment Variable Loading

The backend uses `process.env` directly. No `dotenv` package is loaded in production — the runtime environment provides variables. In development, developers load `.env` manually or via an IDE `.env` file loader.

For the frontend, Vite automatically loads `.env` files and exposes `VITE_*` variables to the browser via `import.meta.env`.

**Do not commit `.env` files.** The `.gitignore` excludes `.env` and `.env.*`. Only `.env.example` is committed.

---

## 12. CI Readiness Checklist

Phase 0 is complete when all of the following can be run in sequence on a clean machine with Node 20+ and pnpm 9+ installed, and all exit with code 0:

```sh
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Build shared package (prerequisite for type checking others)
pnpm build:shared

# 3. Type check all packages
pnpm typecheck

# 4. Run all tests
pnpm test

# 5. Check linting
pnpm lint

# 6. Check formatting
pnpm format:check

# 7. Build all packages
pnpm build
```

This sequence is the definition of a passing Phase 0. Any failure in any step is a Phase 0 blocker.

---

## Appendix A: Architecture Decision Records

### ADR-001: pnpm over npm/yarn

**Decision:** Use pnpm 9.x for package management.

**Rationale:** pnpm's symlinked `node_modules` structure prevents phantom dependency access — a package can only import what it explicitly declares. This is critical because `@trading/frontend` must not accidentally import `ccxt` (a large package declared only in `@trading/connectors`). npm and yarn (hoisting-based) would allow this accidentally. pnpm also has first-class workspace support and is the fastest of the three managers for large monorepos.

**Consequences:** All developers must install pnpm. The `packageManager` field in `package.json` enforces this via Corepack.

### ADR-002: Four Packages, Not Three

**Decision:** Separate `@trading/connectors` from `@trading/backend`.

**Rationale:** CCXT Pro is a large licensed package. Keeping it isolated means: (1) the backend HTTP/WS server can start without loading CCXT if connectors are not needed (useful for testing); (2) connectors can be tested independently with mock exchange data; (3) CCXT can be replaced or augmented (e.g., with tiagosiebler's per-exchange SDKs) without touching backend routing logic.

**Consequences:** Cross-package imports add a small complexity. The `@trading/backend` package must declare `@trading/connectors` as a dependency and build ordering must account for this.

### ADR-003: Dual CJS/ESM for `@trading/shared`

**Decision:** Build `@trading/shared` to both CommonJS and ESM.

**Rationale:** `@trading/frontend` is bundled by Vite and prefers ESM. `@trading/backend` and `@trading/connectors` run on Node.js and may need CommonJS for interop with older dependencies (particularly CCXT, which has mixed CJS/ESM history). The `exports` field in `package.json` with `import`/`require` conditions allows each consumer to get the appropriate format automatically.

**Consequences:** The build step for `@trading/shared` runs `tsc` twice. Build time is slightly increased. The `tsconfig.cjs.json` must be kept in sync with the main `tsconfig.json`.

### ADR-004: No Husky in Phase 0

**Decision:** Husky pre-commit hooks are optional in Phase 0.

**Rationale:** Enforcing hooks before CI is set up creates friction during initial scaffolding. CI lint/format checks are the authoritative gate. Hooks are a developer convenience, not a correctness guarantee. Add Husky at the start of Phase 1 when the team workflow stabilizes.

**Consequences:** During Phase 0, developers must manually run `pnpm lint` and `pnpm format:check` before committing. CI will reject non-conforming commits.

### ADR-005: COOP/COEP Headers in Vite Dev Server

**Decision:** Set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on the Vite dev server from Phase 0.

**Rationale:** `SharedArrayBuffer` is required for the Web Worker to main thread zero-copy price data transfer described in `realtime-state-management.md` Section 3. These headers are required by all modern browsers to enable `SharedArrayBuffer`. Setting them now prevents the need to retrofit them later when the rendering pipeline depends on them. The production server (Fastify + uWebSockets.js) must also set these headers.

**Consequences:** Any third-party resources (fonts, images) loaded in the frontend must set appropriate CORS headers. During development this may block some CDN-hosted resources. All assets should be served locally or from a CORS-configured server.

---

## Appendix B: File Manifest

Complete list of files to create during Phase 0 implementation. All paths are relative to the monorepo root.

```
.gitignore
.gitattributes
.prettierrc.json
.prettierignore
.env.example
eslint.config.ts
tsconfig.base.json
vitest.workspace.ts
package.json
pnpm-workspace.yaml

packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/tsconfig.cjs.json
packages/shared/vitest.config.ts
packages/shared/src/index.ts
packages/shared/src/types/index.ts
packages/shared/src/types/market-data.ts
packages/shared/src/types/worker-protocol.ts
packages/shared/src/__tests__/types.test.ts

packages/frontend/package.json
packages/frontend/tsconfig.json
packages/frontend/tsconfig.node.json
packages/frontend/vite.config.ts
packages/frontend/vitest.config.ts
packages/frontend/index.html
packages/frontend/src/main.tsx
packages/frontend/src/App.tsx
packages/frontend/src/__tests__/setup.ts
packages/frontend/src/__tests__/App.test.tsx
packages/frontend/src/workers/.gitkeep
packages/frontend/src/store/.gitkeep

packages/backend/package.json
packages/backend/tsconfig.json
packages/backend/vitest.config.ts
packages/backend/src/index.ts
packages/backend/src/http/.gitkeep
packages/backend/src/ws/.gitkeep
packages/backend/src/redis/.gitkeep
packages/backend/src/__tests__/health.test.ts

packages/connectors/package.json
packages/connectors/tsconfig.json
packages/connectors/vitest.config.ts
packages/connectors/src/index.ts
packages/connectors/src/adapters/.gitkeep
packages/connectors/src/__tests__/adapters.test.ts
```

Total: 38 files. All are either configuration files, empty entry points, or placeholder tests.
