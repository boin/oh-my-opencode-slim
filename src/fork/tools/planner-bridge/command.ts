import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  type PluginInput,
  type ToolDefinition,
  tool,
} from '@opencode-ai/plugin';
import { createInternalAgentTextPart } from '../../../utils';

const z = tool.schema;

const PLAN_SAVE_COMMAND = 'plan-save';
const PLAN_READ_COMMAND = 'plan-read';
const PLAN_LIST_COMMAND = 'plan-list';
const PLAN_READY_COMMAND = 'plan-ready';
const PLAN_FINISH_COMMAND = 'plan-finish';
const PLAN_TO_SDD_COMMAND = 'plan-to-sdd';
const DETECT_COMMAND = 'sdd-plan-detect';
const IMPORT_COMMAND = 'sdd-from-plan';

const PLAN_AUTOMATION_MARKER = '<internal_reminder>plan-automation:';

const PLAN_SAVE_TEMPLATE = `Save or update a durable markdown plan.

Usage:
  /plan-save [--path <path>] [--title <title>]

Instruction: write the current plan as markdown by calling the plan_save tool.
Use the active conversation context as the source of truth for the plan content.
Plan Mode exception: plan_save is the only durable-plan write allowed in Plan Mode.
If --path is provided, it must be a durable plan-looking path: .opencode/plans/*.md
(not archive) or a root-level plan filename such as plan.md, planning.md,
implementation-plan.md, execution-plan.md, plan-*.md, or *-plan.md.
Do NOT call any external planner plugin, browser UI, or external editor.
Do NOT call edit, write, apply_patch, mutating bash, plan_to_sdd,
sdd_from_plan, spec_* tools, commit, deploy, or implement code from this command.

USER REQUEST:
$ARGUMENTS`;

const PLAN_MODE_POLICY_TEXT = [
  'Fork-local durable Plan Mode policy:',
  '- Plan Mode remains read-only; the plan_save tool is the only durable-plan write allowed.',
  '- plan_save may only save markdown durable plans to its default session path, .opencode/plans/*.md (not archive), or root-level plan-looking filenames such as plan.md, planning.md, implementation-plan.md, execution-plan.md, plan-*.md, or *-plan.md.',
  '- Do not use edit, write, apply_patch, mutating bash, plan_to_sdd, sdd_from_plan, spec_* tools, commits, deployments, or implementation while in Plan Mode.',
  '- If the user asks to implement, import, commit, deploy, or mutate non-plan files, stay in planning/readiness only and ask for handoff outside Plan Mode.',
].join('\n');

const PLAN_READ_TEMPLATE = `Read the current durable markdown plan.

Usage:
  /plan-read [path]

Instruction: call ONLY the plan_read tool with the optional path argument and return its output verbatim.
Do NOT modify files.

USER REQUEST:
$ARGUMENTS`;

const PLAN_LIST_TEMPLATE = `List durable markdown plans.

Usage:
  /plan-list

Instruction: call ONLY the plan_list tool and return its output verbatim.
Do NOT modify files.

USER REQUEST:
$ARGUMENTS`;

const PLAN_READY_TEMPLATE = `Check whether the current durable markdown plan is ready for implementation handoff.

Usage:
  /plan-ready [--auto] [--slug <slug>] [--domain <domain>]

Mandatory instruction: call plan_ready with the parsed optional auto, slug, and domain fields. Return the tool output verbatim. Do not call plan_to_sdd or plan_finish from the current Plan Mode turn; the tool output describes the next action after leaving Plan Mode.

USER REQUEST:
$ARGUMENTS`;

const PLAN_FINISH_TEMPLATE = `Close or archive a durable markdown plan lifecycle state.

Usage:
  /plan-finish --status <executing|done|abandoned|superseded|imported> [path] [--reason <reason>] [--job <job>]

Mandatory instruction: parse $ARGUMENTS and call plan_finish. Return the tool output verbatim. Do NOT mark status=done unless validation evidence exists in the conversation.

USER REQUEST:
$ARGUMENTS`;

const PLAN_TO_SDD_TEMPLATE = `Import a durable markdown plan into native SDD jobs.

Usage:
  /plan-to-sdd [path] [--slug <slug>] [--domain <domain>]

Mandatory instruction: parse $ARGUMENTS into optional path, optional slug, and optional domain. The next tool call MUST be plan_to_sdd with confirm_import=true and those parsed fields. If the tool refuses, return that refusal verbatim. If the import succeeds, continue by inspecting the generated docs/spec/jobs/<slug>/ job, replacing imported placeholders with native SDD delta requirements/design/tasks, and running entry review. Do not start implementation, commit, deploy, merge, or archive from the import command alone.

Do NOT call plan_list, sdd_plan_detect, read, grep, or any other tool before plan_to_sdd. Do NOT inspect candidates first. If the tool refuses, return that refusal verbatim.

USER REQUEST:
$ARGUMENTS`;

const DETECT_TEMPLATE = `Detect local durable markdown plan candidates without importing.

Usage:
  /sdd-plan-detect

Instruction: call ONLY the sdd_plan_detect tool with no arguments and return its output verbatim.
Do NOT call sdd_from_plan. Do NOT import, create, edit, or execute anything.

USER REQUEST:
$ARGUMENTS`;

const IMPORT_TEMPLATE = `Import an explicit markdown plan into native SDD jobs.

Usage:
  /sdd-from-plan <path> [--slug <slug>] [--domain <domain>]

Mandatory instruction: parse $ARGUMENTS into path, optional slug, and optional domain. The next tool call MUST be sdd_from_plan with confirm_import=true and those parsed fields. If the tool refuses, return that refusal verbatim. If the import succeeds, continue by inspecting the generated docs/spec/jobs/<slug>/ job, replacing imported placeholders with native SDD delta requirements/design/tasks, and running entry review. Do not start implementation, commit, deploy, merge, or archive from the import command alone.

Do NOT call sdd_plan_detect, plan_list, read, grep, or any other tool before sdd_from_plan. Do NOT inspect candidates first. If the tool refuses, return that refusal verbatim.

USER REQUEST:
$ARGUMENTS`;

type DuplicateMatch = {
  type: 'open' | 'archive';
  name: string;
  proposalPath: string;
};

type PlanCandidate = {
  path: string;
  heading: string;
  sha256: string;
  modifiedTime: string;
  likelySource: string;
  reviewStatus: string;
  confidence: 'high' | 'medium' | 'low';
  duplicate?: DuplicateMatch;
};

