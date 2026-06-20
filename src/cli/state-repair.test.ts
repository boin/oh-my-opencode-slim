import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseStateRepairArgs, runStateRepairCheck } from './state-repair';

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function createDb(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'state-repair-test-'));
  tempDirs.push(dir);
  const dbPath = path.join(dir, 'opencode.db');
  const db = new Database(dbPath);
  db.exec(`
    create table session (id text primary key, title text);
    create table part (
      id text primary key,
      session_id text,
      message_id text,
      time_updated integer,
      data text
    );
  `);
  db.close();
  return dbPath;
}

function insertPart(
  dbPath: string,
  input: {
    id: string;
    sessionId?: string;
    title?: string;
    tool: string;
    status: string;
    timeUpdated: number;
    metadata?: Record<string, unknown>;
  },
): void {
  const db = new Database(dbPath);
  const sessionId = input.sessionId ?? 'ses_parent';
  db.query('insert or ignore into session (id, title) values (?, ?)').run(
    sessionId,
    input.title ?? 'Parent Session',
  );
  db.query(
    'insert into part (id, session_id, message_id, time_updated, data) values (?, ?, ?, ?, ?)',
  ).run(
    input.id,
    sessionId,
    `msg_${input.id}`,
    input.timeUpdated,
    JSON.stringify({
      type: 'tool',
      tool: input.tool,
      state: {
        status: input.status,
        input: { description: `${input.tool} work` },
        metadata: input.metadata ?? {},
      },
    }),
  );
  db.close();
}

describe('parseStateRepairArgs', () => {
  test('defaults to check-only mode', () => {
    expect(parseStateRepairArgs([])).toMatchObject({
      mode: 'check',
      staleAfterMs: 3_600_000,
    });
  });

  test('parses explicit safe repair options', () => {
    expect(
      parseStateRepairArgs([
        '--repair-safe',
        '--db=/tmp/opencode.db',
        '--stale-after-ms=1000',
        '--json',
      ]),
    ).toMatchObject({
      mode: 'safe',
      dbPath: '/tmp/opencode.db',
      staleAfterMs: 1000,
      json: true,
    });
  });
});

describe('runStateRepairCheck', () => {
  test('check-only reports stale non-task running tool parts without writing', () => {
    const dbPath = createDb();
    insertPart(dbPath, {
      id: 'prt_stale_bash',
      tool: 'bash',
      status: 'running',
      timeUpdated: 100,
    });

    const result = runStateRepairCheck({
      dbPath,
      mode: 'check',
      staleAfterMs: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.stale).toHaveLength(1);
    expect(result.stale[0]).toMatchObject({
      part: 'prt_stale_bash',
      tool: 'bash',
    });

    const db = new Database(dbPath, { readonly: true });
    const row = db
      .query('select data from part where id=?')
      .get('prt_stale_bash') as {
      data: string;
    };
    expect(JSON.parse(row.data).state.status).toBe('running');
    db.close();
  });

  test('safe repair backs up and completes stale task and non-task parts', () => {
    const dbPath = createDb();
    insertPart(dbPath, {
      id: 'prt_task',
      tool: 'task',
      status: 'running',
      timeUpdated: 100,
      metadata: { sessionId: 'ses_child' },
    });
    insertPart(dbPath, {
      id: 'prt_grep',
      tool: 'grep',
      status: 'running',
      timeUpdated: 100,
    });

    const result = runStateRepairCheck({
      dbPath,
      mode: 'safe',
      staleAfterMs: 0,
    });

    expect(result.ok).toBe(true);
    expect(result.updated).toHaveLength(2);
    expect(result.backupPath).toBeDefined();

    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .query('select id, data from part order by id')
      .all() as Array<{ id: string; data: string }>;
    const parsed = Object.fromEntries(
      rows.map((row) => [row.id, JSON.parse(row.data)]),
    );
    expect(parsed.prt_task.state.status).toBe('completed');
    expect(parsed.prt_task.state.output).toContain(
      '<task id="ses_child" state="cancelled">',
    );
    expect(parsed.prt_grep.state.status).toBe('completed');
    expect(parsed.prt_grep.state.output).toContain('[state repair]');
    db.close();
  });

  test('safe repair skips question parts', () => {
    const dbPath = createDb();
    insertPart(dbPath, {
      id: 'prt_question',
      tool: 'question',
      status: 'running',
      timeUpdated: 100,
    });

    const result = runStateRepairCheck({
      dbPath,
      mode: 'safe',
      staleAfterMs: 0,
    });

    expect(result.updated).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);

    const db = new Database(dbPath, { readonly: true });
    const row = db
      .query('select data from part where id=?')
      .get('prt_question') as {
      data: string;
    };
    expect(JSON.parse(row.data).state.status).toBe('running');
    db.close();
  });
});
