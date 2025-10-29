# Story 5.7: Auto-Import and Timeline Placement

Status: Approved

## Story

As a content creator,
I want my recordings to automatically appear in the media library and timeline after stopping,
so that I can immediately start editing without manual import steps.

## Acceptance Criteria

1. After recording stops, output files automatically imported to media library
2. Media library generates thumbnails for recorded files (first frame)
3. Recorded files appear in media library with metadata (filename, duration, resolution)
4. Screen-only recording: clip automatically placed on Timeline Track 1
5. Webcam-only recording: clip automatically placed on Timeline Track 2 (overlay track)
6. PiP recording: both clips placed simultaneously (screen → Track 1, webcam → Track 2)
7. Webcam clips on Track 2 positioned bottom-right at 20% size (PiP positioning)
8. Timeline automatically scrolls/adjusts to show newly added clips
9. Success notification displayed: "Recording added to timeline" with recording duration
10. All auto-import steps complete within 5 seconds of recording stop (NFR)
11. Error handling for import failures with user-friendly messages
12. Logging for all auto-import operations with [Recording] prefix

## Tasks / Subtasks

- [ ] Implement auto-import trigger (AC: 1)
  - [ ] Update stopRecording() action in recordingStore
  - [ ] After IPC returns output files, trigger autoImport()
  - [ ] Create autoImportRecordings(output: RecordingOutput) function
  - [ ] Pass output files (screen and/or webcam paths) to import
  - [ ] Handle both single and dual file imports

- [ ] Integrate with media library (AC: 2, 3)
  - [ ] Call mediaStore.addFile() for each recording file
  - [ ] Pass file path, type='video', source='recording'
  - [ ] Trigger thumbnail generation via IPC to thumbnail.service
  - [ ] Wait for thumbnail generation to complete
  - [ ] Store metadata: filename, duration (from RecordingOutput), resolution
  - [ ] Assign unique media library ID to each recording
  - [ ] Log each file added to media library

- [ ] Implement screen-only timeline placement (AC: 4)
  - [ ] Check recording mode = 'screen' or fallback from PiP
  - [ ] Call timelineStore.addClipToTrack(clipData, trackId=1)
  - [ ] Create clip data from screen recording file and media library entry
  - [ ] Position clip at end of Track 1 (after existing clips)
  - [ ] Set clip duration from RecordingOutput metadata
  - [ ] Log Track 1 placement

- [ ] Implement webcam-only timeline placement (AC: 5)
  - [ ] Check recording mode = 'webcam'
  - [ ] Call timelineStore.addClipToTrack(clipData, trackId=2)
  - [ ] Create clip data from webcam recording file
  - [ ] Position clip at end of Track 2
  - [ ] Set clip duration from RecordingOutput metadata
  - [ ] Log Track 2 placement

- [ ] Implement PiP timeline placement (AC: 6, 7)
  - [ ] Check recording mode = 'pip'
  - [ ] Add screen recording to Track 1 (as above)
  - [ ] Add webcam recording to Track 2 (as above)
  - [ ] Set webcam clip position on Track 2: bottom-right corner
  - [ ] Set webcam clip size: 20% of screen clip dimensions
  - [ ] Set webcam clip shape: circular (clip path or CSS)
  - [ ] Align both clips to start at same timeline position
  - [ ] Log dual track placement

- [ ] Calculate PiP positioning (AC: 7)
  - [ ] Read screen clip resolution (e.g., 1920x1080)
  - [ ] Calculate webcam size: 20% = 384x216 for 1920x1080 screen
  - [ ] Position webcam: bottom-right = (screen.width - webcam.width - padding, screen.height - webcam.height - padding)
  - [ ] Use padding = 20px from edges
  - [ ] Store position in webcam clip metadata: { x, y, width, height, shape: 'circle' }
  - [ ] Apply positioning in Preview/VideoCanvas composite

- [ ] Implement timeline scroll/adjustment (AC: 8)
  - [ ] After adding clips, check if new clips visible in viewport
  - [ ] If outside viewport, scroll timeline to show new clips
  - [ ] Optionally auto-fit zoom level to show all clips
  - [ ] Update playhead position to start of new recording
  - [ ] Ensure smooth scroll animation

