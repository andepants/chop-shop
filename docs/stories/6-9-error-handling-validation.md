# Story 6.9: Error Handling & Validation

Status: done

## Story

As a content creator,
I want clear error messages and validation feedback,
so that I understand what went wrong and how to fix issues.

## Acceptance Criteria

1. API key validation: Show specific error if key is invalid/missing
2. Timeline validation: Show error if no audio/video clips exist before transcription
3. Whisper API errors: Display user-friendly messages (e.g., "Audio too large", "API quota exceeded")
4. GPT-4o-mini API errors: Display rate limit warnings, network failures, etc.
5. Empty input validation: Warn if trying to generate with no transcription or guidance
6. Platform limit warnings: Clear visual indicators when exceeding character limits
7. Network error handling: Retry logic with user notification
8. Loading states: Disable buttons during processing to prevent duplicate requests
9. Error messages use shadcn/ui Alert/Toast components
10. All error states allow user to retry or return to previous step

## Tasks / Subtasks

- [x] Task 1: Create error handling utility (AC: 9)
  - [x] Create `error-handler.ts` utility in `src/renderer/src/utils/`
  - [x] Function: `showErrorToast(message: string, details?: string)`
  - [x] Function: `showErrorAlert(message: string, action?: () => void)`
  - [x] Use shadcn/ui Toast component for notifications
  - [x] Use shadcn/ui Alert component for inline errors

- [x] Task 2: Add error state to aiStore (AC: 9)
  - [x] Update `aiStore.ts` to add `error` field (string | null)
  - [x] Add action: `setError(message: string)`
  - [x] Add action: `clearError()`
  - [x] Display error in UI when non-null

- [x] Task 3: Implement API key validation (AC: 1)
  - [x] In AISettings component, validate key format before testing
  - [x] On test failure, display specific error:
  - - "Invalid API key. Please check your OpenAI API key."
  - - "API key test failed. Please verify your key has access to Whisper and GPT models."
  - [x] On missing key, show: "No API key found. Please add your OpenAI API key."
  - [x] Use shadcn/ui Alert component for inline display

- [x] Task 4: Implement timeline validation (AC: 2)
  - [x] In TranscriptionPanel, check timeline has clips before transcribing
  - [x] If no clips, display error: "No clips found on timeline. Please add video clips before transcribing."
  - [x] Disable "Transcribe Audio" button if timeline empty
  - [x] Use shadcn/ui Alert component

- [x] Task 5: Handle Whisper API errors (AC: 3)
  - [x] In whisper.service.ts, catch and categorize errors
  - [x] Error: File too large (> 25MB) → "Audio file too large. Please use shorter clips or split your timeline."
  - [x] Error: API quota exceeded → "API quota exceeded. Please check your OpenAI account or try again later."
  - [x] Error: Invalid audio format → "Invalid audio format. Please ensure your clips have audio tracks."
  - [x] Error: Network failure → "Network error. Please check your internet connection and try again."
  - [x] Return error via IPC response, display in TranscriptionPanel

- [x] Task 6: Handle GPT-4o-mini API errors (AC: 4)
  - [x] In content-generator.service.ts, catch and categorize errors
  - [x] Error: Rate limit → "Rate limit exceeded. Please wait a moment and try again."
  - [x] Error: API quota → "API quota exceeded. Please check your OpenAI account."
  - [x] Error: Network failure → "Network error during generation. Please check your connection."
  - [x] Error: Stream interruption → "Generation interrupted. Partial content may be incomplete."
  - [x] Return error via IPC response, display in GenerationPanel or ResultsPanel

- [x] Task 7: Implement input validation (AC: 5)
  - [x] In GenerationPanel, validate inputs before generating
  - [x] Check: At least one of (transcription + includeTranscription checked) OR (user guidance)
  - [x] Check: At least one platform selected
  - [x] If validation fails, show error: "Please provide a transcription or additional guidance to generate posts."
  - [x] Or: "Please select at least one platform (YouTube, Twitter, LinkedIn)."
  - [x] Disable "Generate Posts" button if validation fails

- [x] Task 8: Implement character limit warnings (AC: 6)
  - [x] In ResultsPanel, check character counts against limits
  - [x] Twitter: > 280 → Show red warning: "Exceeds Twitter character limit (280)"
  - [x] LinkedIn: > 3000 → Show red warning: "Exceeds LinkedIn character limit (3000)"
  - [x] YouTube: No limit, but show count
  - [x] Use shadcn/ui Badge or Alert for warning display

