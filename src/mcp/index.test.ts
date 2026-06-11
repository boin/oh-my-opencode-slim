import { describe, expect, test } from 'bun:test';
import { createBuiltinMcps } from './index';

describe('createBuiltinMcps', () => {
  test('returns all MCPs when no disabled list provided', () => {
    const mcps = createBuiltinMcps();
    const names = Object.keys(mcps);

    expect(names).toContain('websearch');
    expect(names).toContain('context7');
    expect(names).toContain('grep_app');
  });

  test('returns all MCPs with empty disabled list', () => {
    const mcps = createBuiltinMcps([]);
    const names = Object.keys(mcps);

    expect(names.length).toBe(3);
    expect(names).toContain('websearch');
    expect(names).toContain('context7');
    expect(names).toContain('grep_app');
  });

  test('excludes single disabled MCP', () => {
    const mcps = createBuiltinMcps(['websearch']);
    const names = Object.keys(mcps);

    expect(names).not.toContain('websearch');
    expect(names).toContain('context7');
    expect(names).toContain('grep_app');
  });

  test('excludes multiple disabled MCPs', () => {
    const mcps = createBuiltinMcps(['websearch', 'grep_app']);
    const names = Object.keys(mcps);

    expect(names).not.toContain('websearch');
    expect(names).not.toContain('grep_app');
    expect(names).toContain('context7');
    expect(names.length).toBe(1);
  });

  test('excludes all MCPs when all disabled', () => {
    const mcps = createBuiltinMcps(['websearch', 'context7', 'grep_app']);
    const names = Object.keys(mcps);

    expect(names.length).toBe(0);
  });

  test('ignores unknown MCP names in disabled list', () => {
    const mcps = createBuiltinMcps(['unknown_mcp', 'nonexistent']);
    const names = Object.keys(mcps);

    // All valid MCPs should still be present
    expect(names.length).toBe(3);
    expect(names).toContain('websearch');
    expect(names).toContain('context7');
    expect(names).toContain('grep_app');
  });

  test('MCP configs have required properties', () => {
    const mcps = createBuiltinMcps();

    for (const [_name, config] of Object.entries(mcps)) {
      expect(config).toBeDefined();
      // Each MCP should have either url (remote) or command (local)
      const hasUrl = 'url' in config;
      const hasCommand = 'command' in config;
      expect(hasUrl || hasCommand).toBe(true);
    }
  });

  test('websearch MCP has correct structure', () => {
    const mcps = createBuiltinMcps();
    const websearch = mcps.websearch;

    expect(websearch).toBeDefined();
    expect('url' in websearch).toBe(true);
  });

  test('context7 MCP has correct structure', () => {
    const mcps = createBuiltinMcps();
    const context7 = mcps.context7;

    expect(context7).toBeDefined();
    expect('url' in context7).toBe(true);
  });

  test('grep_app MCP has correct structure', () => {
    const mcps = createBuiltinMcps();
    const grep_app = mcps.grep_app;

    expect(grep_app).toBeDefined();
    expect('url' in grep_app).toBe(true);
  });

  test('includes compatible CodeGraph as local MCP bound to project path', () => {
    const mcps = createBuiltinMcps([], undefined, {
      projectPath: '/repo',
      codegraphProbe: () => ({ status: 'ready', version: '0.9.9' }),
    });
    const codegraph = mcps.codegraph;

    expect(codegraph).toBeDefined();
    expect(codegraph?.type).toBe('local');
    expect(codegraph && 'command' in codegraph).toBe(true);
    if (!codegraph || !('command' in codegraph)) {
      return;
    }
    expect(codegraph.command).toContain('codegraph');
    expect(codegraph.command).toContain('serve');
    expect(codegraph.command).toContain('--mcp');
    expect(codegraph.command).toContain('/repo');
  });

  test('omits CodeGraph without throwing when binary probe is missing', () => {
    let probeCalls = 0;

    const mcps = createBuiltinMcps([], undefined, {
      projectPath: '/repo',
      codegraphProbe: () => {
        probeCalls += 1;
        return { status: 'missing' };
      },
    });

    expect(probeCalls).toBe(1);
    expect(mcps.codegraph).toBeUndefined();
  });

  test('omits CodeGraph without throwing when binary is too old', () => {
    let probeCalls = 0;

    const mcps = createBuiltinMcps([], undefined, {
      projectPath: '/repo',
      codegraphProbe: () => {
        probeCalls += 1;
        return { status: 'incompatible', version: '0.9.7' };
      },
    });

    expect(probeCalls).toBe(1);
    expect(mcps.codegraph).toBeUndefined();
  });

  test('disabled CodeGraph is omitted even when binary is ready', () => {
    let probeCalls = 0;

    const mcps = createBuiltinMcps(['codegraph'], undefined, {
      projectPath: '/repo',
      codegraphProbe: () => {
        probeCalls += 1;
        return { status: 'ready', version: '0.9.9' };
      },
    });

    expect(probeCalls).toBe(0);
    expect(mcps.codegraph).toBeUndefined();
  });

  test('CodeGraph readiness uses probe injection without init or index commands', () => {
    const mcps = createBuiltinMcps([], undefined, {
      projectPath: '/repo',
      codegraphProbe: () => ({ status: 'ready', version: '0.9.9' }),
    });

    expect(mcps.codegraph).toBeDefined();
  });
});
