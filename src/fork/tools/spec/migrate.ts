import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { regenerateDomainTrace } from '../trace/io';

// One-shot migration: legacy single-trunk layout
//   docs/spec/{requirements,design,trace}.md
//   docs/spec/changes/<slug>/
// into the new layout
//   docs/spec/domains/<domain>/{requirements,design,trace}.md
//   docs/spec/jobs/<slug>/
//
// Heading rewrite: '## REQ-N: ...' -> '## <domain>/REQ-N: ...' (same for DES).
// Anchor rewrite: bare 'Rationale anchor: REQ-N' is preserved as-is — the
// new parser resolves bare anchors against the file's domain.
//
// Idempotency: leaves '.migrated-to-domains' marker file. Re-run is no-op.

export interface MigrateResult {
  migrated: boolean;
  domain: string;
  reason?: string;
}

const MARKER = '.migrated-to-domains';
const HEADING_RE = /^##\s+(REQ|DES)-(\d+):/gm;

function qualifyHeadings(markdown: string, domain: string): string {
  return markdown.replace(HEADING_RE, (_match, prefix, n) => {
    return `## ${domain}/${prefix}-${n}:`;
  });
}

export function migrateToDomains(
  specDir: string,
  domain: string,
): MigrateResult {
  if (existsSync(join(specDir, MARKER))) {
    return { migrated: false, domain, reason: 'already migrated' };
  }

  const legacyReq = join(specDir, 'requirements.md');
  const legacyDes = join(specDir, 'design.md');
  const legacyTrace = join(specDir, 'trace.md');

  if (!existsSync(legacyReq) || !existsSync(legacyDes)) {
    throw new Error(
      `no legacy trunk (requirements.md + design.md) found in ${specDir}`,
    );
  }
  if (existsSync(join(specDir, 'domains'))) {
    throw new Error(
      `${specDir}/domains/ already exists; refusing to mix layouts`,
    );
  }

  // 1. Create target domain dir.
  const domainDir = join(specDir, 'domains', domain);
  mkdirSync(domainDir, { recursive: true });

  // 2. Rewrite + write trunk into domain.
  writeFileSync(
    join(domainDir, 'requirements.md'),
    qualifyHeadings(readFileSync(legacyReq, 'utf8'), domain),
  );
  writeFileSync(
    join(domainDir, 'design.md'),
    qualifyHeadings(readFileSync(legacyDes, 'utf8'), domain),
  );

  // 3. Move legacy files aside.
  renameSync(legacyReq, `${legacyReq}.legacy`);
  renameSync(legacyDes, `${legacyDes}.legacy`);
  if (existsSync(legacyTrace)) {
    renameSync(legacyTrace, `${legacyTrace}.legacy`);
  }

  // 4. Regenerate domain trace.
  regenerateDomainTrace(specDir, domain);

  // 5. Migrate changes/<slug>/ -> jobs/<slug>/.
  const oldChanges = join(specDir, 'changes');
  if (existsSync(oldChanges)) {
    const newJobs = join(specDir, 'jobs');
    mkdirSync(newJobs, { recursive: true });
    for (const entry of readdirSync(oldChanges, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = join(oldChanges, entry.name);
      const dst = join(newJobs, entry.name);
      // Qualify headings in delta files before moving.
      for (const fname of ['delta-requirements.md', 'delta-design.md']) {
        const f = join(src, fname);
        if (existsSync(f)) {
          writeFileSync(f, qualifyHeadings(readFileSync(f, 'utf8'), domain));
        }
      }
      renameSync(src, dst);
    }
    // changes/ should now be empty; remove it.
    try {
      rmdirSync(oldChanges);
    } catch {
      // Non-empty (unexpected files); leave it.
    }
  }

  // 6. Marker for idempotency.
  writeFileSync(
    join(specDir, MARKER),
    `migrated ${new Date().toISOString()} into domain '${domain}'\n`,
  );

  return { migrated: true, domain };
}
