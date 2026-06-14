## sdd-workflow/REQ-28: Type-safe raw task session reuse

Task session reuse MUST enforce the same specialist boundary for both aliases and
raw `ses_*` task ids when the session is already known to the background job
board.

If a user or orchestrator provides a `task_id` that resolves to a tracked job for
the current parent session, the hook MUST preserve it only when all reusable
session checks pass, including terminal/reconciled state and matching
`subagent_type`.

Unknown raw `ses_*` ids MAY continue to pass through as explicit native OpenCode
session resumes, because the plugin cannot infer their original specialist from
the job board.
