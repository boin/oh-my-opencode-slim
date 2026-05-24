#!/usr/bin/env bun
/**
 * One-shot migration: legacy single-trunk docs/spec/ -> domain-scoped layout.
 *
 * Usage:
 *   bun run scripts/migrate-spec-to-domains.ts [--spec-dir=<path>] --domain=<name>
 *
 * Defaults:
 *   --spec-dir defaults to ./docs/spec
 *   --domain is required (no auto-default — agents should pick deliberately)
 */
import { migrateToDomains } from '../src/tools/spec/migrate';

function parseArgs(argv: string[]): {
  specDir: string;
  domain: string | null;
} {
  let specDir = 'docs/spec';
  let domain: string | null = null;
  for (const a of argv) {
    if (a.startsWith('--spec-dir=')) specDir = a.slice('--spec-dir='.length);
    else if (a.startsWith('--domain=')) domain = a.slice('--domain='.length);
  }
  return { specDir, domain };
}

const { specDir, domain } = parseArgs(process.argv.slice(2));

if (!domain) {
  console.error(
    'error: --domain=<name> is required (kebab-case). Example: --domain=core',
  );
  process.exit(2);
}
if (!/^[a-z][a-z0-9-]*$/.test(domain)) {
  console.error(`error: domain '${domain}' must be kebab-case`);
  process.exit(2);
}

try {
  const r = migrateToDomains(specDir, domain);
  if (r.migrated) {
    console.log(`migrated ${specDir} into domain '${r.domain}'`);
    console.log(
      `legacy files preserved as *.legacy; delete when satisfied with the migration`,
    );
  } else {
    console.log(`no-op: ${r.reason}`);
  }
} catch (err) {
  console.error(`migration failed: ${(err as Error).message}`);
  process.exit(1);
}
