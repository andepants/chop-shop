# Story 5.3: Screen-Only Recording

Status: drafted

## Story

As a content creator,
I want to record my screen with a single click,
so that I can capture tutorials and demonstrations quickly.

## Acceptance Criteria

1. RecordingService.startRecording() handles 'screen' mode with auto-selected primary screen
2. Screen capture stream obtained using Electron's desktopCapturer API with auto-selected source
3. Microphone audio automatically captured and mixed with screen recording
4. MediaRecorder instance created with WebM/VP9 codec at 1920x1080, 30fps, 8Mbps
5. Recording starts immediately after mode selection (within 2 seconds per NFR)
6. Recorded chunks buffered in memory during capture
7. All MediaStream tracks properly stopped and cleaned up on recording end
8. Recording saved to temp directory as `screen-recording-[timestamp].webm`
9. RecordingService.stopRecording() returns file path and metadata (duration, resolution)
10. Error handling for screen permission denial with actionable user message
11. Logging with [Recording] prefix for all screen recording operations
12. Recording state properly managed (isRecording flag, currentMode='screen')

## Tasks / Subtasks

- [ ] Implement screen source acquisition (AC: 1, 2)
  - [ ] Update RecordingService.startRecording() to handle mode='screen'
  - [ ] Call getPrimaryScreen() (from Story 5.1) to auto-select screen
  - [ ] Request screen stream via navigator.mediaDevices.getUserMedia with constraints
  - [ ] Set video constraints: mandatory chromeMediaSource='desktop', chromeMediaSourceId
  - [ ] Set resolution to 1920x1080, frameRate to 30
  - [ ] Handle NotAllowedError if screen recording permission denied
  - [ ] Log selected screen source (id, name)

- [ ] Implement microphone audio capture (AC: 3)
  - [ ] Request microphone stream via getUserMedia with audio constraints
  - [ ] Set audio constraints: echoCancellation, noiseSuppression, autoGainControl
  - [ ] Merge audio track into screen MediaStream
  - [ ] Handle case where microphone unavailable (proceed without audio)
  - [ ] Log audio source selection
  - [ ] Test audio sync with video

- [ ] Create MediaRecorder for screen (AC: 4)
  - [ ] Instantiate MediaRecorder with screen stream
  - [ ] Set mimeType to 'video/webm;codecs=vp9' (or vp8 if vp9 unavailable)
  - [ ] Set videoBitsPerSecond to 8000000 (8 Mbps)
  - [ ] Set audioBitsPerSecond appropriately for mic audio
  - [ ] Verify codec support with MediaRecorder.isTypeSupported()
  - [ ] Log MediaRecorder configuration

- [ ] Implement recording start flow (AC: 5, 6)
  - [ ] Call mediaRecorder.start() with timeslice (5000ms for periodic flush)
  - [ ] Set up ondataavailable handler to collect chunks
  - [ ] Buffer chunks in array during recording
  - [ ] Update isRecording state to true
  - [ ] Set currentMode to 'screen'
  - [ ] Log recording start with timestamp
  - [ ] Measure and log initialization latency (<2s requirement)

- [ ] Implement recording stop flow (AC: 7, 8, 9)
  - [ ] Call mediaRecorder.stop() on stopRecording()
  - [ ] Wait for onstop event to complete
  - [ ] Stop all MediaStream tracks (video and audio)
  - [ ] Create Blob from buffered chunks
  - [ ] Generate filename: `screen-recording-${Date.now()}.webm`
  - [ ] Call saveRecording() to write Blob to temp directory
  - [ ] Calculate recording duration from timestamps
  - [ ] Extract resolution from video track settings
  - [ ] Return RecordingOutput with file path and metadata
  - [ ] Clear chunks array and reset state
  - [ ] Log file path, size, and duration

- [ ] Implement file writing logic (AC: 8)
  - [ ] Create saveRecording(chunks, filename) private method
  - [ ] Ensure recording temp directory exists (from Story 5.1)
  - [ ] Build full file path: path.join(tempDir, filename)
  - [ ] Convert Blob to Buffer for Node.js fs
  - [ ] Write file using fs.promises.writeFile()
  - [ ] Handle ENOSPC (disk full) with user message
  - [ ] Log file write success with file size
  - [ ] Return absolute file path

- [ ] Implement error handling (AC: 10)
  - [ ] Wrap all device access in try-catch
  - [ ] Handle NotAllowedError: "Screen recording permission denied. Please enable in System Preferences > Security & Privacy > Screen Recording"
  - [ ] Handle NotFoundError: "No screen sources available"
  - [ ] Handle NotReadableError: "Screen capture device busy or unavailable"
  - [ ] Handle MediaRecorder errors via onerror handler
  - [ ] Handle file write errors with disk space checks
  - [ ] Display user-friendly error messages via error dialog
  - [ ] Log all errors with full context

