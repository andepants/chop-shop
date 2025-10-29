# Story 5.2: Recording Mode Selection UI

Status: drafted

## Story

As a content creator,
I want a simple 3-button modal to choose my recording mode,
so that I can quickly start recording without configuration dialogs.

## Acceptance Criteria

1. "Record" button added to left sidebar (Sidebar.tsx) with recording icon
2. `RecordingModeModal.tsx` component created with 3 mode buttons: "Screen Only", "Webcam Only", "Screen + Webcam (PiP)"
3. Modal opens when user clicks "Record" button in sidebar
4. "Screen + Webcam (PiP)" button visually highlighted as recommended/default option
5. Clicking any mode button triggers recording start and closes modal
6. Modal includes cancel button to close without starting recording
7. Modal styled with dark theme consistent with CapCut reference design
8. `recordingStore.ts` Zustand store created with minimal state: `isRecording`, `mode`, `duration`, `outputFiles`
9. Store actions defined: `startRecording(mode)`, `stopRecording()`, `updateDuration(duration)`
10. IPC integration: clicking mode button invokes `'recording:start'` IPC channel with selected mode

## Tasks / Subtasks

- [ ] Add Record button to sidebar (AC: 1)
  - [ ] Open `src/renderer/components/Layout/Sidebar.tsx`
  - [ ] Add "Record" button below Import button
  - [ ] Use recording icon (red circle or camera icon)
  - [ ] Wire button click to open modal (useUIStore)
  - [ ] Ensure button styling matches existing sidebar buttons

- [ ] Create recording store (AC: 8, 9)
  - [ ] Create `src/renderer/store/recordingStore.ts`
  - [ ] Define store interface with state: `isRecording`, `mode`, `duration`, `outputFiles`
  - [ ] Implement `startRecording(mode)` action
  - [ ] Implement `stopRecording()` action
  - [ ] Implement `updateDuration(duration)` action
  - [ ] Initialize state with sensible defaults
  - [ ] Export store hook: `useRecordingStore`

- [ ] Create RecordingModeModal component (AC: 2, 3)
  - [ ] Create `src/renderer/components/Recording/RecordingModeModal.tsx`
  - [ ] Import Modal component from shared components
  - [ ] Add modal title: "Choose Recording Mode"
  - [ ] Create 3 mode button layout (vertical stack)
  - [ ] Add cancel button at bottom
  - [ ] Wire modal open/close to uiStore
  - [ ] Add proper TypeScript types for props

- [ ] Implement mode selection buttons (AC: 4, 5)
  - [ ] Create "Screen Only" button with screen icon and description
  - [ ] Create "Webcam Only" button with camera icon and description
  - [ ] Create "Screen + Webcam (PiP)" button with combined icon
  - [ ] Highlight PiP button with border/background (recommended)
  - [ ] Add hover states for all buttons
  - [ ] Wire each button click to handleModeSelect(mode)
  - [ ] Close modal on mode selection

- [ ] Implement dark theme styling (AC: 7)
  - [ ] Use Tailwind dark theme colors consistent with app
  - [ ] Match CapCut modal style (rounded corners, shadow)
  - [ ] Style mode buttons with hover/active states
  - [ ] Add icons with appropriate sizing and colors
  - [ ] Ensure proper contrast ratios for accessibility
  - [ ] Test modal appearance on different screen sizes

- [ ] Integrate IPC communication (AC: 10)
  - [ ] Import useIPC hook in RecordingModeModal
  - [ ] Call `window.electron.ipcRenderer.invoke('recording:start', { mode })` on selection
  - [ ] Handle IPC response (success/error)
  - [ ] Update recordingStore on successful start
  - [ ] Display error message if recording fails to start
  - [ ] Log IPC calls for debugging

- [ ] Create IPC handler stub (AC: 10)
  - [ ] Create `src/main/ipc/recording.handlers.ts` if not exists
  - [ ] Register `'recording:start'` handler
  - [ ] Handler calls `recordingService.startRecording(mode)` (Story 5.1)
  - [ ] Return success response for now
  - [ ] Add error handling and logging
  - [ ] Register handler in `src/main/ipc/index.ts`

