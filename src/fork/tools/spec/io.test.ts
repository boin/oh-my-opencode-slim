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
import { archiveJob, mergeJob, proposeJob } from './io';

describe('spec/io (job-scoped)', () => {
  let root: string;
  let specDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'spec-io-'));
    specDir = join(root, 'docs', 'spec');
    mkdirSync(specDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function seedDomain(
    domain: string,
    reqs: string[] = [],
    dess: string[] = [],
  ) {
    const d = join(specDir, 'domains', domain);
    mkdirSync(d, { recursive: true });
    writeFileSync(
      join(d, 'requirements.md'),
      `# ${domain} requirements\n\n` +
        reqs.map((id) => `## ${id}: seed\n\nbody\n`).join('\n'),
    );
    writeFileSync(
      join(d, 'design.md'),
      `# ${domain} design\n\n` +
        dess
          .map(
            (id) =>
              `## ${id}: seed\n\nRationale anchor: ${id.replace(/DES/, 'REQ')}.\n\nbody\n`,
          )
          .join('\n'),
    );
  }

  describe('proposeJob', () => {
    test('creates jobs/<slug>/ with proposal + empty deltas when no domains given', () => {
      seedDomain('auth', ['auth/REQ-1'], ['auth/DES-1']);
      const r = proposeJob(specDir, 'feat-x', 'add feature x');
      expect(r.slug).toBe('feat-x');
      expect(r.jobDir).toBe(join(specDir, 'jobs', 'feat-x'));
      expect(r.allocations).toEqual({});
      expect(existsSync(join(r.jobDir, 'proposal.md'))).toBe(true);
      expect(existsSync(join(r.jobDir, 'delta-requirements.md'))).toBe(true);
      expect(existsSync(join(r.jobDir, 'delta-design.md'))).toBe(true);
      const proposal = readFileSync(join(r.jobDir, 'proposal.md'), 'utf8');
      expect(proposal).toContain('add feature x');
    });

    test('pre-allocates next ids per declared domain', () => {
      seedDomain('auth', ['auth/REQ-1'], ['auth/DES-1']);
      seedDomain('payment', [], []);
      const r = proposeJob(specDir, 'cross-feat', 'spans domains', {
        domains: ['auth', 'payment'],
      });
      expect(r.allocations).toEqual({
        auth: { req: 'auth/REQ-2', des: 'auth/DES-2' },
        payment: { req: 'payment/REQ-1', des: 'payment/DES-1' },
      });
      const reqMd = readFileSync(
        join(r.jobDir, 'delta-requirements.md'),
        'utf8',
      );
      expect(reqMd).toContain('## auth/REQ-2:');
      expect(reqMd).toContain('## payment/REQ-1:');
      const desMd = readFileSync(join(r.jobDir, 'delta-design.md'), 'utf8');
      expect(desMd).toContain('## auth/DES-2:');
      expect(desMd).toContain('## payment/DES-1:');
    });

    test('next-id allocation accounts for other open jobs', () => {
      seedDomain('auth', ['auth/REQ-1'], []);
      proposeJob(specDir, 'job-a', 'a', { domains: ['auth'] });
      // job-a reserves auth/REQ-2, auth/DES-1
      const r = proposeJob(specDir, 'job-b', 'b', { domains: ['auth'] });
      expect(r.allocations.auth.req).toBe('auth/REQ-3');
      expect(r.allocations.auth.des).toBe('auth/DES-2');
    });

    test('creates tasks.md with job-local task bootstrap', () => {
      seedDomain('auth', [], []);
      const r = proposeJob(specDir, 'feat-task', 'x', { domains: ['auth'] });
      const tasksPath = join(r.jobDir, 'tasks.md');

      expect(existsSync(tasksPath)).toBe(true);
      const tasks = readFileSync(tasksPath, 'utf8');
      expect(tasks).toContain('## Task Package Review');
      expect(tasks).toContain('Status: pending');
      expect(tasks).toContain('## TASK-001: Produce executable task packages');
      expect(tasks).toContain('Owner: orchestrator');
      expect(tasks).toContain('Execution Readiness');
      expect(tasks).toContain('Human-facing: yes | no | partial');
      expect(tasks).toContain('lightweight UI note');
      expect(tasks).toContain('existing-design work');
      expect(tasks).toContain('Design Handoff Review');
      expect(tasks).toMatch(/UI \/\s+Interaction Handoff Contract/);
      expect(tasks).toContain('Red Strategy');
      expect(tasks).not.toContain('mandatory task-package review');
    });

    test('refuses on slug collision', () => {
      seedDomain('auth', [], []);
      proposeJob(specDir, 'dup', 'x');
      expect(() => proposeJob(specDir, 'dup', 'x')).toThrow(/already exists/);
    });

    test('initializes missing valid declared domain triad and allocates first ids', () => {
      let r: ReturnType<typeof proposeJob> | undefined;

      expect(() => {
        r = proposeJob(specDir, 'new-domain-job', 'x', {
          domains: ['new-domain'],
        });
      }).not.toThrow();

      if (!r) {
        throw new Error('proposeJob did not return a result');
      }

      const domainDir = join(specDir, 'domains', 'new-domain');
      expect(existsSync(join(domainDir, 'requirements.md'))).toBe(true);
      expect(existsSync(join(domainDir, 'design.md'))).toBe(true);
      expect(existsSync(join(domainDir, 'trace.md'))).toBe(true);
      expect(readFileSync(join(domainDir, 'trace.md'), 'utf8')).toContain(
        '# Trace',
      );
      expect(r.allocations).toEqual({
        'new-domain': {
          req: 'new-domain/REQ-1',
          des: 'new-domain/DES-1',
        },
      });

      const proposal = readFileSync(join(r.jobDir, 'proposal.md'), 'utf8');
      expect(proposal).toMatch(/new-domain/i);
      expect(proposal).toMatch(/created|initialized|new/i);
    });

    test('refuses an existing incomplete declared domain without repairing it', () => {
      const domainDir = join(specDir, 'domains', 'partial-domain');
      mkdirSync(domainDir, { recursive: true });
      writeFileSync(
        join(domainDir, 'requirements.md'),
        '# partial requirements\n',
      );

      expect(() =>
        proposeJob(specDir, 'partial-domain-job', 'x', {
          domains: ['partial-domain'],
        }),
      ).toThrow(/incomplete|missing.*design\.md/i);

      expect(existsSync(join(domainDir, 'design.md'))).toBe(false);
      expect(existsSync(join(specDir, 'jobs', 'partial-domain-job'))).toBe(
        false,
      );
    });

    test('validates existing domains before bootstrapping missing domains', () => {
      const partialDir = join(specDir, 'domains', 'partial-domain');
      mkdirSync(partialDir, { recursive: true });
      writeFileSync(
        join(partialDir, 'requirements.md'),
        '# partial requirements\n',
      );

      expect(() =>
        proposeJob(specDir, 'mixed-domain-job', 'x', {
          domains: ['new-domain', 'partial-domain'],
        }),
      ).toThrow(/incomplete|missing.*design\.md/i);

      expect(existsSync(join(specDir, 'domains', 'new-domain'))).toBe(false);
      expect(existsSync(join(partialDir, 'design.md'))).toBe(false);
      expect(existsSync(join(specDir, 'jobs', 'mixed-domain-job'))).toBe(false);
    });

    test('refuses invalid declared domain names before writing files', () => {
      expect(() =>
        proposeJob(specDir, 'bad-domain', 'x', { domains: ['../oops'] }),
      ).toThrow(/invalid domain/i);

      expect(existsSync(join(specDir, 'oops'))).toBe(false);
      expect(existsSync(join(specDir, 'domains', '..', 'oops'))).toBe(false);
      expect(existsSync(join(specDir, 'jobs', 'bad-domain'))).toBe(false);
    });
  });

  describe('mergeJob', () => {
    test('distributes delta sections back to each domain trunk', () => {
      seedDomain('auth', ['auth/REQ-1'], []);
      seedDomain('payment', [], []);
      const j = proposeJob(specDir, 'cross', 'x', {
        domains: ['auth', 'payment'],
      });
      writeFileSync(
        join(j.jobDir, 'delta-requirements.md'),
        '## auth/REQ-2: new\n\nbody\n\n## payment/REQ-1: new\n\nbody\n',
      );
      writeFileSync(
        join(j.jobDir, 'delta-design.md'),
        '## auth/DES-1: x\n\nRationale anchor: auth/REQ-2.\n\nbody\n\n## payment/DES-1: y\n\nRationale anchor: payment/REQ-1.\n\nbody\n',
      );

      const r = mergeJob(specDir, 'cross');
      expect(r.affectedDomains.sort()).toEqual(['auth', 'payment']);
      expect(r.mergedReqIds.sort()).toEqual(['auth/REQ-2', 'payment/REQ-1']);
      expect(r.mergedDesIds.sort()).toEqual(['auth/DES-1', 'payment/DES-1']);

      const authReq = readFileSync(
        join(specDir, 'domains', 'auth', 'requirements.md'),
        'utf8',
      );
      expect(authReq).toContain('## auth/REQ-2: new');
      const payReq = readFileSync(
        join(specDir, 'domains', 'payment', 'requirements.md'),
        'utf8',
      );
      expect(payReq).toContain('## payment/REQ-1: new');

      // domain traces regenerated
      expect(
        readFileSync(join(specDir, 'domains', 'auth', 'trace.md'), 'utf8'),
      ).toContain('auth/REQ-2');
      // job trace regenerated
      expect(readFileSync(join(j.jobDir, 'trace.md'), 'utf8')).toContain(
        'auth/REQ-2',
      );
    });

    test('refuses on id collision in any target domain', () => {
      seedDomain('auth', ['auth/REQ-1'], []);
      const j = proposeJob(specDir, 'dup', 'x', { domains: ['auth'] });
      writeFileSync(
        join(j.jobDir, 'delta-requirements.md'),
        '## auth/REQ-1: collide\n\nbody\n',
      );
      writeFileSync(join(j.jobDir, 'delta-design.md'), '');
      expect(() => mergeJob(specDir, 'dup')).toThrow(/already exists/);
    });

    test('refuses an incomplete referenced domain before writing any sections', () => {
      seedDomain('auth', ['auth/REQ-1'], []);
      const partialDir = join(specDir, 'domains', 'partial-domain');
      mkdirSync(partialDir, { recursive: true });
      writeFileSync(
        join(partialDir, 'requirements.md'),
        '# partial-domain requirements\n',
      );
      const j = proposeJob(specDir, 'merge-partial', 'x', {
        domains: ['auth'],
      });
      writeFileSync(
        join(j.jobDir, 'delta-requirements.md'),
        '## auth/REQ-2: new\n\nbody\n\n## partial-domain/REQ-1: new\n\nbody\n',
      );
      writeFileSync(join(j.jobDir, 'delta-design.md'), '');

      let error: unknown;
      try {
        mergeJob(specDir, 'merge-partial');
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      const message = error instanceof Error ? error.message : '';
      expect(message).toContain('incomplete');
      expect(message).toContain(partialDir);
      expect(message).toContain('design.md');

      expect(
        readFileSync(
          join(specDir, 'domains', 'auth', 'requirements.md'),
          'utf8',
        ),
      ).not.toContain('## auth/REQ-2: new');
      expect(existsSync(join(partialDir, 'design.md'))).toBe(false);
      expect(
        readFileSync(join(partialDir, 'requirements.md'), 'utf8'),
      ).not.toContain('## partial-domain/REQ-1: new');
    });

    test('refuses when job dir missing', () => {
      expect(() => mergeJob(specDir, 'nope')).toThrow(/not found/);
    });

    test('refuses when delta references unknown domain', () => {
      seedDomain('auth', [], []);
      const j = proposeJob(specDir, 'bad', 'x', { domains: ['auth'] });
      writeFileSync(
        join(j.jobDir, 'delta-requirements.md'),
        '## ghost/REQ-1: oops\n\nbody\n',
      );
      writeFileSync(join(j.jobDir, 'delta-design.md'), '');
      expect(() => mergeJob(specDir, 'bad')).toThrow(/domain.*ghost/);
    });
  });

  describe('archiveJob', () => {
    test('moves jobs/<slug>/ to archive/YYYY-MM-DD-<slug>/', () => {
      seedDomain('auth', [], []);
      proposeJob(specDir, 'feat-z', 'z', { domains: ['auth'] });
      const r = archiveJob(specDir, 'feat-z');
      expect(r.archivePath).toMatch(/archive\/\d{4}-\d{2}-\d{2}-feat-z$/);
      expect(existsSync(r.archivePath)).toBe(true);
      expect(existsSync(join(specDir, 'jobs', 'feat-z'))).toBe(false);
    });

    test('refuses when job dir missing', () => {
      expect(() => archiveJob(specDir, 'nope')).toThrow(/not found/);
    });

    test('refuses same-slug same-day re-archive', () => {
      seedDomain('auth', [], []);
      proposeJob(specDir, 'twice', 'a', { domains: ['auth'] });
      archiveJob(specDir, 'twice');
      proposeJob(specDir, 'twice', 'b', { domains: ['auth'] });
      expect(() => archiveJob(specDir, 'twice')).toThrow(/already exists/);
    });
  });
});
