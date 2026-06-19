# grill skill

Docs-aware self-interrogation workflow that turns a vague user request into a
defensible SDD requirements + design pair, with external-dependency
double-checking, shared terminology maintenance, and ADR-worthy decision capture
baked in.

Installed automatically by `oh-my-opencode-slim` for the `orchestrator` agent.
The orchestrator uses `grill` as the SDD entrypoint for non-trivial codebase
changes that need requirements/design convergence. In SDD repos, it writes to
the domain + job two-tier layout under `docs/spec/`.

See `SKILL.md` for the context docs pass, four-phase workflow, convergence
rules, terminology delta, ADR discipline, and output format.
