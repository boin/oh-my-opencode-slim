import type {
  InterviewAssistantState,
  InterviewMessage,
  InterviewQuestion,
} from './types';

const QUESTION_REGEX = /^Q(\d+):\s*(.+)$/;
const OPTION_REGEX = /^-\s+(.+?)(\s+\*)?$/;

function finalizeQuestion(
  state: InterviewAssistantState,
  current: {
    number: number;
    question: string;
    options: string[];
    suggested?: string;
  } | null,
  maxQuestions: number,
): void {
  if (!current || state.questions.length >= maxQuestions) {
    return;
  }

  state.questions.push({
    id: `q-${current.number}`,
    question: current.question,
    options: current.options.slice(0, 4),
    suggested: current.suggested,
  });
}

export function flattenMessage(message: InterviewMessage): string {
  return (message.parts ?? [])
    .map((part) => part.text ?? '')
    .join('\n')
    .trim();
}

export function buildFallbackState(
  _messages: InterviewMessage[],
): InterviewAssistantState {
  return {
    questions: [],
  };
}

export function parsePlainTextQuestions(
  text: string,
  maxQuestions = 2,
): {
  state: InterviewAssistantState | null;
  error?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const firstQuestionIndex = lines.findIndex((line) => QUESTION_REGEX.test(line));
  if (firstQuestionIndex < 0) {
    return { state: null };
  }

  const state: InterviewAssistantState = { questions: [] };
  let current:
    | {
        number: number;
        question: string;
        options: string[];
        suggested?: string;
      }
    | null = null;
  let lastQuestionNumber = 0;

  for (let index = firstQuestionIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const questionMatch = line.match(QUESTION_REGEX);
    if (questionMatch) {
      finalizeQuestion(state, current, maxQuestions);

      const number = Number.parseInt(questionMatch[1], 10);
      const question = questionMatch[2]?.trim() ?? '';
      if (!question) {
        return { state: null, error: `Question Q${number} is missing text.` };
      }
      if (number <= lastQuestionNumber) {
        return {
          state: null,
          error: `Question numbers must increase sequentially. Found Q${number} after Q${lastQuestionNumber}.`,
        };
      }

      current = {
        number,
        question,
        options: [],
      };
      lastQuestionNumber = number;
      continue;
    }

    if (!current) {
      continue;
    }

    const optionMatch = line.match(OPTION_REGEX);
    if (!optionMatch) {
      return {
        state: null,
        error: `Expected an option line starting with "- " after Q${current.number}, got: ${line}`,
      };
    }

    const option = optionMatch[1]?.trim() ?? '';
    if (!option) {
      return {
        state: null,
        error: `Question Q${current.number} has an empty option.`,
      };
    }

    current.options.push(option);
    if (optionMatch[2]) {
      current.suggested = option;
    }
  }

  finalizeQuestion(state, current, maxQuestions);

  if (current && current.options.length === 0) {
    return {
      state: null,
      error: `Question Q${current.number} must include at least one option.`,
    };
  }

  for (const question of state.questions) {
    if (question.options.length === 0) {
      return {
        state: null,
        error: `Question ${question.id} must include at least one option.`,
      };
    }
  }

  return { state };
}

export function findLatestAssistantState(
  messages: InterviewMessage[],
  maxQuestions = 2,
): {
  state: InterviewAssistantState | null;
  latestAssistantError?: string;
} {
  let latestAssistantError: string | undefined;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.info?.role !== 'assistant') {
      continue;
    }

    const parsed = parsePlainTextQuestions(flattenMessage(message), maxQuestions);
    if (parsed.state) {
      return {
        state: parsed.state,
        latestAssistantError,
      };
    }

    if (!latestAssistantError) {
      latestAssistantError =
        parsed.error ?? 'Missing plain-text interview questions.';
    }
  }

  return {
    state: null,
    latestAssistantError,
  };
}
