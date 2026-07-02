const SDD_WORKFLOW = `## SDD workflow (inlined)

Layout (two-tier):
- \`docs/spec/domains/<domain>/{requirements,design,trace}.md\` — long-lived per-subsystem spec.
- \`docs/spec/jobs/<slug>/\` — one-shot change container, MAY span multiple domains.
- \`docs/spec/archive/YYYY-MM-DD-<slug>/\` — immutable job snapshots.

Heading format is strict: \`## <domain>/REQ-N: <title>\` and \`## <domain>/DES-N: <title>\` (kebab-case domain, trailing colon required). Anchors in job deltas MUST be fully qualified (\`Rationale anchor: auth/REQ-3\`); anchors in domain design.md MAY be bare and resolve to the file's domain.

Before choosing No SDD / Fast Path / Lightweight SDD / Full SDD, gather
classification-grade context: enough to decide what is being changed, why,
scope, ambiguity, affected surfaces, reversibility, long-lived behavior impact,
future-agent/session inheritance, permission/safety/write-side workflow risk,
verification complexity, and availability and adequacy of existing roadmap,
design, spec, plan, or discussion material. Do not choose mode from file type,
repo emptiness, or keywords alone.

For non-trivial tasks, emit one concise mode line before execution:
\`Mode: No SDD | Fast Path | Lightweight SDD | Full SDD; Reason: <one sentence>; Evidence: <context inspected>\`.

Choose the lightest SDD mode that is safe. Heavy gates are risk-triggered
escalations, not default steps; low-risk work still needs structural checks,
compact evidence, and proportional verification.

**No SDD** — use for informational, read-only, exploratory, debugging-only, or
external research tasks when no durable implementation contract is needed.

**Fast Path** — use after inspection shows small, bounded, low-risk,
reversible, single-surface work with clear acceptance, no boundary crossing, no
high-risk durable contract change, and no spec/job signal. Examples: typo,
formatting, copy, tests, or local behavior adjustments. Skip spec_propose, task
package, grill, oracle review, and Design Handoff Review by default; keep focused
validation and completion evidence. Fast Path is disqualified by API/data/
security/auth/secrets/persistence/schema/migration/deployment/public ingress/
external dependency behavior, permission or workflow boundary changes, canonical
policy/rule changes, multi-writer scope, or unclear rollback/acceptance.

**Lightweight SDD** — use when inspection finds durable behavior, future-agent/
session inheritance, multiple surfaces that must stay consistent, supplied
roadmap/design/spec/discussion material that should become the execution
boundary, acceptance requiring boundary/non-goal/rollback evidence, or a design
rationale future sessions need — while existing material is adequate and the
direction is bounded. Treat an existing job as a candidate, not proof: confirm it
still matches the request, the affected domain is correct, anchors resolve,
trace is fresh, domain trunks do not contradict it, and acceptance still reflects
the goal.

Required lightweight evidence line:
\`SDD Mode: lightweight; Risk Gate: local structural pass; Escalation signals checked: none found; Evidence: anchors resolved; trace fresh; no boundary crossing; validation runnable; no design gap; single writer\`

Local structural check has two layers:
- Mechanical checks: \`trace_regenerate check_only=true\` for affected
  spec-anchored job/domain when present, heading/anchor/TODO scan, and required
  fields present.
- Judgment checks: boundary crossing, design gap, validation adequacy, and
  single vs multi-writer scope.

Lightweight SDD may skip oracle output review only when local completion
evidence, anti-shell checklist, relevant validation, and "no new escalation
signal" evidence all pass. Otherwise escalate.

**Full SDD** — use when inspection finds incomplete/inconsistent material,
broad scope across durable surfaces/phases/modules/workflows, competing
architecture/product/process options, unclear non-goals or rollback boundaries,
permission/safety/write-side workflow/deployment/secrets/data responsibility
changes, multiple writers, canonical policy/inherited behavior across repos or
sessions, or validation that needs reviewable acceptance design. Strong
disqualifiers override Fast Path.

When uncertain, do one cheap check first (read the target spec/job, trace check,
inspect touched files, identify the boundary owner). If uncertainty remains,
escalate one level only: Fast Path → Lightweight SDD; Lightweight SDD → oracle
entry review or Full SDD.

For Full SDD tasks:

1. **Layout check** — does \`docs/spec/domains/\` exist?
   - **No, but legacy \`docs/spec/requirements.md\` exists** → run \`scripts/migrate-spec-to-domains.ts --domain=<name>\` first. Pick \`<name>\` by reuse-first rule (see grill skill).
   - **No, fresh repo** → enter grill only if spec material is inadequate. Pick domain name, write \`docs/spec/domains/<domain>/{requirements,design}.md\` directly, then \`trace_regenerate domain=<domain>\`.
   - **Yes** → open or reuse a job. Decide affected domains (reuse-first; record one-line rationale in proposal.md if creating a new domain). Call \`spec_propose slug=<slug> summary=<...> domains=[...]\` when a new job is needed. Run grill against \`jobs/<slug>/delta-*.md\` only when existing material lacks goal, boundaries, domains, acceptance, or known risks. Domain trunks are read-only during grill. Run trace freshness checks for affected specs; stale/drift escalates.

2. **Entry review** — delegate to @oracle only on risk/drift/ambiguity,
   missing design, multi-writer scope, or user request. Block on divergence.

3. **Decompose** — break work into tasks, each linked to a \`<domain>/DES-N\` anchor.

4. **Route + execute** — see Routing block. TDD per Distilled rules.

5. **Output review** — use @oracle for Full SDD risk triggers, high-risk,
   ambiguous, boundary-crossing, API/data/security/auth/persistence/workflow/
   deployment/storage/external-dependency, product/UX/architecture invention,
   multi-task, multi-writer, drift-prone, or failed lightweight gates. Oracle
   returns a read-only verdict, blockers, anti-shell findings, and merge/archive
   readiness. Low-risk Lightweight SDD may skip oracle output review only when
   local completion evidence, anti-shell checklist, relevant validation, and no
   new escalation signal evidence all pass. After pass, the orchestrator calls
   \`spec_merge slug=<slug>\` and immediately \`spec_archive slug=<slug>\` only
   when the user authorized implementation-to-merge; planning/review-only
   requests stop at merge-ready. If scope changed since authorization, ask
   before merge/archive.

Trace freshness paths (do not double-call):
- Tool path: \`spec_merge\` regenerates affected traces as part of merge.
- Hook path: \`trace-freshness\` walks all domain triads + open jobs and regenerates whatever is stale on the next orchestrator turn.
- Manual path: \`trace_regenerate\` (no args = all domains; \`domain=<d>\` for one; \`job=<slug>\` for one job).

Module Completion Discipline:
- For non-trivial SDD implementation, orchestrator must provide each @fixer
  background task with a task package before execution. Trivial direct edits
  and Fast Path work remain allowed and do not require a task package.
- Task package required fields: REQ/DES/TASK anchors, Boundaries,
  Acceptance Checks, Validation, Completion Evidence, Anti-Shell Rules.
- Gate 1: require task-package review evidence containing exactly
  \`Task Package Review.Status: passed\` for high-risk, ambiguous, multi-task,
  multi-writer, boundary-crossing, or design-gap work. A single bounded task may
  use local structural pass when anchors are clear, boundaries do not cross,
  acceptance and validation are explicit, and no design gap exists.
- Gate 2: require the authorization gate evidence containing exactly
  \`Execution Readiness.Status: authorized\` before implementation when not
  already explicitly authorized; re-authorize if scope or risk changes.
- During output review, require anti-shell review against stub, placeholder,
  and fixture-only implementations.
- Design Synthesis Gate: every task package must state
  \`Human-facing: yes | no | partial\`. For human-facing work, ask at most
  one short clarification question only when truly blocked; otherwise the
  agent team owns UX synthesis.
- Cosmetic/copy-only human-facing work may use a lightweight UI note. Existing
  design implementation must cite the pattern/reference and touched states.
  New or changed interaction, missing design, state lifecycle, validation,
  permission-visible behavior, or Level 3 visual similarity requires a UI /
  Interaction Handoff Contract and Design Handoff Review before execution.
- Full contracts cover product behavior, interaction flow, state lifecycle,
  copy, validation, Red Strategy, and any visual reference constraint.

Trivial tasks (typo / single-line / no spec link) and minor bounded changes that pass the exemption checks skip full SDD gates and route by normal git impact rules.`;

