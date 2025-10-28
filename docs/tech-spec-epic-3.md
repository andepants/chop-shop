# Epic Technical Specification: Editing & Export (MVP Checkpoint)

Date: 2025-10-27
Author: andrew
Epic ID: 3
Status: Draft

---

## Overview

Epic 3 implements the core editing operations and FFmpeg export pipeline that complete the minimum viable product for Chop Shop. Building on the foundation of Epic 2's timeline and preview infrastructure, this epic delivers clip manipulation capabilities (trim, split, delete, reorder) and the FFmpeg-based MP4 export system.

This epic represents the **HARD GATE for Tuesday, October 28, 10:59 PM CT** - successful completion proves the application can deliver end-to-end video editing functionality: import → arrange → edit → export. All PRD functional requirements for core editing (FR009-FR012, FR016-FR018) are satisfied by this epic.

## Objectives and Scope

**In Scope:**

- Clip trim operations with in/out point adjustment on timeline
- Split operation at playhead position dividing clips into separate segments
- Delete operation removing clips from timeline with gap closure
- Drag-to-reorder functionality for timeline clip sequencing
- FFmpeg export pipeline processing timeline to MP4 with resolution options (720p, 1080p, source)
- Export progress monitoring with real-time percentage updates
- Export dialog with resolution selection and file location picker
- Non-destructive editing (original media files remain unchanged)
- Timeline state mutations for all editing operations
- UI components for edit tools (buttons, modals, progress indicators)

**Out of Scope:**

- Undo/redo system (explicitly deferred in PRD)
- Multi-track compositing (Epic 4 - recording capabilities)
- Audio volume adjustments or fade effects (PRD out of scope)
- Transitions between clips (PRD out of scope)
- Export presets or format options beyond MP4 (PRD out of scope)
- GPU-accelerated rendering (PRD out of scope)
- Export quality optimization beyond FFmpeg defaults (pragmatic for 72-hour sprint)

## System Architecture Alignment

Epic 3 integrates with the established Electron + React + Zustand architecture:

**Component Layer (Renderer Process):**
- EditTools components (`TrimTool.tsx`, `SplitTool.tsx`, `DeleteTool.tsx`) integrate with Timeline component from Epic 2
- Export components (`ExportModal.tsx`, `ExportProgress.tsx`) provide export UI workflow
- Timeline components extended with drag-to-reorder handlers and edit mode states

**State Management:**
- `timelineStore.ts` extended with mutation actions: `updateClip()`, `splitClip()`, `removeClip()`, `reorderClips()`
- `uiStore.ts` manages export modal visibility and progress state
- All operations maintain Zustand immutability patterns

**Service Layer (Main Process):**
- `ffmpeg.service.ts` implements export pipeline: command building, child process execution, progress parsing
- `file.service.ts` handles output file validation and path resolution
- IPC handlers in `ffmpeg.handlers.ts` bridge renderer export requests to main process FFmpeg execution

**Architecture Constraints:**
- Main/renderer separation maintained (FFmpeg runs only in main process per ADR-002)
- Timeline operations remain renderer-side for 30fps UI responsiveness (NFR001)
- All file paths stored as absolute paths using `path.join` (architecture pattern)
- Export runs asynchronously with progress events to prevent UI blocking

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|--------|---------|-------|
| `ffmpeg.service.ts` | FFmpeg command construction and execution for export | `ExportOptions` (clips array, resolution, output path) | Export result with output file path, progress events via IPC | Main process |
| `file.service.ts` | Output file validation, temp file management | File paths, validation rules | Validated paths, file existence checks | Main process |
| `timelineStore.ts` (mutations) | Timeline state mutations for editing operations | Clip IDs, trim values, split positions, reorder indices | Updated timeline state | Renderer (Zustand) |
| `TrimTool.tsx` | Trim handle UI and trim value updates | Clip selection, drag events | Trim in/out values to store | Renderer component |
| `SplitTool.tsx` | Split button UI and playhead position capture | Playhead position, selected clip | Split operation trigger | Renderer component |
| `DeleteTool.tsx` | Delete button UI and clip removal | Selected clip ID | Delete operation trigger | Renderer component |
| `ExportModal.tsx` | Export settings UI (resolution, output path) | Timeline clips, current project state | Export configuration | Renderer component |
| `ExportProgress.tsx` | Real-time export progress display | Progress percentage from IPC events | Progress bar UI | Renderer component |
| `Timeline.tsx` (drag-reorder) | Drag-and-drop reorder handlers | Clip drag events, drop positions | Reordered clip array | Renderer component |

