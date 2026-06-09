## sdd-workflow/REQ-24: Minor bounded change exemption

The SDD workflow MUST distinguish full non-trivial work from minor bounded
changes. A change MAY skip `spec_propose`, job-local task packages, and Design
Handoff Review when all of the following are true:

- it is a small extension or repair inside an existing screen, flow, command,
  or action;
- the user's desired outcome is explicit enough that the agent does not need to
  invent product direction, information architecture, interaction semantics, or
  copy meaning;
- it does not introduce a new page, navigation path, role flow, independent
  workflow, service, storage boundary, or API route;
- it does not change authentication, authorization, billing, privacy,
  compliance, data ownership, irreversible side effects, or other security
  boundaries;
- it does not add persistent schema, data migration, shared prompt/template
  state, or cross-user configuration;
- any API or action change is backward-compatible and limited to an optional
  parameter on an existing path;
- failure, cancel, retry, empty input, and unchanged-input behavior are obvious
  from the existing flow or stated by the user;
- the estimated implementation remains in one cohesive area with a clear,
  narrow validation path.

Minor bounded changes remain subject to normal implementation verification.
They MUST still run the smallest relevant test, typecheck, lint, component
interaction check, or smoke procedure that proves the intended behavior and
protects the old path from regression.

The exemption MUST NOT apply when a change is spec-anchored, derived from an
open SDD job, ambiguous in product behavior, high-risk human-facing, crosses
UI/API/service/storage boundaries, changes durable data semantics, or requires
write-capable delegation for broad implementation work.

Human-facing status alone MUST NOT force a full Design Handoff Review. The
handoff gate is mandatory for non-trivial, ambiguous, high-risk, or
agent-designed human-facing work, but a clearly bounded minor UI extension may
use direct execution with explicit acceptance checks.
