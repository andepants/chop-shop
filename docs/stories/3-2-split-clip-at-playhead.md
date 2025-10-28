# Story 3.2: Split Clip at Playhead

Status: review

## Story

As a content creator,
I want to split a clip at the playhead position,
So that I can separate sections and remove unwanted parts.

## Acceptance Criteria

1. "Split" button available in timeline toolbar
2. User positions playhead on a clip and clicks Split
3. Selected clip splits into two separate clips at playhead position
4. Both resulting clips appear on timeline with correct durations
5. Split clips can be individually selected, moved, or deleted
6. Split operation is immediate (no loading delay)

## Tasks / Subtasks

- [x] Add splitClip action to timelineStore (AC: 3, 4, 6)
  - [x] Implement `splitClip(clipId: string, position: number)` action in timelineStore.ts
  - [x] Calculate split position relative to clip start: `splitPoint = position - clip.startTime`
  - [x] Validate split position is within clip bounds (clip.trimIn to clip.duration - clip.trimOut)
  - [x] Create two new clips with unique UUIDs (using crypto.randomUUID())
  - [x] Set Clip A duration: startTime to splitPoint
  - [x] Set Clip B startTime: original startTime + splitPoint, duration: remaining
  - [x] Preserve trimIn/trimOut values from original clip appropriately
  - [x] Remove original clip and insert both new clips at same position
  - [x] Ensure immutability (spread operators, no mutations)
  - [x] Write unit tests for splitClip action

- [x] Create SplitTool component with Split button UI (AC: 1)
  - [x] Split tool already exists in ToolSelectionBar.tsx
  - [x] Rendered in timeline toolbar with 'C' keyboard shortcut
  - [x] Styled consistently using Tailwind
  - [x] Tool-mode approach (industry standard like Premiere Pro)
  - [x] Integrated in MainLayout.tsx

- [x] Implement split handler logic (AC: 2, 3)
  - [x] Split logic implemented in Timeline.tsx (lines 159-173)
  - [x] Reads playheadPosition from playbackStore
  - [x] Validates playhead within clip bounds
  - [x] Calls splitClip(clipId, playheadPosition) when split tool active
  - [x] Warns user if playhead not on clip
  - [x] Deselects clip after split (splitClip sets selectedClipId to null)

- [x] Update Timeline component to display split clips (AC: 4, 5)
  - [x] Timeline re-renders via Zustand reactivity
  - [x] Both split clips render with correct widths
  - [x] Clip positions are sequential (sorted by startTime)
  - [x] Split clips are independently selectable
  - [x] Split clips can be individually deleted

- [x] Handle edge cases and validation (AC: 6)
  - [x] Prevents split at clip start (position <= clip.startTime)
  - [x] Prevents split at clip end (position >= clip.endTime)
  - [x] Handles trimmed clips: split position respects trim boundaries
  - [x] Split completes synchronously (no async delays)
  - [x] Tested split on clips with existing trimIn/trimOut values

- [x] Test split functionality end-to-end
  - [x] Comprehensive unit tests added (30 tests, all passing)
  - [x] Tests verify two clips created at split position
  - [x] Tests verify both clips independently selectable/deletable
  - [x] Performance test: verifies split completes in <16ms (NFR001)
  - [x] Tests verify trim values preserved correctly on trimmed clips

## Dev Notes

### Architecture Constraints

- **Zustand immutability**: splitClip creates new clips array, never mutates existing clips
- **Performance (NFR001)**: Split operation must complete within 16ms (synchronous, UI remains 60fps)
- **UUID generation**: Use uuid package (already in package.json) for new clip IDs
- **Renderer-only operation**: No IPC calls, pure state mutation in renderer process

### Component Structure

Primary files to create/modify:
- `src/renderer/store/timelineStore.ts` - Add splitClip action
- `src/renderer/store/timelineStore.test.ts` - Unit tests for splitClip
- `src/renderer/components/EditTools/SplitTool.tsx` - NEW component for Split button
- `src/renderer/components/Timeline/Timeline.tsx` - Integrate SplitTool into toolbar
- `src/renderer/components/EditTools/index.ts` - Export SplitTool

### Technical Implementation Details

