# Fork upstream alignment rules

This repository is an enhance-upstream fork. Treat upstream as the product
baseline and keep fork behavior as a thin, intentional extension layer.

## Core principle

When upstream design changes, prefer adapting the fork to upstream semantics over
preserving old fork structure. Fork code may compromise with upstream design as
long as the fork's core semantics do not fundamentally drift.

## Merge and implementation rules

1. **Upstream semantics win by default.** During upstream merges, preserve the
   upstream control flow, data shapes, hook contracts, and replacement semantics
   unless doing so would remove a deliberate fork capability.
2. **Fork deltas must be thin.** Put fork-only behavior under `src/fork/**` where
   practical. Shared entry files such as `src/index.ts` and
   `src/agents/index.ts` should remain adapters that register, compose, or call
   fork modules.
3. **Use explicit upstream seams.** Prefer OpenCode/plugin hook interfaces,
   command registration, tool registration, config schemas, and agent prompt
   composition seams over patching upstream-owned internals.
4. **Do not shadow explicit user configuration.** File or inline replacement
   prompts, user permission rules, and project-local config should take
   precedence over fork defaults. Fork defaults may append only when no explicit
   replacement was provided.
5. **Avoid new policy engines in entry files.** If a fork feature needs policy
   logic, move that logic behind a helper or fork module and keep entry-layer
   code declarative.
6. **Prefer compatibility pass-through over expansion.** Expose upstream/SDK
   capabilities when useful, but do not grow fork-specific semantics unless they
   are necessary for the fork's core workflows.
7. **Accept reduced convenience to reduce conflict.** Optional compatibility
   surfaces that require invasive entry-layer handling should be narrowed or
   deferred when they are not core fork behavior.

## Current fork capabilities to preserve

Preserve these as intentional fork semantics, but keep them isolated:

- SDD/TDD orchestration discipline and task-package gates.
- Planner bridge and durable plan handoff.
- Spec, trace, and trace-freshness tools/hooks.
- Todo hygiene and background orchestration nudges.
- Fork prompt overlays for specialist discipline, when they do not override
  explicit user replacement prompts.
- CodeGraph MCP/command integration.

## Review checklist for upstream merges

Before merging or pushing upstream-sync work, answer:

- Which changed files are outside `src/fork/**`, `docs/fork/**`, and
  `docs/spec/**`, and why are those changes unavoidable?
- Did any fork behavior move into `src/index.ts` or another shared entry file
  that could instead be a fork module or helper?
- Did the fork preserve upstream replacement semantics for prompts/config?
- Are generated artifacts such as `oh-my-opencode-slim.schema.json` synced with
  source schemas?
- Are compatibility behaviors tested without broadening entry-layer policy?

If the answer is unclear, prefer a smaller merge-compatible behavior now and
defer structural improvements to a separate fork-isolation refactor.
