# Job: module-completion-discipline

**Status**: ready-for-task-package-review
**Created**: 2026-05-30
**Domain**: `sdd-workflow`

## Why

Large planning tasks currently tend to produce broad requirements/design
documents, then execution drifts into shallow scaffolding: UI shells, API
adapters, service placeholders, fixture-only flows, or TODO-heavy modules
that look structurally complete but do not deliver the promised behavior.

The SDD triad is good enough to preserve product direction, but it is not yet
strict enough to drive module-by-module execution. The current trace can map
`REQ -> DES`, but `TASK` entries are often empty. That leaves the orchestrator
free to hand a conceptual module to `@fixer`, while the fixer prompt says it
only executes a complete task specification and does not research or plan.

This mismatch is the suspected root cause: SDD has direction, but no mandatory
executable task package between concept and implementation.

## Observed Evidence

This repository already shows the gap. The current domain trace at
`docs/spec/domains/sdd-workflow/trace.md` maps `REQ -> DES`, but every `TASK`
cell is empty. That means a cold agent can recover the product and design
direction, but cannot recover which bounded execution packages prove the work
complete.

External reference case:

Use `/workspace/denox/rpa-excel-engine/docs/spec` as the regression example.

Findings from that project:

- Long-lived `requirements.md` and `design.md` contain useful product and
  architecture direction, but many entries are system-level concepts.
- Archived delta slices are more concrete: they name files, function
  signatures, routes, state semantics, and explicit out-of-scope boundaries.
- The domain `trace.md` maps requirements to design anchors but its `TASK`
  column is empty, matching the local symptom above.
- A cold agent can understand what the product should become, but cannot
  mechanically know which bounded module is complete without inventing a plan.

The fix should generalize; do not hardcode Denox or Excel-specific behavior.

## Goal

Add a Module Completion Discipline to the slim SDD workflow. For spec-backed
non-trivial work, the orchestrator must produce job-local executable task
packages, pass mandatory task-package review, and only then delegate
implementation. Each task package must define module boundaries, expected real
behavior, validation evidence, and explicit anti-shell acceptance checks.

The result should make it hard for an agent to declare a large task complete
after only creating a skeleton.

## Non-Goals

- Do not replace the existing domain/job SDD layout.
- Do not add Denox-specific or Excel-specific policy.
- Do not make `@fixer` a planner or researcher.
- Do not require Opus as the default orchestrator model.
- Do not require every small one-file edit to create task files.
- Do not require a heavyweight project-management system.

## Primary Diagnosis Questions

The implementing agent must answer these before changing code:

1. Where does the orchestrator currently transform `REQ/DES` into executable
   work?
2. Can the current trace tooling represent task-level completion? If yes, why
   are task cells empty in real projects? If no, what minimal representation
   is needed?
3. What prompt text currently allows a conceptual task to be delegated to
   `@fixer`?
4. What should `@fixer` refuse or report as incomplete?
5. How should output review detect scaffolding masquerading as completion?
6. Which behavior belongs in prompt discipline, and which behavior needs
   parser/schema/tool support?
7. How does mandatory task-package review remain visible to cold sessions?

## Expected Deliverables

Implement the smallest coherent change set that makes large SDD execution
module-complete by default:

- Requirements/design deltas in this job, amended if needed.
- Prompt changes for orchestrator and fixer.
- Tool/schema changes required by the chosen `tasks.md` + trace TASK mapping
  path in `delta-design.md`.
- Tests that prove task-level discipline appears in generated prompts and/or
  trace/task handling.
- Documentation updates that explain how agents should run large plans.
- Verification output from `bun test`, `bun run typecheck`, and
  `bun run check:ci` or a clear blocker if the local environment cannot run
  them.

## Acceptance Summary

This job is accepted only when a cold agent running a large feature plan is
forced to:

1. `spec_propose` creates a job-local `tasks.md` bootstrap package for
   spec-backed jobs,
2. orchestrator prompt text requires task packages and mandatory
   task-package review before write-capable delegation,
3. fixer prompt text rejects under-specified non-trivial work using a
   structured missing-fields report,
4. trace tooling maps job-local task anchors into non-empty TASK cells for
   open jobs,
5. output review treats shell/stub/placeholder/fixture-only completion as a
   hard failure, and
6. tests cover the prompt and tooling behavior above.
