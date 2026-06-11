# Tasks: codegraph-mcp-gate

This file is the job-local execution contract. For spec-backed non-trivial SDD
jobs, implementation MUST NOT be delegated until task packages are authored and
mandatory task-package review passes.

## Task Package Review

Task Package Review.Status: passed
Reviewer: @oracle
Reviewed at: 2026-06-12
Human-facing: partial

### Design Handoff Review

Status: passed
Reviewer: @oracle
Reviewed at: 2026-06-12
Routing on failure: @designer | @orchestrator | @oracle

### Review Scope

- Check all task packages against `codegraph/REQ-*` and `codegraph/DES-*`.
- Check boundaries, acceptance checks, validation, completion evidence fields,
  and anti-shell rules.
- Check that human-facing `/codegraph` output has a sufficient interaction
  contract before implementation.

### Required Fixes

- None.

For Human-facing: yes | partial, complete Design Handoff Review before
implementation delegation and include a UI / Interaction Handoff Contract.
The contract must cover product behavior, interaction flow, state lifecycle,
copy semantics, validation strategy, visual reference level when relevant, and
Red Strategy.

## Execution Readiness

Execution Readiness.Status: authorized
Authorized by: user requested continued SDD execution; @oracle entry review
Authorized at: 2026-06-12
Scope: task packages must be reviewed before implementation delegation.

### Readiness Summary

- Task-package review status: passed.
- Next executable tasks: TASK-001, then TASK-002, then TASK-003.
- Required validation: focused Bun tests, typecheck, check:ci, and build.
- Risks/blockers: command output is human-facing; CodeGraph process calls must be
  mockable and must not initialize projects during plugin startup.

---

## TASK-001: Binary-ready MCP config and default access

Anchors: codegraph/REQ-1, codegraph/REQ-3, codegraph/DES-1,
codegraph/DES-3
Owner: @fixer
Status: complete
Human-facing: no

### Goal

Expose CodeGraph as a built-in local MCP only when a compatible CodeGraph binary
is available, and align default agent MCP access with the graph-navigation use
case.

### Boundaries

- Files/directories expected to change:
  - `src/config/schema.ts`
  - `src/config/agent-mcps.ts`
  - `src/config/agent-mcps.test.ts`
  - `src/index.ts`
  - `src/mcp/index.ts`
  - `src/mcp/index.test.ts`
  - small CodeGraph helper files under `src/tools/codegraph/` or `src/mcp/`
    only as needed for shared probe/config logic
- Files/directories that must not change:
  - no implementation changes under `dist/`
  - no mutation of `.codegraph/` or repository index files
  - no broad agent prompt rewrites
- Existing contracts that must be preserved:
  - existing MCPs (`websearch`, `context7`, `grep_app`) keep their names and
    disable behavior;
  - disabled MCPs always win over auto-registration;
  - plugin startup must fail open if CodeGraph is missing or incompatible.

### Implementation Requirements

- Add `codegraph` to the built-in MCP name schema.
- Add a version/capability probe with minimum version `0.9.9`.
- Register a local CodeGraph MCP only when the probe reports ready and
  `disabled_mcps` does not include `codegraph`.
- Do not check `.codegraph/codegraph.db` or initialize the project while building
  the MCP map.
- Update default MCP policy so orchestrator includes CodeGraph through wildcard,
  explorer and oracle get explicit CodeGraph access, and fixer remains denied by
  default.

### Acceptance Checks

- With a mocked compatible binary, `createBuiltinMcps` includes `codegraph` with
  a local command config.
- With missing or too-old binary, `createBuiltinMcps` omits `codegraph` without
  throwing.
- `disabled_mcps: ['codegraph']` omits CodeGraph even when the binary is ready.
- Existing MCP registration tests still pass for the other MCPs.
- Agent MCP parsing grants CodeGraph to orchestrator, explorer, and oracle by
  default, but not fixer.
- The generated local MCP command explicitly includes the resolved current
  project/worktree path passed from plugin startup.
- MCP registration tests prove the factory does not inspect
  `.codegraph/codegraph.db` and does not run init/index commands.

### Validation

- Command: `bun test src/mcp/index.test.ts src/config/agent-mcps.test.ts`
- Expected result: all tests pass after first observing relevant red failures.

### Completion Evidence

- Files changed: `src/config/schema.ts`, `src/config/agent-mcps.ts`,
  `src/config/agent-mcps.test.ts`, `src/index.ts`, `src/mcp/index.ts`,
  `src/mcp/index.test.ts`.
- Acceptance checks satisfied: compatible probe registers local CodeGraph MCP
  with `codegraph serve --mcp --path <projectPath>`; missing and too-old probes
  omit CodeGraph without throwing; disabled CodeGraph skips probing; default MCP
  policy grants CodeGraph to orchestrator/explorer/oracle and denies fixer.
