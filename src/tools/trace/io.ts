import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  extractAnchors,
  extractIds,
  extractTaskAnchors,
  generateTraceTable,
  parseQualifiedId,
} from './parser';

export interface RegenerateResult {
  written: boolean;
  path: string;
}

export interface DomainRegenerateResult extends RegenerateResult {
  domain: string;
}

export interface StaleEntry {
  kind: 'domain' | 'job';
  name: string;
}

const TRACE_HEADER = [
  '# Trace',
  '',
  'Auto-generated. Edit `requirements.md` / `design.md` or job deltas',
  'and re-run trace_regenerate instead of editing this file directly.',
  '',
].join('\n');

function writeTrace(path: string, table: string): RegenerateResult {
  writeFileSync(path, `${TRACE_HEADER}${table}\n`, 'utf8');
  return { written: true, path };
}

// --- domain-level ---

function domainDir(specDir: string, domain: string): string {
  return join(specDir, 'domains', domain);
}

export function regenerateDomainTrace(
  specDir: string,
  domain: string,
): RegenerateResult {
  const d = domainDir(specDir, domain);
  const reqPath = join(d, 'requirements.md');
  const desPath = join(d, 'design.md');
  if (!existsSync(reqPath)) {
    throw new Error(`requirements.md not found in ${d}`);
  }
  if (!existsSync(desPath)) {
    throw new Error(`design.md not found in ${d}`);
  }
  const reqIds = extractIds(readFileSync(reqPath, 'utf8'), 'REQ');
  const anchors = extractAnchors(readFileSync(desPath, 'utf8'), {
    defaultDomain: domain,
  });
  const table = generateTraceTable(reqIds, anchors);
  return writeTrace(join(d, 'trace.md'), table);
}

function listDomains(specDir: string): string[] {
  const base = join(specDir, 'domains');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function regenerateAllDomainTraces(
  specDir: string,
): DomainRegenerateResult[] {
  return listDomains(specDir).map((domain) => ({
    domain,
    ...regenerateDomainTrace(specDir, domain),
  }));
}

// --- job-level ---

function jobDir(specDir: string, slug: string): string {
  return join(specDir, 'jobs', slug);
}

function mapTaskAnchorsToReqs(
  slug: string,
  desAnchors: Record<string, string[]>,
  tasks: ReturnType<typeof extractTaskAnchors>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const task of tasks) {
    const taskRef = `${slug}/${task.taskId}`;
    for (const anchor of task.anchors) {
      const parsed = parseQualifiedId(anchor);
      const reqIds = parsed?.prefix === 'DES' ? desAnchors[anchor] : [anchor];
      for (const req of reqIds ?? []) {
        if (!result[req]) result[req] = [];
        if (!result[req].includes(taskRef)) result[req].push(taskRef);
      }
    }
  }

  return result;
}

export function regenerateJobTrace(
  specDir: string,
  slug: string,
): RegenerateResult {
  const d = jobDir(specDir, slug);
  if (!existsSync(d)) {
    throw new Error(`job ${slug} not found at ${d}`);
  }
  const deltaReqPath = join(d, 'delta-requirements.md');
  const deltaDesPath = join(d, 'delta-design.md');
  const tasksPath = join(d, 'tasks.md');
  const deltaReq = existsSync(deltaReqPath)
    ? readFileSync(deltaReqPath, 'utf8')
    : '';
  const deltaDes = existsSync(deltaDesPath)
    ? readFileSync(deltaDesPath, 'utf8')
    : '';
  const tasks = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8') : '';
  const reqIds = extractIds(deltaReq, 'REQ');
  // Job-level anchors must be fully qualified (no defaultDomain) — a job
  // spec spans domains, so there is no single default to fall back to.
  const anchors = extractAnchors(deltaDes);
  const taskAnchors = mapTaskAnchorsToReqs(
    slug,
    anchors,
    extractTaskAnchors(tasks),
  );
  const table = generateTraceTable(reqIds, anchors, taskAnchors);
  return writeTrace(join(d, 'trace.md'), table);
}

function listJobs(specDir: string): string[] {
  const base = join(specDir, 'jobs');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// --- freshness ---

function mtime(path: string): number {
  return existsSync(path) ? statSync(path).mtimeMs : 0;
}

function isStaleAgainst(tracePath: string, sources: string[]): boolean {
  if (!existsSync(tracePath)) return true;
  const t = mtime(tracePath);
  for (const s of sources) {
    if (mtime(s) > t) return true;
  }
  return false;
}

export function findStaleTraces(specDir: string): StaleEntry[] {
  const out: StaleEntry[] = [];
  for (const domain of listDomains(specDir)) {
    const d = domainDir(specDir, domain);
    if (
      isStaleAgainst(join(d, 'trace.md'), [
        join(d, 'requirements.md'),
        join(d, 'design.md'),
      ])
    ) {
      out.push({ kind: 'domain', name: domain });
    }
  }
  for (const slug of listJobs(specDir)) {
    const d = jobDir(specDir, slug);
    if (
      isStaleAgainst(join(d, 'trace.md'), [
        join(d, 'delta-requirements.md'),
        join(d, 'delta-design.md'),
        join(d, 'tasks.md'),
      ])
    ) {
      out.push({ kind: 'job', name: slug });
    }
  }
  return out;
}

// Re-export for callers that need the parser util.
export { parseQualifiedId };
