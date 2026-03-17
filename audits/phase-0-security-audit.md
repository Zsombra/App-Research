# Phase 0 Security Audit — Trading Terminal Monorepo

**Audited by:** Security Auditor Agent
**Date:** 2026-03-17
**Scope:** Phase 0 scaffold — packages/server, packages/core, packages/types, packages/shared, packages/ui, root configs
**Tool:** `pnpm audit` + manual static analysis of all source files

---

## Executive Summary

The Phase 0 scaffold is a clean, minimal codebase with a small attack surface. No hardcoded secrets were found. TypeScript strict mode and ESLint `no-explicit-any` provide solid baseline type safety. The most actionable findings are two real CVEs in pinned dependencies (one High, one Moderate), a missing security headers plugin on the Fastify server, and the server binding to `0.0.0.0` in all environments. The remaining findings are forward-looking hardening gaps that are expected at this stage.

**Verdict:** 2 items block merge as written (HIGH dependency CVE + MEDIUM server host binding). All others are tracked below for Phase 1+.

---

## Findings

### CRITICAL — None

No critical findings. No hardcoded credentials, no SQL/command injection vectors, no exposed secret material in any source file.

---

### HIGH

#### H-1: Fastify 4.x — Content-Type Tab Character Bypass (CVE / GHSA-jx2c-rxcm-jvmq)

**File:** `packages/server/package.json` (pinned to `fastify@4.29.1` via `^4.27.0`)
**pnpm audit severity:** High
**Advisory:** https://github.com/advisories/GHSA-jx2c-rxcm-jvmq

A tab character in the `Content-Type` header can bypass Fastify's body validation in all v4 releases. The patched release line is **v5.7.2+** (major version bump to v5). Because the current pin uses the `^4` range, upgrading within the same range will not resolve it; a deliberate major-version migration to v5 is required.

**Risk:** Any future route that performs body validation (e.g., subscription or order management endpoints) can have validation silently bypassed, potentially enabling type confusion attacks or injection payloads.

**Remediation:**

1. Migrate `packages/server` to `fastify@^5.7.2` (or pin to `>=5.7.3` to also cover H-2 below).
2. Review and update any Fastify plugin compatibility (e.g., `@fastify/cors`, `@fastify/helmet`) for v5 API changes.
3. Re-run `pnpm audit` after upgrade to confirm resolution.

```diff
# packages/server/package.json
-    "fastify": "^4.27.0"
+    "fastify": "^5.7.3"
```

---

#### H-2: Fastify — DoS via Unbounded Memory Allocation in sendWebStream (GHSA-mrq3-vjjr-p77c)

**File:** `packages/server/package.json` (same `fastify@4.29.1`)
**pnpm audit severity:** Low (listed separately but pairs directly with the v5 upgrade above)
**Advisory:** https://github.com/advisories/GHSA-mrq3-vjjr-p77c

Unbounded memory growth in `sendWebStream` can be triggered by any client that opens a streaming response and reads slowly. Patched in `>=5.7.3`. Resolved by the same upgrade as H-1.

**Remediation:** Covered by upgrading to `fastify@^5.7.3` as described in H-1.

---

### MEDIUM

#### M-1: Fastify Server Missing Security Headers (no `@fastify/helmet`)

**File:** `packages/server/src/index.ts`

The server is constructed with no helmet-equivalent plugin. When the server serves browser clients (or is placed behind a proxy that forwards headers), responses will lack:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`

This is the standard Fastify security headers plugin and should be registered as part of the Phase 1 server hardening.

**Remediation (Phase 1):**

```typescript
import helmet from '@fastify/helmet';
// inside buildServer():
await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:'],   // allow WebSocket to exchanges
    },
  },
});
```

---

#### M-2: Fastify Server Binds to `0.0.0.0` in All Environments

**File:** `packages/server/src/index.ts`, line 29

```typescript
await server.listen({ port, host: '0.0.0.0' });
```

Binding to all interfaces is appropriate in a container or production deployment, but in local development this exposes the server on every network interface of the developer's machine (LAN, VPN, etc.) with no authentication on the health endpoint. A future `/health` leak may not be harmful, but any data endpoints added in Phase 1 will inherit this binding without conscious choice.

**Remediation:**

Derive the host from an environment variable so the default is loopback in dev:

```typescript
const host = process.env['HOST'] ?? (process.env['NODE_ENV'] === 'production' ? '0.0.0.0' : '127.0.0.1');
await server.listen({ port, host });
```

---

#### M-3: No Rate Limiting on Any Endpoint

**File:** `packages/server/src/index.ts`

The health endpoint and all future endpoints have no rate limiting. Without `@fastify/rate-limit`, an attacker can send unlimited requests. This is a Phase 1 concern because the current surface is a single read-only endpoint, but the plugin should be wired in before any state-mutating or subscription endpoints are added.

**Remediation (Phase 1):**

```typescript
import rateLimit from '@fastify/rate-limit';
await server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

---

#### M-4: CORS Not Configured — All Origins Implicitly Allowed

**File:** `packages/server/src/index.ts`

