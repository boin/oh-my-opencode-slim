// Qualified id heading parser. Headings MUST be of the form
//   ## <domain>/REQ-N: <title>
//   ## <domain>/DES-N: <title>
// where <domain> is kebab-case ([a-z][a-z0-9-]*).
//
// Legacy unqualified headings (## REQ-1: ...) are intentionally ignored —
// the codebase has flag-day cut over to the qualified form; legacy specs
// must be migrated via scripts/migrate-spec-to-domains.ts before tools
// will see them.

const DOMAIN_RE_SRC = '[a-z][a-z0-9-]*';

const HEADING_ID_RE = (prefix: string) =>
  new RegExp(`^##\\s+(${DOMAIN_RE_SRC}\\/${prefix}-\\d+):`, 'gm');

export interface Section {
  id: string;
  body: string;
}

export interface ParsedId {
  domain: string;
  prefix: 'REQ' | 'DES';
  n: number;
}

export interface TaskAnchor {
  taskId: string;
  anchors: string[];
}

export function parseQualifiedId(id: string): ParsedId | null {
  const m = id.match(new RegExp(`^(${DOMAIN_RE_SRC})\\/(REQ|DES)-(\\d+)$`));
  if (!m) return null;
  return {
    domain: m[1],
    prefix: m[2] as 'REQ' | 'DES',
    n: Number.parseInt(m[3], 10),
  };
}

export function extractSections(markdown: string, prefix: string): Section[] {
  const re = HEADING_ID_RE(prefix);
  const heads: Array<{ id: string; start: number }> = [];
  for (const m of markdown.matchAll(re)) {
    heads.push({ id: m[1], start: m.index ?? 0 });
  }
  const out: Section[] = [];
  for (let i = 0; i < heads.length; i++) {
    const end = heads[i + 1]?.start ?? markdown.length;
    out.push({
      id: heads[i].id,
      body: markdown.slice(heads[i].start, end).trimEnd(),
    });
  }
  return out;
}

export function extractIds(markdown: string, prefix: string): string[] {
  return extractSections(markdown, prefix).map((s) => s.id);
}

export function extractTaskAnchors(markdown: string): TaskAnchor[] {
  const re = /^##\s+(TASK-\d+):/gm;
  const heads: Array<{ id: string; start: number }> = [];
  for (const m of markdown.matchAll(re)) {
    heads.push({ id: m[1], start: m.index ?? 0 });
  }

  const out: TaskAnchor[] = [];
  for (let i = 0; i < heads.length; i++) {
    const end = heads[i + 1]?.start ?? markdown.length;
    const body = markdown.slice(heads[i].start, end);
    const anchorMatch = body.match(/Anchors:\s+([^\n]+)/);
    if (!anchorMatch) continue;

    const anchors = anchorMatch[1]
      .split(/,\s*/)
      .map((raw) => raw.trim().replace(/[.。]$/, ''))
      .filter((tok) => {
        const parsed = parseQualifiedId(tok);
        return parsed?.prefix === 'REQ' || parsed?.prefix === 'DES';
      });
    if (anchors.length > 0) {
      out.push({ taskId: heads[i].id, anchors });
    }
  }

  return out;
}

export interface AnchorOptions {
  /** If set, bare anchors (REQ-N without domain/) are qualified against
   * this domain. If unset, bare anchors are silently dropped. */
  defaultDomain?: string;
}

export function extractAnchors(
  markdown: string,
  options: AnchorOptions = {},
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const section of extractSections(markdown, 'DES')) {
    const anchorMatch = section.body.match(/Rationale anchor:\s+([^.\n]+)/);
    if (!anchorMatch) continue;
    const reqIds: string[] = [];
    for (const raw of anchorMatch[1].split(/,\s*/)) {
      const tok = raw.trim();
      if (parseQualifiedId(tok)?.prefix === 'REQ') {
        reqIds.push(tok);
      } else if (/^REQ-\d+$/.test(tok)) {
        if (options.defaultDomain) {
          reqIds.push(`${options.defaultDomain}/${tok}`);
        }
        // else: drop silently
      }
    }
    if (reqIds.length > 0) {
      result[section.id] = reqIds;
    }
  }
  return result;
}

export function generateTraceTable(
  reqIds: string[],
  desAnchors: Record<string, string[]>,
  taskAnchors: Record<string, string[]> = {},
): string {
  const reqToDes: Record<string, string[]> = {};
  for (const req of reqIds) reqToDes[req] = [];

  for (const [desId, reqList] of Object.entries(desAnchors)) {
    for (const req of reqList) {
      if (!reqToDes[req]) reqToDes[req] = [];
      reqToDes[req].push(desId);
    }
  }

  const lines = ['| REQ | DES | TASK |', '|-----|-----|------|'];
  for (const req of reqIds) {
    const desList = reqToDes[req];
    const desCol = desList.length > 0 ? desList.join(', ') : '—';
    const taskList = taskAnchors[req] ?? [];
    const taskCol = taskList.length > 0 ? taskList.join(', ') : '—';
    lines.push(`| ${req} | ${desCol} | ${taskCol} |`);
  }

  return lines.join('\n');
}
