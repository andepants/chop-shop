# Story 6.8: Transcription & Post History with Caching

Status: drafted

## Story

As a content creator,
I want to access my previous transcriptions and generated posts,
so that I can reuse content or generate new variations.

## Acceptance Criteria

1. History tab displays chronological list of past generations
2. Each history entry shows: timestamp, transcription snippet, generated platforms
3. Clicking history entry loads that transcription and posts into respective tabs
4. Transcriptions cached in project data (persists across sessions)
5. Generated posts cached in project data (persists across sessions)
6. "Clear Cache" button at top of History tab
7. Clear Cache shows confirmation dialog before deleting
8. Clearing cache removes all transcriptions and posts from storage
9. History list scrollable if content exceeds visible area
10. Cache stored efficiently (JSON format, reasonable file size limits)

## Tasks / Subtasks

- [ ] Task 1: Define cache data structure (AC: 4, 5, 10)
  - [ ] Create `CacheEntry` interface in shared types
  - [ ] Structure: `{ id, transcription, generatedPosts, request, createdAt }`
  - [ ] `transcription`: `{ id, text, audioSourceClips, createdAt, duration }`
  - [ ] `generatedPosts`: Array of `{ id, platform, content, characterCount, generatedAt }`
  - [ ] `request`: `{ transcription?, userGuidance?, personas, platforms, includeEmojis }`

- [ ] Task 2: Create cache service in main process (AC: 4, 5, 10)
  - [ ] Create `cache.service.ts` in `src/main/services/ai/`
  - [ ] Implement `saveCacheEntry(entry: CacheEntry)` method
  - [ ] Implement `loadCache(): CacheEntry[]` method
  - [ ] Implement `clearCache()` method
  - [ ] Store cache in `app.getPath('userData')/ai-cache.json`
  - [ ] Use JSON format for storage

- [ ] Task 3: Add IPC handlers for cache operations (AC: 4, 5, 8)
  - [ ] Update `ai.handlers.ts` to add cache handlers
  - [ ] Add handler: `ai-load-cache` → returns all cache entries
  - [ ] Add handler: `ai-save-cache-entry` → saves new entry
  - [ ] Add handler: `ai-clear-cache` → deletes all entries
  - [ ] Whitelist handlers in preload script

- [ ] Task 4: Auto-save cache after generation (AC: 4, 5)
  - [ ] When generation completes successfully, create CacheEntry
  - [ ] Include transcription, generated posts, and generation request
  - [ ] Call `ai-save-cache-entry` IPC channel
  - [ ] Main process appends entry to cache file
  - [ ] Assign unique ID (UUID) to each entry

- [ ] Task 5: Create History Panel component (AC: 1, 2, 9)
  - [ ] Create `HistoryPanel.tsx` in `src/renderer/src/components/AI/`
  - [ ] Display list of cache entries (chronological, newest first)
  - [ ] Each entry shows: date/time, transcription snippet (first 100 chars), platforms generated
  - [ ] Use shadcn/ui Card component for each entry
  - [ ] Make list scrollable if content exceeds height

- [ ] Task 6: Load cache on History tab activation (AC: 1, 4, 5)
  - [ ] When History tab activated, call `ai-load-cache` IPC
  - [ ] Store loaded entries in aiStore
  - [ ] Display entries in HistoryPanel
  - [ ] Show empty state if no cache entries

- [ ] Task 7: Implement history entry click handler (AC: 3)
  - [ ] On entry click, load transcription into Transcribe tab
  - [ ] Load generated posts into Results tab
  - [ ] Load generation request settings (personas, platforms, emojis)
  - [ ] Navigate to Transcribe or Results tab (user choice or automatic)

- [ ] Task 8: Add "Clear Cache" button (AC: 6, 7, 8)
  - [ ] Add button at top of History tab
  - [ ] Use shadcn/ui Button component
  - [ ] On click, show confirmation dialog (shadcn/ui AlertDialog)
  - [ ] Dialog text: "Clear all cached transcriptions and posts? This cannot be undone."
  - [ ] On confirm, call `ai-clear-cache` IPC
  - [ ] On success, clear aiStore cache state and refresh History tab

