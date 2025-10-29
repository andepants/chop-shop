# Story 6.4: Transcription Tab UI & Editing

Status: drafted

## Story

As a content creator,
I want to view, edit, and control the transcription before generating posts,
so that I can ensure accuracy and add missing context.

## Acceptance Criteria

1. Transcribe tab displays "Transcribe Audio" button
2. Button checks for timeline clips; shows error if none exist
3. Clicking button triggers audio extraction and transcription
4. Progress indicator visible during transcription process
5. Transcription auto-populates into editable textarea (shadcn/ui Textarea)
6. Checkbox: "Include transcription in post generation prompt"
7. Second textarea: "Additional Guidance" (optional user input)
8. Both fields editable and optional (can be left empty)
9. Validation: At least one field must have content to enable Generate button
10. Transcription persists in session (cached until cleared)

## Tasks / Subtasks

- [ ] Task 1: Create Transcription Panel component (AC: 1, 5, 6, 7, 8)
  - [ ] Create `TranscriptionPanel.tsx` in `src/renderer/src/components/AI/`
  - [ ] Add "Transcribe Audio" button (shadcn/ui Button)
  - [ ] Add editable textarea for transcription display (shadcn/ui Textarea)
  - [ ] Add checkbox: "Include transcription in post generation prompt" (shadcn/ui Checkbox)
  - [ ] Add second textarea: "Additional Guidance" with label
  - [ ] Apply consistent styling matching dark theme

- [ ] Task 2: Implement timeline validation (AC: 2)
  - [ ] On button click, check if timeline has clips (from timelineStore)
  - [ ] If no clips, display error alert (shadcn/ui Alert component)
  - [ ] Error message: "No clips found on timeline. Please add video clips before transcribing."
  - [ ] Disable button if timeline empty (optional visual feedback)

- [ ] Task 3: Trigger transcription via IPC (AC: 3)
  - [ ] On valid button click, call `ai-transcribe-audio` IPC channel
  - [ ] Handle IPC response (success/error)
  - [ ] On success, populate transcription textarea with returned text
  - [ ] On error, display error alert with message

- [ ] Task 4: Implement progress indicator (AC: 4)
  - [ ] Add progress display component (shadcn/ui Progress bar or spinner)
  - [ ] Listen for `ai-transcription-progress` IPC events
  - [ ] Update progress bar percentage and message
  - [ ] Show progress states: "Extracting audio...", "Transcribing..."
  - [ ] Hide progress indicator when transcription completes or errors

- [ ] Task 5: Add transcription state management (AC: 5, 10)
  - [ ] Update `aiStore.ts` to add `transcription` field (string)
  - [ ] Add `userGuidance` field (string)
  - [ ] Add `includeTranscription` field (boolean, default true)
  - [ ] Add actions: `setTranscription()`, `setUserGuidance()`, `setIncludeTranscription()`
  - [ ] Bind textarea values to Zustand state (controlled inputs)
  - [ ] Transcription persists across tab switches within session

- [ ] Task 6: Implement editable transcription (AC: 5, 8)
  - [ ] Transcription textarea allows user editing (not read-only)
  - [ ] Auto-resize textarea to fit content (or set reasonable min/max height)
  - [ ] Show character count below textarea (optional UX enhancement)
  - [ ] Save edits to aiStore on change

- [ ] Task 7: Implement checkbox behavior (AC: 6)
  - [ ] Checkbox controls whether transcription included in generation prompt
  - [ ] Default checked (include transcription)
  - [ ] Bind checkbox to `aiStore.includeTranscription` state
  - [ ] If unchecked and user guidance empty, show validation message

- [ ] Task 8: Implement validation logic (AC: 9)
  - [ ] Add validation: at least one of (transcription + checked) OR (user guidance) must be non-empty
  - [ ] Export validation function from TranscriptionPanel
  - [ ] Generate button in GenerationPanel (Story 6.6) calls this validation
  - [ ] Display inline validation message if both fields empty

- [ ] Task 9: Add loading states (UX enhancement)
  - [ ] Disable "Transcribe Audio" button during transcription
  - [ ] Show spinner on button during processing
  - [ ] Disable textareas during transcription (prevent editing mid-process)
  - [ ] Re-enable after completion or error

- [ ] Task 10: Add clear/reset functionality (Optional enhancement)
  - [ ] Add "Clear Transcription" button to reset fields
  - [ ] Button clears both transcription and user guidance
  - [ ] Confirmation dialog before clearing (shadcn/ui AlertDialog)

