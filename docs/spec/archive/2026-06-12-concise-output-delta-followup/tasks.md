# Tasks: concise-output-delta-followup

This file is the job-local execution contract for concise user output and
delta-scoped specialist follow-up rules.

## Task Package Review

Status: passed
Reviewer: orchestrator self-review
Human-facing: no

Design Handoff Review: not applicable. This job changes internal orchestration
prompting, not an end-user UI.

## Execution Readiness

Status: authorized
Scope: user requested implementation with "干".

---

## TASK-001: Specify concise output and delta follow-up

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-26, sdd-workflow/DES-24

### Goal

Define concise user output and delta-scoped specialist follow-up requirements.

### Boundaries

- Files expected to change: this job's `delta-requirements.md`,
  `delta-design.md`, and `tasks.md`.
- Domain trunks remain unchanged until `spec_merge`.

### Acceptance Checks

- Requirement defines route/reason/next/status user output.
- Requirement suppresses raw reasoning/evidence by default.
- Requirement defines same-session delta follow-up and its disqualifiers.

### Validation

- Regenerate job trace after tasks are present.

---

## TASK-002: Pin append prompt concise/delta rules

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-26, sdd-workflow/DES-24

### Goal

Add failing append-prompt tests for concise user output and delta follow-up.

### Boundaries

- Files expected to change: `src/agents/append-prompt.test.ts`.
- Production prompt must not change in this task.

### Acceptance Checks

- Tests expect route-first terse output wording.
- Tests expect no raw reasoning / long evidence chains by default.
- Tests expect evidence exceptions for failure, approval, high risk, surprising
  result, or user request.
- Tests expect same-session delta follow-up with previous `task_id`, previous
  verdict, required fixes, changed files, applied delta, validation, and terse
  output.

### Validation

- `PATH="/root/.bun/bin:$PATH" bun test src/agents/append-prompt.test.ts`
  fails before production prompt changes for assertion reasons.

### Completion Evidence

- Added failing assertions for concise output and delta-scoped specialist
  follow-up reuse.
- Red run failed on missing `Concise User Output` and `Specialist Follow-up
  Reuse` wording before production prompt changes.

---

## TASK-003: Implement compact prompt rules

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-26, sdd-workflow/DES-24

### Goal

Add compact always-on prompt wording for concise output and delta follow-up.

### Boundaries

- Files expected to change: `src/agents/append-prompt.ts` and, if needed,
  assertion wording in `src/agents/append-prompt.test.ts`.
- Do not inline long templates or detailed risk matrices.

### Acceptance Checks

- Prompt includes `route`, `reason`, `next`, and `status` default output shape.
- Prompt suppresses raw reasoning, long evidence chains, and full child summaries
  by default.
- Prompt defines delta follow-up reuse and full-review escalation conditions.
- Existing prompt line budget remains below 400 lines.

### Validation

- Focused append-prompt tests pass.

### Completion Evidence

- Added compact `Concise User Output and Specialist Follow-up Reuse` prompt
  block.
- Focused append-prompt tests pass with 16 tests, 0 failures.

---

## TASK-004: Validate, merge, archive, and commit

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-26, sdd-workflow/DES-24

### Goal

Run focused tests plus `bun test`, `typecheck`, `check:ci`, and `build`; then
merge/archive the SDD job and commit.

### Validation

- `PATH="/root/.bun/bin:$PATH" bun test src/agents/append-prompt.test.ts`
- `PATH="/root/.bun/bin:$PATH" bun test`
- `PATH="/root/.bun/bin:$PATH" bun run typecheck`
- `PATH="/root/.bun/bin:$PATH" bun run check:ci`
- `PATH="/root/.bun/bin:$PATH" bun run build`

### Completion Evidence

- `PATH="/root/.bun/bin:$PATH" bun test src/agents/append-prompt.test.ts` passed: 16 tests, 0 failures.
- `PATH="/root/.bun/bin:$PATH" bun test` passed: 1246 tests, 0 failures.
- `PATH="/root/.bun/bin:$PATH" bun run typecheck` passed.
- `PATH="/root/.bun/bin:$PATH" bun run check:ci` passed.
- `PATH="/root/.bun/bin:$PATH" bun run build` passed.
- Oracle output review initially requested stronger delta follow-up disqualifiers.
  Applied the required fix in `delta-requirements.md`, `delta-design.md`,
  `src/agents/append-prompt.ts`, and `src/agents/append-prompt.test.ts`.
- Delta re-review approved the required fix: `fixed: yes`, `new risk: no`,
  `verdict: approve`.