### Data Models and Contracts

**Clip Model (Extended from Epic 2):**

```typescript
interface Clip {
  id: string;              // UUID
  sourceFile: string;      // Absolute path to original video file
  startTime: number;       // Position on timeline (seconds)
  duration: number;        // Original clip duration (seconds)
  trimIn: number;          // Trim start offset (seconds) - NEW for Epic 3
  trimOut: number;         // Trim end offset (seconds) - NEW for Epic 3
  trackId: number;         // Track assignment (always 1 for Epic 3)
}
```

**Export Options:**

```typescript
interface ExportOptions {
  clips: Clip[];                           // All timeline clips in sequence
  resolution: '720p' | '1080p' | 'source'; // Export resolution target
  outputPath: string;                      // Absolute path for output MP4
}
```

**Export Progress Event:**

```typescript
interface ExportProgressEvent {
  percent: number;      // 0-100
  currentFile: string;  // Current clip being processed
  eta?: number;         // Estimated seconds remaining (optional)
}
```

**Timeline Store Actions (New for Epic 3):**

```typescript
interface TimelineStoreActions {
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  splitClip: (clipId: string, position: number) => void;  // position = playhead on timeline
  removeClip: (clipId: string) => void;
  reorderClips: (sourceIndex: number, destIndex: number) => void;
}
```

### APIs and Interfaces

**IPC Channel: `start-export`**

Request:
```typescript
{
  clips: Clip[],
  resolution: '720p' | '1080p' | 'source',
  outputPath: string
}
```

Response:
```typescript
IPCResponse<{ outputPath: string }>
```

**IPC Event: `export-progress` (Main → Renderer)**

Payload:
```typescript
{
  percent: number,
  currentFile: string
}
```

**IPC Event: `export-complete` (Main → Renderer)**

Payload:
```typescript
{
  success: boolean,
  outputPath: string
}
```

**IPC Event: `export-error` (Main → Renderer)**

Payload:
```typescript
{
  message: string,
  code: string  // ERROR_CODES.EXPORT_FAILED
}
```

**FFmpeg Service Methods:**

```typescript
class FFmpegService {
  async executeExport(options: ExportOptions): Promise<{ outputPath: string }>;
  buildFFmpegCommand(clips: Clip[], resolution: string, outputPath: string): string[];
  parseProgress(stderr: string): number;  // Parse FFmpeg stderr for progress %
}
```

### Workflows and Sequencing

**Trim Operation Sequence:**

1. User selects clip on timeline → `selectedClipId` set in `timelineStore`
2. Trim handles appear at clip start/end (visual only)
3. User drags trim handle → local component state tracks drag position
4. On drag end → `updateClip(clipId, { trimIn: newValue })` called
5. Timeline re-renders with updated clip duration
6. Preview player respects trim values during playback

**Split Operation Sequence:**

1. User positions playhead on a clip
2. User clicks "Split" button in timeline toolbar
3. Split handler validates playhead is on a clip
4. `splitClip(clipId, playheadPosition)` called
5. Store creates two new clips:
   - Clip A: original start → playhead position
   - Clip B: playhead position → original end
6. Original clip removed, new clips inserted at same timeline position
7. Timeline re-renders with both clips visible

**Delete Operation Sequence:**

1. User selects clip on timeline
2. User clicks Delete button or presses Delete/Backspace key
3. `removeClip(clipId)` called
4. Store removes clip from array
5. Remaining clips automatically shift left (handled by Timeline component layout)
6. Timeline re-renders

**Drag-to-Reorder Sequence:**

