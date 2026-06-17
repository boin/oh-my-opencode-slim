import { describe, expect, test } from 'bun:test';
import { createAgents } from './index';

describe('fixer completion contract', () => {
  test('prompt requires task-package boundaries and completion evidence', () => {
    const fixer = createAgents().find((agent) => agent.name === 'fixer');
    expect(fixer).toBeDefined();
    if (!fixer) return;
    const prompt = fixer.config.prompt;

    expect(prompt).toContain('under-specified non-trivial work refusal');
    expect(prompt).toContain('missing task package fields');
    expect(prompt).toContain('Anchors');
    expect(prompt).toContain('Boundaries');
    expect(prompt).toContain('Acceptance Checks');
    expect(prompt).toContain('Validation');
    expect(prompt).toContain('Completion Evidence');
    expect(prompt).toContain('Task Package Review');
    expect(prompt).toMatch(
      /do not mark task status as complete|MUST NOT mark task status as `complete`/,
    );
    expect(prompt).toContain('changed files');
    expect(prompt).toContain('acceptance checks');
    expect(prompt).toContain('validation commands/results');
    expect(prompt).toContain('blockers');
    expect(prompt).toContain('TODO/stub/placeholder/fixture-only');
    expect(prompt).toContain('cannot satisfy production tasks');
  });

  test('prompt blocks human-facing work without reviewed design handoff', () => {
    const fixer = createAgents().find((agent) => agent.name === 'fixer');
    expect(fixer).toBeDefined();
    if (!fixer) return;
    const prompt = fixer.config.prompt;

    expect(prompt).toContain('Human-facing');
    expect(prompt).toContain('Design Handoff Review');
    expect(prompt).toContain('UI / Interaction Handoff Contract');
    expect(prompt).toContain('missing, incomplete, or not reviewed');
    expect(prompt).toContain(
      'product behavior, interaction flow, state lifecycle',
    );
    expect(prompt).toContain('copy semantics');
    expect(prompt).toContain('validation strategy');
    expect(prompt).toContain('<blocked>');
  });
});
