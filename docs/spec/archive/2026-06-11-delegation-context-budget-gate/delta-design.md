## sdd-workflow/DES-23: Delegation budget prompt and steering-safe todo reminder

Rationale anchor: sdd-workflow/REQ-25.

Add a compact `Delegation Budget and Context Preservation` block to the inlined
orchestrator append prompt. The block is always-on but intentionally short. It
states:

- delegation is justified by specialist advantage, parallelism, risk reduction,
  or context isolation;
- obvious small local work should use the fast path;
- known-small classification is revoked when inspection reveals hidden breadth,
  boundary crossing, unclear acceptance, noisy validation, or higher risk;
- context-isolation delegation must require compact evidence;
- child outputs are verified proportionally to risk;
- detailed risk matrices and thresholds are not inlined into every turn.

This block is an entry-classification gate. It decides whether to enter heavy
SDD/TDD and how much specialist/context-isolation help is warranted. It MUST NOT
weaken full SDD requirements after a task is classified as full SDD or after a
spec job is opened. TDD ordering remains red → green → refactor, but minor or
known-small work may perform that sequence inline instead of delegating every
step to `@fixer`.

Update prompt tests to lock the always-on contract without expanding the prompt
with the full long-form policy. The prompt should mention fast path, context
isolation, compact evidence, proportional verification, inline TDD, and that
specialist calls are not ritual.

Update the todo-hygiene reminder text so steering does not cause todo-list
replacement. The reminder should instruct the agent to preserve still-valid
todos and merge steering, correction, clarification, or additional constraints
into the current list unless the user explicitly cancels or replaces the task.
Add a unit test for this reminder wording.

The implementation intentionally avoids new runtime state for steering. This is
a prompt-level hygiene fix: the existing hook already injects the reminder after
todo updates; the reminder now gives safer update semantics.
