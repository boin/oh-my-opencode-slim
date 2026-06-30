# Delta Design: plan-mode-system-reminder-rewrite

## sdd-workflow/DES-31: Plan Mode reminder normalization and handoff continuation

Rationale anchor: sdd-workflow/REQ-33.

Keep the implementation in the fork-local planner bridge surface. Shared entry
files remain thin adapters: `src/index.ts` may call a fork helper from
`experimental.chat.system.transform`, but policy logic belongs under
`src/fork/tools/planner-bridge/**`.

Implementation behavior:

1. Expand Plan Mode reminder normalization to cover the full real reminder shape
   observed in the active session, not only small synthetic phrases. The helper
   must remove or qualify unqualified absolute write bans while preserving the
   rule that all non-plan writes remain forbidden.
2. Instrument or otherwise inspect hook ordering to determine whether the active
   Plan Mode reminder reaches `experimental.chat.system.transform`. If the
   reminder is injected after plugin hooks, document that finding and move the
   fix to a later available hook surface or propose a host-level Plan Mode
   allowed-tool seam.
3. Add regression coverage using the complete real Plan Mode reminder fixture.
   The expected output must allow only `plan_save` for durable markdown plans and
   must not retain unqualified `ZERO exceptions` or equivalent absolute write-ban
   wording.
4. Preserve `plan_save` path safety: only the default session plan,
   `.opencode/plans/*.md` outside archive, and root-level plan-looking markdown
   files are valid explicit save targets.
5. Update durable plan handoff automation so a successful `needs-sdd` import
   continues into native job preparation. After `plan_to_sdd` returns success,
   the orchestrator should inspect the generated job, replace imported
   placeholders with native requirement/design/task content, and run entry
   review. It should stop only on severe blockers: duplicate import refusal,
   missing job files, invalid spec layout, unsafe dirty-worktree conflict, or
   failed entry review.
6. Keep execution separate from handoff: successful SDD import and job
   preparation do not authorize implementation by themselves. Implementation may
   start only after task-package review and execution readiness gates are passed.

Validation strategy:

- Targeted unit tests for reminder normalization, idempotence, path safety,
  natural-language plan maintenance, and `plan_ready` handoff wording.
- Headless or interactive smoke confirming `/plan-save --path plan.md` can call
  `plan_save` while non-plan markdown paths are refused.
- SDD handoff smoke confirming `needs-sdd` import creates the native job and the
  orchestrator continues preparing native deltas instead of stopping at imported
  placeholders.
