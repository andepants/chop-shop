# Story 4.6: Recording Stop and Auto-Import

Status: ready-for-dev

## Story

As a content creator,
I want my recording to stop cleanly and automatically appear in my timeline,
so that I can immediately begin editing without manual import.

## Acceptance Criteria

1. "Stop Recording" button accessible during any recording mode
2. Clicking Stop ends recording immediately and saves files
3. Recording files processed and optimized for editing (codec conversion if needed)
4. Completed recording(s) automatically added to media library with thumbnails
5. For PiP recordings, both clips automatically placed on correct timeline tracks
6. Recording files stored in organized temp directory structure
7. User sees success notification with recording duration

## Tasks / Subtasks

- [ ] Task 1: Create persistent Stop Recording button (AC: 1)
  - [ ] Create `src/renderer/src/components/Recording/StopRecordingButton.tsx`
  - [ ] Render floating button: top-right corner, 60px height, red background
  - [ ] Show button only when `isRecording === true`
  - [ ] Display stop icon (square) + "Stop" text
  - [ ] Display live duration timer: "Recording: 00:15"
  - [ ] Add pulsing animation to indicate active recording
  - [ ] Position above all other UI elements (z-index: 9999)
  - [ ] Keyboard shortcut: Cmd/Ctrl + Shift + R to stop

- [ ] Task 2: Implement stop-recording IPC channel (AC: 2)
  - [ ] Update `src/renderer/src/store/recordingStore.ts`
  - [ ] Implement `stopRecording()` action:
    1. Stop MediaRecorder instance(s) (call `.stop()`)
    2. Set `isRecording = false`
    3. Wait for `onstop` event (ensures all chunks received)
    4. Call IPC `stop-recording` channel (tech spec lines 237-248)
  - [ ] Main process handles file save (NOT renderer - architecture change)
  - [ ] IPC returns `IPCResponse<{ filePaths: string[] }>` with saved file paths
  - [ ] Update recordingStore.outputFiles with returned paths
  - [ ] Handle PiP mode: stop both screen and webcam recorders
  - [ ] Prevent double-stop (disable button during save)

- [ ] Task 3: Move file save responsibility to main process (AC: 6)
  - [ ] ARCHITECTURE CHANGE: Main process handles all file save operations
  - [ ] Update `src/main/services/file.service.ts`
  - [ ] Create recording directory structure:
    ```
    os.tmpdir()/chop-shop/recordings/
    ├── YYYY-MM-DD/
    │   ├── screen-recording-HHmmss.webm
    │   ├── webcam-recording-HHmmss.webm
    │   └── ...
    ```
  - [ ] Group recordings by date for organization
  - [ ] Implement stop-recording IPC handler in main process:
    - Receives blob data from renderer
    - Generates filename with timestamp
    - Writes to file system using Node.js fs module
    - Returns saved file path(s) in IPCResponse
  - [ ] Handle disk space error (show error if insufficient space)

- [ ] Task 4: Implement codec detection and optimization (AC: 3)
  - [ ] Detect recorded file codec using ffprobe (via FFmpeg)
  - [ ] If codec is h264/h265 (already optimized): skip conversion
  - [ ] If codec is VP8/VP9 (WebM default): convert to h264 for better editor compatibility
  - [ ] Use FFmpeg for conversion: `ffmpeg -i input.webm -c:v libx264 -preset fast output.mp4`
  - [ ] Show progress during conversion: "Optimizing recording... 45%"
  - [ ] Conversion should complete in < 10% of recording duration (e.g., 6 sec for 1 min recording)
  - [ ] Optional: Add preference to skip conversion (for users who prefer WebM)

- [ ] Task 5: Generate thumbnails for recorded clips (AC: 4)
  - [ ] Update `src/main/services/thumbnail.service.ts`
  - [ ] Extract first frame of recorded video as thumbnail
  - [ ] Use FFmpeg: `ffmpeg -i input.webm -ss 00:00:01 -vframes 1 thumb.jpg`
  - [ ] Save thumbnails to: `os.tmpdir()/chop-shop/thumbnails/`
  - [ ] Return thumbnail path to renderer
  - [ ] Handle thumbnail generation failure (use default camera icon)

