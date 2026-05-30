# Tasks: fixer-executable-task-gate

## Task Package Review

Status: passed
Reviewer: @oracle
Reviewed at: 2026-05-31
Review source: task-package-review

### Design Handoff Review

Status: not-applicable
Reason: This job changes SDD workflow rules and prompts, not an end-user UI.

### Review Scope

- Check `sdd-workflow/REQ-23` and `sdd-workflow/DES-21` against the council and grill consensus.
- Check that the gate is triggered, not universal.
- Check that the handoff contract makes human-facing tasks fixer-executable and human-deliverable.
- Check that future prompt/template/test work is clearly bounded.

### Required Fixes

- None remaining. @oracle returned PASS with minor required fixes; the trigger probe, orchestrator structural-repair limit, REQ-23 ownership routing, and TASK-003 acceptance check were updated.

### Review Notes

- Gate is triggered rather than universal. Design Handoff Review is not applicable to this SDD documentation job because it changes workflow rules, not an end-user UI.

## Execution Readiness

Status: authorized
Authorized by: user request to land SDD docs after final @council conclusion
Authorized at: 2026-05-31
Scope: SDD documentation for triggered design synthesis and handoff review.

### Readiness Summary

- Task-package review status: passed
- Next executable tasks: TASK-005, TASK-006, TASK-007
- Required validation: targeted prompt/template tests, full test suite, typecheck, and check:ci.
- Risks/blockers: Current runtime trace tool still emits an empty TASK column for this job, likely because the active plugin dist/session is stale relative to source.

---

## TASK-001: Write design handoff requirement

Anchors: sdd-workflow/REQ-23, sdd-workflow/DES-21
Owner: orchestrator
Human-facing: no
Status: complete

### Goal

Replace the placeholder in `delta-requirements.md` with the normative rule requiring a reviewed UI / Interaction Handoff Contract before human-facing tasks become fixer-executable.

### Boundaries

- Files/directories expected to change: `docs/spec/jobs/fixer-executable-task-gate/delta-requirements.md`.
- Files/directories that must not change: domain trunks under `docs/spec/domains/`.
- Existing contracts that must be preserved: qualified heading format and fully qualified rationale anchors.

### Implementation Requirements

- Define human-facing scope.
- Require agent-owned UX synthesis when user guidance is absent.
- State that `@fixer` must not invent product behavior, interaction, state, copy, API/data assumptions, or validation.
- Include human-deliverable quality and no-shell-UI bar.
- Include Red Strategy and reference-level policy.

### Acceptance Checks

- REQ-23 defines human-facing scope.
- REQ-23 requires one minimal clarification question before agent-owned synthesis when guidance is absent.
- REQ-23 states `@fixer` must not invent product behavior, interaction, state, copy, or validation.
- REQ-23 includes human-deliverable quality and no-shell-UI bar.
- REQ-23 includes Red Strategy and reference-level policy.

### Validation

- Command or smoke: read `delta-requirements.md`.
- Expected result: heading is `## sdd-workflow/REQ-23:` and no `<fill in>` placeholder remains.

### Completion Evidence

- Files changed: `docs/spec/jobs/fixer-executable-task-gate/delta-requirements.md`.
- Acceptance checks satisfied: human-facing scope, one-question clarification, agent-owned UX synthesis routing, fixer no-invention rule, human-deliverable bar, Red Strategy, and reference-level policy are present.
- Validation run: read `delta-requirements.md`; grep for unresolved placeholders.
- Result: heading is `## sdd-workflow/REQ-23:` and no placeholder remains in the requirement body.
- Reviewer notes: @oracle PASS after minor fixes applied.

### Anti-Shell Rules

- The requirement must define enforceable behavior, not a generic “make better UI” preference.
- The requirement must preserve a triggered gate and not make all SDD jobs UI-heavy.

---

## TASK-002: Write triggered design synthesis design

Anchors: sdd-workflow/REQ-23, sdd-workflow/DES-21
Owner: orchestrator
Human-facing: no
Status: complete

### Goal

Replace the placeholder in `delta-design.md` with the Design Synthesis Gate, ownership ladder, contract schema, Design Handoff Review mechanics, and fixer refusal rules.

### Boundaries

- Files/directories expected to change: `docs/spec/jobs/fixer-executable-task-gate/delta-design.md`.
- Files/directories that must not change: domain trunks under `docs/spec/domains/`.
- Existing contracts that must be preserved: `Rationale anchor: sdd-workflow/REQ-23.`

### Implementation Requirements