No `@fastify/cors` plugin is registered. Fastify v4/v5 does not add CORS headers by default, so cross-origin requests from the browser to the API server will be blocked by browsers — which provides accidental CSRF protection. However, this also means that once a frontend origin is known, there is no explicit allowlist in code. When `@fastify/cors` is added in Phase 1 it is important to configure an explicit origin allowlist rather than using `{ origin: '*' }`.

**Remediation (Phase 1):**

```typescript
import cors from '@fastify/cors';
await server.register(cors, {
  origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:5173'],
  methods: ['GET', 'POST'],
});
```

---

#### M-5: Source Maps Enabled in Production Build (UI)

**File:** `packages/ui/vite.config.ts`, line 14

```typescript
build: {
  outDir: 'dist',
  sourcemap: true,   // <-- always on
},
```

Shipping source maps to production exposes the original TypeScript source to anyone who opens DevTools or fetches `*.js.map`. For a trading terminal this leaks internal logic, symbol normalisation heuristics, and adapter structures to competitors or attackers reconnaissance.

**Remediation:**

```typescript
build: {
  outDir: 'dist',
  sourcemap: process.env['NODE_ENV'] !== 'production',
},
```

Or use `sourcemap: 'hidden'` to keep maps for error tracking services without serving them publicly.

---

### LOW

#### L-1: esbuild Dev Dependency CVE — GHSA-67mh-4wv8-2f99 (Moderate, dev-only)

**pnpm audit severity:** Moderate
**Advisory:** https://github.com/advisories/GHSA-67mh-4wv8-2f99
**Affected path:** `vitest@1.6.1 > vite@5.4.21 > esbuild@0.21.5`

esbuild `<=0.24.2` allows any website to send requests to the esbuild development server and read the response. This only matters when running `vite dev` or `vitest` — it does not affect production builds. The risk is real if developers run `vite dev` on a shared or networked machine, but is low for typical local development.

**Remediation (Phase 1):** Upgrade `vitest` and `vite` to versions that pull in `esbuild@>=0.25.0`. Track via `pnpm audit --audit-level=moderate` in CI.

```diff
# root package.json devDependencies
-    "vitest": "^1.6.0",
+    "vitest": "^3.0.0",
-    "@vitest/coverage-v8": "^1.6.0",
+    "@vitest/coverage-v8": "^3.0.0",
```

Note: The lockfile already shows `vitest@4.7.0` in one resolution path alongside `vitest@1.6.1` — this version mismatch itself warrants investigation to ensure the workspace is consistently using one vitest major.

---

#### L-2: `ConnectionConfig` Interface Carries API Credentials in Plaintext

**File:** `packages/types/src/exchange/connection.ts`, lines 41-43

```typescript
export interface ConnectionConfig {
  ...
  apiKey?: string;
  apiSecret?: string;
  ...
}
```

The type definition is correct for its purpose, but the field names and presence signal that API credentials will pass through this interface. There is no documentation or enforcement around:

- How these fields are populated (environment variable, vault, user input)
- Whether they are redacted from logs
- Whether they appear in serialised config persisted to disk or `localStorage`

Fastify's built-in logger (`pino`) will log any object passed to `server.log.*`. If a `ConnectionConfig` is ever logged without redaction, credentials will appear in log output.

**Remediation (Phase 1):** Add a `@redact` JSDoc annotation and an explicit logging redaction list when Pino is configured:

```typescript
const server = Fastify({
  logger: {
    redact: ['*.apiKey', '*.apiSecret', 'req.headers.authorization'],
  },
});
```

---

#### L-3: No Input Validation on `WorkerInboundMessage.symbol` or `params`

**File:** `packages/types/src/worker/messages.ts`

The `WorkerInboundMessage` type includes:

- `symbol: string` — unbounded, no max length or format constraint at the type level
- `params: Record<string, unknown>` on the `add-indicator` message — fully unconstrained

TypeScript types are erased at runtime. When concrete Worker implementations parse `postMessage` payloads in Phase 1, there is no runtime validation layer yet. Malformed or oversized messages from a compromised UI context could cause unhandled errors or memory pressure in the Worker.

**Remediation (Phase 1):** Introduce a runtime validation library (e.g., `zod`) for Worker message parsing. The type definitions in `messages.ts` should be paired with Zod schemas that enforce:

- `symbol` matches `/^[A-Z]{1,10}\/[A-Z]{1,10}$/`
- `params` keys and value types are constrained per indicator kind

---

#### L-4: `.gitignore` Does Not Exclude `*.pem`, `*.key`, or `*.p12`

**File:** `.gitignore`

The current `.gitignore` correctly excludes `.env` files and IDE artifacts, but does not exclude common TLS/certificate file extensions. If a developer ever places a self-signed certificate or private key file in the repo for local HTTPS development, it would not be caught.

**Remediation:** Add the following lines:

```gitignore
# Certificates and private keys
*.pem
*.key
*.p12
*.pfx
*.crt
*.cer
```

---

#### L-5: `dist/` Build Artifacts Are Present in the Repository

**File:** `packages/types/dist/`, `packages/shared/dist/`

Built JavaScript and declaration files are committed to the repository (observed in the file tree). `.gitignore` excludes `dist/` at the root level but this rule may not be applying recursively to the packages. Committing build artifacts:

