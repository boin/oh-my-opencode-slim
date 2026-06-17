# Fork development notes

## Local-plugin development loop

When developing against a local checkout (OpenCode's `plugin` array points at this repo path), the iteration loop is:

1. Edit TypeScript sources under `src/`.
2. Rebuild the plugin bundle: `bun run build:plugin`.
3. Restart OpenCode.

Two non-obvious traps:

- **OpenCode loads `dist/index.js`, never the TS sources.** An edit without a rebuild has no effect.
- **OpenCode does not hot-reload plugins.** A rebuild without a restart also has no effect.

Use `build:plugin` (not the full `build`) for the inner loop — it skips CLI bundling, type-declaration emit, and JSON-schema regeneration, all of which are unnecessary for runtime behavior checks. Run the full `bun run build` before publishing or running CI-relevant verification.