**SplitClip Action Logic** (from tech-spec-epic-3.md):
```typescript
splitClip: (clipId: string, position: number) => {
  set((state) => {
    const clip = state.clips.find(c => c.id === clipId)
    if (!clip) return state

    const splitPoint = position - clip.startTime
    const effectiveDuration = clip.duration - clip.trimIn - clip.trimOut

    // Validate split position is within trimmed bounds
    if (splitPoint <= 0 || splitPoint >= effectiveDuration) {
      console.warn('[Timeline] Invalid split position:', splitPoint)
      return state
    }

    // Create two new clips
    const clipA: Clip = {
      id: uuidv4(),
      sourceFile: clip.sourceFile,
      startTime: clip.startTime,
      duration: splitPoint,
      trimIn: clip.trimIn,
      trimOut: clip.duration - splitPoint - clip.trimIn,
      trackId: clip.trackId
    }

    const clipB: Clip = {
      id: uuidv4(),
      sourceFile: clip.sourceFile,
      startTime: clip.startTime + splitPoint,
      duration: clip.duration - splitPoint,
      trimIn: clip.trimIn + splitPoint,
      trimOut: clip.trimOut,
      trackId: clip.trackId
    }

    // Remove original, insert both new clips
    const clips = state.clips.filter(c => c.id !== clipId)
    clips.push(clipA, clipB)
    clips.sort((a, b) => a.startTime - b.startTime)

    return { clips, selectedClipId: null }
  })
}
```

**Split Button Enabled State**:
```typescript
const isEnabled = selectedClipId && playheadPosition >= selectedClip.startTime
  && playheadPosition <= selectedClip.startTime + effectiveDuration
```

### Sequencing Notes

**Prerequisite: Story 3.1 (Trim)**
- Requires trimIn/trimOut fields in Clip model (added in 3.1)
- Split logic must account for trim values when calculating durations

**Dependencies**:
- uuid package (already installed per package.json in architecture.md)
- playbackStore.playheadPosition (exists from Epic 2)
- timelineStore.selectedClipId (added in Story 3.1)

### Styling Approach

Use Tailwind CSS (per architecture):
- Split button: `bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-sm disabled:opacity-50`
- Toolbar: `flex items-center gap-2 px-4 py-2 border-b border-zinc-700`
- Consistent with architecture.md styling patterns

### Testing Strategy

**Unit Tests** (timelineStore.test.ts):
```typescript
describe('splitClip', () => {
  it('should create two clips at split position', () => {
    // Setup clip with 10s duration at startTime 0
    // Split at position 5s
    // Verify Clip A: 0-5s, Clip B: 5-10s
  })

  it('should preserve trim values correctly', () => {
    // Setup clip with trimIn=2, trimOut=1, duration=10
    // Split at position 5s
    // Verify trim values distributed correctly
  })

  it('should reject split at clip boundaries', () => {
    // Attempt split at clip start → no change
    // Attempt split at clip end → no change
  })
})
```

**Manual Integration Tests**:
1. Import 10s video, drag to timeline
2. Position playhead at 3s
3. Select clip, click Split
4. Verify UI shows two clips: 0-3s and 3-10s
5. Select first clip, delete → verify only second clip remains
6. Undo is out of scope (PRD) - accept permanent operation

**Edge Cases**:
- Split clip with duration <2s (should still work, create tiny clips)
- Split trimmed clip (verify trim boundaries respected)
- Split at exact playhead position when zoomed in timeline
- Multiple rapid split clicks (ensure UUIDs unique, no race conditions)

### Project Structure Notes

Following architecture.md:
- EditTools components: `src/renderer/components/EditTools/SplitTool.tsx`
- Store actions: `src/renderer/store/timelineStore.ts`
- Import path: `import { SplitTool } from '@/components/EditTools'`

### References

- [Source: docs/tech-spec-epic-3.md#AC-3.2] - Acceptance criteria for split operation
- [Source: docs/tech-spec-epic-3.md#Workflows - Split Operation Sequence] - Detailed split workflow
- [Source: docs/tech-spec-epic-3.md#Data Models] - Clip interface structure
- [Source: docs/epics.md#Story 3.2] - User story statement
- [Source: docs/architecture.md#Zustand Store Structure] - Store action pattern
- [Source: docs/architecture.md#Implementation Patterns] - UUID usage, immutability
- [Source: docs/PRD.md#FR011] - Functional requirement for split operation
- [Source: docs/PRD.md#NFR001] - Performance: timeline operations must maintain 30fps

## Dev Agent Record

### Context Reference

- `docs/stories/3-2-split-clip-at-playhead.context.xml`

### Agent Model Used

<!-- Will be filled during implementation -->

### Debug Log References

### Completion Notes List

### File List
