import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { regenerateDomainTrace, regenerateJobTrace } from '../trace/io';
import {
  DOMAIN_RE_SRC,
  extractIds,
  extractSections,
  parseQualifiedId,
} from '../trace/parser';

// Invariants:
//   1. Domain spec is the source of truth. Job specs are change containers
//      that distribute back to domains on merge, then archive whole.
//   2. Ids are domain-scoped: auth/REQ-1 and payment/REQ-1 coexist.
//   3. nextId allocation reads domain trunk + every open job's deltas to
//      avoid collision across concurrent jobs.
//   4. merge is additive only; refuses on collision in any target domain.
//   5. archive is a whole-dir rename; archived jobs are immutable history.

export interface DomainAllocation {
  req: string;
  des: string;
}

export interface ProposeOptions {
  domains?: string[];
}

export interface ProposeResult {
  slug: string;
  jobDir: string;
  allocations: Record<string, DomainAllocation>;
  initializedDomains: string[];
}

export interface MergeResult {
  affectedDomains: string[];
  mergedReqIds: string[];
  mergedDesIds: string[];
}

export interface ArchiveResult {
  archivePath: string;
}

// --- paths ---

function jobsBase(specDir: string): string {
  return join(specDir, 'jobs');
}

function jobDir(specDir: string, slug: string): string {
  return join(jobsBase(specDir), slug);
}

function domainsBase(specDir: string): string {
  return join(specDir, 'domains');
}

function domainDir(specDir: string, domain: string): string {
  return join(domainsBase(specDir), domain);
}

function archiveBase(specDir: string): string {
  return join(specDir, 'archive');
}

function taskBootstrap(slug: string): string {
  return `# Tasks: ${slug}

This file is the job-local execution contract. For spec-backed non-trivial SDD
jobs, implementation MUST NOT be delegated until task packages are authored and
mandatory task-package review passes.

## Task Package Review

Status: pending
Reviewer: (not reviewed)
Human-facing: yes | no | partial

For Human-facing: yes | partial, complete Design Handoff Review before
implementation delegation and include a UI / Interaction Handoff Contract.
The contract must cover product behavior, interaction flow, state lifecycle,
copy semantics, validation strategy, visual reference level when relevant, and
Red Strategy.

## Execution Readiness

Status: pending
Scope: task packages must be reviewed before implementation delegation.

---

## TASK-001: Produce executable task packages

Owner: orchestrator
Status: pending

### Goal

Produce complete job-local task packages before implementation delegation.
`;
}

// --- introspection ---

function listOpenJobSlugs(specDir: string): string[] {
  const base = jobsBase(specDir);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function listDomains(specDir: string): string[] {
  const base = domainsBase(specDir);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function domainExists(specDir: string, domain: string): boolean {
  return existsSync(domainDir(specDir, domain));
}

function assertValidDomainName(domain: string): void {
  if (!new RegExp(`^${DOMAIN_RE_SRC}$`).test(domain)) {
    throw new Error(
      `invalid domain '${domain}'; use kebab-case matching ${DOMAIN_RE_SRC}`,
    );
  }
}

function assertDomainExists(specDir: string, domain: string): void {
  if (!domainExists(specDir, domain)) {
    throw new Error(
      `domain '${domain}' not found at ${domainDir(specDir, domain)}; create the domain triad first`,
    );
  }
}

function initializeDomainTriad(specDir: string, domain: string): void {
  const dir = domainDir(specDir, domain);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'requirements.md'),
    `# ${domain} requirements\n\nInitialized by spec_propose.\n`,
  );
  writeFileSync(
    join(dir, 'design.md'),
    `# ${domain} design\n\nInitialized by spec_propose.\n`,
  );
  regenerateDomainTrace(specDir, domain);
}

function collectReservedIds(
  specDir: string,
  domain: string,
  prefix: 'REQ' | 'DES',
): Set<string> {
  const reserved = new Set<string>();
  const trunkFile = prefix === 'REQ' ? 'requirements.md' : 'design.md';
  const trunkPath = join(domainDir(specDir, domain), trunkFile);
  if (existsSync(trunkPath)) {
    for (const id of extractIds(readFileSync(trunkPath, 'utf8'), prefix)) {
      const parsed = parseQualifiedId(id);
      if (parsed?.domain === domain) reserved.add(id);
    }
  }
  const deltaFile =
    prefix === 'REQ' ? 'delta-requirements.md' : 'delta-design.md';
  for (const slug of listOpenJobSlugs(specDir)) {
    const p = join(jobDir(specDir, slug), deltaFile);
    if (!existsSync(p)) continue;
    for (const id of extractIds(readFileSync(p, 'utf8'), prefix)) {
      const parsed = parseQualifiedId(id);
      if (parsed?.domain === domain) reserved.add(id);
    }
  }
  return reserved;
}

function nextId(
  reserved: Set<string>,
  domain: string,
  prefix: 'REQ' | 'DES',
): string {
  let n = 1;
  for (const id of reserved) {
    const parsed = parseQualifiedId(id);
    if (parsed && parsed.domain === domain && parsed.prefix === prefix) {
      if (parsed.n >= n) n = parsed.n + 1;
    }
  }
  return `${domain}/${prefix}-${n}`;
}

// --- propose ---

