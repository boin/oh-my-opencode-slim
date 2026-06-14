import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTraceFreshnessHook } from './index';

interface MessagePart {
  type: string;
  text?: string;
}
interface Message {
  info: { role: string; agent?: string };
  parts: MessagePart[];
}

function userMsg(text: string, agent = 'orchestrator'): Message {
  return { info: { role: 'user', agent }, parts: [{ type: 'text', text }] };
}

function writeDomain(specDir: string, name: string, req: string, des: string) {
  const d = join(specDir, 'domains', name);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'requirements.md'), req);
  writeFileSync(join(d, 'design.md'), des);
}

let dir: string;
let spec: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'trace-fresh-'));
  spec = join(dir, 'spec');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('trace-freshness hook', () => {
  test('no-op when spec dir does not exist', async () => {
    const hook = createTraceFreshnessHook({ specDir: join(dir, 'missing') });
    const messages: Message[] = [userMsg('hi')];
    await hook['experimental.chat.messages.transform'](
      {} as Record<string, never>,
      { messages },
    );
    expect(messages[0].parts).toHaveLength(1);
  });

  test('no-op when last message is from non-orchestrator agent', async () => {
    writeDomain(
      spec,
      'auth',
      '## auth/REQ-1: x',
      '## auth/DES-1: y\n\nRationale anchor: REQ-1.',
    );
    const hook = createTraceFreshnessHook({ specDir: spec });
    const messages: Message[] = [userMsg('hi', 'fixer')];
    await hook['experimental.chat.messages.transform'](
      {} as Record<string, never>,
      { messages },
    );
    expect(messages[0].parts).toHaveLength(1);
  });

  test('regenerates and reports stale domain', async () => {
    writeDomain(
      spec,
      'auth',
      '## auth/REQ-1: a',
      '## auth/DES-1: b\n\nRationale anchor: REQ-1.',
    );
    // No trace.md → stale.

    const hook = createTraceFreshnessHook({ specDir: spec });
    const messages: Message[] = [userMsg('continue')];
    await hook['experimental.chat.messages.transform'](
      {} as Record<string, never>,
      { messages },
    );

    expect(messages[0].parts).toHaveLength(2);
    const notice = messages[0].parts[1].text ?? '';
    expect(notice).toContain('trace_regenerate:');
    expect(notice).toContain('domain:auth');
    expect(
      readFileSync(join(spec, 'domains', 'auth', 'trace.md'), 'utf8'),
    ).toContain('auth/REQ-1');
  });

  test('reports stale job alongside domain in notice', async () => {
    writeDomain(
      spec,
      'auth',
      '## auth/REQ-1: a',
      '## auth/DES-1: b\n\nRationale anchor: REQ-1.',
    );
    const jobDir = join(spec, 'jobs', 'feat-x');
    mkdirSync(jobDir, { recursive: true });
    writeFileSync(join(jobDir, 'delta-requirements.md'), '## auth/REQ-2: new');
    writeFileSync(
      join(jobDir, 'delta-design.md'),
      '## auth/DES-2: x\n\nRationale anchor: auth/REQ-2.',
    );
    // No job trace.md → stale.

    const hook = createTraceFreshnessHook({ specDir: spec });
    const messages: Message[] = [userMsg('continue')];
    await hook['experimental.chat.messages.transform'](
      {} as Record<string, never>,
      { messages },
    );

    const notice = messages[0].parts[1].text ?? '';
    expect(notice).toContain('domain:auth');
    expect(notice).toContain('job:feat-x');
  });

  test('preserves incomplete domain diagnostic in failure notice', async () => {
    const domainPath = join(spec, 'domains', 'incomplete');
    mkdirSync(domainPath, { recursive: true });
    writeFileSync(join(domainPath, 'requirements.md'), '# incomplete reqs\n');
    writeFileSync(join(domainPath, 'trace.md'), '# Trace\n');

    const hook = createTraceFreshnessHook({ specDir: spec });
    const messages: Message[] = [userMsg('continue')];
    await hook['experimental.chat.messages.transform'](
      {} as Record<string, never>,
      { messages },
    );

    expect(messages[0].parts).toHaveLength(2);
    const notice = messages[0].parts[1].text ?? '';
    expect(notice).toContain('trace_regenerate:');
    expect(notice).toContain('failed');
    expect(notice).toContain('incomplete');
    expect(notice).toContain(domainPath);
    expect(notice).toContain('design.md');
  });

  test('no-op when everything fresh', async () => {
    writeDomain(
      spec,
      'auth',
      '## auth/REQ-1: a',
      '## auth/DES-1: b\n\nRationale anchor: REQ-1.',
    );
    // Pre-regenerate so it's fresh.
    const { regenerateDomainTrace } = require('../../tools/trace/io');
    regenerateDomainTrace(spec, 'auth');

    const hook = createTraceFreshnessHook({ specDir: spec });
    const messages: Message[] = [userMsg('continue')];
    await hook['experimental.chat.messages.transform'](
      {} as Record<string, never>,
      { messages },
    );

    expect(messages[0].parts).toHaveLength(1);
  });

  test('does not double-inject when notice already present', async () => {
    writeDomain(
      spec,
      'auth',
      '## auth/REQ-1: a',
      '## auth/DES-1: b\n\nRationale anchor: REQ-1.',
    );

    const hook = createTraceFreshnessHook({ specDir: spec });
    const messages: Message[] = [userMsg('continue')];
    messages[0].parts.push({
      type: 'text',
      text: '<internal_reminder>trace_regenerate: refreshed</internal_reminder>',
    });
    await hook['experimental.chat.messages.transform'](
      {} as Record<string, never>,
      { messages },
    );

    expect(messages[0].parts).toHaveLength(2);
  });
});