type PlanStatus =
  | 'draft'
  | 'ready'
  | 'imported'
  | 'executing'
  | 'done'
  | 'abandoned'
  | 'superseded';

type PlanReadyDecision = 'needs-sdd' | 'direct-execution' | 'blocked';

type ToolContext = {
  sessionID?: string;
};

type PlannerBridgeRuntime = {
  root: string;
  specDir: string;
  homeDir: string;
  now: () => Date;
};

type MessagePart = {
  type?: string;
  text?: string;
  [key: string]: unknown;
};

type ChatTransformMessage = {
  info: {
    role?: string;
    agent?: string;
    sessionID?: string;
  };
  parts: MessagePart[];
};

export type PlannerBridgeCommandManagerOptions = {
  now?: () => Date;
  homeDir?: string;
};

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function firstHeading(content: string): string {
  const heading = content
    .split(/\r?\n/)
    .find((line) => /^#{1,6}\s+\S/.test(line));
  return heading?.replace(/^#{1,6}\s+/, '').trim() || 'Untitled plan';
}

function reviewStatus(content: string): string {
  const explicit = content.match(
    /(?:review status|review_status|status)\s*[:=]\s*([^\n]+)/i,
  );
  if (explicit?.[1]) {
    const status = explicit[1].trim();
    return /\bapproved\b/i.test(status)
      ? `${status} (upstream metadata only)`
      : status;
  }
  if (/\bapproved\b/i.test(content)) {
    return 'approved (upstream metadata only)';
  }
  return 'unknown';
}

function safeSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'imported-plan';
}

function uniqueSlug(specDir: string, base: string): string {
  let candidate = safeSlug(base);
  let index = 2;
  while (fs.existsSync(path.join(specDir, 'jobs', candidate))) {
    candidate = `${safeSlug(base)}-${index}`;
    index += 1;
  }
  return candidate;
}

function defaultPlanPath(root: string, sessionID?: string): string {
  const safeSession = safeSlug(sessionID ?? 'current-session');
  return path.join(root, '.opencode', 'plans', `${safeSession}.md`);
}

function ensurePlanMarkdown(input: {
  content: string;
  title?: string;
}): string {
  const content = input.content.trimEnd();
  if (/^#{1,6}\s+\S/m.test(content)) {
    return `${content}\n`;
  }
  const title = input.title?.trim() || 'Plan';
  return [`# ${title}`, '', content, ''].join('\n');
}

function frontmatterBlock(metadata: Record<string, string | null>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(metadata)) {
    lines.push(`${key}: ${value === null ? 'null' : JSON.stringify(value)}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function readFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {};
  }
  const metadata: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (!key || value === 'null') continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    metadata[key] = value;
  }
  return metadata;
}

function withPlanMetadata(
  content: string,
  metadata: Record<string, string | null>,
): string {
  const existing = readFrontmatter(content);
  const body = stripFrontmatter(content).trimStart();
  return `${frontmatterBlock({ ...existing, ...metadata })}${body.trimEnd()}\n`;
}

function tokenizeArguments(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (current) {
    tokens.push(current);
  }
  return tokens;
}

function parseImportArgs(argumentsText: string): {
  planPath?: string;
  slug?: string;
  domain?: string;
  error?: string;
} {
  const tokens = tokenizeArguments(argumentsText.trim());
  let planPath: string | undefined;
  let slug: string | undefined;
  let domain: string | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--slug') {
      slug = tokens[index + 1];
      index += 1;
      if (!slug) {
        return { error: 'Missing value for --slug.' };
      }
      continue;
    }
    if (token === '--domain') {
      domain = tokens[index + 1];
      index += 1;
      if (!domain) {
        return { error: 'Missing value for --domain.' };
      }
      continue;
    }
    if (token.startsWith('--')) {
      return { error: `Unknown option: ${token}` };
    }
    if (planPath) {
      return { error: 'Only one markdown plan path may be imported.' };
    }
    planPath = token;
  }

  return { planPath, slug, domain };
}

function parseReadyArgs(argumentsText: string): {
  auto?: boolean;
  slug?: string;
  domain?: string;
  error?: string;
} {
  const tokens = tokenizeArguments(argumentsText.trim());
  let auto = false;
  let slug: string | undefined;
  let domain: string | undefined;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--auto') {
      auto = true;
      continue;
    }
    if (token === '--slug') {
      slug = tokens[index + 1];
      index += 1;
      if (!slug) return { error: 'Missing value for --slug.' };
      continue;
    }
    if (token === '--domain') {
      domain = tokens[index + 1];
      index += 1;
      if (!domain) return { error: 'Missing value for --domain.' };
      continue;
    }
    if (token.startsWith('--')) {
      return { error: `Unknown option: ${token}` };
    }
  }
  return { auto, slug, domain };
}

function parseFinishArgs(argumentsText: string): {
  planPath?: string;
  status?: PlanStatus;
  reason?: string;
  job?: string;
  error?: string;
} {
  const tokens = tokenizeArguments(argumentsText.trim());
  let planPath: string | undefined;
  let status: PlanStatus | undefined;
  let reason: string | undefined;
  let job: string | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--status') {
      status = tokens[index + 1] as PlanStatus | undefined;
      index += 1;
      continue;
    }
    if (token === '--reason') {
      reason = tokens[index + 1];
      index += 1;
      continue;
    }
    if (token === '--job') {
      job = tokens[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith('--')) {
      return { error: `Unknown option: ${token}` };
    }
    if (planPath) {
      return { error: 'Only one markdown plan path may be finished.' };
    }
    planPath = token;
  }

  if (!status) {
    return { error: 'Missing --status.' };
  }
  if (!isPlanStatus(status)) {
    return { error: `Unsupported plan status: ${status}` };
  }
  return { planPath, status, reason, job };
}

function isPlanStatus(value: string): value is PlanStatus {
  return [
    'draft',
    'ready',
    'imported',
    'executing',
    'done',
    'abandoned',
    'superseded',
  ].includes(value);
}

function parsePlanReadArgs(argumentsText: string): { planPath?: string } {
  const tokens = tokenizeArguments(argumentsText.trim());
  return { planPath: tokens.find((token) => !token.startsWith('--')) };
}

function resolvePlanPath(
  root: string,
  homeDir: string,
  planPath: string,
): string {
  if (planPath === '~') {
    return homeDir;
  }
  if (planPath.startsWith('~/')) {
    return path.join(homeDir, planPath.slice(2));
  }
  return path.resolve(root, planPath);
}

function isMarkdownFile(filePath: string): boolean {
  return /\.md(?:own)?$/i.test(filePath);
}

function readMarkdownPlan(
  filePath: string,
): { ok: true; content: string } | { ok: false; error: string } {
  if (!filePath) {
    return {
      ok: false,
      error:
        'Missing path. Usage: /sdd-from-plan <path> [--slug <slug>] [--domain <domain>]',
    };
  }
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `Refused: missing path ${filePath}` };
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return {
      ok: false,
      error: `Refused: path is not a markdown file ${filePath}`,
    };
  }
  if (!isMarkdownFile(filePath)) {
    return {
      ok: false,
      error: `Refused: expected a markdown file path ${filePath}`,
    };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.trim()) {
    return { ok: false, error: `Refused: markdown plan is empty ${filePath}` };
  }
  return { ok: true, content };
}

function findDuplicates(
  specDir: string,
  fingerprint: string,
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const roots = [
    { type: 'open' as const, dir: path.join(specDir, 'jobs') },
    { type: 'archive' as const, dir: path.join(specDir, 'archive') },
  ];

  for (const root of roots) {
    if (!fs.existsSync(root.dir)) {
      continue;
    }
    for (const entry of fs.readdirSync(root.dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const proposalPath = path.join(root.dir, entry.name, 'proposal.md');
      if (!fs.existsSync(proposalPath)) {
        continue;
      }
      const proposal = fs.readFileSync(proposalPath, 'utf8');
      if (proposal.includes(fingerprint)) {
        matches.push({ type: root.type, name: entry.name, proposalPath });
      }
    }
  }

  return matches;
}

function collectMarkdownFiles(dir: string, depth = 1): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    return isMarkdownFile(dir) ? [dir] : [];
  }
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(entryPath);
      continue;
    }
    if (entry.isDirectory() && depth > 0) {
      files.push(...collectMarkdownFiles(entryPath, depth - 1));
    }
  }
  return files;
}

function candidatePaths(root: string): string[] {
  const names = new Set<string>();
  for (const file of collectMarkdownFiles(root, 0)) {
    const base = path.basename(file).toLowerCase();
    if (
      base === 'plan.md' ||
      base === 'planning.md' ||
      base === 'implementation-plan.md' ||
      base === 'execution-plan.md' ||
      /^plan[-_.].*\.md$/.test(base) ||
      /[-_.]plan\.md$/.test(base)
    ) {
      names.add(file);
    }
  }

  for (const file of collectMarkdownFiles(
    path.join(root, '.opencode', 'plans'),
    0,
  )) {
    names.add(file);
  }

  return [...names].sort();
}

function isRootPlanFilename(name: string): boolean {
  const base = name.toLowerCase();
  return (
    base === 'plan.md' ||
    base === 'planning.md' ||
    base === 'implementation-plan.md' ||
    base === 'execution-plan.md' ||
    /^plan[-_.].*\.md$/.test(base) ||
    /[-_.]plan\.md$/.test(base)
  );
}

function isSafeExplicitPlanPath(root: string, filePath: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(filePath);
  const activeDir = path.resolve(activePlansDir(root));
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    return false;
  }
  if (path.dirname(resolvedPath) === activeDir) {
    return true;
  }
  return (
    path.dirname(resolvedPath) === resolvedRoot &&
    isRootPlanFilename(path.basename(resolvedPath))
  );
}

function unsafePlanPathMessage(filePath: string): string {
  return [
    `Refused: explicit plan_save path is not a durable plan path ${filePath}`,
    'Allowed paths: default session path, .opencode/plans/*.md (not archive), or root-level plan filenames such as plan.md, planning.md, implementation-plan.md, execution-plan.md, plan-*.md, or *-plan.md.',
  ].join('\n');
}

function candidateSource(root: string, filePath: string): string {
  const normalized = path.resolve(filePath);
  if (normalized.startsWith(path.resolve(root))) {
    return 'project-local';
  }
  return 'local';
}

function buildCandidate(
  root: string,
  specDir: string,
  filePath: string,
): PlanCandidate | undefined {
  const plan = readMarkdownPlan(filePath);
  if (!plan.ok) {
    return undefined;
  }
  const content = plan.content;
  const stat = fs.statSync(filePath);
  const fingerprint = sha256(content);
  return {
    path: filePath,
    heading: firstHeading(content),
    sha256: fingerprint,
    modifiedTime: stat.mtime.toISOString(),
    likelySource: candidateSource(root, filePath),
    reviewStatus: reviewStatus(content),
    confidence:
      candidateSource(root, filePath) === 'project-local' ? 'high' : 'medium',
    duplicate: findDuplicates(specDir, fingerprint)[0],
  };
}

function formatDetect(candidates: PlanCandidate[]): string {
  if (candidates.length === 0) {
    return [
      'SDD plan detect: detected 0 candidate markdown plans.',
      'No files were written.',
      'Next action: run /sdd-from-plan <path> with an explicit markdown plan.',
    ].join('\n');
  }

  const lines = [
    `SDD plan detect: detected ${candidates.length} candidate markdown plan${candidates.length === 1 ? '' : 's'}.`,
    'No files were written.',
  ];
  candidates.forEach((candidate, index) => {
    lines.push(
      '',
      `${index + 1}. ${candidate.heading}`,
      `   Path: ${candidate.path}`,
      `   SHA-256: ${candidate.sha256.slice(0, 12)}…`,
      `   Modified: ${candidate.modifiedTime}`,
      `   Likely source: ${candidate.likelySource}`,
      `   Review status: ${candidate.reviewStatus}`,
      `   Confidence: ${candidate.confidence}`,
      `   Native match: ${candidate.duplicate ? `${candidate.duplicate.type} ${candidate.duplicate.name}` : 'none'}`,
    );
  });
  lines.push(
    '',
    'Next action: run /sdd-from-plan <path> with one explicit path.',
  );
  return lines.join('\n');
}

function detectPlans(runtime: PlannerBridgeRuntime): string {
  const candidates = candidatePaths(runtime.root)
    .map((filePath) => buildCandidate(runtime.root, runtime.specDir, filePath))
    .filter((candidate): candidate is PlanCandidate => Boolean(candidate));
  return formatDetect(candidates);
}

function savePlan(
  runtime: PlannerBridgeRuntime,
  input: { path?: string; title?: string; content: string; sessionID?: string },
): string {
  const targetPath = input.path
    ? resolvePlanPath(runtime.root, runtime.homeDir, input.path)
    : defaultPlanPath(runtime.root, input.sessionID);
  if (!isMarkdownFile(targetPath)) {
    return `Refused: expected a markdown plan path ${targetPath}`;
  }
  if (input.path && !isSafeExplicitPlanPath(runtime.root, targetPath)) {
    return unsafePlanPathMessage(targetPath);
  }
  const markdown = ensurePlanMarkdown({
    content: input.content,
    title: input.title,
  });
  if (!markdown.trim()) {
    return 'Refused: plan content is empty.';
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const markdownWithMetadata = withPlanMetadata(markdown, {
    status: 'draft',
    updated_at: runtime.now().toISOString(),
  });
  fs.writeFileSync(targetPath, markdownWithMetadata, 'utf8');
  const fingerprint = sha256(markdownWithMetadata);
  return [
    `Plan saved: ${targetPath}`,
    `SHA-256: ${fingerprint}`,
    'Next action: continue updating this markdown plan, or run /plan-to-sdd to import it into native SDD.',
  ].join('\n');
}

function readPlan(
  runtime: PlannerBridgeRuntime,
  input: { path?: string; sessionID?: string },
): string {
  const targetPath = input.path
    ? resolvePlanPath(runtime.root, runtime.homeDir, input.path)
    : defaultPlanPath(runtime.root, input.sessionID);
  const plan = readMarkdownPlan(targetPath);
  if (!plan.ok) {
    return plan.error;
  }
  return [`Plan path: ${targetPath}`, '', plan.content.trimEnd()].join('\n');
}

function listPlans(runtime: PlannerBridgeRuntime): string {
  return detectPlans(runtime);
}

function activePlansDir(root: string): string {
  return path.join(root, '.opencode', 'plans');
}

function archivePlansDir(root: string): string {
  return path.join(activePlansDir(root), 'archive');
}

function isActivePlanPath(root: string, filePath: string): boolean {
  return (
    path.dirname(path.resolve(filePath)) === path.resolve(activePlansDir(root))
  );
}

function archiveNameFor(
  runtime: PlannerBridgeRuntime,
  status: PlanStatus,
  filePath: string,
): string {
  const timestamp = runtime
    .now()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .replace('Z', '');
  return `${timestamp}-${status}-${path.basename(filePath)}`;
}

function archivePlan(
  runtime: PlannerBridgeRuntime,
  input: {
    filePath: string;
    status: PlanStatus;
    reason?: string;
    job?: string;
  },
): string {
  const content = fs.readFileSync(input.filePath, 'utf8');
  const updated = withPlanMetadata(content, {
    status: input.status,
    updated_at: runtime.now().toISOString(),
    consumed_at: ['imported', 'executing', 'done'].includes(input.status)
      ? runtime.now().toISOString()
      : null,
    reason: input.reason ?? null,
    sdd_job: input.job ?? null,
  });
  fs.mkdirSync(archivePlansDir(runtime.root), { recursive: true });
  let target = path.join(
    archivePlansDir(runtime.root),
    archiveNameFor(runtime, input.status, input.filePath),
  );
  let suffix = 2;
  while (fs.existsSync(target)) {
    target = target.replace(/\.md$/i, `-${suffix}.md`);
    suffix += 1;
  }
  fs.writeFileSync(input.filePath, updated, 'utf8');
  fs.renameSync(input.filePath, target);
  return target;
}

function finishPlan(
  runtime: PlannerBridgeRuntime,
  input: {
    path?: string;
    status: PlanStatus;
    reason?: string;
    job?: string;
    sessionID?: string;
  },
): string {
  const targetPath = input.path
    ? resolvePlanPath(runtime.root, runtime.homeDir, input.path)
    : defaultPlanPath(runtime.root, input.sessionID);
  const plan = readMarkdownPlan(targetPath);
  if (!plan.ok) {
    return plan.error;
  }
  const updated = withPlanMetadata(plan.content, {
    status: input.status,
    updated_at: runtime.now().toISOString(),
    reason: input.reason ?? null,
    sdd_job: input.job ?? null,
  });
  if (isActivePlanPath(runtime.root, targetPath) && input.status !== 'draft') {
    fs.writeFileSync(targetPath, updated, 'utf8');
    const archived = archivePlan(runtime, {
      filePath: targetPath,
      status: input.status,
      reason: input.reason,
      job: input.job,
    });
    return [
      'Plan automation:',
      `- Action: plan_finish`,
      `- State: ${readFrontmatter(plan.content).status ?? 'draft'} → ${input.status}`,
      `- Archived: ${archived}`,
      input.reason ? `- Reason: ${input.reason}` : undefined,
      input.job ? `- SDD job: ${input.job}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  }
  fs.writeFileSync(targetPath, updated, 'utf8');
  return [
    'Plan automation:',
    `- Action: plan_finish`,
    `- State: ${readFrontmatter(plan.content).status ?? 'draft'} → ${input.status}`,
    `- Plan: ${targetPath}`,
    input.reason ? `- Reason: ${input.reason}` : undefined,
    input.job ? `- SDD job: ${input.job}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function hasBlockedReadiness(content: string): string | undefined {
  const body = stripFrontmatter(content);
  if (!/^#{1,6}\s+\S/m.test(body)) {
    return 'plan has no markdown heading';
  }
  if (body.trim().length < 40) {
    return 'plan is too short to execute safely';
  }
  if (/\b(TODO|TBD|unknown|unresolved|待定|不确定|缺少|待确认)\b/i.test(body)) {
    return 'plan contains unresolved markers';
  }
  return undefined;
}

function planNeedsSdd(content: string): boolean {
  return /\b(api|data|database|db|schema|migration|security|auth|persistence|workflow|service|integration|deploy|release|storage)\b|接口|数据|数据库|迁移|安全|鉴权|持久化|工作流|服务|集成|部署|上线|存储/i.test(
    content,
  );
}

function readyPlan(
  runtime: PlannerBridgeRuntime,
  input: { sessionID?: string; auto?: boolean; slug?: string; domain?: string },
): string {
  const planPath = defaultPlanPath(runtime.root, input.sessionID);
  const plan = readMarkdownPlan(planPath);
  if (!plan.ok) {
    return [
      'Plan automation:',
      '- Intent: start-implementation',
      '- Action: plan_ready',
      '- Decision: blocked',
      `- Reason: ${plan.error}`,
      '- Next: continue normally or run /plan-save first.',
    ].join('\n');
  }
  const blocked = hasBlockedReadiness(plan.content);
  if (blocked) {
    return [
      'Plan automation:',
      '- Intent: start-implementation',
      `- Plan: ${planPath}`,
      '- Action: plan_ready',
      '- Decision: blocked',
      `- Reason: ${blocked}`,
      '- Next: ask one clarification question before implementation.',
    ].join('\n');
  }
  const decision: PlanReadyDecision = planNeedsSdd(plan.content)
    ? 'needs-sdd'
    : 'direct-execution';
  const lines = [
    'Plan automation:',
    '- Intent: start-implementation',
    `- Plan: ${planPath}`,
    '- Action: plan_ready',
    `- Decision: ${decision}`,
  ];
  if (decision === 'needs-sdd') {
    lines.push(
      `- Next after leaving Plan Mode: run /plan-to-sdd --slug ${input.slug ?? safeSlug(firstHeading(plan.content))}${input.domain ? ` --domain ${input.domain}` : ''}`,
      '- Do not run this from the current Plan Mode turn.',
    );
  } else {
    lines.push(
      "- Next after leaving Plan Mode: call plan_finish(status='executing') before direct implementation.",
      '- Do not run this from the current Plan Mode turn.',
    );
  }
  if (input.auto) {
    lines.push('- Auto: requested');
  }
  return lines.join('\n');
}

function proposalContent(input: {
  sourcePath: string;
  fingerprint: string;
  status: string;
  importedAt: string;
  heading: string;
  content: string;
}): string {
  return [
    `# Proposal: ${input.heading}`,
    '',
    'Imported from a durable markdown plan into native SDD job format.',
    '',
    '## Durable Plan Metadata',
    '',
    `Source path: ${input.sourcePath}`,
    `SHA-256: ${input.fingerprint}`,
    `Review status: ${input.status}`,
    `Import timestamp: ${input.importedAt}`,
    `Upstream heading: ${input.heading}`,
    '',
    'Upstream approval metadata is recorded for review only and does not authorize native execution.',
    '',
    '## Imported Plan',
    '',
    input.content.trimEnd(),
    '',
  ].join('\n');
}

function tasksContent(input: { heading: string; importedAt: string }): string {
  return [
    `# Tasks: ${input.heading}`,
    '',
    'This job was imported from a durable markdown plan. Native SDD review gates remain pending.',
    '',
    '## Task Package Review',
    '',
    'Status: pending',
    'Task Package Review.Status: pending',
    '',
    '## Execution Readiness',
    '',
    'Status: pending',
    'Execution Readiness.Status: pending',
    '',
    '## Imported Task Package',
    '',
    `Imported at: ${input.importedAt}`,
    'Human-facing: partial',
    '',
    '### Completion Evidence',
    '',
    '- Files changed:',
    '- Acceptance checks satisfied:',
    '- Validation run:',
    '- Result:',
    '- Reviewer notes:',
    '',
  ].join('\n');
}

function writeImportedJob(input: {
  specDir: string;
  slug: string;
  domain?: string;
  heading: string;
  sourcePath: string;
  fingerprint: string;
  status: string;
  importedAt: string;
  content: string;
}): string {
  const jobDir = path.join(input.specDir, 'jobs', input.slug);
  if (fs.existsSync(jobDir)) {
    throw new Error(
      `Refused: target job already exists docs/spec/jobs/${input.slug}`,
    );
  }
  fs.mkdirSync(path.dirname(jobDir), { recursive: true });
  fs.mkdirSync(jobDir, { recursive: false });
  fs.writeFileSync(
    path.join(jobDir, 'proposal.md'),
    proposalContent(input),
    'utf8',
  );
  fs.writeFileSync(
    path.join(jobDir, 'delta-requirements.md'),
    [
      `# Delta Requirements: ${input.slug}`,
      '',
      `Imported plan placeholder. Add native ${input.domain ? `${input.domain}/REQ-N` : '<domain>/REQ-N'} sections after review.`,
      '',
    ].join('\n'),
    'utf8',
  );
  fs.writeFileSync(
    path.join(jobDir, 'delta-design.md'),
    [
      `# Delta Design: ${input.slug}`,
      '',
      `Imported plan placeholder. Add native ${input.domain ? `${input.domain}/DES-N` : '<domain>/DES-N'} sections after review.`,
      '',
    ].join('\n'),
    'utf8',
  );
  fs.writeFileSync(
    path.join(jobDir, 'tasks.md'),
    tasksContent({ heading: input.heading, importedAt: input.importedAt }),
    'utf8',
  );
  fs.writeFileSync(
    path.join(jobDir, 'trace.md'),
    [
      `# Trace: ${input.slug}`,
      '',
      'Imported durable plan; native anchors are pending review.',
      '',
    ].join('\n'),
    'utf8',
  );
  return jobDir;
}

function duplicateMessage(match: DuplicateMatch, fingerprint: string): string {
  const location = match.type === 'open' ? 'open job' : 'archived job';
  return [
    'SDD plan import refused: duplicate fingerprint already exists.',
    `SHA-256: ${fingerprint}`,
    `Matching ${location}: ${match.name}`,
    `Proposal: ${match.proposalPath}`,
    'Next action: review the matching native job/archive instead of importing again.',
  ].join('\n');
}

function usage(): string {
  return 'Usage: /sdd-from-plan <path> [--slug <slug>] [--domain <domain>]';
}

function importPlan(
  runtime: PlannerBridgeRuntime,
  input: {
    path?: string;
    slug?: string;
    domain?: string;
    confirmImport?: boolean;
  },
): string {
  if (input.confirmImport !== true) {
    return [
      'SDD plan import refused: explicit import confirmation is required.',
      'Use /sdd-from-plan <path> for imports. /sdd-plan-detect must remain read-only.',
    ].join('\n');
  }
  if (!input.path) {
    return `Missing path.\n${usage()}`;
  }

  const sourcePath = resolvePlanPath(runtime.root, runtime.homeDir, input.path);
  const plan = readMarkdownPlan(sourcePath);
  if (!plan.ok) {
    return plan.error;
  }
  const content = plan.content;

  const fingerprint = sha256(content);
  const duplicate = findDuplicates(runtime.specDir, fingerprint)[0];
  if (duplicate) {
    return duplicateMessage(duplicate, fingerprint);
  }

  const heading = firstHeading(content);
  const slug = uniqueSlug(runtime.specDir, input.slug ?? heading);
  const importedAt = runtime.now().toISOString();
  try {
    writeImportedJob({
      specDir: runtime.specDir,
      slug,
      domain: input.domain,
      heading,
      sourcePath,
      fingerprint,
      status: reviewStatus(content),
      importedAt,
      content,
    });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  const archiveNotice = isActivePlanPath(runtime.root, sourcePath)
    ? archivePlan(runtime, {
        filePath: sourcePath,
        status: 'imported',
        job: `docs/spec/jobs/${slug}/`,
      })
    : undefined;

  return [
    `SDD plan imported into docs/spec/jobs/${slug}/`,
    `Source path: ${sourcePath}`,
    `SHA-256: ${fingerprint}`,
    `Upstream heading: ${heading}`,
    archiveNotice ? `Plan archived: ${archiveNotice}` : undefined,
    'Native gates remain pending: Task Package Review.Status: pending; Execution Readiness.Status: pending.',
    'Upstream approval metadata is not native execution authorization.',
    'Next action: continue native SDD preparation for this job by replacing imported placeholders with native delta requirements/design/tasks and running entry review. Stop only for severe blockers such as duplicate import refusal, missing job files, invalid spec layout, unsafe worktree conflicts, or failed entry review. Do not start implementation, commit, deploy, merge, or archive from this import alone.',
  ]
    .filter(Boolean)
    .join('\n');
}

function createRuntime(
  ctx: PluginInput,
  options: PlannerBridgeCommandManagerOptions,
): PlannerBridgeRuntime {
  const root = ctx.directory;
  return {
    root,
    specDir: path.join(root, 'docs', 'spec'),
    homeDir: options.homeDir ?? os.homedir(),
    now: options.now ?? (() => new Date()),
  };
}

export function createPlannerBridgeTools(
  ctx: PluginInput,
  options: PlannerBridgeCommandManagerOptions = {},
): Record<string, ToolDefinition> {
  const runtime = createRuntime(ctx, options);

  const plan_save = tool({
    description:
      'Save or replace a durable local markdown plan without opening an editor or browser. Default path is .opencode/plans/<session-id>.md.',
    args: {
      content: z.string().describe('Complete markdown plan content to save.'),
      path: z
        .string()
        .optional()
        .describe(
          'Optional markdown path. Defaults to the current session plan.',
        ),
      title: z
        .string()
        .optional()
        .describe('Optional title used when content has no markdown heading.'),
    },
    async execute(args, toolContext) {
      return savePlan(runtime, {
        content: args.content,
        path: args.path,
        title: args.title,
        sessionID: (toolContext as ToolContext | undefined)?.sessionID,
      });
    },
  });

  const plan_read = tool({
    description:
      'Read a durable local markdown plan. Defaults to .opencode/plans/<session-id>.md.',
    args: {
      path: z
        .string()
        .optional()
        .describe(
          'Optional markdown path. Defaults to the current session plan.',
        ),
    },
    async execute(args, toolContext) {
      return readPlan(runtime, {
        path: args.path,
        sessionID: (toolContext as ToolContext | undefined)?.sessionID,
      });
    },
  });

  const plan_list = tool({
    description:
      'List durable local markdown plans without importing or writing files.',
    args: {},
    async execute() {
      return listPlans(runtime);
    },
  });

  const plan_ready = tool({
    description:
      'Check whether the current durable markdown plan is ready for implementation handoff. Does not write files.',
    args: {
      auto: z
        .boolean()
        .optional()
        .describe('Whether the user requested automatic handoff.'),
      slug: z.string().optional().describe('Optional target SDD job slug.'),
      domain: z.string().optional().describe('Optional SDD domain hint.'),
    },
    async execute(args, toolContext) {
      return readyPlan(runtime, {
        auto: args.auto,
        slug: args.slug,
        domain: args.domain,
        sessionID: (toolContext as ToolContext | undefined)?.sessionID,
      });
    },
  });

  const plan_finish = tool({
    description:
      'Close a durable markdown plan lifecycle state and archive active plans when consumed.',
    args: {
      path: z
        .string()
        .optional()
        .describe(
          'Optional markdown path. Defaults to the current session plan.',
        ),
      status: z
        .enum(['imported', 'executing', 'done', 'abandoned', 'superseded'])
        .describe('Lifecycle status to apply.'),
      reason: z.string().optional().describe('Optional reason for the state.'),
      job: z.string().optional().describe('Optional native SDD job path.'),
    },
    async execute(args, toolContext) {
      return finishPlan(runtime, {
        path: args.path,
        status: args.status,
        reason: args.reason,
        job: args.job,
        sessionID: (toolContext as ToolContext | undefined)?.sessionID,
      });
    },
  });

  const sdd_plan_detect = tool({
    description:
      'Detect local durable markdown plan candidates without importing or writing files. Returns candidate metadata only.',
    args: {},
    async execute() {
      return detectPlans(runtime);
    },
  });

  const sdd_from_plan = tool({
    description:
      'Import one explicit markdown plan path into native docs/spec/jobs/<slug>/ without executing it. Use only for explicit /sdd-from-plan requests, never for detect-only requests.',
    args: {
      path: z.string().describe('Explicit markdown plan path to import.'),
      slug: z
        .string()
        .optional()
        .describe('Optional target native SDD job slug.'),
      domain: z
        .string()
        .optional()
        .describe('Optional domain hint for placeholder delta files.'),
      confirm_import: z
        .boolean()
        .describe(
          'Must be true to confirm the user requested an import, not detect-only.',
        ),
    },
    async execute(args) {
      return importPlan(runtime, {
        path: args.path,
        slug: args.slug,
        domain: args.domain,
        confirmImport: args.confirm_import,
      });
    },
  });

  const plan_to_sdd = tool({
    description:
      'Import a durable markdown plan into native docs/spec/jobs/<slug>/ without executing it. Defaults to the current session plan.',
    args: {
      path: z
        .string()
        .optional()
        .describe(
          'Optional markdown path. Defaults to the current session plan.',
        ),
      slug: z
        .string()
        .optional()
        .describe('Optional target native SDD job slug.'),
      domain: z
        .string()
        .optional()
        .describe('Optional domain hint for placeholder delta files.'),
      confirm_import: z
        .boolean()
        .describe('Must be true to confirm the user requested an import.'),
    },
    async execute(args, toolContext) {
      const sessionID = (toolContext as ToolContext | undefined)?.sessionID;
      return importPlan(runtime, {
        path: args.path ?? defaultPlanPath(runtime.root, sessionID),
        slug: args.slug,
        domain: args.domain,
        confirmImport: args.confirm_import,
      });
    },
  });

  return {
    plan_save,
    plan_read,
    plan_list,
    plan_ready,
    plan_finish,
    plan_to_sdd,
    sdd_plan_detect,
    sdd_from_plan,
  };
}

export function createPlannerBridgeCommandManager(
  ctx: PluginInput,
  options: PlannerBridgeCommandManagerOptions = {},
) {
  const runtime = createRuntime(ctx, options);

  function registerCommand(opencodeConfig: Record<string, unknown>): void {
    const configCommand = opencodeConfig.command as
      | Record<string, unknown>
      | undefined;
    if (!opencodeConfig.command) {
      opencodeConfig.command = {};
    }
    const commands = opencodeConfig.command as Record<string, unknown>;
    if (!configCommand?.[PLAN_SAVE_COMMAND]) {
      commands[PLAN_SAVE_COMMAND] = {
        template: PLAN_SAVE_TEMPLATE,
        description: 'Save or update a durable markdown plan',
      };
    }
    if (!configCommand?.[PLAN_READ_COMMAND]) {
      commands[PLAN_READ_COMMAND] = {
        template: PLAN_READ_TEMPLATE,
        description: 'Read the current durable markdown plan',
      };
    }
    if (!configCommand?.[PLAN_LIST_COMMAND]) {
      commands[PLAN_LIST_COMMAND] = {
        template: PLAN_LIST_TEMPLATE,
        description: 'List durable markdown plans',
      };
    }
    if (!configCommand?.[PLAN_READY_COMMAND]) {
      commands[PLAN_READY_COMMAND] = {
        template: PLAN_READY_TEMPLATE,
        description: 'Check durable plan readiness for handoff',
      };
    }
    if (!configCommand?.[PLAN_FINISH_COMMAND]) {
      commands[PLAN_FINISH_COMMAND] = {
        template: PLAN_FINISH_TEMPLATE,
        description: 'Close or archive a durable plan lifecycle state',
      };
    }
    if (!configCommand?.[PLAN_TO_SDD_COMMAND]) {
      commands[PLAN_TO_SDD_COMMAND] = {
        template: PLAN_TO_SDD_TEMPLATE,
        description: 'Import a durable markdown plan into native SDD',
      };
    }
    if (!configCommand?.[DETECT_COMMAND]) {
      commands[DETECT_COMMAND] = {
        template: DETECT_TEMPLATE,
        description: 'Detect local durable markdown plans without writes',
      };
    }
    if (!configCommand?.[IMPORT_COMMAND]) {
      commands[IMPORT_COMMAND] = {
        template: IMPORT_TEMPLATE,
        description: 'Import an explicit markdown plan into native SDD',
      };
    }
  }

  async function handleCommandExecuteBefore(
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Array<{ type: string; text?: string }> },
  ): Promise<void> {
    if (
      input.command !== PLAN_READ_COMMAND &&
      input.command !== PLAN_LIST_COMMAND &&
      input.command !== PLAN_READY_COMMAND &&
      input.command !== PLAN_FINISH_COMMAND &&
      input.command !== PLAN_TO_SDD_COMMAND &&
      input.command !== DETECT_COMMAND &&
      input.command !== IMPORT_COMMAND
    ) {
      return;
    }

    output.parts.length = 0;

    if (input.command === PLAN_READ_COMMAND) {
      const parsed = parsePlanReadArgs(input.arguments);
      output.parts.push(
        createInternalAgentTextPart(
          readPlan(runtime, {
            path: parsed.planPath,
            sessionID: input.sessionID,
          }),
        ),
      );
      return;
    }

    if (input.command === PLAN_LIST_COMMAND) {
      output.parts.push(createInternalAgentTextPart(listPlans(runtime)));
      return;
    }

    if (input.command === PLAN_READY_COMMAND) {
      const parsed = parseReadyArgs(input.arguments);
      if (parsed.error) {
        output.parts.push(createInternalAgentTextPart(parsed.error));
        return;
      }
      output.parts.push(
        createInternalAgentTextPart(
          readyPlan(runtime, {
            auto: parsed.auto,
            slug: parsed.slug,
            domain: parsed.domain,
            sessionID: input.sessionID,
          }),
        ),
      );
      return;
    }

    if (input.command === PLAN_FINISH_COMMAND) {
      const parsed = parseFinishArgs(input.arguments);
      if (parsed.error || !parsed.status) {
        output.parts.push(
          createInternalAgentTextPart(parsed.error ?? 'Missing --status.'),
        );
        return;
      }
      output.parts.push(
        createInternalAgentTextPart(
          finishPlan(runtime, {
            path: parsed.planPath,
            status: parsed.status,
            reason: parsed.reason,
            job: parsed.job,
            sessionID: input.sessionID,
          }),
        ),
      );
      return;
    }

    if (input.command === DETECT_COMMAND) {
      output.parts.push(createInternalAgentTextPart(detectPlans(runtime)));
      return;
    }

    const parsed = parseImportArgs(input.arguments);
    if (parsed.error) {
      output.parts.push(
        createInternalAgentTextPart(`${parsed.error}\n${usage()}`),
      );
      return;
    }
    if (!parsed.planPath && input.command === IMPORT_COMMAND) {
      output.parts.push(
        createInternalAgentTextPart(`Missing path.\n${usage()}`),
      );
      return;
    }

    const planPath =
      parsed.planPath ?? defaultPlanPath(runtime.root, input.sessionID);

    output.parts.push(
      createInternalAgentTextPart(
        importPlan(runtime, {
          path: planPath,
          slug: parsed.slug,
          domain: parsed.domain,
          confirmImport: true,
        }),
      ),
    );
  }

  return { registerCommand, handleCommandExecuteBefore };
}

function lastUserMessage(
  messages: ChatTransformMessage[],
): ChatTransformMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].info.role === 'user') {
      return messages[index];
    }
  }
  return undefined;
}

