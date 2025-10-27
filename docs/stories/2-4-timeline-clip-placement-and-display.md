# Story 2.4: Timeline Clip Placement and Display

Status: done

## Story

As a content creator,
I want to drag clips from media library to the timeline,
So that I can arrange my video sequence.

## Acceptance Criteria

1. Timeline renders as horizontal track at bottom of screen
2. User can drag clip from media library to timeline
3. Dropped clip appears on timeline with thumbnail strip
4. Clip shows duration and position on timeline ruler (time markers)
5. Multiple clips can be placed sequentially on timeline
6. Timeline automatically adjusts zoom to fit all clips initially
7. Playhead indicator visible at timeline start (position 0:00)

## Tasks / Subtasks

- [x] Task 1: Create Timeline container component (AC: #1)
  - [x] Create `Timeline.tsx` in `src/renderer/components/Timeline/`
  - [x] Render as fixed-height horizontal strip at bottom of layout
  - [x] Style with Tailwind: dark background, border-top
  - [x] Subscribe to `timelineStore.clips` and `timelineStore.tracks`
  - [x] Integrate into MainLayout component

- [x] Task 2: Create timeline data store (AC: #5, #7)
  - [x] Create `timelineStore.ts` in `src/renderer/store/`
  - [x] Define `Clip` and `Track` interfaces (see Data Model below)
  - [x] Implement actions: `addClip`, `removeClip`, `updateClip`, `setPlayhead`
  - [x] Initialize with single track (Track 1) and playhead at 0
  - [x] Export store hook: `useTimelineStore`

- [x] Task 3: Implement drop zone for timeline (AC: #2)
  - [x] Add `onDragOver` and `onDrop` handlers to Timeline component
  - [x] Extract file ID from `event.dataTransfer.getData('fileId')`
  - [x] Look up full `MediaFile` from `mediaStore` using file ID
  - [x] Calculate drop position on timeline based on mouse X coordinate
  - [x] Call `timelineStore.addClip()` with clip data

- [x] Task 4: Create TimelineClip component (AC: #3, #4)
  - [x] Create `TimelineClip.tsx` in `src/renderer/components/Timeline/`
  - [x] Display clip thumbnail strip (multiple frames or single thumbnail)
  - [x] Display clip duration using `formatTime()` utility
  - [x] Position based on `clip.startTime` (pixels from left)
  - [x] Width based on `clip.duration` scaled by zoom level
  - [x] Style with Tailwind: rounded, border, hover effect

- [x] Task 5: Create timeline ruler with time markers (AC: #4)
  - [x] Create `TimelineRuler.tsx` component
  - [x] Render horizontal ruler above track with time labels
  - [x] Display markers at regular intervals (0:00, 0:10, 0:20, etc.)
  - [x] Sync ruler scale with timeline zoom level
  - [x] Style with monospace font for time labels

- [x] Task 6: Create Playhead component (AC: #7)
  - [x] Create `Playhead.tsx` component
  - [x] Render vertical line indicator at `timelineStore.playheadPosition`
  - [x] Position using CSS transform based on playhead time and zoom
  - [x] Style with distinct color (cyan or red) and full-height
  - [x] Initially positioned at 0:00 (left edge)

- [x] Task 7: Implement auto-zoom to fit clips (AC: #6)
  - [x] Calculate total timeline duration from all clips
  - [x] Compute zoom scale: `timelineWidth / totalDuration`
  - [x] Apply zoom to clip widths and ruler scale
  - [x] Ensure minimum zoom level (clips not too narrow)
  - [x] Will be refined in Story 4.2 (manual zoom controls)

- [x] Task 8: Handle sequential clip placement (AC: #5)
  - [x] When adding clip, calculate next available position
  - [x] If timeline empty, place at 0:00
  - [x] If clips exist, place after last clip (end of last clip's duration)
  - [x] Update `clip.startTime` to sequential position
  - [x] Prevent clip overlap (will be relaxed in multi-track Story 4.1)

- [x] Task 9: Create TimelineTrack component (AC: #1)
  - [x] Create `TimelineTrack.tsx` component
  - [x] Render track container with clips positioned inside
  - [x] Handle track-specific drop events
  - [x] Display track label ("Track 1") on left side
  - [x] Style with border, fixed height (e.g., 80px)

- [x] Task 10: Write unit tests
  - [x] Test Timeline component renders tracks and clips
  - [x] Test timelineStore.addClip() updates state correctly
  - [x] Test clip positioning based on startTime and duration
  - [x] Test auto-zoom calculation with various clip counts
  - [x] Test sequential placement logic prevents overlap

## Dev Notes

### Technical Implementation

**Timeline Data Model:**

```typescript
interface Clip {
  id: string // UUID
  sourceFile: string // Absolute path to video file
  startTime: number // Position on timeline (seconds)
  duration: number // Clip duration (seconds)
  trimIn: number // Trim start offset (default: 0)
  trimOut: number // Trim end offset (default: duration)
  trackId: number // Which track (1 for single-track MVP)
}

interface Track {
  id: number
  clips: Clip[]
}

interface TimelineState {
  tracks: Track[]
  playheadPosition: number
  totalDuration: number // Computed from clips
  zoomLevel: number // Pixels per second
  selectedClipId: string | null

  addClip: (clip: Omit<Clip, 'id'>) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<Clip>) => void
  setPlayhead: (position: number) => void
}
```

**Drop Handler Logic:**

```typescript
function handleDrop(e: DragEvent) {
  e.preventDefault()
  const fileId = e.dataTransfer.getData('fileId')
  const file = mediaStore.getState().files.find((f) => f.id === fileId)

  if (!file) return

  // Calculate next available position
  const clips = timelineStore.getState().tracks[0].clips
  const lastClip = clips[clips.length - 1]
  const nextPosition = lastClip ? lastClip.startTime + lastClip.duration : 0

  // Add clip to timeline
  timelineStore.getState().addClip({
    sourceFile: file.filePath,
    startTime: nextPosition,
    duration: file.duration,
    trimIn: 0,
    trimOut: file.duration,
    trackId: 1
  })
}
```

**Clip Positioning (CSS):**

```tsx
<div
  className="absolute h-16 bg-zinc-700 rounded border border-zinc-600"
  style={{
    left: `${clip.startTime * zoomLevel}px`,
    width: `${clip.duration * zoomLevel}px`
  }}
>
  {/* Clip content */}
</div>
```

**Auto-Zoom Calculation:**

```typescript
function calculateAutoZoom(totalDuration: number, containerWidth: number): number {
  const MIN_ZOOM = 10 // Minimum 10 pixels per second
  const MAX_ZOOM = 100 // Maximum 100 pixels per second

  const calculatedZoom = containerWidth / totalDuration
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom))
}
```

**Timeline Layout:**

```
┌─────────────────────────────────────────┐
│ TimelineRuler: 0:00  0:10  0:20  0:30   │
├─────────────────────────────────────────┤
│ Track 1 │ [Clip 1] [Clip 2]    [Clip 3]│
│         │                      ^        │
│         │                   Playhead    │
└─────────────────────────────────────────┘
```

**State Management:**

- `timelineStore`: manages clips, tracks, playhead, zoom
- Clips stored in track's `clips` array, sorted by `startTime`
- Playhead position updated by playback controls (Story 2.5)

### Project Structure Notes

**New Files to Create:**

```
src/renderer/components/Timeline/
  ├── Timeline.tsx                    # Main timeline container
  ├── TimelineTrack.tsx               # Individual track
  ├── TimelineClip.tsx                # Clip display
  ├── TimelineRuler.tsx               # Time markers
  ├── Playhead.tsx                    # Playhead indicator
  ├── timeline.types.ts               # Clip, Track interfaces
  └── index.ts                        # Exports

src/renderer/store/
  └── timelineStore.ts                # Timeline state management
```

**Files Modified:**

```
src/renderer/components/Layout/
  └── MainLayout.tsx                  # Integrate Timeline at bottom
```

**Component Hierarchy:**

```
Timeline
  ├── TimelineRuler
  ├── Playhead
  └── TimelineTrack (Track 1)
        └── TimelineClip[] (multiple)
```

**Alignment with Architecture:**

- Zustand for `timelineStore` (matches architecture decision)
- Clips positioned using CSS `left` and `width` with zoom scaling
- Drag-and-drop from MediaLibrary (HTML5 API, no external library)
- Time formatting with `formatTime()` utility (from Story 2.1)
- Single track for MVP (multi-track in Story 4.1)

**Performance Considerations:**

- Use CSS transforms for playhead movement (GPU accelerated)
- Limit timeline to reasonable clip count for 72-hour sprint
- Virtual scrolling deferred to post-MVP if needed
- Clip thumbnails loaded lazily (can use existing thumbnail from MediaFile)

**Testing Strategy:**

- Unit tests for timelineStore actions (addClip, removeClip, setPlayhead)
- Unit tests for TimelineClip positioning calculations
- Unit tests for auto-zoom logic
- Manual testing for drag-and-drop from media library

### References

- [Source: docs/epics.md#Story 2.4] - Acceptance criteria and user story
- [Source: docs/PRD.md#Functional Requirements] - FR005 (timeline interface)
- [Source: docs/architecture.md#Data Architecture] - Timeline data model
- [Source: docs/architecture.md#Zustand Store Structure] - Store patterns
- [Source: docs/architecture.md#Performance Considerations] - Timeline rendering
- [Source: Story 2.3] - MediaLibrary drag source integration

## Dev Agent Record

### Context Reference

- `docs/stories/2-4-timeline-clip-placement-and-display.context.xml` (Generated: 2025-10-27)

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log

**Implementation Plan (2025-10-27):**
Logical task order to minimize dependencies:
1. Create timeline.types.ts + timelineStore.ts (foundation - Task 2)
2. Create sub-components: TimelineClip, TimelineRuler, Playhead, TimelineTrack (Tasks 4,5,6,9)
3. Create Timeline container + integrate into MainLayout (Task 1)
4. Add drop zone, sequential placement, auto-zoom logic (Tasks 3,8,7)
5. Write comprehensive unit tests (Task 10)

### Debug Log References

### Completion Notes List

**2025-10-27 - Story Implementation Complete**

Successfully implemented full timeline clip placement and display functionality covering all 7 acceptance criteria:

**Components Created:**
- `Timeline.tsx` - Main container with drag-drop, auto-zoom, and sequential placement
- `TimelineClip.tsx` - Clip display with positioning and duration labels
- `TimelineRuler.tsx` - Time markers with dynamic interval calculation
- `Playhead.tsx` - Playhead indicator using GPU-accelerated CSS transforms
- `TimelineTrack.tsx` - Track container with clip management
- `timeline.types.ts` - Type definitions for Clip, Track, and TimelineState
- `index.ts` - Component exports

**State Management:**
- `timelineStore.ts` - Zustand store with addClip, removeClip, updateClip, setPlayhead, selectClip actions
- Auto-zoom implementation with MIN/MAX bounds (10-100 px/s)
- Total duration calculation from clip positions
- Sequential clip placement logic

**Testing:**
- 15 tests for timelineStore covering all actions
- 51 tests for Timeline components (Timeline, Clip, Ruler, Playhead, Track)
- All 174 renderer tests + 31 main tests passing (205 total)

**Integration:**
- Timeline integrated into MainLayout replacing placeholder
- Path alias `@/` configured in vitest.config.ts and electron.vite.config.ts
- Fixed existing App.test.tsx and MainLayout.test.tsx to expect Timeline component

**Technical Approach:**
- Used CSS positioning (left/width) with zoom scaling per architecture
- Functional programming pattern throughout (no classes)
- GPU-accelerated playhead movement via CSS transform
- ResizeObserver for responsive auto-zoom

All acceptance criteria met, all tests passing, ready for review.

### File List

**New Files:**
- `src/renderer/src/components/Timeline/Timeline.tsx`
- `src/renderer/src/components/Timeline/TimelineClip.tsx`
- `src/renderer/src/components/Timeline/TimelineRuler.tsx`
- `src/renderer/src/components/Timeline/Playhead.tsx`
- `src/renderer/src/components/Timeline/TimelineTrack.tsx`
- `src/renderer/src/components/Timeline/timeline.types.ts`
- `src/renderer/src/components/Timeline/index.ts`
- `src/renderer/src/store/timelineStore.ts`
- `src/renderer/src/store/__tests__/timelineStore.test.ts`
- `src/renderer/src/components/Timeline/__tests__/Timeline.test.tsx`
- `src/renderer/src/components/Timeline/__tests__/TimelineClip.test.tsx`
- `src/renderer/src/components/Timeline/__tests__/TimelineRuler.test.tsx`
- `src/renderer/src/components/Timeline/__tests__/Playhead.test.tsx`
- `src/renderer/src/components/Timeline/__tests__/TimelineTrack.test.tsx`

**Modified Files:**
- `src/renderer/src/components/Layout/MainLayout.tsx` - Integrated Timeline component
- `vitest.config.ts` - Added `@/` path alias for tests
- `electron.vite.config.ts` - Added `@/` path alias for runtime
- `src/renderer/src/__tests__/App.test.tsx` - Updated to expect Timeline component
- `src/renderer/src/components/Layout/__tests__/MainLayout.test.tsx` - Updated to expect Timeline component
