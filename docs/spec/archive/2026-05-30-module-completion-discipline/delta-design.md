# Delta design: module-completion-discipline

Domain involved: `sdd-workflow`.

---

## sdd-workflow/DES-020: Executable task package gate

Rationale anchor: sdd-workflow/REQ-021, sdd-workflow/REQ-022.

Add a Module Completion Discipline to the SDD workflow. The core design is a
mandatory gate between `REQ/DES` planning and implementation delegation:

```text
requirements/design
  -> orchestrator-authored job-local task packages
  -> mandatory @oracle task-package review
  -> execution readiness report + authorization
  -> bounded fixer/designer/explorer work
  -> completion evidence
  -> output review against task packages
```

### Chosen Task Artifact

The workflow uses `docs/spec/jobs/<slug>/tasks.md` as the durable module task
package artifact.

Prompt-only enforcement is insufficient for this requirement. The minimum
tooling path is mandatory:

1. `spec_propose` creates a job-local `tasks.md` bootstrap package.
2. The orchestrator authors the full implementation task set in `tasks.md`.
3. `@oracle` performs mandatory gating review of `tasks.md` before
   implementation delegation.
4. The orchestrator reports execution readiness and records authorization.
5. `trace_regenerate` maps task anchors into trace `TASK` cells for open jobs.
6. Prompts enforce how orchestrator, fixer, and output review use the task
   packages.

Task details live only in `tasks.md`. `trace.md` remains a flat mapping
artifact and stores only TASK-ID references.

`TASK-N` ids are job-scoped. Inside `docs/spec/jobs/<slug>/tasks.md`, tasks are
written as `TASK-001`. Outside that file, task references use
`<slug>/TASK-001`.

Task packages anchor back to fully qualified domain ids:
`Anchors: sdd-workflow/REQ-021, sdd-workflow/DES-020`.

Archived jobs preserve their completed `tasks.md`. Domain trunks do not absorb
task packages. Domain `trace.md` remains focused on durable `REQ -> DES`
mapping; archived job traces preserve historical task mappings.

### Task Package Shape

Each task package MUST use this shape:

```markdown
## TASK-001: <module behavior title>

Anchors: sdd-workflow/REQ-021, sdd-workflow/DES-020
Owner: orchestrator | @fixer | @designer
Status: pending | in-progress | blocked | complete

### Goal
Observable behavior this task must deliver.

### Boundaries
- Files/directories expected to change:
- Files/directories that must not change:
- Existing contracts that must be preserved:

### Implementation Requirements
- Concrete behavior item 1
- Concrete behavior item 2

### Acceptance Checks
- Checkable condition 1
- Checkable condition 2

### Validation
- Command or smoke:
- Expected result:

### Completion Evidence
- Files changed:
- Acceptance checks satisfied:
- Validation run:
- Result:
- Reviewer notes:

### Anti-Shell Rules
- No TODO/stub/placeholder may satisfy this task.
- New UI must connect to real state/action or explicitly remain demo-only.
- New API must be mounted and reachable in tests or smoke.
- New service must be called by a real path or covered by direct tests.
- Fixture-only behavior must be labelled as such and cannot satisfy a
  production-path task.
```

`Completion Evidence` is mandatory as a section. It may be empty while the task
is `pending`, `in-progress`, or `blocked`; it MUST be non-empty before status
can become `complete`.

### Bootstrap Task

`spec_propose` creates `docs/spec/jobs/<slug>/tasks.md` with a fixed bootstrap
task:

```markdown
## TASK-001: Produce executable task packages
```

This task is owned by the orchestrator. It requires the orchestrator to author
the full implementation task set and pass mandatory `@oracle` task-package
review before any write-capable implementation delegation.

The bootstrap task avoids two failure modes:

- empty templates that cold agents skip,
- premature full decomposition during proposal creation.

### Task Package Review Gate

Before any write-capable implementation delegation, the orchestrator MUST
produce or update `docs/spec/jobs/<slug>/tasks.md` and delegate task-package
review to `@oracle`.