1. User drags clip to new position on timeline
2. Timeline component calculates drop index based on mouse position
3. Visual feedback shows drop target (gap preview)
4. On drop → `reorderClips(sourceIndex, destIndex)` called
5. Store reorders clips array
6. Timeline re-renders with new sequence

**Export Operation Sequence:**

1. User clicks "Export" button (top bar)
2. `ExportModal` opens with resolution options and output path picker
3. User selects resolution (720p/1080p/source) and output location
4. User clicks "Export" in modal
5. Modal shows `ExportProgress` component
6. Renderer sends `start-export` IPC message with `ExportOptions`
7. Main process `ffmpeg.handlers.ts` receives request
8. `ffmpegService.executeExport()` builds FFmpeg command
9. FFmpeg processes clips sequentially:
   - For each clip: apply trim values, concat to timeline
   - Encode to selected resolution
   - Output to MP4
10. FFmpeg stderr parsed for progress percentage
11. Main sends `export-progress` events to renderer (every ~100ms)
12. Renderer updates progress bar
13. On completion: Main sends `export-complete` event
14. Renderer shows success notification with output path
15. On error: Main sends `export-error` event, renderer shows error dialog

## Non-Functional Requirements

### Performance

**NFR001 (Timeline UI Responsiveness):**
- Editing operations (trim, split, delete) must update timeline UI within 16ms (60fps) for up to 10 clips
- Drag-to-reorder operations maintain smooth visual feedback at 30fps minimum
- Trim handle dragging uses CSS transforms for GPU acceleration

**Export Performance:**
- FFmpeg export completes within 2x real-time (10-minute timeline exports in <20 minutes)
- Progress updates sent at maximum 10Hz (every 100ms) to avoid IPC flooding
- Export does not block UI - main window remains responsive during export

### Security

**IPC Security:**
- Export operations validated in main process handlers (file path validation, format checking)
- Output paths restricted to user-selected directories (no arbitrary file system writes)
- FFmpeg command injection prevented via argument array (not shell string concatenation)

**File System Security:**
- Trim/split/delete operations never modify original source files (non-destructive editing)
- Temp file cleanup on export error to prevent disk space leaks

### Reliability/Availability

**NFR002 (Stability):**
- Export failures (FFmpeg crashes, disk full, invalid clips) handled gracefully with user error messages
- Timeline operations wrapped in try-catch with rollback on failure
- No memory leaks during editing sessions (Zustand state properly garbage collected)

**Error Recovery:**
- Export errors show actionable messages: "Export failed. Check disk space and try again."
- FFmpeg stderr captured and logged for debugging
- Failed exports do not leave partial/corrupted files

### Observability

**Logging:**
- All FFmpeg commands logged: `[FFmpeg] Executing: ffmpeg -i input.mp4 ...`
- Export progress logged: `[FFmpeg] Progress: 45%`
- Timeline mutations logged: `[Timeline] Split clip abc123 at 5.2s`
- IPC errors logged with context: `[IPC] Export failed: ENOSPC`

**Monitoring:**
- Export duration tracked and logged
- FFmpeg exit codes captured (0 = success, non-zero = error)
- Progress percentage validated (0-100 range)

## Dependencies and Integrations

**NPM Dependencies (from package.json):**

- `ffmpeg-static@5.2.0` - FFmpeg 6.0 binaries bundled with app
- `zustand@5.0.8` - State management for timeline mutations
- `uuid@^9.0.0` - Clip ID generation for split operations
- `clsx@^2.0.0` and `tailwind-merge@^2.0.0` - Tailwind class utilities for edit tool styling

**Electron APIs:**

- `ipcMain.handle()` - Export command handling
- `ipcRenderer.invoke()` - Export requests from renderer
- `ipcRenderer.on()` - Progress event listeners
- `child_process.spawn()` - FFmpeg execution
- `dialog.showSaveDialog()` - Output file picker

**Internal Integrations:**

- Timeline component (Epic 2) - Extended with edit handlers
- Preview player (Epic 2) - Respects trim values during playback
- Media store (Epic 2) - Source files referenced by clips
- Playback store (Epic 2) - Playhead position for split operation

