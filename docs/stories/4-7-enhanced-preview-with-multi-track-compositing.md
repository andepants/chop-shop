# Story 4.7: Enhanced Preview with Multi-Track Compositing

Status: ready-for-dev

## Story

As a content creator,
I want to see my multi-track timeline rendered correctly in preview,
so that I can verify my picture-in-picture and overlay effects.

## Acceptance Criteria

1. Preview player renders Track 2 clips overlaid on Track 1 clips
2. Webcam/PiP clips display in appropriate corner with correct size
3. Real-time playback shows composited multi-track result
4. Audio from both tracks mixed appropriately (Track 1 primary, Track 2 secondary)
5. Scrubbing updates preview with correct multi-track composition
6. Preview maintains 30fps smooth playback with 2 tracks

## Tasks / Subtasks

- [ ] Task 1: Create VideoCanvas component for multi-track rendering (AC: 1, 2, 3)
  - [ ] Create `src/renderer/src/components/Preview/VideoCanvas.tsx`
  - [ ] Implement VideoCanvasProps interface exactly from tech spec (lines 292-300):
    ```typescript
    interface VideoCanvasProps {
      track1Video: HTMLVideoElement;
      track2Video?: HTMLVideoElement;
      pipPosition?: PipPosition;
      pipSize?: number;
      width: number;
      height: number;
    }
    ```
  - [ ] Use HTML5 Canvas API for real-time compositing
  - [ ] Set canvas size to match Track 1 resolution (e.g., 1920x1080)
  - [ ] Implement `renderFrame()` function called at 30fps (requestAnimationFrame)
  - [ ] Load video elements for Track 1 and Track 2 clips
  - [ ] Draw Track 1 frame to canvas first (full canvas, 0,0 position)
  - [ ] Draw Track 2 frame on top (PiP position/size from clip metadata)
  - [ ] Apply 2px white border around Track 2 overlay for visibility

- [ ] Task 2: Implement PiP positioning logic (AC: 2)
  - [ ] Read pipMetadata from Track 2 clip:
    - position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    - size: number (tech spec line 199) - Note: If using enum, document deviation
  - [ ] Calculate PiP dimensions:
    - If pipSize is number: use as percentage (e.g., 0.25 = 25%)
    - If pipSize is enum: map 'small'→15%, 'medium'→25%, 'large'→33%
    - width: Track1Width * sizePercent
    - height: width * (9/16) for 16:9 aspect ratio
  - [ ] Calculate PiP position with 20px padding from edges:
    - bottom-right: x = canvasWidth - pipWidth - 20, y = canvasHeight - pipHeight - 20
    - bottom-left: x = 20, y = canvasHeight - pipHeight - 20
    - top-right: x = canvasWidth - pipWidth - 20, y = 20
    - top-left: x = 20, y = 20
  - [ ] Use canvas.drawImage(track2Video, x, y, width, height)

- [ ] Task 3: Integrate VideoCanvas with PreviewPlayer (AC: 1, 3)
  - [ ] Update `src/renderer/src/components/Preview/PreviewPlayer.tsx`
  - [ ] Detect multi-track timeline (timelineStore.tracks[2].length > 0)
  - [ ] If single track: use Video.js player (existing behavior)
  - [ ] If multi-track: render VideoCanvas instead of Video.js player
  - [ ] Pass Track 1 and Track 2 clip data to VideoCanvas
  - [ ] Maintain playback controls: play/pause, seek, current time display

- [ ] Task 4: Implement synchronized playback for both tracks (AC: 3, 6)
  - [ ] Load both video elements:
    - track1Video: hidden <video> element for Track 1 clip
    - track2Video: hidden <video> element for Track 2 clip
  - [ ] Synchronize playback:
    - On play: call track1Video.play() and track2Video.play() simultaneously
    - On pause: call track1Video.pause() and track2Video.pause()
    - On seek: set track1Video.currentTime and track2Video.currentTime to playhead position
  - [ ] CRITICAL: Sync both video currentTime to playhead (tech spec line 411)
  - [ ] Use requestAnimationFrame loop to render frames at 30fps
  - [ ] Monitor frame drop: if FPS < 25, reduce canvas resolution automatically

