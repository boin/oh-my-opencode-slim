import { describe, expect, test } from 'bun:test';
import { DEFAULT_AGENT_MCPS, parseList } from './agent-mcps';

describe('parseList', () => {
  test('empty list returns empty array', () => {
    expect(parseList([], ['mcp1', 'mcp2'])).toEqual([]);
  });

  test('wildcard includes all available', () => {
    expect(parseList(['*'], ['mcp1', 'mcp2', 'mcp3'])).toEqual([
      'mcp1',
      'mcp2',
      'mcp3',
    ]);
  });

  test('orchestrator wildcard excludes context7 but includes custom mcps', () => {
    expect(
      parseList(DEFAULT_AGENT_MCPS.orchestrator, [
        'websearch',
        'context7',
        'grep_app',
        'custom-mcp',
      ]),
    ).toEqual(['websearch', 'grep_app', 'custom-mcp']);
  });

  test('wildcard with exclusions', () => {
    expect(parseList(['*', '!mcp2'], ['mcp1', 'mcp2', 'mcp3'])).toEqual([
      'mcp1',
      'mcp3',
    ]);
  });

  test('exclude wildcard returns empty', () => {
    expect(parseList(['!*'], ['mcp1', 'mcp2'])).toEqual([]);
  });

  test('specific items only', () => {
    expect(
      parseList(['mcp1', 'mcp3'], ['mcp1', 'mcp2', 'mcp3', 'mcp4']),
    ).toEqual(['mcp1', 'mcp3']);
  });

  test('specific items with exclusions', () => {
    expect(
      parseList(['mcp1', 'mcp3', '!mcp3'], ['mcp1', 'mcp2', 'mcp3']),
    ).toEqual(['mcp1']);
  });

  test('exclusions without matching allows', () => {
    expect(parseList(['!mcp2'], ['mcp1', 'mcp2', 'mcp3'])).toEqual([]);
  });

  test('agent MCP defaults grant CodeGraph to orchestrator via wildcard', () => {
    expect(DEFAULT_AGENT_MCPS.orchestrator).toContain('*');
    expect(
      parseList(DEFAULT_AGENT_MCPS.orchestrator, [
        'websearch',
        'context7',
        'grep_app',
        'codegraph',
      ]),
    ).toContain('codegraph');
  });

  test('agent MCP defaults grant CodeGraph to explorer and oracle', () => {
    const availableMcps = ['websearch', 'context7', 'grep_app', 'codegraph'];

    expect(parseList(DEFAULT_AGENT_MCPS.explorer, availableMcps)).toContain(
      'codegraph',
    );
    expect(parseList(DEFAULT_AGENT_MCPS.oracle, availableMcps)).toContain(
      'codegraph',
    );
  });

  test('agent MCP defaults deny CodeGraph to fixer', () => {
    expect(
      parseList(DEFAULT_AGENT_MCPS.fixer, [
        'websearch',
        'context7',
        'grep_app',
        'codegraph',
      ]),
    ).not.toContain('codegraph');
  });
});
