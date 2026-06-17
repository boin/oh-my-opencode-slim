import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DOMAIN_SOURCE_FILES = ['requirements.md', 'design.md'] as const;

export function domainDir(specDir: string, domain: string): string {
  return join(specDir, 'domains', domain);
}

export function missingDomainSourceFiles(
  specDir: string,
  domain: string,
): string[] {
  const dir = domainDir(specDir, domain);
  return DOMAIN_SOURCE_FILES.filter(
    (filename) => !existsSync(join(dir, filename)),
  );
}

export function formatIncompleteDomainMessage(
  specDir: string,
  domain: string,
  missing: string[],
): string {
  return `incomplete domain '${domain}' at ${domainDir(specDir, domain)}; missing ${missing.join(', ')}`;
}

export function assertDomainTriadComplete(
  specDir: string,
  domain: string,
): void {
  const missing = missingDomainSourceFiles(specDir, domain);
  if (missing.length === 0) return;
  throw new Error(formatIncompleteDomainMessage(specDir, domain, missing));
}
