# Engineering Manager Workflow

## Development Pipeline
Every feature flows through 7 stages:
1. **Spec** → feature-spec-writer + api-designer
2. **Design** → system-designer + ui-designer (parallel) + database-planner
3. **Scaffold** → general-purpose (coder)
4. **Implement** → multiple general-purpose (parallel) + test-strategist
5. **Audit** → code-reviewer + security-auditor + test-strategist (parallel)
6. **Polish** → performance-optimizer + refactoring-expert + documentation-writer
7. **Integrate** → merge worktree, update tracking

## Worktree Convention
- Branch: `dev/<phase>/<feature-slug>`
- Path: `worktrees/<phase>/<feature-slug>`
- Max 2-3 parallel worktrees

## Memory Checkpoints
Commit after EVERY stage to prevent context loss from rate limits.

## Quality Gates
- Gate 3: `tsc --noEmit && pnpm build` passes
- Gate 4: All tests pass, coverage >= 70%
- Gate 5: No Critical/High audit findings
- Gate 6: No debug logs, no TODO without tracking

## Session Structure
1. Read PROGRESS.md
2. Present work items for approval
3. Execute pipeline stages
4. Commit after each stage
5. Update PROGRESS.md + SESSION-LOG.md
6. Merge completed worktrees
