## DES-018: Add "Local-plugin development loop" subsection to AGENTS.md

Rationale anchor: REQ-019.

Insert a new subsection immediately after the existing "Commands"
table in `AGENTS.md` (line ~26, before "Code Style"). The subsection
prescribes:

- Three-step loop: edit TS → `bun run build:plugin` → restart
  OpenCode.
- Why `build:plugin` not `build`: skips CLI, type declarations, and
  schema regeneration; fastest path that still refreshes
  `dist/index.js`.
- Two traps stated explicitly:
  - OpenCode loads `dist/index.js`, never the TS sources.
  - OpenCode does not hot-reload plugins; a rebuild alone is not
    enough.
- A one-line note that the slower `bun run build` is still required
  before publishing or before any CI-relevant verification.

Documentation only; no runtime code changes, no test changes.