- [ ] Task 9: Add cache state to aiStore (AC: 4, 5)
  - [ ] Update `aiStore.ts` to add `cacheEntries` field (CacheEntry[])
  - [ ] Add action: `setCacheEntries(entries: CacheEntry[])`
  - [ ] Add action: `addCacheEntry(entry: CacheEntry)`
  - [ ] Add action: `clearCacheEntries()`

- [ ] Task 10: Implement cache file management (AC: 10)
  - [ ] Limit cache file size (e.g., max 10MB or 100 entries)
  - [ ] If limit exceeded, remove oldest entries (FIFO)
  - [ ] Log cache operations for debugging
  - [ ] Handle corrupted cache file (reset to empty array)

- [ ] Task 11: Add empty state for History tab (UX enhancement)
  - [ ] When no cache entries, show friendly message
  - [ ] Message: "No history yet. Generate your first posts to see them here."
  - [ ] Optional: Show illustration or icon

- [ ] Task 12: Add search/filter for history (Optional enhancement)
  - [ ] Add search input to filter entries by transcription text
  - [ ] Filter by platform (show only entries with specific platform)
  - [ ] Filter by date range

- [ ] Task 13: Write unit tests for cache service (Testing)
  - [ ] Test `saveCacheEntry()` appends to file
  - [ ] Test `loadCache()` reads and parses JSON
  - [ ] Test `clearCache()` deletes file or resets to empty array
  - [ ] Test handling of corrupted JSON file

- [ ] Task 14: Write component tests for History Panel (Testing)
  - [ ] Test component renders cache entries
  - [ ] Test entry click loads data into other tabs
  - [ ] Test "Clear Cache" button and confirmation dialog
  - [ ] Test empty state display

- [ ] Task 15: Write integration tests for cache flow (Testing)
  - [ ] Test complete flow: generate → save cache → load cache → display history
  - [ ] Test cache persistence across app restarts (mock restart)
  - [ ] Test clear cache functionality

## Dev Notes

### Architecture Patterns

- **Cache Storage**: JSON file in Electron userData directory for cross-session persistence
- **IPC Communication**: Main process handles file I/O, renderer requests cache via IPC
- **State Management**: Zustand `aiStore` holds in-memory cache entries for quick access
- **Data Integrity**: UUID for unique entry IDs, timestamps for sorting, file size limits prevent bloat

### Services to Create

**Main Process:**
- `src/main/services/ai/cache.service.ts` - Cache file management

**Renderer Process:**
- `src/renderer/src/components/AI/HistoryPanel.tsx` - History display UI

**Updates:**
- `src/main/ipc/ai.handlers.ts` - Add cache IPC handlers
- `src/renderer/src/store/aiStore.ts` - Add cache state

### Cache Data Models

**CacheEntry:**
```typescript
interface CacheEntry {
  id: string; // UUID
  transcription: Transcription;
  generatedPosts: GeneratedPost[];
  request: GenerationRequest;
  createdAt: string; // ISO 8601 timestamp
}

interface Transcription {
  id: string;
  text: string;
  audioSourceClips: string[]; // Clip IDs
  createdAt: string;
  duration: number; // seconds
}

interface GeneratedPost {
  id: string;
  platform: 'youtube' | 'twitter' | 'linkedin';
  content: string;
  characterCount: number;
  exceedsLimit: boolean;
  generatedAt: string;
}

interface GenerationRequest {
  transcription?: string;
  userGuidance?: string;
  personas: string[];
  platforms: ('youtube' | 'twitter' | 'linkedin')[];
  includeEmojis: boolean;
}
```

### Cache Storage Location

- **File Path**: `~/Library/Application Support/chop-shop/ai-cache.json`
- **Format**: JSON array of CacheEntry objects
- **Encoding**: UTF-8

### Cache File Example

