export interface InterviewQuestion {
  id: string;
  question: string;
  options: string[];
  suggested?: string;
}

export interface InterviewAnswer {
  questionId: string;
  answer: string;
}

export interface InterviewAssistantState {
  questions: InterviewQuestion[];
}

// ─── Interfaces ─────────────────────────────────────────────────────

export interface InterviewRecord {
  id: string;
  sessionID: string;
  idea: string;
  markdownPath: string;
  createdAt: string;
  status: 'active' | 'abandoned';
  baseMessageCount: number;
}

export interface InterviewMessagePart {
  type?: string;
  text?: string;
}

export interface InterviewMessage {
  info?: {
    role?: string;
    [key: string]: unknown;
  };
  parts?: InterviewMessagePart[];
}

export interface InterviewListItem {
  id: string;
  idea: string;
  status: InterviewRecord['status'];
  createdAt: string;
}

export interface InterviewFileItem {
  fileName: string;
  resumeCommand: string;
  title: string;
  summary?: string;
  sessionID?: string;
  directory?: string;
}

export interface InterviewState {
  interview: InterviewRecord;
  url: string;
  markdownPath: string;
  mode:
    | 'awaiting-agent'
    | 'awaiting-user'
    | 'abandoned'
    | 'completed'
    | 'error'
    | 'session-disconnected';
  lastParseError?: string;
  isBusy: boolean;
  questions: InterviewQuestion[];
  document: string;
}

/** Wire format for dashboard state cache entries. */
export interface InterviewStateEntry {
  interviewId: string;
  sessionID: string;
  idea: string;
  mode:
    | 'awaiting-agent'
    | 'awaiting-user'
    | 'abandoned'
    | 'completed'
    | 'error'
    | 'session-disconnected';
  questions: Array<{
    id: string;
    question: string;
    options?: string[];
    suggested?: string;
  }>;
  pendingAnswers: Array<{
    questionId: string;
    answer: string;
  }> | null;
  lastUpdatedAt: number;
  filePath: string;
  nudgeAction: 'more-questions' | 'confirm-complete' | null;
}
