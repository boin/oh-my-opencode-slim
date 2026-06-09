import {
  type PluginInput,
  type ToolDefinition,
  tool,
} from '@opencode-ai/plugin';
import { archiveJob, mergeJob, proposeJob } from './io';

const z = tool.schema;

const DEFAULT_SPEC_DIR = 'docs/spec';

export function createSpecTools(
  _ctx: PluginInput,
): Record<string, ToolDefinition> {
  const spec_propose = tool({
    description: `Open a new spec job under docs/spec/jobs/<slug>/.

A "job" is a one-shot change container that MAY span multiple domains. Creates proposal.md plus delta-requirements.md and delta-design.md. When 'domains' is provided, pre-allocates the next "<domain>/REQ-N" and "<domain>/DES-N" id per domain (accounting for other open jobs to avoid collision).

For changes touching a single domain, still go through this tool — domains=[<that-domain>]. Direct edits to docs/spec/domains/<d>/{requirements,design}.md are reserved for the initial bootstrap of a new domain.

Domain naming: before creating a new domain (which requires first writing docs/spec/domains/<new>/{requirements,design}.md), list docs/spec/domains/ and reuse an existing name if a sensible match exists. New domain creation is recorded in one line in proposal.md — no halting to ask.

Returns the job dir and per-domain id allocations.`,
    args: {
      slug: z
        .string()
        .describe('Kebab-case slug for the job, e.g. "user-profile-edit".'),
      summary: z.string().describe('One-line summary of the change.'),
      domains: z
        .array(z.string())
        .optional()
        .describe(
          'Legal kebab-case domains touched by this job. Missing legal domains are initialized under docs/spec/domains/. Pre-allocates one REQ + one DES id per domain.',
        ),
      spec_dir: z
        .string()
        .optional()
        .describe(
          `Spec directory. Defaults to "${DEFAULT_SPEC_DIR}" relative to cwd.`,
        ),
    },
    async execute(args) {
      const dir =
        typeof args.spec_dir === 'string' && args.spec_dir
          ? args.spec_dir
          : DEFAULT_SPEC_DIR;
      const r = proposeJob(dir, args.slug, args.summary, {
        domains: args.domains,
      });
      const allocSummary =
        Object.entries(r.allocations)
          .map(([d, a]) => `${d}:${a.req}/${a.des}`)
          .join(', ') || '(none)';
      const initializedSummary = r.initializedDomains.length
        ? `; initialized domains: ${r.initializedDomains.join(', ')}`
        : '';
      return `proposed ${r.slug} at ${r.jobDir}; allocations: ${allocSummary}${initializedSummary}`;
    },
  });

  const spec_merge = tool({
    description: `Distribute a job's delta sections back to their target domain trunks, then regenerate affected traces.

Each delta heading must be fully qualified ("## <domain>/REQ-N: ..." or "## <domain>/DES-N: ..."). Sections are grouped by domain prefix and appended to docs/spec/domains/<d>/{requirements,design}.md. Refuses on any id collision in any target domain trunk.

After successful merge, regenerates each affected domain's trace.md AND the job's own trace.md. Follow immediately with spec_archive to move the job into archive/.

Returns the list of merged ids and affected domains.`,
    args: {
      slug: z.string().describe('Slug of the job to merge.'),
      spec_dir: z
        .string()
        .optional()
        .describe(`Spec directory. Defaults to "${DEFAULT_SPEC_DIR}".`),
    },
    async execute(args) {
      const dir =
        typeof args.spec_dir === 'string' && args.spec_dir
          ? args.spec_dir
          : DEFAULT_SPEC_DIR;
      const r = mergeJob(dir, args.slug);
      const reqs = r.mergedReqIds.join(', ') || '(none)';
      const dess = r.mergedDesIds.join(', ') || '(none)';
      const doms = r.affectedDomains.join(', ') || '(none)';
      return `merged ${args.slug}: domains=[${doms}] REQ=[${reqs}] DES=[${dess}]`;
    },
  });

  const spec_archive = tool({
    description: `Move docs/spec/jobs/<slug>/ to docs/spec/archive/YYYY-MM-DD-<slug>/.

The archived job (including its trace.md) is the immutable historical snapshot of the change. Refuses if the target archive path already exists (same slug archived twice in one day).

Use as the immediate next step after spec_merge.`,
    args: {
      slug: z.string().describe('Slug of the job to archive.'),
      spec_dir: z
        .string()
        .optional()
        .describe(`Spec directory. Defaults to "${DEFAULT_SPEC_DIR}".`),
    },
    async execute(args) {
      const dir =
        typeof args.spec_dir === 'string' && args.spec_dir
          ? args.spec_dir
          : DEFAULT_SPEC_DIR;
      const r = archiveJob(dir, args.slug);
      return `archived ${args.slug} at ${r.archivePath}`;
    },
  });

  return { spec_propose, spec_merge, spec_archive };
}
