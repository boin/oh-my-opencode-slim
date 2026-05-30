# Tasks: module-completion-discipline

This file is the job-local execution contract. For spec-backed non-trivial SDD
jobs, implementation MUST NOT be delegated until task packages are authored and
mandatory task-package review passes.

## Task Package Review

Status: passed
Reviewer: @oracle
Reviewed at: 2026-05-30
Review source: task-package-review

### Review Scope

- Checked all task packages against REQ/DES anchors.
- Checked boundaries, acceptance checks, validation, completion evidence
  fields, and anti-shell rules.
- Checked task split for missing, overlapping, or conceptual-only packages.
- Checked that no write-capable implementation delegation begins before this
  review passes.

### Required Fixes

- None.

### Review Notes

- Mandatory task-package review passed. Implementation may proceed from
  `TASK-002` onward, subject to each task's boundaries, validation, completion
  evidence, and anti-shell rules.

## Execution Readiness

Status: authorized
Authorized by: user
Authorized at: 2026-05-30
Scope: proposed next step is to proceed from document finalization into
implementation tasks, starting with `TASK-002`.

### Readiness Summary

- Task-package review status: passed.
- Next executable tasks:
  - `TASK-002: Add orchestrator module-package gate`
  - `TASK-003: Harden fixer completion contract`
  - `TASK-004: Add tasks.md artifact and trace support`
  - `TASK-005: Add output review anti-shell checks`
  - `TASK-006: Documentation and examples`
  - `TASK-007: Full verification and completion report`
- Required validation:
  - focused prompt/spec/trace tests during implementation
  - `bun test`
  - `bun run typecheck`
  - `bun run check:ci`
- Risks/blockers:
  - Current trace tooling still emits `—` for TASK cells until `TASK-004` lands.
  - Implementation must not proceed by prompt-only changes.
- Readiness verdict: Ready to execute.

---

## TASK-001: Produce executable task packages

Anchors: sdd-workflow/REQ-021, sdd-workflow/DES-020
Owner: orchestrator
Status: complete

### Goal

Produce complete module-level task packages for this job before implementation
delegation. `Status: complete` here means the job-local task package set has
been authored and reviewed; it does not mean implementation tasks have started.

### Boundaries

- Files/directories expected to change:
  - `docs/spec/jobs/module-completion-discipline/tasks.md`
  - `docs/spec/jobs/module-completion-discipline/proposal.md`
  - `docs/spec/jobs/module-completion-discipline/delta-requirements.md`
  - `docs/spec/jobs/module-completion-discipline/delta-design.md`
- Files/directories that must not change:
  - production source files under `src/`
  - domain trunks under `docs/spec/domains/`
- Existing contracts that must be preserved:
  - domain requirements/design trunks remain unchanged until `spec_merge`
  - trace files are generated artifacts and not manually edited
  - task-package review is mandatory before write-capable implementation

### Implementation Requirements

- Convert the planning decisions into explicit requirements and design deltas.
- Define `tasks.md` as the chosen job-local task artifact.
- Define mandatory `@oracle` task-package review before implementation.
- Define explicit execution readiness report and authorization before
  implementation.
- Define owner/status/evidence rules so `@fixer` cannot self-complete tasks.
- Define anti-shell review as a hard failure condition.
- Decompose the implementation into cohesive module-level task packages.
- Include anchors, boundaries, acceptance checks, validation, completion
  evidence fields, and anti-shell rules for every task.

### Acceptance Checks

- Requirements split task-package enforcement from anti-shell evidence.
- Design explicitly chooses `tasks.md` plus trace TASK mapping over
  prompt-only enforcement.
- Design defines TASK-ID namespace and review gate persistence.
- Design defines execution readiness as a user-facing authorization gate.
- Every implementation task below has required task package sections.
- `Task Package Review` block exists and records `@oracle` pass.
- `Execution Readiness` block records the readiness report and pending
  authorization state.

### Validation

- Command or smoke: read this file and the delta files against the package
  contract.
- Expected result: no missing required fields before requesting review.

