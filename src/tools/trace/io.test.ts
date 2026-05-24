import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findStaleTraces,
  regenerateAllDomainTraces,
  regenerateDomainTrace,
  regenerateJobTrace,
} from './io';

describe('trace/io (domain + job)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'trace-io-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeDomain(name: string, req: string, des: string) {
    const d = join(dir, 'domains', name);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'requirements.md'), req);
    writeFileSync(join(d, 'design.md'), des);
  }

  function writeJob(slug: string, req: string, des: string) {
    const d = join(dir, 'jobs', slug);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'delta-requirements.md'), req);
    writeFileSync(join(d, 'delta-design.md'), des);
  }

  describe('regenerateDomainTrace', () => {
    test('writes trace for a single domain with qualified ids', () => {
      writeDomain(
        'auth',
        '## auth/REQ-1: login\n\nbody\n\n## auth/REQ-2: logout\n\nbody',
        '## auth/DES-1: x\n\nRationale anchor: REQ-1.\n\nbody',
      );

      const result = regenerateDomainTrace(dir, 'auth');
      expect(result.written).toBe(true);
      expect(result.path).toBe(join(dir, 'domains', 'auth', 'trace.md'));

      const trace = readFileSync(result.path, 'utf8');
      expect(trace).toContain('| auth/REQ-1 | auth/DES-1 | — |');
      expect(trace).toContain('| auth/REQ-2 | — | — |');
    });

    test('throws when domain dir missing', () => {
      expect(() => regenerateDomainTrace(dir, 'nope')).toThrow(/not found/);
    });
  });

  describe('regenerateAllDomainTraces', () => {
    test('regenerates every domain under domains/', () => {
      writeDomain(
        'auth',
        '## auth/REQ-1: x',
        '## auth/DES-1: y\n\nRationale anchor: REQ-1.',
      );
      writeDomain(
        'payment',
        '## payment/REQ-1: x',
        '## payment/DES-1: y\n\nRationale anchor: REQ-1.',
      );
      const results = regenerateAllDomainTraces(dir);
      expect(results.map((r) => r.domain).sort()).toEqual(['auth', 'payment']);
      expect(
        readFileSync(join(dir, 'domains', 'auth', 'trace.md'), 'utf8'),
      ).toContain('auth/REQ-1');
      expect(
        readFileSync(join(dir, 'domains', 'payment', 'trace.md'), 'utf8'),
      ).toContain('payment/REQ-1');
    });

    test('returns empty list when no domains exist', () => {
      expect(regenerateAllDomainTraces(dir)).toEqual([]);
    });
  });

  describe('regenerateJobTrace', () => {
    test('writes a cross-domain rollup of qualified ids touched', () => {
      writeJob(
        'add-otp',
        '## auth/REQ-3: otp flow\n\nbody\n\n## notify/REQ-2: send sms\n\nbody',
        '## auth/DES-3: x\n\nRationale anchor: auth/REQ-3.\n\nbody\n\n## notify/DES-2: y\n\nRationale anchor: notify/REQ-2.',
      );
      const result = regenerateJobTrace(dir, 'add-otp');
      expect(result.written).toBe(true);
      const trace = readFileSync(result.path, 'utf8');
      expect(trace).toContain('| auth/REQ-3 | auth/DES-3 | — |');
      expect(trace).toContain('| notify/REQ-2 | notify/DES-2 | — |');
    });

    test('throws when job dir missing', () => {
      expect(() => regenerateJobTrace(dir, 'nope')).toThrow(/not found/);
    });
  });

  describe('findStaleTraces', () => {
    test('reports stale domain when trace missing', () => {
      writeDomain(
        'auth',
        '## auth/REQ-1: x',
        '## auth/DES-1: y\n\nRationale anchor: REQ-1.',
      );
      const stale = findStaleTraces(dir);
      expect(stale).toEqual([{ kind: 'domain', name: 'auth' }]);
    });

    test('reports stale job when delta newer than trace', async () => {
      writeJob(
        'feat-x',
        '## auth/REQ-2: x',
        '## auth/DES-2: y\n\nRationale anchor: auth/REQ-2.',
      );
      regenerateJobTrace(dir, 'feat-x');
      await Bun.sleep(10);
      writeFileSync(
        join(dir, 'jobs', 'feat-x', 'delta-requirements.md'),
        '## auth/REQ-2: x\n\n## auth/REQ-3: z',
      );
      const stale = findStaleTraces(dir);
      expect(stale).toContainEqual({ kind: 'job', name: 'feat-x' });
    });

    test('returns empty when everything fresh', () => {
      writeDomain(
        'auth',
        '## auth/REQ-1: x',
        '## auth/DES-1: y\n\nRationale anchor: REQ-1.',
      );
      regenerateDomainTrace(dir, 'auth');
      expect(findStaleTraces(dir)).toEqual([]);
    });

    test('returns empty when spec dir has no domains and no jobs', () => {
      expect(findStaleTraces(dir)).toEqual([]);
    });
  });
});
