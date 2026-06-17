import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createAgents, getAgentConfigs } from '../../agents';

describe('fork agent prompt overlays', () => {
  let tempDir: string;
  let configDir: string;
  let xdgDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fork-overlays-'));
    configDir = path.join(tempDir, 'opencode-config');
    xdgDir = path.join(tempDir, 'xdg-config');
    originalEnv = { ...process.env };
    process.env.OPENCODE_CONFIG_DIR = configDir;
    process.env.XDG_CONFIG_HOME = xdgDir;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('applies overlays through getAgentConfigs', () => {
    const configs = getAgentConfigs();

    expect(configs.designer.prompt).toContain(
      'Contract-first Human-facing Synthesis',
    );
    expect(configs.fixer.prompt).toContain('Task Package Review');
    expect(configs.oracle.prompt).toContain('Output Review Anti-Shell Gate');
  });

  test('does not force overlays onto replacement custom prompts', () => {
    const promptsDir = path.join(configDir, 'oh-my-opencode-slim');
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, 'fixer.md'), 'FULL REPLACEMENT');

    const fixer = createAgents().find((agent) => agent.name === 'fixer');

    expect(fixer?.config.prompt).toBe('FULL REPLACEMENT');
  });

  test('keeps overlays with append custom prompts', () => {
    const promptsDir = path.join(configDir, 'oh-my-opencode-slim');
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, 'fixer_append.md'), 'USER APPEND');

    const fixer = createAgents().find((agent) => agent.name === 'fixer');
    const prompt = fixer?.config.prompt;

    expect(prompt).toContain('USER APPEND');
    expect(prompt).toContain('Task Package Review');
  });
});
