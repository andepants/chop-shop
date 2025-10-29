# Story 5.5: Picture-in-Picture Recording

Status: Approved

## Story

As a content creator,
I want to record my screen and webcam simultaneously with a single click,
so that I can create tutorials with my face visible without complex setup.

## Acceptance Criteria

1. RecordingService.startRecording() handles 'pip' mode by orchestrating both screen and webcam recording
2. Both screen and webcam sources auto-selected (primary screen + default webcam)
3. Two separate MediaRecorder instances created and started simultaneously
4. Screen recording: 1920x1080, 30fps, 8Mbps with microphone audio
5. Webcam recording: 640x480, 30fps, 2.5Mbps with webcam audio
6. Both recordings start within 2 seconds of mode selection (NFR requirement)
7. Both recordings buffered independently with 5s timeslice for crash recovery
8. Recording stop triggers both recorders to stop simultaneously
9. Two output files saved: `screen-recording-[timestamp].webm` and `webcam-recording-[timestamp].webm`
10. RecordingService.stopRecording() returns both file paths with metadata
11. Graceful fallback: if webcam unavailable, fall back to screen-only with user notification
12. Error handling for partial failures (e.g., screen succeeds, webcam fails)
13. Comprehensive logging for PiP orchestration with [Recording] prefix

## Tasks / Subtasks

- [ ] Implement PiP mode initialization (AC: 1, 2)
  - [ ] Update RecordingService.startRecording() to handle mode='pip'
  - [ ] Call both getPrimaryScreen() and getDefaultWebcam()
  - [ ] Handle case where webcam unavailable → fall back to screen-only
  - [ ] Log PiP mode initiation
  - [ ] Set currentMode to 'pip'

- [ ] Acquire screen stream with audio (AC: 4)
  - [ ] Request primary screen via desktopCapturer
  - [ ] Get screen video stream via getUserMedia
  - [ ] Request microphone audio stream
  - [ ] Merge microphone audio into screen stream
  - [ ] Set screen constraints: 1920x1080, 30fps
  - [ ] Log screen source selection

- [ ] Acquire webcam stream with audio (AC: 5)
  - [ ] Request default webcam via getUserMedia
  - [ ] Include webcam audio in constraints
  - [ ] Set webcam constraints: 640x480, 30fps
  - [ ] Handle webcam unavailable error gracefully
  - [ ] Log webcam source selection

- [ ] Create dual MediaRecorder instances (AC: 3, 4, 5)
  - [ ] Create screenRecorder: MediaRecorder(screenStream)
  - [ ] Set screen mimeType: video/webm;codecs=vp9, videoBitsPerSecond: 8000000
  - [ ] Create webcamRecorder: MediaRecorder(webcamStream)
  - [ ] Set webcam mimeType: video/webm;codecs=vp9, videoBitsPerSecond: 2500000
  - [ ] Verify both codecs supported
  - [ ] Store both recorder instances in service state
  - [ ] Log both MediaRecorder configurations

- [ ] Implement synchronized start (AC: 6, 7)
  - [ ] Call screenRecorder.start(5000) and webcamRecorder.start(5000)
  - [ ] Start both recorders as close to simultaneously as possible
  - [ ] Set up ondataavailable for both recorders
  - [ ] Buffer screen chunks in screenChunks array
  - [ ] Buffer webcam chunks in webcamChunks array
  - [ ] Update isRecording state to true
  - [ ] Log both recordings started with timestamp
  - [ ] Measure initialization time (<2s requirement)

- [ ] Implement synchronized stop (AC: 8)
  - [ ] Call both screenRecorder.stop() and webcamRecorder.stop()
  - [ ] Wait for both onstop events to complete
  - [ ] Stop all MediaStream tracks for both streams
  - [ ] Handle case where one recorder fails to stop
  - [ ] Log both recordings stopped

- [ ] Save both output files (AC: 9, 10)
  - [ ] Create Blobs from screenChunks and webcamChunks
  - [ ] Generate filenames with same timestamp: screen-recording-[ts].webm, webcam-recording-[ts].webm
  - [ ] Save screen recording to temp directory
  - [ ] Save webcam recording to temp directory
  - [ ] Calculate durations for both recordings
  - [ ] Extract resolutions from video track settings
  - [ ] Return RecordingOutput with both file paths and metadata
  - [ ] Log both file paths and sizes

- [ ] Implement graceful fallback (AC: 11)
  - [ ] Detect webcam unavailable during initialization
  - [ ] If webcam fails, proceed with screen-only recording
  - [ ] Display notification: "Webcam unavailable, recording screen only"
  - [ ] Switch mode internally to 'screen'
  - [ ] Log fallback decision
  - [ ] Ensure user gets clear feedback

- [ ] Handle partial recording failures (AC: 12)
  - [ ] If screen recording fails during capture, stop webcam and abort
  - [ ] If webcam recording fails during capture, continue screen-only
  - [ ] Display appropriate error messages for each failure case
  - [ ] Clean up any partial files
  - [ ] Log partial failure with details
  - [ ] Return available outputs even if one stream failed

- [ ] Implement comprehensive logging (AC: 13)
  - [ ] Log: "[Recording] Starting PiP recording..."
  - [ ] Log: "[Recording] Auto-selected: Screen 'Display' (id: X)"
  - [ ] Log: "[Recording] Auto-selected: Webcam 'Camera' (id: Y)"
  - [ ] Log: "[Recording] MediaRecorder (screen) started: 1920x1080 @ 30fps"
  - [ ] Log: "[Recording] MediaRecorder (webcam) started: 640x480 @ 30fps"
  - [ ] Log: "[Recording] Recording duration: Xs"
  - [ ] Log: "[Recording] Saved: /path/screen-recording-ts.webm (XXX MB)"
  - [ ] Log: "[Recording] Saved: /path/webcam-recording-ts.webm (XX MB)"
  - [ ] Log: "[Recording] Auto-import completed: 2 files added to timeline"