- [ ] Task 6: Auto-import to media library (AC: 4)
  - [ ] After save and thumbnail generation complete:
    1. Add file to `mediaStore` with metadata:
       - id (UUID)
       - filename
       - path (temp directory path)
       - duration (from MediaRecorder metadata)
       - resolution (from video track settings)
       - thumbnail (generated thumb path)
       - type: 'recording'
       - recordedAt: timestamp
    2. Trigger media library UI update
  - [ ] Show new clip at top of media library (most recent first)
  - [ ] Highlight newly added clip (pulse animation)

- [ ] Task 7: Auto-add to timeline (AC: 5)
  - [ ] After media library import:
    - **Screen-only recording**: Add to Track 1 at end of timeline
    - **Webcam-only recording**: Add to Track 1 at end of timeline
    - **PiP recording**: Add screen to Track 1, webcam to Track 2 (both at same start time)
  - [ ] Calculate insertion point: timeline end position (max clip endTime + 0)
  - [ ] Create TimelineClip object(s) with:
    - clipId (reference to media library)
    - trackId (1 or 2)
    - startTime (insertion point)
    - duration (recording duration)
    - inPoint: 0, outPoint: duration (full clip, no trim)
  - [ ] For PiP: store pipMetadata (position, size) from recordingStore
  - [ ] Trigger timeline re-render

- [ ] Task 8: Display success notification (AC: 7)
  - [ ] Create `src/renderer/src/components/shared/Toast.tsx` (notification component)
  - [ ] Use shadcn/ui Toast component
  - [ ] Show success toast with:
    - Title: "Recording Complete"
    - Message: "Duration: 02:35 | Added to timeline"
    - Icon: green checkmark
    - Duration: 5 seconds
  - [ ] For PiP mode: "Screen + Webcam recorded (2 tracks) | Duration: 02:35"
  - [ ] Add "View Timeline" button in toast (scrolls timeline to new clip)

- [ ] Task 9: Clean up recording state (AC: 2)
  - [ ] After auto-import completes:
    - Reset `recordingMode = null`
    - Clear `selectedScreenSource = null`
    - Clear `selectedWebcamDevice = null`
    - Clear `screenStream` and `webcamStream` (stop tracks)
    - Reset `recordingDuration = 0`
  - [ ] Close RecordingModal if still open
  - [ ] Remove Stop Recording button from UI