### Completion Evidence

- Files changed:
  - `docs/spec/jobs/module-completion-discipline/proposal.md`
  - `docs/spec/jobs/module-completion-discipline/delta-requirements.md`
  - `docs/spec/jobs/module-completion-discipline/delta-design.md`
  - `docs/spec/jobs/module-completion-discipline/tasks.md`
- Acceptance checks satisfied:
  - Requirements split task-package enforcement from anti-shell evidence.
  - Design explicitly chooses `tasks.md` plus trace TASK mapping over
    prompt-only enforcement.
  - Design defines TASK-ID namespace and review gate persistence.
  - Design defines execution readiness as a user-facing authorization gate.
  - Every implementation task below has required task package sections.
  - `Task Package Review` block exists and records `@oracle` pass.
  - `Execution Readiness` block records the readiness report and pending
    authorization state.
- Validation run:
  - `trace_regenerate job=module-completion-discipline`
  - mandatory `@oracle` task-package review
- Result:
  - Job trace regenerated.
  - Task-package review verdict: pass.
- Reviewer notes:
  - `@oracle` found no required fixes; nice-to-improve items were folded into
    the document pass where relevant.

### Anti-Shell Rules

- Do not delegate implementation before this task-package set is reviewed.
- Do not delegate implementation before execution readiness is authorized.
- Do not replace module task packages with broad conceptual instructions.
- Do not mark this task complete until review state and validation are recorded.

## TASK-002: Add orchestrator module-package gate

Anchors: sdd-workflow/REQ-021, sdd-workflow/DES-020
Owner: @fixer
Status: complete

### Goal

Make the orchestrator require executable task packages and passed
task-package review before delegating non-trivial SDD implementation.

### Boundaries

- Files/directories expected to change:
  - `src/agents/append-prompt.ts`
  - `src/agents/orchestrator.ts` if agent descriptions need adjustment
  - focused prompt tests if they exist or need to be added
- Files/directories that must not change:
  - spec merge/archive semantics unrelated to task packages
  - model preset configuration
  - deployment/domain plugin rules
- Existing contracts that must be preserved:
  - trivial direct edits remain allowed
  - SDD layout remains two-tier domain + job
  - output review remains required before merge/archive

### Implementation Requirements

- Add a concise Module Completion Discipline block.
- Treat spec-backed jobs as non-trivial unless explicitly trivial docs-only.
- Require `tasks.md` before write-capable delegation.
- Require `Task Package Review.Status: passed` before implementation.
- Require `Execution Readiness.Status: authorized` before implementation.
- Define the required fields of a task package.
- State that conceptual work cannot be delegated to `@fixer` until reduced to
  bounded packages.
- Require subagent delegation prompts to include `REQ/DES/TASK` anchors when
  available.
- Require the orchestrator to inspect evidence before marking tasks complete.

### Acceptance Checks

- Prompt text includes task package required fields.
- Prompt text includes mandatory task-package review gate.
- Prompt text includes execution readiness report and authorization gate.
- Prompt text includes anti-shell review obligations.
- Existing SDD/TDD/routing language remains intact.
- The prompt does not force heavyweight SDD on trivial one-file edits.

### Validation

- Command or smoke:
  - `bun test -t "append-prompt"`
  - `bun test -t "orchestrator"`
- Expected result:
  - Focused prompt tests pass or newly added tests prove the new gate appears.

### Completion Evidence

- Files changed:
  - `src/agents/append-prompt.test.ts`
  - `src/agents/append-prompt.ts`
- Acceptance checks satisfied:
  - Prompt text includes task package required fields.
  - Prompt text includes mandatory task-package review gate.
  - Prompt text includes execution readiness report and authorization gate.
  - Prompt text includes anti-shell review obligations.
  - Existing SDD/TDD/routing language remains intact.
  - The prompt keeps trivial direct edits exempt from task packages.
- Validation run:
  - `/root/.bun/bin/bun test -t "module-package gate"`
- Result:
  - Passed: 1 pass, 0 fail.
