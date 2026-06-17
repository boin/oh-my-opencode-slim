## sdd-workflow/REQ-29: Fork-owned implementation surface

Fork-only workflow assets MUST be isolated under fork-owned namespaces so
future upstream merges touch as few shared files as possible. Descriptive
fork documentation MUST move out of upstream-owned README and docs pages into
`docs/fork/**`; upstream-owned docs SHOULD be restored to upstream content
unless they are required runtime assets. Runtime fork behavior MUST remain
available, but implementation detail SHOULD live under `src/fork/**` with only
thin, stable integration points in upstream-owned entry files.

Acceptance:

- `README.md` and broad upstream docs no longer carry fork-only descriptive
  sections when equivalent content can live in `docs/fork/**`.
- fork-only tools, hooks, prompt overlays, and skills are concentrated under
  `src/fork/**` where practical.
- upstream-owned barrels and registries (`src/index.ts`, `src/hooks/index.ts`,
  `src/tools/index.ts`, `src/mcp/index.ts`, `src/agents/*.ts`) contain only
  minimal integration glue needed to preserve behavior.
- existing fork behavior remains covered by tests and build verification.

## codegraph/REQ-4: CodeGraph fork isolation

The CodeGraph integration MUST be treated as fork-owned behavior. CodeGraph
command and MCP implementation details SHOULD live under `src/fork/**` rather
than upstream-owned MCP/tool registries. Shared entry files MAY expose a thin
merge point, but CodeGraph probing, command registration, tests, and related
logic MUST be isolated enough that upstream MCP registry changes create minimal
merge conflicts.

Acceptance:

- CodeGraph implementation files are under a fork-owned namespace.
- built-in MCP creation still exposes CodeGraph when the binary is available
  and not disabled.
- command registration and tests continue to pass.
