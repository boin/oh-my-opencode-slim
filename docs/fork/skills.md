# Fork-only skills

This fork keeps workflow-intelligence skills separate from upstream-owned static skills.

## Skill taxonomy

Bundled skills are grouped by the role they play in the V2 architecture, not by where they originally came from.

| Class | Skills | Purpose |
|-------|--------|---------|
| V2 core workflow | `deepwork`, `oh-my-opencode-slim` | Support scheduler-first V2 execution and plugin self-maintenance. |
| Workflow intelligence | `grill`, `brainstorming`, `opencode-state-repair`, `using-git-worktrees`, `finishing-a-development-branch` | Encode repeatable engineering workflows that the Orchestrator can auto-detect and lazily load. `grill` is docs-aware in codebases: it maintains shared terminology and records ADR-worthy decisions while producing SDD specs. These are not legacy merely because some were distilled from Superpowers. |
| Knowledge / tooling support | `simplify`, `codemap`, `clonedeps` | Add reusable capabilities for review, repository understanding, and dependency source inspection. |

## Fork-only skill rows

| Skill | Description | Assigned to by default |
|-------|-------------|----------------------|
| `grill` | Docs-aware self-interrogation workflow that produces SDD requirements/design under `docs/spec/`, maintains shared terminology, and records ADR-worthy decisions | `orchestrator` |
| `brainstorming` | Fuzzy front-end ideation for non-SDD repos; hands off to `grill` in SDD repos | `orchestrator` |
| `opencode-state-repair` | Local OpenCode state repair workflow and `state-repair` CLI preflight for stale running subagent tasks/tools, stuck blue notification dots, wrong project icons, and broken session records | `orchestrator` |
| `using-git-worktrees` | Create isolated worktrees for feature work; implements the orchestrator's worktree route | `orchestrator` |
| `finishing-a-development-branch` | Plain-repo end-of-branch decisions (merge/PR/keep/discard); defers to `commit-readiness-batcher` in TTD/deployment contexts | `orchestrator` |

> Vendored: `brainstorming`, `using-git-worktrees`, and `finishing-a-development-branch` were cherry-picked from [obra/superpowers](https://github.com/obra/superpowers) (MIT) and adapted to fit oh-my-opencode-slim's orchestrator + SDD workflow. The original `superpowers` plugin is intentionally not loaded — its TDD/debugging/verification/code-review skills overlap with the orchestrator's inline `## Distilled` discipline sections and with `@oracle` / `@fixer` routing. The vendored workflow skills themselves remain first-class V2 routing assets.
