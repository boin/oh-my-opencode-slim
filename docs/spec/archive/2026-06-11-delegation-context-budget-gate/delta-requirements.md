## sdd-workflow/REQ-25: Delegation budget and steering-safe todo hygiene

The workflow MUST treat specialist and subagent calls as value-based tools, not
ritual steps. A delegation is justified only when it provides at least one of:

- specialist advantage,
- parallel execution advantage,
- risk reduction,
- or context isolation that keeps bulky/noisy evidence out of the parent
  conversation.

The workflow MUST start with the cheapest valid path. Obvious small local work
uses a fast path with no probe, no specialist call, and no explicit routing
report when all of the following are true:

- exact target files are known;
- the expected edit is local and small;
- no API, data, security, persistence, workflow, deployment, open-job, or spec
  anchor signal is present;
- no UX/product ambiguity is present;
- focused validation is available.

The fast path is revocable. If inspection reveals hidden breadth, boundary
crossing, unclear acceptance, noisy validation, or medium/high risk, the agent
MUST stop direct editing and reclassify before continuing.

When size is unknown, the workflow SHOULD use the cheapest safe probe before
delegating for context isolation. Probe results and delegation decisions SHOULD
stay silent for trivial work, but MUST be stated when they change routing,
skip an expected SDD/specialist path, or detect that the task is larger than
expected.

Context-isolation results MUST include a compact evidence contract: inspected
scope, conclusion, minimal evidence, uncertainty/excluded areas, and recommended
next action. The orchestrator MUST verify child outputs proportionally to risk;
context isolation reduces parent context ingestion but does not replace
verification.

Detailed risk tables, thresholds, examples, and observability belong in spec or
rule docs rather than bloating the always-on prompt. The always-on prompt MUST
keep only the short decision entrypoint.

Todo hygiene MUST preserve existing work during steering. When a user provides
steering, correction, clarification, or an additional constraint, the agent MUST
merge that guidance into the current todo list instead of replacing the list
wholesale, unless the user explicitly cancels or replaces the active task.
