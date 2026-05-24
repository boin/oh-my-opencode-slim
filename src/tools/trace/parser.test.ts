import { describe, expect, test } from 'bun:test';
import {
  extractAnchors,
  extractIds,
  extractSections,
  generateTraceTable,
  parseQualifiedId,
} from './parser';

describe('trace/parser', () => {
  describe('parseQualifiedId', () => {
    test('splits domain/REQ-N', () => {
      expect(parseQualifiedId('auth/REQ-3')).toEqual({
        domain: 'auth',
        prefix: 'REQ',
        n: 3,
      });
    });

    test('splits multi-segment domain like spec-tooling/DES-12', () => {
      expect(parseQualifiedId('spec-tooling/DES-12')).toEqual({
        domain: 'spec-tooling',
        prefix: 'DES',
        n: 12,
      });
    });

    test('returns null for unqualified id', () => {
      expect(parseQualifiedId('REQ-1')).toBeNull();
    });

    test('returns null for garbage', () => {
      expect(parseQualifiedId('not an id')).toBeNull();
    });
  });

  describe('extractIds (qualified)', () => {
    test('extracts qualified REQ ids from headings', () => {
      const md =
        '## auth/REQ-1: login\n\nbody\n\n## auth/REQ-2: logout\n\nbody';
      expect(extractIds(md, 'REQ')).toEqual(['auth/REQ-1', 'auth/REQ-2']);
    });

    test('extracts qualified DES ids', () => {
      const md = '## payment/DES-1: stripe\n\n## payment/DES-42: refund';
      expect(extractIds(md, 'DES')).toEqual([
        'payment/DES-1',
        'payment/DES-42',
      ]);
    });

    test('extracts across multiple domains in same file (delta scenario)', () => {
      const md =
        '## auth/REQ-1: x\n\nbody\n\n## payment/REQ-1: y\n\nbody\n\n## auth/REQ-2: z';
      expect(extractIds(md, 'REQ')).toEqual([
        'auth/REQ-1',
        'payment/REQ-1',
        'auth/REQ-2',
      ]);
    });

    test('ignores legacy unqualified headings', () => {
      const md = '## REQ-1: legacy\n\n## auth/REQ-2: modern';
      expect(extractIds(md, 'REQ')).toEqual(['auth/REQ-2']);
    });

    test('returns empty when nothing matches', () => {
      expect(extractIds('plain text', 'REQ')).toEqual([]);
    });
  });

  describe('extractSections (qualified)', () => {
    test('keeps domain prefix on section id', () => {
      const md = '## auth/REQ-1: x\n\nbody1\n\n## auth/REQ-2: y\n\nbody2';
      const sections = extractSections(md, 'REQ');
      expect(sections).toHaveLength(2);
      expect(sections[0].id).toBe('auth/REQ-1');
      expect(sections[0].body).toContain('body1');
      expect(sections[1].id).toBe('auth/REQ-2');
    });
  });

  describe('extractAnchors', () => {
    test('parses qualified anchors verbatim', () => {
      const md = `## payment/DES-1: x

Rationale anchor: auth/REQ-1, payment/REQ-2.

## payment/DES-2: y

Rationale anchor: payment/REQ-3.`;
      expect(extractAnchors(md)).toEqual({
        'payment/DES-1': ['auth/REQ-1', 'payment/REQ-2'],
        'payment/DES-2': ['payment/REQ-3'],
      });
    });

    test('qualifies bare anchors using defaultDomain', () => {
      const md = `## auth/DES-1: x

Rationale anchor: REQ-1, REQ-2.`;
      expect(extractAnchors(md, { defaultDomain: 'auth' })).toEqual({
        'auth/DES-1': ['auth/REQ-1', 'auth/REQ-2'],
      });
    });

    test('mixes bare and qualified anchors in one line', () => {
      const md = `## auth/DES-1: x

Rationale anchor: REQ-1, payment/REQ-3.`;
      expect(extractAnchors(md, { defaultDomain: 'auth' })).toEqual({
        'auth/DES-1': ['auth/REQ-1', 'payment/REQ-3'],
      });
    });

    test('without defaultDomain, drops bare anchors silently', () => {
      const md = '## auth/DES-1: x\n\nRationale anchor: REQ-1.';
      expect(extractAnchors(md)).toEqual({});
    });

    test('DES with no anchor has no entry', () => {
      const md = '## auth/DES-1: foo\n\nno anchor here';
      expect(extractAnchors(md)).toEqual({});
    });
  });

  describe('generateTraceTable', () => {
    test('produces table for qualified ids', () => {
      const reqIds = ['auth/REQ-1', 'auth/REQ-2'];
      const desAnchors = {
        'auth/DES-1': ['auth/REQ-1'],
        'auth/DES-2': ['auth/REQ-1', 'auth/REQ-2'],
      };
      const table = generateTraceTable(reqIds, desAnchors);
      expect(table).toContain('| REQ | DES | TASK |');
      expect(table).toContain('| auth/REQ-1 | auth/DES-1, auth/DES-2 | — |');
      expect(table).toContain('| auth/REQ-2 | auth/DES-2 | — |');
    });

    test('REQ with no matching DES gets em-dash', () => {
      const table = generateTraceTable(['auth/REQ-1'], {});
      expect(table).toContain('| auth/REQ-1 | — | — |');
    });

    test('cross-domain anchor surfaces in foreign-domain REQ row', () => {
      const reqIds = ['auth/REQ-1', 'payment/REQ-1'];
      const desAnchors = {
        'payment/DES-1': ['auth/REQ-1', 'payment/REQ-1'],
      };
      const table = generateTraceTable(reqIds, desAnchors);
      expect(table).toContain('| auth/REQ-1 | payment/DES-1 | — |');
      expect(table).toContain('| payment/REQ-1 | payment/DES-1 | — |');
    });
  });
});