- [ ] Implement success notification (AC: 9)
  - [ ] Create notification after all import steps complete
  - [ ] Display message: "Recording added to timeline"
  - [ ] Include recording duration in notification (e.g., "2:34 recording")
  - [ ] For PiP: "PiP recording added to timeline (2 tracks)"
  - [ ] Auto-dismiss notification after 5 seconds
  - [ ] Use existing notification system (or create simple toast)

- [ ] Ensure performance requirements (AC: 10)
  - [ ] Measure total time from stopRecording() to timeline visible
  - [ ] Optimize thumbnail generation (can be async/deferred)
  - [ ] Parallelize screen and webcam imports for PiP
  - [ ] Target <5 seconds for complete auto-import flow
  - [ ] Log timing for each step (file import, thumbnail, timeline placement)
  - [ ] Identify and optimize bottlenecks

- [ ] Implement error handling (AC: 11)
  - [ ] Handle file not found errors (recording failed to save)
  - [ ] Handle thumbnail generation failures (proceed without thumbnail)
  - [ ] Handle media library add failures (show error, don't crash)
  - [ ] Handle timeline placement failures (show error)
  - [ ] Display user-friendly error messages for each failure
  - [ ] Log all errors with context
  - [ ] Ensure partial success (e.g., screen imported, webcam failed)

- [ ] Implement comprehensive logging (AC: 12)
  - [ ] Log: "[Recording] Starting auto-import for {mode} recording"
  - [ ] Log: "[Recording] Added to media library: {filename} ({size})"
  - [ ] Log: "[Recording] Generating thumbnail for {filename}"
  - [ ] Log: "[Recording] Placed on Track 1: {filename}"
  - [ ] Log: "[Recording] Placed on Track 2: {filename} (PiP: bottom-right, 20%)"
  - [ ] Log: "[Recording] Auto-import completed: {N} files added to timeline"
  - [ ] Log any errors or warnings during import

- [ ] Update existing stores (AC: 1, 4, 5, 6)
  - [ ] Ensure mediaStore.addFile() supports metadata parameter
  - [ ] Ensure timelineStore.addClipToTrack() supports position/size metadata
  - [ ] Add autoImport flag to media entries (distinguish from manual imports)
  - [ ] Update timeline state after clip addition
  - [ ] Trigger timeline re-render after placement

- [ ] Write integration tests
  - [ ] Test screen-only auto-import to Track 1
  - [ ] Test webcam-only auto-import to Track 2
  - [ ] Test PiP auto-import to both tracks
  - [ ] Test PiP positioning calculations (1920x1080, 1280x720 resolutions)
  - [ ] Test notification display after import
  - [ ] Test error handling for missing files
  - [ ] Test performance (<5s requirement)
  - [ ] Mock mediaStore, timelineStore, IPC

- [ ] Manual testing with real recordings
  - [ ] Record screen-only, verify auto-import to Track 1
  - [ ] Record webcam-only, verify auto-import to Track 2
  - [ ] Record PiP, verify both tracks populated correctly
  - [ ] Verify webcam positioned bottom-right, 20% size, circular
  - [ ] Verify timeline scrolls to show new clips
  - [ ] Verify notification appears with correct duration
  - [ ] Test with existing clips on timeline (append correctly)
  - [ ] Measure and verify <5s total import time

## Dev Notes

**Architecture Alignment:**
- Auto-import uses existing mediaStore (architecture.md:168)
- Timeline placement uses existing timelineStore (architecture.md:166)
- Multi-track support from Epic 4 Story 4.1 (architecture.md:227)
- PiP compositing uses existing VideoCanvas (architecture.md:129)

**Tech Spec References:**
- Auto-import workflow steps (tech-spec-epic-5.md:272-274, 289-291, 310-317)
- Track assignment: Track 1 screen, Track 2 webcam (tech-spec-epic-5.md:28, 71, 311-316)
- Webcam positioning: bottom-right, 20% size, circular (tech-spec-epic-5.md:24, 29, 141-144)
- Performance: <5s auto-import (tech-spec-epic-5.md:361-362)
- Success notification (tech-spec-epic-5.md:274, 291, 317)

**Key Implementation Details:**
- **Two-track placement inherited from Epic 4.1** - multi-track timeline already exists
- Webcam overlay positioning stored in clip metadata, applied by VideoCanvas
- Circular shape applied via CSS clip-path or canvas arc drawing
- Auto-import happens immediately after stopRecording IPC returns
- Thumbnail generation can be asynchronous (doesn't block timeline placement)

**Auto-Import Flow:**
```
Recording stops
  ↓
RecordingService returns output files
  ↓
autoImportRecordings(output)
  ↓
For each file:
  - Add to media library (mediaStore.addFile)
  - Generate thumbnail (async)
  - Create clip data
  - Add to timeline track (timelineStore.addClipToTrack)
  ↓
Update timeline viewport/scroll
  ↓
Display success notification
```

**PiP Positioning Calculation:**
```typescript
// For 1920x1080 screen recording
const screenWidth = 1920;
const screenHeight = 1080;
const webcamScale = 0.2; // 20%
const padding = 20;

const webcamWidth = screenWidth * webcamScale; // 384
const webcamHeight = screenHeight * webcamScale; // 216

const webcamX = screenWidth - webcamWidth - padding; // 1516
const webcamY = screenHeight - webcamHeight - padding; // 844

// Stored in clip metadata
const webcamClip = {
  ...clipData,
  overlayPosition: {
    x: webcamX,
    y: webcamY,
    width: webcamWidth,
    height: webcamHeight,
    shape: 'circle'
  }
};
```

**Testing Strategy:**
- Mock file system for recorded file paths
- Mock thumbnail service for generation
- Test track assignment logic for each mode
- Test positioning calculations with different screen resolutions
- Manual testing critical for end-to-end flow verification
- Measure performance with console.time() at each step

**Performance Considerations:**
- File already exists (saved by RecordingService) - no file copy needed
- Thumbnail generation async, doesn't block timeline placement
- Two files for PiP imported in parallel
- Timeline render optimized (only affected tracks re-render)
- Target breakdown: import 1s, thumbnail 2s, placement 1s, UI update 1s = 5s total

**Integration with Existing Features:**
- Uses mediaStore from Epic 2 (Story 2.3)
- Uses timelineStore from Epic 2 (Story 2.4)
- Uses multi-track timeline from Epic 4 (Story 4.1)
- Uses VideoCanvas compositing from Epic 4 (Story 4.7)
- No new stores or services required

**Error Scenarios:**
- Recording file missing → error notification, don't crash
- Thumbnail fails → skip thumbnail, continue import
- Track 2 doesn't exist → create track or error
- Disk full during import → handled by mediaStore
- Timeline placement fails → error, clips remain in media library

### Project Structure Notes

**Files Modified:**
- `src/renderer/store/recordingStore.ts` - Add autoImportRecordings() function
- `src/renderer/store/mediaStore.ts` - Ensure addFile() handles recording metadata
- `src/renderer/store/timelineStore.ts` - Ensure addClipToTrack() handles PiP metadata
- `src/renderer/components/Preview/VideoCanvas.tsx` - Apply circular clip-path for webcam overlays

**No New Files:**
- Auto-import logic added to existing stores and components

**Testing Files:**
- Tests added to recordingStore.test.ts, mediaStore.test.ts, timelineStore.test.ts

**Alignment with architecture.md:**
- mediaStore at src/renderer/store/mediaStore.ts (line 168)
- timelineStore at src/renderer/store/timelineStore.ts (line 166)
- Multi-track support (line 227)
- VideoCanvas for compositing (line 129)

### References

- [Source: docs/tech-spec-epic-5.md#Workflow 1: Screen-Only Recording] - Auto-import steps 10-12
- [Source: docs/tech-spec-epic-5.md#Workflow 2: Webcam-Only Recording] - Auto-import steps 10-12
- [Source: docs/tech-spec-epic-5.md#Workflow 3: Picture-in-Picture Recording] - Auto-import steps 10-13
- [Source: docs/tech-spec-epic-5.md#System Architecture Alignment:Integration Points] - Media library and timeline integration
- [Source: docs/tech-spec-epic-5.md#Non-Functional Requirements:Performance] - Auto-import speed <5s
- [Source: docs/tech-spec-epic-5.md#Data Models and Contracts:Recording Configuration] - Webcam position: bottom-right, 20%, circle
- [Source: docs/architecture.md#Epic to Architecture Mapping:Epic 4] - Multi-track timeline
- [Source: docs/architecture.md#Project Structure:Preview] - VideoCanvas for compositing

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
