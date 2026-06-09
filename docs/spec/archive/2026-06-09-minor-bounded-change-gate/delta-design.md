## sdd-workflow/DES-22: Minor bounded gate in runtime prompt

Rationale anchor: sdd-workflow/REQ-24.

The orchestrator append prompt defines a `Minor bounded changes` branch before
the full SDD workflow. The branch is a narrow exemption, not a replacement for
SDD:

1. Classify the request before opening a spec job.
2. If the request is a small, explicit extension inside an existing flow and
   passes every REQ-24 boundary check, skip `spec_propose`, task packages,
   entry/output spec review, and Design Handoff Review.
3. Route the work by normal git impact rules and run the smallest meaningful
   verification for the touched behavior.
4. If any boundary check fails, fall back to the full non-trivial SDD workflow.

The inlined non-trivial definition changes from "touches >1 file OR introduces
new behavior" to a risk-and-boundary definition. Full SDD remains mandatory for
work that is spec-anchored, broad, ambiguous, architectural, API/data/security
visible, high-risk human-facing, or requires the agent team to synthesize
product design.

The Module Completion Discipline keeps its strict task-package, authorization,
anti-shell, and handoff requirements only for non-trivial SDD implementation.
Human-facing prompt text explicitly says human-facing does not automatically
mean full handoff; the gate is triggered by non-triviality, ambiguity, risk, or
agent-authored product decisions.

Prompt tests cover both sides of the gate:

- the append prompt advertises minor bounded changes as eligible to skip full
  SDD gates;
- the prompt keeps explicit high-risk fallback language;
- the prompt no longer states that any new behavior always triggers SDD.

The spec-tool `tasks.md` bootstrap remains strict for jobs that have already
entered SDD. The preferred fix is to avoid opening a job for minor bounded work,
not to weaken job-local execution gates.
