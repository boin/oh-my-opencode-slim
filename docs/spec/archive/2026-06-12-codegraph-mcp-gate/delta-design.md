## codegraph/DES-1: Binary capability probe and MCP factory

Rationale anchor: codegraph/REQ-1, codegraph/REQ-3.

Add a small CodeGraph integration module, preferably under
`src/tools/codegraph/` for command/readiness logic plus a thin MCP config export
used by `src/mcp/index.ts`.

The module owns:

- `MIN_CODEGRAPH_VERSION = 0.9.9`;
- a binary resolver that defaults to `codegraph` but may accept an override from
  plugin config if added during implementation;
- a version probe that runs `codegraph --version`, parses semver-like output,
  and returns a typed status (`missing`, `too-old`, `ready`, `error`);
- a local MCP config factory that returns `{ type: 'local', command: [...] }`
  only for `ready` binaries.

The local MCP command should use CodeGraph's official MCP server invocation and
bind the project/worktree path explicitly. If the exact binary invocation has to
be represented as arguments, keep it in one tested helper so future CodeGraph
CLI changes are localized.

`src/config/schema.ts` adds `codegraph` to `McpNameSchema`. If a dedicated
`codegraph` config object is introduced, keep it small and schema-backed; do not
add compatibility fallback for CodeGraph versions below `0.9.9`.

`src/mcp/index.ts` changes `createBuiltinMcps` so CodeGraph is not part of the
static eager registry. It should call the CodeGraph capability probe at factory
time and add `codegraph` only when:

1. `disabled_mcps` does not contain `codegraph`, and
2. the binary probe reports `ready`.

Missing or incompatible CodeGraph must fail open for plugin startup: no throw,
no startup DB mutation, and no project initialization. `/codegraph status` is
the user-facing diagnostic path.

Default MCP permissions in `src/config/agent-mcps.ts` should preserve existing
behavior while making the graph useful:

- orchestrator keeps `['*', '!context7']`, which includes CodeGraph when
  registered;
- explorer and oracle get explicit `codegraph` access;
- fixer remains denied by default unless the user overrides it;
- librarian remains focused on external/reference MCPs unless implementation
  evidence shows it needs CodeGraph.

## codegraph/DES-2: `/codegraph` command manager and readiness service

Rationale anchor: codegraph/REQ-1, codegraph/REQ-2, codegraph/REQ-3.

Implement a command manager following the existing factory pattern used by
`createPresetManager`, `createSubtaskCommandManager`, and other runtime command
hooks:

```text
createCodegraphCommandManager(ctx, config?)
  -> registerCommand(opencodeConfig)
  -> handleCommandExecuteBefore(input, output)
```

Register `/codegraph` in the plugin `config` hook without overwriting an
existing user command. Intercept the command in `command.execute.before`, clear
the template output, and push an internal-agent text part with the command
result so normal chat does not receive the raw command template.

The readiness service should expose small pure/testable helpers:

- resolve the worktree root from a directory using `git rev-parse --show-toplevel`;
- resolve the common git dir only for explanatory worktree messaging;
- check whether `.codegraph/` is ignored using `git check-ignore -q .codegraph/`;
- count tracked files using `git ls-files` for the large-repo gate;
- detect whether `.codegraph/codegraph.db` exists;
- run CodeGraph status/init/index commands with the worktree root as project
  path.

Use a per-worktree single-flight map keyed by `realpath(worktreeRoot)` so two
sessions cannot run init/reindex concurrently for the same index. The duplicate
request should return a clear “already running” message rather than spawning a
second process.

Command semantics:

- no args and `status` both run the status path;
- `init` requires compatible binary, git worktree root, `.codegraph/` ignored,
  and tracked-file count under the threshold; then runs CodeGraph initialization
  and a force or normal index as appropriate;
- `reindex` requires compatible binary and an existing initialized index; then
  runs CodeGraph indexing for the current worktree;
- unknown args return short usage text.

Synchronous waiting is acceptable for `init` and `reindex`; the first version is
not required to background indexing.

User-facing output should be concise and actionable:

- `ready`: say that the MCP is available and show the project/worktree path;
- `not initialized`: tell the user to run `/codegraph init`;
- `not ignored`: tell the user to add `.codegraph/` to `.gitignore`;
- `too old`: show detected version, required version, and upgrade hint;
- `large repo`: show tracked-file count and threshold;
- `running`: show that an init/reindex is already in progress for that worktree.

## codegraph/DES-3: Tests, schema generation, and documentation

Rationale anchor: codegraph/REQ-1, codegraph/REQ-2, codegraph/REQ-3.

Use focused Bun tests before implementation and keep the test layer small:

- `src/mcp/index.test.ts` covers binary-ready registration, disabled MCP
  behavior, missing binary, too-old binary, and CodeGraph local config shape;
- `src/config/agent-mcps.test.ts` covers the default agent MCP policy for
  orchestrator, explorer, oracle, and fixer;
- `src/tools/codegraph/*.test.ts` covers version parsing, worktree resolution
  wrappers via injected runners, ignore/tracked-file gates, single-flight
  behavior, command output, and unknown-argument usage;
- integration in `src/index.ts` is covered by the command manager registration
  tests plus typecheck rather than a broad plugin startup test unless one
  already exists.

Do not use real `codegraph affected` as a verification gate. Tests should mock
process execution for deterministic command behavior, while final manual smoke
may call the locally installed `codegraph 0.9.9` for status only.

After schema changes, regenerate `oh-my-opencode-slim.schema.json` with the
existing script used by `bun run build` or the repository's schema generation
path. Update `README.md` and/or relevant docs to mention:

- CodeGraph is optional but auto-registered when a compatible binary exists;
- `opencode serve` users should run `/codegraph init` per project/worktree;
- `.codegraph/` must be ignored;
- CodeGraph graph results are advisory and do not replace normal tests,
  typecheck, lint, or smoke validation.
