## sdd-workflow/REQ-30: Docs-aware grill shared language and decisions

The `grill` workflow MUST operate in docs-aware mode whenever it is run against
an existing codebase or SDD repository. Docs-aware mode means the workflow reads
the smallest relevant shared-context material before interrogating a request,
uses that material to detect unclear or inconsistent terminology, and persists
durable terminology or decision context after convergence.

Before asking human-decision questions or writing `REQ` / `DES` output, `grill`
MUST look for shared language and decision context in this order:

1. `docs/spec/context.md`
2. `docs/spec/domains/<domain>/glossary.md` for affected domains
3. root `context.md`
4. `docs/adr/` or `docs/spec/adr/` indexes and decision records when present

Missing context files MUST NOT block grill. Instead, `grill` records a short
context-doc assumption and continues. If convergence introduces a durable domain
term, abbreviation, workflow phrase, or naming distinction that future agents or
maintainers would need, the workflow MUST update the relevant shared language
document or create the smallest appropriate one.

The shared language update MUST be selective. One-off phrasing, obvious generic
programming terms, and speculative names MUST NOT be persisted. Durable entries
SHOULD include the canonical term, definition, aliases or rejected alternatives
when useful, and where the term is used in specs, code, or user-facing docs.

The workflow MUST also identify ADR-worthy decisions during convergence. A
decision is ADR-worthy when it is high-impact, difficult to reverse, non-obvious
from the final code, or represents a meaningful trade-off across architecture,
data, API, security, deployment, workflow, or cross-domain boundaries. ADR-worthy
decisions MUST be recorded in a Markdown ADR under `docs/spec/adr/` by default,
or `docs/adr/` when that convention already exists, and linked from the relevant
design section.

User approval phrases such as "方案没有问题了，可以开始实现了" or "go ahead" are
implementation authorization signals, not automatic SDD-start signals. If an
adequate SDD job or spec already exists, the workflow proceeds to execution
gates. If the change is non-trivial and lacks adequate spec material, `grill`
opens or completes a spec job before implementation unless the user explicitly
skips SDD. Minor bounded changes remain eligible for the existing SDD exemption.
