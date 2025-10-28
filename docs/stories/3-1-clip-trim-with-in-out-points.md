# Story 3.1: Clip Trim with In/Out Points

Status: drafted

## Story

As a content creator,
I want to set trim points on a clip to remove unwanted sections,
So that I can include only the desired portions of my footage.

## Acceptance Criteria

1. User can select a clip on timeline to enable trim mode
2. Trim handles appear at clip start and end positions
3. Dragging trim handles adjusts in/out points with visual feedback
4. Preview updates to show trimmed region during trim adjustment
5. Timeline displays trimmed duration accurately
6. Trimmed clip plays only the selected region in preview
7. Original imported media file remains unchanged (non-destructive editing)

## Tasks / Subtasks

- [ ] Extend Clip data model with trim properties (AC: 1, 7)
  - [ ] Add `trimIn: number` field to Clip interface in timeline.types.ts
  - [ ] Add `trimOut: number` field to Clip interface in timeline.types.ts
  - [ ] Update timelineStore initialization to set trimIn=0, trimOut=0 for new clips
  - [ ] Write unit tests for clip model with trim fields

- [ ] Implement timeline store mutation for trim updates (AC: 3, 5)
  - [ ] Add `updateClip(clipId, updates)` action to timelineStore
  - [ ] Ensure immutability in updateClip implementation (Zustand pattern)
  - [ ] Add computed duration property accounting for trim values
  - [ ] Write unit tests for updateClip action

- [ ] Create TrimTool component with trim handles UI (AC: 2, 3)
  - [ ] Create TrimTool.tsx component in src/renderer/components/EditTools/
  - [ ] Render trim handles at clip boundaries (visual indicators)
  - [ ] Implement drag handlers for trim start handle
  - [ ] Implement drag handlers for trim end handle
  - [ ] Add visual feedback during drag (handle position update)
  - [ ] Use CSS transforms for GPU-accelerated dragging (NFR001 performance)
  - [ ] Clamp trim values to valid range (0 to clip duration)

- [ ] Integrate trim tool with Timeline component (AC: 1, 5)
  - [ ] Add selectedClipId state to timelineStore
  - [ ] Show TrimTool only when clip is selected
  - [ ] Update TimelineClip to display trimmed duration
  - [ ] Adjust clip visual width based on effective duration (duration - trimIn - trimOut)
  - [ ] Update timeline ruler to reflect trimmed timeline length

- [ ] Update preview player to respect trim values (AC: 4, 6)
  - [ ] Modify PreviewPlayer.tsx to read trimIn/trimOut from clip
  - [ ] Set video element currentTime to clip.trimIn when clip loads
  - [ ] Implement playback bounds: stop at (duration - trimOut)
  - [ ] Update scrubbing logic to constrain to trimmed region
  - [ ] Ensure preview updates in real-time during trim adjustment

- [ ] Implement non-destructive editing guarantee (AC: 7)
  - [ ] Verify trim operations only update Zustand state, never modify source files
  - [ ] Document in code comments that trimIn/trimOut are playback offsets only
  - [ ] Add integration test: verify source file unchanged after trim operations

- [ ] Add keyboard support and accessibility
  - [ ] Support Delete/Backspace key to clear selection
  - [ ] Add Escape key to deselect clip
  - [ ] Ensure trim handles are keyboard accessible (tab navigation)

- [ ] Test trim functionality end-to-end
  - [ ] Manual test: Import video, drag to timeline, select clip, drag trim handles
  - [ ] Verify preview shows trimmed region during adjustment
  - [ ] Verify original file exists and is unchanged after trim
  - [ ] Test edge cases: trim to 1 second, trim entire clip duration
  - [ ] Performance test: verify 30fps UI responsiveness during trim drag (NFR001)

## Dev Notes

### Architecture Constraints

- **Main/renderer separation**: Trim operations are pure renderer-side state mutations (no IPC calls)
- **Zustand immutability**: All clip updates must use set() with spread operators, never mutate state directly
- **Performance requirement (NFR001)**: Trim handle dragging must maintain 60fps (16ms update cycle) with GPU-accelerated CSS transforms
- **Non-destructive editing**: trimIn/trimOut are playback metadata only, source files remain untouched