- [ ] Task 11: Write component tests for Transcription Panel (Testing)
  - [ ] Test "Transcribe Audio" button renders
  - [ ] Test timeline validation (no clips → error message)
  - [ ] Test IPC call triggered on valid button click
  - [ ] Test transcription populates textarea on success
  - [ ] Test checkbox toggles includeTranscription state
  - [ ] Test user guidance textarea updates state

- [ ] Task 12: Write integration tests for transcription flow (Testing)
  - [ ] Test complete flow: button → IPC → progress → result → display
  - [ ] Test error handling for IPC failures
  - [ ] Test validation logic (empty fields)
  - [ ] Test state persistence across component re-renders

## Dev Notes

### Architecture Patterns

- **Component Structure**: TranscriptionPanel is a controlled component with state managed by `aiStore.ts` (Zustand)
- **IPC Communication**: Calls `ai-transcribe-audio` channel, listens for `ai-transcription-progress` events
- **State Management**: All transcription-related state (text, guidance, checkbox) stored in aiStore for persistence across tabs
- **Validation**: Component exports validation function used by Generate button in Story 6.6

### Components to Create

**Renderer Process:**
- `src/renderer/src/components/AI/TranscriptionPanel.tsx` - Main transcription UI

**Updates:**
- `src/renderer/src/store/aiStore.ts` - Add transcription state fields and actions

### Component Layout

```
TranscriptionPanel
├── "Transcribe Audio" Button
├── Progress Indicator (conditionally shown)
├── Transcription Textarea (editable)
│   └── Character count (optional)
├── Checkbox: "Include transcription in post generation prompt"
├── "Additional Guidance" Label
└── User Guidance Textarea (editable)
```

### State Schema (aiStore)

```typescript
interface AIStore {
  // Transcription state
  transcription: string;
  userGuidance: string;
  includeTranscription: boolean;
  transcriptionStatus: 'idle' | 'extracting' | 'transcribing' | 'complete' | 'error';
  transcriptionProgress: { percent: number; message: string };

  // Actions
  setTranscription: (text: string) => void;
  setUserGuidance: (text: string) => void;
  setIncludeTranscription: (include: boolean) => void;
  setTranscriptionStatus: (status: string) => void;
  setTranscriptionProgress: (progress: { percent: number; message: string }) => void;
}
```

### IPC Events to Handle

**Outgoing (Renderer → Main):**
- `ai-transcribe-audio` - Trigger transcription

**Incoming (Main → Renderer):**
- `ai-transcription-progress` - Progress updates (percent, message)
- IPC response from `ai-transcribe-audio` - Transcription result or error

### Validation Logic

```typescript
export function validateTranscriptionInput(
  transcription: string,
  userGuidance: string,
  includeTranscription: boolean
): boolean {
  const hasTranscription = includeTranscription && transcription.trim().length > 0;
  const hasGuidance = userGuidance.trim().length > 0;
  return hasTranscription || hasGuidance;
}
```

### Error Messages

- "No clips found on timeline. Please add video clips before transcribing."
- "Transcription failed. Please check your API key and try again."
- "Please provide either a transcription or additional guidance to generate posts."

### Testing Standards

- Component tests for TranscriptionPanel UI and user interactions
- Integration tests for IPC flow with mocked services
- Validation tests for input requirements
- State persistence tests (tab switching)

### Project Structure Notes

- Follows Epic 6 tech spec: AI components under `src/renderer/src/components/AI/`
- Uses shadcn/ui components: Textarea, Button, Checkbox, Alert, Progress (already installed)
- Aligns with Zustand state management pattern
- Integrates with IPC handlers from Story 6.3

### Dependencies

- shadcn/ui components (already installed in Epic 2, Story 2.6)
- No new dependencies required

### Design Considerations

- Auto-resize textareas for better UX (or set fixed height with scroll)
- Clear visual separation between transcription and user guidance sections
- Progress indicator should be prominent but not intrusive
- Error messages should be actionable (suggest fixes)

### References

- [Source: docs/tech-spec-epic-6.md#Services and Modules] - TranscriptionPanel.tsx specification
- [Source: docs/tech-spec-epic-6.md#Workflows and Sequencing] - Workflow 2: Audio Transcription flow
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.4 AC section
- [Source: docs/epics.md#Story 6.4] - User story and prerequisites

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
