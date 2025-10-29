# Story 5.1: Recording Service Setup

Status: review

## Story

As a developer,
I want a centralized recording service with auto-configuration capabilities,
so that Epic 5's simplified recording features have a solid, testable foundation.

## Acceptance Criteria

1. `recording.service.ts` created in `src/main/services/` with complete TypeScript types
2. Auto-select primary screen using `desktopCapturer.getSources()` with no user input required
3. Auto-select default webcam using `navigator.mediaDevices.enumerateDevices()` with fallback logic
4. Fixed recording configuration constants defined (resolution, framerate, bitrate, webcam positioning)
5. Temp directory structure created at `os.tmpdir()/chop-shop/recordings/` with error handling
6. Service methods defined for `getPrimaryScreen()`, `getDefaultWebcam()`, `startRecording()`, `stopRecording()`
7. Comprehensive error handling with user-friendly messages for permission denials and device unavailability
8. Service integration tests verify auto-selection logic without requiring actual devices
9. Logging implemented with `[Recording]` prefix for all service operations
10. Recording state management stub in service (tracks `isRecording`, `currentMode`, `outputFiles`)

## Tasks / Subtasks

- [x] Create recording service file and types (AC: 1)
  - [x] Create `src/main/services/recording.service.ts` with class structure
  - [x] Define `RecordingMode` type: `'screen' | 'webcam' | 'pip'`
  - [x] Define `RecordingOutput` interface with file paths and metadata
  - [x] Define `RecordingDefaults` interface for fixed configuration
  - [x] Export service as singleton instance

- [x] Implement auto-source selection methods (AC: 2, 3)
  - [x] Implement `getPrimaryScreen()` - returns first screen from desktopCapturer
  - [x] Add fallback logic if primary screen unavailable
  - [x] Implement `getDefaultWebcam()` - returns first videoinput device
  - [x] Add fallback to system default if no devices found
  - [x] Log all auto-selected sources with device IDs and names

- [x] Define fixed recording configuration (AC: 4)
  - [x] Create `RECORDING_DEFAULTS` constant object
  - [x] Set screen: 1920x1080, 30fps, 8Mbps
  - [x] Set webcam: 640x480, 30fps, 2.5Mbps, bottom-right, 20% size, circle shape
  - [x] Set audio: auto-select microphone, echo cancellation, noise suppression
  - [x] Set storage: temp dir, WebM format, VP9 codec

- [x] Create temp directory management (AC: 5)
  - [x] Implement `ensureRecordingDirectory()` method
  - [x] Create temp path: `path.join(os.tmpdir(), 'chop-shop', 'recordings')`
  - [x] Use `fs.mkdir()` with recursive option
  - [x] Handle EACCES and ENOSPC errors with user messages
  - [x] Log directory creation and any errors

- [x] Implement service method stubs (AC: 6)
  - [x] Create `startRecording(mode: RecordingMode)` method signature
  - [x] Create `stopRecording()` method signature returning RecordingOutput
  - [x] Add private method stubs: `createScreenRecorder()`, `createWebcamRecorder()`
  - [x] Add private method stub: `saveRecording(chunks, filename)`
  - [x] Document all methods with JSDoc comments

- [x] Implement comprehensive error handling (AC: 7)
  - [x] Wrap device enumeration in try-catch with specific error messages
  - [x] Handle NotAllowedError (permissions denied) with guidance to System Preferences
  - [x] Handle NotFoundError (no devices) with fallback messaging
  - [x] Handle NotReadableError (device busy) with retry suggestions
  - [x] Create error logging utility for recording errors

- [x] Write integration tests (AC: 8)
  - [x] Create `recording.service.test.ts` in same directory
  - [x] Mock desktopCapturer for primary screen test
  - [x] Mock mediaDevices for default webcam test
  - [x] Test fallback behavior when no devices available
  - [x] Test error handling for permission denials
  - [x] Verify RECORDING_DEFAULTS structure