- Reviewer notes:
  - Red phase failed for missing `Module Completion Discipline` prompt text.
  - Green phase added the minimal prompt block; refactor skipped as unnecessary.

### Anti-Shell Rules

- Do not only add a vague sentence like "complete modules fully".
- Do not make the orchestrator responsible for all implementation itself.
- Do not remove delegation support.
- Do not treat `@oracle` review as optional for spec-backed jobs.
- Do not skip user-facing readiness reporting after task-package review passes.

## TASK-003: Harden fixer completion contract

Anchors: sdd-workflow/REQ-021, sdd-workflow/REQ-022, sdd-workflow/DES-020
Owner: @fixer
Status: complete

### Goal

Make `@fixer` execute bounded module packages and report completion evidence
instead of accepting broad concepts or marking tasks complete.

### Boundaries

- Files/directories expected to change:
  - `src/agents/fixer.ts`
  - focused agent prompt tests if they exist or need to be added
- Files/directories that must not change:
  - orchestrator task authoring responsibilities
  - oracle review responsibilities
  - unrelated agent prompts
- Existing contracts that must be preserved:
  - fixer remains an execution specialist
  - fixer does not perform external research or delegation
  - fixer may do small direct edits when explicitly trivial

### Implementation Requirements

- Add refusal/reporting behavior for under-specified non-trivial work.
- Require missing-input reports to identify absent anchors, boundaries,
  acceptance checks, validation, completion evidence fields, or review status.
- Require changed files, acceptance checks, validation commands/results, and
  incomplete items in fixer output.
- State that TODO/stub/placeholder/fixture-only code cannot satisfy production
  tasks.
- State that fixer MUST NOT mark task status as `complete`.
- Preserve fixer as an execution specialist; do not turn it into a planner or
  researcher.

### Acceptance Checks

- Fixer prompt explicitly distinguishes trivial edits from non-trivial module
  packages.
- Fixer output format includes acceptance and validation evidence.
- Fixer prompt tells it to surface missing inputs instead of inventing broad
  scope.
- Fixer prompt forbids self-marking task status as `complete`.

### Validation

- Command or smoke: run focused prompt tests or add tests that inspect generated
  fixer prompt text.
- Expected result: tests prove refusal and completion-evidence language exists.

### Completion Evidence

- Files changed:
  - `src/agents/fixer.test.ts`
  - `src/agents/fixer.ts`
- Acceptance checks satisfied:
  - Fixer prompt distinguishes trivial execution from non-trivial task-package input.
  - Fixer prompt reports missing task package fields instead of planning scope.
  - Fixer prompt requires changed files, acceptance checks, validation commands/results, and blockers.
  - Fixer prompt forbids self-marking task status as complete.
  - Fixer prompt rejects TODO/stub/placeholder/fixture-only completion for production tasks.
- Validation run:
  - `/root/.bun/bin/bun test src/agents/fixer.test.ts`
- Result:
  - Passed: 1 pass, 0 fail.
- Reviewer notes:
  - Red phase failed for missing fixer task-package contract.
  - Green phase added the minimal prompt contract; refactor skipped as unnecessary.

### Anti-Shell Rules

- Do not let fixer self-expand scope beyond the package.
- Do not let "tests skipped" be acceptable without a reason.
- Do not let fixer convert missing task boundaries into an implementation plan.

## TASK-004: Add tasks.md artifact and trace support

Anchors: sdd-workflow/REQ-021, sdd-workflow/DES-020
Owner: @fixer
Status: complete

### Goal

Implement the chosen job-local task artifact support: `spec_propose` creates a
bootstrap `tasks.md`, and trace tooling can map open-job task anchors into
non-empty TASK cells.

### Boundaries

- Files/directories expected to change:
  - `src/tools/spec/*`
  - `src/tools/trace/*`
  - tests and fixtures for spec/trace tooling
- Files/directories that must not change:
  - archive directory semantics beyond preserving job-local `tasks.md`
  - domain trunk merge semantics for `requirements.md` and `design.md`
  - unrelated CLI installer behavior
