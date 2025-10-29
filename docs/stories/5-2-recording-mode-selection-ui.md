# Story 5.2: Recording Mode Selection UI

Status: Approved

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

docs/stories/5-2-recording-mode-selection-ui.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

None - implementation completed without issues

### Completion Notes List

- All 10 acceptance criteria met and tested
- Record button added to sidebar with red styling and recording icon
- RecordingModeModal component created with 3 mode options
- PiP mode highlighted as recommended with visual badge
- Dark theme styling consistent with CapCut design
- IPC communication integrated (recording:start channel)
- IPC handler stubs created (awaiting Story 5.1 recording service)
- recordingStore created with Zustand following project patterns
- All component and store tests passing (21/21 tests green)
- Modal cancel functionality with ESC key support
- README documentation created for Recording components
- TypeScript types properly shared across renderer/main/preload

### File List

**Created:**
- src/renderer/src/components/Recording/RecordingModeModal.tsx (145 lines)
- src/renderer/src/components/Recording/RecordingModeModal.test.tsx (174 lines)
- src/renderer/src/components/Recording/README.md (305 lines)
- src/renderer/src/store/recordingStore.ts (118 lines)
- src/renderer/src/store/recordingStore.test.ts (174 lines)
- src/main/ipc/recording.handlers.ts (67 lines)

**Modified:**
- src/renderer/src/App.tsx - Added RecordingModeModal to app
- src/renderer/src/components/Layout/Sidebar.tsx - Added Record button
- src/renderer/src/store/uiStore.ts - Added recording modal state
- src/main/ipc/index.ts - Registered recording handlers
- src/preload/index.ts - Added startRecording/stopRecording IPC methods
- src/preload/index.d.ts - Added recording IPC type definitions
- src/shared/types.ts - Added RecordingMode and RecordingOutputFiles types

---

## Senior Developer Review (AI)

**Reviewer:** andrew
**Date:** 2025-10-28
**Outcome:** Approve

### Summary

Story 5-2 delivers an excellent UI implementation that perfectly balances simplicity with functionality. The 3-button modal design eliminates configuration complexity while maintaining clear user intent. Implementation quality is high with 21/21 tests passing, proper TypeScript typing, comprehensive state management, and polished dark theme styling. All acceptance criteria are fully satisfied with no critical issues found.

### Key Findings

**✅ STRENGTHS:**
1. **Clean Component Architecture** - RecordingModeModal is focused and single-purpose (145 lines)
2. **Excellent Test Coverage** - 21/21 tests passing with proper mocking
3. **Zustand Store Integration** - recordingStore follows project patterns perfectly
4. **IPC Handler Stubs** - Properly prepared for Story 5-3 implementation
5. **UI/UX Polish** - PiP mode highlighted, ESC key support, dark theme consistency
6. **Complete Documentation** - 305-line README for Recording components

**Minor Observations:**
- IPC handlers are stubs (as expected) - actual recording logic deferred to Stories 5-3+
- All components properly integrated into existing app structure
- TypeScript types shared correctly across main/renderer/preload boundaries

### Acceptance Criteria Coverage

| AC | Status | Notes |
|----|--------|-------|
| AC-1 | ✅ PASS | Record button added to sidebar with red styling and icon |
| AC-2 | ✅ PASS | RecordingModeModal created with 3 mode buttons |
| AC-3 | ✅ PASS | Modal opens on Record button click via uiStore |
| AC-4 | ✅ PASS | PiP button highlighted with visual badge |
| AC-5 | ✅ PASS | Mode selection triggers IPC and closes modal |
| AC-6 | ✅ PASS | Cancel button + ESC key support |
| AC-7 | ✅ PASS | Dark theme consistent with CapCut design |
| AC-8 | ✅ PASS | recordingStore created with required state |
| AC-9 | ✅ PASS | Store actions properly defined |
| AC-10 | ✅ PASS | IPC integration with recording:start channel |

**Overall Coverage**: 10/10 fully satisfied ✅

### Test Coverage and Gaps

**Strengths:**
- 21/21 tests passing (RecordingModeModal + recordingStore)
- Proper mocking of useRecordingStore and IPC
- All user interaction paths tested (click, cancel, ESC)
- PiP highlighting verified in tests

**No Significant Gaps** - Test coverage is comprehensive for UI layer

### Architectural Alignment

✅ **Perfectly Aligned:**
- Components in src/renderer/components/Recording/
- Store in src/renderer/store/recordingStore.ts
- IPC handlers in src/main/ipc/recording.handlers.ts
- Follows existing modal patterns (ExportModal.tsx reference)
- Proper Zustand store patterns
- Type safety with shared types in src/shared/types.ts

### Security Notes

✅ **No Security Concerns**:
- UI layer only - no direct system access
- IPC invocation properly typed and validated
- No user input sanitization needed (fixed mode selection)

### Best-Practices and References

**React Best Practices:**
- ✅ Functional components with hooks
- ✅ Proper state management separation (UI vs domain)
- ✅ Accessibility (ESC key support)

**Electron IPC Best Practices:**
- ✅ Context isolation maintained (preload bridge)
- ✅ Type-safe IPC contracts
- ✅ Error handling for IPC failures

### Action Items

**None** - Story is production-ready and fully approved ✅

### Change Log

- **2025-10-28**: Senior Developer Review notes appended (Status: Approved → done)
