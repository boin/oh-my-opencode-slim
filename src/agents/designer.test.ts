import { describe, expect, test } from 'bun:test';
import { createAgents } from './index';

describe('designer SDD handoff contract', () => {
  test('prompt requires contract-first design synthesis', () => {
    const designer = createAgents().find((agent) => agent.name === 'designer');
    expect(designer).toBeDefined();
    if (!designer) return;
    const prompt = designer.config.prompt;

    expect(prompt).toContain('contract-first');
    expect(prompt).toContain('UI / Interaction Handoff Contract');
    expect(prompt).toContain('human-deliverable');
    expect(prompt).toContain('Reference levels');
    expect(prompt).toContain('Level 1 Inspired');
    expect(prompt).toContain('Level 2 Close Reference');
    expect(prompt).toContain('Level 3 High-Similarity Reference');
    expect(prompt).toContain('directly edit code only for visual polish');
    expect(prompt).toContain('Red Strategy');
  });
});
