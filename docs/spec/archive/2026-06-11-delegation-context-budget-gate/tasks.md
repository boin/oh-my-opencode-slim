# Tasks: delegation-context-budget-gate

This file is the job-local execution contract for adding delegation budgeting,
context preservation, and steering-safe todo hygiene.

## Task Package Review

Status: passed
Reviewer: orchestrator self-review
Human-facing: no

Design Handoff Review: not applicable. This job changes internal orchestration
prompting and reminder text, not an end-user UI.

## Execution Readiness

Status: authorized
Scope: user explicitly authorized implementation with "开干" and later added
steering-safe todo hygiene as an in-scope constraint.

---

## TASK-001: Specify delegation/context and steering-todo requirements

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-25, sdd-workflow/DES-23

### Goal

Define the compact always-on delegation/context gate and steering-safe todo
hygiene requirement.

### Boundaries

- Files expected to change: job `delta-requirements.md`, `delta-design.md`, and
  this `tasks.md`.
- Domain trunks remain unchanged until `spec_merge`.

### Acceptance Checks

- Requirement distinguishes value-based delegation from ritual delegation.
- Requirement includes context isolation and evidence-contract constraints.
- Requirement says steering must merge into existing todos rather than replace
  them unless the user explicitly cancels/replaces the task.

### Validation

- Regenerate job trace after tasks are complete.

### Completion Evidence

- Job deltas contain fully qualified `sdd-workflow/REQ-25` and
  `sdd-workflow/DES-23`.

---

## TASK-002: Pin append-prompt delegation budget behavior

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-25, sdd-workflow/DES-23

### Goal

Add failing prompt tests for the compact delegation/context-preservation gate.

### Boundaries

- Files expected to change: `src/agents/append-prompt.test.ts`.
- Production prompt must not change in this task.

### Acceptance Checks

- Tests expect `Delegation Budget and Context Preservation` wording.
- Tests expect specialist calls are not ritual.
- Tests expect fast path, context isolation, compact evidence, proportional
  verification, and inline TDD wording.
- Tests keep the 400-line prompt budget guard.

### Validation

- `/root/.bun/bin/bun test src/agents/append-prompt.test.ts` fails before
  production prompt changes for assertion reasons.

### Completion Evidence

- Added failing assertions for `Delegation Budget and Context Preservation`,
  non-ritual specialist calls, fast path, context isolation, compact evidence,
  proportional verification, and inline TDD.
- Initial focused run failed before production prompt changes on missing
  delegation budget wording.

---

## TASK-003: Implement compact delegation/context prompt gate

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-25, sdd-workflow/DES-23

### Goal

Add the compact always-on delegation/context gate to `buildSddTddAppendBlock()`.

### Boundaries

- Files expected to change: `src/agents/append-prompt.ts` and possibly assertion
  wording in `src/agents/append-prompt.test.ts`.
- Do not inline the full long-form risk table into the prompt.

### Acceptance Checks

- Prompt states delegation is justified by specialist advantage, parallelism,
  risk reduction, or context isolation.
- Prompt includes a fast path and revocation condition.
- Prompt requires compact child evidence and risk-proportional verification.
- Prompt allows inline TDD for minor/known-small work while preserving TDD
  ordering.

### Validation

- `/root/.bun/bin/bun test src/agents/append-prompt.test.ts` passes.

### Completion Evidence

- Focused append-prompt tests pass with 14 tests, 0 failures.

---

## TASK-004: Pin and implement steering-safe todo hygiene

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-25, sdd-workflow/DES-23

### Goal

Ensure todo hygiene reminds agents to merge steering instructions into the
existing todo list instead of replacing still-valid todos.

### Boundaries

- Files expected to change: `src/hooks/todo-continuation/todo-hygiene.ts` and
  `src/hooks/todo-continuation/todo-hygiene.test.ts`.
- Do not add runtime todo diffing state; this is a reminder semantics fix.

### Acceptance Checks

- Test asserts the todo hygiene reminder includes steering/clarification merge
  semantics.
- Reminder preserves existing active/pending todo items unless user explicitly
  cancels or replaces the task.

### Validation

- `/root/.bun/bin/bun test src/hooks/todo-continuation/todo-hygiene.test.ts`
  passes.

### Completion Evidence

- Added reminder wording and unit coverage for steering-safe todo merging.
- Focused todo-hygiene tests pass with 11 tests, 0 failures.

---

## TASK-005: Validate, merge, archive, and commit

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-25, sdd-workflow/DES-23

### Goal

Run focused tests, full tests, typecheck, check:ci, and `bun run build`; then
merge/archive the SDD job and commit the worktree branch.

### Validation

- `/root/.bun/bin/bun test src/agents/append-prompt.test.ts`
- `/root/.bun/bin/bun test src/hooks/todo-continuation/todo-hygiene.test.ts`
- `/root/.bun/bin/bun test`
- `/root/.bun/bin/bun run typecheck`
- `/root/.bun/bin/bun run check:ci`
- `/root/.bun/bin/bun run build`

### Completion Evidence

- `/root/.bun/bin/bun test src/agents/append-prompt.test.ts src/hooks/todo-continuation/todo-hygiene.test.ts` passed: 25 tests, 0 failures.
- `PATH="/root/.bun/bin:$PATH" bun test` passed: 1220 tests, 0 failures.
- `PATH="/root/.bun/bin:$PATH" bun run typecheck` passed.
- `PATH="/root/.bun/bin:$PATH" bun run check:ci` passed.
- `PATH="/root/.bun/bin:$PATH" bun run build` passed.
