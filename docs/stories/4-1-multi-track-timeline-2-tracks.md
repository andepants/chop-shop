# Story 4.1: Multi-Track Timeline (2 Tracks)

Status: drafted

## Story

As a content creator,
I want to place clips on multiple timeline tracks,
so that I can create picture-in-picture or overlay effects.

## Acceptance Criteria

1. Timeline displays 2 horizontal tracks: Track 1 (main) and Track 2 (overlay)
2. Users can drag clips from media library to either track
3. Track 2 clips render on top of Track 1 in preview (overlay/PiP positioning)
4. Each track independently supports trim, split, delete operations
5. Playhead synchronizes across both tracks during playback
6. Export renders both tracks composited into single output video
7. Track 2 clips show visual indicator (border/label) distinguishing from Track 1

## Tasks / Subtasks

- [ ] Task 1: Extend timeline data model for multi-track support (AC: 1, 5)
  - [ ] Update `timelineStore.ts` to implement `TimelineState` interface from tech spec:
    ```typescript
    interface TimelineState {
      tracks: Track[];               // Always 2 tracks for Epic 4
      playheadPosition: number;
      totalDuration: number;
      zoomLevel: number;
      selectedClipId: string | null;
    }
    ```
  - [ ] Implement `Track` interface (tech spec lines 143-148):
    ```typescript
    interface Track {
      id: number;        // 1 = main, 2 = overlay
      clips: Clip[];
      height: number;    // Track height in pixels
    }
    ```
  - [ ] Extend `Clip` interface with `trackId` field (tech spec lines 167-176):
    ```typescript
    interface Clip {
      id: string;
      sourceFile: string;
      startTime: number;
      duration: number;
      trimIn: number;
      trimOut: number;
      trackId: number;   // NEW: 1 or 2
    }
    ```
  - [ ] Implement multi-track actions from tech spec (lines 275-288):
    - `addClipToTrack(clip: Omit<Clip, 'id'>, trackId: number): void`
    - `getClipsForTrack(trackId: number): Clip[]`
  - [ ] Ensure playhead state remains track-agnostic (single playhead for both tracks)
  - [ ] Write unit tests for multi-track store operations (tech spec lines 723-727)

- [ ] Task 2: Create TimelineTrack component with visual track separation (AC: 1, 7)
  - [ ] Create `src/renderer/src/components/Timeline/TimelineTrack.tsx`
  - [ ] Render track with visual label (Track 1 / Track 2)
  - [ ] Apply distinct styling: Track 1 (darker bg), Track 2 (lighter bg with colored border)
  - [ ] Implement track height: 80px per track with 4px spacing
  - [ ] Add visual track indicator (colored left border): Track 1 (cyan), Track 2 (purple)
  - [ ] Support drag-over highlight when dragging clips over track

- [ ] Task 3: Update Timeline component to render 2 tracks (AC: 1)
  - [ ] Update `Timeline.tsx` to render 2 `TimelineTrack` components
  - [ ] Apply vertical stacking with proper spacing
  - [ ] Share timeline ruler, zoom controls, and playhead across tracks
  - [ ] Maintain existing timeline grid background
  - [ ] Ensure total timeline height accommodates both tracks (~168px + ruler)

- [ ] Task 4: Implement drag-and-drop to specific tracks (AC: 2)
  - [ ] Update `MediaItem.tsx` drag handlers to include track targeting
  - [ ] Update `TimelineTrack.tsx` to handle drop events with `trackId`
  - [ ] Implement workflow from tech spec (lines 377-388):
    - Highlight track based on mouse Y position during drag-over
    - Drop target highlights when cursor enters track area
    - On drop: call `addClipToTrack(clip, trackId)` with target track ID
  - [ ] Show visual feedback (highlighted track border) during drag-over
  - [ ] Prevent dropping if track has overlapping clip at drop position
  - [ ] Validate: prevent cross-track drag (clips stay within same track unless explicitly moved)
  - [ ] Handle edge case: clip dropped between tracks defaults to Track 1

- [ ] Task 5: Extend editing operations for track-aware behavior (AC: 4)
  - [ ] Update trim handlers in `TimelineClip.tsx` to preserve `trackId`
  - [ ] Update split operation to maintain track assignment for both resulting clips
  - [ ] Update delete operation to remove clip from specific track only
  - [ ] Ensure drag-to-reorder works within same track (prevent cross-track by default)
  - [ ] Add track label display on clip hover for clarity