**External Tools:**

- FFmpeg 6.0 (via ffmpeg-static) - Video processing and export

## Acceptance Criteria (Authoritative)

**AC-3.1: Clip Trim with In/Out Points**

1. User can select a clip on timeline to enable trim mode
2. Trim handles appear at clip start and end positions
3. Dragging trim handles adjusts in/out points with visual feedback
4. Preview updates to show trimmed region during trim adjustment
5. Timeline displays trimmed duration accurately
6. Trimmed clip plays only the selected region in preview
7. Original imported media file remains unchanged (non-destructive)

**AC-3.2: Split Clip at Playhead**

1. "Split" button available in timeline toolbar
2. User positions playhead on a clip and clicks Split
3. Selected clip splits into two separate clips at playhead position
4. Both resulting clips appear on timeline with correct durations
5. Split clips can be individually selected, moved, or deleted
6. Split operation completes immediately (no loading delay)

**AC-3.3: Delete Clip from Timeline**

1. User can select a clip on timeline
2. Delete button or keyboard shortcut (Delete/Backspace) removes selected clip
3. Remaining clips automatically shift left to close gap
4. Timeline updates playhead position if it was on deleted clip
5. Deleted clip disappears from timeline but remains in media library
6. User can delete multiple clips sequentially

**AC-3.4: Drag-to-Reorder Timeline Clips**

1. User can click and drag a timeline clip to a new position
2. Clips automatically shift to make space during drag operation
3. Drop clip between other clips to insert at that position
4. Timeline updates time markers after reordering
5. Preview updates to show reordered sequence during playback
6. Drag operation is smooth with visual feedback (ghost/preview)

**AC-3.5: Export Timeline to MP4**

1. Export button in top bar becomes enabled when timeline has clips
2. Clicking Export opens export dialog with settings:
   - Resolution options: 720p, 1080p, Source quality
   - Output file location picker
3. Export process starts and displays progress bar with percentage
4. FFmpeg processes timeline clips in sequence with proper encoding
5. Exported MP4 file plays correctly in external player (QuickTime, VLC)
6. Audio and video remain synchronized in exported file
7. Export completes without memory leaks or crashes
8. User receives success notification with file location

## Traceability Mapping

| AC | Spec Section | Components/APIs | Test Approach |
|----|--------------|-----------------|---------------|
| AC-3.1 (Trim) | Detailed Design → TrimTool, Timeline mutations | `TrimTool.tsx`, `timelineStore.updateClip()`, `Timeline.tsx` | Manual: Drag trim handles, verify preview shows trimmed region, check original file unchanged |
| AC-3.2 (Split) | Detailed Design → SplitTool, Timeline mutations | `SplitTool.tsx`, `timelineStore.splitClip()` | Manual: Position playhead, click Split, verify two clips created with correct durations |
| AC-3.3 (Delete) | Detailed Design → DeleteTool, Timeline mutations | `DeleteTool.tsx`, `timelineStore.removeClip()`, keyboard handler | Manual: Select clip, press Delete key, verify clip removed and gap closed |
| AC-3.4 (Reorder) | Detailed Design → Timeline drag handlers | `Timeline.tsx` drag handlers, `timelineStore.reorderClips()` | Manual: Drag clip to new position, verify sequence updates and playback correct |
| AC-3.5 (Export) | Detailed Design → Export workflow, FFmpeg service | `ExportModal.tsx`, `ExportProgress.tsx`, `ffmpeg.service.ts`, `ffmpeg.handlers.ts` | Manual: Export timeline, verify progress updates, check output MP4 plays correctly in QuickTime/VLC with synced audio |
| NFR001 (Performance) | Non-Functional Requirements → Performance | All Timeline operations | Manual: Edit timeline with 10+ clips, verify smooth 30fps responsiveness |
| NFR002 (Stability) | Non-Functional Requirements → Reliability | Error handling in all services and components | Manual: Test error scenarios (disk full, invalid files), verify graceful recovery |

## Risks, Assumptions, Open Questions

**Risks:**

