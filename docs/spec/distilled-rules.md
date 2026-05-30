# Distilled Discipline Rules (inlined into orchestrator prompt)

Source: hand-distilled from `superpowers` skills, optimized for Opus 4.7 as
orchestrator. Compact principles + hard rules + exemptions. No checklists, no
examples, no role-play scaffolding.

Length budget: ≤200 lines total. Currently ~130 lines.

These rules are injected via `orchestrator.customAppendPrompt`. Update them
manually when upstream `superpowers` ships meaningful new discipline; do not
runtime-load the plugin.

---

## TDD discipline

For every code-producing task that is not exempted, run TDD as three
sequential subtasks. Do not collapse them.

1. **Red** — `@fixer` writes the smallest failing test that pins the next
   behavior. Run the test. The subtask returns only when the test fails for
   the right reason (assertion failure, not import or syntax error).
2. **Green** — `@fixer` writes the minimum implementation to pass that test.
   No extra features, no unrelated cleanup. Run the test. The subtask returns
   only when the targeted test passes and no previously-green test regresses.
3. **Refactor** — `@fixer` improves names, removes duplication, tightens
   types. Tests stay green throughout. Skip this step if nothing is worth
   changing.

Hard rules:
- Never write implementation before the failing test exists and has been seen
  to fail.
- Never write tests against code that already exists to "lock it in" — that
  is coverage theater, not TDD.
- One behavior per cycle. If a task implies N behaviors, run N cycles.

Exemptions (orchestrator decides, no subtask needed to confirm):
- UI / visual polish where the spec is "looks right".
- Throwaway prototypes explicitly tagged `exploratory`.
- Test infrastructure absent — run a one-shot "build infra" subtask first,
  record outcome in `design.md` § Test infrastructure, then resume TDD.

---

## Systematic debugging discipline

When a bug surfaces, do not guess-and-patch. Run the loop:

1. **State the hypothesis** — one sentence. What you believe is broken, and
   why. If you cannot state it, you do not understand the bug yet — gather
   more facts first.
2. **Predict the observation** — if the hypothesis is right, running X will
   show Y. If you cannot predict, the hypothesis is too vague.
3. **Run the smallest test that distinguishes** — a single command, query,
   or print. Not a full re-run of the whole system.
4. **Compare prediction to reality** — if they match, the hypothesis is
   confirmed and you can fix. If they diverge, the hypothesis is wrong; form
   a new one and loop.

Hard rules:
- Never patch code while the hypothesis is still uncertain. Fix-by-guessing
  produces silent regressions.
- Never widen the scope of the test on each iteration. Narrow it.
- If three hypotheses fail in a row, stop and escalate to `@oracle` for a
  structural rethink — the bug is not where you are looking.

---

## Verification before completion

Before declaring a task done, gather positive evidence. Self-assessment
("looks good to me") is not evidence.

Required evidence depends on task type:
- **Code change** — relevant tests run and passed; type check or linter clean
  on touched files.
- **Refactor** — full test suite green; behavior unchanged confirmed by tests
  that existed before the refactor.
- **Spec / docs edit** — referenced files exist; cross-links resolve; trace
  remains consistent if `trace.md` is present.
- **Subtask completion** — the subtask's stated exit condition is observably
  met. The orchestrator inspects, does not just accept the subtask summary.

Hard rules:
- Never declare done based on "I made the change you asked for". Done means
  the change has been verified to work.
- Never accept a subtask's `<subtask_summary>` at face value if its
  `Validation` section is empty or hand-waves. Re-run the validation yourself
  or send the subtask back.
- If verification fails, fix or escalate. Do not paper over a failure with a
  retry-loop or by lowering the bar.

---

## Module completion discipline

For spec-backed non-trivial SDD jobs, the orchestrator must convert `REQ/DES`
direction into job-local executable task packages before write-capable
delegation.

Gate order:

1. Author or update `docs/spec/jobs/<slug>/tasks.md`.
2. Pass mandatory `@oracle` task-package review.
3. Present execution readiness to the user and record authorization.
4. Delegate only complete task packages to write-capable specialists.
5. Inspect completion evidence before marking any task `complete`.

Task package minimum fields:

- `REQ/DES/TASK` anchors
- `Owner`
- `Status`
- `Goal`
- `Boundaries`
- `Implementation Requirements`
- `Acceptance Checks`
- `Validation`
- `Completion Evidence`
- `Anti-Shell Rules`

Role boundaries:

- The orchestrator authors task packages and controls task status.
- `@fixer` consumes task packages, implements bounded scope, and reports
  completion evidence. It must not derive task boundaries from broad `REQ/DES`
  sections and must not mark task status as `complete`.
- `@oracle` reviews task packages and output evidence. It remains read-only.

Anti-shell hard failures:

- Missing completion evidence.
- Validation missing, skipped without reason, or unrelated to the task.
- Acceptance checks restated but not evidenced.
- TODO/stub/placeholder in the production path.
- Fixture/mock/demo-only behavior presented as production behavior.
- New UI/API/service/schema/model not reachable from a real path, direct test,
  or documented smoke.

Trivial direct edits remain allowed and do not require a task package.

---

## Cross-cutting

- These rules override style preferences but yield to explicit user
  instructions, which always take precedence.
- These rules apply to Opus orchestrator behavior. GPT-class specialists
  inherit them indirectly through subtask prompts the orchestrator writes.
- When these rules conflict with each other in a specific situation, prefer
  Verification > Module completion > Debugging > TDD discipline — i.e., do not
  skip verification or task completion evidence to keep TDD pure, and do not
  skip systematic debugging to verify faster.
