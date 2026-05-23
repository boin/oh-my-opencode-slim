# grill skill

Self-interrogation workflow that turns a vague user request into a defensible
SDD requirements + design pair, with external-dependency double-checking
baked in.

Installed automatically by `oh-my-opencode-slim` for the `orchestrator` agent.
The orchestrator triggers `grill` at SDD step 1 when `docs/spec/requirements.md`
does not yet exist.

See `SKILL.md` for the four-phase workflow, convergence rules, and output
format. See `docs/spec/design.md` § DES-005 for the design rationale.
