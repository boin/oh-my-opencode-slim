<!-- proposal: document local-plugin dev loop in AGENTS.md -->

## REQ-019: AGENTS.md must document the local-plugin dev loop

When the OpenCode `plugin` array points at a local checkout of this
repo (the recommended setup for fork-development), agents editing
TypeScript sources will silently run stale code unless they rebuild
`dist/` and restart OpenCode. AGENTS.md MUST state the three-step
loop — edit TS → `bun run build:plugin` → restart OpenCode — and
flag the two non-obvious traps:

1. OpenCode loads `dist/index.js`, not the TS sources, so an edit
   without a rebuild has no effect.
2. OpenCode does not hot-reload plugins, so a rebuild without a
   restart also has no effect.

The doc MUST also note that `bun run build:plugin` is the right
script for a fast iteration loop (it skips CLI build, type
declarations, and schema generation that `bun run build` adds).
