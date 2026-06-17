## sdd-workflow/DES-27: Fork namespace and thin adapters

Rationale anchor: sdd-workflow/REQ-29.

Create `src/fork/**` as the long-lived namespace for fork-only behavior:

- `src/fork/tools/**` owns spec, trace, and CodeGraph command tools.
- `src/fork/hooks/**` owns trace freshness and todo hygiene hooks.
- `src/fork/agents/**` owns prompt append/overlay helpers.
- `src/fork/skills/**` owns fork-only install-time skills.
- `src/fork/cli/**` owns descriptors for fork-only skills.

Create a small `src/fork/index.ts` integration surface that returns fork tools,
hooks, command registration helpers, and prompt overlay helpers as needed. Keep
shared entry files as adapters only:

- `src/index.ts` imports fork runtime once and spreads returned tools / hooks.
- `src/hooks/index.ts` and `src/tools/index.ts` should not export fork-only
  implementation modules unless required for a compatibility seam.
- agent prompt changes should be applied via fork overlays from
  `src/agents/index.ts`, not embedded in each upstream-owned agent file.
- fork-only docs move to `docs/fork/**`; `docs/spec/**` remains in place because
  it is a runtime/spec dogfood surface for this fork.

Validation:

- `bun run check:ci`
- `bun run typecheck`
- targeted tests for moved modules
- full `bun test`
- `bun run build`
- conflict-surface report: list changed files outside `src/fork/**`,
  `docs/fork/**`, and `docs/spec/**`.

## codegraph/DES-4: CodeGraph fork module

Rationale anchor: codegraph/REQ-4.

Move CodeGraph command implementation from `src/tools/codegraph/**` into
`src/fork/tools/codegraph/**`. Move CodeGraph MCP probing/registration logic
from the upstream-owned MCP registry into `src/fork/mcp/codegraph.ts` where
practical. If `src/mcp/index.ts` must retain an options seam for project path
or disabled MCP handling, keep that seam minimal and delegate CodeGraph-specific
logic to the fork module.

Tests follow the implementation into `src/fork/**` unless they exercise shared
adapter behavior. The public behavior remains unchanged: available CodeGraph
MCP tools are registered when the binary is usable, disabled MCP settings still
apply, and `/codegraph` command registration still works.