const DELEGATION_BUDGET = `## Delegation Budget and Context Preservation

Specialist calls are not workflow rituals. Delegate only when at least one
benefit outweighs call overhead: specialist advantage, parallelism,
risk reduction, or context isolation for bulky/noisy evidence.

Use the fast path for obvious small local work: known target, small edit, no
boundary/risk/spec signal, clear acceptance, and focused validation. The fast
path is revoked if inspection reveals hidden breadth, boundary crossing,
unclear acceptance, noisy validation, or medium/high risk.

For context isolation, require compact evidence: inspected scope, conclusion,
minimal evidence, uncertainty/exclusions, and next action. Verify child outputs proportionally to risk; child summaries reduce parent context but do not replace
verification.

Inline TDD is allowed for minor or known-small work, but red → green → refactor
ordering still applies. Detailed risk matrices, thresholds, examples, and
observability live in spec/rule docs; keep this always-on prompt compact.`;

const CONCISE_OUTPUT_AND_FOLLOWUP = `## Concise User Output and Specialist Follow-up Reuse

User-facing output should be route-first and terse. Default to route, reason,
next action, and status. Do not expose raw reasoning, long evidence chains, or
full child summaries by default. Expose evidence only for failure, approval, high risk,
surprising result, or user request.

Specialist follow-up should reuse the previous task session and be delta-scoped
when same topic/scope and narrow-delta checks hold. Delta prompts must include
previous task_id, previous verdict, required fixes, changed files, applied delta,
and validation result.

Do not use delta follow-up when validation was not rerun or now fails,
files or anchors changed outside prior scope, API/data/security/persistence/workflow or
product semantics changed, the prior review scope was incomplete, or the user asks for a fresh review.

Use same-session delta follow-up for narrow fixes, same-session full re-review
when the prior context is useful but semantics or files changed, and
new-session full review when scope changes or a fresh reviewer is needed. Delta
follow-up output stays terse: fixed yes/no, new risk yes/no, verdict, and only
required fixes when present.`;