- Validation run: `/root/.bun/bin/bun test src/mcp/index.test.ts src/config/agent-mcps.test.ts`.
- Result: passed, 26 tests, 0 failures.
- Reviewer notes: orchestrator inspected the diff after Green/Refactor and fixed
  the `src/index.ts` startup callsite so real plugin initialization passes
  `ctx.worktree` into `createBuiltinMcps`.

### Anti-Shell Rules

- Do not satisfy this task with a static `codegraph` entry that ignores binary
  version compatibility.
- Do not add placeholder probes that always report ready.
- Do not silently create or update `.codegraph/` during MCP registration.
- Do not mark task complete without focused tests for ready, missing, too-old,
  and disabled cases.

---

## TASK-002: `/codegraph` readiness command manager

Anchors: codegraph/REQ-1, codegraph/REQ-2, codegraph/REQ-3,
codegraph/DES-2, codegraph/DES-3
Owner: @fixer
Status: complete
Human-facing: yes

### UI / Interaction Handoff Contract

Context and user goal: users need to make CodeGraph usable per project/worktree,
especially when an `opencode serve` process is already running and the desktop
client cannot see newly initialized tools until MCP registration is already
binary-ready.

Primary path:

1. User runs `/codegraph` or `/codegraph status`.
2. The command prints a concise readiness report with binary/version, project
   root, worktree note, ignore state, index state, and next action.
3. If safe, user runs `/codegraph init` to initialize/index the current
   worktree.
4. User can later run `/codegraph reindex` to refresh the existing index.

State lifecycle:

- `missing-binary`: show install/upgrade hint; do not run project commands.
- `too-old`: show detected and required versions; do not register or run init.
- `not-git-worktree`: report unsupported project-root resolution.
- `not-ignored`: block init and ask user to add `.codegraph/` to `.gitignore`.
- `large-repo`: block init with tracked-file count and threshold.
- `not-initialized`: status suggests `/codegraph init`.
- `ready`: status says MCP/project are ready.
- `running`: init/reindex duplicate says an operation is already running.
- `command-error`: show the failed step and concise stderr/message.

Copy semantics:

- Use direct labels such as `CodeGraph status`, `Next action`, `Project`,
  `Binary`, `Index`.
- Error text must name the blocked gate and one concrete recovery action.
- Do not imply tests are covered by CodeGraph; command text should avoid phrases
  like “verified by affected tests”.

Validation strategy / Red Strategy:

- Unit tests drive `handleCommandExecuteBefore` with injected fake command
  runners and assert output text for status, init gate failures, successful init,
  reindex, duplicate running operations, and unknown usage.
- No screenshot or browser validation is needed; this is CLI/text output.

Reference level: none.

### Boundaries

- Files/directories expected to change:
  - new command/readiness files under `src/tools/codegraph/`
  - `src/tools/index.ts`
  - `src/index.ts`
  - tests under `src/tools/codegraph/`
- Files/directories that must not change:
  - no broad rewrites of unrelated command managers
  - no direct edits to generated `dist/`
  - no real `.codegraph/` DB mutation in tests
- Existing contracts that must be preserved:
  - command managers register without overwriting user-defined commands;
  - command interception clears template output and returns internal-agent text;
  - plugin startup must not block on project readiness.

### Implementation Requirements

- Implement `/codegraph` command registration and interception.
- Support no-arg/status, init, reindex, and unknown-arg usage.
- Resolve current git worktree root from `ctx.directory` or command context
  directory if available.
- Use `realpath(worktreeRoot)` for single-flight keys.
- Check `.codegraph/` ignore readiness before init.
- Use `git ls-files` tracked count for the default large-repo threshold around
  `3000`.
- Run CodeGraph init/index commands with the worktree root as project path.
- Make process execution injectable/mocked in tests.

### Acceptance Checks

- `registerCommand` adds `/codegraph` and does not overwrite an existing command.
- `/codegraph status` reports binary/version compatibility, project root,
  worktree context, `.codegraph/` ignore readiness, index presence, high-level
  index status/freshness when available, and a next action.
- Status tests assert user-facing copy and next action for at least
  `ready`, `not-initialized`, `not-ignored`, `too-old`, and `missing-binary`.
- `/codegraph init` refuses missing binary, too-old binary, missing ignore, and
  large repo cases.
- `/codegraph init` runs the expected CodeGraph commands only after gates pass.
- `/codegraph reindex` requires an existing index and uses the current worktree.
- Duplicate init/reindex for the same real worktree returns an already-running
  message instead of spawning a second process.

### Validation

- Command: `bun test src/tools/codegraph`
- Expected result: all CodeGraph command/readiness tests pass after first
  observing relevant red failures.

### Completion Evidence

- Files changed: `src/tools/codegraph/command.ts`,
  `src/tools/codegraph/command.test.ts`, `src/tools/codegraph/index.ts`,
  `src/tools/index.ts`, `src/index.ts`.
