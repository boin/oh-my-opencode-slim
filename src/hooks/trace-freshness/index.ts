/**
 * Trace freshness check.
 *
 * On the orchestrator's next user turn, if any domain trace or open job
 * trace is stale relative to its sources, regenerate them silently and
 * append a single internal_reminder listing what was refreshed so the
 * model knows trace state changed mid-flight.
 *
 * Rationale anchor: spec-tooling/REQ-6, hooks/REQ-1 in the
 * spec-domain-job-scope job spec.
 */
import { existsSync } from 'node:fs';
import {
  findStaleTraces,
  regenerateDomainTrace,
  regenerateJobTrace,
  type StaleEntry,
} from '../../tools/trace/io';

interface MessageInfo {
  role: string;
  agent?: string;
}

interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface MessageWithParts {
  info: MessageInfo;
  parts: MessagePart[];
}

const DEFAULT_SPEC_DIR = 'docs/spec';
const NOTICE_MARKER = '<internal_reminder>trace_regenerate:';

export interface TraceFreshnessOptions {
  specDir?: string;
}

function regenerateOne(specDir: string, entry: StaleEntry): string {
  try {
    if (entry.kind === 'domain') {
      regenerateDomainTrace(specDir, entry.name);
    } else {
      regenerateJobTrace(specDir, entry.name);
    }
    return `${entry.kind}:${entry.name}`;
  } catch (err) {
    return `${entry.kind}:${entry.name}(failed:${(err as Error).message})`;
  }
}

export function createTraceFreshnessHook(options: TraceFreshnessOptions = {}) {
  const specDir = options.specDir ?? DEFAULT_SPEC_DIR;

  return {
    'experimental.chat.messages.transform': async (
      _input: Record<string, never>,
      output: { messages: MessageWithParts[] },
    ): Promise<void> => {
      const { messages } = output;
      if (messages.length === 0) return;

      let lastUserIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].info.role === 'user') {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx === -1) return;

      const lastUser = messages[lastUserIdx];
      const agent = lastUser.info.agent;
      if (agent && agent !== 'orchestrator') return;

      if (!existsSync(specDir)) return;

      // Avoid double-injection within the same turn.
      if (lastUser.parts.some((p) => p.text?.includes(NOTICE_MARKER))) return;

      let stale: StaleEntry[];
      try {
        stale = findStaleTraces(specDir);
      } catch {
        return;
      }
      if (stale.length === 0) return;

      const refreshed = stale.map((e) => regenerateOne(specDir, e)).join(', ');
      lastUser.parts.push({
        type: 'text',
        text: `${NOTICE_MARKER} refreshed ${refreshed}</internal_reminder>`,
      });
    },
  };
}
