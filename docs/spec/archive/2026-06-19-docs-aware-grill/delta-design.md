## sdd-workflow/DES-28: Docs-aware grill mode

Rationale anchor: sdd-workflow/REQ-30.

Extend `src/fork/skills/grill/SKILL.md` without creating a separate
`grill-with-docs` skill. The existing `grill` skill remains the SDD entrypoint;
docs-aware behavior is its codebase mode.

### Context docs pass

Insert a phase before the existing four grill phases:

```text
0. Context docs pass
```

The pass is intentionally lightweight and deterministic:

1. Determine affected SDD domains using the existing reuse-first domain rule.
2. Read existing context sources in priority order:
   - `docs/spec/context.md`
   - `docs/spec/domains/<domain>/glossary.md`
   - root `context.md`
   - `docs/spec/adr/` or `docs/adr/` when present
3. Carry known terms into phase 1 assumptions.
4. Add `A-term-N` assumptions for unclear terms, naming mismatches, missing
   definitions, or terms that appear in user language but not in specs/code.
5. Resolve self-answerable terminology questions via read/search before asking
   the human.

The pass must stay bounded. It reads only obvious shared context files and
domain-local glossary files for affected domains; it does not perform a broad
documentation crawl.

### Shared language updates

After convergence, `grill` emits a `Terminology Delta` section in its own work
notes or the job proposal/spec delta when durable terminology changed. The delta
uses this shape:

```markdown
## Terminology Delta

- Term: <canonical term>
  Definition: <short definition>
  Aliases / rejected names: <optional>
  Scope: global | <domain>
  Used by: <spec/code/doc references>
```

Persistence rules:

- Global SDD terms go to `docs/spec/context.md`.
- Domain-specific terms go to `docs/spec/domains/<domain>/glossary.md`.
- Non-SDD repositories may use root `context.md`.
- Existing project convention wins when an equivalent file already exists.
- The workflow creates the smallest file necessary and does not invent a general
  documentation system.

The orchestrator may perform structural glossary edits directly because they are
docs-only and bounded. If glossary updates alter product language, public copy,
or user-facing semantics, they must be reviewed as part of the normal SDD output
review.

### ADR capture

Add an ADR discipline to the skill:

- Default path: `docs/spec/adr/NNNN-short-title.md`.
- Compatibility path: use `docs/adr/` if the repo already has that convention.
- Numbering: next zero-padded number among existing ADR files; if no ADR exists,
  start at `0001`.
- Required sections: `Status`, `Context`, `Decision`, `Consequences`, `Related`.
- Related links include fully qualified `REQ` / `DES` ids and job slug when
  applicable.

ADR trigger heuristic: create an ADR when at least one strong trigger or two
medium triggers apply.

Strong triggers:

- data, API, security, persistence, deployment, or workflow boundary change;
- cross-domain architecture decision;
- decision is hard to reverse or expensive to migrate;
- future maintainers would likely find the code path surprising without context.

Medium triggers:

- external dependency responsibility split;
- explicit performance vs maintainability trade-off;
- naming/modeling choice that shapes multiple files or public docs;
- deprecating an old workflow or rejecting a plausible alternative.

If a decision is not ADR-worthy, record the rationale in `design.md` only.

### Skill and docs updates

Update these fork-owned assets:

- `src/fork/skills/grill/SKILL.md`: add context docs pass, terminology delta,
  ADR discipline, authorization-signal clarification, and anti-patterns.
- `src/fork/skills/grill/README.md`: summarize docs-aware mode.
- `docs/fork/skills.md`: update the `grill` row and taxonomy wording.
- `src/cli/custom-skills.ts`: refresh the human-readable bundled skill
  description; no new skill registry entry is added.

Do not add a `grill-with-docs` skill. The name may be mentioned as upstream
inspiration, but the installed skill remains `grill` to avoid route ambiguity
with SDD and `brainstorming` handoff behavior.

### Prompt footprint

The always-on orchestrator prompt should not be expanded for this change unless
future validation proves the skill is not loaded reliably. The detailed rules
belong in the skill file and durable SDD specs. Existing SDD prompt text may keep
referring to "grill" without enumerating docs-aware internals.

### Verification

Docs/spec-only verification requires:

```bash
bun run check:ci
bun run typecheck
```

Run `bun test` if TypeScript or runtime registry behavior changes beyond string
metadata. Since this job updates `src/cli/custom-skills.ts`, run the focused CLI
tests when practical:

```bash
bun test src/cli/skills.test.ts src/cli/providers.test.ts
```
