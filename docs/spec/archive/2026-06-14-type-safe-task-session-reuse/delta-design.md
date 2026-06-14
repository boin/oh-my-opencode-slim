## sdd-workflow/DES-26: Raw session reuse guard

Rationale anchor: sdd-workflow/REQ-28.

In `src/hooks/task-session-manager/index.ts`, split `task_id` handling into two
paths:

1. First resolve the requested value against `BackgroundJobBoard.resolve()` for
   the current parent session.
2. If the value resolves to a known job, reuse it only through
   `BackgroundJobBoard.resolveReusable(parent, requested, subagent_type)`. When
   that check fails, delete `args.task_id` so OpenCode starts a fresh specialist
   session rather than resuming the wrong agent.
3. If the value does not resolve to any known job and matches raw `ses_*`, keep
   the current pass-through behavior for explicit native session resumes.
4. Continue deleting unknown alias-like values such as `fix-99`.

Regression tests belong in
`src/hooks/task-session-manager/index.test.ts`:

- a known completed/reconciled raw `ses_*` job with the wrong `subagent_type`
  must have `task_id` removed;
- a known completed/reconciled raw `ses_*` job with the matching
  `subagent_type` must still be preserved;
- an unknown raw `ses_*` id must still pass through.
