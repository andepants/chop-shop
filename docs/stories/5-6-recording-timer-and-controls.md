# Story 5.6: Recording Timer and Controls

Status: drafted

## Story

As a content creator,
I want to see elapsed time during recording and easily stop the recording,
so that I know how long I've been recording and can end capture when finished.

## Acceptance Criteria

1. `RecordingTimer.tsx` component created as floating overlay during recording
2. Timer displays elapsed time in MM:SS format, updating every second
3. Timer positioned top-right of screen, non-intrusive but always visible
4. "Stop Recording" button integrated into timer component with red styling
5. Timer automatically appears when recording starts (isRecording = true)
6. Timer automatically disappears when recording stops
7. Duration state updated in recordingStore every second via setInterval
8. Clicking "Stop Recording" button triggers stopRecording() action in store
9. Clicking "Stop Recording" invokes 'recording:stop' IPC channel
10. IPC handler calls RecordingService.stopRecording() and returns output files
11. Timer remains responsive and smooth (no blocking) during recording
12. Component styled consistently with dark theme and CapCut design

## Tasks / Subtasks

- [ ] Create RecordingTimer component (AC: 1, 2, 3)
  - [ ] Create `src/renderer/components/Recording/RecordingTimer.tsx`
  - [ ] Import useRecordingStore to access state
  - [ ] Display current duration from store in MM:SS format
  - [ ] Position component fixed top-right with CSS
  - [ ] Add semi-transparent dark background for readability
  - [ ] Style with rounded corners and padding
  - [ ] Ensure z-index high enough to overlay other UI

- [ ] Implement timer logic (AC: 7)
  - [ ] Use useEffect to start interval when component mounts
  - [ ] Update recordingStore.duration every 1000ms
  - [ ] Call updateDuration(duration + 1) on each tick
  - [ ] Clear interval on component unmount
  - [ ] Handle edge case of rapid start/stop
  - [ ] Ensure timer doesn't drift over long recordings

- [ ] Add Stop Recording button (AC: 4, 8)
  - [ ] Add button to RecordingTimer component
  - [ ] Style button with red background (recording stop color)
  - [ ] Add stop icon (square or circle-stop icon)
  - [ ] Wire button click to handleStopRecording()
  - [ ] Disable button during stop processing (prevent double-click)
  - [ ] Add hover state styling

- [ ] Implement show/hide logic (AC: 5, 6)
  - [ ] Read isRecording from recordingStore
  - [ ] Return null if !isRecording (hide component)
  - [ ] Render timer if isRecording (show component)
  - [ ] Smooth fade-in animation on appear
  - [ ] Smooth fade-out animation on hide
  - [ ] Reset duration to 0 when hidden

- [ ] Implement stop recording action (AC: 9, 10)
  - [ ] Create handleStopRecording function in component
  - [ ] Call recordingStore.stopRecording()
  - [ ] Invoke IPC: window.electron.ipcRenderer.invoke('recording:stop')
  - [ ] Handle IPC response with output files
  - [ ] Display success notification with recording info
  - [ ] Handle errors from IPC (display error message)
  - [ ] Log stop action

- [ ] Create IPC stop handler (AC: 10)
  - [ ] Add 'recording:stop' handler to src/main/ipc/recording.handlers.ts
  - [ ] Call recordingService.stopRecording()
  - [ ] Return IPCResponse with RecordingOutput (file paths, metadata)
  - [ ] Handle errors from service layer
  - [ ] Log IPC handler execution
  - [ ] Register handler in src/main/ipc/index.ts

- [ ] Update recordingStore (AC: 7, 8)
  - [ ] Ensure updateDuration(duration) action exists in store
  - [ ] Ensure stopRecording() action sets isRecording = false
  - [ ] Store output files from IPC response
  - [ ] Reset duration to 0 after stop
  - [ ] Clear currentMode after stop

- [ ] Implement time formatting utility (AC: 2)
  - [ ] Create formatRecordingTime(seconds) utility function
  - [ ] Convert seconds to MM:SS format
  - [ ] Handle hours if recording exceeds 60 minutes (HH:MM:SS)
  - [ ] Pad minutes and seconds with leading zeros
  - [ ] Add to src/renderer/utils/timeFormat.util.ts

- [ ] Style component for dark theme (AC: 12)
  - [ ] Use Tailwind dark mode classes
  - [ ] Semi-transparent black background (bg-black/80)
  - [ ] White text for timer (text-white)
  - [ ] Red background for stop button (bg-red-600)
  - [ ] Rounded corners (rounded-lg)
  - [ ] Drop shadow for visibility (shadow-lg)
  - [ ] Ensure readable on any preview content

- [ ] Ensure smooth performance (AC: 11)
  - [ ] Verify setInterval doesn't block UI
  - [ ] Use requestAnimationFrame if needed for smoother updates
  - [ ] Debounce button clicks to prevent rapid stop calls
  - [ ] Test timer performance during actual recording
  - [ ] Ensure no memory leaks from intervals

