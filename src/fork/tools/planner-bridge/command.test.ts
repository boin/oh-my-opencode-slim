import { afterEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  allowDurablePlanSaveInPlanMode,
  createPlanIntentHandoffHook,
  createPlannerBridgeCommandManager,
  createPlannerBridgeTools,
} from './command';

type Output = { parts: Array<{ type: string; text?: string }> };

const tempDirs: string[] = [];

function makeTempProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-bridge-'));
  tempDirs.push(root);
  fs.mkdirSync(path.join(root, 'docs', 'spec', 'jobs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'spec', 'archive'), { recursive: true });
  return root;
}

function createContext(root: string) {
  return {
    directory: root,
    client: {},
  } as any;
}

function createOutput(): Output {
  return { parts: [{ type: 'text', text: 'template output must be cleared' }] };
}

function getOutputText(output: Output): string {
  return output.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('\n');
}

async function runCommand(
  root: string,
  command: string,
  argumentsText: string,
): Promise<string> {
  const manager = createPlannerBridgeCommandManager(createContext(root), {
    now: () => new Date('2026-06-29T12:00:00.000Z'),
    homeDir: path.join(root, 'home'),
  });
  const output = createOutput();
  await manager.handleCommandExecuteBefore(
    { command, sessionID: 's1', arguments: argumentsText },
    output,
  );
  return getOutputText(output);
}

function writePlan(
  root: string,
  name = 'plan.md',
): { file: string; hash: string } {
  const content = [
    '# Build Planner Bridge',
    '',
    'Review status: approved',
    '',
    'Implement an imported SDD job from markdown.',
    '',
  ].join('\n');
  const file = path.join(root, name);
  fs.writeFileSync(file, content, 'utf8');
  return {
    file,
    hash: createHash('sha256').update(content).digest('hex'),
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('createPlannerBridgeCommandManager', () => {
  test('command registration templates instruct agent to call bridge tools', () => {
    const root = makeTempProject();
    const manager = createPlannerBridgeCommandManager(createContext(root));
    const config: Record<string, unknown> = {};

    manager.registerCommand(config);

    const commands = config.command as Record<
      string,
      { template: string; description: string }
    >;
    expect(commands['plan-save'].template).toContain('plan_save');
    expect(commands['plan-save'].template).toContain('Plan Mode exception');
    expect(commands['plan-save'].template).toContain('mutating bash');
    expect(commands['plan-save'].template).toContain('plan_to_sdd');
    expect(commands['plan-save'].template).toContain(
      'Do NOT call any external planner plugin',
    );
    expect(commands['plan-read'].template).toContain('plan_read');
    expect(commands['plan-list'].template).toContain('plan_list');
    expect(commands['plan-ready'].template).toContain('plan_ready');
    expect(commands['plan-finish'].template).toContain('plan_finish');
    expect(commands['plan-to-sdd'].template).toContain('plan_to_sdd');
    expect(commands['plan-to-sdd'].template).toContain('confirm_import=true');
    expect(commands['plan-to-sdd'].template).toContain(
      'continue by inspecting the generated docs/spec/jobs/<slug>/ job',
    );
    expect(commands['sdd-plan-detect'].template).toContain('sdd_plan_detect');
    expect(commands['sdd-plan-detect'].template).toContain(
      'Do NOT call sdd_from_plan',
    );
    expect(commands['sdd-plan-detect'].template).toContain(
      'return its output verbatim',
    );
    expect(commands['sdd-from-plan'].template).toContain('sdd_from_plan');
    expect(commands['sdd-from-plan'].template).toContain('confirm_import=true');
    expect(commands['sdd-from-plan'].template).toContain(
      'path, optional slug, and optional domain',
    );
    expect(commands['sdd-from-plan'].template).toContain(
      'continue by inspecting the generated docs/spec/jobs/<slug>/ job',
    );
  });

  test('plan_save writes durable session markdown and plan_read returns it', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });

    const saved = await tools.plan_save.execute(
      {
        title: 'Durable Plan',
        content: 'Goal: keep a recoverable plan on disk.',
      },
      { sessionID: 'ses_plan123' } as any,
    );

    const planPath = path.join(root, '.opencode', 'plans', 'ses-plan123.md');
    expect(saved).toContain(`Plan saved: ${planPath}`);
    expect(fs.existsSync(planPath)).toBe(true);
    expect(fs.readFileSync(planPath, 'utf8')).toContain('# Durable Plan');

    const read = await tools.plan_read.execute({}, {
      sessionID: 'ses_plan123',
    } as any);

    expect(read).toContain(`Plan path: ${planPath}`);
    expect(read).toContain('Goal: keep a recoverable plan on disk.');
  });

  test('plan_save allows explicit root plan-looking paths', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });

    const saved = await tools.plan_save.execute(
      {
        path: 'plan.md',
        title: 'Root Plan',
        content: 'Goal: save a safe root-level durable plan.',
      },
      { sessionID: 'ses_root' } as any,
    );

    expect(saved).toContain(`Plan saved: ${path.join(root, 'plan.md')}`);
    expect(fs.existsSync(path.join(root, 'plan.md'))).toBe(true);
  });

  test('plan_save refuses unsafe explicit markdown paths', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });

    const unsafe = await tools.plan_save.execute(
      {
        path: 'docs/notes.md',
        title: 'Unsafe Plan',
        content: 'Goal: this should not be written.',
      },
      { sessionID: 'ses_unsafe' } as any,
    );
    const archive = await tools.plan_save.execute(
      {
        path: '.opencode/plans/archive/old-plan.md',
        title: 'Archive Plan',
        content: 'Goal: this should not be written either.',
      },
      { sessionID: 'ses_archive' } as any,
    );

    expect(unsafe).toContain('Refused: explicit plan_save path');
    expect(archive).toContain('Refused: explicit plan_save path');
    expect(fs.existsSync(path.join(root, 'docs', 'notes.md'))).toBe(false);
    expect(
      fs.existsSync(path.join(root, '.opencode', 'plans', 'archive')),
    ).toBe(false);
  });

  test('plan_list detects durable local markdown plans without writes', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });

    await tools.plan_save.execute(
      { title: 'Listable Plan', content: 'Plan body.' },
      { sessionID: 'ses_list' } as any,
    );
    const beforeJobs = fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'));
    const text = await tools.plan_list.execute({}, {} as any);
    const afterJobs = fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'));

    expect(text).toContain('Listable Plan');
    expect(text).toContain('.opencode/plans/ses-list.md');
    expect(afterJobs).toEqual(beforeJobs);
  });

  test('plan_to_sdd imports the current session markdown plan', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });
    await tools.plan_save.execute(
      {
        title: 'Current Session Plan',
        content: 'Implement lightweight plan persistence.',
      },
      { sessionID: 'ses_to_sdd' } as any,
    );

    const text = await tools.plan_to_sdd.execute(
      {
        slug: 'current-session-plan',
        domain: 'sdd-workflow',
        confirm_import: true,
      },
      { sessionID: 'ses_to_sdd' } as any,
    );

    expect(text).toContain(
      'imported into docs/spec/jobs/current-session-plan/',
    );
    expect(text).toContain('Next action: continue native SDD preparation');
    expect(text).toContain('replacing imported placeholders');
    const jobDir = path.join(
      root,
      'docs',
      'spec',
      'jobs',
      'current-session-plan',
    );
    expect(fs.existsSync(path.join(jobDir, 'proposal.md'))).toBe(true);
    expect(fs.readFileSync(path.join(jobDir, 'proposal.md'), 'utf8')).toContain(
      'Current Session Plan',
    );
    expect(
      fs.existsSync(path.join(root, '.opencode', 'plans', 'ses-to-sdd.md')),
    ).toBe(false);
    expect(
      fs.readdirSync(path.join(root, '.opencode', 'plans', 'archive'))[0],
    ).toContain('imported-ses-to-sdd.md');
  });

  test('plan_ready decides direct execution for a low-risk current plan', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });
    await tools.plan_save.execute(
      {
        title: 'Copy Update',
        content: 'Goal: update local README wording. Validate with bun test.',
      },
      { sessionID: 'ses_direct' } as any,
    );

    const text = await tools.plan_ready.execute({ auto: true }, {
      sessionID: 'ses_direct',
    } as any);

    expect(text).toContain('Decision: direct-execution');
    expect(text).toContain('plan_finish');
    expect(text).toContain('Next after leaving Plan Mode:');
    expect(text).toContain('Do not run this from the current Plan Mode turn.');
  });

  test('plan_ready decides SDD for API and persistence plans', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });
    await tools.plan_save.execute(
      {
        title: 'Account API Migration',
        content: 'Goal: change API persistence workflow. Validate migration.',
      },
      { sessionID: 'ses_sdd' } as any,
    );

    const text = await tools.plan_ready.execute(
      { auto: true, domain: 'sdd-workflow' },
      { sessionID: 'ses_sdd' } as any,
    );

    expect(text).toContain('Decision: needs-sdd');
    expect(text).toContain('/plan-to-sdd');
    expect(text).toContain('Next after leaving Plan Mode:');
    expect(text).toContain('Do not run this from the current Plan Mode turn.');
  });

  test('plan_finish archives an active plan as executing', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });
    await tools.plan_save.execute(
      { title: 'Execute Plan', content: 'Goal: execute this plan safely.' },
      { sessionID: 'ses_finish' } as any,
    );

    const text = await tools.plan_finish.execute(
      { status: 'executing', reason: 'SDD not required' },
      { sessionID: 'ses_finish' } as any,
    );

    expect(text).toContain('State: draft → executing');
    expect(text).toContain('Archived:');
    expect(
      fs.existsSync(path.join(root, '.opencode', 'plans', 'ses-finish.md')),
    ).toBe(false);
    const archived = fs.readdirSync(
      path.join(root, '.opencode', 'plans', 'archive'),
    );
    expect(archived[0]).toContain('executing-ses-finish.md');
  });

  test('natural start intent injects plan_ready guidance when active plan exists', async () => {
    const root = makeTempProject();
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });
    await tools.plan_save.execute(
      { title: 'Natural Intent', content: 'Goal: execute this plan safely.' },
      { sessionID: 'ses_natural' } as any,
    );
    const hook = createPlanIntentHandoffHook(createContext(root));
    const messages = [
      {
        info: { role: 'user', agent: 'orchestrator', sessionID: 'ses_natural' },
        parts: [{ type: 'text', text: '开干 + smoke' }],
      },
    ];

    hook.handleMessagesTransform({ messages });

    expect(messages[0].parts.map((part) => part.text).join('\n')).toContain(
      'plan_ready first',
    );
  });

  test('natural plan authoring intent injects plan_save guidance without existing plan', () => {
    const root = makeTempProject();
    const hook = createPlanIntentHandoffHook(createContext(root));
    const messages = [
      {
        info: { role: 'user', agent: 'orchestrator', sessionID: 'ses_author' },
        parts: [{ type: 'text', text: '做个计划' }],
      },
    ];

    hook.handleMessagesTransform({ messages });

    const text = messages[0].parts.map((part) => part.text).join('\n');
    expect(text).toContain('plan_save');
    expect(text).toContain('Do not implement');
  });

  test('natural readiness intent injects plan_ready guidance without existing plan', () => {
    const root = makeTempProject();
    const hook = createPlanIntentHandoffHook(createContext(root));
    const messages = [
      {
        info: { role: 'user', agent: 'orchestrator', sessionID: 'ses_ready' },
        parts: [{ type: 'text', text: '差不多了' }],
      },
    ];

    hook.handleMessagesTransform({ messages });

    const text = messages[0].parts.map((part) => part.text).join('\n');
    expect(text).toContain('plan_ready first');
    expect(text).toContain('save that content with plan_save first');
    expect(text).toContain('Do not implement');
  });

  test('Plan Mode policy helper normalizes absolute write bans', () => {
    const system = [
      'You are in Plan Mode. Do not write files. ZERO exceptions.',
    ];

    allowDurablePlanSaveInPlanMode(system);

    const text = system.join('\n');
    expect(text).not.toContain('ZERO exceptions');
    expect(text).not.toContain('Do not write files. ZERO exceptions');
    expect(text).toContain('plan_save tool');
    expect(text).toContain('except durable markdown plans via plan_save');
    expect(text).toContain('only durable-plan write allowed');
    expect(text).toContain('Do not use edit, write, apply_patch');
    expect(text).toContain('plan_to_sdd');
    expect(text).toContain('sdd_from_plan');
  });

  test('Plan Mode policy helper normalizes full host reminder fixture', () => {
    const system = [
      [
        '<system-reminder>',
        'You are in Plan Mode. The user has explicitly requested planning only.',
        'STRICTLY FORBIDDEN: ANY file edits, modifications, or system changes.',
        'ABSOLUTE CONSTRAINT: No file writes.',
        'You may inspect files, search, and discuss the plan, but do not write files.',
        'ZERO exceptions.',
        '</system-reminder>',
      ].join('\n'),
    ];

    allowDurablePlanSaveInPlanMode(system);
    allowDurablePlanSaveInPlanMode(system);

    const text = system.join('\n');
    expect(text).not.toContain('STRICTLY FORBIDDEN: ANY file edits');
    expect(text).not.toContain('ABSOLUTE CONSTRAINT: No file writes');
    expect(text).not.toContain('ZERO exceptions');
    expect(text).not.toContain('do not write files.');
    expect(text).toContain(
      'STRICTLY FORBIDDEN for non-plan changes: any file edits',
    );
    expect(text).toContain('ABSOLUTE CONSTRAINT for non-plan changes');
    expect(text).toContain('plan_save tool is the only durable-plan write');
    expect(text).toContain('Do not use edit, write, apply_patch');
    expect(text).toContain('plan_to_sdd');
    expect(text).toContain('sdd_from_plan');
    expect(text.match(/Fork-local durable Plan Mode policy/g)?.length).toBe(1);
    expect(text.match(/Single exception:/g)?.length).toBe(1);
  });

  test('Plan Mode policy helper is idempotent and ignores non-Plan Mode', () => {
    const system = ['You are in Plan Mode. No tools that write files.'];
    const nonPlanMode = ['Normal system reminder. Do not write files.'];

    allowDurablePlanSaveInPlanMode(system);
    allowDurablePlanSaveInPlanMode(system);
    allowDurablePlanSaveInPlanMode(nonPlanMode);

    const text = system.join('\n');
    expect(text.match(/Fork-local durable Plan Mode policy/g)?.length).toBe(1);
    expect(
      text.match(/except plan_save for durable markdown plans/g)?.length,
    ).toBe(1);
    expect(text).not.toContain('No tools that write files.');
    expect(text).toContain('except plan_save for durable markdown plans');
    expect(nonPlanMode).toEqual([
      'Normal system reminder. Do not write files.',
    ]);
  });

  test('explicit import creates native SDD job with metadata and pending gates', async () => {
    const root = makeTempProject();
    const { file, hash } = writePlan(root);

    const text = await runCommand(
      root,
      'sdd-from-plan',
      `${file} --slug imported-bridge --domain sdd-workflow`,
    );

    expect(text).toContain('imported into docs/spec/jobs/imported-bridge/');
    expect(text).toContain(hash);
    expect(text).toContain('Task Package Review.Status: pending');
    expect(text).toContain('Execution Readiness.Status: pending');
    expect(text).toContain('Next action: continue native SDD preparation');
    expect(text).toContain('Stop only for severe blockers');

    const jobDir = path.join(root, 'docs', 'spec', 'jobs', 'imported-bridge');
    expect(fs.existsSync(path.join(jobDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(jobDir, 'delta-requirements.md'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(jobDir, 'delta-design.md'))).toBe(true);
    expect(fs.existsSync(path.join(jobDir, 'tasks.md'))).toBe(true);
    expect(fs.existsSync(path.join(jobDir, 'trace.md'))).toBe(true);

    const proposal = fs.readFileSync(path.join(jobDir, 'proposal.md'), 'utf8');
    expect(proposal).toContain(`Source path: ${file}`);
    expect(proposal).toContain(`SHA-256: ${hash}`);
    expect(proposal).toContain(
      'Review status: approved (upstream metadata only)',
    );
    expect(proposal).toContain('Import timestamp: 2026-06-29T12:00:00.000Z');
    expect(proposal).toContain('Upstream heading: Build Planner Bridge');
    expect(proposal).toContain('does not authorize native execution');

    const tasks = fs.readFileSync(path.join(jobDir, 'tasks.md'), 'utf8');
    expect(tasks).toContain('Task Package Review.Status: pending');
    expect(tasks).toContain('Execution Readiness.Status: pending');
    expect(tasks).not.toContain('Execution Readiness.Status: authorized');
  });

  test('duplicate open job detection refuses a second import', async () => {
    const root = makeTempProject();
    const { file, hash } = writePlan(root);
    fs.mkdirSync(path.join(root, 'docs', 'spec', 'jobs', 'existing-open'));
    fs.writeFileSync(
      path.join(root, 'docs', 'spec', 'jobs', 'existing-open', 'proposal.md'),
      `# Proposal\n\nSHA-256: ${hash}\n`,
      'utf8',
    );

    const text = await runCommand(root, 'sdd-from-plan', file);

    expect(text).toContain('duplicate fingerprint already exists');
    expect(text).toContain('Matching open job: existing-open');
    expect(
      fs.existsSync(
        path.join(root, 'docs', 'spec', 'jobs', 'build-planner-bridge'),
      ),
    ).toBe(false);
  });

  test('duplicate archive detection refuses import', async () => {
    const root = makeTempProject();
    const { file, hash } = writePlan(root);
    fs.mkdirSync(
      path.join(root, 'docs', 'spec', 'archive', '2026-06-29-existing'),
    );
    fs.writeFileSync(
      path.join(
        root,
        'docs',
        'spec',
        'archive',
        '2026-06-29-existing',
        'proposal.md',
      ),
      `# Proposal\n\nSHA-256: ${hash}\n`,
      'utf8',
    );

    const text = await runCommand(root, 'sdd-from-plan', file);

    expect(text).toContain('duplicate fingerprint already exists');
    expect(text).toContain('Matching archived job: 2026-06-29-existing');
    expect(
      fs.existsSync(
        path.join(root, 'docs', 'spec', 'jobs', 'build-planner-bridge'),
      ),
    ).toBe(false);
  });

  test('missing path refusal is safe and writes no files', async () => {
    const root = makeTempProject();
    const missing = path.join(root, 'missing-plan.md');

    const text = await runCommand(root, 'sdd-from-plan', missing);

    expect(text).toContain('Refused: missing path');
    expect(text).toContain(missing);
    expect(fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'))).toEqual([]);
  });

  test('detect-only reports candidates and does not write files', async () => {
    const root = makeTempProject();
    const { file, hash } = writePlan(root, 'implementation-plan.md');

    const beforeJobs = fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'));
    const text = await runCommand(root, 'sdd-plan-detect', '');
    const afterJobs = fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'));

    expect(text).toContain('detected 1 candidate markdown plan');
    expect(text).toContain('No files were written.');
    expect(text).toContain(file);
    expect(text).toContain(hash.slice(0, 12));
    expect(text).toContain('Review status: approved (upstream metadata only)');
    expect(afterJobs).toEqual(beforeJobs);
  });

  test('detect-only includes opencode planner session files', async () => {
    const root = makeTempProject();
    fs.mkdirSync(path.join(root, '.opencode', 'plans'), { recursive: true });
    const { file, hash } = writePlan(
      path.join(root, '.opencode', 'plans'),
      'session-plan.md',
    );

    const text = await runCommand(root, 'sdd-plan-detect', '');

    expect(text).toContain(file);
    expect(text).toContain(hash.slice(0, 12));
    expect(fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'))).toEqual([]);
  });

  test('sdd_plan_detect tool reports candidates and does not write files', async () => {
    const root = makeTempProject();
    const { file, hash } = writePlan(root, 'execution-plan.md');
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });

    const beforeJobs = fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'));
    const text = await tools.sdd_plan_detect.execute({}, {} as any);
    const afterJobs = fs.readdirSync(path.join(root, 'docs', 'spec', 'jobs'));

    expect(text).toContain('detected 1 candidate markdown plan');
    expect(text).toContain('No files were written.');
    expect(text).toContain(file);
    expect(text).toContain(hash.slice(0, 12));
    expect(afterJobs).toEqual(beforeJobs);
  });

  test('sdd_from_plan tool imports explicit markdown into native SDD job', async () => {
    const root = makeTempProject();
    const { file, hash } = writePlan(root);
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });

    const text = await tools.sdd_from_plan.execute(
      {
        path: file,
        slug: 'tool-import',
        domain: 'sdd-workflow',
        confirm_import: true,
      },
      {} as any,
    );

    expect(text).toContain('imported into docs/spec/jobs/tool-import/');
    expect(text).toContain(hash);
    const jobDir = path.join(root, 'docs', 'spec', 'jobs', 'tool-import');
    expect(fs.existsSync(path.join(jobDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(jobDir, 'delta-requirements.md'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(jobDir, 'delta-design.md'))).toBe(true);
    expect(fs.existsSync(path.join(jobDir, 'tasks.md'))).toBe(true);
    expect(fs.existsSync(path.join(jobDir, 'trace.md'))).toBe(true);
    const tasks = fs.readFileSync(path.join(jobDir, 'tasks.md'), 'utf8');
    expect(tasks).toContain('Task Package Review.Status: pending');
    expect(tasks).toContain('Execution Readiness.Status: pending');
  });

  test('sdd_from_plan tool refuses import without explicit confirmation', async () => {
    const root = makeTempProject();
    const { file } = writePlan(root);
    const tools = createPlannerBridgeTools(createContext(root), {
      now: () => new Date('2026-06-29T12:00:00.000Z'),
      homeDir: path.join(root, 'home'),
    });

    const text = await tools.sdd_from_plan.execute(
      {
        path: file,
        slug: 'tool-import',
        domain: 'sdd-workflow',
        confirm_import: false,
      },
      {} as any,
    );

    expect(text).toContain('explicit import confirmation is required');
    expect(
      fs.existsSync(path.join(root, 'docs', 'spec', 'jobs', 'tool-import')),
    ).toBe(false);
  });
});