- Existing contracts that must be preserved:
  - `trace.md` remains a flat mapping artifact
  - task details remain in `tasks.md`, not in trace
  - archived job snapshots remain immutable historical records

### Implementation Requirements

- Update `spec_propose` to create `docs/spec/jobs/<slug>/tasks.md`.
- Include the fixed `TASK-001: Produce executable task packages` bootstrap
  task and `Task Package Review` block.
- Define job-scoped `TASK-N` extraction.
- Map job-local task anchors to `<slug>/TASK-N` references in open job trace
  output.
- Do not merge task packages into domain requirements or design trunks.
- Preserve archived tasks as part of the archived job snapshot.

### Acceptance Checks

- A new job gets `tasks.md` without manual creation.
- The generated `tasks.md` includes review block and bootstrap task.
- A fixture job with anchored tasks produces non-empty TASK mappings.
- Trace output contains TASK-ID references, not task package details.
- Existing domain trace behavior remains compatible.

### Validation

- Command or smoke: run focused spec/trace tool tests, adding fixtures if
  needed.
- Expected result: tests prove `tasks.md` generation and TASK mapping.

### Completion Evidence

- Files changed:
  - `src/tools/spec/io.test.ts`
  - `src/tools/spec/io.ts`
  - `src/tools/trace/io.test.ts`
  - `src/tools/trace/parser.ts`
  - `src/tools/trace/io.ts`
  - `docs/spec/jobs/module-completion-discipline/trace.md`
- Acceptance checks satisfied:
  - A new job gets `tasks.md` without manual creation.
  - Generated `tasks.md` includes review block and bootstrap task.
  - A fixture job with anchored tasks produces non-empty TASK mappings.
  - Trace output contains TASK-ID references, not task package details.
  - Existing domain trace behavior remains compatible.
  - Current job trace self-validates non-empty TASK mappings via source regeneration.
- Validation run:
  - `/root/.bun/bin/bun test src/tools/spec/io.test.ts -t "tasks.md"`
  - `/root/.bun/bin/bun test src/tools/trace/io.test.ts -t "TASK"`
  - `/root/.bun/bin/bun test src/tools/spec/io.test.ts src/tools/trace/io.test.ts src/tools/trace/parser.test.ts`
  - `/root/.bun/bin/bun -e "import { regenerateJobTrace } from './src/tools/trace/io'; regenerateJobTrace('docs/spec', 'module-completion-discipline')"`
- Result:
  - Focused `tasks.md` test passed.
  - Focused TASK mapping test passed.
  - Spec/trace focused suite passed: 42 pass, 0 fail.
  - Job trace TASK cells now contain `module-completion-discipline/TASK-*` references.
- Reviewer notes:
  - Red phase A failed because `tasks.md` did not exist after `proposeJob`.
  - Red phase B failed because TASK column remained `—`.
  - Green implementation added `tasks.md` bootstrap generation and job-local task anchor mapping.

### Anti-Shell Rules

- Do not build a general project-management subsystem.
- Do not leave task support as prompt-only.
- Do not inline task package details into trace files.
- Do not silently skip TASK mappings when anchored tasks exist.

## TASK-005: Add output review anti-shell checks

Anchors: sdd-workflow/REQ-022, sdd-workflow/DES-020
Owner: @fixer
Status: complete

### Goal

Ensure output review catches scaffolding that claims task completion.

### Boundaries

- Files/directories expected to change:
  - `src/agents/append-prompt.ts`
  - `src/agents/oracle.ts` if oracle review prompt needs explicit checks
  - focused prompt tests if they exist or need to be added
- Files/directories that must not change:
  - task package authoring ownership
  - spec merge/archive tool behavior except where completion evidence is read
  - unrelated review guidelines
- Existing contracts that must be preserved:
  - output review remains a review gate, not implementation work
  - orchestrator still owns basic evidence inspection
  - oracle remains reviewer and memex writer, not code author

### Implementation Requirements