- [ ] Write component tests
  - [ ] Create RecordingTimer.test.tsx
  - [ ] Test timer appears when isRecording = true
  - [ ] Test timer hidden when isRecording = false
  - [ ] Test duration updates every second
  - [ ] Test stop button click triggers stopRecording
  - [ ] Test time formatting (0s → 00:00, 65s → 01:05, 3665s → 01:01:05)
  - [ ] Mock useRecordingStore and IPC

- [ ] Integrate with existing UI
  - [ ] Import RecordingTimer in App.tsx or MainLayout
  - [ ] Render timer conditionally based on isRecording
  - [ ] Ensure timer doesn't interfere with other UI elements
  - [ ] Test z-index layering with modals and menus
  - [ ] Verify timer visible on all screen sizes

- [ ] Manual testing
  - [ ] Start recording and verify timer appears immediately
  - [ ] Verify timer counts up accurately (compare with system clock)
  - [ ] Verify stop button ends recording
  - [ ] Test timer with all recording modes (screen, webcam, PiP)
  - [ ] Verify timer disappears after stop
  - [ ] Test rapid start/stop cycles
  - [ ] Verify no UI freezing during recording

## Dev Notes

**Architecture Alignment:**
- RecordingTimer in `src/renderer/components/Recording/` (architecture.md:142-148)
- Uses recordingStore for state (architecture.md:170)
- Floating overlay component, always rendered, conditionally visible
- IPC handler in recording.handlers.ts (architecture.md:80)

**Tech Spec References:**
- RecordingTimer component spec (tech-spec-epic-5.md:91)
- Timer shows elapsed time during recording (tech-spec-epic-5.md:269, 286, 307)
- Stop button integrated with timer (tech-spec-epic-5.md:270, 288, 308)
- Positioned top-right, floating (tech-spec-epic-5.md:269)
- IPC stop channel (tech-spec-epic-5.md:195-198)

**Key Implementation Details:**
- Single component for all recording modes
- Duration tracked in recordingStore, updated every second
- Stop button red to match recording conventions (red = record/stop)
- Floating position ensures always visible during recording
- setInterval cleared properly to prevent memory leaks

**Component Structure:**
```tsx
<RecordingTimer>
  {isRecording && (
    <div className="fixed top-4 right-4 bg-black/80 p-3 rounded-lg">
      <div className="text-white font-mono">{formatTime(duration)}</div>
      <button onClick={handleStop} className="bg-red-600 mt-2">
        Stop Recording
      </button>
    </div>
  )}
</RecordingTimer>
```

**Timer Update Flow:**
```
Recording starts
  ↓
isRecording = true
  ↓
RecordingTimer renders
  ↓
useEffect starts setInterval
  ↓
Every 1000ms: updateDuration(duration + 1)
  ↓
Timer re-renders with new duration
  ↓
User clicks Stop
  ↓
IPC: recording:stop
  ↓
RecordingService.stopRecording()
  ↓
isRecording = false
  ↓
RecordingTimer hidden, interval cleared
```

**Testing Strategy:**
- Mock setInterval/clearInterval for unit tests
- Test time formatting edge cases
- Mock IPC for stop action
- Manual testing with real recordings to verify accuracy
- Test performance impact of 1Hz updates

**Design Considerations:**
- Top-right position standard for recording indicators (Zoom, Loom, etc.)
- Semi-transparent background ensures visibility over any content
- Large enough to see clearly, small enough to not obstruct
- Red stop button matches universal recording conventions
- Monospace font for timer (easier to read changing numbers)

**Performance:**
- 1 second update interval is lightweight
- Component only renders when recording active
- No re-renders of unrelated components (isolated store subscription)
- setInterval safe for long recordings (no drift accumulation)

### Project Structure Notes

**Files Created:**
- `src/renderer/components/Recording/RecordingTimer.tsx` (~100 lines)
- `src/renderer/components/Recording/RecordingTimer.test.tsx`

**Files Modified:**
- `src/renderer/App.tsx` or `MainLayout.tsx` - Import and render RecordingTimer
- `src/renderer/utils/timeFormat.util.ts` - Add formatRecordingTime() function
- `src/main/ipc/recording.handlers.ts` - Add recording:stop handler
- `src/renderer/store/recordingStore.ts` - Ensure updateDuration and stopRecording actions

**Alignment with architecture.md:**
- Recording components at src/renderer/components/Recording/ (line 142-148)
- Time formatting in utils (line 189-193)
- IPC handlers (line 76-80)

### References

- [Source: docs/tech-spec-epic-5.md#Minimal Component Layer] - RecordingTimer specification
- [Source: docs/tech-spec-epic-5.md#Workflow 1: Screen-Only Recording] - Timer appears step 7
- [Source: docs/tech-spec-epic-5.md#Workflow 2: Webcam-Only Recording] - Timer appears step 7
- [Source: docs/tech-spec-epic-5.md#Workflow 3: Picture-in-Picture Recording] - Timer appears step 7
- [Source: docs/tech-spec-epic-5.md#APIs and Interfaces:IPC Commands] - recording:stop channel
- [Source: docs/architecture.md#Project Structure:Recording] - Component organization
- [Source: docs/architecture.md#Project Structure:Utils] - Time formatting utilities

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
