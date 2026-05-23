import { describe, expect, test } from 'bun:test';
import { buildSddTddAppendBlock } from './append-prompt';

describe('append-prompt', () => {
  test('includes SDD workflow header', () => {
    const block = buildSddTddAppendBlock();
    expect(block).toContain('SDD workflow');
  });

  test('includes the three triad filenames', () => {
    const block = buildSddTddAppendBlock();
    expect(block).toContain('requirements.md');
    expect(block).toContain('design.md');
    expect(block).toContain('trace.md');
  });

  test('includes routing decision tree with all three routes', () => {
    const block = buildSddTddAppendBlock();
    expect(block).toContain('worktree');
    expect(block).toContain('PR');
    expect(block).toContain('direct');
  });

  test('includes distilled TDD rules', () => {
    const block = buildSddTddAppendBlock();
    expect(block).toContain('Red');
    expect(block).toContain('Green');
    expect(block).toContain('Refactor');
  });

  test('includes memex read/write contract', () => {
    const block = buildSddTddAppendBlock();
    expect(block).toContain('recall_memories');
    expect(block).toContain('save_memory');
  });

  test('mentions trace_regenerate tool by name', () => {
    const block = buildSddTddAppendBlock();
    expect(block).toContain('trace_regenerate');
  });

  test('mentions spec_propose / spec_merge / spec_archive lifecycle', () => {
    const block = buildSddTddAppendBlock();
    expect(block).toContain('spec_propose');
    expect(block).toContain('spec_merge');
    expect(block).toContain('spec_archive');
  });

  test('block fits within 400 lines (token budget guard)', () => {
    const block = buildSddTddAppendBlock();
    const lines = block.split('\n').length;
    expect(lines).toBeLessThan(400);
  });
});
