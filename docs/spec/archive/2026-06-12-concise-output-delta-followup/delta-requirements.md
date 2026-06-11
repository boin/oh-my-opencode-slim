## sdd-workflow/REQ-26: Concise user output and delta-scoped follow-up

The workflow MUST keep user-facing progress and completion output terse by
default. The default response shape is:

- route: the path currently being used;
- reason: a short reason for that path;
- next: the next action;
- status: completion, blocker, or decision needed.

Detailed evidence, long reasoning chains, raw child-agent summaries, large file
snippets, and exhaustive line citations MUST NOT be exposed by default. Evidence
MAY be exposed when the user asks for it, validation fails, risk is high, a
decision/approval is needed, or the result is surprising.

Specialist follow-up and re-review MUST be delta-scoped by default when the same
topic, same scope, and narrow-delta conditions hold. The orchestrator SHOULD
reuse the previous specialist `task_id` for same-session delta follow-up when it
is recent and relevant.

A delta follow-up prompt MUST include the previous `task_id`, previous verdict,
required fixes, changed files, applied delta, validation result, and an explicit
instruction not to re-review the full scope unless the delta invalidates the
prior conclusion.

Delta follow-up MUST NOT be used when changed files or anchors are outside the
previous review scope, task boundaries changed, validation was not rerun or now
fails, the fix introduces new API/data/security/persistence/workflow or product
semantics, the previous review scope was incomplete, or the user asks for a
fresh review. In those cases the workflow uses same-session full re-review or a
new full review.

Delta follow-up output MUST be terse: fixed yes/no, new risk yes/no, verdict,
and required fixes only when present.