- **R1: FFmpeg Export Complexity** - Concatenating multiple clips with varying trim values may require complex FFmpeg filter chains. *Mitigation: Use concat demuxer with temp files if filter_complex fails.*
- **R2: Export Performance** - Large timelines (>20 clips) may exceed 2x real-time export. *Mitigation: Use FFmpeg's `ultrafast` preset for 72-hour sprint; optimize post-launch.*
- **R3: Timeline Reorder Performance** - Drag-to-reorder with many clips may drop below 30fps. *Mitigation: Limit to 10 clips per NFR001; virtual scrolling if needed.*
- **R4: Trim Precision** - Video files without keyframes may not trim at exact frame boundaries. *Mitigation: Acceptable for MVP; document limitation.*

**Assumptions:**

- **A1:** FFmpeg 6.0 (via ffmpeg-static) handles all supported formats (MP4, MOV, WebM) without transcoding issues
- **A2:** Users have sufficient disk space for export output (no quota checks implemented for MVP)
- **A3:** Zustand state updates complete within 16ms for timeline responsiveness
- **A4:** Export progress parsing from FFmpeg stderr is reliable for percentage calculation
- **A5:** macOS file system permissions allow writing to user-selected output paths

**Open Questions:**

- **Q1:** Should export support custom FFmpeg quality settings (CRF values)? *Resolution: No - use defaults for 72-hour sprint (PRD out of scope).*
- **Q2:** How to handle audio tracks when clips have different sample rates? *Resolution: FFmpeg auto-resamples to first clip's rate.*
- **Q3:** Should split preserve original clip ID or create new IDs? *Resolution: Create new UUIDs for both clips to avoid state conflicts.*

## Test Strategy Summary

**Unit Tests:**

- `timelineStore.test.ts` - Test all mutation actions (updateClip, splitClip, removeClip, reorderClips)
  - Verify immutability (original state not mutated)
  - Verify split creates two clips with correct durations
  - Verify delete removes clip and maintains array order
  - Verify reorder moves clip to correct index

**Integration Tests:**

- Manual IPC testing: Invoke `start-export` from renderer, verify main process receives correct options
- Manual FFmpeg testing: Verify export command builds correctly with sample clips

**Manual Testing (Critical Paths):**

1. **Trim Test:**
   - Import video, drag to timeline
   - Select clip, drag trim handles
   - Verify preview shows trimmed region
   - Verify original file unchanged

2. **Split Test:**
   - Import video, drag to timeline
   - Position playhead at 5-second mark
   - Click Split
   - Verify two clips created (0-5s and 5s-end)

3. **Delete Test:**
   - Timeline with 3 clips
   - Select middle clip, press Delete
   - Verify clip removed, gap closed, other clips shift left

4. **Reorder Test:**
   - Timeline with 3 clips (A, B, C)
   - Drag clip C to beginning
   - Verify new order: C, A, B
   - Play timeline, verify sequence correct

5. **Export Test:**
   - Timeline with 3 trimmed clips
   - Click Export, select 1080p, choose output path
   - Monitor progress bar (should reach 100%)
   - Verify output MP4 plays in QuickTime
   - Verify audio synced, no glitches

6. **Error Test:**
   - Attempt export to read-only directory
   - Verify error message shown
   - Verify app remains stable

**Edge Cases:**

- Trim handles dragged beyond clip boundaries (should clamp to 0 and duration)
- Split on clip with <1s duration (should still create two clips)
- Delete last clip on timeline (timeline becomes empty, export disabled)
- Export with no clips (Export button disabled, error if triggered)
- Export with disk full (FFmpeg error caught, user notified)

**Performance Testing:**

- Timeline with 10 clips: Edit operations maintain 30fps (visual inspection)
- Export 10-minute timeline: Complete within 20 minutes (2x real-time)
- Memory usage: No leaks during 15-minute editing session (Activity Monitor)

**Acceptance:**

- All 5 stories (3.1-3.5) pass acceptance criteria
- No crashes during core workflow (import → edit → export)
- Exported video plays correctly in QuickTime and VLC
- Timeline UI remains responsive (30fps) with 10 clips
