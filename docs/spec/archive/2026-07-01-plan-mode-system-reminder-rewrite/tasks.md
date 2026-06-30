# Tasks: Plan Mode System Reminder Rewrite Investigation

This file is the job-local execution contract. The durable plan was imported
successfully; the orchestrator must continue native SDD preparation and may stop
only for severe blockers such as duplicate imports, missing job files, invalid
spec layout, unsafe worktree conflicts, or failed entry review.

## Task Package Review

Status: passed
Task Package Review.Status: passed
Reviewer: @oracle
Reviewed at: 2026-07-01
Review source: SDD entry review for plan-mode-system-reminder-rewrite
Human-facing: partial

### Review Scope

- Reviewed `proposal.md`, `delta-requirements.md`, `delta-design.md`,
  `tasks.md`, and current trace state.
- Confirmed native delta content replaces the imported placeholder sufficiently
  for execution planning.
- Confirmed `needs-sdd` handoff continuation is explicit and bounded to native
  SDD preparation, not implementation.
- Confirmed `Task Package Review` and `Execution Readiness` gates remain
  separate.
- Confirmed `TASK-002` includes Anchors, Boundaries, Implementation
  Requirements, UI / Interaction Handoff Contract, Acceptance Checks,
  Validation, Completion Evidence, and Anti-Shell Rules.

### Required Fixes

- None.

### Review Notes

- `TASK-002` is fixer-executable.
- The handoff continuation rule is clear: after successful `needs-sdd` import,
  the orchestrator should continue preparing native SDD deltas and task gates,
  and should stop only for severe blockers such as duplicate import refusal,
  missing job files, invalid spec layout, unsafe dirty-worktree conflict, or
  failed entry review.
- Execution is not authorized by this review alone. Implementation still
  requires `Execution Readiness.Status: authorized`.
- Completion Evidence must record concrete validation commands/results after
  implementation; acceptance checks must not be restated as evidence.

For Human-facing: yes | partial, complete Design Handoff Review before
implementation delegation and include a UI / Interaction Handoff Contract.
The contract must cover product behavior, interaction flow, state lifecycle,
copy semantics, validation strategy, visual reference level when relevant, and
Red Strategy.

## Execution Readiness

Status: authorized
Execution Readiness.Status: authorized
Authorized by: user/orchestrator after @oracle entry review
Authorized at: 2026-07-01

Scope: TASK-002 only — diagnose and fix Plan Mode reminder rewrite behavior in
the fork-local planner bridge, with `src/index.ts` limited to thin adapter wiring
if hook routing requires it.

### Readiness Summary

- Task-package review status: passed.
- Next executable tasks: TASK-002.
- Required validation:
  - `bun test src/fork/tools/planner-bridge/command.test.ts`
  - `bun run check:ci`
  - `bun run typecheck`
  - `bun test`
  - Headless or interactive smoke for `/plan-save --path plan.md`, unsafe path
    refusal, natural-language plan save, and `needs-sdd` handoff continuation.
- Risks/blockers:
  - The active Plan Mode reminder may be injected after
    `experimental.chat.system.transform`; if so, fixer must identify the later
    hook surface or required host-level allowed-tool seam instead of broadening
    write permissions.
  - `plan_save` must remain the only Plan Mode write exception.
  - SDD import/execution actions, commits, deploys, and source edits must remain
    forbidden in Plan Mode.
- Ready to execute.

---

## TASK-001: Prepare native SDD job after needs-sdd handoff

Owner: orchestrator
Status: completed
Anchors: sdd-workflow/REQ-33, sdd-workflow/DES-31
Human-facing: partial

### Goal

Replace imported placeholders with native SDD delta requirements, design, and
task gates so the job can proceed through review without stopping immediately
after `plan_to_sdd` succeeds.

### Boundaries

