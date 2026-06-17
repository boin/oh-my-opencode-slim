import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateToDomains } from './migrate';

describe('spec/migrate', () => {
  let root: string;
  let specDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'spec-migrate-'));
    specDir = join(root, 'docs', 'spec');
    mkdirSync(specDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('moves legacy trunk into domains/<domain>/ with qualified headings', () => {
    writeFileSync(
      join(specDir, 'requirements.md'),
      '# Requirements\n\n## REQ-1: login\n\nbody1\n\n## REQ-2: logout\n\nbody2\n',
    );
    writeFileSync(
      join(specDir, 'design.md'),
      '# Design\n\n## DES-1: x\n\nRationale anchor: REQ-1, REQ-2.\n\nbody\n',
    );
    writeFileSync(join(specDir, 'trace.md'), 'old trace\n');

    const r = migrateToDomains(specDir, 'core');
    expect(r.migrated).toBe(true);
    expect(r.domain).toBe('core');

    const d = join(specDir, 'domains', 'core');
    const req = readFileSync(join(d, 'requirements.md'), 'utf8');
    expect(req).toContain('## core/REQ-1: login');
    expect(req).toContain('## core/REQ-2: logout');
    expect(req).not.toContain('## REQ-1:'); // legacy form gone

    const des = readFileSync(join(d, 'design.md'), 'utf8');
    expect(des).toContain('## core/DES-1: x');
    // Bare anchors preserved (parser resolves them against domain).
    expect(des).toContain('Rationale anchor: REQ-1, REQ-2.');

    expect(existsSync(join(d, 'trace.md'))).toBe(true);
    expect(readFileSync(join(d, 'trace.md'), 'utf8')).toContain('core/REQ-1');

    // Legacy files moved aside as .legacy markers.
    expect(existsSync(join(specDir, 'requirements.md.legacy'))).toBe(true);
    expect(existsSync(join(specDir, 'design.md.legacy'))).toBe(true);
    expect(existsSync(join(specDir, 'trace.md.legacy'))).toBe(true);
    expect(existsSync(join(specDir, 'requirements.md'))).toBe(false);

    // Marker for idempotency.
    expect(existsSync(join(specDir, '.migrated-to-domains'))).toBe(true);
  });

  test('idempotent: re-run is no-op when marker exists', () => {
    writeFileSync(join(specDir, 'requirements.md'), '## REQ-1: a\n');
    writeFileSync(
      join(specDir, 'design.md'),
      '## DES-1: b\n\nRationale anchor: REQ-1.\n',
    );
    migrateToDomains(specDir, 'core');
    const r2 = migrateToDomains(specDir, 'core');
    expect(r2.migrated).toBe(false);
    expect(r2.reason).toMatch(/already migrated/);
  });

  test('refuses when domains/ already exists without marker', () => {
    mkdirSync(join(specDir, 'domains', 'preexisting'), { recursive: true });
    writeFileSync(join(specDir, 'requirements.md'), '## REQ-1: a\n');
    writeFileSync(join(specDir, 'design.md'), '## DES-1: b\n');
    expect(() => migrateToDomains(specDir, 'core')).toThrow(
      /domains\/ already exists/,
    );
  });

  test('refuses when no legacy trunk found', () => {
    expect(() => migrateToDomains(specDir, 'core')).toThrow(
      /no legacy.*requirements\.md/,
    );
  });

  test('migrates change/ proposals into jobs/ preserving slug', () => {
    writeFileSync(join(specDir, 'requirements.md'), '## REQ-1: a\n');
    writeFileSync(
      join(specDir, 'design.md'),
      '## DES-1: b\n\nRationale anchor: REQ-1.\n',
    );
    const changeDir = join(specDir, 'changes', 'feat-y');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'delta-requirements.md'), '## REQ-2: new\n');
    writeFileSync(
      join(changeDir, 'delta-design.md'),
      '## DES-2: x\n\nRationale anchor: REQ-2.\n',
    );

    migrateToDomains(specDir, 'core');

    const newJobDir = join(specDir, 'jobs', 'feat-y');
    expect(existsSync(newJobDir)).toBe(true);
    const dReq = readFileSync(join(newJobDir, 'delta-requirements.md'), 'utf8');
    expect(dReq).toContain('## core/REQ-2: new');
    expect(existsSync(join(specDir, 'changes', 'feat-y'))).toBe(false);
  });
});
