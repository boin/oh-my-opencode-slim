---
name: grill
description: Docs-aware SDD self-interrogation workflow that converts a raw user idea into requirements + design, maintains shared terminology, and records ADR-worthy decisions under the domain + job two-tier layout.
---

# Grill

## Purpose

Convert a vague request into a defensible spec. In a codebase, `grill` is
docs-aware: it reads the smallest relevant shared context before asking
questions, uses project terminology consistently, and records durable terms or
ADR-worthy decisions after convergence. The orchestrator interrogates its own
assumptions first; only unanswerable or judgment-call questions are escalated to
the human.

Output: domain spec under `docs/spec/domains/<domain>/{requirements,design}.md`
or a job proposal under `docs/spec/jobs/<slug>/`, depending on the change
shape (see "Layout" below). Trace files are emitted by `trace_regenerate`.

## Layout (read this before anything else)

```
docs/spec/
  domains/<domain>/
    requirements.md     # long-lived per-subsystem REQs
    design.md           # long-lived per-subsystem DESs
    trace.md            # generated
  jobs/<slug>/
    proposal.md         # why + scope + affected domains
    delta-requirements.md   # ## <domain>/REQ-N: ...  (mixed domains ok)
    delta-design.md         # ## <domain>/DES-N: ...
    trace.md            # generated
  archive/YYYY-MM-DD-<slug>/
    (whole job snapshot)
```

Heading format is strict:

- `## <domain>/REQ-N: <title>`
- `## <domain>/DES-N: <title>`

where `<domain>` is kebab-case (`[a-z][a-z0-9-]*`). Legacy unqualified
`## REQ-N:` is ignored by the parser. If the trace table comes back empty,
the prefix or colon is wrong.

Anchor format:

- In domain design.md: bare `Rationale anchor: REQ-3` is fine — the parser
  resolves it against the file's domain.
- In job delta-design.md: anchors MUST be fully qualified, e.g.
  `Rationale anchor: auth/REQ-3, payment/REQ-1.`
- Multiple anchors are comma-separated on a single line. Multi-line anchor
  blocks are not parsed.

## When to use a domain spec directly

- Bootstrapping a brand-new domain (no `docs/spec/domains/<d>/` yet).
- Editing the long-lived intent of an existing domain when no behavioral
  change is in flight (rare).

## When to open a job

Default path. Open a job when introducing or changing behavior. Reasons:

- A change usually touches one or more domains. The job is the unit of
  intent; deltas distribute back to domains on merge.
