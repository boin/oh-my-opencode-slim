## Summary
Refactor the interview feature from XML-wrapped JSON to a plain-text format for LLM communication. This reduces token usage and simplifies the parsing logic.

## Changes

### New Plain-Text Format
```
Q1: What platform are you targeting?
- Web *
- Mobile
- Desktop

Q2: What is the timeline?
- 1 week
- 1 month *
- 3 months
```

### Key Changes
- **parser.ts**: New `parsePlainTextQuestions()` function with regex patterns
- **prompts.ts**: All prompts updated to use plain-text format instructions
- **types.ts**: Removed `summary` and `title` fields from `InterviewAssistantState`
- **document.ts**: Simplified markdown format (just Q&A list, no spec sections)
- **service.ts**: Removed title-based file renaming, added `formatInstructions` import
- **interview.test.ts**: Updated all tests for new format

### Benefits
- Lower token usage (no JSON quotes, braces, indentation)
- Faster LLM generation
- Simpler parsing logic with clear error messages
- No backward compatibility needed (breaking change)

## Testing
All 50 tests pass:
```
bun test src/interview/interview.test.ts
```

## Migration
This is a breaking change. Existing interviews using the old `<interview_state>` JSON format will need to be restarted with the new format.
