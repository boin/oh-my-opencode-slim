import { execFile, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { PluginInput } from '@opencode-ai/plugin';
import { probeCodeGraphBinary } from '../../mcp';
import { createInternalAgentTextPart } from '../../utils';

const COMMAND_NAME = 'codegraph';

const COMMAND_TEMPLATE = `Manage CodeGraph for this project.

Usage:
  /codegraph status
  /codegraph init
  /codegraph reindex

USER REQUEST:
$ARGUMENTS`;

type ReadinessState =
  | 'missing-binary'
  | 'too-old'
  | 'not-git-worktree'
  | 'not-ignored'
  | 'large-repo'
  | 'not-initialized'
  | 'ready';

type CodegraphReadiness = {
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

type ReadinessService = {
  check: () => Promise<CodegraphReadiness>;
};

type Runner = {
  run: (command: string, args: string[]) => Promise<{ stdout: string }>;
};

export type CodegraphCommandManagerOptions = {
  readiness?: ReadinessService;
  runner?: Runner;
};

const execFileAsync = promisify(execFile);
const LARGE_REPO_TRACKED_FILE_THRESHOLD = 3000;

const runningByWorktree = new Set<string>();

function stateLabel(state: ReadinessState): string {
  switch (state) {
    case 'missing-binary':
      return 'missing binary';
    case 'too-old':
      return 'too old';
    case 'not-git-worktree':
      return 'not git worktree';
    case 'not-ignored':
      return 'not-ignored';
    case 'large-repo':
      return 'large-repo';
    case 'not-initialized':
      return 'not initialized';
    case 'ready':
      return 'ready';
  }
}

function formatStatus(readiness: CodegraphReadiness): string {
  const binary = readiness.binary;
  const project = readiness.project;
  const ignore = readiness.ignore;
  const index = readiness.index;
  const largeRepo = readiness.largeRepo;
  const lines = [
    'CodeGraph status',
    `State: ${readiness.state} (${stateLabel(readiness.state)})`,
    `Binary: ${binary?.path ?? 'not found'}; version ${binary?.version ?? 'unknown'}; minimum ${binary?.minimumVersion ?? '0.9.9'}; ${binary?.compatible ? 'compatible' : 'not compatible'}`,
    `Project: ${project?.root ?? 'unresolved'}`,
    `Worktree: ${project?.worktree ?? 'unresolved'}${project?.note ? ` (${project.note})` : ''}`,
    `.codegraph/: ${ignore?.codegraphIgnored ? 'ignored' : 'not ignored'}`,
    `Index: ${index?.exists ? 'present' : 'missing'}${index?.status ? ` (${index.status})` : ''}`,
  ];

  if (largeRepo) {
    lines.push(
      `Large repo gate: ${largeRepo.trackedFiles} tracked files / threshold ${largeRepo.threshold}`,
    );
  }

  lines.push(`Next action: ${readiness.nextAction}`);
  return lines.join('\n');
}

function usage(): string {
  return [
    'Usage: /codegraph status | init | reindex',
    '  /codegraph status  Show CodeGraph readiness for this worktree.',
    '  /codegraph init    Initialize and index this worktree.',
    '  /codegraph reindex Refresh the existing index.',
  ].join('\n');
}

function worktreeKey(readiness: CodegraphReadiness): string | undefined {
  return readiness.project?.worktree ?? readiness.project?.root;
}

function canRunInit(readiness: CodegraphReadiness): boolean {
  return readiness.state === 'not-initialized' || readiness.state === 'ready';
}

function canRunReindex(readiness: CodegraphReadiness): boolean {
  return readiness.state === 'ready' && readiness.index?.exists === true;
}

function blockedStatus(readiness: CodegraphReadiness): string {
  return `${formatStatus(readiness)}\n`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const maybeStderr = (error as { stderr?: unknown }).stderr;
    if (typeof maybeStderr === 'string' && maybeStderr.trim()) {
      return maybeStderr.trim();
    }
    return error.message;
  }
  return String(error);
}

function formatCommandError(step: string, error: unknown): string {
  return [
    'CodeGraph command-error',
    `Failed step: ${step}`,
    `Error: ${errorMessage(error)}`,
    'Next action: check CodeGraph output, fix the issue, then retry the command.',
  ].join('\n');
}

function runGit(
  cwd: string,
  args: string[],
): { status: number | null; stdout: string } {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
  };
}