- [x] Implement logging system (AC: 9)
  - [x] Add `[Recording]` prefix to all console.log statements
  - [x] Log service initialization
  - [x] Log auto-selected screen (name, id, resolution)
  - [x] Log auto-selected webcam (name, id)
  - [x] Log recording start/stop events with timestamps
  - [x] Log any errors with stack traces

- [x] Create recording state management (AC: 10)
  - [x] Add private properties: `isRecording`, `currentMode`, `outputFiles`
  - [x] Initialize state in constructor
  - [x] Add getter methods for state access
  - [x] Add state update methods (private)
  - [x] Ensure state resets properly after stop

## Dev Notes

**Architecture Alignment:**
- Service lives in `src/main/services/recording.service.ts` per architecture.md:84-86
- Follows singleton pattern like existing `ffmpeg.service.ts` and `file.service.ts`
- Main process only - no renderer involvement at this stage
- Uses Electron's `desktopCapturer` API (native, no external deps)

**Tech Spec References:**
- Fixed configuration defined in tech-spec-epic-5.md:131-156 (RECORDING_DEFAULTS)
- Auto-selection logic from tech-spec-epic-5.md:212-224 (getPrimaryScreen, getDefaultWebcam)
- Error handling requirements from NFR sec:377-378 (permission handling)

**Key Simplifications from Epic 4:**
- NO source selector UI - auto-selection only
- NO preview positioning controls - fixed bottom-right corner
- NO user configuration - smart defaults only
- Eliminates `SourceSelector.tsx`, `RecordingPreview.tsx` components entirely

**Testing Strategy:**
- Mock Electron APIs (desktopCapturer, mediaDevices) for unit tests
- Test error paths extensively (permissions, no devices, busy devices)
- Verify fallback logic without requiring actual hardware
- Integration tests for service initialization and configuration

**Security Considerations:**
- Service must handle macOS permission prompts gracefully
- Clear user guidance when permissions denied (direct to System Preferences)
- Validate all file paths before writing to prevent directory traversal
- Ensure MediaStream cleanup on stop to release camera/mic

### Project Structure Notes

**Files Created:**
- `src/main/services/recording.service.ts` - Main service file (~300-400 lines)
- `src/main/services/recording.service.test.ts` - Integration tests

**Alignment with architecture.md:**
- Service layer at src/main/services/ (line 82-88)
- Follows existing service patterns (ffmpeg, file, thumbnail services)
- No IPC handlers in this story - added in Story 5.2

**Testing-strategy.md Alignment:**
- Unit tests with mocked Electron APIs
- Error path testing for all device/permission failures
- No E2E tests required at service layer

### References