- Define a trigger probe for human-facing work.
- Define the one-question clarification rule.
- Define `@designer` contract-first behavior.
- Define `@council` escalation cases.
- Define `@designer` direct-code exception.
- Define required handoff contract fields.
- Define Design Handoff Review and failure routing.
- Define `@fixer` refusal behavior.

### Acceptance Checks

- DES-21 defines trigger probe.
- DES-21 defines one-question clarification rule.
- DES-21 defines `@designer` contract-first behavior.
- DES-21 defines `@council` escalation cases.
- DES-21 defines direct-code exception for `@designer`.
- DES-21 defines required handoff contract fields.
- DES-21 defines Design Handoff Review.
- DES-21 defines failure routing.
- DES-21 defines `@fixer` refusal behavior.

### Validation

- Command or smoke: read `delta-design.md`.
- Expected result: heading is `## sdd-workflow/DES-21:`, rationale anchor is fully qualified, and no `<fill in>` placeholder remains.

### Completion Evidence

- Files changed: `docs/spec/jobs/fixer-executable-task-gate/delta-design.md`.
- Acceptance checks satisfied: trigger probe, clarification rule, `@designer` contract-first path, `@council` escalation, direct-code exception, handoff fields, Design Handoff Review, failure routing, and `@fixer` refusal are present.
- Validation run: read `delta-design.md`; grep for unresolved placeholders.
- Result: heading is `## sdd-workflow/DES-21:`, rationale anchor is fully qualified, and no placeholder remains in the design body.
- Reviewer notes: @oracle required tightening absent `Human-facing` handling and orchestrator repair limits; both were applied.

### Anti-Shell Rules

- The design must define operational gates, routing, and refusal rules, not only aspirational guidance.
- The gate must remain triggered, not universal.

---

## TASK-003: Review SDD deltas for executable specificity

Anchors: sdd-workflow/REQ-23, sdd-workflow/DES-21
Owner: @oracle
Human-facing: no
Status: complete

### Goal

Review the job deltas to confirm the proposed rules are concrete enough to implement later in prompts, templates, and tests.

### Boundaries

- Files/directories expected to change: none by `@oracle`; review only.
- Files/directories that must not change: all source files.
- Existing contracts that must be preserved: review result is recorded in this `tasks.md` gate block by the orchestrator after review.

### Implementation Requirements

- Check that `REQ-23` and `DES-21` are mutually consistent.
- Check that the rule is not a generic “make better UI” guideline.
- Check that the trigger avoids making every SDD task heavy.
- Check that the handoff contract is specific enough for `@fixer`.
- Check that the review gate distinguishes fixer-executable from human-deliverable.
- Check that fallback paths are clear.

### Acceptance Checks

- Oracle review returns pass or required fixes.
- Required fixes, if any, are actionable and tied to `REQ-23` / `DES-21`.
- `Task Package Review.Status` is updated to `passed` or `failed` with required fixes after review.

### Validation

- Command or smoke: delegate review to `@oracle`.
- Expected result: review result is recorded before implementation work begins.

### Completion Evidence

- Files changed: `docs/spec/jobs/fixer-executable-task-gate/tasks.md` review block.
- Acceptance checks satisfied: @oracle returned PASS with concrete required fixes, and this `Task Package Review.Status` was updated to `passed` after fixes.
- Validation run: delegated review to `@oracle`.
- Result: PASS with minor required fixes; all required fixes applied.
- Reviewer notes: no conflict with `REQ-21` / `REQ-22` / `DES-20`; trace TASK column issue is a runtime/dist refresh issue, not spec content.

### Anti-Shell Rules

- A review that only says “looks good” without checking fixer-executable and human-deliverable semantics is insufficient.

---

## TASK-004: Prepare implementation follow-up scope

Anchors: sdd-workflow/REQ-23, sdd-workflow/DES-21
Owner: orchestrator
Human-facing: no
Status: complete

### Goal

Record which code-level prompt, template, and test changes should happen after this SDD job is accepted.

### Boundaries

- Files/directories expected to change: `docs/spec/jobs/fixer-executable-task-gate/tasks.md`.
- Files/directories that must not change: source code and tests during this documentation-only step.
- Existing contracts that must be preserved: follow-up scope is planning only and does not authorize implementation.

### Implementation Requirements

- Name orchestrator prompt / append prompt follow-up.
- Name `@designer` prompt follow-up.
- Name `@fixer` refusal prompt follow-up.
- Name `@oracle` Task Package Review prompt follow-up.
- Name `spec_propose` / `tasks.md` bootstrap follow-up if applicable.
- Name prompt or snapshot tests.
- Explicitly defer runtime hooks, heavy markdown parsing, universal UI review, forced screenshot tests, and historical-job migration.

