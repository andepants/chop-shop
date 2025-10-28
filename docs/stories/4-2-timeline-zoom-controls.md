# Story 4.2: Timeline Zoom Controls

Status: ready-for-dev

## Story

As a content creator,
I want to zoom in and out on the timeline,
so that I can perform precise editing on specific sections.

## Acceptance Criteria

1. Zoom controls (+ / - buttons or slider) visible in timeline toolbar
2. Zoom in increases timeline scale, showing more detail per clip
3. Zoom out decreases timeline scale, showing more clips in view
4. Playhead position maintains visual alignment during zoom
5. Zoom level persists during editing session
6. Keyboard shortcuts (Cmd/Ctrl + / Cmd/Ctrl -) for zoom operations
7. Timeline remains smooth and responsive during zoom (30fps minimum)

## Tasks / Subtasks

- [ ] Task 1: Add zoom state to timelineStore (AC: 2, 3, 5)
  - [ ] Add `zoomLevel` field to timeline store (range: 0.1 to 5.0, default: 1.0)
  - [ ] Add `pixelsPerSecond` computed value from zoomLevel (e.g., zoomLevel 1.0 = 100px/sec)
  - [ ] Implement TimelineStoreActions interface methods (tech spec lines 275-288):
    - `setZoomLevel(level: number)` action with bounds checking
    - `zoomIn()` action (multiply by 1.2, max 5.0)
    - `zoomOut()` action (divide by 1.2, min 0.1)
    - `fitToTimeline()` action (calculate zoom to fit all clips in viewport)
  - [ ] Write unit tests for zoom actions and bounds checking

- [ ] Task 2: Create ZoomControls component (AC: 1, 6)
  - [ ] Create `src/renderer/src/components/Timeline/ZoomControls.tsx`
  - [ ] Render zoom slider (range: 0.1 to 5.0, step: 0.1)
  - [ ] Add + button (calls `zoomIn()`)
  - [ ] Add - button (calls `zoomOut()`)
  - [ ] Add "Fit" button (calls `fitToTimeline()`)
  - [ ] Display current zoom percentage (e.g., "100%", "250%")
  - [ ] Apply styling: position in timeline toolbar, right-aligned
  - [ ] Add tooltips: "+: Zoom In (Cmd/Ctrl +)", "-: Zoom Out (Cmd/Ctrl -)", "Fit: Fit Timeline (\\)"

- [ ] Task 3: Implement keyboard shortcuts for zoom (AC: 6)
  - [ ] Add global keyboard event listener in `Timeline.tsx`
  - [ ] Handle Cmd/Ctrl + "+" key: call `zoomIn()`
  - [ ] Handle Cmd/Ctrl + "-" key: call `zoomOut()`
  - [ ] Handle backslash "\\" key: call `fitToTimeline()` (Premiere Pro standard)
  - [ ] Prevent default browser zoom behavior (Cmd/Ctrl + scroll)
  - [ ] Handle Cmd/Ctrl + "0" key: reset to 100% zoom (bonus)
  - [ ] Add keyboard shortcut hints to UI tooltips

- [ ] Task 4: Update Timeline component to apply zoom transformation (AC: 2, 3, 4)
  - [ ] Calculate clip width: `clip.duration * pixelsPerSecond`
  - [ ] Calculate clip position: `clip.startTime * pixelsPerSecond`
  - [ ] Apply zoom scale to timeline grid intervals
  - [ ] Maintain playhead x-position calculation: `currentTime * pixelsPerSecond`
  - [ ] Update timeline scroll viewport to accommodate zoomed content width
  - [ ] Preserve playhead visibility during zoom (auto-scroll if needed)
  - [ ] Note: Zoom applies to all tracks simultaneously (both Track 1 and Track 2)

- [ ] Task 5: Implement cursor-aware zoom (AC: 4) [Adobe Premiere Pro pattern]
  - [ ] Detect mouse cursor position on timeline during zoom
  - [ ] Calculate timeline time at cursor position: `cursorX / pixelsPerSecond`
  - [ ] After zoom, adjust scroll offset to keep cursor time at same visual position
  - [ ] Handle edge case: zoom when cursor outside timeline (zoom centered on playhead)
  - [ ] Handle Alt + scroll wheel zoom (zoom at cursor position)
  - [ ] Add preference to enable/disable cursor-aware zoom (default: enabled)

- [ ] Task 6: Update TimelineRuler to reflect zoom level (AC: 2, 3)
  - [ ] Update `TimelineRuler.tsx` to read `pixelsPerSecond` from store
  - [ ] Calculate ruler tick intervals based on zoom:
    - Zoom < 0.5: Show 10-second intervals
    - Zoom 0.5-2.0: Show 5-second intervals
    - Zoom > 2.0: Show 1-second intervals
  - [ ] Adjust ruler label density to prevent overlap
  - [ ] Ensure ruler remains readable at all zoom levels