- [Source: docs/tech-spec-epic-5.md#Services and Modules] - RecordingService API definition
- [Source: docs/tech-spec-epic-5.md#Data Models and Contracts] - RecordingMode, RecordingState, RecordingConfiguration
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Security] - Permission handling, temp file security
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Observability] - Logging format with [Recording] prefix
- [Source: docs/architecture.md#Project Structure] - Service file location and naming conventions
- [Source: docs/architecture.md#Media Capture] - desktopCapturer and getUserMedia APIs

## Dev Agent Record

### Context Reference

docs/stories/5-1-recording-service-setup.context.xml

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None - All tests passed on first run (29/29 tests passing)

### Completion Notes List

**Implementation Summary:**
- Created comprehensive RecordingService singleton following existing service patterns (ffmpeg.service, file.service)
- Implemented auto-selection for primary screen using Electron's desktopCapturer API
- Implemented auto-selection for default webcam using navigator.mediaDevices API
- All error handling paths tested with specific error codes: PERMISSION_DENIED, NO_DEVICES_FOUND, DEVICE_BUSY, DIRECTORY_ERROR
- RECORDING_DEFAULTS constant defines all fixed configuration per tech spec requirements
- Comprehensive logging with [Recording] prefix throughout service operations
- State management tracks isRecording, currentMode, outputFiles with proper reset on stop
- All 29 integration tests passing with full coverage of ACs

**Technical Decisions:**
- Used singleton pattern for service consistency with existing codebase
- Leveraged Electron's native desktopCapturer (no additional dependencies)
- Implemented comprehensive error handling with user-friendly messages directing to System Preferences
- Temp directory at os.tmpdir()/chop-shop/recordings/ with proper error handling for EACCES and ENOSPC
- All methods fully documented with JSDoc comments

**Test Coverage:**
- 29 comprehensive integration tests covering all acceptance criteria
- Mocked Electron APIs (desktopCapturer, navigator.mediaDevices) for unit testing
- Tested all error paths without requiring actual hardware
- Full lifecycle testing: start → stop → state reset
- Concurrent recording prevention validated

### File List

**Created:**
- src/main/services/recording.service.ts (365 lines)
- src/main/services/__tests__/recording.service.test.ts (473 lines)

**Modified:**
- None

---

## Senior Developer Review (AI)

**Reviewer:** andrew
**Date:** 2025-10-28
**Outcome:** Changes Requested

### Summary

Story 5-1 provides a solid foundation for the recording service with comprehensive error handling, proper TypeScript typing, and excellent test coverage (29/29 tests passing). The implementation follows the singleton pattern correctly and aligns well with existing service patterns in the codebase. However, there are **critical architectural issues** discovered during implementation of Stories 5-2 and 5-3 that require refactoring.

The core issue is that **MediaRecorder API requires a DOM context** (renderer process), but this service is implemented in the main process. This causes a fundamental architectural mismatch that must be resolved before Stories 5-4, 5-5, 5-6, and 5-7 can proceed.

### Key Findings

#### **High Severity**

1. **[HIGH] Architectural Mismatch: MediaRecorder in Main Process**
   - **Issue**: The service is in `src/main/services/recording.service.ts` but MediaRecorder API requires renderer process (DOM context)
   - **Evidence**: Story 5-3 completion notes show architectural refactor to **Option A** - MediaRecorder in renderer, IPC coordination
   - **Impact**: The service as initially designed cannot perform actual recording operations
   - **Current State**: Story 5-3 created `src/renderer/src/services/RecordingManager.ts` (189 lines) to handle MediaRecorder in renderer
   - **Files**: recording.service.ts (main) + RecordingManager.ts (renderer) split architecture
   - **Related ACs**: AC-6 (startRecording/stopRecording methods)
   - **Recommendation**: Update this story's documentation to reflect the split architecture decision. Main process coordinates state and file operations, renderer process handles MediaRecorder capture.

2. **[HIGH] Missing `stopRecording()` Implementation**
   - **Issue**: Tests show `stopRecording()` exists but implementation is incomplete (test at line 371-404 shows empty `files: {}` being returned)
   - **Evidence**: Test expects `output.files` to be empty object, no actual file saving logic
   - **Impact**: Cannot complete recording lifecycle as per AC-9
   - **Related ACs**: AC-6, AC-9
   - **Recommendation**: Implement `stopRecording()` or update to match Story 5-3's `completeRecording(buffer)` pattern

3. **[HIGH] Webcam API in Main Process**
   - **Issue**: `getDefaultWebcam()` uses `navigator.mediaDevices.enumerateDevices()` which is a browser API, not available in main process
   - **Evidence**: Line 173 uses `navigator.mediaDevices` - this will fail in main process Node.js environment
   - **Impact**: AC-3 cannot be satisfied as written
   - **Related ACs**: AC-3
   - **Recommendation**: Move webcam enumeration to renderer or provide it via IPC from renderer

#### **Medium Severity**

4. **[MED] Incomplete File Saving Logic**
   - **Issue**: `saveRecordingFile()` method exists (lines 265-300) but `stopRecording()` doesn't call it
   - **Evidence**: Test at line 382 expects empty files object, no file write operations
   - **Impact**: Recordings cannot be persisted to disk
   - **Related ACs**: AC-5, AC-8
   - **Recommendation**: Wire up `saveRecordingFile()` in complete recording flow or document why it's deferred

5. **[MED] Missing IPC Integration**
   - **Issue**: Service has no IPC handlers registered despite being a main process service
   - **Evidence**: No `recording.handlers.ts` file listed in "Files Created" section, but Story 5-2 shows it was created later
   - **Impact**: Renderer cannot trigger recording operations
   - **Related ACs**: Implicit requirement for IPC surface
   - **Recommendation**: Add IPC handler registration to this story or explicitly defer to Story 5-2

#### **Low Severity**

6. **[LOW] Test Coverage for Actual Recording Flow**
   - **Issue**: Tests mock all Electron/browser APIs but don't test actual MediaRecorder integration
   - **Evidence**: Tests are unit tests with mocks, no integration tests with real MediaRecorder
   - **Impact**: Real-world MediaRecorder behavior not validated
   - **Related ACs**: AC-8
   - **Recommendation**: Add note that E2E tests are required in later stories (5-3, 5-4, 5-5) for actual recording validation

7. **[LOW] Logging Prefix Consistency**
   - **Issue**: All logs use `[Recording]` prefix correctly per AC-9, but Story 5-3 also introduces `[RecordingManager]` prefix in renderer
   - **Evidence**: Completion notes mention two logging prefixes
   - **Impact**: Minor inconsistency in log filtering
   - **Related ACs**: AC-9
   - **Recommendation**: Document dual prefix strategy (main vs renderer) in logging standards

### Acceptance Criteria Coverage

| AC | Status | Notes |
|----|--------|-------|
| AC-1 | ✅ PASS | Service file created with complete TypeScript types |
| AC-2 | ✅ PASS | `getPrimaryScreen()` implemented with auto-selection logic |
| AC-3 | ⚠️ PARTIAL | `getDefaultWebcam()` implemented but uses browser API in main process (architectural issue) |
| AC-4 | ✅ PASS | `RECORDING_DEFAULTS` defined correctly per tech spec |
| AC-5 | ✅ PASS | `ensureRecordingDirectory()` implemented with EACCES/ENOSPC handling |
| AC-6 | ⚠️ PARTIAL | Methods defined but `stopRecording()` incomplete, `startRecording()` is stub |
| AC-7 | ✅ PASS | Comprehensive error handling with RecordingError class and specific error codes |
| AC-8 | ✅ PASS | 29/29 integration tests passing with mocked APIs |
| AC-9 | ✅ PASS | Logging implemented with `[Recording]` prefix throughout |
| AC-10 | ✅ PASS | State management tracks `isRecording`, `currentMode`, `outputFiles` |

**Overall Coverage**: 7/10 fully satisfied, 3/10 partially satisfied due to architectural split

### Test Coverage and Gaps

**Strengths:**
- Comprehensive unit test coverage (29 tests)
- All error paths tested (permissions, no devices, busy devices, disk errors)
- State management lifecycle tested (start → stop → reset)
- Concurrent recording prevention tested

**Gaps:**
1. No integration tests with actual Electron desktopCapturer (uses mocks)
2. No MediaRecorder integration tests (architectural limitation)
3. No IPC handler tests (deferred to Story 5-2)
4. No file I/O tests for actual WebM files (deferred to Story 5-3)

**Test Quality**: Tests are well-structured with proper setup/teardown, but rely entirely on mocks. Real-world validation deferred to later stories.

### Architectural Alignment

**Aligns With:**
- ✅ Singleton service pattern (matches ffmpeg.service.ts, file.service.ts)
- ✅ Main process service location (src/main/services/)
- ✅ Error handling patterns (custom Error class with codes)
- ✅ TypeScript strict mode with comprehensive typing
- ✅ Logging standards with consistent prefix

**Deviates From:**
- ❌ **Critical**: MediaRecorder requires renderer process, but service is in main
- ⚠️ navigator.mediaDevices in main process (not available)

**Resolution**: Story 5-3 implemented architectural refactor (Option A) splitting responsibilities:
- **Main Process** (recording.service.ts): State coordination, file writing, source selection
- **Renderer Process** (RecordingManager.ts): MediaRecorder capture, stream management
- **IPC**: Screen source requests, recording data transfer

This split architecture is **correct** but means Story 5-1's service is now a coordination layer, not a complete recording implementation.

### Security Notes

**Strengths:**
1. Proper permission error handling for screen recording and camera access
2. Clear user guidance to System Preferences for macOS permissions
3. File path validation via temp directory constraints
4. No arbitrary file path inputs (temp dir only)
5. Error messages don't leak sensitive system information

**Considerations:**
1. **MediaStream Cleanup**: AC mentions cleanup but implementation not visible in current service (deferred to renderer RecordingManager)
2. **Temp File Security**: Files stored in os.tmpdir() are world-readable on some systems - consider if recordings contain sensitive content
3. **Permission Prompts**: macOS will show permission dialogs on first use - ensure UX handles this gracefully

**Overall**: Security practices are sound for this layer. Renderer MediaRecorder integration (Story 5-3) must ensure proper stream cleanup.

### Best-Practices and References

**Electron Best Practices:**
- ✅ Process separation (main for system APIs, renderer for UI)
- ⚠️ MediaRecorder placement corrected in Story 5-3
- ✅ IPC for cross-process communication (added in Story 5-2)
- ✅ Context isolation maintained (preload.ts bridge)

**TypeScript Best Practices:**
- ✅ Strict typing enabled
- ✅ Proper use of const assertions for RECORDING_DEFAULTS
- ✅ Custom error class with discriminated error codes
- ✅ Interface definitions for all data contracts

**Testing Best Practices:**
- ✅ Comprehensive mocking of external APIs
- ✅ Isolated unit tests with beforeEach/afterEach cleanup
- ⚠️ Missing E2E tests (acceptable at this layer, covered in later stories)

**References:**
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) - Context isolation, IPC security
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) - Browser API limitations
- [Electron desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer) - Screen capture API