function userText(message: ChatTransformMessage): string {
  return message.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n')
    .trim();
}

function isQuestionOrConditional(text: string): boolean {
  return /[?？]|\b(if|whether|can|could|should|what|why|how)\b|如果|是否|能不能|可不可以|怎么|为什么|会不会/.test(
    text,
  );
}

function isPlanAuthoringIntent(text: string): boolean {
  return /^(做个计划|落个计划|写个计划|整理计划|保存计划|更新计划|把刚才讨论写进计划|make a plan|save (?:the )?plan|update (?:the )?plan)(\s|$|[，。！!])?/i.test(
    text,
  );
}

function isPlanReadinessIntent(text: string): boolean {
  return /^(差不多了|方案(?:\s*OK| ok|就这样)|可以了|没问题|就按这个|准备开干|开干|开始落地|开始实现|开始执行|按这个做|就这么办|落地吧|go ahead|ship it|implement this)(\s|$|[，。！!])?/i.test(
    text,
  );
}

function classifyNaturalPlanIntent(text: string): string | undefined {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (
    !normalized ||
    normalized.length > 40 ||
    isQuestionOrConditional(normalized)
  ) {
    return undefined;
  }
  if (isPlanAuthoringIntent(normalized)) {
    return 'author-plan';
  }
  if (isPlanReadinessIntent(normalized)) {
    return 'start-implementation';
  }
  if (
    /^(这个方案不要了|废弃这个 ?plan|先不做了|清掉当前计划)(\s|$|[，。！!])?/i.test(
      normalized,
    )
  ) {
    return 'abandon-plan';
  }
  if (
    /^(做完了|验证通过|收尾|这个 ?plan ?完成了)(\s|$|[，。！!])?/i.test(
      normalized,
    )
  ) {
    return 'complete-plan';
  }
  return undefined;
}

