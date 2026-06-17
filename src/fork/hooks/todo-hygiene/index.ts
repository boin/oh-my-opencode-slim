import type { PluginInput } from '@opencode-ai/plugin';
import {
  createInternalAgentTextPart,
  hasInternalInitiatorMarker,
  log,
  withTimeout,
} from '../../../utils';
import { createTodoHygiene } from './todo-hygiene';

const HOOK_NAME = 'todo-hygiene';
const TODO_STATE_TIMEOUT_MS = 500;
const TERMINAL_TODO_STATUSES = ['completed', 'cancelled'];
const TODO_HYGIENE_SENTINEL = '<!-- TODO_HYGIENE_REMINDER -->';

interface MessagePart {
  type?: string;
  text?: string;
  [key: string]: unknown;
}

interface ChatTransformMessage {
  info: {
    id?: string;
    role?: string;
    agent?: string;
    sessionID?: string;
  };
  parts: MessagePart[];
}

function appendTodoHygieneInstruction(
  message: ChatTransformMessage,
  reminder: string,
): void {
  removeTodoHygieneInstruction(message);
  message.parts.push(
    createInternalAgentTextPart(`${TODO_HYGIENE_SENTINEL}\n${reminder}`),
  );
}

function removeTodoHygieneInstruction(message: ChatTransformMessage): void {
  message.parts = message.parts.filter((part) => !isTodoHygienePart(part));
}

function isTodoHygienePart(part: MessagePart): boolean {
  return (
    part.type === 'text' &&
    typeof part.text === 'string' &&
    part.text.includes(TODO_HYGIENE_SENTINEL) &&
    hasInternalInitiatorMarker(part)
  );
}

function messageSignature(
  message: ChatTransformMessage,
  ordinal: number,
): string {
  const partSignature = message.parts
    .filter((part) => !isTodoHygienePart(part))
    .map((part) => {
      if (part.type === 'text' && typeof part.text === 'string') {
        return `${part.type}:${part.text.trim()}`;
      }
      return part.type ?? 'unknown';
    })
    .join('|');

  return message.info.id
    ? `${message.info.id}:${partSignature}`
    : `${ordinal}:${partSignature}`;
}

function lastUserMessage(
  messages: ChatTransformMessage[],
): { message: ChatTransformMessage; signature: string } | null {
  let userOrdinal = 0;
  const ordinals = new Map<ChatTransformMessage, number>();
  for (const message of messages) {
    if (message.info.role === 'user') {
      userOrdinal++;
      ordinals.set(message, userOrdinal);
    }
  }

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.info.role !== 'user') continue;
    return {
      message,
      signature: messageSignature(message, ordinals.get(message) ?? index),
    };
  }

  return null;
}

export function createTodoHygieneHook(
  ctx: PluginInput,
  options: {
    shouldInject: (sessionID: string) => boolean;
  },
) {
  const requestSignatureBySession = new Map<string, string>();

  async function fetchTodoState(sessionID: string) {
    const result = await withTimeout(
      ctx.client.session.todo({
        path: { id: sessionID },
      }),
      TODO_STATE_TIMEOUT_MS,
      `Todo state lookup timed out after ${TODO_STATE_TIMEOUT_MS}ms`,
    );
    const todos = result.data as Array<{ status: string }>;
    const openTodos = todos.filter(
      (todo) => !TERMINAL_TODO_STATUSES.includes(todo.status),
    );

    return {
      hasOpenTodos: openTodos.length > 0,
      openCount: openTodos.length,
      inProgressCount: openTodos.filter((todo) => todo.status === 'in_progress')
        .length,
      pendingCount: openTodos.filter((todo) => todo.status === 'pending')
        .length,
    };
  }

  const hygiene = createTodoHygiene({
    getTodoState: fetchTodoState,
    shouldInject: options.shouldInject,
    log: (message, meta) => log(`[${HOOK_NAME}] ${message}`, meta),
  });

  return {
    async handleToolExecuteAfter(input: {
      tool: string;
      sessionID?: string;
    }): Promise<void> {
      await hygiene.handleToolExecuteAfter(input);
    },

    handleMessagesTransform(output: {
      messages: ChatTransformMessage[];
    }): void {
      const lastUser = lastUserMessage(output.messages);
      if (!lastUser) return;

      const { message, signature } = lastUser;
      if (message.info.agent && message.info.agent !== 'orchestrator') return;
      const sessionID = message.info.sessionID;
      if (!sessionID || !options.shouldInject(sessionID)) return;

      if (requestSignatureBySession.get(sessionID) === signature) {
        const reminder = hygiene.getPendingReminder(sessionID);
        if (reminder) {
          appendTodoHygieneInstruction(message, reminder);
        } else {
          removeTodoHygieneInstruction(message);
        }
        return;
      }

      requestSignatureBySession.set(sessionID, signature);
      removeTodoHygieneInstruction(message);
      hygiene.handleRequestStart({ sessionID });
    },

    handleEvent(input: {
      event: {
        type: string;
        properties?: { info?: { id?: string }; sessionID?: string };
      };
    }): void {
      hygiene.handleEvent({
        type: input.event.type,
        properties: input.event.properties,
      });

      if (input.event.type === 'session.deleted') {
        const sessionID =
          input.event.properties?.sessionID ?? input.event.properties?.info?.id;
        if (sessionID) {
          requestSignatureBySession.delete(sessionID);
        }
      }
    },
  };
}
