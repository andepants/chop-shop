# Story 4.5: Picture-in-Picture Recording (Screen + Webcam)

Status: drafted

## Story

As a content creator,
I want to record screen and webcam simultaneously,
so that I can create tutorials with my face visible.

## Acceptance Criteria

1. Recording setup modal includes "Screen + Webcam (PiP)" mode
2. User selects screen source (full screen or window) AND webcam device
3. Webcam preview overlay shows position on screen preview (adjustable corner/size)
4. Both screen and webcam captured as separate video streams
5. Recording produces 2 clips: screen recording (Track 1) and webcam (Track 2)
6. Both clips automatically placed on timeline in correct tracks
7. Webcam clip positioned as overlay/PiP in preview compositing

## Tasks / Subtasks

- [ ] Task 1: Add PiP mode to recordingStore (AC: 1, 4, 5)
  - [ ] Update `src/renderer/src/store/recordingStore.ts`
  - [ ] Add state: `pipPosition` ('bottom-right' | 'bottom-left' | 'top-right' | 'top-left')
  - [ ] Add state: `pipSize` as number (tech spec line 199) - Note: Tech spec uses number type
    - Document decision: number vs enum ('small' | 'medium' | 'large')
    - If using enum, document deviation from tech spec
  - [ ] Add state: `screenStream` (MediaStream | null)
  - [ ] Add state: `webcamStream` (MediaStream | null)
  - [ ] Add state: `screenRecorder` (MediaRecorder | null)
  - [ ] Add state: `webcamRecorder` (MediaRecorder | null)
  - [ ] Implement `setPipPosition(position)` action
  - [ ] Implement `setPipSize(size)` action
  - [ ] Write unit tests for PiP state management

- [ ] Task 2: Add "Picture-in-Picture" tab to RecordingModal (AC: 1, 2)
  - [ ] Update `src/renderer/src/components/Recording/RecordingModal.tsx`
  - [ ] Add "Picture-in-Picture" tab (show "Screen + Webcam" label)
  - [ ] Show screen source selector (from Story 4.3)
  - [ ] Show webcam device selector (from Story 4.4)
  - [ ] Show microphone selector for audio
  - [ ] Show combined preview with PiP overlay
  - [ ] Require both screen AND webcam selected before enabling Start button

- [ ] Task 3: Create PiP preview component (AC: 3)
  - [ ] Create `src/renderer/src/components/Recording/PipPreview.tsx`
  - [ ] Render screen preview (640x360px)
  - [ ] Overlay webcam preview in selected corner (160x90px by default)
  - [ ] Show draggable PiP position indicator (4 corner buttons)
  - [ ] Show PiP size selector (small/medium/large radio buttons)
  - [ ] Apply CSS positioning to webcam overlay based on pipPosition
  - [ ] Update webcam size based on pipSize (small: 15%, medium: 25%, large: 33%)
  - [ ] Show border around webcam overlay for visibility

- [ ] Task 4: Implement PiP position adjustment (AC: 3)
  - [ ] Add corner selection buttons: top-left, top-right, bottom-left, bottom-right
  - [ ] On click: update pipPosition in store, reposition webcam overlay
  - [ ] Add visual indicator showing currently selected corner
  - [ ] Apply padding: 20px from edges (prevent overlap with UI)
  - [ ] Preview updates immediately when position changes

- [ ] Task 5: Implement PiP size adjustment (AC: 3)
  - [ ] Add size selector: Small (15%), Medium (25%), Large (33%) radio buttons
  - [ ] On change: update pipSize in store, resize webcam overlay
  - [ ] Calculate webcam dimensions: width = screenWidth * sizePercent
  - [ ] Maintain 16:9 aspect ratio for webcam (or 4:3 if webcam is 4:3)
  - [ ] Preview updates immediately when size changes
  - [ ] Default: Medium (25%), bottom-right corner

