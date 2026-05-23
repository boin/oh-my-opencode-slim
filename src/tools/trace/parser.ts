const HEADING_ID_RE = (prefix: string) =>
  new RegExp(`^##\\s+(${prefix}-\\d+):`, 'gm');

export interface Section {
  id: string;
  body: string;
}

/**
 * Split a markdown document into level-2 sections keyed by `PREFIX-NNN:`
 * heading. Each section's `body` includes the heading line and everything
 * up to (but not including) the next matching heading, right-trimmed.
 *
 * Used by trace generation, ID extraction, and the spec_propose/merge
 * tools — keep this as the single source of truth for section parsing.
 */
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

export function extractAnchors(markdown: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const section of extractSections(markdown, 'DES')) {
    const anchorMatch = section.body.match(/Rationale anchor:\s+([^.\n]+)/);
    if (!anchorMatch) continue;
    const reqIds = anchorMatch[1]
      .split(/,\s*/)
      .map((s) => s.trim())
      .filter((s) => /^REQ-\d+$/.test(s));
    if (reqIds.length > 0) {
      result[section.id] = reqIds;
    }
  }
  return result;
}

export function generateTraceTable(
  reqIds: string[],
  desAnchors: Record<string, string[]>,
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
    lines.push(`| ${req} | ${desCol} | — |`);
  }

  return lines.join('\n');
}
