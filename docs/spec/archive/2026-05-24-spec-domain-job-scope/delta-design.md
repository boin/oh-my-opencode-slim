# Delta design: spec-domain-job-scope

---

## spec-tooling/DES-1: Parser supports qualified ids

Rationale anchor: spec-tooling/REQ-1

Change `src/tools/trace/parser.ts`:

```ts
// Old:
const HEADING_ID_RE = (prefix: string) =>
  new RegExp(`^##\\s+(${prefix}-\\d+):`, 'gm');

// New:
const HEADING_ID_RE = (prefix: string) =>
  new RegExp(`^##\\s+([a-z][a-z0-9-]*\\/${prefix}-\\d+):`, 'gm');
```

`extractSections` returns `Section { id: 'auth/REQ-1', body: ... }`.
`extractIds` returns `['auth/REQ-1', ...]`.

`extractAnchors` accepts either qualified (`auth/REQ-3`) or bare
(`REQ-3`) anchor entries. When bare, caller MUST pass the current
domain so the parser can qualify them before returning.

## spec-tooling/DES-2: trace_regenerate dispatches on arg shape

Rationale anchor: spec-tooling/REQ-6

`src/tools/trace/io.ts` exports:

- `regenerateDomainTrace(specDir, domain)` — reads
  `domains/<domain>/{requirements,design}.md`, writes
  `domains/<domain>/trace.md`.
- `regenerateAllDomainTraces(specDir)` — globs `domains/*/`, calls
  the above for each.
- `regenerateJobTrace(specDir, slug)` — reads
  `jobs/<slug>/delta-{requirements,design}.md`, writes
  `jobs/<slug>/trace.md` listing all qualified ids touched.

The `trace_regenerate` tool dispatches on `args.domain` / `args.job` /
default-all.

## spec-tooling/DES-3: spec_propose creates a job dir

Rationale anchor: spec-tooling/REQ-3

`spec_propose(slug, summary, domains?)` creates:

```
docs/spec/jobs/<slug>/
  proposal.md             # summary + scope
  delta-requirements.md   # next ids pre-stamped, per declared domain
  delta-design.md         # next ids pre-stamped, anchored
```

If `domains` is omitted, deltas are seeded empty (drafting agent fills
in). If `domains=[auth, payment]`, deltas pre-allocate one
`## auth/REQ-N: <fill>` and one `## payment/REQ-N: <fill>` per domain.

Next-id allocation reads `domains/<d>/requirements.md` AND every open
job's `delta-requirements.md` to avoid collision across concurrent jobs.

## spec-tooling/DES-4: spec_merge distributes by prefix

Rationale anchor: spec-tooling/REQ-4

```ts
function mergeJob(specDir, slug) {
  const deltas = readJobDeltas(specDir, slug);
  const byDomain = groupByPrefix(deltas);  // 'auth/REQ-3' -> 'auth'
  for (const [domain, sections] of byDomain) {
    assertNoCollision(specDir, domain, sections);
    appendToDomain(specDir, domain, sections);
    regenerateDomainTrace(specDir, domain);
  }
  regenerateJobTrace(specDir, slug);
  return { affectedDomains: Object.keys(byDomain) };
}
```

Collision = qualified id already exists in target domain trunk.

## spec-tooling/DES-5: spec_archive moves whole job dir

Rationale anchor: spec-tooling/REQ-5

```ts
function archiveJob(specDir, slug) {
  const src = join(specDir, 'jobs', slug);
  const dst = join(specDir, 'archive', `${today}-${slug}`);
  if (existsSync(dst)) throw 'already exists';
  renameSync(src, dst);
  return { archivePath: dst };
}
```

No content rewrite. The archived job is the historical snapshot.

## hooks/DES-1: trace-freshness walks domains and open jobs

Rationale anchor: hooks/REQ-1

`isTraceStale` becomes `findStaleTraces(specDir): StaleEntry[]` where
each entry is `{kind: 'domain'|'job', name, traceMtime, sourceMtime}`.

The hook message format becomes:

```
<internal_reminder>trace_regenerate: stale [domain:auth, job:add-otp]</internal_reminder>
```

so the agent knows what to regenerate.

## spec-tooling/DES-6: Backward-incompat flag day

Rationale anchor: spec-tooling/REQ-2

No dual-mode code. If `docs/spec/requirements.md` exists alongside
`docs/spec/domains/`, tools refuse with:

> Legacy single-trunk layout detected. Run
> `scripts/migrate-spec-to-domains.ts` to migrate, or delete the legacy
> files if no longer needed.

If neither exists, tools assume fresh repo and operate normally.

## docs-skills/DES-1: Migration script

Rationale anchor: docs-skills/REQ-2

`scripts/migrate-spec-to-domains.ts`:

```ts
// 1. Refuse if domains/ already exists.
// 2. Read requirements.md + design.md.
// 3. Determine domain:
//    - from --domain=<d> arg
//    - else prompt user (default: repo basename)
// 4. Rewrite headings: '## REQ-N: ...' -> '## <d>/REQ-N: ...'
// 5. Rewrite anchors: 'Rationale anchor: REQ-N' stays bare (in-domain ok)
// 6. Write to docs/spec/domains/<d>/{requirements,design}.md
// 7. Move trace.md aside; regenerate via regenerateDomainTrace
// 8. Leave docs/spec/.migrated-to-domains marker
// 9. Print: 'Old files preserved as *.legacy; delete when satisfied.'
```

Idempotency: presence of `.migrated-to-domains` marker → no-op + exit 0.

## docs-skills/DES-2: Grill skill rewrite

Rationale anchor: docs-skills/REQ-1, docs-skills/REQ-3

The grill skill's "After both files exist" and "Delta workflow" sections
are replaced with:

- Section: "Domain spec vs job spec — when to use which"
- Section: "Domain naming discipline" (the reuse-first rule)
- Section: "Heading format" (qualified ids, anchor rules)
- Section: "Two-tier trace" (when each gets regenerated)

`src/agents/append-prompt.ts` SDD block gets the same conceptual update
in compressed form.

## spec-tooling/DES-7: Tests

Rationale anchor: spec-tooling/REQ-1, spec-tooling/REQ-4, spec-tooling/REQ-6

Parser tests: qualified heading parsing, mixed-domain delta parsing,
bare-anchor-with-domain-context resolution.

io.ts tests: regenerateDomainTrace, regenerateAllDomainTraces,
regenerateJobTrace, merge-distributes-by-prefix, archive-moves-job.

Hook tests: stale domain + stale job message format.

Migration tests: fresh repo no-op, legacy layout migrated, idempotent
re-run, refuses if domains/ already exists.