- [ ] Task 6: Implement dual stream capture (AC: 4, 5)
  - [ ] Implement RecordingConfig interface (tech spec lines 179-187):
    ```typescript
    interface RecordingConfig {
      mode: RecordingMode;
      screenId?: string;
      webcamId?: string;
      audioEnabled: boolean;
      pipPosition?: PipPosition;
      pipSize?: number;
    }
    ```
  - [ ] On Start Recording:
    1. Capture screen stream using desktopCapturer + getUserMedia (from Story 4.3)
    2. Capture webcam stream using getUserMedia (from Story 4.4)
    3. Create MediaRecorder for screen stream → `screenRecorder`
    4. Create MediaRecorder for webcam stream → `webcamRecorder`
    5. Start both recorders simultaneously
  - [ ] Store screen chunks separately from webcam chunks
  - [ ] Update duration for both recordings (use longest duration)
  - [ ] Ensure frame-synchronized start (use common start timestamp)

- [ ] Task 7: Save separate recording files (AC: 5)
  - [ ] On Stop Recording:
    1. Stop both MediaRecorder instances
    2. Create Blob for screen recording → `screen-recording-YYYY-MM-DD-HHmmss.webm`
    3. Create Blob for webcam recording → `webcam-recording-YYYY-MM-DD-HHmmss.webm`
    4. Save both files to temp directory via IPC
    5. Return both file paths to renderer
  - [ ] Handle case: one recorder fails (save successful one, show warning)
  - [ ] CRITICAL: Both files MUST use same timestamp for pairing (enable sync in playback)

- [ ] Task 8: Auto-import both clips to timeline (AC: 6)
  - [ ] After save completes, add both files to mediaStore
  - [ ] Generate thumbnails for both clips
  - [ ] Add screen recording to timeline Track 1 at position 0
  - [ ] Add webcam recording to timeline Track 2 at position 0
  - [ ] Both clips should have same duration (or trim to shortest)
  - [ ] Show success notification: "Screen + Webcam recorded (2 tracks)"
  - [ ] Close recording modal automatically

- [ ] Task 9: Implement PiP compositing in preview (AC: 7)
  - [ ] Update `VideoCanvas.tsx` to render PiP positioning
  - [ ] Draw screen video first (full canvas)
  - [ ] Draw webcam video on top in specified corner with specified size
  - [ ] Apply border to webcam overlay (2px white border for visibility)
  - [ ] Use pipPosition and pipSize from timeline clip metadata
  - [ ] Ensure 30fps compositing performance

- [ ] Task 10: Store PiP metadata with clips (AC: 7)
  - [ ] Extend TimelineClip type to include pipMetadata:
    - position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    - size: 'small' | 'medium' | 'large'
  - [ ] Save PiP settings to webcam clip when adding to timeline
  - [ ] Preview reads metadata to position webcam overlay correctly
  - [ ] Export pipeline uses metadata for final video rendering

- [ ] Task 11: Handle edge cases and error scenarios
  - [ ] One stream fails: show error, allow retrying with single-stream fallback
  - [ ] Webcam disconnected during PiP recording: stop recording, save screen-only
  - [ ] Screen source closed during PiP recording: stop recording, save webcam-only
  - [ ] Both streams fail: show error, don't save any files
  - [ ] Mismatched durations: trim both clips to shortest duration
  - [ ] Memory management: monitor total memory usage (2 recorders + preview)
  - [ ] PiP preview lag: add "Disable Preview" option for performance
  - [ ] Webcam resolution higher than screen: downscale webcam to prevent oversized PiP
  - [ ] Audio from both sources: use screen audio (microphone), ignore webcam audio (prevent echo)

- [ ] Task 11: Frame synchronization validation
  - [ ] Verify both MediaRecorder instances start with same timestamp
  - [ ] Test playback sync: both videos start at t=0 simultaneously
  - [ ] Validate no audio/video drift over 5-minute recording
  - [ ] Measure and document frame sync accuracy (< 33ms tolerance)