- Add explicit output review language for task completion evidence.
- Make shell/stub/placeholder/fixture-only completion a hard failure.
- Require review to flag task marked complete without validation.
- Require review to flag new routes not mounted, UI not connected, services not
  called, schemas/models not used, and fixture paths presented as production.
- Require review to inspect `Completion Evidence`, not only diff size.

### Acceptance Checks

- Output review language is explicit and checkable.
- Oracle review remains high-value and does not become routine nitpicking.
- Orchestrator still owns basic evidence inspection.
- Prompt/tests cover the canonical anti-shell gate.

### Validation

- Command or smoke: run focused prompt tests or add them.
- Expected result: tests prove anti-shell review language appears.

### Completion Evidence

- Files changed:
  - `src/agents/oracle.test.ts`
  - `src/agents/oracle.ts`
- Acceptance checks satisfied:
  - Output review language is explicit and checkable.
  - Oracle review remains read-only and does not implement code.
  - Prompt covers completion evidence, validation, anti-shell, route/UI/service reachability checks.
- Validation run:
  - `/root/.bun/bin/bun test src/agents/oracle.test.ts`
- Result:
  - Passed: 1 pass, 0 fail.
- Reviewer notes:
  - Red phase failed for missing `Output Review Anti-Shell Gate` in Oracle prompt.
  - Green phase added the minimal read-only review gate; refactor skipped as unnecessary.

### Anti-Shell Rules

- Do not rely solely on `@oracle` to catch missing implementation.
- Do not accept diff size as evidence of completion.
- Do not accept completion evidence that merely restates acceptance checks.

## TASK-006: Documentation and examples

Anchors: sdd-workflow/REQ-021, sdd-workflow/REQ-022, sdd-workflow/DES-020
Owner: @fixer
Status: complete

### Goal

Document how agents should execute large SDD jobs with job-local task packages
and mandatory task-package review.

### Boundaries

- Files/directories expected to change:
  - `docs/spec/domains/sdd-workflow/requirements.md` after merge
  - `docs/spec/domains/sdd-workflow/design.md` after merge
  - relevant user-facing docs if behavior affects users
  - `docs/spec/distilled-rules.md` if it remains canonical for rules
- Files/directories that must not change:
  - unrelated documentation sections
  - archived historical jobs
  - deployment/domain-specific docs
- Existing contracts that must be preserved:
  - small direct edits remain allowed
  - domain trunks contain durable behavior, not job execution details
  - archived jobs preserve historical task packages

### Implementation Requirements

- Explain when task packages are required.
- Explain that orchestrator authors task packages and fixer consumes them.
- Explain mandatory `@oracle` task-package review.
- Include one compact example task package in `sdd-workflow/DES-020` after
  merge.
- Explain status and completion evidence ownership.
- Explain cold-session recovery from archived `tasks.md`.

### Acceptance Checks

- Docs explain when task packages are required.
- Docs include one compact example task package.
- Docs explain that small direct edits remain allowed.
- Docs mention cold-session recovery.
- Docs do not imply task packages are merged into domain trunks.

### Validation

- Command or smoke: confirm referenced docs exist and cross-reference the new
  requirement/design anchors.
- Expected result: docs are linked and consistent with the task package design.

### Completion Evidence

- Files changed:
  - `docs/spec/distilled-rules.md`
- Acceptance checks satisfied:
  - Docs explain when task packages are required.
  - Docs explain orchestrator authors task packages and fixer consumes them.
  - Docs explain mandatory task-package review and execution readiness.
  - Docs include compact task package field list and anti-shell failures.
  - Docs state trivial direct edits remain allowed.
- Validation run:
  - grep for `Module completion discipline`, `REQ/DES/TASK`, `Execution Readiness`, and `Anti-Shell Rules` under `docs/spec`
  - `trace_regenerate check_only`
- Result:
  - Documentation references found in expected files.
  - Trace is fresh.
- Reviewer notes:
  - Domain trunk updates will be completed by `spec_merge`; this task updated the canonical distilled-rules doc for the new runtime discipline.

### Anti-Shell Rules

