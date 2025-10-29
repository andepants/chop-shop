# Story 5.1: Recording Service Setup

Status: drafted

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

- [ ] Create recording service file and types (AC: 1)
  - [ ] Create `src/main/services/recording.service.ts` with class structure
  - [ ] Define `RecordingMode` type: `'screen' | 'webcam' | 'pip'`
  - [ ] Define `RecordingOutput` interface with file paths and metadata
  - [ ] Define `RecordingDefaults` interface for fixed configuration
  - [ ] Export service as singleton instance

- [ ] Implement auto-source selection methods (AC: 2, 3)
  - [ ] Implement `getPrimaryScreen()` - returns first screen from desktopCapturer
  - [ ] Add fallback logic if primary screen unavailable
  - [ ] Implement `getDefaultWebcam()` - returns first videoinput device
  - [ ] Add fallback to system default if no devices found
  - [ ] Log all auto-selected sources with device IDs and names

- [ ] Define fixed recording configuration (AC: 4)
  - [ ] Create `RECORDING_DEFAULTS` constant object
  - [ ] Set screen: 1920x1080, 30fps, 8Mbps
  - [ ] Set webcam: 640x480, 30fps, 2.5Mbps, bottom-right, 20% size, circle shape
  - [ ] Set audio: auto-select microphone, echo cancellation, noise suppression
  - [ ] Set storage: temp dir, WebM format, VP9 codec

- [ ] Create temp directory management (AC: 5)
  - [ ] Implement `ensureRecordingDirectory()` method
  - [ ] Create temp path: `path.join(os.tmpdir(), 'chop-shop', 'recordings')`
  - [ ] Use `fs.mkdir()` with recursive option
  - [ ] Handle EACCES and ENOSPC errors with user messages
  - [ ] Log directory creation and any errors

- [ ] Implement service method stubs (AC: 6)
  - [ ] Create `startRecording(mode: RecordingMode)` method signature
  - [ ] Create `stopRecording()` method signature returning RecordingOutput
  - [ ] Add private method stubs: `createScreenRecorder()`, `createWebcamRecorder()`
  - [ ] Add private method stub: `saveRecording(chunks, filename)`
  - [ ] Document all methods with JSDoc comments

- [ ] Implement comprehensive error handling (AC: 7)
  - [ ] Wrap device enumeration in try-catch with specific error messages
  - [ ] Handle NotAllowedError (permissions denied) with guidance to System Preferences
  - [ ] Handle NotFoundError (no devices) with fallback messaging
  - [ ] Handle NotReadableError (device busy) with retry suggestions
  - [ ] Create error logging utility for recording errors

- [ ] Write integration tests (AC: 8)
  - [ ] Create `recording.service.test.ts` in same directory
  - [ ] Mock desktopCapturer for primary screen test
  - [ ] Mock mediaDevices for default webcam test
  - [ ] Test fallback behavior when no devices available
  - [ ] Test error handling for permission denials
  - [ ] Verify RECORDING_DEFAULTS structure

- [ ] Implement logging system (AC: 9)
  - [ ] Add `[Recording]` prefix to all console.log statements
  - [ ] Log service initialization
  - [ ] Log auto-selected screen (name, id, resolution)
  - [ ] Log auto-selected webcam (name, id)
  - [ ] Log recording start/stop events with timestamps
  - [ ] Log any errors with stack traces

- [ ] Create recording state management (AC: 10)
  - [ ] Add private properties: `isRecording`, `currentMode`, `outputFiles`
  - [ ] Initialize state in constructor
  - [ ] Add getter methods for state access
  - [ ] Add state update methods (private)
  - [ ] Ensure state resets properly after stop

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

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