- [ ] Task 7: Optimize timeline rendering performance (AC: 7)
  - [ ] Implement virtual scrolling for timeline clips (render only visible clips)
  - [ ] Use `useMemo` to cache clip position calculations
  - [ ] Debounce zoom slider changes (update every 16ms max for 60fps)
  - [ ] Profile timeline render time: ensure < 33ms per frame (30fps minimum)
  - [ ] Test with 20 clips at max zoom (5.0): verify 30fps maintained
  - [ ] Add performance monitoring in dev mode (log frame drops)

- [ ] Task 8: Implement zoom slider with visual feedback (AC: 1)
  - [ ] Use shadcn/ui Slider component for zoom control
  - [ ] Show zoom percentage label updating in real-time
  - [ ] Add visual markers on slider: 0.5x, 1x, 2x, 5x
  - [ ] Highlight current zoom level on slider track
  - [ ] Add smooth transition animation (100ms ease-out)

- [ ] Task 9: Persist zoom level across sessions (AC: 5)
  - [ ] Save `zoomLevel` to localStorage on change (debounced)
  - [ ] Load saved zoom level on timeline mount
  - [ ] Handle case: no saved zoom (default to 1.0)
  - [ ] Clear saved zoom on project close (optional)

- [ ] Task 10: Handle edge cases and error scenarios
  - [ ] Prevent zoom out beyond 0.1x (all clips visible in single screen)
  - [ ] Prevent zoom in beyond 5.0x (prevent excessive memory usage)
  - [ ] Handle empty timeline zoom (show placeholder, disable zoom controls)
  - [ ] Ensure zoom doesn't break clip drag-and-drop interactions
  - [ ] Handle rapid zoom changes (debounce to prevent UI lag)
  - [ ] Test zoom with playback active (should maintain smooth playback)
  - [ ] Handle zoom during clip trim/split operations (maintain operation state)
  - [ ] Test zoom with multi-track timeline (both tracks should zoom together)

- [ ] Task 11: Testing and validation
  - [ ] Test zoom in/out with + / - buttons
  - [ ] Test zoom slider interaction
  - [ ] Test keyboard shortcuts (Cmd/Ctrl +/-, backslash)
  - [ ] Test cursor-aware zoom (Alt + scroll wheel)
  - [ ] Test playhead position maintains alignment during zoom
  - [ ] Test zoom persistence across page refresh
  - [ ] Performance test: 30fps with 20 clips at max zoom
  - [ ] Test "Fit" button with various timeline lengths

- [ ] Task 12: NFR Validation (tech spec lines 461-462)
  - [ ] Verify zoom state updates complete within 100ms
  - [ ] Verify zoom render updates complete within 16ms (60fps target)
  - [ ] Measure and document zoom performance under load (20+ clips)
  - [ ] Validate smooth interaction with no perceptible lag

## Traceability

**Tech Spec References:**
- TimelineStoreActions interface (lines 275-288)
- NFR timing requirements (lines 461-462)
- Timeline zoom interaction pattern
- Multi-track zoom application (all tracks zoom simultaneously)

**Architecture References:**
- ADR-001: Zustand state management for zoom level
- ADR-004: Canvas rendering for zoom transformation
- Performance optimization: Virtual scrolling, useMemo for calculations

## Dev Notes

### Adobe Premiere Pro Best Practices Applied

**Zoom Control Interface** (Premiere Pro standard):
- Zoom slider at bottom of timeline (horizontal slider with +/- buttons)
- Zoom percentage display (e.g., "100%", "250%") for clarity
- "Fit" button to auto-zoom entire timeline into viewport
- Position: right side of timeline toolbar

**Keyboard Shortcuts** (Premiere Pro conventions):
- `Cmd/Ctrl + "+"` : Zoom In
- `Cmd/Ctrl + "-"` : Zoom Out
- `Backslash "\"` : Fit to Timeline (zoom to show all clips)
- `Cmd/Ctrl + "0"` : Reset to 100% zoom (bonus)

**Cursor-Aware Zoom** (Premiere Pro UX pattern):
- When zooming with Alt + scroll wheel, zoom centers on cursor position
- Maintains visual continuity (time under cursor stays under cursor after zoom)
- Fallback: if cursor outside timeline, zoom centers on playhead

**Zoom Ranges**:
- Minimum: 0.1x (10% zoom, entire timeline visible)
- Maximum: 5.0x (500% zoom, frame-level precision)
- Default: 1.0x (100% zoom)
- Increment: 1.2x multiplier per zoom step (Premiere Pro standard)

