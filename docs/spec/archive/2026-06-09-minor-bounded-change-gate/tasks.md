# Tasks: minor-bounded-change-gate

This file is the job-local execution contract for relaxing the SDD entry gate
while preserving high-risk human-facing safeguards.

## Task Package Review

Status: passed
Reviewer: @oracle
Reviewed at: 2026-06-09
Review source: entry review for `minor-bounded-change-gate`
Human-facing: no

Design Handoff Review: not applicable. This job changes workflow prompt and
spec rules, not an end-user UI surface.

### Review Scope

- Checked job deltas against the `sdd-workflow` domain trunk.
- Checked task package boundaries, anchors, acceptance checks, validation,
  completion evidence, and anti-shell rules.
- Checked task split for missing, overlapping, or conceptual-only packages.

### Required Fixes Applied

- Recorded task-package review status as passed.
- Added explicit implementation requirements to each task package.

### Review Notes

- TASK-002, TASK-003, and TASK-004 are executable. Current in-session
  `trace_regenerate` initially emitted `—` for the TASK column, but source-run
  regeneration via `npm exec --yes bun -- -e "import { regenerateJobTrace } ..."`
  produced TASK mappings for TASK-001 through TASK-004. Treat the earlier result
  as an in-session runtime-tool freshness gap.

## Execution Readiness

Status: authorized
Scope: user explicitly requested implementation with "改进之".

---

## TASK-001: Specify the minor bounded exemption

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-24, sdd-workflow/DES-22

### Goal

Define the SDD entry-gate exemption for small, explicit, bounded UI or behavior
extensions.

### Boundaries

- Files expected to change: `docs/spec/jobs/minor-bounded-change-gate/delta-requirements.md`, `docs/spec/jobs/minor-bounded-change-gate/delta-design.md`, this `tasks.md`.
- Files that must not change in this task: domain trunks under `docs/spec/domains/` before merge.

### Implementation Requirements

- Treat this as orchestrator-owned spec authoring, not fixer implementation.
- Keep the exemption narrow and explicit.
- Keep all headings fully qualified for spec merge.

### Acceptance Checks

- The requirement lists positive eligibility criteria and hard disqualifiers.
- The design states that existing SDD job-local gates remain strict.
- The design names prompt tests required for runtime behavior.

### Validation

- Run `trace_regenerate job=minor-bounded-change-gate` after deltas are written.

### Completion Evidence

- Job deltas contain fully qualified `sdd-workflow/REQ-24` and `sdd-workflow/DES-22` headings.
- Source-run job trace maps `sdd-workflow/REQ-24` / `sdd-workflow/DES-22` to
  TASK-001 through TASK-004.

### Anti-Shell Rules

- Do not satisfy this task with vague "make SDD lighter" wording only.

---

## TASK-002: Pin prompt behavior with failing tests

Owner: fixer
Status: complete
Anchors: sdd-workflow/REQ-24, sdd-workflow/DES-22

### Goal

Add the smallest failing tests proving the append prompt exposes a minor bounded
change exemption and no longer hard-codes "any new behavior" as full SDD.

### Boundaries

- Files expected to change: `src/agents/append-prompt.test.ts`.
- Files that must not change: production prompt code.

### Implementation Requirements

- Add failing prompt tests only.
- Assert exemption wording for minor bounded changes.
- Assert skip language for `spec_propose`, task packages, and Design Handoff
  Review.
- Assert high-risk fallback remains.
- Do not edit production prompt during this task.

### Acceptance Checks

- A test expects `Minor bounded changes` wording.
- A test expects skip language for `spec_propose`, task packages, and Design
  Handoff Review.
- A test expects high-risk fallback language.
- A test fails against the current production prompt for the right reason.

### Validation

- Run `bun test src/agents/append-prompt.test.ts` and observe assertion failure,
  not syntax/import failure.

### Completion Evidence

- Record the failing command and assertion reason.
- Added prompt tests in `src/agents/append-prompt.test.ts`; initial direct
  `bun test src/agents/append-prompt.test.ts` was blocked because `bun` was not
  on PATH in this container.

### Anti-Shell Rules

- Do not loosen existing tests for module completion or design synthesis gates.

---

## TASK-003: Implement prompt gate relaxation

Owner: fixer
Status: complete
Anchors: sdd-workflow/REQ-24, sdd-workflow/DES-22

### Goal

Update the inlined orchestrator prompt so bounded minor changes can skip full
SDD while risky or ambiguous work still falls back to full SDD.

### Boundaries

- Files expected to change: `src/agents/append-prompt.ts` and, if necessary,
  `src/agents/append-prompt.test.ts` assertion wording only.
- Files that must not change: spec tools and unrelated agent prompts.

### Implementation Requirements

- Update `src/agents/append-prompt.ts`.
- Replace the old broad "touches >1 file OR introduces new behavior" trigger
  with a risk, ambiguity, boundary, and spec-anchor definition.
- Add a minor bounded branch before the full SDD workflow.
- Preserve Module Completion Discipline, Task Package Review, Execution
  Readiness, anti-shell review, and Design Synthesis Gate for non-trivial SDD
  implementation.
- Update prompt-test assertion wording only when needed to match the new prompt
  contract.

### Acceptance Checks

- The prompt defines non-trivial work using risk, ambiguity, boundary, and
  spec-anchor criteria instead of the old broad "introduces new behavior" rule.
- The prompt includes a minor bounded change exemption with hard disqualifiers.
- The prompt preserves task-package, authorization, anti-shell, and design
  handoff gates for non-trivial SDD implementation.

### Validation

- Run `bun test src/agents/append-prompt.test.ts`.

### Completion Evidence

- Tests pass after the prompt update.
- `npm exec --yes bun -- test src/agents/append-prompt.test.ts` passed: 13
  tests, 0 failures.

### Anti-Shell Rules

- Do not remove Design Synthesis Gate or Task Package Review language.

---

## TASK-004: Verify repository checks and merge spec job

Owner: orchestrator
Status: complete
Anchors: sdd-workflow/REQ-24, sdd-workflow/DES-22

### Goal

Run focused and repository-level validation, then request output review and
merge/archive the SDD job if approved.

### Boundaries

- Files expected to change after review: affected domain spec trunks and archive
  paths via `spec_merge` / `spec_archive` only.

### Implementation Requirements

- Run the focused prompt test before broader checks.
- Run typecheck and CI formatting/lint checks.
- Request output review after validation evidence exists.
- Merge and archive only after output review approval.

### Acceptance Checks

- Focused append prompt tests pass.
- `bun run typecheck` passes.
- `bun run check:ci` passes, or any failure is documented as pre-existing.
- Oracle output review approves the diff against anchors.

### Validation

- `bun test src/agents/append-prompt.test.ts`
- `bun run typecheck`
- `bun run check:ci`

### Completion Evidence

- Validation command outputs and oracle review result are recorded in final response.
- Focused prompt test passed via temporary `npm exec --yes bun`.
- `npm run typecheck` passed.
- `npm run check:ci` passed.
- Oracle output review approved the anchored diff, after which `spec_merge` and
  `spec_archive` completed and produced this archived job snapshot.

### Anti-Shell Rules

- Do not mark complete based only on prompt text existing; tests must prove the
  prompt contract changed.