- Concurrent jobs need a way to allocate non-colliding IDs (proposeJob
  reserves IDs by reading both trunk and other open jobs' deltas).
- Archived jobs are the durable record of "what this change looked like".

## When NOT to use grill

- Trivial change (typo, one-line fix, single bounded edit < 20 lines).
- Pure execution work where the user explicitly skips spec.

User approval phrases such as "方案没有问题了，可以开始实现了", "go ahead", or
"looks good, implement it" are implementation authorization signals, not
automatic SDD-start signals. If adequate SDD material already exists, continue to
execution gates. If the change is non-trivial and lacks adequate spec material,
open or complete a grill job before implementation unless the user explicitly
skips SDD. Minor bounded changes still use the normal exemption.

## Domain naming discipline

Before naming a new domain:

1. `ls docs/spec/domains/` and reuse an existing name if any reasonable
   match exists. "auth" probably already covers OAuth, password reset,
   session management — do not invent "session-mgmt" alongside it.
2. If creating a new domain, write one sentence in `jobs/<slug>/proposal.md`
   under a `## Domain: new <name>` heading explaining the boundary.
3. Do not halt to ask the user about the domain name. Pick, record, move on.

There is no central domain registry — this is a behavior rule, not a
runtime check. Reviewers can challenge later.

## 0. Context docs pass

Before the four grill phases in any codebase or SDD repo, read only the smallest
obvious shared-language and decision context:

1. `docs/spec/context.md`
2. `docs/spec/domains/<domain>/glossary.md` for affected domains
3. root `context.md`
4. `docs/spec/adr/` or `docs/adr/` indexes and records when present

Missing context files do not block grill. Record a context-doc assumption and
continue. Do not crawl all docs; the pass is bounded to shared context files,
affected domain glossaries, and existing ADR locations.

Carry known terms into phase 1. Add `A-term-N` assumptions for unclear terms,
naming mismatches, missing definitions, or user wording that does not appear in
specs/code. Resolve self-answerable terminology questions via read/search before
asking the human.

## The four phases

### 1. Assumptions

List every assumption you would otherwise make silently. Format each as
`A-N: <one-sentence statement>`.

### 2. Risks

For each assumption: "What breaks if this is wrong?" Format as
`R-N: <consequence>`. Drop harmless ones.

### 3. Self-answerable questions

Questions the agent can resolve via code read, search, doc fetch. Format
`Q-N: <question> → resolved by @explorer|@librarian|self`. Resolve them
now; inject answers inline.

### 4. Human-decision questions

What remains. Judgment calls, scope choices, business priorities. Format
`H-N: <question> [options: a | b | c]`. Route via `/interview` if present,
else inline numbered list.

## External-dependency double check

For every external dependency (MCP server, third-party API, package,
shared service), the grill MUST raise both:

- **Read responsibility** — who reads, when, what data, why.
- **Write responsibility** — who writes, when, what data, with what guard
  rails (idempotency, retries, schema validation).

If either side is undefined, add an `H-N`. Do not let the spec converge
with one-sided dependency definitions.

## Convergence rule

- Each round = one pass through phases 1-4.
- Each round, ask: "Does the residual `H-N` set block writing?" If no, write.
- Hard cap: 3 rounds. After 3 the issue is structural — halt and report.

## Terminology delta

After convergence, emit a `Terminology Delta` when durable shared language
changed. Durable means future agents or maintainers need the term to understand
specs, code, commands, or user-facing docs. One-off phrasing, obvious generic
programming terms, and speculative names are not persisted.

Use this shape:

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
- Create the smallest file necessary; do not invent a documentation subsystem.

## ADR discipline

Record high-impact, difficult-to-reverse, or non-obvious decisions as Markdown
ADRs. Default path: `docs/spec/adr/NNNN-short-title.md`. If the repo already
uses `docs/adr/`, follow that convention. Number from the next zero-padded ADR;
start at `0001` when none exist.

An ADR requires:

- `Status`
- `Context`
- `Decision`
- `Consequences`
- `Related`

`Related` should include fully qualified `REQ` / `DES` ids and the job slug when
applicable.

Create an ADR when at least one strong trigger or two medium triggers apply.

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

## Tool workflow

### Bootstrap a brand-new domain

1. `mkdir -p docs/spec/domains/<domain>` and write
   `requirements.md` + `design.md` with qualified headings.
2. `trace_regenerate domain=<domain>` to emit the trace.

### Open a job (default path)

1. Pick a kebab-case `<slug>`.
2. Decide which domains the job touches. Use the reuse-first rule.
3. Call `spec_propose slug=<slug> summary=<one-line> domains=[...]`.
   The tool creates `docs/spec/jobs/<slug>/` with proposal.md and
   pre-stamped delta files (one REQ + one DES per declared domain).
4. Run the context docs pass and four-phase grill against the delta files only.
   Domain trunks are read-only during this phase except for explicitly approved
   shared-language updates after convergence.
5. When grill converges, send the job to `@oracle` for output review.
6. Oracle on approval:
   - `spec_merge slug=<slug>` — distributes delta sections back to each
     target domain trunk, refuses on ID collision, regenerates affected
     domain traces and the job trace.
   - `spec_archive slug=<slug>` — moves the whole job dir to
     `docs/spec/archive/YYYY-MM-DD-<slug>/`. Atomic.

### Slug naming

- Each open `<slug>` lives in `docs/spec/jobs/<slug>/` and must be
  unique among open jobs.
- After archive, the same slug can be reused on a different day.
- Same-day re-archive is refused.

## Editing existing REQs/DESs

Out of scope in v1. If a job needs to modify an existing REQ, halt grill
and flag the user.

## Migration from legacy single-trunk

If `docs/spec/requirements.md` exists at the spec root (legacy layout):

```bash
bun run scripts/migrate-spec-to-domains.ts --spec-dir=docs/spec --domain=<name>
```

The script qualifies all headings into `<domain>/REQ-N` / `<domain>/DES-N`,
moves trunk into `domains/<name>/`, moves `changes/<slug>/` into
`jobs/<slug>/`, regenerates the domain trace, and leaves
`.migrated-to-domains` marker for idempotency. Legacy files preserved as
`*.legacy`.

## Memory hooks

Before starting grill: `recall_memories` with project tag + topic. Inject
top 3-5 into phase-1 assumptions as `A-prior-N: <lesson>`.

After convergence: do NOT save memories yourself. @oracle is the sole
writer at output review.

## Anti-patterns

- Skipping phase 1 because "the request is obvious".
- Asking the human things you could have answered with grep/read/fetch.
- Inventing a new domain when an existing one already covers the scope.
- Halting to ask "should I name this domain X?" — pick, record one-line
  rationale in proposal.md, continue.
- Unqualified headings (`## REQ-1:`) anywhere outside legacy untouched
  files. The parser ignores them.
- Mixed-domain anchors written bare in a job delta (must be qualified).
- Editing trunk during a grill round — go through jobs/.
- More than 3 grill rounds.
- Starting a codebase grill without reading existing context/glossary/ADR docs.
- Re-explaining the same durable project term without persisting it.
- Persisting one-off phrasing, speculative names, or generic programming terms
  into shared language docs.
- Hiding ADR-worthy trade-offs inside prose that future maintainers cannot find.
- Creating a separate installed `grill-with-docs` skill or route shim instead of
  upgrading `grill`'s codebase mode.
