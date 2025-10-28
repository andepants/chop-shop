# Story 4.3: Screen Recording Setup

Status: drafted

## Story

As a content creator,
I want to record my screen,
so that I can capture tutorials and demonstrations.

## Acceptance Criteria

1. "Record" button visible in left sidebar
2. Clicking Record opens recording setup modal
3. User can select recording mode: "Screen Only"
4. User can choose full screen or specific window/application
5. Preview shows what will be recorded before starting
6. Audio source selection (microphone, system audio, both, or none)
7. "Start Recording" button initiates countdown (3-2-1) then begins capture

## Tasks / Subtasks

- [ ] Task 1: Create recordingStore for state management (AC: 2, 3, 6)
  - [ ] Create `src/renderer/src/store/recordingStore.ts`
  - [ ] Implement RecordingState interface exactly as specified (tech spec lines 124-138):
    ```typescript
    interface RecordingState {
      isRecording: boolean;
      mode: RecordingMode | null;  // 'screen' | 'webcam' | 'pip'
      selectedScreen: string | null;  // Source ID (string, not object)
      selectedWebcam: string | null;  // Device ID (string, not object)
      recordingDuration: number;
      outputFiles: string[];  // Array of completed recording file paths
    }
    ```
  - [ ] Add state: `selectedAudioSource` ('microphone' | 'system' | 'both' | 'none')
  - [ ] Implement `setRecordingMode(mode)` action
  - [ ] Implement `setScreenSource(sourceId: string)` action (stores ID only)
  - [ ] Implement `setAudioSource(source)` action
  - [ ] Implement `startRecording()` and `stopRecording()` actions
  - [ ] Write unit tests for recording store

- [ ] Task 2: Implement unified get-sources IPC channel (AC: 4, 5)
  - [ ] Create `src/main/ipc/recording.handlers.ts`
  - [ ] Implement unified `get-sources` IPC channel (tech spec lines 206-218):
    - Returns `IPCResponse<{ screens: Source[], webcams: Source[] }>`
    - Uses desktopCapturer.getSources() for screens
    - Uses mediaDevices.enumerateDevices() for webcams
  - [ ] Implement Source interface (tech spec lines 113-119):
    ```typescript
    interface Source {
      id: string;          // Device/source ID
      name: string;        // Display name
      type: 'screen' | 'window' | 'webcam';
      thumbnail?: string;  // Base64 data URI for screens
    }
    ```
  - [ ] Implement `start-recording` IPC handler (tech spec lines 220-235):
    - Accepts RecordingConfig parameter
    - Returns `IPCResponse<{ success: boolean }>`
    - Validates source IDs before starting
  - [ ] Handle permission errors (screen capture not allowed on macOS)
  - [ ] Register handlers in `src/main/ipc/index.ts`

- [ ] Task 3: Create RecordingModal component (AC: 2, 7)
  - [ ] Create `src/renderer/src/components/Recording/RecordingModal.tsx`
  - [ ] Use shadcn/ui Dialog component for modal
  - [ ] Display modal title: "Start Recording"
  - [ ] Render mode selector: tabs for "Screen Only", "Webcam Only", "Picture-in-Picture"
  - [ ] Show "Start Recording" button (disabled until source selected)
  - [ ] Show "Cancel" button to close modal
  - [ ] Add countdown UI (3-2-1) before recording starts
  - [ ] Auto-close modal after countdown completes

- [ ] Task 4: Create SourceSelector component for screen sources (AC: 4, 5)
  - [ ] Create `src/renderer/src/components/Recording/SourceSelector.tsx`
  - [ ] Call unified IPC `get-sources` on component mount
  - [ ] Extract screens from response: `response.data.screens`
  - [ ] Render grid of available sources (full screens + windows)
  - [ ] Display source thumbnail (150x100px), name, and type icon
  - [ ] Store only source ID (string) when user selects: `setScreenSource(source.id)`
  - [ ] Highlight selected source with border
  - [ ] Group sources: "Screens" section, "Windows" section
  - [ ] Add search/filter input for window names (if > 10 windows)
  - [ ] Handle loading state while fetching sources
  - [ ] Handle error state (no sources available, permission denied)