The review is mandatory for non-trivial SDD jobs. The review checks the whole
`tasks.md`, not each task in isolation:

- every implementation task has `REQ` / `DES` anchors,
- task boundaries are cohesive and non-overlapping,
- no required module is missing,
- acceptance checks are observable,
- validation evidence is realistic,
- completion evidence fields exist,
- anti-shell rules are present and enforceable,
- the package set is small enough to execute but complete enough to avoid
  conceptual delegation.

The review result is recorded at the top of `tasks.md`:

```markdown
## Task Package Review

Status: pending | passed | failed
Reviewer: @oracle
Reviewed at:
Review source: task-package-review

### Review Scope
- Checked all task packages against REQ/DES anchors.
- Checked boundaries, acceptance checks, validation, completion evidence
  fields, and anti-shell rules.
- Checked task split for missing, overlapping, or conceptual-only packages.

### Required Fixes
- None when passed.

### Review Notes
- Short durable notes for cold-session recovery.
```

Implementation MUST NOT be delegated while `Task Package Review.Status` is
`pending` or `failed`.

`Task Package Review.Status: passed` is invalid if any implementation task
lacks `Anchors`, `Boundaries`, `Acceptance Checks`, `Validation`,
`Completion Evidence`, or `Anti-Shell Rules` sections.

If review fails, `@oracle` reports required fixes but does not edit the file.
The orchestrator updates `tasks.md` and requests review again.

### Execution Readiness Gate

Passing task-package review means the job is executable; it does not by itself
authorize implementation.

After `Task Package Review.Status: passed`, the orchestrator MUST present a
readiness report to the user before delegating write-capable implementation,
unless the user has already requested autonomous execution.

The readiness report MUST include:

- job slug,
- review status,
- task count and next task ids,
- implementation scope summary,
- required validation commands,
- notable risks or blockers,
- an explicit statement: `Ready to execute` or `Not ready to execute`.

The readiness state is recorded in `tasks.md`:

```markdown
## Execution Readiness

Status: pending | authorized | blocked
Authorized by:
Authorized at:
Scope:

### Readiness Summary
- Task-package review status:
- Next executable tasks:
- Required validation:
- Risks/blockers:
```

Implementation MUST NOT be delegated while `Execution Readiness.Status` is
`pending` or `blocked`.

When the user says to proceed after the readiness report, the orchestrator
updates `Execution Readiness.Status` to `authorized` and may delegate from the
next pending implementation task.

### Orchestrator Prompt Changes

Update `src/agents/append-prompt.ts` and/or `src/agents/orchestrator.ts` so
the orchestrator follows these rules:

1. Treat all spec-backed jobs as non-trivial unless explicitly marked as a
   trivial documentation-only correction.
2. Before executing a non-trivial spec-backed job, check whether `tasks.md`
   exists.
3. If task packages are missing or only the bootstrap task exists, author the
   implementation task packages before delegation.
4. After task-package review passes, report `Ready to execute` and record
   execution authorization before write-capable delegation.
5. Split large work by cohesive module, not by vague layer names.
6. Do not send `@fixer` a conceptual module. Send exactly one complete task
   package or a small batch of independent complete packages.
7. Include relevant `REQ/DES/TASK` anchors in every delegation prompt.
8. Require each subagent to report acceptance checks and validation evidence.
9. After subagent completion, inspect the diff and evidence before marking the
   task complete.
10. Mark task status as `complete` only after completion evidence is present
   and anti-shell checks pass.

The orchestrator continues to use direct execution for trivial one-file edits
that are not spec-backed jobs.

### Fixer Prompt Changes

Update `src/agents/fixer.ts` so `@fixer` understands that it is an execution
specialist, not a planner, and must refuse under-specified non-trivial work.

Required behavior:

- If a delegated task is non-trivial and lacks anchors, boundaries,
  acceptance checks, validation expectations, completion evidence fields, or
  passed task-package review, report missing inputs instead of inventing a
  broad implementation plan.
