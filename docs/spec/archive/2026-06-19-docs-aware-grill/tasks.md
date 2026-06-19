# Tasks: docs-aware-grill

This file is the job-local execution contract. For spec-backed non-trivial SDD
jobs, implementation MUST NOT be delegated until task packages are authored and
mandatory task-package review passes.

## Task Package Review

Status: passed
Task Package Review.Status: passed
Reviewer: @oracle
Human-facing: partial

For Human-facing: yes | partial, complete Design Handoff Review before
implementation delegation and include a UI / Interaction Handoff Contract.
The contract must cover product behavior, interaction flow, state lifecycle,
copy semantics, validation strategy, visual reference level when relevant, and
Red Strategy.

## Execution Readiness

Status: authorized
Execution Readiness.Status: authorized
Authorized by: user
Scope: upgrade fork-owned grill skill and related skill documentation for docs-aware mode.

---

## TASK-001: Produce executable task packages

Owner: orchestrator
Status: complete

### Goal

Produce complete job-local task packages before implementation delegation.

### Completion Evidence

- Files changed: `docs/spec/jobs/docs-aware-grill/tasks.md`.
- Acceptance checks satisfied: implementation task package authored below with
  anchors, boundaries, acceptance checks, validation, completion evidence, and
  anti-shell rules.
- Validation run: pending task-package review.
- Result: ready for mandatory `@oracle` task-package review.

---

## TASK-002: Upgrade grill docs-aware workflow assets

Anchors: sdd-workflow/REQ-30, sdd-workflow/DES-28
Owner: @fixer
Status: complete
Human-facing: partial

### Goal

Update the fork-owned `grill` skill and related skill documentation so `grill`
has a docs-aware codebase mode with shared terminology updates, ADR capture, and
clear implementation-authorization semantics, without adding a separate
`grill-with-docs` skill.

### Boundaries

- Files/directories expected to change:
  - `src/fork/skills/grill/SKILL.md`
  - `src/fork/skills/grill/README.md`
  - `docs/fork/skills.md`
  - `src/cli/custom-skills.ts`
- Files/directories that must not change:
  - no new `src/**/grill-with-docs` skill directory
  - no broad orchestrator prompt expansion unless required by validation
  - no runtime behavior refactor beyond the skill registry description string
- Existing contracts that must be preserved:
  - installed skill name remains `grill`
  - `brainstorming` continues to hand off to `grill` for SDD repos
  - SDD job/domain two-tier layout and trace heading rules remain unchanged

### Implementation Requirements

- Add a `Context docs pass` before the existing four grill phases.
- Define shared context/glossary lookup order and bounded read scope.
- Define `Terminology Delta` shape and persistence rules.
- Define ADR trigger heuristic, default location, numbering, required sections,
  and linkage to REQ/DES/job ids.
- Clarify that approval phrases such as "方案没有问题了，可以开始实现了" are
  execution authorization signals, not automatic SDD-start signals.
- Add anti-patterns for skipping context docs, repeatedly re-explaining durable
  terms, over-persisting one-off phrasing, missing ADR-worthy decisions, and
  splitting this into a separate installed skill.
- Refresh fork skill docs and bundled skill description to mention docs-aware
  terminology and ADR behavior.

### UI / Interaction Handoff Contract

- Context and user goal: users invoke or rely on `grill` when turning an unclear
  codebase change into SDD-ready requirements and design. The upgraded behavior
  must make it clear that `grill` is still the single SDD entrypoint, now with
  docs-aware shared-language and ADR responsibilities.
- Primary path: when a codebase/SDD repo uses `grill`, the skill first checks
  context/glossary/ADR docs, then runs the existing four-phase interrogation,
  then persists terminology or ADR deltas only when durable.
- State lifecycle: missing context docs are a non-blocking assumption; existing
  docs are read before assumptions; terminology/ADR updates happen after
  convergence; implementation authorization happens only after SDD gates pass.
- Copy semantics: use concise workflow language. Avoid presenting
  `grill-with-docs` as a separate installed skill. Treat it as upstream
  inspiration/codebase mode for `grill`.
- Validation strategy: verify changed docs contain the required sections and the
  registry still exposes only `grill`; run formatting/type checks and focused CLI
  tests.
- Visual reference level: not applicable; this is documentation and skill prompt
  behavior, not visual UI.
- Red Strategy: before implementation, the skill lacks `Context docs pass`,
  `Terminology Delta`, ADR discipline, and approval-signal guidance. The red
  check is textual: searches for these required headings/phrases fail or are
  absent before the change and pass after the change.

### Acceptance Checks

- `src/fork/skills/grill/SKILL.md` contains docs-aware mode, context docs pass,
  terminology delta, ADR discipline, and authorization-signal guidance.
- `docs/fork/skills.md` describes `grill` as docs-aware and does not list a new
  `grill-with-docs` skill.
- `src/cli/custom-skills.ts` keeps the `grill` registry entry name and source
  path unchanged while updating only the description string.
- No new skill directory named `grill-with-docs` exists.

### Validation

- Command: `bun run check:ci`
- Expected result: passes.
- Command: `bun run typecheck`
- Expected result: passes.
- Command: `bun test src/cli/skills.test.ts src/cli/providers.test.ts`
- Expected result: passes when test filtering/paths are supported by Bun.

### Completion Evidence

- Files changed: `src/fork/skills/grill/SKILL.md`,
  `src/fork/skills/grill/README.md`, `docs/fork/skills.md`,
  `src/cli/custom-skills.ts`.
- Acceptance checks satisfied: `grill` remains the installed skill name and
  source path; docs-aware mode, context docs pass, terminology delta, ADR
  discipline, approval-signal guidance, and anti-patterns are documented; fork
  skill docs and registry description are refreshed; no `grill-with-docs` skill
  directory was added.
- Validation run: `bun run check:ci`; `bun run typecheck`;
  `bun test src/cli/skills.test.ts src/cli/providers.test.ts`.
- Result: all validation commands passed.
- Reviewer notes: pending output review.

### Anti-Shell Rules

- No TODO/stub/placeholder text may satisfy the docs-aware grill behavior.
- Do not add a placeholder `grill-with-docs` skill or route shim.
- Do not broaden the always-on prompt with a long duplicate of the skill rules.
- Do not change unrelated workflow skills or registry entries.
