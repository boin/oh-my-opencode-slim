# Delta Requirements: plan-mode-system-reminder-rewrite

## sdd-workflow/REQ-33: Plan-mode reminder rewrite and automatic SDD handoff continuation

The durable plan bridge MUST preserve Plan Mode as a planning surface while
allowing the fork-local `plan_save` tool as the only durable-plan write
exception.

The bridge MUST investigate and fix cases where the active Plan Mode system
reminder still contains unqualified absolute write bans such as `ZERO
exceptions`, `STRICTLY FORBIDDEN`, or equivalent wording that prevents
`plan_save` from being used for durable markdown plans.

The bridge MUST continue automatically after a `needs-sdd` handoff succeeds. If
`plan_ready` returns `needs-sdd` and `plan_to_sdd` successfully imports the plan
into `docs/spec/jobs/<slug>/`, the orchestrator MUST continue by preparing the
native SDD delta files and task gates for that job. It MUST NOT stop merely
because the import completed. The orchestrator MAY stop only for severe blockers
such as duplicate import refusal, missing job files, invalid spec layout,
conflicting worktree state that would risk data loss, or a failed entry review.

The bridge MUST NOT automatically implement code, commit, deploy, run
`spec_merge`, or mark `Execution Readiness.Status: authorized` until native SDD
task-package review has passed and execution readiness has been explicitly
authorized.
