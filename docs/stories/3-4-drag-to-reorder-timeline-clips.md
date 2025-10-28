# Story 3.4: Drag-to-Reorder Timeline Clips

Status: ready-for-dev

## Story

As a content creator,
I want to drag clips to reorder them on the timeline,
So that I can arrange my video sequence in any order.

## Acceptance Criteria

1. User can click and drag a timeline clip to a new position
2. Clips automatically shift to make space during drag operation
3. Drop clip between other clips to insert at that position
4. Timeline updates time markers after reordering
5. Preview updates to show reordered sequence during playback
6. Drag operation is smooth with visual feedback (ghost/preview)

## Tasks / Subtasks

- [ ] Add reorderClips action to timelineStore (AC: 3, 4)
  - [ ] Implement `reorderClips(sourceIndex: number, destIndex: number)` action
  - [ ] Reorder clips array using array splice or immutable reorder pattern
  - [ ] Recalculate startTime for ALL clips after reorder to maintain sequence
  - [ ] Ensure clips remain sorted by startTime after operation
  - [ ] Preserve all clip properties (id, duration, trim values) during reorder
  - [ ] Write unit tests for reorderClips action

- [ ] Implement drag handlers in TimelineClip component (AC: 1, 6)
  - [ ] Add draggable={true} attribute to TimelineClip.tsx
  - [ ] Implement onDragStart handler: capture clip index, show ghost/preview
  - [ ] Implement onDrag handler: update drag position visual feedback
  - [ ] Implement onDragEnd handler: call reorderClips with source/dest indices
  - [ ] Add CSS for drag ghost (semi-transparent copy of clip)
  - [ ] Use CSS transforms for smooth dragging (GPU-accelerated)

- [ ] Implement drop target logic in Timeline component (AC: 2, 3)
  - [ ] Add onDragOver handler to Timeline.tsx
  - [ ] Calculate drop position based on mouse X coordinate
  - [ ] Determine destination index (which clips the dragged clip should be inserted between)
  - [ ] Show visual drop indicator (vertical line or gap preview)
  - [ ] Implement onDrop handler: execute reorderClips(sourceIdx, destIdx)
  - [ ] Prevent drop if source and destination indices are the same

- [ ] Add visual feedback during drag operation (AC: 6)
  - [ ] Dragged clip shows semi-transparent ghost at original position
  - [ ] Drop target indicator (cyan/teal vertical line between clips)
  - [ ] Other clips shift with smooth CSS transition when gap opens
  - [ ] Cursor changes to "grabbing" during drag
  - [ ] Ensure 30fps smooth animation (use CSS transitions, not JS animations)

- [ ] Recalculate timeline after reorder (AC: 4, 5)
  - [ ] After reorderClips, iterate through clips and update startTime sequentially
  - [ ] Clip 1 starts at 0, Clip 2 starts at Clip 1 duration, etc.
  - [ ] Update timeline ruler to reflect new total duration
  - [ ] Ensure playhead position remains valid (clamp if beyond new total duration)
  - [ ] Timeline re-renders with updated clip positions

- [ ] Update preview player for reordered sequence (AC: 5)
  - [ ] Preview player reads clips in order from timelineStore (no changes needed)
  - [ ] Test playback after reorder: verify clips play in new sequence
  - [ ] Test scrubbing after reorder: verify timeline positions correct
  - [ ] Ensure playhead synchronization works with reordered clips

- [ ] Handle edge cases for drag-to-reorder
  - [ ] Drag clip to same position (no-op, no state update)
  - [ ] Drag first clip to end of timeline
  - [ ] Drag last clip to beginning of timeline
  - [ ] Drag with only 2 clips (swap positions)
  - [ ] Prevent drag during playback (disable dragging if isPlaying === true)
  - [ ] Drag trimmed clips (verify effective duration used for positioning)

- [ ] Test drag-to-reorder functionality end-to-end
  - [ ] Manual test: Timeline with 3 clips (A, B, C)
  - [ ] Drag clip C to beginning → verify new order: C, A, B
  - [ ] Verify startTime updated: C at 0s, A at C.duration, B at A.duration
  - [ ] Drag clip A to end → verify order: C, B, A
  - [ ] Play timeline → verify clips play in reordered sequence
  - [ ] Performance test: drag operation smooth at 30fps (NFR001)
  - [ ] Test with 10+ clips: verify drag remains responsive

## Dev Notes

### Architecture Constraints

- **Zustand immutability**: reorderClips creates new clips array, recalculates startTime immutably
- **Performance (NFR001)**: Drag operation must maintain 30fps during animation
- **GPU acceleration**: Use CSS transforms (translateX) for drag visual feedback, not top/left
- **Renderer-only operation**: No IPC calls, pure state mutation in timelineStore

### Component Structure

Primary files to modify:
- `src/renderer/store/timelineStore.ts` - Add reorderClips action
- `src/renderer/store/timelineStore.test.ts` - Unit tests for reorderClips
- `src/renderer/components/Timeline/TimelineClip.tsx` - Add drag handlers (onDragStart, onDragEnd)
- `src/renderer/components/Timeline/Timeline.tsx` - Add drop target handlers (onDragOver, onDrop)
- `src/renderer/components/Timeline/timeline.types.ts` - Add drag state types if needed

### Technical Implementation Details