export function proposeJob(
  specDir: string,
  slug: string,
  summary: string,
  options: ProposeOptions = {},
): ProposeResult {
  const dir = jobDir(specDir, slug);
  if (existsSync(dir)) {
    throw new Error(`job ${slug} already exists at ${dir}`);
  }

  const domains = options.domains ?? [];
  for (const d of domains) assertValidDomainName(d);
  const initializedDomains = domains.filter((d) => !domainExists(specDir, d));
  for (const d of initializedDomains) initializeDomainTriad(specDir, d);

  const allocations: Record<string, DomainAllocation> = {};
  for (const d of domains) {
    allocations[d] = {
      req: nextId(collectReservedIds(specDir, d, 'REQ'), d, 'REQ'),
      des: nextId(collectReservedIds(specDir, d, 'DES'), d, 'DES'),
    };
  }

  mkdirSync(dir, { recursive: true });
  const initializedNote = initializedDomains.length
    ? `\nInitialized new domains: ${initializedDomains.join(', ')}\n`
    : '';
  writeFileSync(
    join(dir, 'proposal.md'),
    `# Job: ${slug}\n\n${summary}\n\nDomains: ${domains.length ? domains.join(', ') : '(none declared at propose time)'}\n${initializedNote}`,
  );

  const reqStubs = domains
    .map((d) => `## ${allocations[d].req}: <fill in>\n\n<requirement body>\n`)
    .join('\n');
  const desStubs = domains
    .map(
      (d) =>
        `## ${allocations[d].des}: <fill in>\n\nRationale anchor: ${allocations[d].req}.\n\n<design body>\n`,
    )
    .join('\n');
  writeFileSync(join(dir, 'delta-requirements.md'), reqStubs);
  writeFileSync(join(dir, 'delta-design.md'), desStubs);
  writeFileSync(join(dir, 'tasks.md'), taskBootstrap(slug));

  return { slug, jobDir: dir, allocations, initializedDomains };
}

// --- merge ---

function groupSectionsByDomain(
  sections: Array<{ id: string; body: string }>,
): Map<string, Array<{ id: string; body: string }>> {
  const out = new Map<string, Array<{ id: string; body: string }>>();
  for (const s of sections) {
    const parsed = parseQualifiedId(s.id);
    if (!parsed) continue;
    const list = out.get(parsed.domain) ?? [];
    list.push(s);
    out.set(parsed.domain, list);
  }
  return out;
}

function appendSections(
  trunkPath: string,
  sections: Array<{ id: string; body: string }>,
): void {
  if (sections.length === 0) return;
  const existing = existsSync(trunkPath)
    ? readFileSync(trunkPath, 'utf8').trimEnd()
    : '';
  const appended = sections.map((s) => s.body).join('\n\n');
  const body = existing ? `${existing}\n\n${appended}\n` : `${appended}\n`;
  writeFileSync(trunkPath, body, 'utf8');
}

export function mergeJob(specDir: string, slug: string): MergeResult {
  const dir = jobDir(specDir, slug);
  if (!existsSync(dir)) {
    throw new Error(`job ${slug} not found at ${dir}`);
  }

  const deltaReqPath = join(dir, 'delta-requirements.md');
  const deltaDesPath = join(dir, 'delta-design.md');
  const deltaReq = existsSync(deltaReqPath)
    ? readFileSync(deltaReqPath, 'utf8')
    : '';
  const deltaDes = existsSync(deltaDesPath)
    ? readFileSync(deltaDesPath, 'utf8')
    : '';

  const reqSections = extractSections(deltaReq, 'REQ');
  const desSections = extractSections(deltaDes, 'DES');

  const reqByDomain = groupSectionsByDomain(reqSections);
  const desByDomain = groupSectionsByDomain(desSections);
  const allDomains = new Set<string>([
    ...reqByDomain.keys(),
    ...desByDomain.keys(),
  ]);

  // Validate every referenced domain exists.
  for (const d of allDomains) assertDomainExists(specDir, d);

  // Collision check against each domain trunk.
  for (const [domain, sections] of reqByDomain) {
    const trunkPath = join(domainDir(specDir, domain), 'requirements.md');
    const trunkIds = new Set(
      extractIds(readFileSync(trunkPath, 'utf8'), 'REQ'),
    );
    for (const s of sections) {
      if (trunkIds.has(s.id)) {
        throw new Error(`${s.id} already exists in trunk ${trunkPath}`);
      }
    }
  }
  for (const [domain, sections] of desByDomain) {
    const trunkPath = join(domainDir(specDir, domain), 'design.md');
    const trunkIds = new Set(
      extractIds(readFileSync(trunkPath, 'utf8'), 'DES'),
    );
    for (const s of sections) {
      if (trunkIds.has(s.id)) {
        throw new Error(`${s.id} already exists in trunk ${trunkPath}`);
      }
    }
  }

  // Distribute.
  for (const [domain, sections] of reqByDomain) {
    appendSections(
      join(domainDir(specDir, domain), 'requirements.md'),
      sections,
    );
  }
  for (const [domain, sections] of desByDomain) {
    appendSections(join(domainDir(specDir, domain), 'design.md'), sections);
  }

  // Regenerate affected domain traces + job trace.
  for (const d of allDomains) regenerateDomainTrace(specDir, d);
  regenerateJobTrace(specDir, slug);

  return {
    affectedDomains: [...allDomains],
    mergedReqIds: reqSections.map((s) => s.id),
    mergedDesIds: desSections.map((s) => s.id),
  };
}

// --- archive ---

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function archiveJob(specDir: string, slug: string): ArchiveResult {
  const dir = jobDir(specDir, slug);
  if (!existsSync(dir)) {
    throw new Error(`job ${slug} not found at ${dir}`);
  }
  const base = archiveBase(specDir);
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  const archivePath = join(base, `${todayStamp()}-${slug}`);
  if (existsSync(archivePath)) {
    throw new Error(`archive ${archivePath} already exists`);
  }
  renameSync(dir, archivePath);
  return { archivePath };
}

// Re-exports for callers needing domain discovery (e.g. migration scripts,
// status tools, future spec_status command).
export { listDomains, listOpenJobSlugs };
