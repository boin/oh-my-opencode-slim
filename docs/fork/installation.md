# Fork installation addendum

<!-- slim-fork-addendum: SDD/TDD/memex/grill — keep delimited for upstream merges -->

### Step 4.5: Verify Active Plugin Source (Fork-Specific)

The npm package `oh-my-opencode-slim` resolves to **upstream**, which does
NOT carry the fork's `spec_propose` / `spec_merge` / `spec_archive` /
`trace_regenerate` tools or the grill skill. Do not skip this step — the
remaining fork-specific steps are no-ops if the loaded plugin is upstream.

Decision tree for the agent:

1. **First attempt** — install from GitHub:
   ```bash
   opencode plugin install boin/oh-my-opencode-slim
   ```
   If this succeeds, jump to the verification gate below.

2. **Fallback if step 1 fails with `git dep preparation failed`** —
   local checkout:
   ```bash
   git clone https://github.com/boin/oh-my-opencode-slim.git \
     ~/.config/opencode/plugins/oh-my-opencode-slim-sdd
   cd ~/.config/opencode/plugins/oh-my-opencode-slim-sdd
   bun install && bun run build
   ```
   Then edit `~/.config/opencode/opencode.json` and add the absolute
   path as a string entry in the `plugin` array (alongside any other
   plugins). Do not put it under `plugin.<name>`; it is a plain
   string entry.

3. **Verification gate (mandatory, runs regardless of which path
   succeeded above):**
   ```bash
   grep -l spec_propose \
     ~/.config/opencode/plugins/oh-my-opencode-slim-sdd/dist/index.js
   # — or, if installed via opencode plugin install: —
   grep -rl spec_propose ~/.local/share/opencode/plugins/oh-my-opencode-slim*/dist/
   ```
   A hit means the fork is loaded. **No hit** means upstream is loaded —
   stop, undo, and re-do steps 1 or 2.

### Step 5: Apply the SDD/TDD Preset (Fork-Specific)

This fork ships an opinionated preset wired for **Opus brain + GPT hands + Gemini at edges**, with `memex` as the cross-session memory and `@oracle` as the sole writer.

Reference: `docs/spec/preset-example.jsonc` in the fork source.

Decision tree for the agent:

1. **User has a private gateway (model names are not official):**
   - First add a custom provider to `~/.config/opencode/opencode.json`:
     ```json
     {
       "provider": {
         "<alias>": {
           "npm": "@ai-sdk/openai-compatible",
           "name": "<Gateway Name>",
           "options": {
             "baseURL": "https://<gateway>/v1",
             "apiKey": "{env:<ALIAS>_API_KEY}"
           },
           "models": {
             "claude":  { "name": "<alias> Claude (Opus-class)" },
             "gpt":     { "name": "<alias> GPT-5.5" },
             "gemini":  { "name": "<alias> Gemini Pro" }
           }
         }
       }
     }
     ```
   - Then in `~/.config/opencode/oh-my-opencode-slim.json`, replace every `anthropic/claude-opus-4-7` with `<alias>/claude`, every `openai/gpt-5.5` with `<alias>/gpt`, and `google/gemini-3-pro` (in council `gamma`) with `<alias>/gemini`.
   - If different real models live on different gateways, split into multiple providers (`<alias>-claude`, `<alias>-gpt`, ...) rather than stuffing one block.

2. **User uses official providers:** copy `docs/spec/preset-example.jsonc` verbatim into `~/.config/opencode/oh-my-opencode-slim.json`, then run `opencode models --refresh` and adjust model IDs to whatever the refresh lists (provider tails sometimes carry version suffixes).

**Variants in the preset (do not silently flatten):**
- `oracle.variant: high` — high reasoning effort, used at entry/output review gates.
- `librarian/explorer/fixer.variant: low` — cheap execution.
- `designer.variant: medium` — UI polish needs more thought than rote edits.

**Council requires three edges (alpha / beta / gamma):**
The council agent is a three-edge debate, not a single model. Omitting
`gamma` silently degrades it to two edges — the third edge IS the
disagreement signal, not a fallback. Both council blocks below are
valid skeletons:

