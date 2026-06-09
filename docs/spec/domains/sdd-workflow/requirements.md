# Requirements: SDD + TDD + Grill Enhancement for slim

Source: 47-round grill session, 2026-05-23.
Scope: fork-local enhancements on top of upstream `oh-my-opencode-slim`.
Audience: cold-session AI agents resuming work without conversation history.

---

## sdd-workflow/REQ-001: Workflow layering

The fork MUST keep two layers separate:

- **Generic layer** (this fork): SDD workflow, TDD orchestration, review gates, memory persistence, model role split, PR/worktree/direct routing.
- **Domain layer** (external plugins like `ttd-dev-agent`, `denox-*`): commit conventions, branch policy, CI, deployment, post-deploy regression, infra ops.

The generic layer MAY call into the domain layer via skill auto-discovery. The generic layer MUST NOT contain domain-specific routing logic.

## sdd-workflow/REQ-002: Spec triad (SDD)

Every non-trivial task MUST produce three artifacts in the target project's `docs/spec/` directory:

- `requirements.md` — what to build and why
- `design.md` — how to build it
- `trace.md` — pure ID mapping (`REQ-* → DES-* → TASK-*`)

Both `requirements.md` and `design.md` are concise and self-contained for cold-agent handoff. Background and rejected alternatives MAY live in memex (project-tagged) instead of bloating the triad.

## sdd-workflow/REQ-003: Grill-then-spec order

For any new task:

1. Grill the user's idea first (agent self-interrogates: list assumptions, risks, self-answerable vs human-only questions; answer the self-answerable ones via `@explorer`/`@librarian`).
2. Produce `requirements.md` from the grill output.
3. Produce `design.md` from `requirements.md`.
4. Generate `trace.md` before execution.

If grill cannot converge, halt. Do not enter execution. Convergence criteria: (mechanical) all three files exist with required sections; (human) explicit "go" from user.

## sdd-workflow/REQ-004: Spec authorship and amendment

- The grill agent owns initial spec authorship.
- During execution, any agent MAY amend `requirements.md` when it discovers genuine gaps.
- Any amendment MUST trigger affected-only re-run: only the impacted `design.md` sections and `tasks` are regenerated, not the full pipeline. This requires `trace.md` to stay accurate.

## sdd-workflow/REQ-005: Trace maintenance

`trace.md` is a flat ID mapping (no rationale).

- IDs are assigned **post-hoc** by an agent scanning the triad, not pre-allocated during writing.
- Trace regeneration is **automatic**, triggered by the orchestrator before any execution phase.
- If trace is stale at execution entry, orchestrator re-runs trace generation, then proceeds without user confirmation.
- Trace exists so cold sessions can follow established work without conversation history. It is not a human-review artifact.

## sdd-workflow/REQ-006: Model role split

- **Opus 4.7** runs as `orchestrator`, `oracle`, and `council` synthesizer.
- **GPT-5.5** runs as `librarian`, `explorer`, `designer`, `fixer`.
- **Gemini Pro** appears only as a `council` councillor (edge participation).

Role enforcement:

- Opus MUST NOT write implementation code directly. Delegate to `@fixer`.
- GPT fixer MAY make small local decisions when spec is silent. Architectural divergence is caught at output review.

## sdd-workflow/REQ-007: Two review gates

Replace the natural 4-point review schedule with 2 consolidated gates to control Opus cost:

- **Entry review** — fires after trace regeneration or on cold-session handoff. Confirms the triad and trace are mutually consistent before execution begins.
- **Output review** — fires after subtask batch completion, before commit. Reviews the accumulated diff against trace anchors.

If output review finds divergence: GPT fixer redoes the work with brief guidance from Opus. Opus does not edit code directly.

## sdd-workflow/REQ-008: Persistent lessons via memex

- `oracle` is the sole memex **writer**. Writes occur only at the two review gates.
- `orchestrator` is the memex **reader**: before launching each subtask, it calls `recall_memories` with the subtask topic + project tag and injects the top results into the subtask prompt.
- Two write categories: `pitfall` (divergence found at review) and `pattern` (good practice discovered).
- Project scoping: oracle infers project identity from git remote / repo root / context. Memories carry project tag when inferable, global tag when cross-project.

