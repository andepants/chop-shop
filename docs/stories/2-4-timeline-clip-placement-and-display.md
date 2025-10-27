# Story 2.4: Timeline Clip Placement and Display

Status: drafted

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

- [ ] Task 1: Create Timeline container component (AC: #1)
  - [ ] Create `Timeline.tsx` in `src/renderer/components/Timeline/`
  - [ ] Render as fixed-height horizontal strip at bottom of layout
  - [ ] Style with Tailwind: dark background, border-top
  - [ ] Subscribe to `timelineStore.clips` and `timelineStore.tracks`
  - [ ] Integrate into MainLayout component

- [ ] Task 2: Create timeline data store (AC: #5, #7)
  - [ ] Create `timelineStore.ts` in `src/renderer/store/`
  - [ ] Define `Clip` and `Track` interfaces (see Data Model below)
  - [ ] Implement actions: `addClip`, `removeClip`, `updateClip`, `setPlayhead`
  - [ ] Initialize with single track (Track 1) and playhead at 0
  - [ ] Export store hook: `useTimelineStore`

- [ ] Task 3: Implement drop zone for timeline (AC: #2)
  - [ ] Add `onDragOver` and `onDrop` handlers to Timeline component
  - [ ] Extract file ID from `event.dataTransfer.getData('fileId')`
  - [ ] Look up full `MediaFile` from `mediaStore` using file ID
  - [ ] Calculate drop position on timeline based on mouse X coordinate
  - [ ] Call `timelineStore.addClip()` with clip data

- [ ] Task 4: Create TimelineClip component (AC: #3, #4)
  - [ ] Create `TimelineClip.tsx` in `src/renderer/components/Timeline/`
  - [ ] Display clip thumbnail strip (multiple frames or single thumbnail)
  - [ ] Display clip duration using `formatTime()` utility
  - [ ] Position based on `clip.startTime` (pixels from left)
  - [ ] Width based on `clip.duration` scaled by zoom level
  - [ ] Style with Tailwind: rounded, border, hover effect

- [ ] Task 5: Create timeline ruler with time markers (AC: #4)
  - [ ] Create `TimelineRuler.tsx` component
  - [ ] Render horizontal ruler above track with time labels
  - [ ] Display markers at regular intervals (0:00, 0:10, 0:20, etc.)
  - [ ] Sync ruler scale with timeline zoom level
  - [ ] Style with monospace font for time labels

- [ ] Task 6: Create Playhead component (AC: #7)
  - [ ] Create `Playhead.tsx` component
  - [ ] Render vertical line indicator at `timelineStore.playheadPosition`
  - [ ] Position using CSS transform based on playhead time and zoom
  - [ ] Style with distinct color (cyan or red) and full-height
  - [ ] Initially positioned at 0:00 (left edge)

- [ ] Task 7: Implement auto-zoom to fit clips (AC: #6)
  - [ ] Calculate total timeline duration from all clips
  - [ ] Compute zoom scale: `timelineWidth / totalDuration`
  - [ ] Apply zoom to clip widths and ruler scale
  - [ ] Ensure minimum zoom level (clips not too narrow)
  - [ ] Will be refined in Story 4.2 (manual zoom controls)

- [ ] Task 8: Handle sequential clip placement (AC: #5)
  - [ ] When adding clip, calculate next available position
  - [ ] If timeline empty, place at 0:00
  - [ ] If clips exist, place after last clip (end of last clip's duration)
  - [ ] Update `clip.startTime` to sequential position
  - [ ] Prevent clip overlap (will be relaxed in multi-track Story 4.1)

- [ ] Task 9: Create TimelineTrack component (AC: #1)
  - [ ] Create `TimelineTrack.tsx` component
  - [ ] Render track container with clips positioned inside
  - [ ] Handle track-specific drop events
  - [ ] Display track label ("Track 1") on left side
  - [ ] Style with border, fixed height (e.g., 80px)

- [ ] Task 10: Write unit tests
  - [ ] Test Timeline component renders tracks and clips
  - [ ] Test timelineStore.addClip() updates state correctly
  - [ ] Test clip positioning based on startTime and duration
  - [ ] Test auto-zoom calculation with various clip counts
  - [ ] Test sequential placement logic prevents overlap

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

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List
