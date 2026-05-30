## sdd-workflow/REQ-23: Design handoff required for human-facing executable tasks

For non-trivial SDD execution, any task that is UI-facing,
human-facing, or unclear in product design MUST NOT become
fixer-executable until it has a reviewed UI / Interaction Handoff
Contract.

A task is human-facing when its observable behavior includes any
user-visible UI, CLI output, report, notification, error message, copy,
interactive workflow, or surface a person must read, operate, or trust.

If the user does not provide a PRD, interaction specification, UI
design, or usable reference product, the orchestrator MUST ask one
minimal clarification question for design direction. If the user has no
preference or provides no usable guidance, the agent team owns UX
synthesis through the ownership ladder defined in
`sdd-workflow/DES-21`.

The handoff contract MUST be sufficient for `@fixer` to implement
without inventing:

- product behavior,
- interaction flow,
- information hierarchy,
- visual hierarchy,
- state lifecycle,
- error recovery,
- copy semantics,
- API / data / state assumptions,
- acceptance checks,
- or validation strategy.

The acceptance bar is human-deliverable quality, not mere existence of a
functional path. Shell UI, fake controls, static placeholder-only
surfaces, missing state closure, missing error recovery, unclear data
wiring, or absent verification paths are not acceptable final outputs.

The default minimum human-deliverable UI baseline is:

- the primary path is understandable and completable,
- relevant empty / loading / pending / success / error / retry states are
  specified,
- errors explain recovery,
- information hierarchy distinguishes primary action, secondary action,
  content, result, and risk,
- existing project design system, components, spacing, colors, and
  interaction habits are reused unless a new direction is explicitly
  authorized,
- desktop and narrow-screen layouts do not collapse into unusable output,
- basic accessibility is specified for labels, keyboard path, focus,
  disabled state, and error announcement,
- user-facing copy is usable rather than placeholder text,
- UI is connected to real state, actions, API, or a clearly labelled
  demo-only path,
- and a verification path exists.

The handoff contract MUST include a Red Strategy. Screenshot
verification is optional and SHOULD be used only when visual regression
is a material risk. DOM, semantic, component interaction, flow, and
accessibility checks are preferred by default.

Reference product usage MUST be declared as one of:

- **Level 1 Inspired**: pattern, mental-model, or workflow inspiration
  only; visual expression remains clearly original.
- **Level 2 Close Reference**: the default meaning of "reference X";
  layout family, module organization, density, and interaction grammar
  may be similar, but exact expression must differ and project-local
  tokens, components, terminology, and copy are used.
- **Level 3 High-Similarity Reference**: requires explicit user request
  and must be escalated before implementation.

At all reference levels, copying logos, brand assets, proprietary icons,
exact copy, source code, CSS, DOM structure, distinctive trade dress, or
any expression that misleads users about origin or affiliation is
prohibited.
