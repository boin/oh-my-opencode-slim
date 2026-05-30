## sdd-workflow/DES-21: Triggered design synthesis and handoff review gate

Rationale anchor: sdd-workflow/REQ-23.

Extend the Module Completion Discipline with a triggered Design
Synthesis Gate for human-facing or product-unclear tasks. This gate
complements Task Package Review; it does not replace the existing
anchors, boundaries, acceptance checks, validation, completion evidence,
or anti-shell requirements.

### Trigger probe

Each job-local task MUST declare:

```markdown
Human-facing: yes | no | partial
```

The gate is triggered when the task changes or introduces user-visible
UI, CLI output, reports, notifications, errors, copy, interactive flows,
or any workflow a person reads, operates, or trusts.

Pure backend work, internal refactors, implementation-only fixes with
complete existing product guidance, and non-user-visible changes MAY set
`Human-facing: no` and skip this gate.

### Clarification rule

When a plausibly human-facing task has no PRD, UI design, interaction
notes, or usable reference, the orchestrator asks one short clarification
question for design direction.

If the user has no preference or provides no usable guidance, the job
records that the agent team owns UX synthesis and proceeds to design
synthesis.

### Ownership ladder

Default path:

- `@designer` authors the UI / Interaction Handoff Contract.
- `@designer` works contract-first.
- Design Handoff Review must pass before `@fixer` implementation.

Escalate to `@council` before `@designer` authors the contract when the
task involves:

- high-risk user-facing surface,
- multiple connected screens,
- multi-role workflow,
- sensitive-data UX,
- Level 3 reference,
- major brand-impact decision,
- broad information-architecture change,
- or repeated Design Handoff Review failure.

`@council` decides direction, risks, and trade-offs; it does not replace
`@designer` as the author of the concrete handoff contract.

`@orchestrator` may repair structural gaps only:

- headings,
- anchors,
- status,
- formatting,
- missing required section labels,
- trace or task mapping format.

`@orchestrator` MUST NOT invent product behavior, state lifecycle,
visual hierarchy, interaction semantics, copy semantics, or validation
strategy for a human-facing task.

When repairing missing required section labels, `@orchestrator` may add
empty headings or move already-authored content under the right heading,
but MUST NOT author the section bodies for human-facing handoff
contracts.

### Designer direct-code exception

`@designer` MAY directly edit code only for visual polish, responsive
micro-adjustment, spacing, color, typography, or existing component style
completion, and only when the change does not alter API, data, state
shape, business behavior, or interaction semantics.

All other UI work uses contract-first handoff.

### UI / Interaction Handoff Contract

For human-facing tasks, `tasks.md` MUST include either the full handoff
contract or a pointer to `docs/spec/jobs/<slug>/design/<task-id>.md`.

The contract MUST cover:

- context and user goal,
- primary path,
- state completeness,
- error recovery,
- information hierarchy,
- interaction model,
- existing design consistency,
- responsive minimum,
- accessibility baseline,
- copy / content,
- data and API assumptions,
- implementation boundaries,
- element-to-system mapping,
- out-of-scope constraints,
- design assumptions,
- and Red Strategy.

Complex multi-page UI MAY move detailed content into job-local `design/`
files. `tasks.md` remains the index and required-reading entry point.

Recommended layout for complex UI:

```text
docs/spec/jobs/<slug>/design/
  overview.md
  flows.md
  screens/
    <screen>.md
  states.md
  references.md
  test-strategy.md
```

### Reference policy

Reference product usage is recorded in the handoff contract as Level 1,
Level 2, or Level 3 per `sdd-workflow/REQ-23`.

Level 2 is the default interpretation of "reference X". Level 3 requires
explicit user request and escalation before implementation. All levels
must avoid copying protected brand expression, source, CSS, DOM, exact
copy, or distinctive trade dress.

### Red Strategy

Every UI / Interaction Handoff Contract MUST include a Red Strategy that
states which test layer proves the core interaction before
implementation.

Default preference order:

1. DOM / semantic contract,
2. component interaction,
3. flow or browser automation,
4. accessibility checks,
5. screenshot / visual regression only when visual stability is a
   material risk.

Screenshot tests are visual guards, not the default proof of behavior.
Material visual risk includes brand-critical surfaces, marketing or
landing pages, pixel-sensitive dashboards, charts or layouts where
position encodes meaning, and any flow where visual regression can hide
the primary action. Otherwise, screenshot use is left to `@designer`
judgment with `@oracle` veto during review.

### Design Handoff Review

Design Handoff Review is a named sub-step of Task Package Review.

It checks both fixer-executable sufficiency and human-deliverable
quality.

Fixer-executable sufficiency means `@fixer` does not need to invent:

- product behavior,
- interaction flow,
- state machine,
- API or data assumptions,
- copy semantics,
- visual hierarchy,
- or validation strategy.

Human-deliverable quality means:

- the user goal and primary path are understandable,
- all relevant states are covered,
- error recovery is specified,
- information hierarchy is intentional,
- responsive and accessibility baselines exist,
- references are declared safely,
- no shell UI remains,
- and the Red Strategy is realistic.

Review result:

```markdown
### Design Handoff Review

Status: pending | passed | pass-with-notes | failed | not-applicable
Reviewer:
Reviewed at:
Routing on failure: @designer | @orchestrator | @council | user
```

`pass-with-notes` is allowed only for non-blocking improvements. It is
invalid when core interaction, state lifecycle, API/data assumptions,
copy semantics, or validation strategy remain undefined.

Failure routing:

- default: return to `@designer`,
- return to `@orchestrator` only for structural task-package defects,
- escalate to `@council` for high-risk ambiguity, Level 3 reference,
  repeated failure, sensitive-data UX, or broad product-pattern conflict,
- ask the user only for business conflict, brand-impact choice, costly
  scope expansion, risk/compliance decision, Level 3 reference approval,
  or sensitive-data policy decision.

Task Package Review cannot be passed while any human-facing task lacks a
passing Design Handoff Review.

### Fixer refusal rule

`@fixer` MUST refuse a human-facing task if the handoff contract is
missing, incomplete, or not reviewed.

`@fixer` MUST stop and report blocked if implementation reveals undefined
product behavior, interaction flow, state lifecycle, API/data
assumptions, copy semantics, or validation strategy.
