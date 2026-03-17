# Session Log

## Session 2 — 2026-03-17 — Phase 1: Foundation (Exchange Connectors + WebGL Engine)

### Objective
Implement the first two foundation modules in parallel worktrees.

### Pipeline Execution
- **Stage 1+2 (Spec+Design):** 4 agents in parallel → 2 specs + 2 designs
- **Stage 3+4 (Implement):** 2 agents in parallel worktrees:
  - Exchange Connectors: 11 files, 53 tests (BinanceAdapter, BybitAdapter, WSManager, OrderbookManager, FlushScheduler, DataWorker)
  - WebGL Engine: 10 files, 31 tests (ViewportTransform, RenderingContext, CandlestickRenderer, GridRenderer, CrosshairRenderer, ChartManager, ChartPanel)
- **Stage 5 (Audit):** code-reviewer + security-auditor (parallel):
  - CRIT-01: Fixed Binance depth snapshot symbol routing (multi-symbol safe now)
  - CRIT-02: Added sequence gap detection to OrderbookManager
  - 6 High findings tracked for optimization
  - 0 security vulnerabilities (except pre-existing Fastify CVE)
- **Stage 7 (Integrate):** Committed and pushed

### Stats
- Total tests: 106 (up from 22)
- Total source files: ~30 new files
- UI bundle: 287KB (42 modules)
- Build time: ~2s

### Deferred Items
- HIGH-01: baseDelay discrepancy (1000ms vs 100ms) — leave as 1000ms, more robust
- HIGH-03: Bybit ticker percent calculation — verify with live data
- HIGH-04: ViewportTransform immutability — not needed for Phase 1
- HIGH-05: useChart stale ref — fix when adding real panel lifecycle
- HIGH-06: Candlestick buffer layout — verify with real rendering

### Next Session
Phase 1, Session 3: Data Worker Pipeline + Dockview Layout Shell

---

## Session 1 — 2026-03-17 — Phase 0: Bootstrap

### Objective
Establish the engineering workflow and scaffold the monorepo project structure.

### Work Items Completed
1. Created Engineering Manager Workflow document (7-stage pipeline)
2. Created tracking infrastructure (PROGRESS.md, SESSION-LOG.md, WORKFLOW.md)
3. Phase 0: Project Bootstrap — full pipeline execution

### Pipeline Execution
- **Stage 1 (Spec):** feature-spec-writer + api-designer → `specs/phase-0-bootstrap.spec.md` (47KB, 25 acceptance criteria)
- **Stage 2 (Design):** system-designer → `designs/phase-0-bootstrap.design.md` (45KB, full directory tree + interfaces)
- **Stage 3+4 (Scaffold+Implement):** general-purpose (worktree) → 5 packages, 22 tests, all builds green
- **Stage 5 (Audit):** code-reviewer + security-auditor (parallel) → 2 Critical + 5 High findings fixed:
  - C-1: Fixed unsafe `as ConnectionStatus` cast → proper enum import
  - C-2: Added Ticker + Liquidation callbacks to ExchangeAdapter interface
  - H-1: Removed unused @terminal/shared dependency from @terminal/core
  - H-2: Replaced `__dirname` with `import.meta.url` in Vite config
  - H-3: Fixed fragile `isMainModule` detection → `fileURLToPath(import.meta.url)`
  - H-4: Replaced deprecated `react-dom/test-utils` with `react` act import
  - H-5: Added exchange, symbol, timeframe fields to OHLCVCandle
  - L-4: Added *.pem, *.key, *.p12 to .gitignore
  - Security H-1/H-2 (Fastify CVEs): Tracked for Phase 1 (upgrade when features are added)
  - Security M-2: Changed server bind from 0.0.0.0 → 127.0.0.1 (dev default)
  - Security M-5: Disabled sourcemaps in production build
- **Stage 7 (Integrate):** Committed and pushed

### Packages Created
| Package | Source Files | Tests | Status |
|---------|------------|-------|--------|
| @terminal/types | 12 | 2 | ✅ |
| @terminal/shared | 8 | 15 | ✅ |
| @terminal/core | 2 | 3 | ✅ |
| @terminal/ui | 3 | 1 | ✅ |
| @terminal/server | 2 | 1 | ✅ |

### Key Decisions
- Package prefix: @terminal/* (not @trading/*)
- Monorepo with pnpm workspaces (user choice)
- Fully autonomous pipeline with memory checkpoints
- TypeScript strict mode + no-explicit-any as ESLint error
- Vite 5 for frontend, tsc for all other packages
- Server defaults to 127.0.0.1 (not 0.0.0.0)

### Deferred Items
- Fastify CVE upgrades (H-1, H-2 from security audit) → address when adding real endpoints
- @fastify/helmet, CORS config, rate limiting → Phase 1 when server features are added
- Turborepo integration → evaluate during Phase 1 if build times become an issue

### Next Session Focus
Phase 1, Session 2: Exchange Connector Framework + WebGL Rendering Engine (parallel worktrees)
