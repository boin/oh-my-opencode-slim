import { spawnSync } from 'node:child_process';
import type { McpName, WebsearchConfig } from '../config';
import { context7 } from './context7';
import { gh_grep } from './grep-app';
import type { McpConfig } from './types';
import { createWebsearchConfig, websearch } from './websearch';

export type { LocalMcpConfig, McpConfig, RemoteMcpConfig } from './types';

type StaticMcpName = Exclude<McpName, 'codegraph'>;

const allBuiltinMcps: Record<StaticMcpName, McpConfig> = {
  websearch,
  context7,
  gh_grep,
};

const CODEGRAPH_MIN_VERSION = '0.9.9';

export type CodeGraphProbeResult =
  | { status: 'ready'; version: string }
  | { status: 'missing'; version?: string }
  | { status: 'incompatible'; version: string };

export type CreateBuiltinMcpsOptions = {
  projectPath?: string;
  codegraphProbe?: () => CodeGraphProbeResult;
};

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const bParts = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function extractVersion(output: string): string | undefined {
  return output.match(/\d+\.\d+\.\d+/)?.[0];
}

export function probeCodeGraphBinary(): CodeGraphProbeResult {
  const result = spawnSync('codegraph', ['--version'], {
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    return { status: 'missing' };
  }

  const version = extractVersion(
    `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
  );
  if (!version) {
    return { status: 'missing' };
  }

  if (compareVersions(version, CODEGRAPH_MIN_VERSION) < 0) {
    return { status: 'incompatible', version };
  }

  return { status: 'ready', version };
}

/**
 * Creates MCP configurations, excluding disabled ones.
 * Accepts an optional websearchConfig to override the default Exa provider.
 */
export function createBuiltinMcps(
  disabledMcps: readonly string[] = [],
  websearchConfig?: WebsearchConfig,
  options: CreateBuiltinMcpsOptions = {},
): Record<string, McpConfig> {
  const mcps = Object.fromEntries(
    Object.entries(allBuiltinMcps).filter(
      ([name]) => !disabledMcps.includes(name),
    ),
  );

  // Override websearch with user-configured provider (default: Exa)
  if (!disabledMcps.includes('websearch')) {
    mcps.websearch = createWebsearchConfig(websearchConfig);
  }

  if (options.projectPath && !disabledMcps.includes('codegraph')) {
    const probe = options.codegraphProbe ?? probeCodeGraphBinary;
    const probeResult = probe();
    if (probeResult.status === 'ready') {
      mcps.codegraph = {
        type: 'local',
        command: ['codegraph', 'serve', '--mcp', '--path', options.projectPath],
      };
    }
  }

  return mcps;
}