- [ ] Task 12: NFR Validation (tech spec lines 450, 507)
  - [ ] Verify dual stream capture maintains 30fps for both streams
  - [ ] Test memory usage during PiP recording (< 2GB target)
  - [ ] Validate RecordingConfig interface implementation
  - [ ] Test timestamp pairing for file naming

- [ ] Task 13: Testing and validation
  - [ ] Test opening PiP mode from modal
  - [ ] Test selecting screen source and webcam device (by ID)
  - [ ] Test PiP position adjustment (all 4 corners)
  - [ ] Test PiP size adjustment (validate pipSize type matches tech spec)
  - [ ] Test starting PiP recording with countdown
  - [ ] Test dual stream capture (verify both files saved)
  - [ ] Test both files use same timestamp in filename
  - [ ] Test auto-import to Track 1 and Track 2
  - [ ] Test preview compositing shows webcam in correct position
  - [ ] Test one stream failure (screen or webcam disconnected)
  - [ ] Test frame synchronization over long recording
  - [ ] Test export with PiP clips (verify FFmpeg overlay in final video)

## Traceability

**Tech Spec References:**
- RecordingConfig interface (lines 179-187) - includes pipPosition and pipSize
- pipSize type decision: number (line 199) vs enum (document deviation if using enum)
- RecordingState interface with outputFiles (lines 124-138)
- Frame synchronization requirements (line 450)
- Memory management: dual stream < 2GB (line 507)

**Critical Requirements:**
- Both files MUST use same timestamp for pairing
- Frame-synchronized start for both MediaRecorder instances
- Separate file storage for non-destructive editing
- PiP metadata stored with Track 2 clip

**Architecture References:**
- ADR-005: Dual MediaRecorder instances for separate tracks
- Story 4.1: Multi-track timeline integration
- Story 4.7: Preview compositing with PiP positioning

## Dev Notes

### Picture-in-Picture Recording Best Practices

