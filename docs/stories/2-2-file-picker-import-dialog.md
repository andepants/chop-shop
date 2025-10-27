# Story 2.2: File Picker Import Dialog

Status: approved

## Story

As a content creator,
I want to click an Import button to browse for video files,
So that I can add media without drag-and-drop.

## Acceptance Criteria

1. "Import" button visible in left sidebar
2. Clicking Import opens native file picker dialog (via Electron)
3. File picker filters to show only MP4, MOV, WebM files
4. Selected files appear in media library with thumbnails
5. User can select multiple files in single file picker operation
6. Import process shows loading indicator for large files

## Tasks / Subtasks

- [ ] Task 1: Add Import button to sidebar (AC: #1)
  - [ ] Update `Sidebar.tsx` component to include "Import" button
  - [ ] Style with Tailwind: `bg-cyan-500 hover:bg-cyan-600 rounded px-4 py-2`
  - [ ] Position above or below ImportZone from Story 2.1
  - [ ] Add file icon or label "Import"

- [ ] Task 2: Implement file picker dialog (AC: #2, #3)
  - [ ] Add `open-file-dialog` IPC channel in `src/main/ipc/file.handlers.ts`
  - [ ] Use Electron's `dialog.showOpenDialog()` API
  - [ ] Configure filters: `{ name: 'Videos', extensions: ['mp4', 'mov', 'webm'] }`
  - [ ] Set `properties: ['openFile', 'multiSelections']` for multi-file selection
  - [ ] Return selected file paths array

- [ ] Task 3: Handle Import button click (AC: #2, #4)
  - [ ] Implement onClick handler in Sidebar component
  - [ ] Call `window.electron.ipcRenderer.invoke('open-file-dialog')`
  - [ ] Receive array of selected file paths
  - [ ] Iterate and call `import-file` for each path (reuse from Story 2.1)
  - [ ] Update media library UI as files are imported

- [ ] Task 4: Add loading indicator for imports (AC: #6)
  - [ ] Add `isImporting` state to `mediaStore`
  - [ ] Set `isImporting = true` when file picker returns paths
  - [ ] Show loading spinner in ImportZone or Sidebar during import
  - [ ] Set `isImporting = false` after all files processed
  - [ ] Display count: "Importing 3 files..." during batch import

- [ ] Task 5: Reuse file validation from Story 2.1 (AC: #4)
  - [ ] Use existing `import-file` IPC channel for validation
  - [ ] Use existing `file.service.ts` for metadata extraction
  - [ ] Use existing `thumbnail.service.ts` for thumbnail generation
  - [ ] Add to `mediaStore` with same flow as drag-and-drop

- [ ] Task 6: Handle import errors gracefully (AC: #4)
  - [ ] If any file fails validation, show error for that file only
  - [ ] Continue processing remaining files in batch
  - [ ] Display summary: "Imported 2 of 3 files. 1 failed."
  - [ ] Log individual errors with file names

- [ ] Task 7: Update shared constants (AC: #3)
  - [ ] Add `SUPPORTED_FORMATS` constant to `src/shared/constants.ts`
  - [ ] Export: `['mp4', 'mov', 'webm']`
  - [ ] Use in file picker filter and validation logic
  - [ ] Use in error messages for consistency

- [ ] Task 8: Write unit tests
  - [ ] Test Import button renders in Sidebar
  - [ ] Test button click triggers `open-file-dialog` IPC call
  - [ ] Test `isImporting` state updates during batch import
  - [ ] Test multiple files imported successfully

## Dev Notes

### Technical Implementation

**File Picker Flow:**

1. User clicks "Import" button → call `open-file-dialog` IPC
2. Main process opens native file picker with video filter
3. User selects file(s) → returns array of absolute paths
4. Renderer iterates paths → call `import-file` for each (from Story 2.1)
5. Show loading indicator → update `mediaStore` as files complete
6. Hide loading indicator → display all imported files in library

**Electron Dialog API:**

```typescript
// Main process (file.handlers.ts)
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'webm'] }]
  })

  return {
    success: true,
    data: { filePaths: result.filePaths }
  }
})
```

**Loading Indicator:**

```tsx
// Sidebar.tsx
{
  isImporting && <div className="text-sm text-zinc-400 mt-2">Importing {importCount} files...</div>
}
```

**State Management:**

- `mediaStore.isImporting`: boolean flag for loading state
- `mediaStore.addFile()`: reuse from Story 2.1
- Batch import: sequential processing, update UI after each file

**Error Handling:**

- File picker cancelled → no action (user dismissed dialog)
- Import fails for some files → show error, continue with others
- All files fail → show error dialog with supported formats list

### Project Structure Notes

**Files Modified:**

```
src/renderer/components/Layout/
  └── Sidebar.tsx                     # Add Import button

src/main/ipc/
  └── file.handlers.ts                # Add open-file-dialog handler

src/renderer/store/
  └── mediaStore.ts                   # Add isImporting state

src/shared/
  └── constants.ts                    # Add SUPPORTED_FORMATS constant
```

**No New Files Required:**

- Reuses all validation, thumbnail, and import logic from Story 2.1
- Adds only the file picker dialog integration

**Component Integration:**

- Import button lives in `Sidebar.tsx` alongside ImportZone
- Uses same `mediaStore` and `import-file` IPC as drag-and-drop
- Shares validation and error handling with Story 2.1

**Alignment with Architecture:**

- Native file picker via Electron `dialog` API (main process only)
- Multi-file selection enabled by default (AC #5)
- IPC pattern: renderer requests dialog, main returns paths
- Reuses existing validation infrastructure (DRY principle)
- Loading indicator prevents user confusion during batch import

**Testing Strategy:**

- Unit tests for Import button rendering and click handling
- Unit tests for `isImporting` state transitions
- Manual testing for file picker dialog and multi-file selection

### References

- [Source: docs/epics.md#Story 2.2] - Acceptance criteria and user story
- [Source: docs/PRD.md#Functional Requirements] - FR003 (file picker import)
- [Source: docs/architecture.md#IPC Patterns] - Dialog usage in main process
- [Source: docs/architecture.md#Error Handling Patterns] - Batch import error handling
- [Source: Story 2.1] - Reuse import-file IPC, validation, and thumbnail services

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List
