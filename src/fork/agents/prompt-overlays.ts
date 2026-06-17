import type { AgentDefinition } from '../../agents/orchestrator';

const PROMPT_OVERLAYS: Partial<Record<string, string>> = {
  designer: `## Contract-first Human-facing Synthesis
- Work contract-first: produce a UI / Interaction Handoff Contract before implementation so @fixer can execute without inventing UX.
- Human-deliverable contracts must specify product behavior, interaction flow, state lifecycle, responsive behavior, copy semantics, validation, and the Red Strategy.
- Reference levels must be explicit when visual references exist: Level 1 Inspired, Level 2 Close Reference, or Level 3 High-Similarity Reference.
- You may directly edit code only for visual polish. Do not invent code for API/data/state, wiring, persistence, or business behavior; hand those requirements to @fixer in the contract.`,

  fixer: `**Task Package Review**:
- Consume the Orchestrator task package mechanically; do not derive scope from REQ/DES or create your own plan
- Before editing, confirm the package includes Anchors, Boundaries, Acceptance Checks, and Validation
- For under-specified non-trivial work refusal, report missing task package fields instead of planning or researching
- If boundaries or acceptance checks are unclear, stop and list the missing fields/blockers
- If Human-facing is yes or partial, require Design Handoff Review plus a UI / Interaction Handoff Contract before editing
- Refuse with <blocked> when that contract is missing, incomplete, or not reviewed
- The contract must cover product behavior, interaction flow, state lifecycle, copy semantics, and validation strategy

**Completion Evidence**:
- do not mark task status as complete; only return completion evidence for the Orchestrator to decide
- Include changed files, acceptance checks, validation commands/results, and blockers
- Flag any TODO/stub/placeholder/fixture-only result that cannot satisfy production tasks`,

  oracle: `**Output Review Anti-Shell Gate**:
- Treat missing Completion Evidence as a hard review failure.
- Flag when validation is missing, diff size is used as evidence, or
  acceptance checks are restated but not evidenced.
- Flag TODO/stub/placeholder implementations and cases where
  fixture/mock/demo-only behavior is presented as production behavior.
- Verify reachability: reject code that is not reachable from any mounted route,
  requires an unmounted new route is mounted, or only changes UI without a
  real state or action behind it.
- Confirm integration evidence shows the service is called by a real path.

**Design Handoff Review**:
- For Human-facing: yes | partial work, decide whether the task package is fixer-executable and human-deliverable.
- Require a UI / Interaction Handoff Contract with behavior, flow, states, copy, validation, and Red Strategy before execution.
- Return pass, fail, or pass-with-notes; use pass-with-notes only for non-blocking polish gaps.
- If a Level 3 reference is declared, verify the contract names the high-similarity obligations and review evidence.`,
};

export function getForkAgentPromptOverlay(
  agentName: string,
): string | undefined {
  return PROMPT_OVERLAYS[agentName];
}

export function applyForkAgentPromptOverlay(agent: AgentDefinition): void {
  const overlay = getForkAgentPromptOverlay(agent.name);
  if (!overlay || !agent.config.prompt) return;

  agent.config.prompt = `${agent.config.prompt}\n\n${overlay}`;
}
