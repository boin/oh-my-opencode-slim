# MCP Servers

Built-in Model Context Protocol (MCP) servers ship with oh-my-opencode-slim and give agents access to external tools — web search, library documentation, GitHub code search, and optional local code graph navigation.

---

## Built-in MCPs

| MCP | Purpose | Endpoint |
|-----|---------|----------|
| `websearch` | Real-time web search via Exa AI | `https://mcp.exa.ai/mcp` |
| `context7` | Official library documentation (up-to-date) | `https://mcp.context7.com/mcp` |
| `gh_grep` | GitHub code search via grep.app | `https://mcp.grep.app` |
| `codegraph` | Local project code graph via CodeGraph | `codegraph serve --mcp --path <project>` |

`codegraph` is registered only when a compatible CodeGraph binary (`0.9.9` or
newer) is on `PATH`. Registration is binary-ready: it does not require the
current project to be initialized yet, and it does not create or update
`.codegraph/` during plugin startup. This keeps `opencode serve` and desktop
client sessions from needing a restart after a project index is initialized.

---

## Default Permissions Per Agent

| Agent | Default MCPs |
|-------|-------------|
| `orchestrator` | `*`, `!context7` |
| `librarian` | `websearch`, `context7`, `gh_grep` |
| `designer` | none |
| `oracle` | `codegraph` |
| `explorer` | `codegraph` |
| `fixer` | none |
 | `councillor` | none |

CodeGraph results are advisory code-navigation context. They do not replace
normal verification with tests, typecheck, lint, or a relevant smoke check.

---

## CodeGraph Project Setup

Install CodeGraph separately, then initialize each repository or git worktree
explicitly:

```bash
codegraph --version  # must be 0.9.9 or newer
```

Inside OpenCode, use:

```text
/codegraph status
/codegraph init
/codegraph reindex
```

- `/codegraph status` reports the binary/version gate, project root, worktree
  context, `.codegraph/` ignore state, index presence/status, and next action.
- `/codegraph init` initializes and indexes the current worktree after safety
  gates pass.
- `/codegraph reindex` refreshes an existing index for the current worktree.

Each git worktree has its own `.codegraph/` index. Add `.codegraph/` to the
project `.gitignore` before running `/codegraph init`; the command refuses to
initialize when the index directory is not ignored. Large repositories are also
blocked by a tracked-file-count safety gate before indexing.

---

## Configuring MCP Access

Control which MCPs each agent can use via the `mcps` array in your preset config (`~/.config/opencode/oh-my-opencode-slim.json` or `.jsonc`):

| Syntax | Meaning |
|--------|---------|
| `["*"]` | All MCPs |
| `["*", "!context7"]` | All MCPs except `context7` |
| `["websearch", "context7"]` | Only listed MCPs |
| `[]` | No MCPs |
| `["!*"]` | Deny all MCPs |

**Rules:**
- `*` expands to all available MCPs
- `!item` excludes a specific MCP
- Conflicts (e.g. `["a", "!a"]`) → deny wins

**Example:**

```json
{
  "presets": {
    "my-preset": {
      "orchestrator": {
        "mcps": ["*", "!context7"]
      },
      "librarian": {
        "mcps": ["websearch", "context7", "gh_grep"]
      },
      "oracle": {
        "mcps": ["*", "!websearch"]
      },
      "fixer": {
        "mcps": []
      }
    }
  }
}
```

---

## Disabling MCPs Globally

To disable specific MCPs for all agents regardless of preset, add them to `disabled_mcps` at the root of your config:

```json
{
  "disabled_mcps": ["websearch", "codegraph"]
}
```

This is useful when you want to cut external network calls entirely (e.g. air-gapped environments or cost control).