```jsonc
// Gateway variant — gamma is the gateway-mapped Gemini
"council": {
  "model":  "<alias>/claude",   // alpha (presiding)
  "alpha":  { "model": "<alias>/claude" },
  "beta":   { "model": "<alias>/gpt" },
  "gamma":  { "model": "<alias>/gemini" }
}

// Official-providers variant
"council": {
  "model":  "anthropic/claude-opus-4-7",
  "alpha":  { "model": "anthropic/claude-opus-4-7" },
  "beta":   { "model": "openai/gpt-5.5" },
  "gamma":  { "model": "google/gemini-3-pro" }
}
```

If the third edge is genuinely unavailable in the user's environment,
substitute another model from a different provider family (e.g. a free
DeepSeek/Qwen tier) rather than dropping `gamma` entirely.

### Step 6: Install memex MCP and Respect Its Write Boundary

The preset wires `memex` to `orchestrator` (read) and `oracle` (read + write). This is enforced at the **prompt level**, not the config level — the agent must not save memories from any role other than `@oracle`.

1. Install per memex upstream docs (https://github.com/getmemex/memex). Ensure it appears as an available MCP in `opencode mcp list`.

2. Verify the preset already includes `"memex"` in:
   - `presets.<active>.orchestrator.mcps`
   - `presets.<active>.oracle.mcps`

3. Tell the user:
   - `@oracle` is the **sole writer**. Pitfall lessons + good-pattern notes only.
   - `@orchestrator` is a **reader**. It calls `recall_memories` before launching each background specialist task.
   - Never let other agents (`fixer`, `librarian`, `explorer`, `designer`) touch memex — they are not in the preset by design.

4. Sanity check after first run:
   ```text
   @oracle: save a test memory tagged "smoke-test"
   @orchestrator: recall memories tagged "smoke-test"
   ```
   Both should succeed. Then have the user delete the test card.

### Step 7: Initialize SDD Spec Directory in the Target Project

The fork's orchestrator follows an SDD/TDD workflow that expects `docs/spec/{requirements,design,trace}.md` in the project being worked on (not in the fork itself).

For each new project the user wants to drive with this fork:

1. From the project root:
   ```bash
   mkdir -p docs/spec
   ```

2. Start `opencode` and tell the orchestrator:
   ```text
   /grill <one-paragraph description of what you want to build>
   ```

3. The orchestrator will:
   - Enter the four-phase grill (assumptions → risks → self-answerable Qs → human-decision Qs).
   - For every external dependency mentioned, force both **read** and **write** responsibilities to be defined.
   - Converge within **3 rounds** or halt with the residual question list.
   - Emit `docs/spec/requirements.md` and `docs/spec/design.md`.
   - Run `trace_regenerate` to produce `docs/spec/trace.md`.

4. From that point on, the orchestrator self-injects the SDD/TDD discipline block at every turn (via `buildSddTddAppendBlock`) and the `trace-freshness` hook auto-regenerates `trace.md` whenever `requirements.md` or `design.md` is touched. No further user action needed for housekeeping.

**If the project is trivial** (typo / one-line fix / no spec-worthy behavior change) the orchestrator skips grill and goes straight to direct-commit per the routing rules in the discipline block.

### Step 8: Interaction Discipline (Fork-Specific)

The orchestrator and grill skill default to "make the reasonable call
and keep going" — unnecessary stops to confirm taste-free decisions are
an anti-pattern, not politeness. Stop and ask the user ONLY when one
of these three categories fires:

1. **Genuine human-only judgment** — business priority, scope/quality
   tradeoff, taste call the agent cannot derive from code, spec, or
   docs. Example: "ship the partial fix Friday or hold for the proper
   one Monday".
2. **Irreversible side effect about to happen** — destructive git
   (`reset --hard`, force-push, branch deletion), external API write,
   production deploy, money, messages to other humans, anything the
   user can't trivially undo.
3. **Scope explosion past what was approved** — the task as briefed
   implied N files / M lines and the agent now sees it needs 3×N or
   10×M; reconfirm scope before continuing rather than silently
   ballooning.

Everything outside those three is the agent's call: routing (worktree
vs PR vs direct-commit), model picks within an existing preset, file
layout, test framework conventions, naming. Do not stop to confirm any
of these. If the agent stopped you for something not in the list,
treat it as a process bug and tell it to keep going.

For spec authoring specifically (the grill skill's phase 4), the same
rule applies in a stricter form: any question that grep, a file read,
or a doc fetch could answer belongs in phase 3, not phase 4. See
`src/skills/grill/SKILL.md` § Anti-patterns.

<!-- /slim-fork-addendum -->
