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

  test('includes Design Synthesis Gate for human-facing work', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Design Synthesis Gate');
    expect(block).toContain('Human-facing: yes | no | partial');
    expect(block).toContain('one short clarification question');
    expect(block).toContain('agent team owns UX synthesis');
    expect(block).toContain('UI / Interaction Handoff Contract');
    expect(block).toContain('Design Handoff Review');
    expect(block).toContain('Red Strategy');
    expect(block).toMatch(/reference|Level 3/);
  });

  test('includes minor bounded change exemption wording', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Minor bounded changes');
    expect(block).toMatch(/skip[^.]*spec_propose/i);
    expect(block).toMatch(/skip[^.]*task package/i);
    expect(block).toMatch(/skip[^.]*Design Handoff Review/i);
  });

  test('keeps full SDD fallback for unsafe minor bounded changes', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toMatch(/high-risk[^.]*full SDD/i);
    expect(block).toMatch(/ambiguous[^.]*full SDD/i);
    expect(block).toMatch(/boundar(?:y|ies)[^.]*full SDD/i);
  });

  test('does not hard-code all new behavior as full SDD', () => {
    const block = buildSddTddAppendBlock();

    expect(block).not.toContain('introduces new behavior');
  });

  test('block fits within 400 lines (token budget guard)', () => {
    const block = buildSddTddAppendBlock();
    const lines = block.split('\n').length;
    expect(lines).toBeLessThan(400);
  });
});
