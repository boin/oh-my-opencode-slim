import {
  type PluginInput,
  type ToolDefinition,
  tool,
} from '@opencode-ai/plugin';
import {
  findStaleTraces,
  regenerateAllDomainTraces,
  regenerateDomainTrace,
  regenerateJobTrace,
} from './io';

const z = tool.schema;

const DEFAULT_SPEC_DIR = 'docs/spec';

export function createTraceTool(
  _ctx: PluginInput,
): Record<string, ToolDefinition> {
  const trace_regenerate = tool({
    description: `Regenerate trace.md for domain spec(s) and/or job spec(s).

Layout: docs/spec/domains/<domain>/{requirements,design,trace}.md (long-lived per-subsystem) and docs/spec/jobs/<slug>/{delta-requirements,delta-design,trace}.md (one-shot cross-domain change).

Heading format is strict: "## <domain>/REQ-N:" and "## <domain>/DES-N:" where <domain> is kebab-case. Legacy unqualified "## REQ-N:" headings are ignored.

Anchor format: "Rationale anchor: <id>[, <id>...]" on a single line. Bare ids (REQ-N) qualify against the file's domain in domain spec; in job spec all anchors must be fully qualified (auth/REQ-3).

Dispatch: pass domain=<name> to regenerate one domain, job=<slug> for one job, check_only=true to report staleness only. Defaults regenerate all domains.`,
    args: {
      spec_dir: z
        .string()
        .optional()
        .describe(
          `Spec directory. Defaults to "${DEFAULT_SPEC_DIR}" relative to cwd.`,
        ),
      domain: z
        .string()
        .optional()
        .describe('Regenerate only this domain trace.'),
      job: z.string().optional().describe('Regenerate only this job trace.'),
      check_only: z
        .boolean()
        .optional()
        .describe('Report stale domains/jobs without writing.'),
    },
    async execute(args) {
      const dir =
        typeof args.spec_dir === 'string' && args.spec_dir
          ? args.spec_dir
          : DEFAULT_SPEC_DIR;

      if (args.check_only) {
        const stale = findStaleTraces(dir);
        if (stale.length === 0) return `trace fresh in ${dir}`;
        const summary = stale.map((s) => `${s.kind}:${s.name}`).join(', ');
        return `trace stale in ${dir}: ${summary}`;
      }

      if (args.domain) {
        const r = regenerateDomainTrace(dir, args.domain);
        return `regenerated domain trace at ${r.path}`;
      }
      if (args.job) {
        const r = regenerateJobTrace(dir, args.job);
        return `regenerated job trace at ${r.path}`;
      }

      const results = regenerateAllDomainTraces(dir);
      if (results.length === 0) return `no domains found under ${dir}/domains/`;
      return `regenerated ${results.length} domain trace(s): ${results.map((r) => r.domain).join(', ')}`;
    },
  });

  return { trace_regenerate };
}