### Acceptance Checks

- Follow-up scope lists first-batch code changes.
- Follow-up scope lists explicitly deferred work.
- Follow-up scope does not expand this SDD doc task into runtime implementation.

### Validation

- Command or smoke: read this task package.
- Expected result: follow-up scope is concrete enough to decompose into TDD cycles later.

### Completion Evidence

- Files changed: `docs/spec/jobs/fixer-executable-task-gate/tasks.md`.
- Acceptance checks satisfied: first-batch code changes and explicitly deferred work are listed; implementation follow-up is not marked complete.
- Validation run: read this task package.
- Result: follow-up scope is concrete enough to decompose into later prompt/template/test TDD cycles.
- Reviewer notes: implementation remains deferred until a separate execution step.

### Anti-Shell Rules

- Do not mark implementation follow-up as complete in this documentation-only task.

### Implementation Follow-up Scope

First batch after this SDD job is accepted:

- Update orchestrator / append prompt with the human-facing trigger probe, one-question clarification rule, agent-owned UX synthesis, and designer/council routing.
- Update `@designer` prompt with contract-first behavior, UI / Interaction Handoff Contract output, direct-code exception, reference levels, and human-deliverable baseline.
- Update `@fixer` prompt so human-facing tasks without a reviewed handoff contract are blocked.
- Update `@oracle` prompt with Design Handoff Review that checks fixer-executable and human-deliverable semantics.
- Update `spec_propose` / `tasks.md` bootstrap if the template should expose `Human-facing:` and `Design Handoff Review` by default.
- Add prompt/template regression tests for the above.

Explicitly defer:

- runtime hook enforcement of `tasks.md`,
- heavy markdown parser or schema checker,
- mandatory screenshot or Playwright infrastructure,
- historical job migration,
- universal designer review for all tasks,
- legalistic reference-policy expansion beyond the concise safety rule.

---

## TASK-005: Add prompt and bootstrap enforcement

Anchors: sdd-workflow/REQ-23, sdd-workflow/DES-21
Owner: @fixer
Human-facing: no
Status: complete

### Goal

Embed the triggered Design Synthesis Gate into the shipped agent prompts and generated `tasks.md` bootstrap so future SDD jobs surface human-facing design handoff requirements before implementation.

### Boundaries

- Files/directories expected to change: `src/agents/append-prompt.ts`, `src/agents/designer.ts`, `src/agents/fixer.ts`, `src/agents/oracle.ts`, `src/tools/spec/io.ts`.
- Files/directories that must not change: runtime hooks, markdown parser, trace parser, Playwright/screenshot infrastructure.
- Existing contracts that must be preserved: SDD task packages remain triggered, not universal; no runtime enforcement is added in this task.

### Implementation Requirements

- Orchestrator append prompt names the Design Synthesis Gate and `Human-facing: yes | no | partial` classification.
- Designer prompt requires contract-first UI / Interaction Handoff Contract output, reference levels, human-deliverable baseline, and direct-code exception boundaries.
- Fixer prompt refuses human-facing work without reviewed design handoff.
- Oracle prompt reviews Design Handoff Review for fixer-executable and human-deliverable semantics.
- `spec_propose` task bootstrap surfaces Human-facing classification, Design Handoff Review, UI / Interaction Handoff Contract, and Red Strategy.

### Acceptance Checks

- Future orchestrator prompt can route missing UI guidance to designer/council instead of fixer.
- Future designer prompt can produce handoff contracts before implementation.
- Future fixer prompt can block missing or unreviewed handoff contracts.
- Future oracle prompt can block human-facing shallow task packages.
- New job bootstrap exposes the fields needed for task-package review.

### Validation

- Command or smoke: `/root/.bun/bin/bun test src/agents/append-prompt.test.ts src/agents/designer.test.ts src/agents/fixer.test.ts src/agents/oracle.test.ts src/tools/spec/io.test.ts`.
- Expected result: targeted tests pass.

### Completion Evidence

- Files changed: `src/agents/append-prompt.ts`, `src/agents/designer.ts`, `src/agents/fixer.ts`, `src/agents/oracle.ts`, `src/tools/spec/io.ts`.
- Acceptance checks satisfied: all prompt/bootstrap surfaces now contain Design Synthesis Gate or Design Handoff Review semantics.
- Validation run: targeted Bun test command above.
- Result: 28 pass, 0 fail.
- Reviewer notes: runtime hooks and heavy schema parsing remain deferred.

### Anti-Shell Rules

- Prompt text must create a concrete block/refusal/review path, not only aspirational guidance.
- Generated bootstrap must expose machine-readable human-facing classification text for review.

---