- [ ] Task 5: Implement preview before recording (AC: 5)
  - [ ] Add preview pane in RecordingModal (300x200px)
  - [ ] Use getUserMedia() with selected screen source constraint
  - [ ] Display live preview stream in <video> element
  - [ ] Show "Preview" label above video element
  - [ ] Handle preview load error (show placeholder with error message)
  - [ ] Stop preview stream when modal closes or recording starts
  - [ ] Add toggle to enable/disable preview (default: enabled, disable for performance)

- [ ] Task 6: Create AudioSourceSelector component (AC: 6)
  - [ ] Add audio source selection UI in RecordingModal
  - [ ] Radio buttons: "Microphone", "System Audio", "Both", "None"
  - [ ] For "Microphone": show dropdown of available microphone devices
  - [ ] Call IPC `getAudioDevices()` to populate microphone list
  - [ ] Show audio level indicator (visual waveform) for selected microphone
  - [ ] Disable "System Audio" option on macOS (requires signed app with entitlements)
  - [ ] Add tooltip explaining macOS system audio limitation

- [ ] Task 7: Add Record button to sidebar (AC: 1)
  - [ ] Update `src/renderer/src/components/Layout/Sidebar.tsx`
  - [ ] Add "Record" button with camera icon below "Import" button
  - [ ] On click: open RecordingModal, set mode to null (let user choose)
  - [ ] Apply styling: prominent button, red accent color
  - [ ] Add tooltip: "Record screen, webcam, or both (Cmd/Ctrl + R)"

- [ ] Task 8: Implement countdown before recording starts (AC: 7)
  - [ ] Create countdown component (3-2-1 display)
  - [ ] Use large centered numbers (48px font size)
  - [ ] Animate countdown with fade-in/fade-out effect
  - [ ] Play beep sound on each countdown tick (optional)
  - [ ] After countdown, call `startRecording()` in recordingStore
  - [ ] Show "Recording..." indicator after countdown completes

- [ ] Task 9: Implement screen recording capture (renderer process)
  - [ ] Use getUserMedia() with screen source constraint from desktopCapturer
  - [ ] Create MediaRecorder instance with WebM container
  - [ ] Configure codec: VP9 video, Opus audio (if audio enabled)
  - [ ] Store recorded chunks in memory array
  - [ ] Handle MediaRecorder events: ondataavailable, onstop, onerror
  - [ ] Calculate and update recording duration every second

- [ ] Task 10: Handle edge cases and error scenarios
  - [ ] Screen capture permission denied (macOS): show error modal with instructions
  - [ ] No screen sources found: show error message, disable recording
  - [ ] User closes modal during countdown: cancel countdown, stop recording
  - [ ] MediaRecorder initialization failure: show error, fall back to alternative format
  - [ ] Preview stream fails to load: show placeholder, allow proceeding without preview
  - [ ] Multiple displays with different resolutions: show resolution in source name
  - [ ] Window source no longer exists: show error, re-fetch sources
  - [ ] System audio on macOS: disable option, show tooltip explaining limitation

- [ ] Task 11: Create RecordingService in main process (tech spec lines 262-270)
  - [ ] Create `src/main/services/RecordingService.ts`
  - [ ] Implement service to manage recording lifecycle
  - [ ] Handle MediaRecorder state coordination
  - [ ] Implement timer for recording duration tracking
  - [ ] Emit recording-tick events to renderer (see Task 12)

- [ ] Task 12: Implement recording-tick IPC event (tech spec lines 251-258)
  - [ ] Main process emits `recording-tick` event every second
  - [ ] Event payload: `{ duration: number }` (elapsed seconds)
  - [ ] Renderer updates recordingStore.recordingDuration
  - [ ] Display duration in Stop Recording button UI