## sdd-workflow/REQ-009: TDD execution discipline

- Default: strict TDD (red → green → refactor), enforced by **inlined distilled rules** in the orchestrator prompt (see REQ-010 for source/rationale).
- The discipline is held by `orchestrator` (Opus), not by `fixer`. Opus decomposes a TDD cycle into three narrow subtasks (write failing test → implement to green → refactor).
- Exemption categories (orchestrator decides automatically):
  - UI / visual / exploratory prototype
  - Test infrastructure absent (no test runner, no test directory)
- If test infrastructure is missing, run a one-shot "build infra" subtask first, record the setup in `design.md` under a `Test infrastructure` section, then return to TDD.

## sdd-workflow/REQ-010: Inlined discipline (distilled from superpowers)

This fork does NOT depend on the `superpowers` plugin at runtime. Rationale: the `superpowers` skill style (long checklists, red-flag tables, 9-step procedures) is optimized for weaker models and becomes redundant or token-wasteful on Opus 4.7, which already exhibits strong native discipline.

Instead, the high-value subset of `superpowers` is distilled into compact rules embedded directly in the orchestrator prompt (`customAppendPrompt`):

- **TDD**: red→green→refactor cycle, subtask decomposition, exemption gates (covers REQ-009)
- **Systematic debugging**: hypothesis-first, narrow-the-scope, no fix-by-guessing
- **Verification before completion**: explicit checks before declaring done; no self-congratulatory "completed" without evidence

Skills explicitly NOT distilled (handled by slim or our own design):

- `brainstorming` — replaced by our grill workflow (REQ-003)
- `subagent-driven-development` — covered by slim's orchestrator + subtask
- `using-git-worktrees` — operational, handled by REQ-011 routing
- `writing-plans` / `executing-plans` — covered by SDD triad (REQ-002)
- `requesting-code-review` / `receiving-code-review` — covered by review gates (REQ-007)

Distilled rules MUST stay under 200 lines total when embedded. Periodically re-check upstream `superpowers` for new high-value skills worth distilling, but pull rules manually rather than runtime-loading the plugin.

## sdd-workflow/REQ-011: Routing for change strategy

Orchestrator auto-selects one of three routes per task:

- **Worktree** when working tree is dirty (`git status` shows uncommitted changes).
- **PR-based** when tree is clean AND task touches >1 file OR >50 lines.
- **Direct commit** when tree is clean AND task touches 1 file AND <50 lines AND no spec section is linked.

Worktree creation uses `superpowers:using-git-worktrees`. PR creation and branch naming are delegated to domain-layer skills.

## sdd-workflow/REQ-012: Cold-session self-containment

A fresh agent session resuming work MUST be able to proceed using only:

- the triad (`requirements.md`, `design.md`, `trace.md`)
- memex recall (project-tagged)
- the codebase itself

When the cold agent cannot reach high-confidence inference from the above, it MUST pause and ask the user rather than guess. Acceptable interruption frequency: 1-2 questions per cold handoff per project.

## sdd-workflow/REQ-013: Trial window and success metric

Self-imposed evaluation window: 2 weeks from first real task.

Success criteria:

- Token usage ≥30% lower than baseline `oh-my-openagent` workflow on comparable tasks, OR
- Subjective workflow throughput improved without token regression.

If neither holds after 2 weeks, revert.

## sdd-workflow/REQ-014: Spec change proposals as deltas, not in-place edits

After the initial triad (`requirements.md` + `design.md` + `trace.md`) exists, every subsequent grill / spec evolution MUST produce a **change proposal** in `docs/spec/changes/<slug>/` containing `delta-requirements.md` and `delta-design.md`, rather than editing the main triad files directly.

The delta files are reviewed by `@oracle` at the output review gate. Only after approval are the deltas merged into the main triad via the `spec_merge` tool.

