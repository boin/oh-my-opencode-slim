import { describe, expect, mock, test } from 'bun:test';
import { createCodegraphCommandManager } from './command';

type ReadinessState =
  | 'missing-binary'
  | 'too-old'
  | 'not-git-worktree'
  | 'not-ignored'
  | 'large-repo'
  | 'not-initialized'
  | 'ready';

type FakeReadiness = {
  state: ReadinessState;
  binary?: {
    path?: string;
    version?: string;
    minimumVersion: string;
    compatible: boolean;
  };
  project?: {
    root: string;
    worktree: string;
    note: string;
  };
  ignore?: {
    codegraphIgnored: boolean;
  };
  index?: {
    exists: boolean;
    status: string;
  };
  largeRepo?: {
    trackedFiles: number;
    threshold: number;
  };
  nextAction: string;
};

type Output = { parts: Array<{ type: string; text?: string }> };

function createOutput(): Output {
  return {
    parts: [{ type: 'text', text: 'template output must be cleared' }],
  };
}

function getOutputText(output: Output): string {
  return output.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('\n');
}

function ready(overrides: Partial<FakeReadiness> = {}): FakeReadiness {
  return {
    state: 'ready',
    binary: {
      path: '/usr/local/bin/codegraph',
      version: '0.9.9',
      minimumVersion: '0.9.9',
      compatible: true,
    },
    project: {
      root: '/workspace/project',
      worktree: '/workspace/project',
      note: 'primary worktree',
    },
    ignore: { codegraphIgnored: true },
    index: { exists: true, status: 'present' },
    nextAction: 'MCP/project are ready.',
    ...overrides,
  };
}

function createContext() {
  return {
    directory: '/workspace/project',
    client: {},
  } as any;
}

function createManager(options: {
  readiness: FakeReadiness;
  run?: (command: string, args: string[]) => Promise<{ stdout: string }>;
}) {
  const checkReadiness = mock(async () => options.readiness);
  const run = mock(
    options.run ?? (async () => ({ stdout: 'ok' })),
  ) as unknown as ReturnType<typeof mock>;

  const manager = createCodegraphCommandManager(createContext(), {
    readiness: { check: checkReadiness },
    runner: { run },
  });

  return { manager, checkReadiness, run };
}

