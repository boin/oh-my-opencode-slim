# Design: SDD + TDD + Grill Enhancement for slim

Source: derived from `requirements.md` (REQ-001..REQ-013).
Scope: fork-local changes to `oh-my-opencode-slim`. No upstream PR planned at
this stage (self-use trial per REQ-013).

This document covers HOW. WHY lives in `requirements.md`.

---

## sdd-workflow/DES-001: Repository layout for SDD artifacts

Target projects (the projects this fork is *used on*) place SDD artifacts in:

```
<project-root>/docs/spec/
  requirements.md
  design.md
  trace.md
```

This fork itself dogfoods the layout. See current `docs/spec/` contents.

Rationale anchor: REQ-002.

---

## sdd-workflow/DES-002: Distilled rules location

`docs/spec/distilled-rules.md` (this fork) holds the canonical text of the
inlined discipline rules. The text is loaded at build time and injected into
the orchestrator prompt via `customAppendPrompt`.

Build-time injection (not runtime) means the rules become part of the shipped
prompt and survive offline/sandboxed sessions.

Rationale anchor: REQ-010.

---

## sdd-workflow/DES-003: Orchestrator prompt assembly

Touched file: `src/agents/orchestrator.ts`.

Add a new function `buildAppendPrompt()` that concatenates:

1. SDD workflow block (DES-004)
2. Routing decision block (DES-006)
3. Distilled discipline rules (loaded from `docs/spec/distilled-rules.md`)
4. memex integration block (DES-007)

The append prompt is passed through the existing `customAppendPrompt`
parameter of `createOrchestratorAgent()`. No change to the base
`buildOrchestratorPrompt()`.

Rationale anchor: REQ-006, REQ-010.

---

## sdd-workflow/DES-004: SDD workflow block

Inlined into orchestrator append prompt. Pseudocode form:

```
For any non-trivial task:
1. Detect: does <project-root>/docs/spec/requirements.md exist?
   - NO  → enter grill mode (DES-005), produce triad, then continue.
   - YES → run trace freshness check (DES-008). If stale, regenerate trace.
2. Run entry review (REQ-007). Block on divergence.
3. Decompose into tasks linked to DES-* anchors.
4. For each task: route (DES-006), execute (with TDD per distilled rules).
5. Run output review (REQ-007). Block on divergence.
6. memex save via @oracle (DES-007).
```

"Non-trivial" is defined as: any task estimated to touch >1 file OR introduce
new behavior. Trivial tasks (typo fix, single-line tweak) skip SDD and go to
direct-commit route per DES-006.

Rationale anchor: REQ-003, REQ-007.

---

## sdd-workflow/DES-005: Grill mode

Implementation: a custom slash command `/grill` registered via slim's CLI
extension surface. Source location: `src/cli/commands/grill.ts` (new file).

Workflow:

1. Take user's raw idea as input.
2. Orchestrator (Opus) generates three buckets:
   - **Self-answerable** (delegated to `@explorer` / `@librarian` to resolve)
   - **Human-decision** (asked via existing `/interview` browser UI)
   - **High-risk assumptions** (listed, asked human to confirm/reject)
3. After all buckets resolve, write `requirements.md`.
4. Generate `design.md` from `requirements.md` in the same flow.
5. Generate `trace.md` (DES-008).

Convergence gate: if grill cannot produce a complete triad after 3 rounds of
interview, halt. User must manually re-issue `/grill` with sharper input.

Rationale anchor: REQ-003.

---

## sdd-workflow/DES-006: Three-route change strategy

Inlined into orchestrator append prompt. Decision tree:

```
git status shows uncommitted changes?
  YES → worktree route
        - create worktree via direct git commands (not superpowers)
        - run task in worktree
        - merge back via PR on completion

  NO  → estimate impact (files_touched, lines_changed, spec_anchored)
    files > 1 OR lines > 50 OR spec_anchored
      YES → PR route
            - feature branch (naming delegated to domain skills)
            - work on branch
            - open PR (description includes REQ-* / DES-* / TASK-* anchors)

      NO  → direct-commit route
            - work on current branch
            - commit with anchor reference if any
```

The orchestrator runs this decision once per task, announces the chosen route
in one line, proceeds.

Rationale anchor: REQ-011.

---

## sdd-workflow/DES-007: memex integration

memex is mounted as an MCP on the `oracle` agent only (per REQ-008).

Configuration: in `oh-my-opencode-slim.json` user config:

```jsonc
{
  "presets": {
    "<preset-name>": {
      "oracle": { "mcps": ["memex"] }
    }
  }
}
```

Behavior, inlined into orchestrator append prompt:

- **Before each background specialist task launch** (orchestrator as reader): orchestrator calls
  `recall_memories` with the task topic + project tag. Top 3-5 results
  injected into the task prompt under `## Lessons from past work`.
- **At entry review** (oracle as reader): oracle calls `recall_memories` with
  the triad's title + project tag. No save at this gate.
- **At output review** (oracle as writer): oracle inspects diff vs trace. If
  divergence found, oracle calls `save_memory` with tag `pitfall` + project
  tag. If a noteworthy pattern emerged, tag `pattern` + project tag.

Read/write separation: only `oracle` ever calls `save_memory`. Both
`orchestrator` and `oracle` may call `recall_memories`.

