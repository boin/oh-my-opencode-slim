# Delta requirements: spec-domain-job-scope

Heading format: `## <domain>/REQ-N: <title>` (per new spec).
Domains involved: `spec-tooling`, `hooks`, `docs-skills`.

---

## spec-tooling/REQ-1: Domain-scoped id namespace

REQ/DES ids MUST be scoped per domain. Headings use the form
`## <domain>/REQ-N: <title>` and `## <domain>/DES-N: <title>`. The
domain prefix is part of the canonical id.

Within a single domain file, `Rationale anchor:` MAY omit the prefix
(`Rationale anchor: REQ-3`) — the parser infers the domain from file
path. Cross-domain anchors MUST use the fully-qualified form
(`Rationale anchor: auth/REQ-3, payment/REQ-1`).

## spec-tooling/REQ-2: Domain directory layout

Each domain owns its own triad:

```
docs/spec/domains/<domain>/
  requirements.md
  design.md
  trace.md
```

`<domain>` is free-form kebab-case. There is no central registry — agents
are responsible for grep-ing `docs/spec/domains/` before naming a new
one. This is a behavioral rule documented in the grill skill, not a
runtime check.

## spec-tooling/REQ-3: Job spec as cross-domain change container

`docs/spec/jobs/<slug>/` holds a single change proposal that MAY span
multiple domains. Required file: `proposal.md`. Optional files:
`delta-requirements.md`, `delta-design.md`, `tasks.md`, `trace.md`.

Delta files use the fully-qualified heading form
(`## <domain>/REQ-N: ...`) so merge can distribute headings to the
correct domain.

## spec-tooling/REQ-4: Merge distributes deltas to domains

`spec_merge slug=<job>` MUST:

1. Parse delta-requirements.md / delta-design.md by heading prefix.
2. Append each heading group to the matching `domains/<d>/requirements.md`
   or `domains/<d>/design.md`.
3. Refuse if any qualified id already exists in its target domain trunk.
4. Regenerate the affected domain traces AND the job trace.

## spec-tooling/REQ-5: Archive preserves whole job

`spec_archive slug=<job>` MUST move `docs/spec/jobs/<slug>/` (including
its `trace.md`) to `docs/spec/archive/YYYY-MM-DD-<slug>/`. The archived
job remains the historical record of "what this change looked like at
the time".

## spec-tooling/REQ-6: Two-tier trace generation

`trace_regenerate` MUST support:

- No arg → regenerate all `domains/*/trace.md`.
- `domain=<d>` → regenerate one domain's trace.
- `job=<slug>` → regenerate that job's trace (cross-domain rollup of
  REQ→DES touched by the job's deltas).

## hooks/REQ-1: Trace-freshness checks all domain triads

The trace-freshness hook MUST walk `docs/spec/domains/*/` and report
staleness per domain. For an open job (`docs/spec/jobs/<slug>/` with
delta files newer than `jobs/<slug>/trace.md`), the hook MUST also report
that job as stale.

## docs-skills/REQ-1: Grill skill teaches the two-tier model

The grill SKILL.md MUST:

- Explain when to write to a domain spec directly vs. open a job.
- Show the qualified heading format with examples.
- State the agent rule: before naming a new domain, list existing ones
  and reuse if a sensible match exists; if creating a new domain,
  justify in one sentence in `proposal.md`.

## docs-skills/REQ-2: Migration documented and scripted

Provide `scripts/migrate-spec-to-domains.ts` (one-shot, idempotent on
re-run, refuses to overwrite). It:

1. Reads existing `docs/spec/{requirements,design}.md`.
2. Asks the user for a default domain name (or accepts `--domain=<d>`).
3. Moves content into `docs/spec/domains/<d>/`.
4. Rewrites headings to the qualified form.
5. Regenerates the domain trace.
6. Leaves a `.migrated` marker so re-runs are no-ops.

## docs-skills/REQ-3: Append-prompt SDD section updated

`src/agents/append-prompt.ts` SDD workflow text MUST reference the
two-tier model, the qualified id format, and the "reuse domain before
inventing" rule.
