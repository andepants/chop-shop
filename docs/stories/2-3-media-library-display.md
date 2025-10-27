# Story 2.3: Media Library Display

Status: drafted

## Story

As a content creator,
I want to see all my imported media in a library panel,
So that I can manage and select clips for my timeline.

## Acceptance Criteria

1. Media library shows thumbnail, filename, and duration for each clip
2. Thumbnails generated from first frame of video
3. Clicking a clip selects it (visual highlight)
4. Selected clip can be dragged to timeline
5. Media library scrolls if content exceeds visible area
6. Clips display file size and resolution metadata

## Tasks / Subtasks

- [ ] Task 1: Create MediaLibrary container component (AC: #1, #5)
  - [ ] Create `MediaLibrary.tsx` in `src/renderer/components/MediaLibrary/`
  - [ ] Subscribe to `mediaStore.files` for list of imported files
  - [ ] Render scrollable container with overflow-y-auto
  - [ ] Map over files array to render individual MediaItem components
  - [ ] Style with Tailwind: dark background, full height

- [ ] Task 2: Create MediaItem component (AC: #1, #2, #6)
  - [ ] Create `MediaItem.tsx` in `src/renderer/components/MediaLibrary/`
  - [ ] Display thumbnail image (from `MediaFile.thumbnail`)
  - [ ] Display filename (truncate if too long)
  - [ ] Display duration using `formatTime()` utility
  - [ ] Display resolution (e.g., "1920x1080") and file size (e.g., "45.2 MB")
  - [ ] Style with Tailwind: card layout, padding, hover state

- [ ] Task 3: Implement clip selection (AC: #3)
  - [ ] Add `selectedFileId` state to `mediaStore`
  - [ ] Add `selectFile(id: string)` action to `mediaStore`
  - [ ] Handle click on MediaItem → call `selectFile(item.id)`
  - [ ] Apply visual highlight with `ring-2 ring-cyan-500` when selected
  - [ ] Clicking background deselects (sets `selectedFileId = null`)

- [ ] Task 4: Enable drag from library to timeline (AC: #4)
  - [ ] Add `draggable="true"` to MediaItem component
  - [ ] Implement `onDragStart` handler → set `DataTransfer` with file metadata
  - [ ] Store dragged file ID in `event.dataTransfer.setData('fileId', id)`
  - [ ] Add ghost image during drag (optional, use default browser behavior)
  - [ ] Will integrate with Timeline drop handler in Story 2.4

- [ ] Task 5: Format file size for display (AC: #6)
  - [ ] Create `formatFileSize()` utility in `src/renderer/utils/`
  - [ ] Convert bytes to KB, MB, GB with appropriate precision
  - [ ] Example: `45234567 → "43.1 MB"`
  - [ ] Export from utils/index.ts

- [ ] Task 6: Handle empty library state (AC: #1)
  - [ ] When `mediaStore.files` is empty, show placeholder message
  - [ ] Display: "No media imported yet. Drag files or click Import to begin."
  - [ ] Center message in library panel
  - [ ] Style with muted text color

- [ ] Task 7: Integrate MediaLibrary into Sidebar (AC: #1, #5)
  - [ ] Update `Sidebar.tsx` to include `<MediaLibrary />` component
  - [ ] Position below ImportZone and Import button
  - [ ] Allocate remaining vertical space (flex-grow)
  - [ ] Ensure scrolling works when many items present

- [ ] Task 8: Write unit tests
  - [ ] Test MediaLibrary renders list of files from store
  - [ ] Test MediaItem displays all metadata correctly
  - [ ] Test clip selection updates state and visual highlight
  - [ ] Test formatFileSize utility with various input sizes
  - [ ] Test empty state displays placeholder message

## Dev Notes

### Technical Implementation

**MediaLibrary Component Structure:**

```tsx
export function MediaLibrary() {
  const files = useMediaStore((state) => state.files)
  const selectedId = useMediaStore((state) => state.selectedFileId)
  const selectFile = useMediaStore((state) => state.selectFile)

  if (files.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {files.map((file) => (
        <MediaItem
          key={file.id}
          file={file}
          isSelected={file.id === selectedId}
          onSelect={() => selectFile(file.id)}
        />
      ))}
    </div>
  )
}
```

**MediaItem Component:**

```tsx
interface MediaItemProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
}

export function MediaItem({ file, isSelected, onSelect }: MediaItemProps) {
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('fileId', file.id)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      className={cn(
        'rounded p-2 mb-2 cursor-pointer hover:bg-zinc-800',
        isSelected && 'ring-2 ring-cyan-500'
      )}
    >
      <img src={file.thumbnail} alt={file.fileName} className="w-full h-16 object-cover rounded" />
      <p className="text-sm truncate mt-1">{file.fileName}</p>
      <div className="flex justify-between text-xs text-zinc-400 mt-1">
        <span>{formatTime(file.duration)}</span>
        <span>
          {file.resolution.width}x{file.resolution.height}
        </span>
      </div>
      <p className="text-xs text-zinc-500">{formatFileSize(file.fileSize)}</p>
    </div>
  )
}
```

**File Size Formatting:**

```typescript
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
```

**State Management (mediaStore updates):**

```typescript
interface MediaState {
  files: MediaFile[]
  selectedFileId: string | null
  isImporting: boolean

  addFile: (file: MediaFile) => void
  removeFile: (id: string) => void
  selectFile: (id: string | null) => void
  setThumbnail: (id: string, thumbnail: string) => void
}
```

**Scrolling Behavior:**

- Use `overflow-y-auto` on MediaLibrary container
- Height determined by parent (Sidebar flex layout)
- Smooth scrolling with Tailwind: `scroll-smooth`

**Thumbnail Display:**

- Thumbnails already generated in Story 2.1 (`thumbnail.service.ts`)
- Stored as data URL in `MediaFile.thumbnail`
- Display with `<img>` tag, fallback to placeholder if missing

### Project Structure Notes

**New Files to Create:**

```
src/renderer/components/MediaLibrary/
  ├── MediaLibrary.tsx                # Container component
  ├── MediaItem.tsx                   # Individual media item
  └── EmptyState.tsx                  # Empty library placeholder

src/renderer/utils/
  └── formatFileSize.util.ts          # File size formatting utility
```

**Files Modified:**

```
src/renderer/components/Layout/
  └── Sidebar.tsx                     # Integrate MediaLibrary component

src/renderer/store/
  └── mediaStore.ts                   # Add selectedFileId state and selectFile action
```

**Component Hierarchy:**

```
Sidebar
  ├── ImportZone (Story 2.1)
  ├── Import Button (Story 2.2)
  └── MediaLibrary (Story 2.3)
        └── MediaItem[] (multiple)
```

**Alignment with Architecture:**

- Zustand store (`mediaStore`) for state management
- Tailwind CSS for all styling (no separate CSS files)
- Component file naming: PascalCase.tsx
- Utility naming: camelCase.util.ts
- Selection state centralized in store (single source of truth)

**Drag-and-Drop Integration:**

- MediaItem sets `dataTransfer` with file ID on drag start
- Timeline (Story 2.4) will handle drop event and receive file ID
- Uses standard HTML5 drag-and-drop API (no external library)

**Testing Strategy:**

- Unit tests for MediaLibrary and MediaItem components
- Unit tests for formatFileSize utility
- Unit tests for store actions (selectFile)
- Manual testing for drag behavior (will be validated in Story 2.4)

### References

- [Source: docs/epics.md#Story 2.3] - Acceptance criteria and user story
- [Source: docs/PRD.md#Functional Requirements] - FR004 (media library display)
- [Source: docs/architecture.md#Component Structure] - Component file organization
- [Source: docs/architecture.md#Zustand Store Structure] - State management patterns
- [Source: docs/architecture.md#Styling Patterns] - Tailwind CSS usage, cn() utility
- [Source: Story 2.1] - MediaFile interface, thumbnail generation
- [Source: Story 2.2] - Sidebar integration point

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List