describe('createCodegraphCommandManager', () => {
  test('registerCommand adds /codegraph without overwriting an existing command', () => {
    const { manager } = createManager({ readiness: ready() });
    const config: Record<string, unknown> = {};

    manager.registerCommand(config);

    const commands = config.command as Record<string, { template: string }>;
    expect(commands.codegraph).toBeDefined();
    expect(commands.codegraph.template).toContain('CodeGraph');
    expect(commands.codegraph.template).toContain('$ARGUMENTS');

    const existing = { template: 'custom', description: 'custom' };
    manager.registerCommand({ command: { codegraph: existing } });
    const secondConfig = { command: { codegraph: existing } };
    manager.registerCommand(secondConfig);

    expect(secondConfig.command.codegraph).toBe(existing);
  });

  test.each([
    '',
    'status',
  ])('status command %p clears template output and reports readiness fields', async (argumentsText) => {
    const { manager, run } = createManager({ readiness: ready() });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: argumentsText },
      output,
    );

    const text = getOutputText(output);
    expect(text).not.toContain('template output must be cleared');
    expect(text).toContain('CodeGraph status');
    expect(text).toContain('Binary');
    expect(text).toContain('0.9.9');
    expect(text).toContain('compatible');
    expect(text).toContain('Project');
    expect(text).toContain('/workspace/project');
    expect(text).toContain('Worktree');
    expect(text).toContain('primary worktree');
    expect(text).toContain('.codegraph/');
    expect(text).toContain('ignored');
    expect(text).toContain('Index');
    expect(text).toContain('present');
    expect(text).toContain('Next action');
    expect(text).toContain('MCP/project are ready');
    expect(run).not.toHaveBeenCalled();
  });

  test.each([
    ['ready', ready(), ['ready', 'MCP/project are ready']],
    [
      'not-initialized',
      ready({
        state: 'not-initialized',
        index: { exists: false, status: 'missing' },
        nextAction: 'Run /codegraph init.',
      }),
      ['not initialized', '/codegraph init'],
    ],
    [
      'not-ignored',
      ready({
        state: 'not-ignored',
        ignore: { codegraphIgnored: false },
        nextAction: 'Add .codegraph/ to .gitignore before init.',
      }),
      ['not-ignored', 'Add .codegraph/ to .gitignore'],
    ],
    [
      'too-old',
      ready({
        state: 'too-old',
        binary: {
          path: '/usr/local/bin/codegraph',
          version: '0.9.7',
          minimumVersion: '0.9.9',
          compatible: false,
        },
        nextAction: 'Upgrade CodeGraph to 0.9.9 or newer.',
      }),
      ['too old', '0.9.7', '0.9.9', 'Upgrade CodeGraph'],
    ],
    [
      'missing-binary',
      ready({
        state: 'missing-binary',
        binary: { minimumVersion: '0.9.9', compatible: false },
        nextAction: 'Install CodeGraph 0.9.9 or newer.',
      }),
      ['missing binary', 'Install CodeGraph'],
    ],
  ] as const)('status copy covers %s next action', async (_name, readiness, expectedParts) => {
    const { manager } = createManager({ readiness });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'status' },
      output,
    );

    const text = getOutputText(output);
    for (const part of expectedParts) {
      expect(text).toContain(part);
    }
  });

  test.each([
    [
      'missing binary',
      ready({
        state: 'missing-binary',
        binary: { minimumVersion: '0.9.9', compatible: false },
        nextAction: 'Install CodeGraph 0.9.9 or newer.',
      }),
      ['missing-binary', 'Install CodeGraph'],
    ],
    [
      'too old binary',
      ready({
        state: 'too-old',
        binary: {
          path: '/usr/local/bin/codegraph',
          version: '0.9.7',
          minimumVersion: '0.9.9',
          compatible: false,
        },
        nextAction: 'Upgrade CodeGraph to 0.9.9 or newer.',
      }),
      ['too-old', 'Upgrade CodeGraph'],
    ],
    [
      'missing ignore',
      ready({
        state: 'not-ignored',
        ignore: { codegraphIgnored: false },
        nextAction: 'Add .codegraph/ to .gitignore before init.',
      }),
      ['not-ignored', 'Add .codegraph/ to .gitignore'],
    ],
    [
      'large repo',
      ready({
        state: 'large-repo',
        largeRepo: { trackedFiles: 125000, threshold: 100000 },
        nextAction: 'Reduce tracked files or raise the configured threshold.',
      }),
      ['large-repo', '125000', '100000'],
    ],
  ] as const)('init refuses %s gate', async (_name, readiness, expectedParts) => {
    const { manager, run } = createManager({ readiness });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'init' },
      output,
    );

    const text = getOutputText(output);
    for (const part of expectedParts) {
      expect(text).toContain(part);
    }
    expect(text).toContain('Next action');
    expect(run).not.toHaveBeenCalled();
  });

  test('successful init runs CodeGraph init/index commands with current worktree root', async () => {
    const { manager, run } = createManager({
      readiness: ready({
        state: 'not-initialized',
        index: { exists: false, status: 'missing' },
      }),
    });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'init' },
      output,
    );

    expect(run).toHaveBeenCalledWith('codegraph', [
      'init',
      '/workspace/project',
    ]);
    expect(run).toHaveBeenCalledWith('codegraph', [
      'index',
      '/workspace/project',
    ]);
    expect(getOutputText(output)).toContain('CodeGraph init complete');
  });

  test('init reports command-error when CodeGraph init fails', async () => {
    const { manager } = createManager({
      readiness: ready({
        state: 'not-initialized',
        index: { exists: false, status: 'missing' },
      }),
      run: async () => {
        throw new Error('init boom');
      },
    });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'init' },
      output,
    );

    const text = getOutputText(output);
    expect(text).toContain('command-error');
    expect(text).toContain('codegraph init');
    expect(text).toContain('init boom');
    expect(text).toContain('Next action');
  });

  test('init reports command-error when CodeGraph index fails', async () => {
    let calls = 0;
    const { manager } = createManager({
      readiness: ready({
        state: 'not-initialized',
        index: { exists: false, status: 'missing' },
      }),
      run: async () => {
        calls += 1;
        if (calls === 2) throw new Error('index boom');
        return { stdout: 'ok' };
      },
    });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'init' },
      output,
    );

    const text = getOutputText(output);
    expect(text).toContain('command-error');
    expect(text).toContain('codegraph index');
    expect(text).toContain('index boom');
  });

  test('reindex requires existing index and uses current worktree root', async () => {
    const missing = createManager({
      readiness: ready({
        state: 'not-initialized',
        index: { exists: false, status: 'missing' },
      }),
    });
    const missingOutput = createOutput();

    await missing.manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'reindex' },
      missingOutput,
    );

    expect(getOutputText(missingOutput)).toContain('/codegraph init');
    expect(missing.run).not.toHaveBeenCalled();

    const readyManager = createManager({ readiness: ready() });
    const output = createOutput();

    await readyManager.manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'reindex' },
      output,
    );

    expect(readyManager.run).toHaveBeenCalledWith('codegraph', [
      'index',
      '/workspace/project',
    ]);
    expect(getOutputText(output)).toContain('CodeGraph reindex complete');
  });

  test('reindex reports command-error when CodeGraph index fails', async () => {
    const { manager } = createManager({
      readiness: ready(),
      run: async () => {
        throw new Error('reindex boom');
      },
    });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'reindex' },
      output,
    );

    const text = getOutputText(output);
    expect(text).toContain('command-error');
    expect(text).toContain('codegraph index');
    expect(text).toContain('reindex boom');
  });

  test('duplicate init for the same real worktree is already-running and does not spawn twice', async () => {
    let finishRun: (() => void) | undefined;
    let runCalls = 0;
    const { manager, run } = createManager({
      readiness: ready({
        state: 'not-initialized',
        index: { exists: false, status: 'missing' },
      }),
      run: async () => {
        runCalls += 1;
        if (runCalls > 1) {
          return { stdout: 'ok' };
        }
        await new Promise<void>((resolve) => {
          finishRun = resolve;
        });
        return { stdout: 'ok' };
      },
    });

    const first = createOutput();
    const firstRun = manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'init' },
      first,
    );
    await Promise.resolve();

    const second = createOutput();
    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'init' },
      second,
    );

    expect(getOutputText(second)).toContain('already running');
    expect(run).toHaveBeenCalledTimes(1);

    finishRun?.();
    await firstRun;
  });

  test('duplicate reindex for the same real worktree is already-running and does not spawn twice', async () => {
    let finishRun: (() => void) | undefined;
    const { manager, run } = createManager({
      readiness: ready(),
      run: async () => {
        await new Promise<void>((resolve) => {
          finishRun = resolve;
        });
        return { stdout: 'ok' };
      },
    });

    const first = manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'reindex' },
      createOutput(),
    );
    await Promise.resolve();

    const second = createOutput();
    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'reindex' },
      second,
    );

    expect(getOutputText(second)).toContain('already running');
    expect(run).toHaveBeenCalledTimes(1);

    finishRun?.();
    await first;
  });

  test('unknown args return concise usage', async () => {
    const { manager, run } = createManager({ readiness: ready() });
    const output = createOutput();

    await manager.handleCommandExecuteBefore(
      { command: 'codegraph', sessionID: 's1', arguments: 'wat now' },
      output,
    );

    const text = getOutputText(output);
    expect(text).toContain('Usage');
    expect(text).toContain('/codegraph status');
    expect(text).toContain('/codegraph init');
    expect(text).toContain('/codegraph reindex');
    expect(text.length).toBeLessThan(500);
    expect(run).not.toHaveBeenCalled();
  });
});