```json
[
  {
    "id": "uuid-1234",
    "transcription": {
      "id": "trans-1",
      "text": "Welcome to my tutorial...",
      "audioSourceClips": ["clip-1", "clip-2"],
      "createdAt": "2025-10-29T12:00:00Z",
      "duration": 120
    },
    "generatedPosts": [
      {
        "id": "post-1",
        "platform": "youtube",
        "content": "Welcome to my tutorial on...",
        "characterCount": 500,
        "exceedsLimit": false,
        "generatedAt": "2025-10-29T12:05:00Z"
      }
    ],
    "request": {
      "transcription": "Welcome to my tutorial...",
      "personas": ["naval", "casey"],
      "platforms": ["youtube", "twitter"],
      "includeEmojis": false
    },
    "createdAt": "2025-10-29T12:05:00Z"
  }
]
```

### IPC Handlers

**ai-load-cache:**
```typescript
ipcMain.handle('ai-load-cache', async () => {
  const entries = await cacheService.loadCache();
  return { success: true, data: entries };
});
```

**ai-save-cache-entry:**
```typescript
ipcMain.handle('ai-save-cache-entry', async (event, entry: CacheEntry) => {
  await cacheService.saveCacheEntry(entry);
  return { success: true };
});
```

**ai-clear-cache:**
```typescript
ipcMain.handle('ai-clear-cache', async () => {
  await cacheService.clearCache();
  return { success: true };
});
```

### Cache Size Management

```typescript
const MAX_CACHE_ENTRIES = 100;
const MAX_CACHE_SIZE_MB = 10;

function trimCache(entries: CacheEntry[]): CacheEntry[] {
  // Sort by createdAt descending (newest first)
  const sorted = entries.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Keep only latest MAX_CACHE_ENTRIES
  const trimmed = sorted.slice(0, MAX_CACHE_ENTRIES);

  // Check file size, remove oldest if still too large
  const fileSize = JSON.stringify(trimmed).length / (1024 * 1024); // MB
  if (fileSize > MAX_CACHE_SIZE_MB) {
    return trimmed.slice(0, 50); // Aggressive trim
  }

  return trimmed;
}
```

### History Entry Display Format

```
┌─────────────────────────────────────────────────┐
│ Oct 29, 2025 12:05 PM                           │
│ "Welcome to my tutorial on Electron..."         │
│ Generated: YouTube, Twitter                     │
└─────────────────────────────────────────────────┘
```

### Error Handling

- **Corrupted Cache File**: Reset to empty array, log warning
- **File Read Errors**: Return empty array, display error to user
- **File Write Errors**: Log error, notify user cache not saved

### Testing Standards

- Unit tests for cache service (file I/O operations)
- Component tests for HistoryPanel UI
- Integration tests for cache persistence across sessions
- Manual testing for cache size limits and trimming

### Project Structure Notes

- Follows Epic 6 tech spec: cache service under `src/main/services/ai/`
- Uses Electron userData directory for file storage
- Aligns with IPC patterns from existing handlers
- Integrates with Zustand state management

### Dependencies

- `uuid` package for unique IDs (or use crypto.randomUUID() built-in)
- No new dependencies required (crypto.randomUUID() available in Node 14.17+)

### UX Considerations

- History tab provides quick access to past work
- Loading history entry restores entire generation context
- Clear cache option gives users control over storage
- Empty state encourages first generation

### Performance Considerations

- Cache file loaded once on History tab activation (lazy load)
- In-memory cache state for fast filtering/sorting
- File size limits prevent excessive disk usage
- JSON format provides good balance of simplicity and efficiency

### References

- [Source: docs/tech-spec-epic-6.md#Data Models and Contracts] - CacheEntry, Transcription, GeneratedPost models
- [Source: docs/tech-spec-epic-6.md#Services and Modules] - HistoryPanel.tsx specification
- [Source: docs/tech-spec-epic-6.md#Workflows and Sequencing] - Workflow 4: History & Caching flow
- [Source: docs/tech-spec-epic-6.md#File System Integration] - Cache storage location
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.8 AC section
- [Source: docs/epics.md#Story 6.8] - User story and prerequisites

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
