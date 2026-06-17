import type { McpName, WebsearchConfig } from '../config';
import {
  type CodeGraphProbeResult,
  createCodegraphMcp,
} from '../fork/mcp/codegraph';
import { context7 } from './context7';
import { gh_grep } from './grep-app';
import type { McpConfig } from './types';
import { createWebsearchConfig, websearch } from './websearch';

export type { CodeGraphProbeResult } from '../fork/mcp/codegraph';
export { probeCodeGraphBinary } from '../fork/mcp/codegraph';
export type { LocalMcpConfig, McpConfig, RemoteMcpConfig } from './types';

type StaticMcpName = Exclude<McpName, 'codegraph'>;

const allBuiltinMcps: Record<StaticMcpName, McpConfig> = {
  websearch,
  context7,
  gh_grep,
};

export type CreateBuiltinMcpsOptions = {
  projectPath?: string;
  codegraphProbe?: () => CodeGraphProbeResult;
};

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
    const codegraph = createCodegraphMcp(options);
    if (codegraph) {
      mcps.codegraph = codegraph;
    }
  }

  return mcps;
}