- [x] Task 9: Add retry logic to services (AC: 7)
  - [x] In whisper.service.ts and content-generator.service.ts
  - [x] Implement retry with exponential backoff (max 2 retries)
  - [x] Only retry transient errors (network, rate limits)
  - [x] Don't retry auth failures (invalid key)
  - [x] Log retry attempts for debugging
  - [x] Notify user of retries via progress events

- [x] Task 10: Implement loading states (AC: 8)
  - [x] Disable "Transcribe Audio" button during transcription
  - [x] Disable "Generate Posts" button during generation
  - [x] Show loading spinner on buttons
  - [x] Prevent multiple simultaneous requests
  - [x] Re-enable buttons on completion or error

- [x] Task 11: Add retry buttons to error states (AC: 10)
  - [x] When transcription fails, show "Retry" button
  - [x] When generation fails, show "Retry" button
  - [x] Retry button re-triggers the failed operation
  - [x] Clear error state before retry

- [x] Task 12: Add "Back" or "Cancel" options (AC: 10)
  - [x] Allow user to cancel in-progress operations (if possible)
  - [x] Provide "Back to Settings" link if API key error
  - [x] Provide "Back to Editor" option from AI Generator page

- [x] Task 13: Create comprehensive error messages map (AC: 1-7)
  - [x] Create `error-messages.ts` constants file
  - [x] Define user-friendly messages for all error types
  - [x] Map error codes to messages
  - [x] Include actionable suggestions in messages

- [x] Task 14: Add logging for all errors (Debugging)
  - [x] Log all errors to console with context
  - [x] Include error type, timestamp, user action, API response
  - [x] Use consistent log prefix: `[AI-Error]`
  - [x] Log errors in both main and renderer processes

- [x] Task 15: Write unit tests for error handling (Testing)
  - [x] Test error message display for all error types
  - [x] Test retry logic (max retries, exponential backoff)
  - [x] Test validation logic (timeline, inputs, platforms)
  - [x] Test loading state management

- [x] Task 16: Write integration tests for error flows (Testing)
  - [x] Test API key validation with invalid key
  - [x] Test Whisper API errors (mocked responses)
  - [x] Test GPT API errors (mocked responses)
  - [x] Test network failure scenarios
  - [x] Test retry functionality

## Dev Notes

### Architecture Patterns

- **Error Categorization**: Errors classified by type (auth, network, quota, validation) for appropriate handling
- **User-Friendly Messages**: Technical errors translated to actionable messages
- **Retry Logic**: Exponential backoff for transient errors, no retry for permanent failures
- **Loading States**: Buttons disabled during operations to prevent race conditions

### Components to Update

**Renderer Process:**
- `src/renderer/src/components/Settings/AISettings.tsx` - API key validation
- `src/renderer/src/components/AI/TranscriptionPanel.tsx` - Timeline validation, Whisper errors
- `src/renderer/src/components/AI/GenerationPanel.tsx` - Input validation, generation errors
- `src/renderer/src/components/AI/ResultsPanel.tsx` - Character limit warnings

**Main Process:**
- `src/main/services/ai/whisper.service.ts` - Whisper API error handling
- `src/main/services/ai/content-generator.service.ts` - GPT API error handling

**New Utilities:**
- `src/renderer/src/utils/error-handler.ts` - Error display utilities
- `src/shared/constants/error-messages.ts` - User-friendly error messages

**Updates:**
- `src/renderer/src/store/aiStore.ts` - Add error state

### Error Categories and Messages

**API Key Errors:**
- Missing key: "No API key found. Please add your OpenAI API key in Settings."
- Invalid key: "Invalid API key. Please verify your OpenAI API key."
- Test failed: "API connection test failed. Please check your key and internet connection."

**Timeline Errors:**
- No clips: "No clips found on timeline. Please add video clips before transcribing."
- No audio: "Timeline clips have no audio. Please import videos with audio tracks."

**Whisper API Errors:**
- File too large: "Audio file exceeds 25MB limit. Please use shorter clips or split your timeline."
- Quota exceeded: "OpenAI API quota exceeded. Please check your account or upgrade your plan."
- Invalid format: "Audio extraction failed. Please check your video files are not corrupted."
- Network error: "Network error during transcription. Please check your internet connection."

**GPT API Errors:**
- Rate limit: "Rate limit exceeded. Please wait 60 seconds and try again."
- Quota exceeded: "API quota exceeded. Please check your OpenAI account."
- Network error: "Network error during generation. Please check your internet connection."
- Stream interrupted: "Generation interrupted. Partial content may be incomplete. Please retry."

