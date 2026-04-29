import type { InterviewQuestion } from './types';

function formatQuestionContext(questions: InterviewQuestion[]): string {
  if (questions.length === 0) {
    return 'No current interview questions were parsed.';
  }

  return questions
    .map((question, index) => {
      const options = question.options.length
        ? `Options: ${question.options.join(' | ')}`
        : 'Options: freeform';
      const suggested = question.suggested
        ? `Suggested: ${question.suggested}`
        : 'Suggested: none';
      return `${index + 1}. ${question.question}\n${options}\n${suggested}`;
    })
    .join('\n\n');
}

export function formatInstructions(maxQuestions: number): string {
  return [
    'After any short human-friendly preface, you MUST include questions in this exact plain-text format:',
    '',
    'Q1: What is your first question?',
    '- First option',
    '- Second option *',
    '- Third option',
    '',
    'Q2: What is your second question?',
    '- Option A *',
    '- Option B',
    '- Option C',
    '- Option D',
    '',
    'Format rules:',
    '- Use "Q{n}: " prefix for each question (Q1:, Q2:, etc.)',
    '- Use "- " prefix for each option',
    '- Add " *" suffix to mark the suggested/recommended option',
    '- Include 1 to 4 options per question',
    '- Separate questions with an empty line',
    '- No JSON, no XML, no code blocks',
    `- Return 0 to ${maxQuestions} questions`,
    '- If there are no more useful questions, return zero questions',
  ].join('\n');
}

export function buildKickoffPrompt(idea: string, maxQuestions: number): string {
  return [
    'You are running an interview q&a session for the user inside their repository.',
    `Initial idea: ${idea}`,
    `Clarify the idea through short rounds of at most ${maxQuestions} questions at a time.`,
    'When useful, each question may include 2 to 4 answer options and one suggested option.',
    'Be practical. Focus on the highest-ambiguity and highest-risk decisions first.',
    '',
    formatInstructions(maxQuestions),
  ].join('\n');
}

export function buildResumePrompt(
  document: string,
  maxQuestions: number,
): string {
  return [
    'Resume the interview from this existing markdown document.',
    'Use the current Q&A history as ground truth so far.',
    'Do not restart from scratch.',
    '',
    document,
    '',
    `Ask the next highest-value clarifying questions, up to ${maxQuestions} at a time.`,
    'If there are no more useful questions, return zero questions.',
    '',
    formatInstructions(maxQuestions),
  ].join('\n');
}

export function buildAnswerPrompt(
  answers: Array<{ questionId: string; answer: string }>,
  questions: InterviewQuestion[],
  maxQuestions: number,
): string {
  const answerText = answers
    .map(
      (answer, index) =>
        `${index + 1}. ${answer.questionId}: ${answer.answer.trim()}`,
    )
    .join('\n');

  return [
    'Continue the same interview.',
    'These were the active questions:',
    formatQuestionContext(questions),
    'The user answered:',
    answerText,
    'Now update your understanding and ask the next highest-value clarifying questions.',
    `Return 0 to ${maxQuestions} questions. If there are no more useful questions, return zero questions.`,
    '',
    formatInstructions(maxQuestions),
  ].join('\n\n');
}

export function buildRetryPrompt(error: string, maxQuestions: number): string {
  return [
    'Your previous response could not be parsed correctly.',
    `Error: ${error}`,
    '',
    'Please fix the format and try again.',
    '',
    formatInstructions(maxQuestions),
  ].join('\n');
}
