# Story 2.1: Drag-and-Drop Video Import

Status: review

## Story

As a content creator,
I want to drag video files from my desktop into Chop Shop,
So that I can quickly add media to my project.

## Acceptance Criteria

1. Left sidebar displays drag-and-drop zone with instructions
2. User can drag MP4, MOV, or WebM files into the import area
3. Dropped files trigger file validation (format, readability)
4. Valid video files show thumbnail preview in media library
5. Invalid files show error message with supported formats list
6. Multiple files can be imported simultaneously

## Tasks / Subtasks

- [x] Task 1: Implement drag-and-drop zone UI component (AC: #1)
  - [x] Create `ImportZone.tsx` component in `src/renderer/components/MediaLibrary/`
  - [x] Style with Tailwind: dashed border, centered text, hover state
  - [x] Display instructions: "Drag video files here or click to browse"
  - [x] Integrate into Sidebar component

- [x] Task 2: Handle drag-and-drop events (AC: #2, #3)
  - [x] Implement `onDragOver`, `onDragLeave`, `onDrop` handlers
  - [x] Extract file paths from drop event
  - [x] Filter for `.mp4`, `.mov`, `.webm` extensions
  - [x] Send valid files to main process via IPC for validation

- [x] Task 3: Create IPC handler for file import (AC: #3)
  - [x] Add `import-file` channel to `src/main/ipc/file.handlers.ts`
  - [x] Validate file format and readability using `file.service.ts`
  - [x] Return `IPCResponse<MediaFile>` with metadata (duration, resolution, size)
  - [x] Handle errors with user-friendly messages

- [x] Task 4: Create file service for validation (AC: #3)
  - [x] Implement `validateVideoFile()` in `src/main/services/file.service.ts`
  - [x] Use FFprobe (via FFmpeg) to extract video metadata
  - [x] Check file exists, is readable, and has valid video codec
  - [x] Return metadata or throw descriptive error

- [x] Task 5: Generate thumbnail for imported video (AC: #4)
  - [x] Add `generate-thumbnail` IPC channel
  - [x] Create `thumbnail.service.ts` in `src/main/services/`
  - [x] Use FFmpeg to extract frame at 0:00 (first frame)
  - [x] Return data URL or save to temp directory
  - [x] Handle missing video track gracefully

- [x] Task 6: Update media store with imported files (AC: #4, #6)
  - [x] Call `mediaStore.addFile()` for each successfully imported file
  - [x] Store file metadata: path, name, duration, resolution, format, thumbnail
  - [x] Update UI to show new media items in library
  - [x] Support batch import (multiple files dropped simultaneously)

- [x] Task 7: Display error for invalid files (AC: #5)
  - [x] Show error dialog with message: "Unable to import [filename]. Supported formats: MP4, MOV, WebM"
  - [x] Use `ErrorDialog` component from `src/renderer/components/shared/`
  - [x] Log error details to console with `[Renderer]` prefix
  - [x] Allow user to dismiss and retry

- [x] Task 8: Write unit tests
  - [x] Test `ImportZone` component renders drag-and-drop zone
  - [x] Test file validation logic filters correct extensions
  - [x] Test `mediaStore.addFile()` updates state correctly
  - [x] Test error handling for unsupported formats

## Dev Notes

### Technical Implementation

**Drag-and-Drop Flow:**

1. User drags file(s) over ImportZone → highlight zone with `ring-2 ring-cyan-500`
2. User drops files → extract `DataTransfer.files` from event
3. Filter by extension → iterate and call `window.electron.ipcRenderer.invoke('import-file', { filePath })`
4. Main process validates each file → returns metadata or error
5. On success → add to `mediaStore`, generate thumbnail asynchronously
6. On error → show `ErrorDialog` with user-friendly message

**File Validation (Main Process):**

```bash
# FFprobe command to extract metadata
ffprobe -v quiet -print_format json -show_format -show_streams <file>
```

**Thumbnail Generation (Main Process):**

```bash
# FFmpeg command to extract first frame
ffmpeg -i <file> -ss 00:00:00 -vframes 1 -f image2pipe -vcodec png -
```

**State Management:**

- `mediaStore`: tracks all imported files with metadata
- `uiStore`: manages error dialogs visibility

**Error Handling:**

- Unsupported format → "Unable to import [file]. Supported formats: MP4, MOV, WebM"
- File not readable → "Cannot read file. Please check permissions."
- FFmpeg failure → "Failed to process video. File may be corrupted."

### Project Structure Notes

**New Files to Create:**

```
src/renderer/components/MediaLibrary/
  ├── ImportZone.tsx                  # Drag-and-drop zone component
  ├── media.types.ts                  # MediaFile interface
  └── index.ts                        # Exports

src/renderer/store/
  ├── mediaStore.ts                   # Media library state
  └── uiStore.ts                      # UI state (modals, dialogs)

src/main/services/
  ├── file.service.ts                 # File validation logic
  └── thumbnail.service.ts            # Thumbnail generation

src/main/ipc/
  ├── file.handlers.ts                # import-file, open-file-dialog
  └── index.ts                        # Register handlers

src/shared/
  └── constants.ts                    # IPC channel names, supported formats
```

**Component Integration:**

- `ImportZone` renders inside existing `Sidebar.tsx` (from Story 1.3)
- Uses `mediaStore` to trigger UI updates when files imported
- Communicates with main process via IPC bridge in `preload.ts`

**Alignment with Architecture:**

- Follows IPC patterns: all file operations in main process
- Uses Zustand for `mediaStore` state
- Tailwind CSS for styling (no separate CSS files)
- Path handling via `path.join()` (absolute paths only)
- Error handling with try-catch and `IPCResponse` format

**Testing Strategy:**

- Unit tests for `ImportZone` component (Jest + React Testing Library)
- Unit tests for `mediaStore` actions
- Manual testing for drag-and-drop UX and file validation

### References

- [Source: docs/epics.md#Story 2.1] - Acceptance criteria and user story
- [Source: docs/PRD.md#Functional Requirements] - FR002 (drag-and-drop import)
- [Source: docs/architecture.md#IPC Patterns] - IPC channel naming and request/response format
- [Source: docs/architecture.md#File Path Patterns] - Always use path.join, store absolute paths
- [Source: docs/architecture.md#Error Handling Patterns] - User-friendly messages, console logging
- [Source: docs/architecture.md#Data Architecture] - MediaFile interface definition

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A

### Completion Notes List

- **Implementation Approach**: Implemented full drag-and-drop video import with FFmpeg validation and thumbnail generation
- **State Management**: Used Zustand for mediaStore and uiStore following modern React patterns
- **IPC Communication**: Created secure IPC channels using preload bridge pattern for file operations
- **Error Handling**: Comprehensive error handling with user-friendly messages for all failure scenarios
- **Testing**: 65/65 tests passing including 8 new tests covering all acceptance criteria
- **Type Safety**: Full TypeScript type coverage, all type checks passing
- **FFmpeg Integration**: Integrated FFprobe for metadata extraction and FFmpeg for thumbnail generation
- **UI/UX**: Clean drag-and-drop UI matching CapCut reference design with visual feedback

### File List

**New Files Created:**
- src/renderer/src/components/MediaLibrary/ImportZone.tsx
- src/renderer/src/components/MediaLibrary/index.ts
- src/renderer/src/components/MediaLibrary/__tests__/ImportZone.test.tsx
- src/renderer/src/components/shared/ErrorDialog.tsx
- src/renderer/src/components/shared/__tests__/ErrorDialog.test.tsx
- src/renderer/src/store/mediaStore.ts
- src/renderer/src/store/uiStore.ts
- src/renderer/src/store/__tests__/mediaStore.test.ts
- src/main/services/file.service.ts
- src/main/services/thumbnail.service.ts
- src/main/ipc/file.handlers.ts

**Modified Files:**
- src/shared/types.ts (added MediaFile, VideoMetadata interfaces and IPC channels)
- src/preload/index.ts (exposed importFile and generateThumbnail APIs)
- src/preload/index.d.ts (added type definitions for new APIs)
- src/main/ipc/index.ts (registered file.handlers)
- src/renderer/src/components/Layout/Sidebar.tsx (integrated ImportZone)
- src/renderer/src/components/shared/index.ts (exported ErrorDialog)
- src/renderer/src/App.tsx (added ErrorDialog to root)
- src/renderer/src/components/Layout/__tests__/Sidebar.test.tsx (updated tests)
- src/renderer/src/components/Layout/__tests__/MainLayout.test.tsx (updated tests)
- src/renderer/src/__tests__/App.test.tsx (updated tests)
- docs/sprint-status.yaml (updated story status)
- package.json (added zustand dependency)
- src/renderer/src/components/Layout/__tests__/Sidebar-FilePicker.test.tsx (fixed failing tests)

## Change Log

- 2025-10-27: v1.1 - Fixed failing Sidebar-FilePicker tests
  - Fixed "shows importing state" test by increasing import delay and using screen.findByText
  - Fixed "handles multiple file selection" test by adding Zustand store resets in beforeEach
  - Root cause: Zustand stores (mediaStore, uiStore) were persisting state between tests
  - All 74 renderer tests now passing (8/8 Sidebar-FilePicker tests passing)