- Acceptance checks satisfied: `/codegraph` command registration preserves user
  commands; status/no-arg output clears template text and reports binary,
  project, worktree, ignore, index, and next action fields; status copy covers
  ready, not-initialized, not-ignored, too-old, and missing-binary; init blocks
  unsafe gates and runs CodeGraph init/index only after gates pass; reindex
  requires an existing index; duplicate init/reindex uses a per-worktree
  single-flight guard; command failures render a user-facing `command-error`;
  unknown args return concise usage.
- Validation run: `/root/.bun/bin/bun test src/tools/codegraph src/mcp/index.test.ts src/config/agent-mcps.test.ts`; `/root/.bun/bin/bun run typecheck`; `/root/.bun/bin/bun run check:ci`.
- Result: focused tests passed, 46 tests, 0 failures; typecheck passed; Biome
  check:ci passed; full tests later passed with 1273 tests, 0 failures.
- Reviewer notes: orchestrator adjusted init/index command tests and
  implementation to use CodeGraph's actual positional project path syntax for
  `codegraph init <path>` and `codegraph index <path>`. Output-review fixes add
  `ctx.worktree` MCP binding, `codegraph status --json <worktree>` summary when
  available, and command-error output for init/index failures.

### Anti-Shell Rules

- Do not satisfy command behavior with static text that never calls readiness
  helpers.
- Do not bypass safety gates in tests by marking every fake project ready.
- Do not run real project init/reindex in unit tests.
- Do not expose `/codegraph init` as a prompt template only; it must be handled
  by the command hook.

---

## TASK-003: Documentation, schema generation, and full verification

Anchors: codegraph/REQ-1, codegraph/REQ-2, codegraph/REQ-3,
codegraph/DES-3
Owner: @fixer
Status: complete
Human-facing: partial

### UI / Interaction Handoff Contract

Context and user goal: documentation readers need to understand that CodeGraph
is optional, binary-gated, and initialized per project/worktree.

Primary path:

- README/docs mention install/availability briefly, point users to
  `/codegraph status` and `/codegraph init`, and warn that normal tests remain
  required.

Copy semantics:

- Use “optional”, “compatible CodeGraph binary”, “per worktree”, and “advisory”
  consistently.
- Do not promise automatic indexing or test coverage from CodeGraph.

Validation strategy / Red Strategy:

- Schema generation diff exists when schema changes.
- Focused docs check verifies changed docs contain `/codegraph status`,
  `/codegraph init`, and `.codegraph/` ignore guidance.

Reference level: none.

### Boundaries

- Files/directories expected to change:
  - `README.md` and/or relevant docs under `docs/`
  - `oh-my-opencode-slim.schema.json` if schema generation changes it
  - SDD job `tasks.md` completion evidence
- Files/directories that must not change:
  - no generated `dist/` edits unless the repository's build process requires
    them for release, in which case document why
- Existing contracts that must be preserved:
  - repository docs stay aligned with AGENTS.md command list and config schema;
  - final verification follows repo workflow.

### Implementation Requirements

- Regenerate JSON schema after config/schema changes.
- Update user-facing docs for CodeGraph setup and `/codegraph` usage.
- Run focused tests from TASK-001 and TASK-002, then broader repository checks.
- Record completion evidence in this task package without claiming `affected` as
  verification.

### Acceptance Checks

- Generated schema includes `codegraph` in MCP name/config surfaces where
  relevant.
- Docs describe binary-ready MCP registration, explicit project init, per-worktree
  indexes, and `.codegraph/` ignore requirement.
- Docs state normal verification still requires tests/typecheck/lint or relevant
  smoke checks.

### Validation

- Commands:
  - `bun test src/mcp/index.test.ts src/config/agent-mcps.test.ts src/tools/codegraph`
  - `bun run typecheck`
  - `bun run check:ci`
  - `bun run build`
- Expected result: all pass, or any failure is documented as pre-existing with
  evidence.

### Completion Evidence

- Files changed: `README.md`, `docs/mcps.md`, `docs/quick-reference.md`,
  `oh-my-opencode-slim.schema.json`, and task evidence in this file.
- Acceptance checks satisfied: generated schema mentions `codegraph` in the MCP
  agent-access and global-disable descriptions; docs describe optional
  binary-ready registration, `/codegraph status`, `/codegraph init`,
  `/codegraph reindex`, per-worktree `.codegraph/` indexes, the ignore
  requirement, and that CodeGraph results do not replace normal verification.
- Validation run: `/root/.bun/bin/bun test`; `/root/.bun/bin/bun run typecheck`;
  `/root/.bun/bin/bun run check:ci`; `PATH="/root/.bun/bin:$PATH" bun run build`.
- Result: full test suite passed, 1273 tests, 0 failures; typecheck passed;
  check:ci passed; build passed and regenerated schema.
- Reviewer notes: schema generation required adding `/root/.bun/bin` to PATH
  because the package script invokes `bun` internally.

### Anti-Shell Rules

- Do not skip schema generation after schema changes.
- Do not document behavior that tests do not cover.
- Do not cite CodeGraph `affected` output as completion proof.