- [ ] Task 6: Implement multi-track preview compositing (AC: 3, 6)
  - [ ] Create `src/renderer/src/components/Preview/VideoCanvas.tsx` implementing interface from tech spec (lines 292-300):
    ```typescript
    interface VideoCanvasProps {
      mainTrackVideo: HTMLVideoElement | null;     // Track 1
      overlayTrackVideo: HTMLVideoElement | null;  // Track 2
      pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      pipSize: number;     // Percentage (e.g., 25 = 25%)
      width: number;       // Canvas width
      height: number;      // Canvas height
    }
    ```
  - [ ] Implement `compositeFrame()` method (tech spec lines 302-310) for Canvas rendering
  - [ ] Use Canvas API for real-time compositing: draw Track 1 first, then Track 2 on top
  - [ ] Position Track 2 clips as picture-in-picture: bottom-right corner, 25% width
  - [ ] Use `requestAnimationFrame` for 30fps rendering loop (tech spec line 408, NFR003)
  - [ ] Implement frame-by-frame sync during playback (maintain 30fps per NFR003)
  - [ ] Handle case when Track 2 has no clip (render Track 1 only)
  - [ ] Handle case when both tracks empty (show placeholder)

- [ ] Task 7: Update export pipeline for multi-track rendering (AC: 6)
  - [ ] Update `ffmpeg.service.ts` to implement multi-track export using interface from tech spec (lines 193-200):
    ```typescript
    interface MultiTrackExportOptions extends ExportOptions {
      tracks: {
        main: Clip[];       // Track 1 clips
        overlay: Clip[];    // Track 2 clips
      };
      pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      pipSize: number;      // Percentage (e.g., 25 = 25%)
    }
    ```
  - [ ] Implement FFmpeg overlay filter from tech spec (lines 428-432):
    ```bash
    ffmpeg -i track1.mp4 -i track2.mp4 \
      -filter_complex "[1:v]scale=iw*0.25:ih*0.25[pip];[0:v][pip]overlay=W-w-10:H-h-10" \
      -c:a aac output.mp4
    ```
  - [ ] Use Canvas-based pre-render if FFmpeg overlay fails (fallback per NFR002)
  - [ ] Maintain audio from both tracks (Track 1 primary, Track 2 ducked -6dB)
  - [ ] Test export with: Track 1 only, Track 2 only, both tracks, overlapping clips
  - [ ] Handle edge case: different resolutions between tracks (scale to Track 1 resolution)

- [ ] Task 8: Add visual indicators and track management UI (AC: 7)
  - [ ] Display track labels on left side of timeline (Track 1 / Track 2)
  - [ ] Add colored border to Track 2 clips (purple 2px border)
  - [ ] Add track icon/badge on clips to indicate track assignment
  - [ ] Ensure sufficient contrast for both light and dark clips
  - [ ] Add tooltips showing track assignment on clip hover

- [ ] Task 9: Handle edge cases and error scenarios
  - [ ] Prevent dropping clip on track if it would overlap existing clip
  - [ ] Show error message if user attempts invalid track operation
  - [ ] Handle playback when one track extends beyond the other (continue playing remaining track)
  - [ ] Ensure timeline zoom maintains track visibility and alignment
  - [ ] Test with empty tracks, single track with multiple clips, both tracks populated
  - [ ] Validate export handles track length mismatch (use longest track duration)

- [ ] Task 10: Testing and validation
  - [ ] Test drag-and-drop to both tracks from media library
  - [ ] Test trim, split, delete on clips in both tracks independently
  - [ ] Test playback with various track combinations
  - [ ] Test export with multi-track timeline (verify compositing in output video)
  - [ ] Performance test: ensure 30fps with 5 clips per track (10 total)
  - [ ] Cross-browser test: verify Canvas compositing works in Electron

- [ ] Task 11: NFR Validation (Tech Spec lines 440-444, 494-496)
  - [ ] Validate NFR001: Multi-track timeline maintains 30fps with 10+ clips
  - [ ] Validate NFR001: Timeline re-renders complete within 33ms (30fps)
  - [ ] Validate NFR002: Track operations never corrupt timeline state
  - [ ] Validate NFR002: Canvas compositing failure falls back to single-track (no crash)
  - [ ] Validate NFR002: Zoom operations never cause clip misalignment or playhead desync

## Dev Notes

### Adobe Premiere Pro Best Practices Applied

