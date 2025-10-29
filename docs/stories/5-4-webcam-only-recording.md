# Story 5.4: Webcam-Only Recording

Status: drafted

## Story

As a content creator,
I want to record from my webcam with a single click,
so that I can capture talking head videos or reactions quickly.

## Acceptance Criteria

1. RecordingService.startRecording() handles 'webcam' mode with auto-selected default webcam
2. Webcam video stream obtained using getUserMedia with auto-selected videoinput device
3. Webcam audio automatically captured from same device or default microphone
4. MediaRecorder instance created with WebM/VP9 codec at 640x480, 30fps, 2.5Mbps
5. Recording starts immediately after mode selection (within 2 seconds per NFR)
6. Recorded chunks buffered in memory during capture with periodic flush
7. All MediaStream tracks properly stopped and cleaned up on recording end
8. Recording saved to temp directory as `webcam-recording-[timestamp].webm`
9. RecordingService.stopRecording() returns file path and metadata (duration, resolution)
10. Error handling for webcam/microphone permission denial with actionable user message
11. Graceful degradation if webcam unavailable (clear error, no crash)
12. Logging with [Recording] prefix for all webcam recording operations

## Tasks / Subtasks

- [ ] Implement webcam source acquisition (AC: 1, 2)
  - [ ] Update RecordingService.startRecording() to handle mode='webcam'
  - [ ] Call getDefaultWebcam() (from Story 5.1) to auto-select webcam
  - [ ] Request webcam stream via navigator.mediaDevices.getUserMedia
  - [ ] Set video constraints: deviceId, width: 640, height: 480, frameRate: 30
  - [ ] Handle NotAllowedError if camera permission denied
  - [ ] Handle NotFoundError if no webcam devices available
  - [ ] Log selected webcam device (id, label)

- [ ] Implement audio capture (AC: 3)
  - [ ] Include audio: true in getUserMedia constraints
  - [ ] Set audio constraints: echoCancellation, noiseSuppression
  - [ ] Verify audio track included in MediaStream
  - [ ] Handle case where audio unavailable (proceed video-only)
  - [ ] Log audio source selection
  - [ ] Test audio/video sync

- [ ] Create MediaRecorder for webcam (AC: 4)
  - [ ] Instantiate MediaRecorder with webcam stream
  - [ ] Set mimeType to 'video/webm;codecs=vp9' (fallback to vp8)
  - [ ] Set videoBitsPerSecond to 2500000 (2.5 Mbps)
  - [ ] Set audioBitsPerSecond appropriately
  - [ ] Verify codec support with MediaRecorder.isTypeSupported()
  - [ ] Log MediaRecorder configuration

- [ ] Implement recording start flow (AC: 5, 6)
  - [ ] Call mediaRecorder.start() with 5000ms timeslice
  - [ ] Set up ondataavailable handler to collect chunks
  - [ ] Buffer chunks in array during recording
  - [ ] Update isRecording state to true
  - [ ] Set currentMode to 'webcam'
  - [ ] Log recording start with timestamp
  - [ ] Measure and log initialization latency (<2s)

- [ ] Implement recording stop flow (AC: 7, 8, 9)
  - [ ] Call mediaRecorder.stop() on stopRecording()
  - [ ] Wait for onstop event
  - [ ] Stop all MediaStream tracks (video and audio)
  - [ ] Create Blob from buffered chunks
  - [ ] Generate filename: `webcam-recording-${Date.now()}.webm`
  - [ ] Call saveRecording() to write Blob to temp directory
  - [ ] Calculate recording duration from timestamps
  - [ ] Extract resolution from video track settings (should be 640x480)
  - [ ] Return RecordingOutput with file path and metadata
  - [ ] Clear chunks array and reset state

- [ ] Implement error handling (AC: 10, 11)
  - [ ] Wrap all device access in try-catch
  - [ ] Handle NotAllowedError: "Camera/microphone permission denied. Please enable in System Preferences > Security & Privacy > Camera"
  - [ ] Handle NotFoundError: "No webcam detected. Please connect a webcam device."
  - [ ] Handle NotReadableError: "Webcam is busy or in use by another application"
  - [ ] Handle OverconstrainedError: "Webcam doesn't support requested resolution"
  - [ ] Handle MediaRecorder errors via onerror handler
  - [ ] Display user-friendly error messages
  - [ ] Log all errors with full context
  - [ ] Ensure no crashes on device unavailability