## TASK-006: Add prompt and bootstrap regression tests

Anchors: sdd-workflow/REQ-23, sdd-workflow/DES-21
Owner: @fixer
Human-facing: no
Status: complete

### Goal

Add regression tests that fail when Design Synthesis Gate, Design Handoff Review, human-facing fixer refusal, designer handoff contract, or bootstrap fields disappear from prompts/templates.

### Boundaries

- Files/directories expected to change: `src/agents/append-prompt.test.ts`, `src/agents/designer.test.ts`, `src/agents/fixer.test.ts`, `src/agents/oracle.test.ts`, `src/tools/spec/io.test.ts`.
- Files/directories that must not change: implementation files during RED phase.
- Existing contracts that must be preserved: prompt tests remain string-level budget guards, not semantic model evaluations.

### Implementation Requirements

- Add failing RED assertions before implementation.
- Cover orchestrator append prompt, designer prompt, fixer prompt, oracle prompt, and `spec_propose` bootstrap.
- Confirm failure is caused by missing target strings, not import/syntax errors.

### Acceptance Checks

- Tests cover `Design Synthesis Gate`.
- Tests cover `UI / Interaction Handoff Contract`.
- Tests cover `Design Handoff Review`.
- Tests cover human-facing fixer refusal.
- Tests cover designer reference levels and Red Strategy.
- Tests cover `tasks.md` bootstrap fields.

### Validation

- Command or smoke: targeted Bun test command during RED and after GREEN.
- Expected result: RED fails for missing strings; GREEN passes.

### Completion Evidence

- Files changed: `src/agents/append-prompt.test.ts`, `src/agents/designer.test.ts`, `src/agents/fixer.test.ts`, `src/agents/oracle.test.ts`, `src/tools/spec/io.test.ts`.
- Acceptance checks satisfied: all required prompt/template surfaces are covered.
- Validation run: `/root/.bun/bin/bun test src/agents/append-prompt.test.ts src/agents/designer.test.ts src/agents/fixer.test.ts src/agents/oracle.test.ts src/tools/spec/io.test.ts`.
- Result: RED initially failed for missing target strings; GREEN passes with 28 pass, 0 fail.
- Reviewer notes: subagent PATH lacked `bun`, so orchestrator reran tests with `/root/.bun/bin/bun`.

### Anti-Shell Rules

- Tests must fail on missing handoff/review/refusal text and not merely assert generic UI words.

---

## TASK-007: Verify and review the implementation batch

Anchors: sdd-workflow/REQ-23, sdd-workflow/DES-21
Owner: orchestrator
Human-facing: no
Status: complete

### Goal

Run full repository validation and output review before merging and archiving the SDD job.

### Boundaries

- Files/directories expected to change: none unless validation or review finds issues.
- Files/directories that must not change: unrelated source, generated dist, package metadata.
- Existing contracts that must be preserved: do not merge/archive before validation and output review pass.

### Implementation Requirements

- Run targeted tests.
- Run `bun test`.
- Run `bun run typecheck`.
- Run `bun run check:ci`.
- Run output review against `REQ-23` / `DES-21` / task package anchors.
- On approval, merge and archive the SDD job.

### Acceptance Checks

- Relevant and full validation pass, or failures are documented as pre-existing or unrelated.
- Output review confirms implementation matches the triggered gate scope and does not overbuild runtime enforcement.
- `spec_merge` and `spec_archive` are called only after output review approval.

### Validation

- Command or smoke: targeted tests, full test suite, typecheck, check:ci, output review.
- Expected result: pass or actionable fixes.

### Completion Evidence

- Files changed: validation-only evidence in this task package; source/test changes are covered by TASK-005 and TASK-006.
- Acceptance checks satisfied: targeted tests, full suite, typecheck, and check:ci passed.
- Validation run: `/root/.bun/bin/bun test src/agents/append-prompt.test.ts src/agents/designer.test.ts src/agents/fixer.test.ts src/agents/oracle.test.ts src/tools/spec/io.test.ts`; `/root/.bun/bin/bun test`; `/root/.bun/bin/bun run typecheck`; `/root/.bun/bin/bun run check:ci`.
- Result: targeted tests 28 pass / 0 fail; full suite 1210 pass / 0 fail; typecheck passed; check:ci passed.
- Reviewer notes: full test initially exposed an unrelated root-environment fragility in `src/hooks/apply-patch/hook.test.ts`; the test was stabilized by replacing chmod-based failure with a symlink-loop realpath failure.

### Anti-Shell Rules

- Do not treat targeted tests alone as full completion evidence.
- Do not merge/archive if output review finds prompt or template divergence.
