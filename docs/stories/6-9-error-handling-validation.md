# Story 6.9: Error Handling & Validation

Status: ready-for-dev

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

- [ ] Task 1: Create error handling utility (AC: 9)
  - [ ] Create `error-handler.ts` utility in `src/renderer/src/utils/`
  - [ ] Function: `showErrorToast(message: string, details?: string)`
  - [ ] Function: `showErrorAlert(message: string, action?: () => void)`
  - [ ] Use shadcn/ui Toast component for notifications
  - [ ] Use shadcn/ui Alert component for inline errors

- [ ] Task 2: Add error state to aiStore (AC: 9)
  - [ ] Update `aiStore.ts` to add `error` field (string | null)
  - [ ] Add action: `setError(message: string)`
  - [ ] Add action: `clearError()`
  - [ ] Display error in UI when non-null

- [ ] Task 3: Implement API key validation (AC: 1)
  - [ ] In AISettings component, validate key format before testing
  - [ ] On test failure, display specific error:
  - - "Invalid API key. Please check your OpenAI API key."
  - - "API key test failed. Please verify your key has access to Whisper and GPT models."
  - [ ] On missing key, show: "No API key found. Please add your OpenAI API key."
  - [ ] Use shadcn/ui Alert component for inline display

- [ ] Task 4: Implement timeline validation (AC: 2)
  - [ ] In TranscriptionPanel, check timeline has clips before transcribing
  - [ ] If no clips, display error: "No clips found on timeline. Please add video clips before transcribing."
  - [ ] Disable "Transcribe Audio" button if timeline empty
  - [ ] Use shadcn/ui Alert component

- [ ] Task 5: Handle Whisper API errors (AC: 3)
  - [ ] In whisper.service.ts, catch and categorize errors
  - [ ] Error: File too large (> 25MB) → "Audio file too large. Please use shorter clips or split your timeline."
  - [ ] Error: API quota exceeded → "API quota exceeded. Please check your OpenAI account or try again later."
  - [ ] Error: Invalid audio format → "Invalid audio format. Please ensure your clips have audio tracks."
  - [ ] Error: Network failure → "Network error. Please check your internet connection and try again."
  - [ ] Return error via IPC response, display in TranscriptionPanel

- [ ] Task 6: Handle GPT-4o-mini API errors (AC: 4)
  - [ ] In content-generator.service.ts, catch and categorize errors
  - [ ] Error: Rate limit → "Rate limit exceeded. Please wait a moment and try again."
  - [ ] Error: API quota → "API quota exceeded. Please check your OpenAI account."
  - [ ] Error: Network failure → "Network error during generation. Please check your connection."
  - [ ] Error: Stream interruption → "Generation interrupted. Partial content may be incomplete."
  - [ ] Return error via IPC response, display in GenerationPanel or ResultsPanel

- [ ] Task 7: Implement input validation (AC: 5)
  - [ ] In GenerationPanel, validate inputs before generating
  - [ ] Check: At least one of (transcription + includeTranscription checked) OR (user guidance)
  - [ ] Check: At least one platform selected
  - [ ] If validation fails, show error: "Please provide a transcription or additional guidance to generate posts."
  - [ ] Or: "Please select at least one platform (YouTube, Twitter, LinkedIn)."
  - [ ] Disable "Generate Posts" button if validation fails

- [ ] Task 8: Implement character limit warnings (AC: 6)
  - [ ] In ResultsPanel, check character counts against limits
  - [ ] Twitter: > 280 → Show red warning: "Exceeds Twitter character limit (280)"
  - [ ] LinkedIn: > 3000 → Show red warning: "Exceeds LinkedIn character limit (3000)"
  - [ ] YouTube: No limit, but show count
  - [ ] Use shadcn/ui Badge or Alert for warning display

- [ ] Task 9: Add retry logic to services (AC: 7)
  - [ ] In whisper.service.ts and content-generator.service.ts
  - [ ] Implement retry with exponential backoff (max 2 retries)
  - [ ] Only retry transient errors (network, rate limits)
  - [ ] Don't retry auth failures (invalid key)
  - [ ] Log retry attempts for debugging
  - [ ] Notify user of retries via progress events

- [ ] Task 10: Implement loading states (AC: 8)
  - [ ] Disable "Transcribe Audio" button during transcription
  - [ ] Disable "Generate Posts" button during generation
  - [ ] Show loading spinner on buttons
  - [ ] Prevent multiple simultaneous requests
  - [ ] Re-enable buttons on completion or error

- [ ] Task 11: Add retry buttons to error states (AC: 10)
  - [ ] When transcription fails, show "Retry" button
  - [ ] When generation fails, show "Retry" button
  - [ ] Retry button re-triggers the failed operation
  - [ ] Clear error state before retry

- [ ] Task 12: Add "Back" or "Cancel" options (AC: 10)
  - [ ] Allow user to cancel in-progress operations (if possible)
  - [ ] Provide "Back to Settings" link if API key error
  - [ ] Provide "Back to Editor" option from AI Generator page

- [ ] Task 13: Create comprehensive error messages map (AC: 1-7)
  - [ ] Create `error-messages.ts` constants file
  - [ ] Define user-friendly messages for all error types
  - [ ] Map error codes to messages
  - [ ] Include actionable suggestions in messages

- [ ] Task 14: Add logging for all errors (Debugging)
  - [ ] Log all errors to console with context
  - [ ] Include error type, timestamp, user action, API response
  - [ ] Use consistent log prefix: `[AI-Error]`
  - [ ] Log errors in both main and renderer processes

- [ ] Task 15: Write unit tests for error handling (Testing)
  - [ ] Test error message display for all error types
  - [ ] Test retry logic (max retries, exponential backoff)
  - [ ] Test validation logic (timeline, inputs, platforms)
  - [ ] Test loading state management

- [ ] Task 16: Write integration tests for error flows (Testing)
  - [ ] Test API key validation with invalid key
  - [ ] Test Whisper API errors (mocked responses)
  - [ ] Test GPT API errors (mocked responses)
  - [ ] Test network failure scenarios
  - [ ] Test retry functionality

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

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