- [ ] Wire up cancel functionality (AC: 6)
  - [ ] Add "Cancel" button to modal footer
  - [ ] Wire cancel click to close modal
  - [ ] Ensure ESC key also closes modal
  - [ ] No state changes on cancel
  - [ ] Test cancel from all interaction points

- [ ] Add component tests
  - [ ] Create `RecordingModeModal.test.tsx`
  - [ ] Test modal opens on Record button click
  - [ ] Test each mode button triggers correct IPC call
  - [ ] Test cancel closes modal without starting recording
  - [ ] Test PiP button has highlighted styling
  - [ ] Mock useRecordingStore and useIPC

- [ ] Create Recording component README
  - [ ] Create `src/renderer/components/Recording/README.md`
  - [ ] Document RecordingModeModal component
  - [ ] Document mode selection flow
  - [ ] Document integration with recordingStore and IPC

## Dev Notes

**Architecture Alignment:**
- RecordingModeModal lives in `src/renderer/components/Recording/` per architecture.md:142-148
- recordingStore follows Zustand pattern at `src/renderer/store/recordingStore.ts` (architecture.md:164-172)
- IPC handler in `src/main/ipc/recording.handlers.ts` (architecture.md:80)
- No source selector, no preview - pure mode selection only

**Tech Spec References:**
- Modal has 3 buttons only, no configuration screens (tech-spec-epic-5.md:89-91)
- PiP mode is primary/highlighted (tech-spec-epic-5.md:299 - "[DEFAULT/HIGHLIGHTED]")
- Minimal UI: mode selection modal only (tech-spec-epic-5.md:62-63)
- IPC surface: `recording:start` with mode parameter (tech-spec-epic-5.md:186-193)

**Key Simplifications from Epic 4:**
- NO source selection dropdowns
- NO preview window before recording
- NO configuration options (resolution, framerate, etc.)
- Just 3 buttons → instant recording start
- Eliminates Epic 4 Stories 4.3 and 4.4 complexity

**Component Architecture:**
```
Sidebar (Record button)
  ↓ opens
RecordingModeModal (3 mode buttons)
  ↓ on mode select
IPC: recording:start { mode }
  ↓ handled by
recording.handlers.ts → recording.service.startRecording()
  ↓ updates
recordingStore (isRecording = true, mode = selected)
```

**State Management:**
- recordingStore minimal: 4 properties + 3 actions
- No complex recording configuration state
- UI state (modal open/close) in existing uiStore

**Design Consistency:**
- Follow existing modal patterns (ExportModal.tsx as reference)
- Match button styling from shared/Button.tsx
- Dark theme matching CapCut screenshots

### Project Structure Notes

**Files Created:**
- `src/renderer/components/Recording/RecordingModeModal.tsx` (~150 lines)
- `src/renderer/components/Recording/RecordingModeModal.test.tsx`
- `src/renderer/components/Recording/README.md`
- `src/renderer/store/recordingStore.ts` (~100 lines)
- `src/main/ipc/recording.handlers.ts` (stub, ~30 lines)

**Files Modified:**
- `src/renderer/components/Layout/Sidebar.tsx` - Add Record button
- `src/main/ipc/index.ts` - Register recording handler

**Alignment with architecture.md:**
- Recording components at src/renderer/components/Recording/ (line 142-148)
- Store at src/renderer/store/recordingStore.ts (line 170)
- IPC handler at src/main/ipc/recording.handlers.ts (line 80)

### References

- [Source: docs/tech-spec-epic-5.md#Minimal Component Layer] - RecordingModeModal with 3-button design
- [Source: docs/tech-spec-epic-5.md#State Management] - recordingStore interface definition
- [Source: docs/tech-spec-epic-5.md#APIs and Interfaces:IPC Commands] - recording:start channel specification
- [Source: docs/tech-spec-epic-5.md#Workflow 3: Picture-in-Picture Recording] - PiP as primary/highlighted mode
- [Source: docs/architecture.md#Project Structure:Recording] - Component file locations
- [Source: docs/architecture.md#Project Structure:Store] - Zustand store patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