**PiP Recording = Competitive Advantage**:
- Premiere Pro doesn't have built-in recording (requires separate tools)
- OBS Studio: Records single combined stream (can't separate later) ❌
- Camtasia: Records screen + webcam on separate tracks ✅ (Chop Shop matches this)
- **Chop Shop Advantage**: Separate tracks = non-destructive editing, reposition later

**Separate Tracks vs Single Stream**:
- ❌ Single Stream (OBS): Webcam burned into screen video, can't reposition
- ✅ Separate Tracks (Camtasia, Chop Shop): Webcam on Track 2, can move/resize/delete in editing

**PiP Position Standards** (Tutorial recording conventions):
- Bottom-right: Most common (87% of tutorials) - doesn't obstruct toolbars
- Bottom-left: Used when critical UI in bottom-right
- Top-right: Rare, may obstruct close buttons
- Top-left: Rare, may obstruct menus

**PiP Size Guidelines**:
- Small (15%): Minimal distraction, face still visible
- Medium (25%): Balanced, good for talking-head emphasis (DEFAULT)
- Large (33%): Maximum face visibility, can obstruct screen content

### Architecture Patterns and Constraints

**Dual Stream Recording** (ADR-005 extension):
- Two independent MediaRecorder instances running simultaneously
- Separate Blob storage for each stream
- Frame-synchronized start using common timestamp
- Both save to temp directory with paired filenames

**Memory Management** (Critical for dual recording):
- Two MediaRecorder instances + two video previews = high memory usage
- Monitor total memory: max 2GB combined for both recordings
- Warn user at 1.5GB, auto-stop at 2GB
- Recommend 16GB RAM for PiP recording (8GB minimum)

**State Management** (ADR-001):
- `recordingStore.ts` manages both streams independently
- Track stream state, recorder state, and chunk arrays separately
- Single "Stop Recording" button stops both recorders simultaneously

**Multi-Track Integration** (Story 4.1):
- Screen recording → Track 1
- Webcam recording → Track 2
- PiP metadata stored with Track 2 clip
- Preview composites using VideoCanvas (Story 4.7)

### Edge Cases and Error Handling

1. **One Stream Fails**: If screen fails, save webcam-only; if webcam fails, save screen-only (show warning)
2. **Webcam Disconnected During Recording**: Auto-stop recording, save screen clip to Track 1
3. **Screen Source Closed**: Auto-stop recording, save webcam clip to Track 2
4. **Both Fail**: Show error, don't save files, reset recording state
5. **Duration Mismatch**: Trim both clips to shortest duration (or pad shortest with black frames)
6. **Memory Exceeded**: Stop recording at 2GB, save partial files, show warning
7. **Preview Lag**: Add "Disable Preview" toggle to reduce CPU/GPU load during recording
8. **Audio Echo**: Only use microphone audio from screen stream, ignore webcam audio
9. **Webcam Resolution > Screen**: Downscale webcam to prevent PiP larger than screen
10. **PiP Obscures Critical UI**: Allow user to reposition during preview before recording
11. **File Save Failure (One File)**: If screen saves but webcam fails, show partial success message
12. **Timestamp Desync**: Use single `Date.now()` for both filenames to ensure pairing

### macOS Permissions (Both Required)

**Required Permissions**:
- Screen Recording: System Preferences → Security & Privacy → Screen Recording
- Camera: System Preferences → Security & Privacy → Camera
- Microphone: System Preferences → Security & Privacy → Microphone

**Permission Flow**:
1. Request screen capture (desktopCapturer)
2. Request webcam access (getUserMedia video:true)
3. Request microphone access (getUserMedia audio:true)
4. If any denied: show error modal with specific permission instructions

### Project Structure Notes

**New Files Created**:
- `src/renderer/src/components/Recording/PipPreview.tsx`
- `src/renderer/src/components/Recording/PipControls.tsx` (position/size selector)

**Files Modified**:
- `src/renderer/src/components/Recording/RecordingModal.tsx` (add PiP tab)
- `src/renderer/src/store/recordingStore.ts` (add PiP state)
- `src/renderer/src/components/Preview/VideoCanvas.tsx` (render PiP positioning)
- `src/renderer/src/types/timeline.types.ts` (add pipMetadata to TimelineClip)
- `src/main/services/ffmpeg.service.ts` (handle PiP export with FFmpeg overlay filter)

**Component Hierarchy**:
```
RecordingModal (PiP Mode)
├── Tabs
│   ├── Screen Only (Story 4.3)
│   ├── Webcam Only (Story 4.4)
│   └── Picture-in-Picture (this story)
├── SourceSelector (screen)
├── WebcamSelector (webcam)
├── AudioSourceSelector (microphone)
├── PipPreview
│   ├── ScreenPreview (640x360px)
│   └── WebcamOverlay (160x90px, positioned)
├── PipControls
│   ├── PositionSelector (4 corners)
│   └── SizeSelector (small/medium/large)
└── Button (Start Recording)
    └── Countdown (3-2-1)
```

### Testing Standards Summary

From `testing-strategy.md`:
- Unit tests for dual stream state management
- Integration test: PiP recording, verify 2 separate files saved
- Integration test: auto-import to Track 1 and Track 2
- Integration test: preview compositing with PiP positioning
- Manual test: 5-minute PiP recording, verify both files playable and in-sync
- Performance test: monitor memory usage, ensure < 2GB
- Edge case tests: one stream fails, webcam disconnected, duration mismatch

### References

- [Source: docs/epics.md#Story 4.5]
- [Source: docs/PRD.md#FR015 - Picture-in-picture recording]
- [Source: docs/architecture.md#ADR-005 - Recording with dual streams]
- [Source: docs/architecture.md#Multi-track compositing]
- [Source: docs/tech-spec-epic-4.md#Picture-in-picture recording]
- [Camtasia: Separate tracks for screen and webcam (industry standard)]
- [OBS Studio: Single stream limitation (NOT followed)]

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
