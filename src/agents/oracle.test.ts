import { describe, expect, test } from 'bun:test';
import { createOracleAgent } from './oracle';

describe('oracle output review anti-shell gate', () => {
  test('prompt requires anti-shell completion evidence review semantics', () => {
    const oracle = createOracleAgent('test/model');
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
});
