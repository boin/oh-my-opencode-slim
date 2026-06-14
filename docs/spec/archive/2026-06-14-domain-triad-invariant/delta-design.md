## sdd-workflow/DES-25: Explicit domain triad validation

Rationale anchor: sdd-workflow/REQ-27.

Add a shared domain-triad inspection helper for spec and trace tooling. The
helper distinguishes three states:

- `missing`: the domain directory does not exist.
- `complete`: the directory exists and contains both `requirements.md` and
  `design.md`.
- `incomplete`: the directory exists but one or more required source files are
  missing.

Use the helper as follows:

- `spec_propose` keeps the existing bootstrap behavior for `missing` domains:
  validate the kebab-case domain name, create `requirements.md` and
  `design.md`, then regenerate `trace.md`.
- `spec_propose` rejects `incomplete` domains with the shared diagnostic before
  allocating IDs or writing the job.
- `spec_merge` rejects referenced `incomplete` domains before collision checks
  or append writes.
- `trace_regenerate` rejects `incomplete` domains with the same diagnostic and
  never creates missing source files.
- trace freshness may catch the error for reminder output, but the failure text
  must preserve the incomplete-domain diagnostic.

Tests cover complete domains, newly bootstrapped domains, incomplete domains
missing `requirements.md`, incomplete domains missing `design.md`, and merge /
trace failure paths. No repair mode is introduced in this change; future repair
or migration commands must be explicit and non-overwriting.