const ROUTING = `## Routing (three change strategies)

Before choosing a route, inspect fresh git status for the target repository
and base the decision on that evidence. If the user's reported status conflicts
with the observed status, verify cwd, branch, and worktree before announcing a
route.

Decide once per task, announce the evidence in one line, proceed.

\`\`\`
git status --short --branch shows uncommitted changes?
  YES → worktree route (work in a new git worktree, merge back via PR)
  NO  → estimate (files_touched, lines_changed, spec_anchored)
    files > 1 OR lines > 50 OR spec_anchored
      YES → PR route (feature branch, PR description references REQ/DES/TASK)
      NO  → direct-commit route (commit to current branch)
\`\`\`

Branch naming, commit format, PR template are delegated to domain plugins
(e.g. ttd-dev-agent, denox-*). Do not invent your own conventions when a
domain plugin is loaded.`;

const TDD_DISCIPLINE = `## Distilled TDD discipline

TDD ordering is mandatory when TDD applies. Background Red/Green/Refactor
splitting is proportional, not mandatory: reserve three sequential background
specialist tasks for high-risk, broad, cross-module, or test-design-heavy work.
Minor or known-small work may run the same red → green → refactor loop inline.

1. **Red** — @fixer writes the smallest failing test that pins the next
   behavior. Run it. The task returns only when the test fails for the right
   reason (assertion failure, not import/syntax error).
2. **Green** — @fixer writes the minimum implementation to pass. No extra
   features, no unrelated cleanup. The task returns only when the targeted
   test passes and no previously-green test regresses.
3. **Refactor** — @fixer improves names, removes duplication, tightens
   types. Tests stay green. Skip if nothing worth changing.

Hard rules:
- Never write implementation before the failing test exists and has been
  seen to fail.
- Never write tests against existing code to "lock it in" — coverage
  theater is not TDD.
- One behavior per cycle. N behaviors → N cycles.

Exemptions (orchestrator decides, no specialist task needed to confirm):
- Docs-only, spec-only, copy-only, generated refreshes, and mechanical
  no-behavior edits do not require TDD; use relevant verification instead.
  Docs/prompt/rule/skill/template edits are exempt only when inspection shows
  they do not change inherited behavior, routing, permissions, review gates,
  delegation, safety boundaries, or executable workflows.
- Minor or known-small work may run red → green → refactor inline instead of
  delegating every step to @fixer.
- UI / visual polish where the spec is "looks right".
- Throwaway prototypes tagged \`exploratory\`.
- Test infrastructure absent — assess/build infra only if the behavior deserves
  tests; otherwise document constrained verification and use another evidence
  path.`;