Rationale: in-place edits lose the "why we changed" audit trail. A delta + archive flow preserves a forever-grep-able history of every spec change, with the decision context attached.

Inspired by OpenSpec (`openspec/changes/<feat>/`) but adapted to this fork's existing triad layout.

Source: OpenSpec evaluation, 2026-05-24.

## sdd-workflow/REQ-015: Archive merged changes

When a spec_merge succeeds, the change directory MUST be moved (not copied) from `docs/spec/changes/<slug>/` to `docs/spec/archive/YYYY-MM-DD-<slug>/`. The date is the merge date in the local timezone.

Archive entries are read-only by convention; no tool re-opens them for edit. `trace.md` does not include archived changes — it tracks only the current state of the main triad.

Rationale: keeps `changes/` lean (only in-flight work), preserves history under predictable paths for cross-session recall and memex references.

Source: OpenSpec evaluation, 2026-05-24.

## Out of scope (deferred to domain layer / future work)

- Commit message format
- Branch naming convention
- PR description template
- CI configuration
- Deployment pipeline (Ansible / containers / ingress)
- Post-deployment business regression
- Cross-project priority scheduling
- Rollback procedure
- Observability / alerting

## sdd-workflow/REQ-016: Installation guide must front-load the fork-vs-upstream verification gate

Blind installs by an LLM agent will often land on the upstream NPM package
of the same name (`oh-my-opencode-slim`) and silently miss the fork's
SDD/TDD code. The installation guide MUST give the agent a single,
mechanical verification step (grep `spec_propose` in `dist/index.js`)
that decides whether the active plugin source is the fork or upstream,
and a local-checkout fallback to use when the GitHub plugin spec fails
with `git dep preparation failed`.

The verification step MUST appear before any preset / memex / spec-dir
configuration, because none of those have meaning if the loaded plugin
is upstream.

## sdd-workflow/REQ-017: Preset documentation must specify all council edges, not only the median

The fork's council agent is a three-edge structure (alpha / beta / gamma).
The installation guide currently shows only the top-level `council.model`
and leaves `gamma` implicit, which causes downstream presets to ship a
two-edge council that silently falls back at runtime. The guide MUST
include a concrete `council.gamma` example (with a real model id) and
state that omitting `gamma` is a configuration error, not a default.

## sdd-workflow/REQ-018: Workflow documentation must define when the agent may stop to ask the user

Without an explicit interaction discipline, the orchestrator and grill
skill tend to escalate decisions the agent could make itself. The
installation guide MUST define a short, enumerated list of cases that
warrant a human-decision stop, and state that everything outside that
list is the agent's call. The grill skill's phase-4 anti-patterns MUST
be hardened to refuse escalations that grep / file-read / doc-fetch
could have resolved in phase 3.

## sdd-workflow/REQ-019: AGENTS.md must document the local-plugin dev loop

When the OpenCode `plugin` array points at a local checkout of this
repo (the recommended setup for fork-development), agents editing
TypeScript sources will silently run stale code unless they rebuild
`dist/` and restart OpenCode. AGENTS.md MUST state the three-step
loop — edit TS → `bun run build:plugin` → restart OpenCode — and
flag the two non-obvious traps:

1. OpenCode loads `dist/index.js`, not the TS sources, so an edit
   without a rebuild has no effect.
2. OpenCode does not hot-reload plugins, so a rebuild without a
   restart also has no effect.

The doc MUST also note that `bun run build:plugin` is the right
script for a fast iteration loop (it skips CLI build, type
declarations, and schema generation that `bun run build` adds).

## sdd-workflow/REQ-020: Spec layout is two-tier (domain + job)

Spec lives under `docs/spec/domains/<domain>/{requirements,design,trace}.md`
(long-lived, per-subsystem) and `docs/spec/jobs/<slug>/` (one-shot
change container, MAY span multiple domains). REQ/DES ids are
domain-scoped: heading form `## <domain>/REQ-N:` and `## <domain>/DES-N:`.
On merge, job deltas distribute back to each target domain trunk; on
archive, the whole job dir moves to `archive/YYYY-MM-DD-<slug>/` as
an immutable snapshot.