- Files expected to change:
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/delta-requirements.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/delta-design.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/tasks.md`
- Files that must not change for this task:
  - source implementation files
  - domain trunk files under `docs/spec/domains/**`
  - archived jobs

### Acceptance Checks

- Native delta headings use fully qualified ids.
- Tasks include `Task Package Review.Status: pending` until @oracle entry
  review passes.
- Tasks include `Execution Readiness.Status: pending` until explicitly
  authorized.
- The job records that successful `needs-sdd` import should continue into native
  SDD preparation rather than stopping at imported placeholders.

### Validation

- `trace_regenerate job=plan-mode-system-reminder-rewrite check_only=true` or
  equivalent trace freshness check after deltas are written.
- @oracle entry review of proposal, deltas, and task gates.

### Completion Evidence

- Files changed:
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/delta-requirements.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/delta-design.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/tasks.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/trace.md`
- Acceptance checks satisfied:
  - Native delta headings use fully qualified `sdd-workflow/REQ-33` and
    `sdd-workflow/DES-31` ids.
  - Task gates were kept pending until @oracle entry review passed, then
    `Task Package Review.Status: passed` and
    `Execution Readiness.Status: authorized` were recorded for TASK-002 only.
  - The job records that successful `needs-sdd` import should continue into
    native SDD preparation instead of stopping at imported placeholders.
- Validation run:
  - `trace_regenerate job=plan-mode-system-reminder-rewrite check_only=true` —
    passed before implementation.
  - @oracle entry review — passed, no required edits.
  - `trace_regenerate` with absolute spec dir regenerated the job trace after
    native deltas were authored.
- Result: native SDD job preparation completed; TASK-002 was authorized and
  executed.

### Anti-Shell Rules

- Do not satisfy this task by leaving placeholder text.
- Do not edit domain trunks directly.
- Do not start implementation before native gates pass.

---

## TASK-002: Diagnose and fix Plan Mode reminder rewrite behavior

Owner: fixer
Status: completed
Anchors: sdd-workflow/REQ-33, sdd-workflow/DES-31
Human-facing: partial

### Goal

Ensure real Plan Mode reminders no longer contain unqualified absolute write
bans that prevent `plan_save`, while preserving the prohibition on all non-plan
writes and execution actions.

### Boundaries

- Files expected to change:
  - `src/fork/tools/planner-bridge/command.ts`
  - `src/fork/tools/planner-bridge/command.test.ts`
  - documentation files only if user-facing behavior changes
  - `src/index.ts` only as a thin adapter if hook wiring changes
- Files that must not change:
  - OpenCode upstream core files outside this fork unless plugin hooks cannot
    observe the reminder
  - unrelated agents, MCPs, CLI installers, or spec tools

### Implementation Requirements

- Confirm whether the real Plan Mode reminder reaches
  `experimental.chat.system.transform` before or after the fork helper runs.
- If visible to the helper, normalize the complete real reminder fixture so
  unqualified `ZERO exceptions`, `STRICTLY FORBIDDEN`, `ABSOLUTE CONSTRAINT`, and
  equivalent no-write wording are removed or exception-qualified.
- If not visible to the helper, identify the later hook surface or host-level
  seam required to support `plan_save` as an allowed Plan Mode write tool.
- Keep `plan_save` as the only write exception in Plan Mode.
- Keep `plan_to_sdd`, `sdd_from_plan`, `plan_finish(status=executing)`, source
  edits, commits, deploys, and implementation out of Plan Mode.

### UI / Interaction Handoff Contract

- Product behavior: users in Plan Mode can create/update durable plans but cannot
  execute implementation or import SDD unless a handoff explicitly allows it.
- Interaction flow: “落一个计划/更新计划” leads to `plan_save`; “开干/就按这个”
  leads to readiness/handoff, then automatic native SDD job preparation after a
  successful `needs-sdd` import.
- State lifecycle: durable plan `draft` may be imported into a native SDD job;
  imported jobs remain pending until review gates pass.
- Copy semantics: use explicit wording that `plan_save` is the only Plan Mode
  write exception and all non-plan writes remain forbidden.
- Validation strategy: unit tests plus headless/interactive smoke.
- Visual reference level: not applicable.
- Red Strategy: before the fix, the active reminder still shows unqualified
  `ZERO exceptions`; after the fix, real Plan Mode output must not.

### Acceptance Checks

- Full real reminder fixture no longer contains unqualified absolute write bans
  after normalization.
- `plan_save` remains allowed only for durable plan paths.
- Non-plan writes and SDD import/execution actions remain forbidden in Plan Mode.
- Successful `needs-sdd` import flows into native SDD preparation without a
  non-blocking stop.

### Validation

- `bun test src/fork/tools/planner-bridge/command.test.ts`
- `bun run check:ci`
- `bun run typecheck`
- `bun test`
- Headless or interactive smoke for `/plan-save --path plan.md`, unsafe path
  refusal, natural-language plan save, and `needs-sdd` handoff continuation.

### Completion Evidence

- Files changed:
  - `README.md`
  - `docs/configuration.md`
  - `docs/installation.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/proposal.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/delta-requirements.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/delta-design.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/tasks.md`
  - `docs/spec/jobs/plan-mode-system-reminder-rewrite/trace.md`
  - `src/fork/tools/index.ts`
  - `src/fork/tools/planner-bridge/command.ts`
  - `src/fork/tools/planner-bridge/command.test.ts`
  - `src/fork/tools/planner-bridge/index.ts`
  - `src/index.ts`
- Acceptance checks satisfied:
  - Added full host reminder fixture coverage containing `STRICTLY FORBIDDEN`,
    `ANY file edits, modifications, or system changes`, `ABSOLUTE CONSTRAINT`,
    and `ZERO exceptions`.
  - Normalization now qualifies those absolute write bans so only durable
    markdown plan persistence via `plan_save` is excepted.
  - Existing policy text still forbids `edit`, `write`, `apply_patch`, mutating
    bash, `plan_to_sdd`, `sdd_from_plan`, `spec_*`, commits, deployments, and
    implementation in Plan Mode.
  - Idempotence is covered by calling the helper twice on the full fixture and
    asserting the fork-local policy plus exception wording are not duplicated.
  - Durable handoff continuation remains reflected in this job contract: after a
    successful `needs-sdd` import, orchestration continues native SDD preparation
    rather than stopping at imported placeholders.
  - Successful `plan_to_sdd` / `sdd_from_plan` output and command templates now
    tell the orchestrator to continue inspecting the generated job, replacing
    imported placeholders with native deltas/tasks, and running entry review;
    they also preserve the prohibition on implementation, commit, deploy, merge,
    or archive from the import command alone.
- Validation run:
  - `bun test src/fork/tools/planner-bridge/command.test.ts` — passed (24 pass,
    0 fail).
  - `bun run check:ci` — passed (`biome check .`, 252 files checked).
  - `bun run typecheck` — passed (`tsc --noEmit`).
  - `bun test` — passed (1427 pass, 0 fail).
  - Headless smoke coverage: targeted planner-bridge tests exercise root
    `/plan-save --path plan.md` behavior, unsafe path refusal, natural-language
    plan-save guidance, import-success continuation wording, and `needs-sdd`
    handoff wording. Interactive smoke was not run from this API execution
    environment.
- Result: helper fix implemented and covered by regression tests. Source
  inspection shows the current fork calls `allowDurablePlanSaveInPlanMode` from
  `experimental.chat.system.transform` immediately before system-message
  collapse; no later fork-local system-reminder rewrite surface was found in
  `src/index.ts`/hook sources. If a restarted real Plan Mode session still shows
  unmodified `ZERO exceptions`, the remaining issue is likely host-level or
  post-plugin injection and requires a later host seam, such as a Plan Mode
  allowed-write-tool policy for `plan_save` or a post-reminder transform hook.
- Reviewer notes: cloned upstream dependency source paths referenced by the repo
  codemap were not present in this checkout, so host runtime internals could not
  be inspected locally. No debug logging or broader write permission was added;
  `plan_save` remains the only Plan Mode write exception.

### Anti-Shell Rules

- No TODO/stub/placeholder implementation may satisfy reminder normalization.
- Do not bypass Plan Mode by broadening tool permissions.
- Do not implement by relying on shell writes when planner bridge tools should be
  exercised.

---

## TASK-003: Review, merge, and archive the SDD job

Owner: orchestrator + oracle
Status: pending
Anchors: sdd-workflow/REQ-33, sdd-workflow/DES-31
Human-facing: no

### Goal

Review the final implementation against this job, then merge and archive the SDD
job only after validation passes.

### Acceptance Checks

- @oracle output review approves the diff against anchors.
- `spec_merge slug=plan-mode-system-reminder-rewrite` succeeds.
- `spec_archive slug=plan-mode-system-reminder-rewrite` succeeds immediately
  after merge.

### Validation

- Full validation from TASK-002 remains green at review time.

## Imported Task Package

Imported at: 2026-06-30T15:59:37.777Z
Human-facing: partial

### Completion Evidence

- Files changed:
- Acceptance checks satisfied:
- Validation run:
- Result:
- Reviewer notes:
