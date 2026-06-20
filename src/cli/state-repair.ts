import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type StateRepairMode = 'check' | 'safe';

export interface StateRepairArgs {
  dbPath?: string;
  mode: StateRepairMode;
  staleAfterMs: number;
  json?: boolean;
  help?: boolean;
  error?: string;
}

export interface StaleRunningToolPart {
  part: string;
  session: string;
  sessionTitle?: string | null;
  message?: string | null;
  tool: string;
  updated: number;
  ageMs: number;
  childSession?: string | null;
  description?: string | null;
}

export interface StateRepairResult {
  ok: boolean;
  mode: StateRepairMode;
  dbPath: string;
  checkedAt: number;
  staleAfterMs: number;
  stale: StaleRunningToolPart[];
  updated: StaleRunningToolPart[];
  skipped: StaleRunningToolPart[];
  backupPath?: string;
  warning?: string;
}

interface PartRow {
  id: string;
  session_id: string;
  message_id: string | null;
  time_updated: number | null;
  data: string;
  session_title: string | null;
}

const DEFAULT_STALE_AFTER_MS = 60 * 60 * 1000;
const SKIPPED_TOOLS = new Set(['question', 'permission']);

export function parseStateRepairArgs(args: string[]): StateRepairArgs {
  const result: StateRepairArgs = {
    mode: envMode(),
    staleAfterMs: DEFAULT_STALE_AFTER_MS,
  };

  for (const arg of args) {
    if (arg === '--check-only') {
      result.mode = 'check';
    } else if (arg === '--repair-safe') {
      result.mode = 'safe';
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg.startsWith('--db=')) {
      result.dbPath = arg.slice('--db='.length);
    } else if (arg.startsWith('--stale-after-ms=')) {
      const value = Number(arg.slice('--stale-after-ms='.length));
      if (!Number.isFinite(value) || value < 0) {
        result.error = 'Invalid --stale-after-ms value';
      } else {
        result.staleAfterMs = value;
      }
    } else {
      result.error ??= `Unknown state-repair option: ${arg}`;
    }
  }

  return result;
}

export function getDefaultOpenCodeDbPath(): string {
  const dataHome =
    process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(dataHome, 'opencode', 'opencode.db');
}

export function runStateRepairCheck(args: StateRepairArgs): StateRepairResult {
  const dbPath = args.dbPath ?? getDefaultOpenCodeDbPath();
  const checkedAt = Date.now();
  const resultBase = {
    mode: args.mode,
    dbPath,
    checkedAt,
    staleAfterMs: args.staleAfterMs,
    stale: [],
    updated: [],
    skipped: [],
  } satisfies Omit<StateRepairResult, 'ok'>;

  if (!existsSync(dbPath)) {
    return {
      ...resultBase,
      ok: true,
      warning: `OpenCode database not found: ${dbPath}`,
    };
  }

  const db =
    args.mode === 'safe'
      ? new Database(dbPath)
      : new Database(dbPath, { readonly: true });
  try {
    const candidates = findStaleRunningToolParts(
      db,
      checkedAt,
      args.staleAfterMs,
    );
    const skipped = candidates.filter((part) => SKIPPED_TOOLS.has(part.tool));
    const stale = candidates.filter((part) => !SKIPPED_TOOLS.has(part.tool));

    if (args.mode === 'check' || stale.length === 0) {
      return {
        ...resultBase,
        ok: stale.length === 0,
        stale,
        skipped,
      };
    }

    const backupPath = createBackup(db, dbPath, checkedAt);
    const updated = repairStaleParts(db, stale, checkedAt);

    return {
      ...resultBase,
      ok: true,
      stale,
      updated,
      skipped,
      backupPath,
    };
  } finally {
    db.close();
  }
}

export function formatHumanStateRepairResult(
  result: StateRepairResult,
): string {
  const lines: string[] = [];
  lines.push(`Mode: ${result.mode}`);
  lines.push(`DB: ${result.dbPath}`);
  lines.push(`Stale threshold: ${result.staleAfterMs}ms`);
  if (result.warning) lines.push(`Warning: ${result.warning}`);
  lines.push(`Stale repairable running tool parts: ${result.stale.length}`);
  lines.push(`Skipped running tool parts: ${result.skipped.length}`);
  lines.push(`Updated: ${result.updated.length}`);
  if (result.backupPath) lines.push(`Backup: ${result.backupPath}`);

  const visible = result.updated.length > 0 ? result.updated : result.stale;
  for (const part of visible.slice(0, 20)) {
    lines.push(
      `- ${part.part} / ${part.tool} / ${part.sessionTitle ?? part.session} / age=${part.ageMs}ms`,
    );
  }
  if (visible.length > 20) lines.push(`- ... ${visible.length - 20} more`);

  return lines.join('\n');
}