- Do not only update docs without enforcing prompt/tool behavior.
- Do not duplicate the full anti-shell gate in multiple long-form docs.
- Do not bury mandatory review in an example only.

## TASK-007: Full verification and completion report

Anchors: sdd-workflow/REQ-021, sdd-workflow/REQ-022, sdd-workflow/DES-020
Owner: orchestrator
Status: complete

### Goal

Provide evidence that the job is complete and did not regress the plugin.

### Boundaries

- Files/directories expected to change:
  - job-local completion evidence in this file
  - final summary or PR description
- Files/directories that must not change:
  - implementation files after verification unless a failure requires a fix
  - archived specs before `spec_archive`
- Existing contracts that must be preserved:
  - verification failures must be fixed or documented with exact blockers
  - output review must pass before merge/archive

### Implementation Requirements

- Run full verification commands.
- Confirm task package review passed before implementation tasks began.
- Confirm execution readiness was authorized before implementation tasks began.
- Confirm each completed task has completion evidence.
- Confirm trace TASK mapping behavior is tested.
- Summarize whether task artifact support was implemented.
- Summarize how future large plans avoid shell-only completion.

### Acceptance Checks

- All required commands pass, or blockers are documented with exact output.
- Summary lists changed files.
- Summary lists completed tasks.
- Summary states whether task artifact support was implemented.
- Summary states how a future large plan will avoid shell-only completion.
- This job's own trace output self-validates non-empty TASK mappings after
  TASK-004 lands.

### Validation

- Command or smoke:
  - `bun test`
  - `bun run typecheck`
  - `bun run check:ci`
- Expected result:
  - All commands pass, or exact blockers are documented.

### Completion Evidence

- Files changed:
  - `docs/spec/jobs/module-completion-discipline/*`
  - `docs/spec/distilled-rules.md`
  - `src/agents/append-prompt.test.ts`
  - `src/agents/append-prompt.ts`
  - `src/agents/fixer.test.ts`
  - `src/agents/fixer.ts`
  - `src/agents/oracle.test.ts`
  - `src/agents/oracle.ts`
  - `src/tools/spec/io.test.ts`
  - `src/tools/spec/io.ts`
  - `src/tools/trace/io.test.ts`
  - `src/tools/trace/io.ts`
  - `src/tools/trace/parser.ts`
- Acceptance checks satisfied:
  - Required verification commands were run or blockers documented.
  - Changed files are listed.
  - Completed tasks are recorded in this file.
  - Task artifact support was implemented via `tasks.md` generation and trace TASK mapping.
  - Future large plans avoid shell-only completion through task-package review,
    execution readiness, fixer completion evidence, and oracle anti-shell output review.
  - This job's own trace output self-validates non-empty TASK mappings.
- Validation run:
  - `/root/.bun/bin/bun test`
  - `/root/.bun/bin/bun run typecheck`
  - `/root/.bun/bin/bun run check:ci`
  - `/root/.bun/bin/bun -e "import { regenerateJobTrace } from './src/tools/trace/io'; regenerateJobTrace('docs/spec', 'module-completion-discipline')"`
  - `@oracle` output review
- Result:
  - `typecheck`: passed.
  - `check:ci`: passed after formatting the new spec test assertion.
  - `bun test`: 1204 pass / 1 fail. The remaining failure is
    `src/hooks/apply-patch/hook.test.ts > blocks internal guard errors before native execution`.
    This path is outside the job boundary and was not touched by this change;
    output review judged it non-blocking for this job.
  - Job trace TASK cells are non-empty for `REQ-021` and `REQ-022`.
  - Output review verdict: pass, no required fixes.
- Reviewer notes:
  - Pre-existing apply-patch hook test failure should be tracked separately.
  - `spec_merge` and `spec_archive` may proceed after this completion evidence is recorded.

### Anti-Shell Rules

- Do not declare the job done after only editing prompts.
- Do not declare the job done with skipped verification unless the skip is
  unavoidable and documented.
- Do not merge/archive while task-package review or output review is pending.
