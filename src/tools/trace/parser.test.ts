import { describe, expect, test } from 'bun:test';
import { extractAnchors, extractIds, generateTraceTable } from './parser';

describe('trace/parser', () => {
  describe('extractIds', () => {
    test('extracts REQ ids from headings', () => {
      const md = '## REQ-001: foo\n\nbody\n\n## REQ-002: bar\n\nbody';
      expect(extractIds(md, 'REQ')).toEqual(['REQ-001', 'REQ-002']);
    });

    test('extracts DES ids from headings', () => {
      const md = '## DES-001: foo\n\n## DES-042: bar';
      expect(extractIds(md, 'DES')).toEqual(['DES-001', 'DES-042']);
    });

    test('ignores ids that are not in headings', () => {
      const md = 'see REQ-001 in body\n\n## REQ-002: real heading';
      expect(extractIds(md, 'REQ')).toEqual(['REQ-002']);
    });

    test('returns empty array when no matches', () => {
      expect(extractIds('plain text', 'REQ')).toEqual([]);
    });
  });

  describe('extractAnchors', () => {
    test('finds Rationale anchor lines pointing to REQ', () => {
      const md = `## DES-001: foo
body

Rationale anchor: REQ-001, REQ-002.

## DES-002: bar

Rationale anchor: REQ-003.`;
      expect(extractAnchors(md)).toEqual({
        'DES-001': ['REQ-001', 'REQ-002'],
        'DES-002': ['REQ-003'],
      });
    });

    test('DES with no anchor has no entry', () => {
      const md = '## DES-001: foo\n\nno anchor here';
      expect(extractAnchors(md)).toEqual({});
    });
  });

  describe('generateTraceTable', () => {
    test('produces markdown table for REQ -> DES mapping', () => {
      const reqIds = ['REQ-001', 'REQ-002'];
      const desAnchors = {
        'DES-001': ['REQ-001'],
        'DES-002': ['REQ-001', 'REQ-002'],
      };
      const table = generateTraceTable(reqIds, desAnchors);
      expect(table).toContain('| REQ | DES | TASK |');
      expect(table).toContain('| REQ-001 | DES-001, DES-002 | — |');
      expect(table).toContain('| REQ-002 | DES-002 | — |');
    });

    test('REQ with no matching DES gets em-dash', () => {
      const table = generateTraceTable(['REQ-001'], {});
      expect(table).toContain('| REQ-001 | — | — |');
    });
  });
});