export function formatJsonStateRepairResult(result: StateRepairResult): string {
  return JSON.stringify(result, null, 2);
}

export async function stateRepair(args: StateRepairArgs): Promise<number> {
  if (args.help) {
    console.log(`Usage: oh-my-opencode-slim state-repair [OPTIONS]

Options:
  --check-only              Inspect only (default unless env enables safe mode)
  --repair-safe             Back up DB and repair clearly stale running tool parts
  --db=<path>               OpenCode sqlite DB path
  --stale-after-ms=<ms>     Minimum running age to consider stale (default: 3600000)
  --json                    Print result as JSON
  -h, --help                Show this help message

Environment:
  OPENCODE_STATE_REPAIR_PRESTART=check|safe|off

Systemd pre-start example:
  ExecStartPre=/usr/bin/env OPENCODE_STATE_REPAIR_PRESTART=check oh-my-opencode-slim state-repair
`);
    return 0;
  }

  if (args.error) {
    console.error(args.error);
    return 1;
  }

  const result = runStateRepairCheck(args);
  console.log(
    args.json
      ? formatJsonStateRepairResult(result)
      : formatHumanStateRepairResult(result),
  );

  if (args.mode === 'check') return 0;
  return result.ok ? 0 : 1;
}

function envMode(): StateRepairMode {
  const value = process.env.OPENCODE_STATE_REPAIR_PRESTART;
  return value === 'safe' ? 'safe' : 'check';
}

function findStaleRunningToolParts(
  db: Database,
  now: number,
  staleAfterMs: number,
): StaleRunningToolPart[] {
  const rows = db
    .query(
      `select p.id, p.session_id, p.message_id, p.time_updated, p.data,
        s.title as session_title
       from part p
       left join session s on s.id=p.session_id
       where p.data like '%running%'
       order by p.time_updated desc`,
    )
    .all() as PartRow[];

  const stale: StaleRunningToolPart[] = [];
  for (const row of rows) {
    let data: unknown;
    try {
      data = JSON.parse(row.data);
    } catch {
      continue;
    }

    if (!isToolPart(data)) continue;
    if (data.state?.status !== 'running') continue;

    const updated = row.time_updated ?? 0;
    const ageMs = now - updated;
    if (ageMs < staleAfterMs) continue;

    const childSession = data.state?.metadata?.sessionId;
    stale.push({
      part: row.id,
      session: row.session_id,
      sessionTitle: row.session_title,
      message: row.message_id,
      tool: data.tool,
      updated,
      ageMs,
      childSession: typeof childSession === 'string' ? childSession : null,
      description: data.state?.input?.description ?? data.state?.title ?? null,
    });
  }

  return stale;
}

function createBackup(db: Database, dbPath: string, now: number): string {
  const backupPath = `${dbPath}.backup-before-state-repair-${new Date(now)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')}`;
  const parent = path.dirname(backupPath);
  mkdirSync(parent, { recursive: true });
  db.exec(`VACUUM INTO ${JSON.stringify(backupPath)}`);
  return backupPath;
}

function repairStaleParts(
  db: Database,
  stale: StaleRunningToolPart[],
  now: number,
): StaleRunningToolPart[] {
  const update = db.query('update part set data=?, time_updated=? where id=?');
  const select = db.query('select data from part where id=?');
  const updated: StaleRunningToolPart[] = [];

  for (const part of stale) {
    const row = select.get(part.part) as { data?: string } | null;
    if (!row?.data) continue;

    let data: unknown;
    try {
      data = JSON.parse(row.data);
    } catch {
      continue;
    }
    if (!isToolPart(data) || data.state?.status !== 'running') continue;

    data.state.status = 'completed';
    data.state.output = outputForTool(data.tool, part.childSession);
    data.state.metadata = {
      ...(data.state.metadata ?? {}),
      repaired: true,
      repairedReason:
        'stale persisted running tool state repaired before OpenCode startup',
    };
    data.state.time = { ...(data.state.time ?? {}), end: now };

    update.run(JSON.stringify(data), now, part.part);
    updated.push(part);
  }

  return updated;
}

function outputForTool(tool: string, childSession?: string | null): string {
  if (tool === 'task') {
    const child = childSession ?? 'unknown';
    return [
      `<task id="${escapeXml(child)}" state="cancelled">`,
      '<task_error>',
      'cancelled: repaired stale persisted running task state before OpenCode startup',
      '</task_error>',
      '</task>',
    ].join('\n');
  }

  return '[state repair] completed stale persisted running tool state before OpenCode startup';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isToolPart(value: unknown): value is {
  type: 'tool';
  tool: string;
  state?: {
    status?: string;
    output?: string;
    metadata?: Record<string, unknown>;
    input?: { description?: string };
    title?: string;
    time?: Record<string, unknown>;
  };
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'tool' &&
    typeof (value as { tool?: unknown }).tool === 'string'
  );
}
