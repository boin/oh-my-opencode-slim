# Tasks: domain-triad-invariant

This file is the job-local execution contract. For spec-backed non-trivial SDD
jobs, implementation MUST NOT be delegated until task packages are authored and
mandatory task-package review passes.

## Task Package Review

Status: passed
Reviewer: oracle
Human-facing: no
Task Package Review.Status: passed

For Human-facing: yes | partial, complete Design Handoff Review before
implementation delegation and include a UI / Interaction Handoff Contract.
The contract must cover product behavior, interaction flow, state lifecycle,
copy semantics, validation strategy, visual reference level when relevant, and
Red Strategy.

## Execution Readiness

Status: authorized
Scope: task packages must be reviewed before implementation delegation.
Execution Readiness.Status: authorized

---

## TASK-001: Produce executable task packages

Owner: orchestrator
Status: completed

### Goal

Produce complete job-local task packages before implementation delegation.

---

## TASK-002: Enforce domain triad invariants

Owner: fixer
Status: completed
Anchors: sdd-workflow/DES-25
Human-facing: no

### Goal

Implement explicit domain triad validation so normal SDD paths fail fast on
existing-but-incomplete domains while preserving bootstrap initialization for
missing domains.

### Boundaries

- Touch only spec/trace tooling and their tests unless a directly affected
  type/export requires a nearby update.
- Do not introduce repair/migration mode in this task.
- Do not change parser heading semantics or trace table format.
- Do not silently create `requirements.md` or `design.md` outside the existing
  `spec_propose` missing-domain bootstrap path.

### Acceptance Checks

- `spec_propose` initializes a missing valid domain exactly as before.
- `spec_propose` rejects an existing domain directory missing
  `requirements.md` or `design.md` with an actionable incomplete-domain error.
- `spec_merge` rejects referenced incomplete domains before writes.
- `trace_regenerate` rejects incomplete domains without creating source files.
- Error text includes the domain path and missing filename(s).

### Validation

- Run targeted Bun tests for spec and trace tooling.
- Run TypeScript typecheck.

### Completion Evidence

- List changed files.
- Include test commands and pass/fail results.
- Confirm no source spec files are created by trace regeneration in the
  incomplete-domain failure path.

### Anti-Shell Rules

- Do not use shell text rewriting to modify source or test files.
- Do not remove or recreate `docs/spec/domains/*` directories during tests
  outside isolated temporary directories.

### UI / Interaction Handoff Contract

Not applicable. Human-facing: no.

### Completion Evidence

- Changed files:
  - `src/tools/spec/domain-triad.ts`
  - `src/hooks/trace-freshness/index.ts`
  - `src/hooks/trace-freshness/index.test.ts`
  - `src/tools/spec/io.ts`
  - `src/tools/spec/io.test.ts`
  - `src/tools/trace/io.ts`
  - `src/tools/trace/io.test.ts`
- Validation passed:
  - `bun test src/hooks/trace-freshness/index.test.ts src/tools/spec/io.test.ts src/tools/trace/io.test.ts` — 38 pass
  - `bun run typecheck`
  - `bun run check:ci`
- Incomplete-domain failure paths assert that normal trace/spec calls do not
  create missing source files and that `spec_merge` fails before appending
  sections. Trace freshness preserves the incomplete-domain diagnostic in its
  reminder instead of swallowing the error.
