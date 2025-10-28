# Story 4.4: Webcam Recording

Status: drafted

## Story

As a content creator,
I want to record from my webcam,
so that I can capture talking head videos or reactions.

## Acceptance Criteria

1. Recording setup modal includes "Webcam Only" mode option
2. User can select from available webcam devices
3. Live webcam preview shown in setup modal
4. Audio recording from selected microphone included
5. Recording starts after countdown (3-2-1)
6. Stop button visible during recording to end capture
7. Completed recording automatically imports to media library and timeline

## Tasks / Subtasks

- [ ] Task 1: Extend recordingStore for webcam state (AC: 2, 4)
  - [ ] Update recordingStore to use `selectedWebcam: string | null` (device ID only, not full object)
  - [ ] Add state: `selectedMicrophoneDevice` (string | null) for microphone device ID
  - [ ] Add state: `webcamStream` (MediaStream | null)
  - [ ] Implement `setWebcamDevice(deviceId: string)` action - stores ID only
  - [ ] Implement `setMicrophoneDevice(deviceId: string)` action - stores ID only
  - [ ] Implement `setWebcamStream(stream)` action
  - [ ] Write unit tests for webcam state management

- [ ] Task 2: Use unified get-sources IPC channel (AC: 2)
  - [ ] Update `src/main/ipc/recording.handlers.ts`
  - [ ] Use existing unified `get-sources` IPC channel from Story 4.3
  - [ ] Extract webcams from response: `response.data.webcams`
  - [ ] Webcam sources include deviceId (string) and label
  - [ ] Store only deviceId (string) when user selects webcam
  - [ ] Handle permission errors (webcam/microphone not allowed)
  - [ ] Handle case: no webcam devices found

- [ ] Task 3: Add "Webcam Only" mode to RecordingModal (AC: 1)
  - [ ] Update `src/renderer/src/components/Recording/RecordingModal.tsx`
  - [ ] Add "Webcam Only" tab in mode selector
  - [ ] Show webcam-specific UI when mode === 'webcam-only'
  - [ ] Hide screen source selector (not needed for webcam-only mode)
  - [ ] Show webcam device selector and microphone selector
  - [ ] Show large webcam preview (640x480px)

- [ ] Task 4: Create WebcamSelector component (AC: 2)
  - [ ] Create `src/renderer/src/components/Recording/WebcamSelector.tsx`
  - [ ] Call IPC `getVideoDevices()` on mount
  - [ ] Render dropdown of available webcam devices
  - [ ] Display device label (e.g., "FaceTime HD Camera", "USB Webcam")
  - [ ] Handle case: only one webcam (auto-select, show "Using: [name]")
  - [ ] Handle case: no webcams found (show error, disable recording)
  - [ ] On selection change: update recordingStore, refresh preview

- [ ] Task 5: Implement live webcam preview (AC: 3)
  - [ ] Create `src/renderer/src/components/Recording/WebcamPreview.tsx`
  - [ ] Use getUserMedia() with video: {deviceId: selectedWebcamDevice.deviceId}
  - [ ] Render <video> element with webcam stream (640x480px, 4:3 or 16:9 aspect ratio)
  - [ ] Apply mirrored/flipped view (CSS: scaleX(-1)) for natural appearance
  - [ ] Show "Preview" label and device name above video
  - [ ] Handle loading state (show spinner while initializing stream)
  - [ ] Handle error state (permission denied, device disconnected)
  - [ ] Stop stream when modal closes or mode changes

- [ ] Task 6: Add microphone selector and audio level indicator (AC: 4)
  - [ ] Update `AudioSourceSelector` component to support webcam mode
  - [ ] Show dropdown of available microphone devices
  - [ ] Call IPC `getAudioInputDevices()` to populate list
  - [ ] Add live audio level indicator (visual bar, updates in real-time)
  - [ ] Use Web Audio API to analyze microphone input level
  - [ ] Show green (good), yellow (low), red (too loud) visual feedback
  - [ ] Default to system default microphone if multiple available

- [ ] Task 7: Implement webcam recording capture (AC: 5, 6)
  - [ ] Use getUserMedia() with both video and audio constraints:
    - video: {deviceId: selectedWebcam, width: 1280, height: 720, frameRate: 30}
    - audio: {deviceId: selectedMicrophoneDevice}
  - [ ] Capture at 30fps with 720p resolution (NFR line 449)
  - [ ] Create MediaRecorder instance with WebM container (VP9 + Opus)
  - [ ] Store chunks in memory array during recording
  - [ ] Update recording duration every second in recordingStore
  - [ ] Show recording indicator: red dot + duration timer (e.g., "00:15")

