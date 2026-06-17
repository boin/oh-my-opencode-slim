import { spawnSync } from 'node:child_process';
import type { McpConfig } from '../../mcp/types';

const CODEGRAPH_MIN_VERSION = '0.9.9';

export type CodeGraphProbeResult =
  | { status: 'ready'; version: string }
  | { status: 'missing'; version?: string }
  | { status: 'incompatible'; version: string };

export type CreateCodegraphMcpOptions = {
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

export function createCodegraphMcp(
  options: CreateCodegraphMcpOptions = {},
): McpConfig | undefined {
  if (!options.projectPath) {
    return undefined;
  }

  const probe = options.codegraphProbe ?? probeCodeGraphBinary;
  const probeResult = probe();
  if (probeResult.status !== 'ready') {
    return undefined;
  }

  return {
    type: 'local',
    command: ['codegraph', 'serve', '--mcp', '--path', options.projectPath],
  };
}
