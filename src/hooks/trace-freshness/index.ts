/**
 * Trace freshness check.
 *
 * When the orchestrator receives a user message and `docs/spec/trace.md` is
 * stale relative to `requirements.md` / `design.md`, regenerate it silently
 * and append a one-line internal reminder so the model knows trace was
 * refreshed mid-flight.
 *
 * Rationale anchor: REQ-005, DES-002, DES-011 in
 * /workspace/oh-my-opencode-slim/docs/spec/.
 */
import { existsSync } from 'node:fs';
import { isTraceStale, regenerateTrace } from '../../tools/trace/io';

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

      // Skip if spec dir doesn't exist — project hasn't adopted SDD yet.
      if (!existsSync(specDir)) return;

      // Avoid double-injection within the same turn.
      if (lastUser.parts.some((p) => p.text?.includes(NOTICE_MARKER))) return;

      let stale = false;
      try {
        stale = isTraceStale(specDir);
      } catch {
        return;
      }
      if (!stale) return;

      let outcome: string;
      try {
        regenerateTrace(specDir);
        outcome = 'refreshed';
      } catch (err) {
        outcome = `failed: ${(err as Error).message}`;
      }

      lastUser.parts.push({
        type: 'text',
        text: `${NOTICE_MARKER} ${outcome}</internal_reminder>`,
      });
    },
  };
}
