import { describe, expect, test } from 'bun:test';
import { createAgents } from './index';

describe('oracle output review anti-shell gate', () => {
  test('prompt requires anti-shell completion evidence review semantics', () => {
    const oracle = createAgents().find((agent) => agent.name === 'oracle');
    expect(oracle).toBeDefined();
    if (!oracle) return;
    const prompt = oracle.config.prompt;

    expect(prompt).toContain('Output Review Anti-Shell Gate');
    expect(prompt).toContain('Completion Evidence');
    expect(prompt).toContain('validation is missing');
    expect(prompt).toContain(
      'acceptance checks are restated but not evidenced',
    );
    expect(prompt).toContain('TODO/stub/placeholder');
    expect(prompt).toContain(
      'fixture/mock/demo-only behavior is presented as production behavior',
    );
    expect(prompt).toContain('not reachable from any mounted route');
    expect(prompt).toContain('new route is mounted');
    expect(prompt).toContain('UI');
    expect(prompt).toContain('real state or action');
    expect(prompt).toContain('service is called by a real path');
  });

  test('prompt reviews fixer-executable human-deliverable design handoff', () => {
    const oracle = createAgents().find((agent) => agent.name === 'oracle');
    expect(oracle).toBeDefined();
    if (!oracle) return;
    const prompt = oracle.config.prompt;

    expect(prompt).toContain('Design Handoff Review');
    expect(prompt).toContain('fixer-executable');
    expect(prompt).toContain('human-deliverable');
    expect(prompt).toContain('Human-facing: yes | partial');
    expect(prompt).toContain('UI / Interaction Handoff Contract');
    expect(prompt).toContain('pass-with-notes');
    expect(prompt).toContain('Level 3');
    expect(prompt).toContain('Red Strategy');
  });
});