- [ ] Task 10: Implement auto-cleanup of old recordings (AC: 6)
  - [ ] After save completes, scan recordings directory
  - [ ] Delete recordings older than 7 days (configurable)
  - [ ] Keep at least last 20 recordings (even if > 7 days)
  - [ ] Run cleanup in background (don't block UI)
  - [ ] Log cleanup actions for debugging
  - [ ] Add preference to disable auto-cleanup

- [ ] Task 11: Handle edge cases and error scenarios
  - [ ] Stop during countdown: cancel recording, don't save files
  - [ ] Stop immediately after start: save 0-duration clip, show warning
  - [ ] Disk full: show error, keep recording in memory, prompt for different save location
  - [ ] File save failure: retry up to 3 times, then show error with manual save option
  - [ ] Codec conversion failure: save original WebM file, show warning
  - [ ] Thumbnail generation failure: use default icon, don't block import
  - [ ] Timeline at capacity (100 clips): show warning, don't auto-add to timeline
  - [ ] User closes app during recording: show confirmation dialog, save recording before quit
  - [ ] PiP with mismatched durations: trim both clips to shortest duration

- [ ] Task 11: Implement stop-recording IPC channel (tech spec lines 237-248)
  - [ ] Create `stop-recording` IPC handler in main process
  - [ ] Accept parameters: blob data, recording mode, timestamp
  - [ ] Generate appropriate filenames based on mode
  - [ ] Save file(s) to organized directory structure
  - [ ] Return `IPCResponse<{ filePaths: string[] }>`
  - [ ] Handle errors and return in IPCResponse.error

- [ ] Task 12: Implement recording-tick IPC event (tech spec lines 251-258)
  - [ ] Main process emits `recording-tick` event every second during recording
  - [ ] Event payload: `{ duration: number }` (elapsed seconds)
  - [ ] Renderer listens and updates recordingStore.recordingDuration
  - [ ] Display duration in Stop Recording button: "Recording: 00:15"

- [ ] Task 13: NFR Validation (tech spec lines 505-506)
  - [ ] Verify stop-recording IPC completes within 2 seconds
  - [ ] Test file save performance with 1GB recording
  - [ ] Validate outputFiles array updated correctly
  - [ ] Measure codec conversion time (< 10% of recording duration)

- [ ] Task 14: Testing and validation
  - [ ] Test stopping screen-only recording
  - [ ] Test stopping webcam-only recording
  - [ ] Test stopping PiP recording (both files saved)
  - [ ] Test stop-recording IPC returns filePaths array correctly
  - [ ] Test outputFiles array in recordingStore populated
  - [ ] Test recording-tick events update duration in real-time
  - [ ] Test auto-import to media library
  - [ ] Test auto-add to timeline (Track 1 for single, Track 1+2 for PiP)
  - [ ] Test success notification displays correctly
  - [ ] Test keyboard shortcut (Cmd/Ctrl + Shift + R)
  - [ ] Test codec conversion (WebM → MP4)
  - [ ] Test disk full error handling
  - [ ] Test stopping immediately after start (edge case)
  - [ ] Test closing app during recording (save before quit)

## Traceability

**Tech Spec References:**
- stop-recording IPC channel (lines 237-248) - main process handles file save
- IPCResponse<{ filePaths: string[] }> return type
- recording-tick IPC event (lines 251-258) - duration updates
- RecordingState.outputFiles array (line 133) - stores completed file paths
- NFR timing requirements (lines 505-506)

**Architecture Changes (CRITICAL):**
- Main process handles file save (NOT renderer)
- Renderer sends blob data via IPC
- Main process returns saved file paths
- Consistent with Electron security best practices

**Architecture References:**
- ADR-002: Main process for file I/O operations
- IPC security: Main process validates all file operations
- RecordingService coordinates save operations

## Dev Notes

### Recording Stop and Import Best Practices

**Immediate Feedback** (UX standard):
- Stop button visible and accessible at all times during recording
- Instant response to stop click (no lag)
- Progress indicator during save/processing
- Success notification with key details (duration, location)

**Auto-Import Workflow** (Loom/Camtasia pattern):
- Recording appears in media library immediately after stop
- Automatically added to timeline (reduces friction)
- User can start editing immediately (no manual import step)
- Reduces clicks: stop → edit (vs stop → find file → import → drag to timeline)

**File Organization** (Professional recording tools):
- Organized by date: easy to find recent recordings
- Auto-cleanup old files: prevents disk clutter
- Temp directory: separate from project files
- Paired filenames for PiP: same timestamp for easy identification

**Codec Optimization** (FFmpeg best practice):
- WebM (VP9): Browser-native, larger file size, slower seeking
- MP4 (h264): Better editor compatibility, smaller size, faster seeking
- Convert WebM → MP4 for optimal editing experience (optional)

### Architecture Patterns and Constraints

**Recording Stop Flow**:
1. User clicks Stop (or keyboard shortcut)
2. MediaRecorder.stop() called
3. Wait for `onstop` event (ensures all chunks)
4. Create Blob from chunks
5. IPC call to main process: `saveRecording(blob, filename)`
6. Main process writes file to disk
7. Optional: FFmpeg conversion WebM → MP4
8. Generate thumbnail
9. Return file path to renderer
10. Add to media library
11. Auto-add to timeline
12. Show success notification

**State Management** (ADR-001):
- `recordingStore.ts` manages recording lifecycle
- `mediaStore.ts` receives imported recordings
- `timelineStore.ts` receives auto-added clips
- `uiStore.ts` manages toast notifications

**File Management** (ADR-002):
- Main process handles file I/O
- Temp directory: `os.tmpdir()/chop-shop/recordings/YYYY-MM-DD/`
- FFmpeg operations in main process (CPU-intensive)

**Auto-Cleanup**:
- Background job: runs after each recording save
- Delete files > 7 days old (keep last 20)
- Non-blocking: doesn't delay import workflow

### Edge Cases and Error Handling

1. **Stop During Countdown**: Cancel recording, don't save, reset state
2. **Stop Immediately After Start**: Save 0-duration file, show "Recording too short" warning
3. **Disk Full**: Show error with disk usage, prompt for alternative save location
4. **File Save Failure**: Retry 3 times, then offer manual save dialog
5. **Codec Conversion Failure**: Keep original WebM, show warning, import anyway
6. **Thumbnail Generation Failure**: Use default icon, don't block import
7. **Timeline Full (100 clips)**: Import to media library only, show "Timeline full" message
8. **App Close During Recording**: Show "Recording in progress" confirmation dialog, save before quit
9. **PiP Duration Mismatch**: Trim both clips to shortest duration, log warning
10. **Corrupted Recording File**: Detect with ffprobe, show error, don't import
11. **Network Drive Save**: Warn user (slow performance), recommend local drive
12. **Insufficient RAM**: Show warning if available memory < 500MB during recording

### File Naming Conventions

**Format**:
- Screen-only: `screen-recording-YYYY-MM-DD-HHmmss.webm`
- Webcam-only: `webcam-recording-YYYY-MM-DD-HHmmss.webm`
- PiP screen: `screen-recording-YYYY-MM-DD-HHmmss.webm`
- PiP webcam: `webcam-recording-YYYY-MM-DD-HHmmss.webm` (same timestamp)

**Directory Structure**:
```
/tmp/chop-shop/recordings/
├── 2025-10-28/
│   ├── screen-recording-2025-10-28-143022.webm
│   ├── webcam-recording-2025-10-28-143022.webm (PiP pair)
│   └── screen-recording-2025-10-28-151145.webm
└── 2025-10-29/
    └── ...
```

### Project Structure Notes

**New Files Created**:
- `src/renderer/src/components/Recording/StopRecordingButton.tsx`
- `src/renderer/src/components/shared/Toast.tsx`

**Files Modified**:
- `src/renderer/src/store/recordingStore.ts` (stopRecording action, cleanup)
- `src/main/services/file.service.ts` (saveRecording, directory management)
- `src/main/services/ffmpeg.service.ts` (codec conversion, optimization)
- `src/main/services/thumbnail.service.ts` (generate thumbnails)
- `src/renderer/src/store/mediaStore.ts` (auto-import logic)
- `src/renderer/src/store/timelineStore.ts` (auto-add to timeline)
- `src/main/ipc/recording.handlers.ts` (saveRecording handler)

**Component Hierarchy**:
```
App
├── StopRecordingButton (floating, shown when isRecording)
│   ├── Icon (stop square)
│   ├── Text ("Stop")
│   └── Duration ("Recording: 00:15")
└── Toast (success notification)
    ├── Title ("Recording Complete")
    ├── Message ("Duration: 02:35 | Added to timeline")
    └── Action Button ("View Timeline")
```

### Testing Standards Summary

From `testing-strategy.md`:
- Unit tests for stopRecording action, cleanup logic
- Integration test: stop recording, verify file saved to correct path
- Integration test: auto-import to media library
- Integration test: auto-add to timeline (verify Track 1 or Track 1+2)
- Integration test: toast notification displays
- Performance test: codec conversion completes in < 10% of recording duration
- Edge case tests: stop immediately, disk full, file save failure, app close during recording

### References

- [Source: docs/epics.md#Story 4.6]
- [Source: docs/PRD.md#FR013-FR015 - Recording capabilities]
- [Source: docs/architecture.md#File Management - Temp directory structure]
- [Source: docs/architecture.md#ADR-002 - Main process for file I/O]
- [Source: docs/tech-spec-epic-4.md#Recording stop with auto-import]
- [Loom: Auto-import and timeline placement after recording]
- [Camtasia: Organized recording library with auto-cleanup]

## Dev Agent Record

### Context Reference

- docs/stories/4-6-recording-stop-and-auto-import.context.xml

### Agent Model Used

<!-- Will be populated during dev-story execution -->

### Debug Log References

<!-- Will be populated during implementation -->

### Completion Notes List

<!-- Dev agent will document completion, deviations, lessons learned -->

### File List

<!-- Dev agent will list all files created/modified -->