- [ ] Implement comprehensive logging (AC: 11)
  - [ ] Log: "[Recording] Starting screen-only recording..."
  - [ ] Log: "[Recording] Auto-selected: Screen 'Display Name' (id: xxx)"
  - [ ] Log: "[Recording] MediaRecorder (screen) started: 1920x1080 @ 30fps"
  - [ ] Log: "[Recording] Recording duration: Xs"
  - [ ] Log: "[Recording] Saved: /path/to/screen-recording-timestamp.webm (XX MB)"
  - [ ] Log any errors with stack traces
  - [ ] Ensure all logs prefixed with [Recording]

- [ ] Manage recording state (AC: 12)
  - [ ] Set isRecording = true on start
  - [ ] Set currentMode = 'screen' on start
  - [ ] Update outputFiles['screen'] with path on stop
  - [ ] Reset isRecording = false on stop
  - [ ] Clear currentMode on stop
  - [ ] Ensure state consistency across error paths

- [ ] Write integration tests
  - [ ] Test screen-only recording flow end-to-end with mocks
  - [ ] Test auto-selected screen source
  - [ ] Test microphone audio capture and merging
  - [ ] Test file output with correct naming and metadata
  - [ ] Test error handling for permission denials
  - [ ] Test MediaStream cleanup on stop
  - [ ] Verify state management throughout lifecycle

- [ ] Test with real recording
  - [ ] Manually test screen recording on macOS
  - [ ] Verify permission prompt appears on first run
  - [ ] Verify recording starts within 2 seconds
  - [ ] Verify output file playable in VLC/QuickTime
  - [ ] Verify audio synchronized with video
  - [ ] Verify file size reasonable (~60MB per minute at 8Mbps)
  - [ ] Test error cases (deny permissions, no disk space)

## Dev Notes

**Architecture Alignment:**
- Implementation in `src/main/services/recording.service.ts` (Story 5.1 foundation)
- Screen capture uses Electron desktopCapturer (architecture.md:293)
- MediaRecorder API for WebM recording (architecture.md:267)
- Temp storage at `os.tmpdir()/chop-shop/recordings/` (architecture.md:288-289)

**Tech Spec References:**
- Screen defaults: 1920x1080, 30fps, 8Mbps (tech-spec-epic-5.md:133-136)
- Workflow: Workflow 1 (tech-spec-epic-5.md:260-275)
- Start latency <2s (tech-spec-epic-5.md:357)
- Auto-selected primary screen (tech-spec-epic-5.md:22, 266)
- Recording saved to WebM format (tech-spec-epic-5.md:154)

**Key Implementation Details:**
- Auto-select primary screen = first screen from desktopCapturer.getSources()
- No user choice, no preview window
- Microphone audio auto-selected and mixed into stream
- Chunks buffered with 5s timeslice for crash recovery
- All tracks stopped on completion to release camera/mic

**Testing Strategy:**
- Mock desktopCapturer.getSources() to return fake screen source
- Mock MediaRecorder for recording flow tests
- Mock fs for file writing tests
- Manual testing required for actual screen capture and playback
- Test error paths: permissions, no devices, disk full

**Error Handling Priority:**
- Permission denial most common → clear guidance to System Preferences
- No devices → check for display issues
- Device busy → rare, suggest restart
- Disk space → check before start if possible

**Performance Considerations:**
- 8Mbps at 1080p → ~60MB per minute
- Memory buffering safe for ~10 minute recordings
- Periodic 5s flush prevents data loss on crash
- WebM/VP9 efficient for screen content (text, UI)

### Project Structure Notes

**Files Modified:**
- `src/main/services/recording.service.ts` - Main implementation (~150 lines added)

**No New Files:**
- All functionality within existing RecordingService from Story 5.1

**Testing Files:**
- Tests added to `src/main/services/recording.service.test.ts`

**Alignment with architecture.md:**
- Service-based implementation (line 82-88)
- Main process only, no renderer (line 274)
- Follows ffmpeg.service pattern for media operations

### References

- [Source: docs/tech-spec-epic-5.md#Workflow 1: Screen-Only Recording] - Complete screen recording flow
- [Source: docs/tech-spec-epic-5.md#Recording Configuration (Auto-Defaults)] - Screen recording defaults
- [Source: docs/tech-spec-epic-5.md#APIs and Interfaces:Main Process Recording Service API] - startRecording, stopRecording methods
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Performance] - Recording start latency <2s
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Security] - Permission handling, MediaStream cleanup
- [Source: docs/architecture.md#Media Capture] - desktopCapturer and MediaRecorder APIs
- [Source: docs/architecture.md#File System] - Temp storage patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