function createDefaultReadiness(ctx: PluginInput): ReadinessService {
  return {
    async check(): Promise<CodegraphReadiness> {
      const binary = probeCodeGraphBinary();
      if (binary.status === 'missing') {
        return {
          state: 'missing-binary',
          binary: { minimumVersion: '0.9.9', compatible: false },
          nextAction: 'Install CodeGraph 0.9.9 or newer.',
        };
      }

      if (binary.status === 'incompatible') {
        return {
          state: 'too-old',
          binary: {
            path: 'codegraph',
            version: binary.version,
            minimumVersion: '0.9.9',
            compatible: false,
          },
          nextAction: 'Upgrade CodeGraph to 0.9.9 or newer.',
        };
      }

      const rootResult = runGit(ctx.directory, [
        'rev-parse',
        '--show-toplevel',
      ]);
      if (rootResult.status !== 0) {
        return {
          state: 'not-git-worktree',
          binary: {
            path: 'codegraph',
            version: binary.version,
            minimumVersion: '0.9.9',
            compatible: true,
          },
          nextAction: 'Run /codegraph from inside a git worktree.',
        };
      }

      const root = rootResult.stdout.trim();
      const worktree = fs.realpathSync(root);
      const gitDir = runGit(worktree, [
        'rev-parse',
        '--git-common-dir',
      ]).stdout.trim();
      const note =
        gitDir && gitDir !== '.git'
          ? `linked worktree: ${gitDir}`
          : 'primary worktree';
      const ignored =
        runGit(worktree, ['check-ignore', '-q', '.codegraph/']).status === 0;
      const trackedFiles = runGit(worktree, ['ls-files'])
        .stdout.split('\n')
        .filter(Boolean).length;
      const indexPath = path.join(worktree, '.codegraph', 'codegraph.db');
      const indexExists = fs.existsSync(indexPath);
      let indexStatus = indexExists ? 'present' : 'missing';
      if (indexExists) {
        const statusResult = spawnSync(
          'codegraph',
          ['status', '--json', worktree],
          {
            encoding: 'utf8',
          },
        );
        if (statusResult.status === 0 && statusResult.stdout) {
          try {
            const parsed = JSON.parse(statusResult.stdout) as {
              fileCount?: number;
              nodeCount?: number;
              edgeCount?: number;
              pendingChanges?: {
                added?: number;
                modified?: number;
                removed?: number;
              };
            };
            const pending = parsed.pendingChanges;
            indexStatus = [
              'present',
              `files: ${parsed.fileCount ?? 'unknown'}`,
              `nodes: ${parsed.nodeCount ?? 'unknown'}`,
              `edges: ${parsed.edgeCount ?? 'unknown'}`,
              pending
                ? `pending: +${pending.added ?? 0}/~${pending.modified ?? 0}/-${pending.removed ?? 0}`
                : undefined,
            ]
              .filter(Boolean)
              .join('; ');
          } catch {
            indexStatus = 'present; status parse failed';
          }
        } else {
          indexStatus = 'present; status unavailable';
        }
      }
      const common = {
        binary: {
          path: 'codegraph',
          version: binary.version,
          minimumVersion: '0.9.9',
          compatible: true,
        },
        project: { root, worktree, note },
        ignore: { codegraphIgnored: ignored },
        index: {
          exists: indexExists,
          status: indexStatus,
        },
      } satisfies Partial<CodegraphReadiness>;

      if (!ignored) {
        return {
          ...common,
          state: 'not-ignored',
          nextAction: 'Add .codegraph/ to .gitignore before init.',
        };
      }

      if (trackedFiles > LARGE_REPO_TRACKED_FILE_THRESHOLD) {
        return {
          ...common,
          state: 'large-repo',
          largeRepo: {
            trackedFiles,
            threshold: LARGE_REPO_TRACKED_FILE_THRESHOLD,
          },
          nextAction:
            'Reduce tracked files or raise the configured threshold before init.',
        };
      }

      if (!indexExists) {
        return {
          ...common,
          state: 'not-initialized',
          nextAction: 'Run /codegraph init.',
        };
      }

      return {
        ...common,
        state: 'ready',
        nextAction: 'MCP/project are ready.',
      };
    },
  };
}