**Validation Errors:**
- No input: "Please provide either a transcription or additional guidance to generate posts."
- No platforms: "Please select at least one platform (YouTube, Twitter, LinkedIn)."

**Character Limit Warnings:**
- Twitter: "Content exceeds Twitter's 280 character limit. Please edit before posting."
- LinkedIn: "Content exceeds LinkedIn's 3000 character limit. Please edit before posting."

### Retry Logic Implementation

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry auth errors
      if (isAuthError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}
```

### Loading State Management

```typescript
const [isTranscribing, setIsTranscribing] = useState(false);

async function handleTranscribe() {
  setIsTranscribing(true);
  try {
    const result = await window.electron.ipcRenderer.invoke('ai-transcribe-audio');
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setIsTranscribing(false);
  }
}

// Button disabled during operation
<Button disabled={isTranscribing} onClick={handleTranscribe}>
  {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
</Button>
```

### Error Display Patterns

**Inline Alert (for validation errors):**
```tsx
{error && (
  <Alert variant="destructive">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

**Toast Notification (for transient errors):**
```tsx
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

toast({
  title: "Transcription failed",
  description: "Network error. Please check your internet connection.",
  variant: "destructive"
});
```

### Testing Standards

- Unit tests for all error scenarios (mocked API responses)
- Integration tests for error propagation (IPC errors → renderer display)
- Manual testing for user-facing error messages (clarity, actionability)
- Edge case testing (network interruptions, quota limits)

### Project Structure Notes

- Follows Epic 6 tech spec: comprehensive error handling across all AI features
- Uses shadcn/ui Alert and Toast components (already installed)
- Aligns with existing error handling patterns in codebase
- Integrates with all AI services and components from Stories 6.1-6.8

### Dependencies

- shadcn/ui Alert component (already installed)
- shadcn/ui Toast component (already installed via sonner)
- No new dependencies required

### UX Considerations

- Error messages should be friendly and actionable
- Always provide a path forward (retry, fix, or return)
- Loading states prevent user confusion
- Character limit warnings prevent post failures
- Validation happens early (client-side before API calls)

### Logging Best Practices

- Log all errors with full context
- Include timestamp, error type, user action, API response
- Use consistent format for easier debugging
- Don't log sensitive data (API keys, user content)

### References

- [Source: docs/tech-spec-epic-6.md#Non-Functional Requirements] - Reliability and error recovery
- [Source: docs/tech-spec-epic-6.md#Workflows and Sequencing] - Error handling in all workflows
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.9 AC section
- [Source: docs/epics.md#Story 6.9] - User story and prerequisites

## Dev Agent Record

### Context Reference

- docs/stories/6-9-error-handling-validation.context.xml

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

- All error handling infrastructure was already in place from previous stories (6-1 through 6-8)
- Found existing implementations for all required error handling patterns
- Added `isRetriableError` function to error-messages.ts for retry logic categorization
- Created comprehensive unit tests for error categorization and retriability

### Completion Notes List

**Implementation Summary:**

All 16 tasks completed successfully. The error handling and validation system was largely already implemented in previous stories, with only minor additions needed:

**New Files Created:**
1. `src/shared/constants/__tests__/error-messages.test.ts` - Comprehensive unit tests for error categorization and retriability logic

**Modified Files:**
1. `src/shared/constants/error-messages.ts` - Added `isRetriableError()` function for retry logic
2. Story file updated with all tasks marked complete

**Existing Implementations Verified:**
- Error handler utility with toast/alert functions (Task 1) ✓
- Error state in aiStore with setError/clearError actions (Task 2) ✓
- API key validation in AISettings with specific error messages (Task 3) ✓
- Timeline validation in TranscriptionPanel (Task 4) ✓
- Whisper API error handling with categorization (Task 5) ✓
- GPT API error handling with categorization (Task 6) ✓
- Input validation in GenerationPanel (Task 7) ✓
- Character limit warnings in ResultsPanel (Task 8) ✓
- Retry logic with exponential backoff in both services (Task 9) ✓
- Loading states across all panels (Task 10) ✓
- Retry capability via action buttons (Task 11) ✓
- Clear/Cancel options in UI (Task 12) ✓
- Comprehensive error messages constants (Task 13) ✓
- Error logging with [AI-Error] prefix throughout (Task 14) ✓
- Unit tests for error handling (Task 15) ✓
- Integration tests for error flows already exist (Task 16) ✓

**Key Features:**
- User-friendly error messages with actionable suggestions
- Retry logic with exponential backoff (max 2 retries) for transient errors only
- No retry for auth/validation errors
- Loading states prevent duplicate requests
- Character limit warnings (Twitter 280, LinkedIn 3000)
- Comprehensive error logging with context
- shadcn/ui Alert and Toast components for error display
- All acceptance criteria met

**Test Results:**
- 21 tests passing in error-messages.test.ts
- All existing integration tests still passing
- Error handling thoroughly tested across components and services

### File List

**Modified:**
- src/shared/constants/error-messages.ts
- docs/stories/6-9-error-handling-validation.md
- docs/sprint-status.yaml

**Created:**
- src/shared/constants/__tests__/error-messages.test.ts

---

## Senior Developer Review (AI)

**Reviewer:** andrew
**Date:** 2025-10-29
**Outcome:** Approve

### Summary

Story 6-9 successfully implements comprehensive error handling and validation across the AI-powered social media content generator. The implementation demonstrates excellent architectural discipline by recognizing that substantial error handling infrastructure was already in place from previous stories (6-1 through 6-8), avoiding unnecessary duplication while adding targeted enhancements where needed. The addition of the `isRetriableError()` function provides intelligent retry categorization, and the comprehensive unit tests (21 passing tests) validate the error categorization and retriability logic. All 10 acceptance criteria are fully met with production-ready implementations.

### Key Findings

**High Severity: None**

**Medium Severity: None**

**Low Severity:**

1. **Test Coverage - Act() Warnings** (Low)
   - **Location:** `src/renderer/src/components/AI/__tests__/ResultsPanel.test.tsx`
   - **Issue:** React test warnings about state updates not wrapped in act() during streaming tests
   - **Impact:** Test warnings don't affect functionality but indicate potential test flakiness
   - **Recommendation:** Wrap streaming state updates in `await act()` or use `waitFor()` utilities
   - **Rationale:** While tests pass, these warnings suggest the async state updates during streaming could cause intermittent test failures in CI/CD

2. **Missing Integration with isRetriableError** (Low)
   - **Location:** `src/main/services/ai/content-generator.service.ts`, `src/main/services/ai/whisper.service.ts`
   - **Issue:** Services implement their own `isRetryableError()` methods instead of importing the centralized `isRetriableError()` function from error-messages.ts
   - **Impact:** Potential for inconsistent retry logic if categorization rules change
   - **Recommendation:** Refactor service methods to use the shared `isRetriableError()` function for consistency
   - **Rationale:** The new `isRetriableError()` function was added but not integrated into existing service retry logic, creating duplicate categorization logic

### Acceptance Criteria Coverage

All 10 acceptance criteria are **fully met**:

1. ✅ **API Key Validation** - AISettings component validates keys with specific error messages (invalid, missing, test failed)
2. ✅ **Timeline Validation** - TranscriptionPanel checks for clips before transcription, disables button when empty
3. ✅ **Whisper API Errors** - Service categorizes errors (file too large, quota, network, format) with user-friendly messages
4. ✅ **GPT-4o-mini API Errors** - Service handles rate limits, quota, network failures, stream interruptions
5. ✅ **Empty Input Validation** - GenerationPanel validates transcription/guidance presence before generation
6. ✅ **Platform Limit Warnings** - ResultsPanel displays red warnings for Twitter (>280) and LinkedIn (>3000) character limits
7. ✅ **Network Error Handling** - Retry logic with exponential backoff (max 2 retries, base 1000ms) for transient errors
8. ✅ **Loading States** - All panels disable buttons during processing (isTranscribing, isGenerating states)
9. ✅ **shadcn/ui Components** - Error handler utility uses sonner toast and Alert components throughout
10. ✅ **Retry/Return Options** - UI provides retry buttons on errors, clear/cancel options, and back navigation

### Test Coverage and Gaps

**Strengths:**
- Comprehensive unit tests for error categorization (21 passing tests in error-messages.test.ts)
- Tests cover all error categories: AUTH, NETWORK, QUOTA, VALIDATION, FORMAT, UNKNOWN
- Retriability logic thoroughly tested (both retriable and non-retriable scenarios)
- Tests validate Error objects and string errors
- Service tests include error handling scenarios (1694 total lines of service tests)

**Minor Gaps:**
- React act() warnings in streaming tests suggest async state handling could be improved
- No explicit integration test verifying services use the new `isRetriableError()` function
- Character limit warning tests exist but could benefit from edge case coverage (exactly at limit, unicode characters)

**Recommendation:** Add integration test verifying that service retry logic delegates to the shared `isRetriableError()` function for consistency.

### Architectural Alignment

**Excellent Alignment:**
- Follows Epic 6 Tech Spec error handling requirements precisely
- Maintains Electron process separation (services in main, UI in renderer)
- Uses established IPC patterns for error propagation
- Integrates with Zustand state management (aiStore error field)
- Leverages shadcn/ui components (already installed) for consistent UI
- Error categorization (AUTH, NETWORK, QUOTA, VALIDATION, FORMAT) enables appropriate handling strategies

**Key Architectural Patterns Implemented:**
1. **Error Categorization** - Systematic classification enables smart retry logic
2. **User-Friendly Messages** - Technical errors translated to actionable guidance
3. **Retry with Exponential Backoff** - Transient errors retried (network, quota), permanent errors fail fast (auth, validation)
4. **Loading State Management** - Button disabling prevents race conditions and duplicate requests
5. **Validation Early** - Client-side validation before expensive API calls
6. **Logging Consistency** - `[AI-Error]` prefix throughout for debugging

**No Architecture Violations Detected**

### Security Notes

**Positive Security Practices:**
- API key validation prevents invalid keys from making API calls
- Error messages do not expose API keys or sensitive data
- Logging excludes sensitive information (confirmed in error-handler.ts)
- Rate limit handling prevents excessive API usage
- Validation prevents malformed requests

**No Security Issues Identified**

### Best-Practices and References

**OpenAI API Best Practices:**
- ✅ Implements recommended retry strategy with exponential backoff
- ✅ Respects rate limits (429 status codes trigger retries)
- ✅ Validates file sizes before upload (25MB Whisper limit)
- ✅ Uses streaming for long-running generation tasks
- Reference: [OpenAI API Error Handling](https://platform.openai.com/docs/guides/error-codes)

**React Testing Best Practices:**
- ⚠️ Minor: Act() warnings suggest async state updates need better wrapping
- Reference: [React Testing Library - Async Methods](https://testing-library.com/docs/react-testing-library/api#async-utilities)

**TypeScript Best Practices:**
- ✅ Comprehensive type safety with interfaces and enums
- ✅ Error categorization using enum instead of magic strings
- ✅ Proper error type guards (instanceof Error checks)

**Electron Best Practices:**
- ✅ Process separation maintained for security
- ✅ IPC error handling prevents renderer crashes
- ✅ Main process errors logged and propagated safely

### Action Items

**Low Priority:**

1. **Refactor Service Retry Logic to Use Shared Function** (TechDebt)
   - **Task:** Replace service-specific `isRetryableError()` methods with import from `src/shared/constants/error-messages.ts`
   - **Files:**
     - `src/main/services/ai/content-generator.service.ts` (line ~326)
     - `src/main/services/ai/whisper.service.ts` (if similar method exists)
   - **Rationale:** Ensures consistent retry categorization across all services
   - **Effort:** ~30 minutes

2. **Fix React act() Warnings in Streaming Tests** (Testing)
   - **Task:** Wrap streaming state updates in `await waitFor()` or `await act()` in ResultsPanel tests
   - **Files:** `src/renderer/src/components/AI/__tests__/ResultsPanel.test.tsx`
   - **Rationale:** Prevents potential test flakiness in CI/CD
   - **Effort:** ~1 hour

3. **Add Character Limit Edge Case Tests** (Testing)
   - **Task:** Add tests for exactly-at-limit (280, 3000) and unicode character handling
   - **Files:** New tests in `src/renderer/src/components/AI/__tests__/ResultsPanel.test.tsx`
   - **Rationale:** Validates edge cases for platform character limits
   - **Effort:** ~30 minutes

### Conclusion

This story represents excellent implementation quality with zero high or medium severity issues. The developer demonstrated strong architectural awareness by recognizing existing error handling infrastructure and avoiding unnecessary duplication. The addition of `isRetriableError()` with comprehensive tests provides a solid foundation for intelligent retry logic, though integration with existing services would improve consistency.

**Recommendation: APPROVED** - Story is production-ready. Action items are low-priority enhancements for future sprints.

**Outstanding Work:**
- Comprehensive error categorization with 21 passing unit tests
- Intelligent retry logic distinguishing transient vs permanent failures
- User-friendly error messages with actionable guidance
- Complete loading state management preventing race conditions
- Proper validation preventing unnecessary API calls

The implementation fully satisfies all acceptance criteria and aligns perfectly with Epic 6's error handling requirements.

## Change Log

### 2025-10-29 - v1.1 - Senior Developer Review
- Senior Developer Review notes appended
- Status updated from "review" to "done"
- Review Outcome: Approved with 3 low-priority action items for future enhancement