- [ ] Task 8: Add Stop Recording button (AC: 6)
  - [ ] When recording starts, show floating "Stop Recording" button
  - [ ] Position: top-right corner of screen, always visible
  - [ ] Button styling: large red button with stop icon (square)
  - [ ] Add keyboard shortcut: Cmd/Ctrl + Shift + R to stop
  - [ ] On click: call `stopRecording()` in recordingStore
  - [ ] Disable button during saving phase (prevent double-click)
  - [ ] Show "Saving..." message after stop clicked

- [ ] Task 9: Save recorded webcam file (AC: 7)
  - [ ] On recording stop, create Blob from recorded chunks
  - [ ] Generate filename: `webcam-recording-YYYY-MM-DD-HHmmss.webm`
  - [ ] Save to temp directory: `os.tmpdir()/chop-shop/recordings/`
  - [ ] Call IPC handler `saveRecording(blob, filename)`
  - [ ] Return file path to renderer

- [ ] Task 10: Auto-import to media library and timeline (AC: 7)
  - [ ] After save completes, add file to mediaStore
  - [ ] Generate thumbnail from first frame of webcam recording
  - [ ] Add clip to media library with metadata (duration, resolution, filename)
  - [ ] Automatically add clip to timeline Track 1 at end
  - [ ] Show success notification: "Webcam recording saved and added to timeline"
  - [ ] Close recording modal automatically

- [ ] Task 11: Handle edge cases and error scenarios
  - [ ] No webcam found: show error "No webcam detected", disable recording
  - [ ] Permission denied (webcam): show modal with instructions to grant permission
  - [ ] Permission denied (microphone): allow recording video-only (warn user)
  - [ ] Webcam disconnected during preview: show error, re-enumerate devices
  - [ ] Webcam disconnected during recording: stop recording, save partial file
  - [ ] Multiple webcams: allow user to switch between them
  - [ ] Low light conditions: show warning "Low light detected" (optional)
  - [ ] Audio-only recording: not supported in webcam mode (require video device)
  - [ ] Memory management: limit recording to 30 minutes (prevent excessive memory usage)
  - [ ] Blob size exceeds 2GB: show error, recommend shorter recordings

- [ ] Task 11: NFR Validation
  - [ ] Verify webcam capture at 30fps with 720p resolution (NFR line 449)
  - [ ] Test frame rate consistency over 5-minute recording
  - [ ] Validate audio sync with video (no drift)
  - [ ] Measure getUserMedia initialization time (< 1 second target)

- [ ] Task 12: Testing and validation
  - [ ] Test opening webcam mode from modal
  - [ ] Test unified get-sources IPC returns webcams
  - [ ] Test selecting webcam device by ID only (with multiple webcams if available)
  - [ ] Test live preview displays correctly
  - [ ] Test microphone selection and audio level indicator
  - [ ] Test starting recording after countdown
  - [ ] Test stopping recording with button
  - [ ] Test 30fps capture at 720p resolution
  - [ ] Test auto-import to media library and timeline
  - [ ] Test permission denied for webcam/microphone
  - [ ] Test webcam disconnected during recording
  - [ ] Test with external USB webcam (not just built-in)

## Traceability

**Tech Spec References:**
- RecordingState.selectedWebcam: string | null (device ID only, line 131)
- Source interface from get-sources IPC channel (lines 113-119)
- NFR webcam capture requirements: 30fps, 720p (line 449)

**IPC Contract Changes:**
- Use unified get-sources channel (returns webcams array)
- Store device IDs as strings, not full device objects
- Consistent with Story 4.3 architecture

**Architecture References:**
- ADR-005: Renderer process handles getUserMedia webcam capture
- MediaRecorder for WebM encoding (VP9 + Opus)
- Audio mixing with Web Audio API

## Dev Notes

### Webcam Recording Best Practices

**Webcam-Only Mode Use Cases**:
- Talking head videos (vlog-style content)
- Reaction videos
- Webcam-only tutorials
- Voiceover recordings with face

**Device Selection UX**:
- Auto-select if only one webcam (reduce friction)
- Dropdown for multiple webcams (show device labels)
- Same pattern for microphones
- Mirror preview (scaleX(-1)) for natural webcam appearance

**Live Preview Benefits**:
- Confirms camera is working
- Lets user check framing, lighting, background
- Shows exactly what will be recorded
- Standard in all webcam recording apps (Zoom, Loom, etc.)

**Audio Level Indicator** (Professional recording standard):
- Visual feedback prevents silent recordings
- Green = good level (-12dB to -6dB)
- Yellow = too quiet (< -12dB)
- Red = clipping/distortion (> -6dB)
- Used in OBS, Camtasia, professional DAWs

