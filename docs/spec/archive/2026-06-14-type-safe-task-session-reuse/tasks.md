# Tasks: type-safe-task-session-reuse

This file is the job-local execution contract. For spec-backed non-trivial SDD
jobs, implementation MUST NOT be delegated until task packages are authored and
mandatory task-package review passes.

## Task Package Review

Task Package Review.Status: passed
Reviewer: @oracle
Human-facing: no

For Human-facing: yes | partial, complete Design Handoff Review before
implementation delegation and include a UI / Interaction Handoff Contract.
The contract must cover product behavior, interaction flow, state lifecycle,
copy semantics, validation strategy, visual reference level when relevant, and
Red Strategy.

## Execution Readiness

Execution Readiness.Status: authorized
Scope: TASK-002 may be executed as a focused TDD bugfix.

---

## TASK-001: Produce executable task packages

Owner: orchestrator
Status: complete

### Goal

Produce complete job-local task packages before implementation delegation.

---

## TASK-002: Enforce raw task session specialist matching

Anchors: sdd-workflow/REQ-28, sdd-workflow/DES-26
Owner: @fixer
Status: complete
Human-facing: no

### Goal

Known raw `ses_*` task ids cannot bypass the same-specialist reusable-session
guard, while unknown raw native session ids keep the existing explicit-resume
escape hatch.

### Boundaries

- Files/directories expected to change:
  - `src/hooks/task-session-manager/index.ts`
  - `src/hooks/task-session-manager/index.test.ts`
- Files/directories that must not change:
  - task tool schemas or OpenCode SDK adapters
  - background job board prompt format, unless strictly needed for this guard
- Existing contracts that must be preserved:
  - alias reuse still requires completed/reconciled same-specialist sessions;
  - unknown raw `ses_*` ids still pass through for explicit native resume;
  - unknown alias-like values still have `task_id` removed.

### Implementation Requirements

- Detect whether the requested `task_id` resolves to a known board record before
  applying the raw-session pass-through exception.
- For known records, preserve/normalize `task_id` only if
  `resolveReusable(parent, requested, subagent_type)` returns a job.
- Delete `args.task_id` when a known record exists but is not reusable for the
  requested specialist.

### Acceptance Checks

- Known raw `ses_*` id for an `explorer` job is not resumed when the new task
  requests `subagent_type: 'oracle'`.
- Known raw `ses_*` id for an `explorer` job is resumed when the new task
  requests `subagent_type: 'explorer'`.
- Unknown raw `ses_*` id is still preserved.
- Existing alias and reusable-session tests remain green.

### Validation

- Command: `PATH="/root/.bun/bin:$PATH" bun test src/hooks/task-session-manager/index.test.ts`
- Expected result: all task-session-manager tests pass.

### Completion Evidence

- Files changed: `src/hooks/task-session-manager/index.ts`,
  `src/hooks/task-session-manager/index.test.ts`.
- Acceptance checks satisfied: known wrong-agent raw `ses_*` id is dropped;
  known same-agent raw `ses_*` id is preserved; unknown raw `ses_*` id remains
  preserved by the existing regression test; unknown aliases remain dropped by
  existing regression test.
- Validation run:
  - `PATH="/root/.bun/bin:$PATH" bun test src/hooks/task-session-manager/index.test.ts -t "known raw session id"`
  - `PATH="/root/.bun/bin:$PATH" bun test src/hooks/task-session-manager/index.test.ts`
  - `PATH="/root/.bun/bin:$PATH" bun run typecheck`
  - `PATH="/root/.bun/bin:$PATH" bun run check:ci`
  - `PATH="/root/.bun/bin:$PATH" bun test`
- Result: focused raw-session tests passed (2 pass); task-session-manager tests
  passed (41 pass); typecheck passed; Biome check passed; full test suite passed
  (1282 pass, 0 fail).
- Reviewer notes: Refactor step skipped; the green implementation is a minimal
  guard on the existing `tool.execute.before` `task_id` path with no new helper
  or duplication to simplify.

### Anti-Shell Rules

- No TODO/stub/placeholder may satisfy this task.
- The guard must run on the actual `tool.execute.before` task path.
- Tests must exercise hook argument mutation directly, not only helper-level
  behavior.