function naturalPlanInstruction(intent: string): string {
  if (intent === 'author-plan') {
    return [
      `${PLAN_AUTOMATION_MARKER} intent=author-plan</internal_reminder>`,
      'The user asked to create, save, update, or maintain a durable markdown plan.',
      'Stay in Plan Mode. Do not implement, import SDD, commit, deploy, or edit non-plan files.',
      'Create or update the current-session durable plan with plan_save. If an existing current-session plan is available, read it first and merge rather than replacing unrelated content.',
      'Use only plan_save for the durable-plan write; all other actions remain planning/read-only.',
    ].join('\n');
  }
  if (intent === 'start-implementation') {
    return [
      `${PLAN_AUTOMATION_MARKER} intent=start-implementation</internal_reminder>`,
      'The user expressed readiness/completion intent for the current durable plan.',
      'Stay in readiness handoff. Call plan_ready first. If no current-session plan exists but the conversation contains enough plan content, save that content with plan_save first, then call plan_ready. If there is not enough plan content, ask exactly one clarification question.',
      'Do not implement, import SDD, call plan_finish(status=executing), commit, deploy, or edit files from this Plan Mode turn.',
      'Always show a short Plan automation status block before continuing.',
    ].join('\n');
  }
  if (intent === 'abandon-plan') {
    return [
      `${PLAN_AUTOMATION_MARKER} intent=abandon-plan</internal_reminder>`,
      'The user expressed a short abandon-plan intent.',
      'Call plan_finish with status=abandoned and return its output verbatim. Do not edit code.',
    ].join('\n');
  }
  return [
    `${PLAN_AUTOMATION_MARKER} intent=complete-plan</internal_reminder>`,
    'The user expressed a short completion intent.',
    'Do not mark the plan done unless validation evidence exists in this conversation. If evidence exists, call plan_finish with status=done; otherwise run or request validation first.',
  ].join('\n');
}

