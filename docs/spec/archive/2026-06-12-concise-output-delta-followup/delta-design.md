## sdd-workflow/DES-24: Concise output and specialist delta follow-up prompt

Rationale anchor: sdd-workflow/REQ-26.

Add a compact section to the inlined orchestrator append prompt for concise
user output and specialist follow-up reuse. It remains always-on but short.

The concise output rule says user-facing progress should be route-first and
terse. The prompt names the default fields (`route`, `reason`, `next`, `status`)
and says not to expose raw reasoning, long evidence chains, or full child
summaries unless failure, approval, high risk, surprising result, or user
request requires it.

The follow-up rule says specialist follow-up should reuse the previous task
session and be delta-scoped when the same topic/scope and narrow-delta checks
pass. It distinguishes same-session delta follow-up, same-session full
re-review, and new-session full review. It requires the delta prompt to include
previous `task_id`, previous verdict, required fixes, changed files, applied
delta, and validation. It also names disqualifiers that force full re-review:
validation not rerun or now failing, files or anchors outside the prior scope,
new API/data/security/persistence/workflow or product semantics, incomplete
prior review scope, or a user-requested fresh review.

Prompt tests lock the compact always-on wording without inlining long templates
or risk tables. The line-count guard remains in place to prevent prompt growth.

This design is prompt-only. It does not add runtime tracking of review state;
the orchestrator records review state in SDD `tasks.md`, todos, or internal
notes when a follow-up is expected.