- [ ] Task 13: NFR Validation - Security and Performance
  - [ ] Verify screen source enumeration completes within 500ms
  - [ ] Validate IPC response structure matches IPCResponse<T> pattern
  - [ ] Test permission denial handling (graceful error messages)
  - [ ] Verify no sensitive data in source thumbnails
  - [ ] Test memory usage during preview (< 200MB)

- [ ] Task 14: Testing and validation
  - [ ] Test opening recording modal from sidebar button
  - [ ] Test unified get-sources IPC returns both screens and webcams
  - [ ] Test selecting full screen source (stores ID only, not full object)
  - [ ] Test selecting specific window source
  - [ ] Test preview displays correctly for selected source
  - [ ] Test audio source selection (microphone, none)
  - [ ] Test countdown (3-2-1) then recording starts
  - [ ] Test start-recording IPC handler validation
  - [ ] Test recording-tick events update duration correctly
  - [ ] Test canceling during countdown
  - [ ] Test permission denied error handling (revoke screen capture permission)
  - [ ] Test with no webcam/microphone connected
  - [ ] Cross-platform test: macOS only for now (Windows/Linux in future)

## Traceability

**Tech Spec References:**
- RecordingState interface (lines 124-138) - includes outputFiles array
- Source interface (lines 113-119) - unified source structure
- get-sources IPC channel (lines 206-218) - returns screens + webcams
- start-recording IPC channel (lines 220-235) - accepts RecordingConfig
- recording-tick IPC event (lines 251-258) - duration updates
- RecordingService (lines 262-270) - main process service

**IPC Contract Changes (CRITICAL):**
- Replace separate getScreenSources()/getAudioDevices() with unified get-sources
- Source IDs stored as strings, not full objects
- IPCResponse<T> wrapper for all IPC channels
- RecordingConfig passed to start-recording handler

**Architecture References:**
- ADR-002: Main process handles desktopCapturer enumeration
- ADR-005: Renderer process handles MediaRecorder capture
- IPC security: Validate all source IDs before use

## Dev Notes

### Recording Workflow Best Practices

**Competitive Advantage**: Unlike Adobe Premiere Pro (which lacks built-in screen recording), Chop Shop integrates recording directly into the editor. This positions us alongside OBS and Camtasia as a record + edit solution.

**Modal-Based Setup Workflow**:
- Clear step-by-step process: Select Mode → Choose Source → Preview → Start
- Reduces friction compared to separate recording apps
- Follows OBS Studio pattern: configure then record

**Source Selection UX** (OBS Studio pattern):
- Visual thumbnails for screens/windows (easier identification than text list)
- Group by type: "Screens" (full displays) vs "Windows" (applications)
- Search/filter for windows (users may have many apps open)

**Preview Before Recording** (Camtasia pattern):
- Shows exactly what will be captured
- Prevents recording wrong screen/window
- Optional (can disable for performance)

**Countdown Before Capture** (Standard across all screen recorders):
- 3-2-1 countdown gives user time to switch windows, hide sensitive info
- Visual + optional audio feedback
- Standard in OBS, ScreenFlow, Camtasia

### Architecture Patterns and Constraints

**Recording Architecture** (ADR-002, ADR-005):
- **Main Process**: Screen source enumeration (desktopCapturer requires main process)
- **Renderer Process**: MediaRecorder, actual recording (requires DOM context)
- **IPC Bridge**: getScreenSources(), getAudioDevices()

**Native APIs**:
- `desktopCapturer.getSources()`: Enumerate screens and windows (main process only)
- `getUserMedia()`: Capture screen/audio stream (renderer process)
- `MediaRecorder`: Record stream to WebM (renderer process)

**State Management** (ADR-001):
- `recordingStore.ts` manages all recording state
- Modal UI driven by store state
- Recording mode determines which UI elements to show