- [ ] Clean up resources properly
  - [ ] Stop all video tracks from both streams
  - [ ] Stop all audio tracks from both streams
  - [ ] Clear both chunk arrays
  - [ ] Reset recording state (isRecording, currentMode)
  - [ ] Clear outputFiles
  - [ ] Release references to MediaRecorder instances

- [ ] Write integration tests
  - [ ] Test PiP recording with mocked screen and webcam sources
  - [ ] Test synchronized start of both recorders
  - [ ] Test synchronized stop of both recorders
  - [ ] Test dual file output with correct naming
  - [ ] Test fallback to screen-only when webcam unavailable
  - [ ] Test partial failure handling (screen fails, webcam continues)
  - [ ] Test resource cleanup after stop
  - [ ] Verify state management throughout PiP flow

- [ ] Manual testing with real devices
  - [ ] Test PiP recording on macOS with screen and webcam
  - [ ] Verify both permission prompts appear (screen + camera)
  - [ ] Verify recording starts within 2 seconds
  - [ ] Verify both output files created and playable
  - [ ] Test fallback by disconnecting webcam mid-setup
  - [ ] Test with different webcam devices (built-in, USB)
  - [ ] Verify file sizes appropriate (~60MB screen + ~19MB webcam per minute)

## Dev Notes

**Architecture Alignment:**
- Implementation in `src/main/services/recording.service.ts` (extends Stories 5.3, 5.4)
- Combines screen capture (desktopCapturer) + webcam (getUserMedia)
- Two separate MediaRecorder instances, not composited during recording
- Temp storage for both files (architecture.md:288-289)

**Tech Spec References:**
- PiP is primary use case, highlighted in modal (tech-spec-epic-5.md:299)
- Workflow: Workflow 3 (tech-spec-epic-5.md:294-318)
- Two separate files saved, not composited (tech-spec-epic-5.md:309-310)
- Auto-placement on Track 1 + Track 2 happens in Story 5.7 (tech-spec-epic-5.md:311-316)
- Graceful degradation requirement (tech-spec-epic-5.md:381)

**Key Implementation Details:**
- **No Canvas compositing during recording** - saves two separate files
- Compositing happens later in timeline/preview (Story 4.7 from Epic 4)
- Same timestamp used for both files for easy matching
- Webcam overlay position (bottom-right, 20%, circle) applied in timeline, not during capture
- Microphone audio goes to screen recording, webcam audio to webcam recording

**Orchestration Flow:**
```
startRecording('pip')
  ↓
getPrimaryScreen() + getDefaultWebcam()
  ↓
Create screenStream + webcamStream
  ↓
Create screenRecorder + webcamRecorder
  ↓
Start both recorders simultaneously
  ↓
Buffer chunks independently
  ↓
stopRecording()
  ↓
Stop both recorders
  ↓
Save two separate .webm files
  ↓
Return { screen: path1, webcam: path2 }
```

**Fallback Logic:**
- If webcam unavailable at start → screen-only mode
- If webcam fails during recording → continue screen, notify user
- If screen fails during recording → abort completely (screen is primary)
- Clear user notifications for all fallback scenarios

**Testing Strategy:**
- Mock both device APIs for unit tests
- Test synchronized timing of start/stop operations
- Test fallback paths without requiring hardware removal
- Manual testing critical for real-world device behavior
- Test permission flows (both screen + camera prompts)

**Performance Considerations:**
- Combined: ~79MB per minute (60MB screen + 19MB webcam)
- Memory buffering safe for dual streams up to ~10 minutes
- Both recorders use 5s timeslice for crash recovery
- No performance impact vs single recording (separate encoding)

**Error Scenarios:**
- Screen permission denied → abort, clear message
- Webcam permission denied → fall back to screen-only
- No screen available → abort, error message
- No webcam available → fall back to screen-only
- Disk full during recording → abort both, clear message
- One recorder fails mid-capture → handle gracefully

### Project Structure Notes

**Files Modified:**
- `src/main/services/recording.service.ts` - Add PiP orchestration (~150 lines)

**No New Files:**
- All logic within existing RecordingService

**Testing Files:**
- Tests added to `src/main/services/recording.service.test.ts`

**Alignment with architecture.md:**
- Multi-source recording (line 293-295)
- Separate file storage per source (line 288-289)
- Compositing deferred to preview layer (line 227, 269)

### References

- [Source: docs/tech-spec-epic-5.md#Workflow 3: Picture-in-Picture Recording] - Complete PiP recording flow
- [Source: docs/tech-spec-epic-5.md#Recording Configuration (Auto-Defaults)] - PiP recording defaults
- [Source: docs/tech-spec-epic-5.md#Detailed Design:Services and Modules] - Dual MediaRecorder coordination
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Performance] - Concurrent recording without degradation
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Reliability] - Graceful degradation for webcam failures
- [Source: docs/tech-spec-epic-5.md#Workflows and Sequencing:Sequence Diagram] - PiP recording sequence
- [Source: docs/architecture.md#Media Capture] - Screen and webcam capture APIs
- [Source: docs/architecture.md#Epic to Architecture Mapping:Epic 4] - Multi-track timeline foundation

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