- Implement only the task package scope.
- Do not satisfy a task with disconnected shells, placeholder methods,
  TODO-only code, or fixture-only paths unless the package explicitly says the
  task is demo-only or test-fixture-only.
- Do not mark task status as `complete`.
- Return a structured completion report that includes:
  - files changed,
  - acceptance checks satisfied,
  - validation commands run,
  - validation results,
  - incomplete items or blockers.

Missing input reports use a mechanical shape:

```text
<blocked>
Missing task package fields:
- Anchors: ...
- Boundaries: ...
- Acceptance Checks: ...
- Validation: ...
- Completion Evidence: ...
- Task Package Review: ...
</blocked>
```

### Output Review Anti-Shell Gate

Output review verifies task completion, not only trace consistency. It MUST
reject completion when:

- a task is marked `complete` without `Completion Evidence`,
- validation is missing, skipped without reason, or unrelated to the task,
- acceptance checks are restated but not evidenced,
- TODO/stub/placeholder code exists in the production path,
- fixture/mock/demo-only behavior is presented as production behavior,
- changed code is not reachable from any mounted route, exported API, command,
  UI action, test path, or documented smoke path.

Type-specific checks:

- API work: new route is mounted; handler is reachable in tests or smoke;
  schema/model is used by the route.
- UI work: new screen/component is connected to real state or action; mock data
  is explicitly demo-only; user-visible behavior can be triggered.
- Service/workflow work: service is called by a real path; workflow state
  transitions are tested or smoked; adapters are wired into execution.
- Docs/spec-only work: referenced files and anchors exist; trace/job mappings
  are fresh when required.

The anti-shell gate is canonical in this design section. Task packages MAY add
task-specific anti-shell rules, but they MUST NOT weaken this canonical gate.

### Tooling Changes

Implement the smallest durable artifact support:

- `spec_propose` creates `docs/spec/jobs/<slug>/tasks.md` with the fixed
  bootstrap task and review block.
- Trace parsing recognizes job-local `TASK-N` headings and their `Anchors:`
  lines.
- Open job trace generation maps `REQ/DES` anchors to `<slug>/TASK-N`
  references.
- Domain trace generation remains durable-domain focused and does not inline
  archived task details.

Do not build a general project-management subsystem.

### Interaction with Existing SDD/TDD

- Trace remains a flat mapping artifact. It stores TASK-ID references, not
  task package details.
- One module task package may contain a TDD red/green/refactor cycle. Red,
  green, and refactor are execution steps inside the package, not three
  separate packages by default.
- Trivial direct edits follow the existing direct route and do not require task
  packages.
- Task-package review is an entry gate before implementation delegation.
- Execution readiness is a user-facing authorization gate after task-package
  review and before implementation delegation.
- Output review remains the completion gate before merge/archive.

### Reference Diagnosis

The Denox Excel project is a useful regression example:

- Long-lived specs are directional and concept-heavy.
- Archived delta slices contain actionable module boundaries.
- Domain trace maps `REQ -> DES` but has empty `TASK` cells.

The local `sdd-workflow` trace has the same empty TASK symptom. The new
discipline should make future agents convert delta slices into bounded task
packages before implementation, then verify each package against observable
behavior.

### Tests

Add or update tests at the lowest useful level:

- append-prompt tests: module completion rules and task-package review gate are
  embedded.
- fixer prompt tests: under-specified non-trivial work refusal and structured
  evidence expectations are present.
- spec tooling tests: `spec_propose` creates `tasks.md` with the bootstrap task
  and review block.
- trace tooling tests: a sample job with `REQ/DES/tasks.md` maps to non-empty
  TASK entries in open job trace output.
- regression fixture: shell-only completion evidence fails review-language
  expectations.

### Verification

Before declaring this job complete, run:

```bash
bun test
bun run typecheck
bun run check:ci
```

If full verification is blocked, document the exact command, failure, and
whether the failure is pre-existing or caused by this job.
