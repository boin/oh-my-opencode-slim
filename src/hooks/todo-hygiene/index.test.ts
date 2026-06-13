import { describe, expect, test } from 'bun:test';
import { createTodoHygieneHook } from './index';

function createCtx(todos: Array<{ status: string }> = [{ status: 'pending' }]) {
  return {
    client: {
      session: {
        todo: async () => ({ data: todos }),
      },
    },
  } as any;
}

function createMessages(text = 'Please continue') {
  return {
    messages: [
      {
        info: { role: 'user', agent: 'orchestrator', sessionID: 's1' },
        parts: [{ type: 'text', text }],
      },
    ],
  };
}

describe('todo hygiene hook', () => {
  test('injects a passive reminder into a repeated orchestrator turn', async () => {
    const hook = createTodoHygieneHook(createCtx(), {
      shouldInject: (sessionID) => sessionID === 's1',
    });
    const messages = createMessages();

    hook.handleMessagesTransform(messages);
    expect(messages.messages[0].parts[0].text).not.toContain('todo_hygiene');

    await hook.handleToolExecuteAfter({ tool: 'todowrite', sessionID: 's1' });
    await hook.handleToolExecuteAfter({ tool: 'read', sessionID: 's1' });
    hook.handleMessagesTransform(messages);

    expect(messages.messages[0].parts).toHaveLength(2);
    expect(messages.messages[0].parts[0].text).toBe('Please continue');
    expect(messages.messages[0].parts[1].text).toContain(
      'preserve still-valid todos',
    );
  });

  test('does not strip user-authored todo hygiene instruction text', async () => {
    const userText =
      'Please keep this exact text: <instruction name="todo_hygiene">do not edit</instruction>';
    const hook = createTodoHygieneHook(createCtx(), {
      shouldInject: (sessionID) => sessionID === 's1',
    });
    const messages = createMessages(userText);

    hook.handleMessagesTransform(messages);
    await hook.handleToolExecuteAfter({ tool: 'todowrite', sessionID: 's1' });
    await hook.handleToolExecuteAfter({ tool: 'read', sessionID: 's1' });
    hook.handleMessagesTransform(messages);

    expect(messages.messages[0].parts[0].text).toBe(userText);
    expect(messages.messages[0].parts[1].text).toContain(
      'preserve still-valid todos',
    );
  });

  test('does not strip user-authored todo hygiene sentinel text', async () => {
    const userText =
      'Please keep this exact text: <!-- TODO_HYGIENE_REMINDER -->';
    const hook = createTodoHygieneHook(createCtx(), {
      shouldInject: (sessionID) => sessionID === 's1',
    });
    const messages = createMessages(userText);

    hook.handleMessagesTransform(messages);
    await hook.handleToolExecuteAfter({ tool: 'todowrite', sessionID: 's1' });
    await hook.handleToolExecuteAfter({ tool: 'read', sessionID: 's1' });
    hook.handleMessagesTransform(messages);

    expect(messages.messages[0].parts[0].text).toBe(userText);
    expect(messages.messages[0].parts[1].text).toContain(
      'preserve still-valid todos',
    );
  });

  test('does not inject into non-orchestrator messages', async () => {
    const hook = createTodoHygieneHook(createCtx(), {
      shouldInject: () => true,
    });
    const messages = createMessages();
    messages.messages[0].info.agent = 'fixer';

    hook.handleMessagesTransform(messages);
    await hook.handleToolExecuteAfter({ tool: 'todowrite', sessionID: 's1' });
    await hook.handleToolExecuteAfter({ tool: 'read', sessionID: 's1' });
    hook.handleMessagesTransform(messages);

    expect(messages.messages[0].parts).toHaveLength(1);
    expect(messages.messages[0].parts[0].text).not.toContain('todo_hygiene');
  });
});