**ReorderClips Action Logic** (from tech-spec-epic-3.md):
```typescript
reorderClips: (sourceIndex: number, destIndex: number) => {
  set((state) => {
    if (sourceIndex === destIndex) return state

    // Immutable reorder using array operations
    const clips = [...state.clips]
    const [movedClip] = clips.splice(sourceIndex, 1)
    clips.splice(destIndex, 0, movedClip)

    // Recalculate startTime for all clips sequentially
    let currentTime = 0
    const reorderedClips = clips.map(clip => {
      const effectiveDuration = clip.duration - clip.trimIn - clip.trimOut
      const updatedClip = { ...clip, startTime: currentTime }
      currentTime += effectiveDuration
      return updatedClip
    })

    return { clips: reorderedClips }
  })
}
```

**Drag Handler Pattern**:
```typescript
// TimelineClip.tsx
const [isDragging, setIsDragging] = useState(false)

const handleDragStart = (e: React.DragEvent) => {
  setIsDragging(true)
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('clipIndex', index.toString())
}

const handleDragEnd = () => {
  setIsDragging(false)
}

// Timeline.tsx
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  const dropIndex = calculateDropIndex(e.clientX)
  setDragOverIndex(dropIndex)
}

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  const sourceIndex = parseInt(e.dataTransfer.getData('clipIndex'))
  const destIndex = dragOverIndex
  if (destIndex !== null) {
    reorderClips(sourceIndex, destIndex)
  }
  setDragOverIndex(null)
}
```

**Drop Position Calculation**:
```typescript
const calculateDropIndex = (mouseX: number): number => {
  const timelineRect = timelineRef.current.getBoundingClientRect()
  const relativeX = mouseX - timelineRect.left

  // Find which clip boundary the mouse is nearest to
  let closestIndex = 0
  let minDistance = Infinity

  clips.forEach((clip, index) => {
    const clipX = clipPositionFromTime(clip.startTime)
    const distance = Math.abs(relativeX - clipX)
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = index
    }
  })

  return closestIndex
}
```

### Sequencing Notes

**Prerequisite: Stories 3.1, 3.2, 3.3**
- Requires clip model with trim fields (3.1)
- Requires timeline with multiple clips for testing (2.4)
- Builds on timeline selection logic (3.1)

**Dependencies**:
- React DragEvent API (built-in)
- timelineStore.clips (from Epic 2)
- Effective duration calculation (from 3.1)

### Styling Approach

Use Tailwind CSS (per architecture):
- Dragging clip: `opacity-50 cursor-grabbing`
- Drop indicator: `absolute h-full w-1 bg-cyan-500` (vertical line)
- Clip transitions: `transition-transform duration-200 ease-out`
- Ghost preview: `absolute opacity-30 pointer-events-none`

**CSS Transforms for Performance**:
```css
.timeline-clip {
  transition: transform 200ms ease-out;
}

.timeline-clip.dragging {
  transform: scale(1.05);
  opacity: 0.5;
}
```

### Testing Strategy

**Unit Tests** (timelineStore.test.ts):
```typescript
describe('reorderClips', () => {
  it('should reorder clips and recalculate startTime', () => {
    // Setup 3 clips: A (0-5s), B (5-10s), C (10-15s)
    // Reorder: sourceIndex=2, destIndex=0 (move C to beginning)
    // Verify order: C (0-5s), A (5-10s), B (10-15s)
  })

  it('should handle no-op when source equals dest', () => {
    // Reorder with sourceIndex === destIndex
    // Verify state unchanged
  })

  it('should handle two-clip swap', () => {
    // Clips: A, B → B, A
  })
})
```

**Manual Integration Tests**:
1. Timeline with clips: Video1 (0-10s), Video2 (10-15s), Video3 (15-25s)
2. Drag Video3 to beginning (before Video1)
3. Verify order: Video3 (0-10s), Video1 (10-20s), Video2 (20-25s)
4. Play timeline → verify clips play in new order: 3, 1, 2
5. Scrub timeline → verify playhead positions correct relative to reordered clips
6. Drag Video1 between Video3 and Video2
7. Verify order: Video3, Video1, Video2 with correct startTime calculations

**Edge Cases**:
- Drag first clip to last position
- Drag last clip to first position
- Drag clip in timeline with only 2 clips (simple swap)
- Drag clip to its own position (no state change)
- Drag during playback (should be disabled, or pause playback first)

**Performance Tests**:
- Timeline with 10 clips: verify drag animation smooth (30fps visual check)
- Rapidly drag multiple clips sequentially: verify no lag or stuttering

### Project Structure Notes

Following architecture.md:
- Timeline components: `src/renderer/components/Timeline/TimelineClip.tsx`, `Timeline.tsx`
- Store actions: `src/renderer/store/timelineStore.ts`
- Use existing Timeline folder structure, no new folders needed

### References

- [Source: docs/tech-spec-epic-3.md#AC-3.4] - Acceptance criteria for drag-to-reorder
- [Source: docs/tech-spec-epic-3.md#Workflows - Drag-to-Reorder Sequence] - Detailed reorder workflow
- [Source: docs/tech-spec-epic-3.md#Data Models] - Clip structure and startTime calculation
- [Source: docs/epics.md#Story 3.4] - User story statement
- [Source: docs/architecture.md#Zustand Store Structure] - Immutable array reordering pattern
- [Source: docs/architecture.md#Performance Considerations] - GPU-accelerated transforms for drag
- [Source: docs/PRD.md#FR010] - Functional requirement for drag-to-reorder
- [Source: docs/PRD.md#NFR001] - Performance: timeline drag operations must maintain 30fps

## Dev Agent Record

### Context Reference

- `docs/stories/3-4-drag-to-reorder-timeline-clips.context.xml`

### Agent Model Used

<!-- Will be filled during implementation -->

### Debug Log References

### Completion Notes List

### File List