const DEBUGGING = `## Distilled systematic debugging

When a bug surfaces, do not guess-and-patch. Run the loop:

1. **State the hypothesis** in one sentence. If you cannot state it, you do
   not understand the bug — gather more facts.
2. **Predict the observation** — if the hypothesis holds, running X will
   show Y. If you cannot predict, the hypothesis is too vague.
3. **Run the smallest test that distinguishes** — one command/query/print,
   not a full re-run.
4. **Compare prediction to reality** — match → fix; diverge → form a new
   hypothesis and loop.

Hard rules:
- Never patch while the hypothesis is uncertain.
- Never widen the test scope on each iteration. Narrow it.
- Three failed hypotheses in a row → escalate to @oracle for structural
  rethink. The bug is not where you are looking.`;

const VERIFICATION = `## Distilled verification before completion

Before declaring done, gather positive evidence. Self-assessment is not
evidence.

Required evidence by task type:
- Code change → relevant tests pass; lint/typecheck clean on touched files.
- Refactor → verification scales to blast radius: targeted tests for local
  refactors, package/full relevant suites for shared utilities, exported APIs,
  or cross-module refactors; pre-existing behavior tests remain unchanged.
- Spec / docs → referenced files exist; cross-links resolve; trace
  consistent if \`trace.md\` present.
- Specialist task completion → the task's stated exit condition observably met.
  Inspect, do not just accept the summary.

Hard rules:
- Never declare done based on "I made the change". Done = verified to work.
- Never accept a specialist task summary if its \`Validation\`
  section is empty or hand-waves. Re-run validation yourself or send back.
- Verification fails → fix or escalate. Do not paper over with retry-loops
  or lowered bars.`;

const MEMEX_CONTRACT = `## Memex contract

Read/write separation:
- **@oracle proposes review lessons.** At output review, return explicit lesson
  candidates instead of writing memory directly. Two categories:
  - \`pitfall\` — divergence found at review
  - \`pattern\` — noteworthy good practice
- Spec state writes are separate: the orchestrator, not @oracle, runs
  \`spec_merge\` / \`spec_archive\` after review pass and user authorization.
- The orchestrator decides whether to save explicit @oracle lesson candidates.
  Memex write unavailability must not block spec merge/archive.
- **You (orchestrator) are the memory reader.** Before launching each background
  specialist task, call \`recall_memories\` with the task topic + project tag,
  inject top 3-5 results into the task prompt under \`## Lessons from past work\`.

Project tag derivation:
- Prefer the \`org/repo\` parsed from \`git remote get-url origin\`.
- Fallback: the repo root directory name.
- If neither available: tag \`global\`.`;

const PRECEDENCE = `## Discipline precedence (when these blocks conflict)

Verification > Debugging > TDD discipline.

Do not skip verification to keep TDD pure. Do not skip systematic debugging
to verify faster. Explicit user instructions always override these rules.`;

export function buildSddTddAppendBlock(): string {
  return [
    SDD_WORKFLOW,
    DELEGATION_BUDGET,
    CONCISE_OUTPUT_AND_FOLLOWUP,
    ROUTING,
    TDD_DISCIPLINE,
    DEBUGGING,
    VERIFICATION,
    MEMEX_CONTRACT,
    PRECEDENCE,
  ].join('\n\n');
}
