import {
  type PluginInput,
  type ToolDefinition,
  tool,
} from '@opencode-ai/plugin';
import { archiveChange, mergeChange, proposeChange } from './io';

const z = tool.schema;

const DEFAULT_SPEC_DIR = 'docs/spec';

export function createSpecTools(
  _ctx: PluginInput,
): Record<string, ToolDefinition> {
  const spec_propose = tool({
    description: `Open a new spec change proposal under docs/spec/changes/<slug>/.

Creates proposal.md plus delta-requirements.md and delta-design.md with the next available REQ/DES IDs pre-allocated. Use when evolving the spec after the trunk triad already exists. For first-time bootstrap (no requirements.md yet) write the trunk files directly instead.

Returns the allocated IDs and the change directory path.`,
    args: {
      slug: z
        .string()
        .describe('Kebab-case slug for the change, e.g. "user-profile-edit".'),
      summary: z
        .string()
        .describe('One-line summary of why this change is being proposed.'),
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
      const r = proposeChange(dir, args.slug, args.summary);
      return `proposed ${r.slug} at ${r.changeDir}; next REQ=${r.nextReqId}, DES=${r.nextDesId}`;
    },
  });

  const spec_merge = tool({
    description: `Merge a change's delta-*.md files into the trunk requirements.md/design.md, then regenerate trace.md.

Purely additive in v1: refuses if any REQ/DES ID already exists in the trunk. Call this after @oracle approves the change at output review. Follow immediately with spec_archive.

Returns the list of merged IDs.`,
    args: {
      slug: z.string().describe('Slug of the change to merge.'),
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
      const r = mergeChange(dir, args.slug);
      const reqs = r.mergedReqIds.join(', ') || '(none)';
      const dess = r.mergedDesIds.join(', ') || '(none)';
      return `merged ${args.slug}: REQ=[${reqs}] DES=[${dess}]; trace regenerated`;
    },
  });

  const spec_archive = tool({
    description: `Move docs/spec/changes/<slug>/ into docs/spec/archive/YYYY-MM-DD-<slug>/.

Use as the immediate next step after spec_merge succeeds. Atomic rename; no copy. Refuses if the target archive path already exists (same slug merged twice in one day).

Returns the resulting archive path.`,
    args: {
      slug: z.string().describe('Slug of the change to archive.'),
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
      const r = archiveChange(dir, args.slug);
      return `archived ${args.slug} at ${r.archivePath}`;
    },
  });

  return { spec_propose, spec_merge, spec_archive };
}