- Bloats the repository with generated files
- Risks shipping a stale build that does not reflect current source
- Could inadvertently include build-time secrets if any config injection is ever used

**Remediation:** Verify the `dist/` glob in `.gitignore` covers package subdirectories. If not, add explicit entries:

```gitignore
packages/*/dist/
```

Then remove the committed dist files:

```bash
git rm -r --cached packages/types/dist packages/shared/dist
```

---

#### L-6: `PanelConfig.title` Is an Unsanitised `string`

**File:** `packages/types/src/ui/panel.ts`, line 32

The `title: string` field on `PanelConfig` will eventually be rendered in the DOM. If panel configs are ever serialised to/from user-controlled storage (localStorage, URL params, server-side workspace persistence) and rendered without sanitisation, this is a stored XSS vector. React's JSX rendering escapes text content by default, so this is currently safe — but it is worth a comment at the interface level flagging the field as user-controlled.

**Remediation (Phase 1):** When implementing panel rendering, ensure `title` is never set via `dangerouslySetInnerHTML`. Add a JSDoc note to the field:

```typescript
/** Display title for the panel tab. User-supplied — do not render via dangerouslySetInnerHTML. */
title: string;
```

---

#### L-7: `@typescript-eslint/no-explicit-any: 'error'` — Good, But No Security-Focused Lint Rules

**File:** `eslint.config.js`

The ESLint config enforces `no-explicit-any`, which prevents type escape hatches that are often found near injection sinks. However there are no security-specific rules (e.g., `no-eval`, `no-new-func`, detection of `dangerouslySetInnerHTML` misuse). These would add a static analysis layer against common front-end injection patterns.

**Remediation (Phase 1):** Consider adding `eslint-plugin-security` or `eslint-plugin-no-unsanitized` for the UI package.

---

## Summary Table

| ID  | Severity | Area             | Title                                               | Phase to Fix |
|-----|----------|------------------|-----------------------------------------------------|--------------|
| H-1 | High     | Dependencies     | Fastify 4.x Content-Type bypass CVE                 | Now (pre-merge) |
| H-2 | High     | Dependencies     | Fastify DoS via sendWebStream (same upgrade)        | Now (pre-merge) |
| M-1 | Medium   | Server           | No security headers (`@fastify/helmet` missing)     | Phase 1      |
| M-2 | Medium   | Server           | Server always binds to `0.0.0.0`                    | Phase 1      |
| M-3 | Medium   | Server           | No rate limiting on any endpoint                    | Phase 1      |
| M-4 | Medium   | Server           | CORS not configured                                 | Phase 1      |
| M-5 | Medium   | UI Build         | Source maps always enabled including production     | Phase 1      |
| L-1 | Low      | Dependencies     | esbuild dev CVE (dev-only, vitest upgrade resolves) | Phase 1      |
| L-2 | Low      | Server/Logging   | API credentials could appear in pino logs           | Phase 1      |
| L-3 | Low      | Worker           | No runtime validation on WorkerInboundMessage       | Phase 1      |
| L-4 | Low      | Repo hygiene     | .gitignore missing cert/key file patterns           | Now (trivial) |
| L-5 | Low      | Repo hygiene     | `dist/` artifacts committed to repo                 | Now (trivial) |
| L-6 | Low      | UI Types         | `PanelConfig.title` unsanitised — document risk     | Phase 1      |
| L-7 | Low      | Linting          | No security-focused ESLint rules                    | Phase 1      |

---

## Positive Security Findings

The following practices were observed and are worth preserving:

- **No hardcoded secrets anywhere** — grep across all source files found zero credential literals.
- **TypeScript strict mode** — `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `noImplicitOverride` are all enabled. This eliminates whole classes of runtime type confusion.
- **`no-explicit-any` enforced as an error** — prevents type escape hatches that commonly appear near injection sinks.
- **`.env` and `.env.*` excluded in `.gitignore`** — correct and consistent.
- **`PORT` read from environment variable** — no hardcoded port, correct use of `process.env['PORT']` with bracket notation (avoids TSLint env access warnings).
- **`ExchangeId` is a closed discriminated union** — adapter code cannot accept an arbitrary string as an exchange identifier; all valid values are enumerated at compile time.
- **Worker messages use discriminated unions on `type`** — this is the correct pattern for safe message parsing; exhaustive switch checking will be enforceable with TypeScript.
- **`private: true` on all package.json files** — prevents accidental npm publish of internal packages.
- **React StrictMode enabled** — double-invocation in dev catches side-effect bugs.

---

## Immediate Action Items (Pre-Merge)

1. **Upgrade fastify to `^5.7.3`** in `packages/server/package.json` and run `pnpm install && pnpm audit`. This resolves H-1 and H-2.
2. **Add cert/key patterns to `.gitignore`** (L-4 — one-liner, no risk).
3. **Remove committed `dist/` artifacts** and tighten the `.gitignore` glob (L-5).

Items M-1 through M-5 and L-1 through L-7 should be tracked as a Phase 1 security hardening epic before the server exposes any endpoints beyond `/health`.
