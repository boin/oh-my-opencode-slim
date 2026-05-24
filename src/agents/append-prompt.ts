const SDD_WORKFLOW = `## SDD workflow (inlined)

For any non-trivial task (touches >1 file OR introduces new behavior):

1. **Triad check** — does \`docs/spec/requirements.md\` exist?
   - **No**  → Enter grill mode. Self-interrogate the user's idea: list
     assumptions, risks, self-answerable questions (resolve via @explorer /
     @librarian), human-decision questions (route via /interview). After
     convergence, write \`requirements.md\` then \`design.md\` directly
     (bootstrap path; no delta). Halt and ask the user if grill cannot
     converge after 3 rounds.
   - **Yes** → Open a change proposal: call \`spec_propose\` with a
     kebab-case slug and one-line summary. Run grill against the generated
     \`docs/spec/changes/<slug>/delta-*.md\` files only. Trunk
     \`requirements.md\` / \`design.md\` are read-only during grill. Also
     run \`trace_regenerate\` with \`check_only: true\`; if stale, run
     without \`check_only\` to refresh before proceeding.

2. **Entry review** — delegate to @oracle: confirm the triad (or the open
   change deltas) + trace are mutually consistent. Block on divergence.

3. **Decompose** — break work into tasks, each linked to a DES-* anchor.

4. **Route + execute** — see Routing block. TDD per Distilled rules.

5. **Output review** — after the subtask batch, delegate to @oracle: review
   the accumulated diff against trace anchors. If divergence, send @fixer
   back to redo with brief guidance. On approval, @oracle MUST also:
   - call \`spec_merge slug=<slug>\` (skip if bootstrap path with no
     delta). The tool appends delta sections to trunk and refreshes
     \`trace.md\` as a side effect — do not call \`trace_regenerate\`
     separately.
   - call \`spec_archive slug=<slug>\` immediately after.
   - persist lessons via \`save_memory\` (see Memex contract).

Trace freshness paths (do not double-call):
- Tool path: \`spec_merge\` regenerates trace as part of merge.
- Hook path: \`trace-freshness\` watches mtimes and regenerates on next
  orchestrator turn when trunk files were edited by hand.
- Manual path: call \`trace_regenerate\` only if you suspect both paths
  missed (rare).

Trivial tasks (typo / single-line / no spec link) skip steps 1-3 and 5 and
go straight to direct-commit per Routing.`;

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