export function createPlanIntentHandoffHook(
  ctx: PluginInput,
  options: PlannerBridgeCommandManagerOptions = {},
) {
  const runtime = createRuntime(ctx, options);

  return {
    handleMessagesTransform(output: {
      messages: ChatTransformMessage[];
    }): void {
      const message = lastUserMessage(output.messages);
      if (!message) return;
      if (message.info.agent && message.info.agent !== 'orchestrator') return;
      const sessionID = message.info.sessionID;
      if (!sessionID) return;
      const text = userText(message);
      const intent = classifyNaturalPlanIntent(text);
      if (!intent) return;
      const planPath = defaultPlanPath(runtime.root, sessionID);
      if (
        intent !== 'author-plan' &&
        intent !== 'start-implementation' &&
        !fs.existsSync(planPath)
      ) {
        return;
      }
      if (
        message.parts.some((part) =>
          part.text?.includes(PLAN_AUTOMATION_MARKER),
        )
      ) {
        return;
      }
      message.parts.push(
        createInternalAgentTextPart(naturalPlanInstruction(intent)),
      );
    },
  };
}

export function allowDurablePlanSaveInPlanMode(system: string[]): void {
  if (!system.some((entry) => /plan mode/i.test(entry))) {
    return;
  }

  for (let index = 0; index < system.length; index += 1) {
    system[index] = normalizePlanModeReminder(system[index]);
  }

  if (
    system.some((entry) =>
      entry.includes('Fork-local durable Plan Mode policy'),
    )
  ) {
    return;
  }

  system.push(PLAN_MODE_POLICY_TEXT);
}