- [ ] Implement comprehensive logging (AC: 12)
  - [ ] Log: "[Recording] Starting webcam-only recording..."
  - [ ] Log: "[Recording] Auto-selected: Webcam 'Device Name' (id: xxx)"
  - [ ] Log: "[Recording] MediaRecorder (webcam) started: 640x480 @ 30fps"
  - [ ] Log: "[Recording] Recording duration: Xs"
  - [ ] Log: "[Recording] Saved: /path/to/webcam-recording-timestamp.webm (XX MB)"
  - [ ] Log any errors with stack traces
  - [ ] Ensure consistent [Recording] prefix

- [ ] Manage recording state
  - [ ] Set isRecording = true on start
  - [ ] Set currentMode = 'webcam' on start
  - [ ] Update outputFiles['webcam'] with path on stop
  - [ ] Reset isRecording = false on stop
  - [ ] Clear currentMode on stop
  - [ ] Handle state cleanup on errors

- [ ] Write integration tests
  - [ ] Test webcam-only recording flow with mocks
  - [ ] Test auto-selected webcam device
  - [ ] Test audio capture from webcam
  - [ ] Test file output with correct naming (webcam-recording-*)
  - [ ] Test error handling for no webcam
  - [ ] Test error handling for permission denial
  - [ ] Test error handling for device busy
  - [ ] Verify MediaStream cleanup
  - [ ] Verify state management

- [ ] Manual testing
  - [ ] Test webcam recording on macOS
  - [ ] Verify permission prompt on first run
  - [ ] Verify recording starts within 2 seconds
  - [ ] Verify output file playable in VLC/QuickTime
  - [ ] Verify video shows webcam feed
  - [ ] Verify audio synchronized with video
  - [ ] Test with USB webcam and built-in FaceTime camera
  - [ ] Test error cases (deny permissions, unplug webcam during recording)

## Dev Notes

**Architecture Alignment:**
- Implementation in `src/main/services/recording.service.ts` (extends Story 5.1)
- Uses getUserMedia for webcam access (architecture.md:294)
- MediaRecorder API for WebM recording (architecture.md:267)
- Same temp storage as screen recording (architecture.md:288-289)

**Tech Spec References:**
- Webcam defaults: 640x480, 30fps, 2.5Mbps (tech-spec-epic-5.md:138-144)
- Workflow: Workflow 2 (tech-spec-epic-5.md:277-292)
- Auto-selected default webcam (tech-spec-epic-5.md:23, 283)
- Graceful degradation on unavailable (tech-spec-epic-5.md:381)

**Key Implementation Details:**
- Auto-select = first videoinput device from enumerateDevices()
- No device selection UI, no preview
- Lower resolution and bitrate than screen (640x480 vs 1920x1080)
- Audio from webcam mic or system default
- Same chunk buffering strategy as screen recording

**Testing Strategy:**
- Mock navigator.mediaDevices.getUserMedia for unit tests
- Mock enumerateDevices() for device selection
- Test both built-in and external webcams manually
- Verify graceful handling when no webcam present
- Test permission flows on fresh macOS install

**Common Webcam Errors:**
- NotAllowedError: User denied camera permission
- NotFoundError: No camera hardware detected
- NotReadableError: Camera in use by another app (Zoom, etc.)
- OverconstrainedError: Requested resolution not supported

**Performance Considerations:**
- 2.5Mbps at 640x480 → ~19MB per minute
- Lower bitrate appropriate for webcam (less detail than screen)
- Smaller resolution faster to encode
- Circular shape applied later in timeline, not during recording

**Webcam-Specific Notes:**
- FaceTime HD Camera on MacBook Pro is common default
- USB webcams typically enumerate after built-in
- getDefaultWebcam() should prefer built-in if available
- Some webcams don't support 640x480 exactly (handle OverconstrainedError)

### Project Structure Notes

**Files Modified:**
- `src/main/services/recording.service.ts` - Add webcam mode handling (~100 lines)

**No New Files:**
- Webcam logic added to existing RecordingService

**Testing Files:**
- Tests added to `src/main/services/recording.service.test.ts`

**Alignment with architecture.md:**
- getUserMedia for webcam (line 294)
- Service-based architecture (line 82-88)
- Main process for media operations (line 274)

### References

- [Source: docs/tech-spec-epic-5.md#Workflow 2: Webcam-Only Recording] - Complete webcam recording flow
- [Source: docs/tech-spec-epic-5.md#Recording Configuration (Auto-Defaults)] - Webcam recording defaults
- [Source: docs/tech-spec-epic-5.md#APIs and Interfaces:Main Process Recording Service API] - getDefaultWebcam method
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Reliability] - Graceful degradation for unavailable webcam
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Security] - Microphone permissions
- [Source: docs/architecture.md#Media Capture] - getUserMedia API for webcam
- [Source: docs/architecture.md#File System] - Temp storage patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