### Architecture Patterns and Constraints

**State Management** (ADR-001: Zustand):
- Add `zoomLevel` (number, 0.1-5.0) to `timelineStore.ts`
- Compute `pixelsPerSecond` from zoom level: `basePixelsPerSecond * zoomLevel`
- Store in localStorage for persistence

**Component Structure**:
- ZoomControls component in Timeline toolbar
- Timeline component applies zoom transformation to all clips
- TimelineRuler updates tick intervals based on zoom

**Performance Optimization**:
- Virtual scrolling: render only visible clips in viewport
- `useMemo` for expensive calculations (clip positions, ruler ticks)
- Debounce zoom slider updates (16ms = 60fps)
- CSS transforms for smooth zoom transitions

**Keyboard Event Handling**:
- Use global keyboard listener in Timeline.tsx
- Prevent default browser zoom (Cmd/Ctrl + scroll)
- Add to existing keyboard handler (split, delete already use keyboard)

### Edge Cases and Error Handling

1. **Empty Timeline**: Disable zoom controls, show "No clips to zoom" message
2. **Zoom Bounds**: Clamp zoom level to 0.1-5.0 range, prevent out-of-bounds
3. **Playhead Alignment**: Recalculate playhead position after zoom to maintain visual alignment
4. **Scroll Viewport**: Automatically scroll timeline to keep playhead visible after zoom
5. **Rapid Zoom**: Debounce to prevent UI lag (max 60 updates/sec)
6. **Zoom During Playback**: Maintain smooth playback, don't interrupt
7. **Zoom During Trim/Split**: Preserve active editing operation state
8. **Multi-Track Zoom**: Apply zoom equally to all tracks (shared horizontal scale)
9. **Ruler Overflow**: Adjust ruler tick density at extreme zoom levels to prevent label overlap
10. **Cursor Outside Timeline**: If Alt+scroll when cursor not on timeline, center zoom on playhead instead
11. **Window Resize**: Recalculate `fitToTimeline()` zoom if window resized
12. **localStorage Failure**: Handle gracefully if persistence fails (log warning, use default zoom)

### Project Structure Notes

**New Files Created**:
- `src/renderer/src/components/Timeline/ZoomControls.tsx`

**Files Modified**:
- `src/renderer/src/components/Timeline/Timeline.tsx` (integrate zoom controls, apply zoom transformation)
- `src/renderer/src/components/Timeline/TimelineRuler.tsx` (dynamic tick intervals based on zoom)
- `src/renderer/src/components/Timeline/TimelineClip.tsx` (zoom-aware position/width calculations)
- `src/renderer/src/components/Timeline/Playhead.tsx` (zoom-aware position calculation)
- `src/renderer/src/store/timelineStore.ts` (add zoom state and actions)

**Component Hierarchy**:
```
Timeline
├── TimelineToolbar
│   └── ZoomControls (new)
│       ├── Slider
│       ├── Button (-)
│       ├── Button (+)
│       └── Button (Fit)
├── TimelineRuler (modified: zoom-aware ticks)
└── TimelineTrack
    └── TimelineClip (modified: zoom-aware rendering)
```

### Testing Standards Summary

From `testing-strategy.md`:
- Unit tests for zoom actions (zoomIn, zoomOut, fitToTimeline)
- Unit tests for bounds checking (min 0.1, max 5.0)
- Integration test: zoom in/out, verify clip positions update correctly
- Integration test: keyboard shortcuts trigger zoom actions
- Performance test: 30fps with 20 clips at 5.0x zoom
- Edge case test: empty timeline, rapid zoom, zoom during playback

### References

- [Source: docs/epics.md#Story 4.2]
- [Source: docs/PRD.md#NFR001 - Timeline responsiveness 30+ fps]
- [Source: docs/architecture.md#Component Structure - Timeline components]
- [Source: docs/architecture.md#Performance - Virtual scrolling for optimization]
- [Source: docs/tech-spec-epic-4.md#Timeline zoom controls]
- [Adobe Premiere Pro: Zoom bar with handles at timeline bottom]
- [Adobe Premiere Pro: Backslash key for fit-to-timeline]
- [Adobe Premiere Pro: Alt + scroll wheel for cursor-aware zoom]

## Dev Agent Record

### Context Reference

- docs/stories/4-2-timeline-zoom-controls.context.xml

### Agent Model Used

<!-- Will be populated during dev-story execution -->

### Debug Log References

<!-- Will be populated during implementation -->

### Completion Notes List

<!-- Dev agent will document completion, deviations, lessons learned -->

### File List

<!-- Dev agent will list all files created/modified -->
