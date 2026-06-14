## sdd-workflow/REQ-27: Domain triad invariant enforcement

Normal SDD tooling MUST treat an existing domain directory that lacks
`requirements.md` or `design.md` as an invalid spec state, not as a normal
domain and not as an implicit bootstrap case.

The generic tools MUST keep these paths separate:

- **Normal calls** (`trace_regenerate`, trace freshness, `spec_merge`, and
  `spec_propose` referencing an existing domain) fail fast with an actionable
  incomplete-domain error when required source files are missing.
- **Bootstrap calls** (`spec_propose` referencing a domain directory that does
  not exist) may initialize a complete domain triad after validating the domain
  name.
- **Compatibility / repair calls** may create missing source files only when
  the user explicitly invokes a repair or migration path. Normal trace/spec
  calls MUST NOT fabricate source specs.

Incomplete-domain diagnostics MUST list the missing files and identify the
domain path so users can distinguish a wrong `spec_dir`, a partial migration,
or a locally corrupted domain directory.