function createDefaultRunner(): Runner {
  return {
    async run(command: string, args: string[]): Promise<{ stdout: string }> {
      const result = await execFileAsync(command, args, {
        encoding: 'utf8',
      });
      return { stdout: result.stdout };
    },
  };
}

export function createCodegraphCommandManager(
  ctx: PluginInput,
  options: CodegraphCommandManagerOptions = {},
) {
  const readinessService = options.readiness ?? createDefaultReadiness(ctx);
  const runner = options.runner ?? createDefaultRunner();

  function registerCommand(opencodeConfig: Record<string, unknown>): void {
    const configCommand = opencodeConfig.command as
      | Record<string, unknown>
      | undefined;
    if (!configCommand?.[COMMAND_NAME]) {
      if (!opencodeConfig.command) {
        opencodeConfig.command = {};
      }
      (opencodeConfig.command as Record<string, unknown>)[COMMAND_NAME] = {
        template: COMMAND_TEMPLATE,
        description:
          'Manage CodeGraph status, init, and reindex for this project',
      };
    }
  }

  async function handleCommandExecuteBefore(
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Array<{ type: string; text?: string }> },
  ): Promise<void> {
    if (input.command !== COMMAND_NAME) {
      return;
    }

    output.parts.length = 0;
    const arg = input.arguments.trim();
    const readiness = await readinessService.check();

    if (!arg || arg === 'status') {
      output.parts.push(createInternalAgentTextPart(formatStatus(readiness)));
      return;
    }

    if (arg === 'init') {
      if (!canRunInit(readiness)) {
        output.parts.push(
          createInternalAgentTextPart(blockedStatus(readiness)),
        );
        return;
      }

      const key = worktreeKey(readiness);
      if (!key) {
        output.parts.push(
          createInternalAgentTextPart(blockedStatus(readiness)),
        );
        return;
      }
      if (runningByWorktree.has(key)) {
        output.parts.push(
          createInternalAgentTextPart(
            `CodeGraph init already running for ${key}.`,
          ),
        );
        return;
      }

      runningByWorktree.add(key);
      try {
        try {
          await runner.run('codegraph', ['init', key]);
        } catch (error) {
          output.parts.push(
            createInternalAgentTextPart(
              formatCommandError('codegraph init', error),
            ),
          );
          return;
        }
        try {
          await runner.run('codegraph', ['index', key]);
        } catch (error) {
          output.parts.push(
            createInternalAgentTextPart(
              formatCommandError('codegraph index', error),
            ),
          );
          return;
        }
      } finally {
        runningByWorktree.delete(key);
      }

      output.parts.push(
        createInternalAgentTextPart(`CodeGraph init complete for ${key}.`),
      );
      return;
    }

    if (arg === 'reindex') {
      if (!canRunReindex(readiness)) {
        output.parts.push(
          createInternalAgentTextPart(
            `${blockedStatus(readiness)}Run /codegraph init before reindex.`,
          ),
        );
        return;
      }

      const key = worktreeKey(readiness);
      if (!key) {
        output.parts.push(
          createInternalAgentTextPart(blockedStatus(readiness)),
        );
        return;
      }
      if (runningByWorktree.has(key)) {
        output.parts.push(
          createInternalAgentTextPart(
            `CodeGraph reindex already running for ${key}.`,
          ),
        );
        return;
      }

      runningByWorktree.add(key);
      try {
        try {
          await runner.run('codegraph', ['index', key]);
        } catch (error) {
          output.parts.push(
            createInternalAgentTextPart(
              formatCommandError('codegraph index', error),
            ),
          );
          return;
        }
      } finally {
        runningByWorktree.delete(key);
      }

      output.parts.push(
        createInternalAgentTextPart(`CodeGraph reindex complete for ${key}.`),
      );
      return;
    }

    output.parts.push(createInternalAgentTextPart(usage()));
  }

  return { registerCommand, handleCommandExecuteBefore };
}

export type CodegraphCommandManager = ReturnType<
  typeof createCodegraphCommandManager
>;