- [ ] Task 5: Implement audio mixing (AC: 4)
  - [ ] Use Web Audio API for audio mixing:
    - Create AudioContext
    - Create MediaElementAudioSourceNode for track1Video and track2Video
    - Create GainNode for each track
  - [ ] Set gain levels (CORRECTED FROM TECH SPEC):
    - Track 1 (screen): gain = 1.0 (100%, primary audio)
    - Track 2 (webcam): gain = 0.8 (80%, secondary audio - tech spec line 709, NOT 50%)
  - [ ] Connect both sources to AudioContext.destination
  - [ ] Handle case: only one track has audio (no mixing needed)

- [ ] Task 6: Implement scrubbing with multi-track preview (AC: 5)
  - [ ] On timeline scrub (user drags playhead):
    1. Pause both video elements
    2. Update currentTime for both videos
    3. Wait for 'seeked' event on both videos
    4. Render single frame to canvas (don't start playback)
  - [ ] Debounce scrub updates (update every 33ms = 30fps max)
  - [ ] Show loading spinner if seek takes > 100ms

- [ ] Task 7: Optimize canvas rendering for 30fps performance (AC: 6)
  - [ ] Use `requestAnimationFrame` for render loop
  - [ ] NFR REQUIREMENT: requestAnimationFrame loop executes within 16ms (tech spec line 456)
  - [ ] Monitor frame time: if render takes > 33ms (30fps), log warning
  - [ ] Implement frame skipping if behind: skip rendering intermediate frames
  - [ ] Use `canvas.getContext('2d', { alpha: false })` for better performance
  - [ ] Consider OffscreenCanvas for rendering in Web Worker (advanced optimization)
  - [ ] Profile with Chrome DevTools: ensure CPU usage < 70% during playback

- [ ] Task 8: Handle timeline clip changes during playback (AC: 3)
  - [ ] Detect clip boundaries:
    - When currentTime exceeds Track 1 clip duration: stop playback or load next clip
    - When currentTime exceeds Track 2 clip duration: render Track 1 only
  - [ ] Implement clip transitions:
    - Seamlessly switch to next clip on Track 1 if sequential clips exist
    - Handle gap between clips: show black frame or pause
  - [ ] Update VideoCanvas when timeline clips change (edit during preview)

- [ ] Task 9: Add fallback for single-track playback (AC: 1, 3)
  - [ ] If Track 2 empty: render Track 1 only (no compositing)
  - [ ] If Track 1 empty but Track 2 has clip: show error "Track 1 required"
  - [ ] If both tracks empty: show placeholder "No clips to preview"
  - [ ] Maintain Video.js player for single-track timelines (better performance)

- [ ] Task 10: Handle edge cases and error scenarios
  - [ ] Video load error: show error message, disable playback
  - [ ] Audio context blocked (browser policy): show "Click to enable audio" button
  - [ ] Track duration mismatch: continue playing longer track after shorter ends
  - [ ] Track resolution mismatch: scale Track 2 to Track 1 resolution
  - [ ] Canvas size exceeds GPU limits: downscale to max supported size (4096x4096)
  - [ ] Frame drop (< 25fps): automatically reduce canvas resolution by 25%
  - [ ] Memory leak: ensure video elements released when clips change
  - [ ] Multiple rapid seek operations: debounce and cancel pending seeks
  - [ ] Playback during trim/split operations: pause playback, update after operation

- [ ] Task 11: Add visual feedback for compositing (AC: 1, 2)
  - [ ] Show "Multi-Track Preview" badge in preview area
  - [ ] Add toggle button: "Show/Hide Track 2" (for Track 1 only preview)
  - [ ] Show track indicator on preview: "Track 1 + Track 2" label
  - [ ] Add border to Track 2 overlay (2px white) for clear distinction
  - [ ] Show loading indicator while videos load

- [ ] Task 11: VideoCanvas API documentation task
  - [ ] Document VideoCanvasProps interface with usage examples
  - [ ] Create JSDoc comments for all VideoCanvas methods
  - [ ] Document pipSize handling (number vs enum decision)
  - [ ] Add inline comments for audio mixing gain levels (80% for Track 2)
  - [ ] Document performance optimization techniques used

- [ ] Task 12: NFR Validation with timing requirements
  - [ ] Verify requestAnimationFrame loop executes within 16ms (tech spec line 456)
  - [ ] Test 30fps playback with 1080p Track 1 + 720p Track 2
  - [ ] Measure canvas render time per frame (target < 16ms)
  - [ ] Validate audio mixing levels: Track 1 = 100%, Track 2 = 80%
  - [ ] Test video currentTime sync to playhead (< 33ms accuracy)
  - [ ] Profile CPU usage during playback (< 70% target)

- [ ] Task 13: Testing and validation
  - [ ] Test preview with Track 1 clip only (single track)
  - [ ] Test preview with Track 1 + Track 2 clips (multi-track)
  - [ ] Test playback synchronization (both tracks start/stop together)
  - [ ] Test audio mixing with correct gain levels (80% for Track 2)
  - [ ] Test scrubbing (preview updates correctly)
  - [ ] Test all 4 PiP positions (corners)
  - [ ] Test pipSize handling (validate matches tech spec type)
  - [ ] Performance test: verify 16ms frame render time
  - [ ] Test track duration mismatch (longer Track 1, longer Track 2)
  - [ ] Test resolution mismatch (4K Track 1, 720p Track 2)
  - [ ] Test video currentTime sync to playhead

## Traceability

**Tech Spec References:**
- VideoCanvasProps interface (lines 292-300) - exact interface structure
- pipSize type: number (line 199) - document if using enum instead
- Video currentTime sync requirement (line 411) - both videos sync to playhead
- Audio mixing levels: Track 2 = 80% (line 709) - CORRECTED from 50%
- NFR timing: requestAnimationFrame < 16ms (line 456)

**Critical Corrections:**
- Audio mixing: Track 2 gain = 0.8 (80%), NOT 0.5 (50%) as initially documented
- Video sync: Both track currentTime must sync to playhead position
- Frame render: Must complete within 16ms for 60fps target

**Architecture References:**
- ADR-004: Canvas API for 2D compositing
- Web Audio API for real-time audio mixing
- requestAnimationFrame for 30fps render loop
- Performance target: 30fps minimum, 60fps ideal

## Dev Notes

### Multi-Track Preview Best Practices

**Canvas API for Compositing** (Industry standard):
- Premiere Pro: GPU-accelerated compositing (Mercury Playback Engine)
- Final Cut Pro: Metal-based compositing
- Chop Shop: Canvas API (sufficient for 2 tracks, simpler than WebGL)

**Real-Time Preview** (NLE standard):
- 30fps minimum for smooth playback (Premiere Pro standard)
- Frame-accurate scrubbing (every frame visible during scrub)
- Synchronized audio (tracks mixed in real-time)

**Audio Mixing Levels** (Professional audio standards):
- Primary track (screen): 100% (0dB)
- Secondary track (webcam): 50% (-6dB) to prevent echo/overlap
- Prevents audio clipping when both tracks play simultaneously

**PiP Visual Indicator** (UX best practice):
- 2px white border around overlay (clear distinction from main video)
- Subtle drop shadow (optional, for depth)
- Always visible regardless of video content colors

### Architecture Patterns and Constraints

**Canvas-Based Rendering** (ADR-004):
- Canvas API for 2D compositing (no WebGL needed for 2 tracks)
- requestAnimationFrame for 30fps render loop
- Hardware-accelerated by browser (GPU compositing)

**Performance Target** (NFR003):
- 30fps minimum during playback
- < 33ms per frame render time
- Frame skipping if behind (maintain real-time playback)
- Automatic downscaling if FPS drops below 25

**State Management** (ADR-001):
- `playbackStore.ts` manages playback state (isPlaying, currentTime)
- `timelineStore.ts` provides clip data for both tracks
- VideoCanvas subscribes to both stores for reactive updates

**Audio Architecture**:
- Web Audio API for mixing (GainNode for each track)
- AudioContext handles browser audio permissions
- Fallback: single audio track if Web Audio not supported

### Edge Cases and Error Handling

1. **Track Duration Mismatch**: Continue playing longer track, show black frame for shorter track
2. **Resolution Mismatch**: Scale Track 2 to Track 1 resolution (maintain aspect ratio)
3. **Audio Context Blocked**: Show "Click to enable audio" button (browser autoplay policy)
4. **Video Load Error**: Show error message, disable playback, log detailed error
5. **Canvas Size Exceeds GPU**: Downscale to 4096x4096 max (most GPUs support this)
6. **Frame Drop (< 25fps)**: Auto-reduce canvas resolution by 25%, show warning
7. **Memory Leak**: Ensure video elements removed from DOM when clips change
8. **Rapid Seek Operations**: Debounce to 33ms (30fps), cancel pending seeks
9. **Playback During Edit**: Pause playback during trim/split, resume after operation
10. **Empty Track 2**: Render Track 1 only (no compositing overhead)
11. **Audio-Only Track**: If Track 2 is audio-only (no video), show waveform visualization
12. **Browser Compatibility**: Test in Electron (Chromium-based), fallback for missing features

### Performance Optimization

**requestAnimationFrame Loop**:
```javascript
function renderFrame() {
  const startTime = performance.now();

  // Draw Track 1
  ctx.drawImage(track1Video, 0, 0, canvas.width, canvas.height);

  // Draw Track 2 (if exists)
  if (track2Video) {
    ctx.drawImage(track2Video, pipX, pipY, pipWidth, pipHeight);
  }

  const renderTime = performance.now() - startTime;
  if (renderTime > 33) console.warn('Frame drop:', renderTime);

  if (isPlaying) requestAnimationFrame(renderFrame);
}
```

**Frame Skipping**:
- If render takes > 33ms (30fps), skip intermediate frames
- Maintain audio sync (don't skip audio)
- Visual stutter acceptable (< 25fps), but audio must stay smooth

**Canvas Optimization**:
- `alpha: false` in getContext (better performance)
- Avoid canvas transforms (use raw pixel positioning)
- Reuse canvas, don't recreate on each frame

### Project Structure Notes

**New Files Created**:
- `src/renderer/src/components/Preview/VideoCanvas.tsx`
- `src/renderer/src/hooks/useVideoCompositing.ts` (custom hook for canvas logic)

**Files Modified**:
- `src/renderer/src/components/Preview/PreviewPlayer.tsx` (integrate VideoCanvas)
- `src/renderer/src/components/Preview/PlaybackControls.tsx` (support multi-track controls)
- `src/renderer/src/store/playbackStore.ts` (multi-track playback state)

**Component Hierarchy**:
```
PreviewPlayer
├── VideoCanvas (if multi-track)
│   ├── <canvas> (compositing surface)
│   ├── <video hidden> (Track 1 source)
│   └── <video hidden> (Track 2 source)
├── Video.js Player (if single-track, existing)
└── PlaybackControls
    ├── Play/Pause
    ├── Timeline Scrubber
    └── Time Display
```

### Testing Standards Summary

From `testing-strategy.md`:
- Unit tests for PiP positioning calculations
- Unit tests for audio gain calculations
- Integration test: multi-track playback, verify 30fps
- Integration test: scrubbing updates preview correctly
- Performance test: CPU usage < 70% during 1080p playback
- Edge case tests: duration mismatch, resolution mismatch, frame drop handling

### References

- [Source: docs/epics.md#Story 4.7]
- [Source: docs/PRD.md#NFR003 - Preview 30fps minimum]
- [Source: docs/architecture.md#ADR-004 - Canvas API for compositing]
- [Source: docs/architecture.md#Preview Rendering - Multi-track compositing]
- [Source: docs/tech-spec-epic-4.md#Multi-track compositing preview]
- [Adobe Premiere Pro: Mercury Playback Engine (GPU compositing reference)]
- [HTML5 Canvas API: requestAnimationFrame for smooth rendering]

## Dev Agent Record

### Context Reference

- docs/stories/4-7-enhanced-preview-with-multi-track-compositing.context.xml

### Agent Model Used

<!-- Will be populated during dev-story execution -->

### Debug Log References

<!-- Will be populated during implementation -->

### Completion Notes List

<!-- Dev agent will document completion, deviations, lessons learned -->

### File List

<!-- Dev agent will list all files created/modified -->
