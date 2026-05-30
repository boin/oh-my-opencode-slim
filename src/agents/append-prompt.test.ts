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

  test('includes module-package gate for non-trivial SDD implementation', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Module Completion Discipline');
    expect(block).toContain('Task package required fields');
    expect(block).toContain('REQ/DES/TASK anchors');
    expect(block).toContain('Boundaries');
    expect(block).toContain('Acceptance Checks');
    expect(block).toContain('Validation');
    expect(block).toContain('Completion Evidence');
    expect(block).toContain('Anti-Shell Rules');

    expect(block).toContain('Task Package Review.Status: passed');
    expect(block).toContain('mandatory task-package review');
    expect(block).toContain('Execution Readiness.Status: authorized');
    expect(block).toContain('authorization gate');

    expect(block).toContain('anti-shell review');
    expect(block).toContain('stub');
    expect(block).toContain('placeholder');
    expect(block).toContain('fixture-only');

    expect(block).toContain(
      'Trivial direct edits remain allowed and do not require a task package.',
    );
  });

  test('block fits within 400 lines (token budget guard)', () => {
    const block = buildSddTddAppendBlock();
    const lines = block.split('\n').length;
    expect(lines).toBeLessThan(400);
  });
});
