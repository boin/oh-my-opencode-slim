# V2-native local customization plan

This plan records how local customizations from the pre-V2 fork should be
carried forward after merging upstream V2.

## Principle

Use upstream V2 as the runtime baseline. Preserve local customization intent, but
do not preserve V1 runtime mechanisms merely for compatibility.

In practice:

- V2 runtime wins: background task orchestration, `cancel_task`, companion,
  unified multiplexer, runtime presets, fallback chains, and hook-driven task
  session management are the base architecture.
- Prefer designed V2 extension points: add local behavior through existing
  tools, MCPs, command hooks, message hooks, skills, companion surfaces, and
  background-job orchestration instead of patching around the architecture.
- If upstream V2 already implements the same intent, use the upstream V2
  implementation rather than forcing the local V1 implementation to coexist.
- Local workflow intelligence stays: distilled skills from Superpowers, local
  skills such as `grill`, and operator-specific workflow skills such as grill-me
  are first-class routing assets, not legacy residue.
- Workflow intelligence should normally trigger during task execution through
  Orchestrator routing and lazy skill loading, not require the user to manually
  invoke the skill by name.
- V1 runtime residue stays out: old custom `subtask` tooling, Divoom runtime,
  `session-goal`, and old `todo-continuation` runtime should not be revived
  unless they are redesigned around V2 background orchestration.

## Local customization inventory

The local-only commits from `backup/pre-v2-merge-local-head` fall into these
themes.

| Theme | Representative commits | Core intent | V2-native decision |
| --- | --- | --- | --- |
| CodeGraph integration | `a17f021`, `5bd8e6c` | Add binary-gated CodeGraph MCP registration, `/codegraph` readiness commands, and per-agent MCP access. | Keep and expose through V2 MCP/tool/command surfaces. |
| SDD / spec / trace | `5378c12`, `6faed00`, `38979b9`, `2a7cada`, `fc7b735`, `290051b`, `ac95ddf`, `dcabbc8`, `681a5bd` | Add two-tier domain/job specs, strict trace regeneration, task gates, design handoff, context budget, and routing evidence. | Keep the discipline, but express it through V2 hooks, skills, and background specialist tasks. |
| Orchestrator / Oracle discipline | `0b708cf`, `2a7cada`, `fc7b735`, `681a5bd` | Make the Orchestrator smaller, more evidence-driven, and stricter about delegation, review, and anti-shell checks. | Keep as prompt/routing policy; update wording away from V1-specific task mechanics where needed. |
| Workflow intelligence skills | `e30cd6d` | Vendor distilled workflow skills such as `brainstorming`, `using-git-worktrees`, and `finishing-a-development-branch`. Local skills such as `grill` and grill-me-style operator workflows belong to the same category. | Keep as V2 routing assets. They should be auto-detected, lazily loaded, and documented as workflow intelligence, not legacy. |
| Test / infra hardening | `8f817ad`, `adbc53c`, related spec/trace tests | Stabilize tests and cover spec/trace/apply-patch behavior. | Keep as reliability support for the retained V2-native customizations. |
| Release and archive noise | release commits, historical `docs/spec/archive/*` snapshots | Preserve historical context and generated spec archive snapshots. | Keep only when useful for traceability; consider slimming published docs if package size or user clarity suffers. |

## Current post-merge mapping