### Component Structure

Primary components to modify/create:
- `src/renderer/types/timeline.types.ts` - Extend Clip interface
- `src/renderer/store/timelineStore.ts` - Add updateClip action and selectedClipId state
- `src/renderer/components/EditTools/TrimTool.tsx` - NEW component for trim handles
- `src/renderer/components/Timeline/TimelineClip.tsx` - Integrate TrimTool, update visual duration
- `src/renderer/components/Preview/PreviewPlayer.tsx` - Apply trim bounds to playback

### Technical Implementation Details

**Clip Model Extension** (from tech-spec-epic-3.md):
```typescript
interface Clip {
  id: string;
  sourceFile: string;      // Absolute path (unchanged)
  startTime: number;       // Position on timeline
  duration: number;        // Original duration
  trimIn: number;          // NEW: Trim start offset (seconds)
  trimOut: number;         // NEW: Trim end offset (seconds)
  trackId: number;
}
```

**Effective Duration Calculation**:
```typescript
const effectiveDuration = clip.duration - clip.trimIn - clip.trimOut
```

**Preview Playback Bounds**:
```typescript
// On clip load
video.currentTime = clip.trimIn

// During playback
if (video.currentTime >= clip.duration - clip.trimOut) {
  video.pause()
}
```

**Trim Handle Drag Pattern**:
```typescript
const handleTrimStartDrag = (e: MouseEvent) => {
  const delta = calculateMouseDelta(e)
  const newTrimIn = clamp(clip.trimIn + delta, 0, clip.duration - clip.trimOut)
  updateClip(clip.id, { trimIn: newTrimIn })
}
```

### Styling Approach

Use Tailwind CSS classes (per architecture):
- Trim handles: Absolute positioned divs with cursor-ew-resize
- Selected clip: ring-2 ring-cyan-500 (accent color)
- Drag feedback: opacity-75 during drag, transition-opacity

### Testing Strategy

**Unit Tests** (timelineStore.test.ts):
- Test updateClip action updates trimIn/trimOut correctly
- Test effective duration calculation
- Test state immutability (original state unchanged)

**Manual Integration Tests**:
1. Import sample video (10s duration)
2. Drag to timeline, select clip
3. Drag left trim handle to 2s → verify preview starts at 2s
4. Drag right trim handle to 8s → verify preview ends at 8s
5. Play timeline → verify clip plays 2s-8s only (6s effective duration)
6. Check source file → verify file unchanged

**Edge Cases**:
- Trim handles dragged beyond clip boundaries (should clamp)
- Trim to <1s duration (should allow)
- Trim overlapping handles (trimIn + trimOut >= duration → prevent)

### Project Structure Notes

Following architecture.md structure:
- EditTools folder: `src/renderer/components/EditTools/` (new folder for Epic 3)
- Types: Shared types in `src/renderer/types/timeline.types.ts`
- Store: State mutations in `src/renderer/store/timelineStore.ts`

### References

- [Source: docs/tech-spec-epic-3.md#AC-3.1] - Acceptance criteria specification
- [Source: docs/tech-spec-epic-3.md#Data Models] - Clip interface with trimIn/trimOut
- [Source: docs/tech-spec-epic-3.md#Workflows] - Trim operation sequence
- [Source: docs/epics.md#Story 3.1] - User story statement
- [Source: docs/architecture.md#Epic 3] - Component/store mapping for editing operations
- [Source: docs/architecture.md#Zustand Store Structure] - Immutability pattern for state updates
- [Source: docs/architecture.md#Styling Patterns] - Tailwind CSS usage guidelines
- [Source: docs/PRD.md#FR009] - Functional requirement for trim operation
- [Source: docs/PRD.md#NFR001] - Performance requirement: 30fps timeline responsiveness

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Will be filled during implementation -->

### Debug Log References

### Completion Notes List

### File List