function normalizePlanModeReminder(entry: string): string {
  if (!/plan mode/i.test(entry)) {
    return entry;
  }

  return entry
    .replace(
      /\bSTRICTLY FORBIDDEN\s*:?\s*ANY file edits, modifications, or system changes\b\.?/gi,
      'STRICTLY FORBIDDEN for non-plan changes: any file edits, modifications, or system changes except durable markdown plan persistence via plan_save.',
    )
    .replace(
      /\bANY file edits, modifications, or system changes\s+are\s+STRICTLY FORBIDDEN\b\.?/gi,
      'Any non-plan file edits, modifications, or system changes remain STRICTLY FORBIDDEN; durable markdown plan persistence may use plan_save only.',
    )
    .replace(
      /\bABSOLUTE CONSTRAINT\s*:?\s*(?:No|Do not perform|Do not make)\s+(?:ANY\s+)?(?:file edits, modifications, or system changes|file writes|file edits|system changes)\b\.?/gi,
      'ABSOLUTE CONSTRAINT for non-plan changes: do not perform file edits, modifications, or system changes except durable markdown plan persistence via plan_save.',
    )
    .replace(
      /\bZERO exceptions\b\.?/gi,
      'Single exception: durable plan persistence may use plan_save only.',
    )
    .replace(
      /\bANY file edits, modifications, or system changes\b(?! except| remain| via| outside)\.?/gi,
      'Non-plan file edits, modifications, or system changes remain forbidden; durable markdown plan persistence may use plan_save only.',
    )
    .replace(
      /\bDo not write files\b(?! except)\.?/gi,
      'Do not write files except durable markdown plans via plan_save.',
    )
    .replace(
      /\bNo file writes\b(?! except)\.?/gi,
      'No file writes except durable markdown plans via plan_save.',
    )
    .replace(
      /\bNo tools? that write files\b(?! except)\.?/gi,
      'No tools that write files except plan_save for durable markdown plans.',
    )
    .replace(
      /\bDo not use tools? that write files\b(?! except)\.?/gi,
      'Do not use tools that write files except plan_save for durable markdown plans.',
    );
}

export type PlannerBridgeCommandManager = ReturnType<
  typeof createPlannerBridgeCommandManager
>;