**File Storage**:
- Temp directory: `os.tmpdir()/chop-shop/recordings/`
- Filename pattern: `screen-recording-YYYY-MM-DD-HHmmss.webm`
- Auto-cleanup on app close (optional: keep recent recordings)

### Edge Cases and Error Handling

1. **Permission Denied (macOS)**: Show modal with instructions to grant screen recording permission in System Preferences → Security & Privacy
2. **No Sources Available**: Disable recording button, show "No screens detected" message
3. **Source Selection Without Preview**: If preview fails, show placeholder and allow user to proceed
4. **Countdown Cancellation**: User closes modal during countdown → cancel recording, reset state
5. **MediaRecorder Codec Unsupported**: Fall back to default codec (browser-chosen)
6. **Multiple Displays**: Show resolution in source name (e.g., "Display 1 (2560x1440)")
7. **Window Source Closed**: If selected window closes before recording starts, show error and re-open source selector
8. **System Audio on macOS**: Disabled (requires signed app with `com.apple.security.device.audio-input` entitlement)
9. **Preview Performance**: If preview causes lag, add "Disable Preview" toggle
10. **Memory Management**: MediaRecorder chunks stored in memory (monitor size, max 2GB recommended)

### macOS Screen Recording Permissions

**Required Permissions**:
- Screen Recording: System Preferences → Security & Privacy → Screen Recording → Enable Chop Shop
- Microphone: System Preferences → Security & Privacy → Microphone → Enable Chop Shop

**Permission Request Flow**:
1. App requests screen capture
2. macOS shows permission dialog (first time only)
3. If denied: show error modal with instructions to grant permission
4. User must manually enable in System Preferences

**Detection**:
- `desktopCapturer.getSources()` returns empty array if permission denied
- Show friendly error message, not technical error

### Project Structure Notes

**New Files Created**:
- `src/renderer/src/store/recordingStore.ts`
- `src/renderer/src/components/Recording/RecordingModal.tsx`
- `src/renderer/src/components/Recording/SourceSelector.tsx`
- `src/renderer/src/components/Recording/AudioSourceSelector.tsx`
- `src/renderer/src/types/recording.types.ts`
- `src/main/ipc/recording.handlers.ts`

**Files Modified**:
- `src/renderer/src/components/Layout/Sidebar.tsx` (add Record button)
- `src/main/ipc/index.ts` (register recording handlers)

**Component Hierarchy**:
```
Sidebar
└── Button (Record) → opens RecordingModal

RecordingModal
├── Tabs (Mode Selector)
│   ├── Screen Only (this story)
│   ├── Webcam Only (Story 4.4)
│   └── Picture-in-Picture (Story 4.5)
├── SourceSelector (screen sources)
├── AudioSourceSelector
├── RecordingPreview (video preview)
└── Button (Start Recording)
    └── Countdown (3-2-1)
```

### Testing Standards Summary

From `testing-strategy.md`:
- Unit tests for recordingStore actions
- Integration test: open modal, select source, start recording (mock MediaRecorder)
- Integration test: permission denied error handling
- Manual test: actual screen recording on macOS (verify permissions flow)
- Edge case test: no sources, preview failure, countdown cancellation

### References

- [Source: docs/epics.md#Story 4.3]
- [Source: docs/PRD.md#FR013 - Screen recording]
- [Source: docs/architecture.md#ADR-005 - Screen Recording with desktopCapturer]
- [Source: docs/architecture.md#Recording Architecture - Renderer captures, Main enumerates]
- [Source: docs/tech-spec-epic-4.md#Screen recording using desktopCapturer]
- [OBS Studio: Source selection with thumbnails and grouping]
- [Camtasia: Preview before recording workflow]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Will be populated during dev-story execution -->

### Debug Log References

<!-- Will be populated during implementation -->

### Completion Notes List

<!-- Dev agent will document completion, deviations, lessons learned -->

### File List

<!-- Dev agent will list all files created/modified -->
