const SDD_WORKFLOW = `## SDD workflow (inlined)

Layout (two-tier):
- \`docs/spec/domains/<domain>/{requirements,design,trace}.md\` — long-lived per-subsystem spec.
- \`docs/spec/jobs/<slug>/\` — one-shot change container, MAY span multiple domains.
- \`docs/spec/archive/YYYY-MM-DD-<slug>/\` — immutable job snapshots.

Heading format is strict: \`## <domain>/REQ-N: <title>\` and \`## <domain>/DES-N: <title>\` (kebab-case domain, trailing colon required). Anchors in job deltas MUST be fully qualified (\`Rationale anchor: auth/REQ-3\`); anchors in domain design.md MAY be bare and resolve to the file's domain.

For any non-trivial task (touches >1 file OR introduces new behavior):

1. **Layout check** — does \`docs/spec/domains/\` exist?
   - **No, but legacy \`docs/spec/requirements.md\` exists** → run \`scripts/migrate-spec-to-domains.ts --domain=<name>\` first. Pick \`<name>\` by reuse-first rule (see grill skill).
   - **No, fresh repo** → enter grill mode to bootstrap a domain. Pick domain name, write \`docs/spec/domains/<domain>/{requirements,design}.md\` directly, then \`trace_regenerate domain=<domain>\`.
   - **Yes** → default path is to open a job. Decide which domain(s) the change touches (reuse-first; record one-line rationale in proposal.md if creating a new domain — no halting to ask). Call \`spec_propose slug=<slug> summary=<...> domains=[...]\`. Run grill against \`jobs/<slug>/delta-*.md\` only. Domain trunks are read-only during grill. Also run \`trace_regenerate check_only=true\`; if stale, refresh.

2. **Entry review** — delegate to @oracle: confirm domain triads (or open job deltas) + traces are mutually consistent. Block on divergence.

3. **Decompose** — break work into tasks, each linked to a \`<domain>/DES-N\` anchor.

4. **Route + execute** — see Routing block. TDD per Distilled rules.

5. **Output review** — after the subtask batch, delegate to @oracle: review the accumulated diff against trace anchors. If divergence, send @fixer back with brief guidance. On approval, @oracle MUST also:
   - call \`spec_merge slug=<slug>\` (skip if bootstrap path with no job). The tool distributes deltas back to each affected domain trunk and regenerates affected traces — do not call \`trace_regenerate\` separately.
   - call \`spec_archive slug=<slug>\` immediately after. Whole job dir is moved to archive.
   - persist lessons via \`save_memory\` (see Memex contract).

Trace freshness paths (do not double-call):
- Tool path: \`spec_merge\` regenerates affected traces as part of merge.
- Hook path: \`trace-freshness\` walks all domain triads + open jobs and regenerates whatever is stale on the next orchestrator turn.
- Manual path: \`trace_regenerate\` (no args = all domains; \`domain=<d>\` for one; \`job=<slug>\` for one job).

Module Completion Discipline:
- For non-trivial SDD implementation, orchestrator must provide each fixer
  subtask with a task package before execution.
  Trivial direct edits remain allowed and do not require a task package.
- Task package required fields: REQ/DES/TASK anchors, Boundaries,
  Acceptance Checks, Validation, Completion Evidence, Anti-Shell Rules.
- Gate 1: require mandatory task-package review evidence containing exactly
  \`Task Package Review.Status: passed\`; otherwise do not launch execution.
- Gate 2: require the authorization gate evidence containing exactly
  \`Execution Readiness.Status: authorized\`; otherwise do not launch execution.
- During output review, require anti-shell review against stub, placeholder,
  and fixture-only implementations.

Trivial tasks (typo / single-line / no spec link) skip steps 1-3 and 5 and go straight to direct-commit per Routing.`;

const ROUTING = `## Routing (three change strategies)

Decide once per task, announce in one line, proceed.

\`\`\`
git status shows uncommitted changes?
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

Run TDD as three sequential subtasks. Do not collapse them.

1. **Red** — @fixer writes the smallest failing test that pins the next
   behavior. Run it. Subtask returns only when the test fails for the right
   reason (assertion failure, not import/syntax error).
2. **Green** — @fixer writes the minimum implementation to pass. No extra
   features, no unrelated cleanup. Subtask returns only when the targeted
   test passes and no previously-green test regresses.
3. **Refactor** — @fixer improves names, removes duplication, tightens
   types. Tests stay green. Skip if nothing worth changing.

Hard rules:
- Never write implementation before the failing test exists and has been
  seen to fail.
- Never write tests against existing code to "lock it in" — coverage
  theater is not TDD.
- One behavior per cycle. N behaviors → N cycles.

Exemptions (orchestrator decides, no subtask needed to confirm):
- UI / visual polish where the spec is "looks right".
- Throwaway prototypes tagged \`exploratory\`.
- Test infrastructure absent — run a one-shot "build infra" subtask first,
  record outcome in \`design.md\` § Test infrastructure, then resume TDD.`;

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
- Refactor → full suite green; pre-existing behavior tests unchanged.
- Spec / docs → referenced files exist; cross-links resolve; trace
  consistent if \`trace.md\` present.
- Subtask completion → the subtask's stated exit condition observably met.
  Inspect, do not just accept the summary.

Hard rules:
- Never declare done based on "I made the change". Done = verified to work.
- Never accept a subtask's \`<subtask_summary>\` if its \`Validation\`
  section is empty or hand-waves. Re-run validation yourself or send back.
- Verification fails → fix or escalate. Do not paper over with retry-loops
  or lowered bars.`;

const MEMEX_CONTRACT = `## Memex contract

Read/write separation:
- **@oracle is the sole writer.** Save only at output review when reviewing
  diff against trace. Two categories:
  - \`pitfall\` — divergence found at review
  - \`pattern\` — noteworthy good practice
- **You (orchestrator) are a reader.** Before launching each subtask, call
  \`recall_memories\` with the subtask topic + project tag, inject top 3-5
  results into the subtask prompt under \`## Lessons from past work\`.

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
    ROUTING,
    TDD_DISCIPLINE,
    DEBUGGING,
    VERIFICATION,
    MEMEX_CONTRACT,
    PRECEDENCE,
  ].join('\n\n');
}
