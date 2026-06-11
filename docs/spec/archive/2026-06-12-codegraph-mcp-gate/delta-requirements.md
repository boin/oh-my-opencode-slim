## codegraph/REQ-1: Binary-ready CodeGraph MCP registration

The plugin MUST expose CodeGraph as a built-in MCP when a compatible CodeGraph
binary is available, independent of whether the active project has already run
`codegraph init`. This keeps `opencode serve` and desktop-client sessions from
requiring a server restart after a project index is initialized.

Registration MUST be gated by binary capability, not by project database
existence:

- compatible binary: register the `codegraph` MCP;
- missing binary: do not register the MCP and surface actionable status through
  `/codegraph status`;
- binary version lower than `0.9.9`: do not register by default and instruct the
  user to upgrade, because older versions expose an incompatible MCP tool
  surface;
- disabled via `disabled_mcps`: do not register, even when the binary is
  compatible.

The MCP registration MUST target the current OpenCode project/worktree path as
the CodeGraph project path. It MUST NOT silently initialize or mutate a project
index during plugin startup.

## codegraph/REQ-2: Project-local readiness and indexing commands

The plugin MUST provide a `/codegraph` slash command for explicit project-level
readiness management. The command MUST support at least:

- `/codegraph status` — report binary/version compatibility, project root,
  worktree context, git-ignore readiness for `.codegraph/`, index presence, and
  high-level index freshness/status when available;
- `/codegraph init` — initialize and index the current project only after safety
  gates pass;
- `/codegraph reindex` — refresh an existing current-project index.

Project readiness is scoped to the real git worktree root resolved from the
session directory. Each git worktree MUST have an independent `.codegraph/`
index; the plugin MUST NOT key indexes by `git-common-dir` or share a database
between worktrees. Worktree/common-git information MAY be shown as explanatory
status text only.

Initialization MUST be explicit and safe:

- do not run during plugin startup;
- refuse to initialize when `.codegraph/` is not ignored by git, unless a future
  explicit user option adds the ignore entry;
- guard large repositories using the tracked-file count from `git ls-files` and
  a default threshold of about `3000` files;
- avoid duplicate concurrent init/reindex runs for the same worktree;
- run CodeGraph commands with the worktree root as the project path.

The command output is user-facing and MUST explain the next action when blocked
or incompatible.

## codegraph/REQ-3: Agent access and verification boundaries

The default MCP allow-list MUST make CodeGraph available to agents that benefit
from codebase graph navigation without overexposing it to execution-only agents.
At minimum, the orchestrator's wildcard MCP policy must include CodeGraph when
registered, and read/analysis specialists that need graph context SHOULD be
given explicit access where the existing default policy would otherwise deny it.

The implementation MUST treat CodeGraph graph/navigation tools as advisory
search and analysis assistance. `codegraph affected` or any derived affected-test
signal MUST NOT be used as the sole verification gate for this repository,
because local testing found it unreliable for current source files.

Configuration schema, generated JSON schema, and user-facing documentation MUST
stay aligned with the new built-in MCP name and `/codegraph` workflow.