### Action Items

1. **[HIGH]** Update story documentation to reflect split architecture decision (main coordination + renderer capture)
   - **Owner**: Developer (Story 5-1 revision)
   - **Files**: This story file (Dev Notes section)
   - **Reason**: Current docs imply full recording in main process, but implementation split across processes

2. **[HIGH]** Implement or document `stopRecording()` completion
   - **Owner**: Developer (Story 5-1 or 5-3 clarification)
   - **Files**: recording.service.ts:342-421
   - **Reason**: Test shows empty files return, no actual stop logic

3. **[HIGH]** Resolve webcam API in main process issue
   - **Owner**: Developer (Story 5-1 refactor)
   - **Files**: recording.service.ts:170-225
   - **Reason**: `navigator.mediaDevices` not available in Node.js main process

4. **[MED]** Wire up `saveRecordingFile()` in recording completion flow
   - **Owner**: Developer (Story 5-3 context)
   - **Files**: recording.service.ts:265-300
   - **Reason**: Method defined but not called

5. **[MED]** Add IPC handler registration or document deferral
   - **Owner**: Developer (Story 5-2 context)
   - **Files**: src/main/ipc/recording.handlers.ts (created in Story 5-2)
   - **Reason**: Service needs IPC surface for renderer communication

6. **[LOW]** Document dual logging prefix strategy
   - **Owner**: Developer (Documentation)
   - **Files**: docs/architecture.md or logging standards doc
   - **Reason**: `[Recording]` vs `[RecordingManager]` clarification

### Change Log

- **2025-10-28**: Senior Developer Review notes appended (Status: Changes Requested)
