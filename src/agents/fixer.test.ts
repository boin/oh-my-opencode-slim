import { describe, expect, test } from 'bun:test';
import { createFixerAgent } from './fixer';

describe('fixer completion contract', () => {
  test('prompt requires task-package boundaries and completion evidence', () => {
    const fixer = createFixerAgent('test/model');
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
});