Project tag derivation:
- Prefer git remote URL parsed for `org/repo`.
- Fallback: repo root directory name.
- If neither available (e.g. detached working dir): tag `global`.

Rationale anchor: REQ-008, REQ-012.

---

## sdd-workflow/DES-008: trace.md generation and freshness

trace.md format (pure ID mapping, no rationale text):

```markdown
# Trace

| REQ | DES | TASK |
|-----|-----|------|
| REQ-001 | DES-003, DES-004 | TASK-001 |
| REQ-002 | DES-001 | — |
...
```

Generation: a built-in tool `trace_regenerate` (new). Source:
`src/tools/trace.ts`. Implementation:

1. Scan `requirements.md` for `## REQ-NNN:` headings.
2. Scan `design.md` for `## DES-NNN:` headings.
3. Scan tasks (slim's todo system) for active TASK-IDs.
4. For each REQ, find DES sections that anchor it (look for
   `Rationale anchor: REQ-NNN` lines, as used in this design document).
5. For each DES, find TASKs that reference it (similar anchor convention).
6. Emit `trace.md` with the mapping table. Overwrite previous file.

Freshness check: a hook on orchestrator startup compares mtime of
`requirements.md` and `design.md` vs `trace.md`. If either source is newer,
mark trace stale and call `trace_regenerate` before any execution phase.

The freshness hook lives in: `src/hooks/trace-freshness/` (new).

Rationale anchor: REQ-004, REQ-005.

---

## sdd-workflow/DES-009: Model role binding in config

User preset (`~/.config/opencode/oh-my-opencode-slim.json`) for this fork:

```jsonc
{
  "preset": "opus-gpt-mix",
  "presets": {
    "opus-gpt-mix": {
      "orchestrator": { "model": "anthropic/claude-opus-4-7", "skills": ["*"], "mcps": ["*", "!context7"] },
      "oracle":       { "model": "anthropic/claude-opus-4-7", "variant": "high", "skills": [], "mcps": ["memex"] },
      "council":      { "model": "anthropic/claude-opus-4-7" },
      "librarian":    { "model": "openai/gpt-5.5", "variant": "low",  "skills": [], "mcps": ["websearch", "context7", "grep_app"] },
      "explorer":     { "model": "openai/gpt-5.5", "variant": "low",  "skills": [] },
      "designer":     { "model": "openai/gpt-5.5", "variant": "medium", "skills": [] },
      "fixer":        { "model": "openai/gpt-5.5", "variant": "low",  "skills": [] }
    }
  },
  "council": {
    "presets": {
      "default": {
        "alpha":  { "model": "anthropic/claude-opus-4-7" },
        "beta":   { "model": "openai/gpt-5.5" },
        "gamma":  { "model": "google/gemini-3-pro" }
      }
    }
  }
}
```

This config lives outside the fork (it is per-user). The fork ships a
template in `docs/spec/preset-example.jsonc` for reference.

Rationale anchor: REQ-006.

---

## sdd-workflow/DES-010: Domain-layer handoff

The orchestrator append prompt instructs:

> When the task description matches a skill registered by a domain plugin
> (e.g. `ttd-dev-agent:*`, `denox-*`), invoke that skill via the standard
> Skill mechanism. Do not reimplement domain logic. Domain skills self-judge
> applicability via their own description fields.

No new code in this fork for domain routing. Domain plugins are responsible
for being discoverable.

Rationale anchor: REQ-001.

---

## sdd-workflow/DES-011: Test infrastructure (for this fork)

slim already uses Bun for tests. Distilled-rules and SDD-workflow logic that
lands in TypeScript modules will get Bun tests at the module boundary:

- `src/tools/trace.ts` → `src/tools/trace.test.ts` (parse + emit)
- `src/hooks/trace-freshness/` → unit tests for staleness detection
- `src/cli/commands/grill.ts` → integration test for grill loop

Run with `bun test`. CI gate: `bun run check:ci && bun test`.

Rationale anchor: REQ-009 (dogfooding TDD on this fork itself).

---

## sdd-workflow/DES-012: Out-of-scope reminder

This design does NOT cover:

- CI workflows (delegated to domain layer / future)
- Deployment (delegated to domain plugins)
- PR description templates (delegated to domain layer)
- Multi-project priority scheduling (handled by user, not orchestrator)
- Rollback / observability (out of generic-layer scope per REQ-001)

If implementation reveals these are blockers, amend `requirements.md`
(triggers REQ-004 re-run path), not this document directly.

---

## sdd-workflow/DES-013: Spec delta propose / merge tools

Rationale anchor: REQ-014.

Directory layout for in-flight changes:

```
docs/spec/
├── requirements.md           # main (trunk)
├── design.md                 # main (trunk)
├── trace.md                  # auto-generated, tracks trunk only
├── changes/
│   └── <slug>/
│       ├── proposal.md       # one-paragraph "why this change"
│       ├── delta-requirements.md
│       └── delta-design.md
└── archive/
    └── 2026-05-24-<slug>/    # post-merge resting place (see DES-014)
```

Two tools, both registered alongside `trace_regenerate` in `src/tools/spec/`:

**`spec_propose`** — args: `slug` (kebab-case), `summary` (one line). Behavior:
- Refuse if `docs/spec/requirements.md` does not exist (use plain triad bootstrap instead).
- Refuse if `docs/spec/changes/<slug>/` already exists (slug collision).
- Compute next REQ-ID and DES-ID by scanning trunk + all open `changes/*/delta-*.md`.
- Write three skeleton files with the allocated IDs pre-stamped.

**`spec_merge`** — args: `slug`. Behavior:
- Parse `delta-requirements.md` and `delta-design.md`, extract REQ-* / DES-* sections (heading-anchored, same regex as `extractIds`).
- Append each new section to the corresponding trunk file (never edit existing sections — that requires an explicit `--replace REQ-NNN` flag in a future iteration).
- Refuse if any delta REQ/DES ID already exists in trunk (collision).
- Run `regenerateTrace` after successful merge.
- Return list of merged IDs for the caller (oracle) to log.

Conflict policy: merge is purely additive in v1. Edits to existing REQs/DESs are deferred to a `spec_amend` tool (out of scope for this PR; track as future work).

## sdd-workflow/DES-014: Archive merged changes

Rationale anchor: REQ-015.

**`spec_archive`** — args: `slug`. Behavior:
- Refuse if `docs/spec/changes/<slug>/` does not exist.
- Refuse if `docs/spec/archive/<YYYY-MM-DD>-<slug>/` already exists (slug-day collision: the caller picks a different slug or merges into existing archive entry).
- Move (not copy) the entire change directory to `docs/spec/archive/<YYYY-MM-DD>-<slug>/` using `fs.renameSync` so the operation is atomic on the same filesystem.
- Date is computed from `new Date()` in the local timezone, formatted `YYYY-MM-DD`.

`spec_archive` MUST be called as the immediate next action after `spec_merge` succeeds. Per the SDD workflow append-prompt, `@oracle` is responsible for invoking both as part of output review.

Archive entries are NOT scanned by `trace-freshness` hook, NOT parsed by `extractIds`, and NOT included in `regenerateTrace` output. They are pure historical record, addressable via path.

## sdd-workflow/DES-015: Plugin source verification block inserted before Step 5

Rationale anchor: REQ-016.

Insert a new subsection "Step 4.5: Verify Active Plugin Source (Fork-Specific)"
into `docs/installation.md` immediately before the existing Step 5
fork-specific addendum, inside the `<!-- slim-fork-addendum -->` block.

The subsection prescribes a decision tree:

1. Run `opencode plugin install boin/oh-my-opencode-slim`. If it returns
   `git dep preparation failed`, fall back to step 2.
2. Local checkout fallback: clone the fork to
   `~/.config/opencode/plugins/oh-my-opencode-slim-sdd`, `bun install`,
   `bun run build`, then add the absolute path as a string entry in
   the `plugin` array of `~/.config/opencode/opencode.json`.
3. Verification gate (mandatory regardless of which path succeeded):
   `grep -l spec_propose <plugin-dist-path>/dist/index.js` MUST return a
   hit. If it does not, the loaded plugin is upstream, not the fork —
   stop and re-do step 1/2.

The block is kept inside the existing addendum markers so upstream
merges continue to surface it as a single delete.

## sdd-workflow/DES-016: council.gamma example added to Step 5 preset description

Rationale anchor: REQ-017.

Augment the existing "Variants in the preset" bullet list in Step 5 with
a concrete `council` block example that includes `alpha`, `beta`, and
`gamma`. Use `<alias>/gemini` as the gamma model in the gateway variant
and `google/gemini-3-pro` in the official-providers variant, mirroring
the rest of Step 5's two-path structure.

Add a one-line rationale: "council without gamma silently degrades to a
two-edge debate; the third edge is the disagreement signal, not a
fallback."

## sdd-workflow/DES-017: Step 8 "Interaction discipline" + grill anti-pattern hardening

Rationale anchor: REQ-018.

Add Step 8 to `docs/installation.md`, inside the addendum markers,
after Step 7. Step 8 contains:

1. A three-item enumeration of valid reasons to stop and ask the user:
   - Genuine human-only judgment (business priority, scope/quality
     tradeoff, taste call the agent cannot derive).
   - Irreversible side effect (destructive git, external API write,
     production deploy, money, messages to other humans).
   - Scope explosion (the task as briefed implies >N files or >M lines
     of change beyond what the user approved; agent must reconfirm
     scope before continuing).
2. A one-line rule: anything outside those three categories is the
   agent's call. Do not stop to confirm routing, model choice, file
   layout, or anything the agent could resolve by reading the code.
3. A pointer back to the grill skill's phase-4 rules for the
   deep-dive case (spec authoring).

Separately, edit `src/skills/grill/SKILL.md` § Anti-patterns to add:

- Self-check before writing any `H-N`: "Could `grep`, a file read, or a
  doc fetch answer this? If yes, it belongs in phase 3, not phase 4."

This is documentation + skill-text only; no runtime code changes.

## sdd-workflow/DES-018: Add "Local-plugin development loop" subsection to AGENTS.md

Rationale anchor: REQ-019.

Insert a new subsection immediately after the existing "Commands"
table in `AGENTS.md` (line ~26, before "Code Style"). The subsection
prescribes:

- Three-step loop: edit TS → `bun run build:plugin` → restart
  OpenCode.
- Why `build:plugin` not `build`: skips CLI, type declarations, and
  schema regeneration; fastest path that still refreshes
  `dist/index.js`.
- Two traps stated explicitly:
  - OpenCode loads `dist/index.js`, never the TS sources.
  - OpenCode does not hot-reload plugins; a rebuild alone is not
    enough.
- A one-line note that the slower `bun run build` is still required
  before publishing or before any CI-relevant verification.

Documentation only; no runtime code changes, no test changes.

## sdd-workflow/DES-019: Two-tier spec implementation

Rationale anchor: REQ-020.

Parser (`src/tools/trace/parser.ts`):
- Heading regex: `^##\\s+([a-z][a-z0-9-]*\\/(REQ|DES)-\\d+):`. Legacy
  unqualified headings are ignored — migration is required.
- `extractAnchors(md, {defaultDomain})` resolves bare anchors against
  the given domain; without `defaultDomain`, bare anchors drop silently.
- `parseQualifiedId` exported for callers that need to split
  `auth/REQ-3` into `{domain, prefix, n}`.

trace io (`src/tools/trace/io.ts`):
- `regenerateDomainTrace(specDir, domain)` writes one domain's trace.
- `regenerateAllDomainTraces(specDir)` walks `domains/*/`.
- `regenerateJobTrace(specDir, slug)` rolls up all qualified ids in a
  job's deltas (no defaultDomain — job anchors must be qualified).
- `findStaleTraces(specDir)` returns `StaleEntry[]` for both domains
  and open jobs, used by the trace-freshness hook.

spec tools (`src/tools/spec/io.ts`):
- `proposeJob(specDir, slug, summary, {domains})` creates the job dir,
  pre-allocates next ids per declared domain (reading both trunk and
  other open jobs' deltas to avoid collisions).
- `mergeJob(specDir, slug)` groups delta sections by domain prefix,
  refuses on collision in any target domain trunk, appends each
  group, then regenerates affected domain traces + job trace.
- `archiveJob(specDir, slug)` whole-dir renames `jobs/<slug>/` to
  `archive/YYYY-MM-DD-<slug>/`. Refuses same-slug same-day re-archive.

Hook (`src/hooks/trace-freshness/index.ts`):
- Uses `findStaleTraces` and regenerates each stale entry via the
  matching `regenerateDomainTrace` / `regenerateJobTrace`. Notice
  format: `<internal_reminder>trace_regenerate: refreshed domain:auth, job:add-otp</internal_reminder>`.

Migration (`src/tools/spec/migrate.ts` + `scripts/migrate-spec-to-domains.ts`):
- One-shot. Reads legacy `requirements.md` + `design.md`, qualifies all
  `## REQ-N:` / `## DES-N:` headings into `## <domain>/REQ-N:` / `## <domain>/DES-N:`.
- Moves trunk into `domains/<domain>/`, re-homes `changes/<slug>/` into
  `jobs/<slug>/` (qualifying delta headings on the way).
- Regenerates the domain trace. Leaves `.migrated-to-domains` marker
  for idempotency. Refuses if `domains/` already exists or if no
  legacy trunk is present.

Docs:
- `src/skills/grill/SKILL.md` rewritten end-to-end to describe the
  two-tier layout, domain naming discipline (reuse-first, do not halt
  to ask), heading/anchor rules, and tool workflow for both bootstrap
  and job paths.
- `src/agents/append-prompt.ts` SDD_WORKFLOW block updated in
  compressed form for orchestrator system prompt.

Spec files in this repo are agent-only artifacts. No human-readable
preamble. When a domain decision is made, the choice is recorded in
one line in `proposal.md` and execution continues — no halt to ask
the user.

## sdd-workflow/DES-020: Executable task package gate

Rationale anchor: sdd-workflow/REQ-021, sdd-workflow/REQ-022.

Add a Module Completion Discipline to the SDD workflow. The core design is a
mandatory gate between `REQ/DES` planning and implementation delegation:

```text
requirements/design
  -> orchestrator-authored job-local task packages
  -> mandatory @oracle task-package review
  -> execution readiness report + authorization
  -> bounded fixer/designer/explorer work
  -> completion evidence
  -> output review against task packages
```

### Chosen Task Artifact

The workflow uses `docs/spec/jobs/<slug>/tasks.md` as the durable module task
package artifact.

Prompt-only enforcement is insufficient for this requirement. The minimum
tooling path is mandatory:

1. `spec_propose` creates a job-local `tasks.md` bootstrap package.
2. The orchestrator authors the full implementation task set in `tasks.md`.
3. `@oracle` performs mandatory gating review of `tasks.md` before
   implementation delegation.
4. The orchestrator reports execution readiness and records authorization.
5. `trace_regenerate` maps task anchors into trace `TASK` cells for open jobs.
6. Prompts enforce how orchestrator, fixer, and output review use the task
   packages.

Task details live only in `tasks.md`. `trace.md` remains a flat mapping
artifact and stores only TASK-ID references.

`TASK-N` ids are job-scoped. Inside `docs/spec/jobs/<slug>/tasks.md`, tasks are
written as `TASK-001`. Outside that file, task references use
`<slug>/TASK-001`.

Task packages anchor back to fully qualified domain ids:
`Anchors: sdd-workflow/REQ-021, sdd-workflow/DES-020`.

Archived jobs preserve their completed `tasks.md`. Domain trunks do not absorb
task packages. Domain `trace.md` remains focused on durable `REQ -> DES`
mapping; archived job traces preserve historical task mappings.

### Task Package Shape

Each task package MUST use this shape:

```markdown
## TASK-001: <module behavior title>

Anchors: sdd-workflow/REQ-021, sdd-workflow/DES-020
Owner: orchestrator | @fixer | @designer
Status: pending | in-progress | blocked | complete

### Goal
Observable behavior this task must deliver.

### Boundaries
- Files/directories expected to change:
- Files/directories that must not change:
- Existing contracts that must be preserved:

### Implementation Requirements
- Concrete behavior item 1
- Concrete behavior item 2

### Acceptance Checks
- Checkable condition 1
- Checkable condition 2

### Validation
- Command or smoke:
- Expected result:

### Completion Evidence
- Files changed:
- Acceptance checks satisfied:
- Validation run:
- Result:
- Reviewer notes:

### Anti-Shell Rules
- No TODO/stub/placeholder may satisfy this task.
- New UI must connect to real state/action or explicitly remain demo-only.
- New API must be mounted and reachable in tests or smoke.
- New service must be called by a real path or covered by direct tests.
- Fixture-only behavior must be labelled as such and cannot satisfy a
  production-path task.
```

`Completion Evidence` is mandatory as a section. It may be empty while the task
is `pending`, `in-progress`, or `blocked`; it MUST be non-empty before status
can become `complete`.

### Bootstrap Task

`spec_propose` creates `docs/spec/jobs/<slug>/tasks.md` with a fixed bootstrap
task:

```markdown
## TASK-001: Produce executable task packages
```

This task is owned by the orchestrator. It requires the orchestrator to author
the full implementation task set and pass mandatory `@oracle` task-package
review before any write-capable implementation delegation.

The bootstrap task avoids two failure modes:

- empty templates that cold agents skip,
- premature full decomposition during proposal creation.

### Task Package Review Gate

Before any write-capable implementation delegation, the orchestrator MUST
produce or update `docs/spec/jobs/<slug>/tasks.md` and delegate task-package
review to `@oracle`.

The review is mandatory for non-trivial SDD jobs. The review checks the whole
`tasks.md`, not each task in isolation:

- every implementation task has `REQ` / `DES` anchors,
- task boundaries are cohesive and non-overlapping,
- no required module is missing,
- acceptance checks are observable,
- validation evidence is realistic,
- completion evidence fields exist,
- anti-shell rules are present and enforceable,
- the package set is small enough to execute but complete enough to avoid
  conceptual delegation.

The review result is recorded at the top of `tasks.md`:

```markdown
## Task Package Review

Status: pending | passed | failed
Reviewer: @oracle
Reviewed at:
Review source: task-package-review

### Review Scope
- Checked all task packages against REQ/DES anchors.
- Checked boundaries, acceptance checks, validation, completion evidence
  fields, and anti-shell rules.
- Checked task split for missing, overlapping, or conceptual-only packages.

### Required Fixes
- None when passed.

### Review Notes
- Short durable notes for cold-session recovery.
```

Implementation MUST NOT be delegated while `Task Package Review.Status` is
`pending` or `failed`.

`Task Package Review.Status: passed` is invalid if any implementation task
lacks `Anchors`, `Boundaries`, `Acceptance Checks`, `Validation`,
`Completion Evidence`, or `Anti-Shell Rules` sections.

If review fails, `@oracle` reports required fixes but does not edit the file.
The orchestrator updates `tasks.md` and requests review again.

### Execution Readiness Gate

Passing task-package review means the job is executable; it does not by itself
authorize implementation.

After `Task Package Review.Status: passed`, the orchestrator MUST present a
readiness report to the user before delegating write-capable implementation,
unless the user has already requested autonomous execution.

The readiness report MUST include:

- job slug,
- review status,
- task count and next task ids,
- implementation scope summary,
- required validation commands,
- notable risks or blockers,
- an explicit statement: `Ready to execute` or `Not ready to execute`.

The readiness state is recorded in `tasks.md`:

```markdown
## Execution Readiness

Status: pending | authorized | blocked
Authorized by:
Authorized at:
Scope:

### Readiness Summary
- Task-package review status:
- Next executable tasks:
- Required validation:
- Risks/blockers:
```

Implementation MUST NOT be delegated while `Execution Readiness.Status` is
`pending` or `blocked`.

When the user says to proceed after the readiness report, the orchestrator
updates `Execution Readiness.Status` to `authorized` and may delegate from the
next pending implementation task.

### Orchestrator Prompt Changes

Update `src/agents/append-prompt.ts` and/or `src/agents/orchestrator.ts` so
the orchestrator follows these rules:

1. Treat all spec-backed jobs as non-trivial unless explicitly marked as a
   trivial documentation-only correction.
2. Before executing a non-trivial spec-backed job, check whether `tasks.md`
   exists.
3. If task packages are missing or only the bootstrap task exists, author the
   implementation task packages before delegation.
4. After task-package review passes, report `Ready to execute` and record
   execution authorization before write-capable delegation.
5. Split large work by cohesive module, not by vague layer names.
6. Do not send `@fixer` a conceptual module. Send exactly one complete task
   package or a small batch of independent complete packages.
7. Include relevant `REQ/DES/TASK` anchors in every delegation prompt.
8. Require each subagent to report acceptance checks and validation evidence.
9. After subagent completion, inspect the diff and evidence before marking the
   task complete.
10. Mark task status as `complete` only after completion evidence is present
   and anti-shell checks pass.

The orchestrator continues to use direct execution for trivial one-file edits
that are not spec-backed jobs.

### Fixer Prompt Changes

Update `src/agents/fixer.ts` so `@fixer` understands that it is an execution
specialist, not a planner, and must refuse under-specified non-trivial work.

Required behavior:

- If a delegated task is non-trivial and lacks anchors, boundaries,
  acceptance checks, validation expectations, completion evidence fields, or
  passed task-package review, report missing inputs instead of inventing a
  broad implementation plan.
- Implement only the task package scope.
- Do not satisfy a task with disconnected shells, placeholder methods,
  TODO-only code, or fixture-only paths unless the package explicitly says the
  task is demo-only or test-fixture-only.
- Do not mark task status as `complete`.
- Return a structured completion report that includes:
  - files changed,
  - acceptance checks satisfied,
  - validation commands run,
  - validation results,
  - incomplete items or blockers.

Missing input reports use a mechanical shape:

```text
<blocked>
Missing task package fields:
- Anchors: ...
- Boundaries: ...
- Acceptance Checks: ...
- Validation: ...
- Completion Evidence: ...
- Task Package Review: ...
</blocked>
```

### Output Review Anti-Shell Gate

Output review verifies task completion, not only trace consistency. It MUST
reject completion when:

- a task is marked `complete` without `Completion Evidence`,
- validation is missing, skipped without reason, or unrelated to the task,
- acceptance checks are restated but not evidenced,
- TODO/stub/placeholder code exists in the production path,
- fixture/mock/demo-only behavior is presented as production behavior,
- changed code is not reachable from any mounted route, exported API, command,
  UI action, test path, or documented smoke path.

Type-specific checks:

- API work: new route is mounted; handler is reachable in tests or smoke;
  schema/model is used by the route.
- UI work: new screen/component is connected to real state or action; mock data
  is explicitly demo-only; user-visible behavior can be triggered.
- Service/workflow work: service is called by a real path; workflow state
  transitions are tested or smoked; adapters are wired into execution.
- Docs/spec-only work: referenced files and anchors exist; trace/job mappings
  are fresh when required.

The anti-shell gate is canonical in this design section. Task packages MAY add
task-specific anti-shell rules, but they MUST NOT weaken this canonical gate.

### Tooling Changes

Implement the smallest durable artifact support:

- `spec_propose` creates `docs/spec/jobs/<slug>/tasks.md` with the fixed
  bootstrap task and review block.
- Trace parsing recognizes job-local `TASK-N` headings and their `Anchors:`
  lines.
- Open job trace generation maps `REQ/DES` anchors to `<slug>/TASK-N`
  references.
- Domain trace generation remains durable-domain focused and does not inline
  archived task details.

Do not build a general project-management subsystem.

### Interaction with Existing SDD/TDD

- Trace remains a flat mapping artifact. It stores TASK-ID references, not
  task package details.
- One module task package may contain a TDD red/green/refactor cycle. Red,
  green, and refactor are execution steps inside the package, not three
  separate packages by default.
- Trivial direct edits follow the existing direct route and do not require task
  packages.
- Task-package review is an entry gate before implementation delegation.
- Execution readiness is a user-facing authorization gate after task-package
  review and before implementation delegation.
- Output review remains the completion gate before merge/archive.

### Reference Diagnosis

The Denox Excel project is a useful regression example:

- Long-lived specs are directional and concept-heavy.
- Archived delta slices contain actionable module boundaries.
- Domain trace maps `REQ -> DES` but has empty `TASK` cells.

The local `sdd-workflow` trace has the same empty TASK symptom. The new
discipline should make future agents convert delta slices into bounded task
packages before implementation, then verify each package against observable
behavior.

### Tests

Add or update tests at the lowest useful level:

- append-prompt tests: module completion rules and task-package review gate are
  embedded.
- fixer prompt tests: under-specified non-trivial work refusal and structured
  evidence expectations are present.
- spec tooling tests: `spec_propose` creates `tasks.md` with the bootstrap task
  and review block.
- trace tooling tests: a sample job with `REQ/DES/tasks.md` maps to non-empty
  TASK entries in open job trace output.
- regression fixture: shell-only completion evidence fails review-language
  expectations.

### Verification

Before declaring this job complete, run:

```bash
bun test
bun run typecheck
bun run check:ci
```

If full verification is blocked, document the exact command, failure, and
whether the failure is pre-existing or caused by this job.

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

## sdd-workflow/DES-23: Delegation budget prompt and steering-safe todo reminder

Rationale anchor: sdd-workflow/REQ-25.

Add a compact `Delegation Budget and Context Preservation` block to the inlined
orchestrator append prompt. The block is always-on but intentionally short. It
states:

- delegation is justified by specialist advantage, parallelism, risk reduction,
  or context isolation;
- obvious small local work should use the fast path;
- known-small classification is revoked when inspection reveals hidden breadth,
  boundary crossing, unclear acceptance, noisy validation, or higher risk;
- context-isolation delegation must require compact evidence;
- child outputs are verified proportionally to risk;
- detailed risk matrices and thresholds are not inlined into every turn.

This block is an entry-classification gate. It decides whether to enter heavy
SDD/TDD and how much specialist/context-isolation help is warranted. It MUST NOT
weaken full SDD requirements after a task is classified as full SDD or after a
spec job is opened. TDD ordering remains red → green → refactor, but minor or
known-small work may perform that sequence inline instead of delegating every
step to `@fixer`.

Update prompt tests to lock the always-on contract without expanding the prompt
with the full long-form policy. The prompt should mention fast path, context
isolation, compact evidence, proportional verification, inline TDD, and that
specialist calls are not ritual.

Update the todo-hygiene reminder text so steering does not cause todo-list
replacement. The reminder should instruct the agent to preserve still-valid
todos and merge steering, correction, clarification, or additional constraints
into the current list unless the user explicitly cancels or replaces the task.
Add a unit test for this reminder wording.

The implementation intentionally avoids new runtime state for steering. This is
a prompt-level hygiene fix: the existing hook already injects the reminder after
todo updates; the reminder now gives safer update semantics.

## sdd-workflow/DES-24: Concise output and specialist delta follow-up prompt

Rationale anchor: sdd-workflow/REQ-26.

Add a compact section to the inlined orchestrator append prompt for concise
user output and specialist follow-up reuse. It remains always-on but short.

The concise output rule says user-facing progress should be route-first and
terse. The prompt names the default fields (`route`, `reason`, `next`, `status`)
and says not to expose raw reasoning, long evidence chains, or full child
summaries unless failure, approval, high risk, surprising result, or user
request requires it.

The follow-up rule says specialist follow-up should reuse the previous task
session and be delta-scoped when the same topic/scope and narrow-delta checks
pass. It distinguishes same-session delta follow-up, same-session full
re-review, and new-session full review. It requires the delta prompt to include
previous `task_id`, previous verdict, required fixes, changed files, applied
delta, and validation. It also names disqualifiers that force full re-review:
validation not rerun or now failing, files or anchors outside the prior scope,
new API/data/security/persistence/workflow or product semantics, incomplete
prior review scope, or a user-requested fresh review.

Prompt tests lock the compact always-on wording without inlining long templates
or risk tables. The line-count guard remains in place to prevent prompt growth.

This design is prompt-only. It does not add runtime tracking of review state;
the orchestrator records review state in SDD `tasks.md`, todos, or internal
notes when a follow-up is expected.

## sdd-workflow/DES-25: Explicit domain triad validation

Rationale anchor: sdd-workflow/REQ-27.

Add a shared domain-triad inspection helper for spec and trace tooling. The
helper distinguishes three states:

- `missing`: the domain directory does not exist.
- `complete`: the directory exists and contains both `requirements.md` and
  `design.md`.
- `incomplete`: the directory exists but one or more required source files are
  missing.

Use the helper as follows:

- `spec_propose` keeps the existing bootstrap behavior for `missing` domains:
  validate the kebab-case domain name, create `requirements.md` and
  `design.md`, then regenerate `trace.md`.
- `spec_propose` rejects `incomplete` domains with the shared diagnostic before
  allocating IDs or writing the job.
- `spec_merge` rejects referenced `incomplete` domains before collision checks
  or append writes.
- `trace_regenerate` rejects `incomplete` domains with the same diagnostic and
  never creates missing source files.
- trace freshness may catch the error for reminder output, but the failure text
  must preserve the incomplete-domain diagnostic.

Tests cover complete domains, newly bootstrapped domains, incomplete domains
missing `requirements.md`, incomplete domains missing `design.md`, and merge /
trace failure paths. No repair mode is introduced in this change; future repair
or migration commands must be explicit and non-overwriting.

## sdd-workflow/DES-26: Raw session reuse guard

Rationale anchor: sdd-workflow/REQ-28.

In `src/hooks/task-session-manager/index.ts`, split `task_id` handling into two
paths:

1. First resolve the requested value against `BackgroundJobBoard.resolve()` for
   the current parent session.
2. If the value resolves to a known job, reuse it only through
   `BackgroundJobBoard.resolveReusable(parent, requested, subagent_type)`. When
   that check fails, delete `args.task_id` so OpenCode starts a fresh specialist
   session rather than resuming the wrong agent.
3. If the value does not resolve to any known job and matches raw `ses_*`, keep
   the current pass-through behavior for explicit native session resumes.
4. Continue deleting unknown alias-like values such as `fix-99`.

Regression tests belong in
`src/hooks/task-session-manager/index.test.ts`:

- a known completed/reconciled raw `ses_*` job with the wrong `subagent_type`
  must have `task_id` removed;
- a known completed/reconciled raw `ses_*` job with the matching
  `subagent_type` must still be preserved;
- an unknown raw `ses_*` id must still pass through.

## sdd-workflow/DES-27: Fork namespace and thin adapters

Rationale anchor: sdd-workflow/REQ-29.

Create `src/fork/**` as the long-lived namespace for fork-only behavior:

- `src/fork/tools/**` owns spec, trace, and CodeGraph command tools.
- `src/fork/hooks/**` owns trace freshness and todo hygiene hooks.
- `src/fork/agents/**` owns prompt append/overlay helpers.
- `src/fork/skills/**` owns fork-only install-time skills.
- `src/fork/cli/**` owns descriptors for fork-only skills.

Create a small `src/fork/index.ts` integration surface that returns fork tools,
hooks, command registration helpers, and prompt overlay helpers as needed. Keep
shared entry files as adapters only:

- `src/index.ts` imports fork runtime once and spreads returned tools / hooks.
- `src/hooks/index.ts` and `src/tools/index.ts` should not export fork-only
  implementation modules unless required for a compatibility seam.
- agent prompt changes should be applied via fork overlays from
  `src/agents/index.ts`, not embedded in each upstream-owned agent file.
- fork-only docs move to `docs/fork/**`; `docs/spec/**` remains in place because
  it is a runtime/spec dogfood surface for this fork.

Validation:

- `bun run check:ci`
- `bun run typecheck`
- targeted tests for moved modules
- full `bun test`
- `bun run build`
- conflict-surface report: list changed files outside `src/fork/**`,
  `docs/fork/**`, and `docs/spec/**`.

## sdd-workflow/DES-28: Docs-aware grill mode

Rationale anchor: sdd-workflow/REQ-30.

Extend `src/fork/skills/grill/SKILL.md` without creating a separate
`grill-with-docs` skill. The existing `grill` skill remains the SDD entrypoint;
docs-aware behavior is its codebase mode.

### Context docs pass

Insert a phase before the existing four grill phases:

```text
0. Context docs pass
```

The pass is intentionally lightweight and deterministic:

1. Determine affected SDD domains using the existing reuse-first domain rule.
2. Read existing context sources in priority order:
   - `docs/spec/context.md`
   - `docs/spec/domains/<domain>/glossary.md`
   - root `context.md`
   - `docs/spec/adr/` or `docs/adr/` when present
3. Carry known terms into phase 1 assumptions.
4. Add `A-term-N` assumptions for unclear terms, naming mismatches, missing
   definitions, or terms that appear in user language but not in specs/code.
5. Resolve self-answerable terminology questions via read/search before asking
   the human.

The pass must stay bounded. It reads only obvious shared context files and
domain-local glossary files for affected domains; it does not perform a broad
documentation crawl.

### Shared language updates

After convergence, `grill` emits a `Terminology Delta` section in its own work
notes or the job proposal/spec delta when durable terminology changed. The delta
uses this shape:

```markdown
## Terminology Delta

- Term: <canonical term>
  Definition: <short definition>
  Aliases / rejected names: <optional>
  Scope: global | <domain>
  Used by: <spec/code/doc references>
```

Persistence rules:

- Global SDD terms go to `docs/spec/context.md`.
- Domain-specific terms go to `docs/spec/domains/<domain>/glossary.md`.
- Non-SDD repositories may use root `context.md`.
- Existing project convention wins when an equivalent file already exists.
- The workflow creates the smallest file necessary and does not invent a general
  documentation system.

The orchestrator may perform structural glossary edits directly because they are
docs-only and bounded. If glossary updates alter product language, public copy,
or user-facing semantics, they must be reviewed as part of the normal SDD output
review.

### ADR capture

Add an ADR discipline to the skill:

- Default path: `docs/spec/adr/NNNN-short-title.md`.
- Compatibility path: use `docs/adr/` if the repo already has that convention.
- Numbering: next zero-padded number among existing ADR files; if no ADR exists,
  start at `0001`.
- Required sections: `Status`, `Context`, `Decision`, `Consequences`, `Related`.
- Related links include fully qualified `REQ` / `DES` ids and job slug when
  applicable.

ADR trigger heuristic: create an ADR when at least one strong trigger or two
medium triggers apply.

Strong triggers:

- data, API, security, persistence, deployment, or workflow boundary change;
- cross-domain architecture decision;
- decision is hard to reverse or expensive to migrate;
- future maintainers would likely find the code path surprising without context.

Medium triggers:

- external dependency responsibility split;
- explicit performance vs maintainability trade-off;
- naming/modeling choice that shapes multiple files or public docs;
- deprecating an old workflow or rejecting a plausible alternative.

If a decision is not ADR-worthy, record the rationale in `design.md` only.

### Skill and docs updates

Update these fork-owned assets:

- `src/fork/skills/grill/SKILL.md`: add context docs pass, terminology delta,
  ADR discipline, authorization-signal clarification, and anti-patterns.
- `src/fork/skills/grill/README.md`: summarize docs-aware mode.
- `docs/fork/skills.md`: update the `grill` row and taxonomy wording.
- `src/cli/custom-skills.ts`: refresh the human-readable bundled skill
  description; no new skill registry entry is added.

Do not add a `grill-with-docs` skill. The name may be mentioned as upstream
inspiration, but the installed skill remains `grill` to avoid route ambiguity
with SDD and `brainstorming` handoff behavior.

### Prompt footprint

The always-on orchestrator prompt should not be expanded for this change unless
future validation proves the skill is not loaded reliably. The detailed rules
belong in the skill file and durable SDD specs. Existing SDD prompt text may keep
referring to "grill" without enumerating docs-aware internals.

### Verification

Docs/spec-only verification requires:

```bash
bun run check:ci
bun run typecheck
```

Run `bun test` if TypeScript or runtime registry behavior changes beyond string
metadata. Since this job updates `src/cli/custom-skills.ts`, run the focused CLI
tests when practical:

```bash
bun test src/cli/skills.test.ts src/cli/providers.test.ts
```