Anchors in domain design.md MAY be bare (`Rationale anchor: REQ-3`,
resolved against the file's domain). Anchors in job delta-design.md
MUST be fully qualified (`Rationale anchor: auth/REQ-3, payment/REQ-1`).

Domain naming is free-form kebab-case enforced only by the heading
regex; reuse-vs-new is an agent behavior rule documented in the grill
skill, not a runtime check.

Legacy single-trunk layout (`docs/spec/{requirements,design}.md` at
the spec root) is migrated by `scripts/migrate-spec-to-domains.ts`
into `domains/<chosen-domain>/`, with `changes/<slug>/` re-homed to
`jobs/<slug>/`. The script is idempotent (`.migrated-to-domains`
marker) and preserves legacy files as `*.legacy` for review.

## sdd-workflow/REQ-021: Task packages for spec-backed execution

For spec-backed non-trivial SDD execution, the workflow MUST require
job-local task packages before implementation is delegated to `@fixer`,
`@designer`, or any other write-capable specialist.

All work under `docs/spec/jobs/<slug>/` is non-trivial by default unless it is
explicitly marked as a trivial documentation-only correction. Trivial direct
edits remain exempt from task packages.

A task package is mandatory when any of the following are true:

- the work is derived from a spec job,
- the change touches more than one functional module,
- the change introduces or changes user-visible behavior,
- the change introduces or changes API-visible behavior,
- the change adds or changes a service, router, workflow, storage boundary, or
  UI screen,
- the work delegates implementation to a write-capable specialist,
- the work requires output review against `REQ` / `DES` anchors.

Each task package MUST include:

- stable `TASK-ID`,
- associated `REQ` and `DES` anchors,
- owner,
- status,
- target behavior stated as observable outcomes,
- file or directory boundary,
- implementation responsibilities,
- explicit out-of-scope boundaries,
- existing contracts that must be preserved,
- acceptance checks,
- validation command or smoke procedure,
- completion evidence fields,
- anti-shell rules.

Task packages are planning artifacts, not implementation artifacts. The
orchestrator owns task package creation during SDD decomposition. `@fixer`
MUST NOT derive task boundaries from broad `REQ` / `DES` sections.

Before any write-capable implementation delegation, the orchestrator MUST
produce or update `docs/spec/jobs/<slug>/tasks.md` and pass mandatory
task-package review by `@oracle`. The review result MUST be recorded in the
job-local artifact so a cold session can recover the gate state.

After task-package review passes, the orchestrator MUST explicitly report that
the job is ready for execution and ask for, or record, execution authorization
unless the user has already requested autonomous execution. The readiness state
MUST be recorded in the job-local artifact.

Implementation MUST NOT be delegated while task-package review is `pending` or
`failed`, or while execution readiness is not authorized.

## sdd-workflow/REQ-022: Anti-shell completion evidence

For spec-backed non-trivial SDD execution, task completion MUST be based on
observable behavior and validation evidence, not on the existence of diffs or
structural scaffolding.

A task MUST NOT be marked `complete` if any acceptance check is satisfied only
by shell, stub, placeholder, TODO, disconnected UI, unmounted API, unused
service, unused schema/model, or fixture-only behavior.

`@fixer` MUST return completion evidence but MUST NOT mark a task package as
`complete`. Only the orchestrator may mark a task `complete`, and only after it
has inspected the diff, acceptance checks, validation results, and anti-shell
constraints.

Output review MUST fail when task completion evidence does not demonstrate
real behavior through a reachable path, direct test, or documented smoke.

Fixture-only behavior is allowed only when the task is explicitly labelled
`demo-only` or `test-fixture-only`, and the task acceptance criteria state that
it is not production-path behavior.

The trace artifact SHOULD include task mappings for active open jobs. Task
details MUST remain in the job-local `tasks.md`; trace files store only task id
references.

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