**Visual Track Indicators** (Premiere Pro standard):
- Track 1: Cyan left border (main content track)
- Track 2: Purple left border (overlay/PiP track)
- Clear track labels on left edge for spatial orientation
- Distinct background colors: Track 1 darker (#1a1a1a), Track 2 lighter (#252525)

**Track Layout Pattern**:
- Vertical stacking (standard in all NLEs)
- Track 2 renders "above" Track 1 (higher z-index in preview)
- Shared timeline ruler and playhead across tracks (prevents desync)

**Non-Destructive Editing**:
- Clips maintain independent track assignment
- Operations on one track don't affect the other
- Export composites tracks without modifying source files

### Architecture Patterns and Constraints

**State Management** (ADR-001: Zustand):
- Extend `timelineStore.ts` with track-based clip organization
- Structure: `{ tracks: { 1: [clips], 2: [clips] } }`
- Maintain single playhead state (not per-track)

**Component Structure**:
- Timeline > TimelineTrack (x2) > TimelineClip (each track's clips)
- TimelineRuler and Playhead rendered above tracks (shared)
- ZoomControls affect all tracks simultaneously

**Compositing Approach** (ADR-004):
- Canvas API for real-time preview (sufficient for 2 tracks per NFR003)
- FFmpeg overlay filter for export: `[0:v][1:v]overlay=W-w-10:H-h-10`
- PiP position: bottom-right corner with 10px padding, 25% original width

**IPC Architecture** (ADR-002):
- Renderer handles track UI and drag-and-drop
- Main process handles export with multi-track FFmpeg command

### Edge Cases and Error Handling

1. **Clip Overlap Prevention**: Validate drop position doesn't overlap existing clip on target track
2. **Empty Track Rendering**: Handle case where Track 2 is empty (render Track 1 only in preview)
3. **Track Length Mismatch**: Export duration = longest track's end time
4. **Playback Sync**: Ensure both track clips load and play frame-synchronized
5. **Resolution Mismatch**: Scale Track 2 clips to Track 1 resolution during composite
6. **Memory Management**: Canvas compositing must maintain 30fps (monitor frame drop, fallback to simpler rendering if needed)
7. **Cross-Track Drag**: Prevent accidental drag between tracks (require explicit drop on target track)
8. **Zoom Persistence**: Maintain track visibility and alignment during zoom operations
9. **Audio Mixing**: Track 1 audio at 100%, Track 2 audio ducked to -6dB (prevent clipping)

### Project Structure Notes

**New Files Created**:
- `src/renderer/src/components/Timeline/TimelineTrack.tsx`
- `src/renderer/src/components/Preview/VideoCanvas.tsx`
- `src/renderer/src/types/tracks.types.ts`

**Files Modified**:
- `src/renderer/src/components/Timeline/Timeline.tsx` (render 2 tracks)
- `src/renderer/src/components/Timeline/TimelineClip.tsx` (track-aware operations)
- `src/renderer/src/store/timelineStore.ts` (multi-track data model)
- `src/renderer/src/components/Preview/PreviewPlayer.tsx` (integrate VideoCanvas)
- `src/main/services/ffmpeg.service.ts` (multi-track export)

**Component Hierarchy**:
```
Timeline
├── TimelineRuler (shared)
├── Playhead (shared, spans both tracks)
├── TimelineTrack (Track 1)
│   └── TimelineClip (Track 1 clips)
└── TimelineTrack (Track 2)
    └── TimelineClip (Track 2 clips)
```

### Testing Standards Summary

From `testing-strategy.md`:
- Unit tests for track-based store operations (95%+ coverage)
- Integration test: drag clip to Track 2, verify preview compositing
- Integration test: export multi-track timeline, verify FFmpeg overlay
- Performance test: 30fps with 10 clips (5 per track) during playback
- Edge case tests: empty tracks, overlapping clips, resolution mismatch

### References

- [Source: docs/epics.md#Story 4.1]
- [Source: docs/PRD.md#FR013-FR015 - Recording Capabilities]
- [Source: docs/architecture.md#Component Structure - Timeline components]
- [Source: docs/architecture.md#ADR-004 - Canvas API for compositing]
- [Source: docs/tech-spec-epic-4.md#Multi-track infrastructure]

## Acceptance Criteria Traceability (Tech Spec lines 667-678)

| AC | Tech Spec Section | Components/APIs | Test Approach |
|----|-------------------|-----------------|---------------|
| AC1-7 | Multi-Track Timeline, Track model (lines 143-148) | Timeline.tsx, TimelineTrack.tsx, timelineStore.ts | Manual: Drag clips to tracks, verify independent operations, check preview overlay |
| NFR001 | Performance requirements (lines 440-444) | All Timeline + Canvas components | Manual: 10+ clips, verify 30fps during zoom, drag, playback |
| NFR002 | Stability (lines 494-496) | Error handling, Canvas fallback | Manual: Test error scenarios, verify graceful recovery |

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
