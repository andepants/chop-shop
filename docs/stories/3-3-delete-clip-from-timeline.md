# Story 3.3: Delete Clip from Timeline

Status: ready-for-dev

## Story

As a content creator,
I want to delete clips I don't need from the timeline,
So that I can remove mistakes or unwanted footage.

## Acceptance Criteria

1. User can select a clip on timeline
2. Delete button or keyboard shortcut (Delete/Backspace key) removes selected clip
3. Remaining clips automatically shift left to close gap
4. Timeline updates playhead position if it was on deleted clip
5. Deleted clip disappears from timeline but remains in media library
6. User can delete multiple clips sequentially

## Tasks / Subtasks

- [ ] Add removeClip action to timelineStore (AC: 2, 3, 5)
  - [ ] Implement `removeClip(clipId: string)` action in timelineStore.ts
  - [ ] Filter out clip from clips array (immutable operation)
  - [ ] Recalculate startTime for all clips after deleted clip to close gap
  - [ ] Update totalDuration based on remaining clips
  - [ ] Clear selectedClipId if deleted clip was selected
  - [ ] Ensure clips array remains sorted by startTime
  - [ ] Write unit tests for removeClip action

- [ ] Create DeleteTool component with Delete button UI (AC: 2)
  - [ ] Create DeleteTool.tsx in src/renderer/components/EditTools/
  - [ ] Render "Delete" button in timeline toolbar
  - [ ] Style using Tailwind (consistent with SplitTool styling)
  - [ ] Disable button when no clip is selected
  - [ ] Add icon (trash/delete icon) for visual clarity

- [ ] Implement keyboard shortcut handlers (AC: 2, 6)
  - [ ] Add global keyboard event listener in Timeline.tsx
  - [ ] Listen for Delete key (keyCode 46) and Backspace key (keyCode 8)
  - [ ] Call removeClip(selectedClipId) when shortcut pressed
  - [ ] Prevent default browser behavior for Backspace (avoid navigation)
  - [ ] Test keyboard shortcuts work when timeline is focused

- [ ] Implement gap-closing logic for remaining clips (AC: 3)
  - [ ] After removing clip, iterate through clips array
  - [ ] Recalculate each clip's startTime to be sequential (no gaps)
  - [ ] Example: Clips at [0, 5, 10], delete middle → result [0, 5]
  - [ ] Ensure gap closing preserves clip order
  - [ ] Write unit test for gap-closing behavior

- [ ] Handle playhead position after deletion (AC: 4)
  - [ ] Check if playheadPosition was within deleted clip bounds
  - [ ] If yes, move playhead to start of deleted clip's position
  - [ ] If playhead was after deleted clip, shift left by deleted clip duration
  - [ ] Update playbackStore.playheadPosition accordingly
  - [ ] Ensure preview player updates to new playhead position

- [ ] Verify media library persistence (AC: 5)
  - [ ] Confirm removeClip only modifies timelineStore, not mediaStore
  - [ ] Test: delete clip from timeline, verify it still exists in media library
  - [ ] User should be able to re-add deleted clip from media library to timeline
  - [ ] Document in code comments that timeline and media library are independent

- [ ] Add visual feedback for delete operation (AC: 6)
  - [ ] Brief visual indication when clip is deleted (optional fade-out animation)
  - [ ] Immediately deselect deleted clip (selectedClipId = null)
  - [ ] Timeline re-renders with updated clips array (Zustand reactivity)
  - [ ] Test rapid sequential deletions (select, delete, select, delete)

- [ ] Test delete functionality end-to-end
  - [ ] Manual test: Timeline with 3 clips (A, B, C)
  - [ ] Select clip B, click Delete → verify clips A and C remain, no gap
  - [ ] Test Delete key: select clip, press Delete key → verify clip removed
  - [ ] Test Backspace key: select clip, press Backspace → verify clip removed
  - [ ] Verify playhead moves correctly if positioned on deleted clip
  - [ ] Verify deleted clip still visible in media library
  - [ ] Test delete last clip → timeline empty, playhead resets to 0

## Dev Notes

### Architecture Constraints

- **Zustand immutability**: removeClip uses filter() to create new clips array, never mutates
- **Performance (NFR001)**: Delete operation must complete within 16ms (synchronous state update)
- **Media library independence**: Timeline clips and media library files are separate stores
- **Renderer-only operation**: No IPC calls, pure state mutation in timelineStore

### Component Structure

Primary files to create/modify:
- `src/renderer/store/timelineStore.ts` - Add removeClip action
- `src/renderer/store/timelineStore.test.ts` - Unit tests for removeClip
- `src/renderer/components/EditTools/DeleteTool.tsx` - NEW component for Delete button
- `src/renderer/components/Timeline/Timeline.tsx` - Integrate DeleteTool, add keyboard listeners
- `src/renderer/components/EditTools/index.ts` - Export DeleteTool