### Architecture Patterns and Constraints

**Recording Architecture** (ADR-005):
- Webcam capture happens in renderer process (getUserMedia requires DOM)
- Device enumeration via IPC bridge to main process
- MediaRecorder stores chunks in renderer memory
- File save operation via IPC to main process

**Media Constraints**:
- Video: 1280x720 (720p) for balance of quality and file size
- Frame rate: 30fps (sufficient for talking head videos)
- Audio: 48kHz, mono (stereo optional for advanced users)
- Container: WebM (VP9 video + Opus audio)

**State Management** (ADR-001):
- `recordingStore.ts` manages webcam state
- `mediaStore.ts` receives completed recording
- `timelineStore.ts` receives auto-added clip

**File Storage**:
- Temp directory: `os.tmpdir()/chop-shop/recordings/`
- Filename: `webcam-recording-YYYY-MM-DD-HHmmss.webm`
- Auto-cleanup old recordings (keep last 10, delete older)

### Edge Cases and Error Handling

1. **No Webcam Detected**: Show error message, link to troubleshooting guide
2. **Permission Denied (Webcam)**: Show modal with instructions (System Preferences → Privacy → Camera)
3. **Permission Denied (Microphone)**: Warn user, allow video-only recording
4. **Device Disconnected During Preview**: Re-enumerate devices, show reconnect prompt
5. **Device Disconnected During Recording**: Auto-stop recording, save partial file
6. **Multiple Webcams**: Allow switching between devices, update preview immediately
7. **Audio-Only Not Supported**: Webcam mode requires video device (use separate audio recorder for audio-only)
8. **Low Frame Rate**: If webcam reports < 20fps, show warning
9. **Memory Limit**: Stop recording after 30 minutes (prevent crash), show warning at 25 minutes
10. **Blob > 2GB**: Show error, recommend shorter recordings or lower resolution
11. **File Save Failure**: Show error, offer retry, keep blob in memory until successful save
12. **Mirrored Preview**: Webcam preview mirrored (user sees themselves as in mirror), but recorded video not mirrored (correct orientation for viewers)

### macOS Permissions

**Required Permissions**:
- Camera: System Preferences → Security & Privacy → Camera → Enable Chop Shop
- Microphone: System Preferences → Security & Privacy → Microphone → Enable Chop Shop

**Permission Request Flow**:
1. Call getUserMedia({video: true, audio: true})
2. macOS shows permission dialog (first time only)
3. If denied: show error modal with instructions
4. User must manually enable in System Preferences

### Project Structure Notes

**New Files Created**:
- `src/renderer/src/components/Recording/WebcamSelector.tsx`
- `src/renderer/src/components/Recording/WebcamPreview.tsx`
- `src/renderer/src/components/Recording/AudioLevelIndicator.tsx`

**Files Modified**:
- `src/renderer/src/components/Recording/RecordingModal.tsx` (add Webcam Only tab)
- `src/renderer/src/components/Recording/AudioSourceSelector.tsx` (support microphone selection)
- `src/renderer/src/store/recordingStore.ts` (add webcam state)
- `src/main/ipc/recording.handlers.ts` (add webcam enumeration handlers)

**Component Hierarchy**:
```
RecordingModal (Webcam Mode)
├── Tabs
│   ├── Screen Only (Story 4.3)
│   ├── Webcam Only (this story)
│   └── Picture-in-Picture (Story 4.5)
├── WebcamSelector (device dropdown)
├── WebcamPreview (live preview, 640x480px)
├── AudioSourceSelector (microphone dropdown)
├── AudioLevelIndicator (real-time audio meter)
└── Button (Start Recording)
    └── Countdown (3-2-1)
```

### Testing Standards Summary

From `testing-strategy.md`:
- Unit tests for webcam state management
- Integration test: select webcam, start recording, stop, verify auto-import
- Integration test: permission denied error handling
- Manual test: actual webcam recording on macOS (verify quality, audio sync)
- Edge case test: no webcam, device disconnected, memory limit

### References

- [Source: docs/epics.md#Story 4.4]
- [Source: docs/PRD.md#FR014 - Webcam recording]
- [Source: docs/architecture.md#ADR-005 - Recording with getUserMedia]
- [Source: docs/architecture.md#Recording Architecture]
- [Source: docs/tech-spec-epic-4.md#Webcam recording using MediaRecorder]
- [OBS Studio: Live preview with audio level meters]
- [Zoom/Loom: Mirrored webcam preview for user comfort]

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
