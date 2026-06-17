# Tasks: fork-conflict-surface-isolation

This file is the job-local execution contract. For spec-backed non-trivial SDD
jobs, implementation MUST NOT be delegated until task packages are authored and
mandatory task-package review passes.

## Task Package Review

Status: passed
Reviewer: oracle (`ses_1297604e4ffeJFi5lJzVi1k6tM`)
Human-facing: no

For Human-facing: yes | partial, complete Design Handoff Review before
implementation delegation and include a UI / Interaction Handoff Contract.
The contract must cover product behavior, interaction flow, state lifecycle,
copy semantics, validation strategy, visual reference level when relevant, and
Red Strategy.

## Execution Readiness

Status: authorized
Scope: fork-only docs, skills, tools, hooks, CodeGraph MCP integration, and
prompt append helpers may be migrated under `docs/fork/**` and `src/fork/**`
with shared entry files kept as thin adapters.

---

## TASK-001: Produce executable task packages

Owner: orchestrator
Status: completed

### Goal

Produce complete job-local task packages before implementation delegation.

## TASK-002: Move fork-only docs and static skills

Owner: fixer
Status: completed
Rationale anchor: sdd-workflow/DES-27.

### Goal

Move fork-only descriptive docs into `docs/fork/**`, move fork-only vendored
skills into `src/fork/skills/**`, and restore upstream-owned shared docs where
practical.

### Validation

- `bun run check:ci`
- `bun run typecheck`
- `bun test src/cli`

## TASK-003: Move fork-only runtime modules

Owner: fixer
Status: completed
Rationale anchor: sdd-workflow/DES-27, codegraph/DES-4.

### Goal

Move fork-only spec, trace, CodeGraph, todo-hygiene, trace-freshness, and prompt
append helper modules into `src/fork/**`, keeping shared roots as thin adapters.

### Validation

- `bun run check:ci`
- `bun run typecheck`
- targeted tests for moved modules and `src/mcp/index.test.ts`

## TASK-004: Verify and review conflict-surface reduction

Owner: orchestrator + oracle
Status: in_progress
Rationale anchor: sdd-workflow/DES-27, codegraph/DES-4.

### Goal

Run full validation, produce the changed-file conflict-surface report, and run
output review before merging the spec job.
