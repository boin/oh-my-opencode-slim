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

  test('requires fresh git status evidence before route selection', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('inspect fresh git status');
    expect(block).toContain('git status --short --branch');
    expect(block).toContain('verify cwd, branch, and worktree');
    expect(block).toContain('announce the evidence');
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
    expect(block).toContain('proposes review lessons');
    expect(block).toContain('explicit lesson');
    expect(block).toContain('orchestrator decides whether to save');
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
    expect(block).toContain('local structural pass');
    expect(block).toContain('high-risk, ambiguous, multi-task');
    expect(block).toContain('Execution Readiness.Status: authorized');
    expect(block).toContain('re-authorize if scope or risk changes');

    expect(block).toContain('anti-shell review');
    expect(block).toContain('stub');
    expect(block).toContain('placeholder');
    expect(block).toContain('fixture-only');

    expect(block).toContain('Trivial direct edits');
    expect(block).toContain('do not require a task package');
  });

  test('includes Design Synthesis Gate for human-facing work', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Design Synthesis Gate');
    expect(block).toContain('Human-facing: yes | no | partial');
    expect(block).toContain('one short clarification question');
    expect(block).toContain('agent team owns UX synthesis');
    expect(block).toContain('Cosmetic/copy-only human-facing work');
    expect(block).toContain('design implementation');
    expect(block).toMatch(/UI \/\s+Interaction Handoff Contract/);
    expect(block).toContain('Design Handoff Review');
    expect(block).toContain('Red Strategy');
    expect(block).toMatch(/reference|Level 3/);
  });

  test('includes minor bounded change exemption wording', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Fast Path');
    expect(block).toMatch(/skip[^.]*spec_propose/i);
    expect(block).toMatch(/skip[^.]*task\s+package/i);
    expect(block).toMatch(/skip[^.]*Design Handoff Review/i);
  });

  test('keeps full SDD fallback for unsafe minor bounded changes', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Full SDD');
    expect(block).toContain('high-risk');
    expect(block).toContain('ambiguous');
    expect(block).toContain('boundary-crossing');
    expect(block).toContain('disqualifiers override Fast Path');
  });

  test('does not hard-code all new behavior as full SDD', () => {
    const block = buildSddTddAppendBlock();

    expect(block).not.toContain('introduces new behavior');
    expect(block).not.toContain('no new durable behavior');
    expect(block).toContain('local behavior adjustments');
    expect(block).toMatch(/no\s+high-risk durable contract change/);
  });

  test('keeps high-risk surfaces as Fast Path disqualifiers', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Fast Path is disqualified by');
    expect(block).toContain('API/data/');
    expect(block).toContain('security/auth/secrets/persistence/schema');
    expect(block).toContain('permission or workflow boundary changes');
    expect(block).toMatch(/canonical\s+policy\/rule changes/);
    expect(block).toContain('multi-writer scope');
    expect(block).toContain('unclear rollback/acceptance');
  });

  test('includes delegation budget and context preservation gate', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Delegation Budget and Context Preservation');
    expect(block).toContain('Specialist calls are not workflow rituals');
    expect(block).toContain('specialist advantage');
    expect(block).toContain('parallelism');
    expect(block).toContain('risk reduction');
    expect(block).toContain('context isolation');
    expect(block).toContain('fast path');
    expect(block).toContain('compact evidence');
    expect(block).toContain('Verify child outputs proportionally to risk');
    expect(block).toContain('Inline TDD is allowed');
  });

  test('includes lightweight SDD risk gate and tie-breaker', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Lightweight SDD');
    expect(block).toContain('SDD Mode: lightweight');
    expect(block).toContain('Risk Gate: local structural pass');
    expect(block).toContain('Mechanical checks');
    expect(block).toContain('Judgment checks');
    expect(block).toContain('disqualifiers override Fast Path');
    expect(block).toContain('escalate one level only');
  });

  test('requires classification-grade context before mode selection', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('classification-grade context');
    expect(block).toContain('Do not choose mode from file type');
    expect(block).toContain(
      'Mode: No SDD | Fast Path | Lightweight SDD | Full SDD',
    );
    expect(block).toContain('scope, ambiguity, affected surfaces');
    expect(block).toContain('future-agent/session inheritance');
    expect(block).toContain('availability and adequacy of existing roadmap');
  });

  test('keeps prompt and rule edits behavior-aware for TDD exemption', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Docs/prompt/rule/skill/template edits');
    expect(block).toContain('inherited behavior');
    expect(block).toContain('routing, permissions, review gates');
    expect(block).toContain('executable workflows');
  });

  test('keeps oracle review read-only and merge authorized by user', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('returns a read-only verdict');
    expect(block).toContain('Full SDD risk triggers');
    expect(block).toContain('Low-risk Lightweight SDD may skip');
    expect(block).toContain('orchestrator calls');
    expect(block).toContain('`spec_merge slug=<slug>`');
    expect(block).toContain('user authorized implementation-to-');
    expect(block).toMatch(
      /planning\/review-only\s+requests stop at merge-ready/,
    );
  });

  test('does not retain old mandatory heavy-gate wording', () => {
    const block = buildSddTddAppendBlock();

    expect(block).not.toContain('Do not collapse them');
    expect(block).not.toContain('@oracle MUST also');
    expect(block).not.toContain('@oracle is the sole writer');
    expect(block).not.toContain('mandatory task-package review');
  });

  test('keeps user-facing output concise by default', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Concise User Output');
    expect(block).toContain('route');
    expect(block).toContain('reason');
    expect(block).toContain('next');
    expect(block).toContain('status');
    expect(block).toContain('Do not expose raw reasoning');
    expect(block).toContain('long evidence chains');
    expect(block).toContain('full child summaries');
    expect(block).toContain('failure, approval, high risk');
    expect(block).toContain('surprising result');
    expect(block).toContain('user request');
  });

  test('supports delta-scoped specialist follow-up reuse', () => {
    const block = buildSddTddAppendBlock();

    expect(block).toContain('Specialist Follow-up Reuse');
    expect(block).toContain('same topic/scope');
    expect(block).toContain('previous task_id');
    expect(block).toContain('previous verdict');
    expect(block).toContain('required fixes');
    expect(block).toContain('changed files');
    expect(block).toContain('applied delta');
    expect(block).toContain('validation result');
    expect(block).toContain('validation was not rerun or now fails');
    expect(block).toContain('files or anchors changed outside prior scope');
    expect(block).toContain('API/data/security/persistence/workflow');
    expect(block).toContain('product semantics');
    expect(block).toContain('prior review scope was incomplete');
    expect(block).toContain('user asks for a fresh review');
    expect(block).toContain('same-session delta follow-up');
    expect(block).toContain('same-session full re-review');
    expect(block).toContain('new-session full review');
    expect(block).toContain('fixed yes/no');
    expect(block).toContain('new risk yes/no');
  });

  test('block fits within 400 lines (token budget guard)', () => {
    const block = buildSddTddAppendBlock();
    const lines = block.split('\n').length;
    expect(lines).toBeLessThan(400);
  });
});
