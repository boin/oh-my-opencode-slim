# Job: spec-domain-job-scope

**Status**: drafting (pre-implementation)
**Created**: 2026-05-24
**Branch**: `feat/spec-domain-job-scope`

## Why

The current SDD layout assumes one `docs/spec/{requirements,design,trace}.md`
trunk per repository, with a single REQ/DES id namespace. That assumption
breaks down in three cases:

1. **Multi-domain repos.** `REQ-1 auth flow` and `REQ-2 payment flow` in
   the same trunk lose context — readers can't tell which subsystem owns
   which requirement.
2. **Cross-cutting changes.** A single change can touch multiple subsystems;
   today the change-proposal layer can express that, but the trunk has no
   way to attribute REQs back to their owning subsystem after merge.
3. **Reuse / archival lookup.** After `spec_merge`, the change is archived
   as a delta but trunk is one flat list. Asking "what's the current spec
   for the auth subsystem?" requires manual grep.

## Scope

This job restructures `docs/spec/` to support:

- **Domain spec** — long-lived, per-subsystem requirements + design.
  Stable id namespace `<domain>/REQ-N`.
- **Job spec** — one-shot change proposal that MAY span multiple domains.
  On merge, deltas distribute back to the affected domain spec; the job
  itself archives.
- **Two-tier trace** — one trace per domain (long-lived view) + one trace
  per job (cross-domain view for a single change).

Out of scope:

- Schema/config for declaring valid domains. Domain names stay free-form
  kebab-case; reuse-vs-new is an agent behavior rule, not a tool check.
- Backward compatibility for the old single-trunk layout. This is the
  sole user's only consumer; we migrate hard, no dual-mode code.

## Audience and tone

Spec files in this repo are agent-only artifacts. No human-readable
preamble, no apologies, no "let me explain". Compact, declarative,
machine-parseable. If a rule lives here, it's because an agent needs to
follow it; if no agent needs it, delete it.

Implication for agent behavior: when a domain decision is made (reuse
existing or create new), the choice is recorded in one line and the
agent keeps going — no halt to ask the user, no status report.

## Affected domains

This job itself touches three internal domains of the slim plugin:

- `spec-tooling` (parser, spec_propose/merge/archive, trace_regenerate)
- `hooks` (trace-freshness)
- `docs-skills` (grill SKILL.md, append-prompt SDD section, README)

See `delta-requirements.md` and `delta-design.md` for per-domain
breakdown.

## Migration

A one-shot script reads existing `docs/spec/{requirements,design}.md`,
infers a default domain name from repo context (or prompts the user), and
moves content under `docs/spec/domains/<inferred>/`. The script is run
once per consumer repo, not part of the plugin runtime.

## Release

- Bump to `1.2.0` (minor, despite layout change — sole user, no
  back-compat owed).
- Changelog calls out the layout shift and points at the migration script.
- No deprecation period.
