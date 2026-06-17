# Fork CodeGraph MCP

This fork carries optional CodeGraph MCP integration for local project code graph navigation.

## Built-in MCP entry

| MCP | Purpose | Endpoint |
|-----|---------|----------|
| `codegraph` | Local project code graph via CodeGraph | `codegraph serve --mcp --path <project>` |

`codegraph` is registered only when a compatible CodeGraph binary (`0.9.9` or newer) is on `PATH`. Registration is binary-ready: it does not require the current project to be initialized yet, and it does not create or update `.codegraph/` during plugin startup. This keeps `opencode serve` and desktop client sessions from needing a restart after a project index is initialized.

## Default permissions

| Agent | Default CodeGraph access |
|-------|--------------------------|
| `oracle` | `codegraph` |
| `explorer` | `codegraph` |

CodeGraph results are advisory code-navigation context. They do not replace normal verification with tests, typecheck, lint, or a relevant smoke check.

## Project setup

Install CodeGraph separately, then initialize each repository or git worktree explicitly:

```bash
codegraph --version  # must be 0.9.9 or newer
```

Inside OpenCode, use:

```text
/codegraph status
/codegraph init
/codegraph reindex
```

- `/codegraph status` reports the binary/version gate, project root, worktree context, `.codegraph/` ignore state, index presence/status, and next action.
- `/codegraph init` initializes and indexes the current worktree after safety gates pass.
- `/codegraph reindex` refreshes an existing index for the current worktree.

Each git worktree has its own `.codegraph/` index. Add `.codegraph/` to the project `.gitignore` before running `/codegraph init`; the command refuses to initialize when the index directory is not ignored. Large repositories are also blocked by a tracked-file-count safety gate before indexing.

## Global disable example

```json
{
  "disabled_mcps": ["codegraph"]
}
```
