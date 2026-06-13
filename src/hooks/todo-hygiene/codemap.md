# src/hooks/todo-hygiene/

## Responsibility

Provide a passive V2 todo hygiene reminder that protects active todo lists when
the user corrects, steers, or adds constraints mid-turn.

## Runtime shape

- `todo-hygiene.ts` owns the small state machine:
  - arm after `todowrite` establishes an active todo cycle;
  - inspect todo state after later tools;
  - choose either the general steering reminder or final-active reminder;
  - clear state on new request or session deletion.
- `index.ts` adapts that state machine to V2 plugin hooks:
  - `tool.execute.after` observes tool activity;
  - `experimental.chat.messages.transform` injects the reminder into the active
    Orchestrator turn;
  - `event` clears state on session deletion.

## Boundaries

- This hook is not auto-continuation and must not call `session.prompt`.
- It should only inject into Orchestrator sessions selected by `shouldInject`.
- It preserves still-valid todos and merges steering; it should not replace a
  todo list unless the user explicitly cancels or replaces the task.