| Customization | Current state | Follow-up |
| --- | --- | --- |
| CodeGraph | Registered in `src/mcp/index.ts`, exposed by `src/tools/codegraph/*`, wired in `src/index.ts`, and documented in `docs/mcps.md`. | Keep. Audit docs and schema wording for `gh_grep` plus `codegraph` consistency. |
| Spec / trace tools | `createSpecTools`, `createTraceTool`, and `createTraceFreshnessHook` are wired into V2 plugin surfaces. | Keep. Reword SDD docs to use V2 background specialist task terminology. |
| SDD prompt discipline | `src/agents/append-prompt.ts` is appended to Orchestrator behavior. | Keep the policy. Remove or translate any old custom task-tool assumptions. |
| Workflow skills | `grill`, `brainstorming`, `using-git-worktrees`, `finishing-a-development-branch`, `deepwork`, and plugin self-improvement skills are installed through `src/cli/custom-skills.ts`. | Keep. Classify as workflow intelligence skills and document their routing relationships. |
| Old `subtask` tool | Removed from `src/tools/` and not registered in `src/index.ts`. | Keep removed. Use native V2 background `task` plus hook-driven completion. |
| Divoom runtime | Removed. Companion is the V2 replacement. | Keep removed. Do not rebuild new work on Divoom. |
| `session-goal` runtime | Removed. | Keep removed unless redesigned as a V2 skill or lightweight hook. |
| `todo-continuation` runtime | Not registered in V2 runtime. Passive `todo-hygiene` is now a standalone V2 hook. | Do not restore old auto-continuation. Keep the passive hygiene form because it prevents todo drift during user steering. |
| `tmux` | Still present upstream as a V2 multiplexer backend and legacy config migration path. | Keep as upstream V2 support. Do not treat it as local V1 residue. Prefer `multiplexer` config in docs. |

## Skill taxonomy

Bundled and operator-provided skills should be documented by role, not by origin.

| Class | Examples | Routing meaning |
| --- | --- | --- |
| V2 core workflow | `deepwork`, `oh-my-opencode-slim` | Directly supports the V2 scheduler-first architecture and plugin maintenance. |
| Workflow intelligence | `grill`, `brainstorming`, `using-git-worktrees`, `finishing-a-development-branch`, grill-me-style skills | Encodes repeatable human engineering workflows. The Orchestrator should auto-detect and lazily load them when the task matches. |
| Knowledge / tooling support | `codemap`, `clonedeps`, `simplify` | Adds reusable support capabilities for repository understanding, dependency source inspection, and code simplification. |

This taxonomy intentionally does not mark Superpowers-derived skills as legacy.
Their implementation should be kept compatible with V2 routing, but their workflow
content remains valuable.

## Cleanup plan

### Phase 1 — Inventory and wording alignment

- Update docs that describe skills so workflow intelligence skills are presented
  as first-class V2 routing assets.
- Replace old custom task-tool wording in retained SDD docs with V2 background
  specialist task terminology where it describes runtime behavior.
- Keep historical spec archives intact unless they create package-size or user
  confusion problems.

### Phase 2 — Runtime residue audit

- Confirm no old custom `subtask`, Divoom, `session-goal`, or
  `todo-continuation` runtime path is reachable from `src/index.ts`.
- Keep `todo-hygiene` only while it remains passive and V2-native: it may remind
  the Orchestrator to preserve still-valid todos and merge new user steering,
  but it must not restart autonomous continuation or replace the todo list
  wholesale.
- Confirm all retained customizations use V2 surfaces: tools, MCPs, command
  hooks, message hooks, skills, or background task orchestration.

### Phase 3 — V2-native routing polish

- Make skill descriptions and docs explicit enough for automatic skill routing.
- Ensure SDD/grill/grill-me-style workflows state when they should trigger and when
  they should defer to V2 core flows.
- Keep local customization hooks small and surgical so upstream V2 updates remain
  easy to merge.

## Todo hygiene judgment

The useful part of the old todo work is not auto-continuation. The useful part is
protecting the active plan when the user corrects, steers, or adds constraints
mid-conversation.

Desired behavior:

- preserve still-valid todos;
- merge new steering into the current plan;
- only cancel or replace todos when the user explicitly cancels or replaces the
  task;
- clear the final active todo before finishing.

This is a passive hygiene rule and may be expressed through a V2 message/tool
hook. It must not become an autonomous loop driver.

## Archive policy

`docs/spec/archive/*` is historical design evidence for this fork. It is useful
for reconstructing why local SDD decisions were made. It can be excluded from a
future public package if package size or user clarity matters, but this fork does
not need to optimize for npm package minimalism unless publishing becomes a real
goal.

## Non-goals

- Do not remove upstream V2 features just because they share names with old
  concepts. `tmux` is still an upstream V2 multiplexer backend.
- Do not reintroduce V1 runtime code to preserve old behavior.
- Do not classify distilled workflow skills as obsolete merely because their
  origin predates V2.
