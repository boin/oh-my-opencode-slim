# Delta requirements: module-completion-discipline

Domain involved: `sdd-workflow`.

---

## sdd-workflow/REQ-021: Task packages for spec-backed execution

For spec-backed non-trivial SDD execution, the workflow MUST require
job-local task packages before implementation is delegated to `@fixer`,
`@designer`, or any other write-capable specialist.

All work under `docs/spec/jobs/<slug>/` is non-trivial by default unless it is
explicitly marked as a trivial documentation-only correction. Trivial direct
edits remain exempt from task packages.

A task package is mandatory when any of the following are true:

- the work is derived from a spec job,
- the change touches more than one functional module,
- the change introduces or changes user-visible behavior,
- the change introduces or changes API-visible behavior,
- the change adds or changes a service, router, workflow, storage boundary, or
  UI screen,
- the work delegates implementation to a write-capable specialist,
- the work requires output review against `REQ` / `DES` anchors.

Each task package MUST include:

- stable `TASK-ID`,
- associated `REQ` and `DES` anchors,
- owner,
- status,
- target behavior stated as observable outcomes,
- file or directory boundary,
- implementation responsibilities,
- explicit out-of-scope boundaries,
- existing contracts that must be preserved,
- acceptance checks,
- validation command or smoke procedure,
- completion evidence fields,
- anti-shell rules.

Task packages are planning artifacts, not implementation artifacts. The
orchestrator owns task package creation during SDD decomposition. `@fixer`
MUST NOT derive task boundaries from broad `REQ` / `DES` sections.

Before any write-capable implementation delegation, the orchestrator MUST
produce or update `docs/spec/jobs/<slug>/tasks.md` and pass mandatory
task-package review by `@oracle`. The review result MUST be recorded in the
job-local artifact so a cold session can recover the gate state.

After task-package review passes, the orchestrator MUST explicitly report that
the job is ready for execution and ask for, or record, execution authorization
unless the user has already requested autonomous execution. The readiness state
MUST be recorded in the job-local artifact.

Implementation MUST NOT be delegated while task-package review is `pending` or
`failed`, or while execution readiness is not authorized.

## sdd-workflow/REQ-022: Anti-shell completion evidence

For spec-backed non-trivial SDD execution, task completion MUST be based on
observable behavior and validation evidence, not on the existence of diffs or
structural scaffolding.

A task MUST NOT be marked `complete` if any acceptance check is satisfied only
by shell, stub, placeholder, TODO, disconnected UI, unmounted API, unused
service, unused schema/model, or fixture-only behavior.

`@fixer` MUST return completion evidence but MUST NOT mark a task package as
`complete`. Only the orchestrator may mark a task `complete`, and only after it
has inspected the diff, acceptance checks, validation results, and anti-shell
constraints.

Output review MUST fail when task completion evidence does not demonstrate
real behavior through a reachable path, direct test, or documented smoke.

Fixture-only behavior is allowed only when the task is explicitly labelled
`demo-only` or `test-fixture-only`, and the task acceptance criteria state that
it is not production-path behavior.

The trace artifact SHOULD include task mappings for active open jobs. Task
details MUST remain in the job-local `tasks.md`; trace files store only task id
references.