### Technical Implementation Details

**RemoveClip Action Logic** (from tech-spec-epic-3.md):
```typescript
removeClip: (clipId: string) => {
  set((state) => {
    const deletedClip = state.clips.find(c => c.id === clipId)
    if (!deletedClip) return state

    // Remove clip
    let clips = state.clips.filter(c => c.id !== clipId)

    // Close gap: recalculate startTime for clips after deleted clip
    const deletedStart = deletedClip.startTime
    const deletedDuration = deletedClip.duration - deletedClip.trimIn - deletedClip.trimOut

    clips = clips.map(clip => {
      if (clip.startTime > deletedStart) {
        return {
          ...clip,
          startTime: clip.startTime - deletedDuration
        }
      }
      return clip
    })

    // Update playhead if needed
    let newPlayhead = state.playheadPosition
    if (state.playheadPosition >= deletedStart
        && state.playheadPosition < deletedStart + deletedDuration) {
      newPlayhead = deletedStart
    } else if (state.playheadPosition > deletedStart) {
      newPlayhead = state.playheadPosition - deletedDuration
    }

    return {
      clips,
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      playheadPosition: newPlayhead
    }
  })
}
```

**Keyboard Event Handler**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
      e.preventDefault()
      removeClip(selectedClipId)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [selectedClipId, removeClip])
```

### Sequencing Notes

**Prerequisite: Stories 3.1, 3.2**
- Requires selectedClipId state (added in 3.1)
- Requires trim fields for duration calculations (3.1)
- Builds on established editing workflow (select → operate)

**Dependencies**:
- timelineStore.selectedClipId (from 3.1)
- timelineStore.clips (from Epic 2)
- mediaStore.files (from Epic 2) - verified as independent

### Styling Approach

Use Tailwind CSS (per architecture):
- Delete button: `bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm disabled:opacity-50`
- Icon: Use text-based "Delete" or Unicode trash icon: 🗑️
- Toolbar integration: Consistent spacing with Split button

### Testing Strategy

**Unit Tests** (timelineStore.test.ts):
```typescript
describe('removeClip', () => {
  it('should remove clip and close gap', () => {
    // Setup 3 clips: [0-5s, 5-10s, 10-15s]
    // Delete middle clip
    // Verify clips: [0-5s, 5-10s] (third clip shifted left)
  })

  it('should update playhead if on deleted clip', () => {
    // Playhead at 7s, delete clip at 5-10s
    // Verify playhead moves to 5s
  })

  it('should clear selectedClipId if deleted', () => {
    // Select clip A, delete clip A
    // Verify selectedClipId === null
  })

  it('should not affect media library', () => {
    // Delete clip from timeline
    // Verify mediaStore.files unchanged
  })
})
```

**Manual Integration Tests**:
1. Timeline with 3 clips (A: 0-5s, B: 5-10s, C: 10-15s)
2. Select clip B, click Delete → verify timeline shows A: 0-5s, C: 5-10s
3. Verify no visual gap between A and C
4. Select clip A, press Delete key → verify only C remains at 0-5s
5. Check media library → verify all 3 original files still present
6. Drag deleted clip from library back to timeline → verify it can be re-added

**Edge Cases**:
- Delete last clip on timeline → timeline empty, playhead at 0
- Delete first clip → remaining clips shift to start at 0
- Delete with playhead at exact clip boundary (start or end)
- Rapid deletions (delete all clips sequentially)

### Project Structure Notes

Following architecture.md:
- EditTools components: `src/renderer/components/EditTools/DeleteTool.tsx`
- Store actions: `src/renderer/store/timelineStore.ts`
- Import path: `import { DeleteTool } from '@/components/EditTools'`

### References

- [Source: docs/tech-spec-epic-3.md#AC-3.3] - Acceptance criteria for delete operation
- [Source: docs/tech-spec-epic-3.md#Workflows - Delete Operation Sequence] - Detailed delete workflow
- [Source: docs/tech-spec-epic-3.md#Data Models] - Timeline state structure
- [Source: docs/epics.md#Story 3.3] - User story statement
- [Source: docs/architecture.md#Zustand Store Structure] - Store action pattern for removeClip
- [Source: docs/architecture.md#Implementation Patterns] - Immutability and filter() usage
- [Source: docs/PRD.md#FR012] - Functional requirement for clip deletion
- [Source: docs/PRD.md#NFR001] - Performance: timeline operations maintain 30fps

## Dev Agent Record

### Context Reference

- `docs/stories/3-3-delete-clip-from-timeline.context.xml`

### Agent Model Used

<!-- Will be filled during implementation -->

### Debug Log References

### Completion Notes List

### File List
