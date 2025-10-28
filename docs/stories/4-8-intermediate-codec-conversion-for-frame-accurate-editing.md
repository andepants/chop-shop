# Story 4.8: Intermediate Codec Conversion for Frame-Accurate Editing

Status: ready-for-dev

## Story

As a content creator,
I want my imported videos automatically optimized for editing,
so that I can perform frame-accurate cuts, smooth playback, and reliable multi-track sync without timing issues.

## Acceptance Criteria

1. Videos converted to ProRes intermediate codec on import with progress indicator
2. Intermediate files stored in `.chop-shop/cache/` directory structure
3. Variable Frame Rate (VFR) sources automatically converted to Constant Frame Rate (CFR)
4. Timeline and compositor reference intermediate files for all editing operations
5. Frame-accurate cutting works at any position (not limited to keyframes)
6. Multi-track playback remains synchronized without drift
7. Export pipeline reads from intermediate files and outputs H.264 MP4
8. Cache management allows clearing intermediate files to free disk space
9. Import shows "Optimizing for editing..." with percentage progress
10. Smooth 60fps playback maintained with intermediate codec files

## Tasks / Subtasks

- [ ] Task 1: Create Transcode Service (AC: #1, #2, #3)
  - [ ] Subtask 1.1: Create `src/main/services/transcode.service.ts`
  - [ ] Subtask 1.2: Implement `transcodeToProRes(sourcePath, outputPath, progressCallback)` using FFmpeg
  - [ ] Subtask 1.3: Implement `detectVFR(filePath)` using ffprobe to detect variable frame rate
  - [ ] Subtask 1.4: Implement `getIntermediatePath(sourceFile)` to generate cache paths
  - [ ] Subtask 1.5: Create `.chop-shop/cache/` directory structure with proper permissions
  - [ ] Subtask 1.6: Add progress tracking with callbacks for UI updates

- [ ] Task 2: Update File Import Flow (AC: #1, #4, #9)
  - [ ] Subtask 2.1: Modify `src/main/services/file.service.ts` to trigger transcode after validation
  - [ ] Subtask 2.2: Update `VideoMetadata` interface to include `intermediatePath` field
  - [ ] Subtask 2.3: Create IPC channel `transcode-progress` for progress updates
  - [ ] Subtask 2.4: Update media import UI to show "Optimizing for editing..." with progress bar
  - [ ] Subtask 2.5: Store both original and intermediate paths in media metadata
  - [ ] Subtask 2.6: Handle transcode errors with user-friendly messages

- [ ] Task 3: Update Timeline & Compositor (AC: #4, #5, #6)
  - [ ] Subtask 3.1: Modify `src/renderer/src/store/timelineStore.ts` to reference intermediate files
  - [ ] Subtask 3.2: Update `Clip` interface to use intermediate path for playback
  - [ ] Subtask 3.3: Modify `src/renderer/src/utils/VideoCompositor.ts` to load intermediate files
  - [ ] Subtask 3.4: Update all clip operations (trim, split, playback) to use intermediate paths
  - [ ] Subtask 3.5: Test frame-accurate seeking at any position
  - [ ] Subtask 3.6: Verify multi-track synchronization with intermediate files

- [ ] Task 4: Update Export Pipeline (AC: #7)
  - [ ] Subtask 4.1: Modify `src/main/services/ffmpeg.service.ts` to read from intermediate files
  - [ ] Subtask 4.2: Update `buildFFmpegCommand` to use intermediate paths as input
  - [ ] Subtask 4.3: Configure H.264 export with appropriate quality settings (CRF 18-20)
  - [ ] Subtask 4.4: Test export from ProRes intermediate to H.264 MP4
  - [ ] Subtask 4.5: Verify exported video quality matches source
  - [ ] Subtask 4.6: Test multi-track export with intermediate files

- [ ] Task 5: Implement Cache Management (AC: #2, #8)
  - [ ] Subtask 5.1: Create cache tracking system in `transcode.service.ts`
  - [ ] Subtask 5.2: Implement `clearCache()` function to delete intermediate files
  - [ ] Subtask 5.3: Add "Clear Cache" button in application settings/preferences
  - [ ] Subtask 5.4: Display cache size in settings UI
  - [ ] Subtask 5.5: Implement cleanup on app quit for orphaned cache files
  - [ ] Subtask 5.6: Add disk space warnings if cache exceeds configurable threshold

- [ ] Task 6: Testing & Validation (AC: All)
  - [ ] Subtask 6.1: Test with VFR files (screen recordings) - verify CFR conversion
  - [ ] Subtask 6.2: Test multi-track sync with converted files - verify no drift
  - [ ] Subtask 6.3: Test cutting precision - verify frame-accurate cuts at any position
  - [ ] Subtask 6.4: Test export quality - verify H.264 output matches intermediate quality
  - [ ] Subtask 6.5: Memory usage testing with large files - ensure no leaks
  - [ ] Subtask 6.6: Performance testing - verify smooth 60fps playback with ProRes files
  - [ ] Subtask 6.7: Disk space testing - verify cache management works correctly
  - [ ] Subtask 6.8: Edge case testing - handle transcode failures gracefully

## Dev Notes

### Technical Context

Professional video editors (CapCut, Adobe Premiere Pro) use intermediate codecs (ProRes, DNxHD) for editing because delivery codecs (H.264/H.265) use GOP (Group of Pictures) compression that makes frame-accurate seeking difficult. This story implements industry-standard workflow: transcode on import → edit with I-frame codec → export to delivery format.

### Problem Being Solved

Current implementation edits H.264/H.265 delivery codecs directly, causing:
1. **Frame-accuracy issues**: GOP structure limits seeking to keyframes only
2. **VFR timing problems**: Variable frame rate sources cause sync drift and playback issues
3. **Multi-track sync drift**: Independent H.264 decode timing causes track desynchronization
4. **Imprecise cutting**: Cuts don't land at exact positions due to keyframe constraints

### Solution Approach

**Import Phase:**
- Detect video format and frame rate type (CFR vs VFR)
- Transcode to ProRes 422 (macOS optimized) using FFmpeg
- Use `-vsync cfr` to force constant frame rate
- Store intermediate files in `.chop-shop/cache/` directory
- Associate intermediate path with original media file

**FFmpeg Command:**
```bash
ffmpeg -i input.mp4 \
  -c:v prores -profile:v 2 \
  -c:a pcm_s16le \
  -vsync cfr \
  intermediate.mov
```

**Editing Phase:**
- All timeline operations reference intermediate files
- Frame-accurate seeking works at any position (I-frame only codec)
- Multi-track playback uses synchronized intermediate files
- Smooth 60fps playback with ProRes optimized decoding

**Export Phase:**
- Read from intermediate ProRes files
- Export to H.264 MP4 with CRF 18-20 (high quality)
- Apply user-selected resolution and encoding settings

### Architecture Alignment

**Services:**
- `transcode.service.ts` (NEW) - Handles ProRes conversion using FFmpeg
- `file.service.ts` (EXTENDED) - Triggers transcode after import validation
- `ffmpeg.service.ts` (EXTENDED) - Reads intermediate files for export

**Data Models:**
```typescript
interface VideoMetadata {
  // Existing fields
  duration: number;
  resolution: { width: number; height: number };
  format: string;
  size: number;
  hasVideo: boolean;
  hasAudio: boolean;

  // NEW fields
  intermediatePath: string | null;  // Path to ProRes cache file
  isVFR: boolean;                   // Variable frame rate detected
  transcodeStatus: 'pending' | 'in-progress' | 'complete' | 'failed';
}

interface Clip {
  id: string;
  sourceFile: string;          // Original file path
  intermediatePath: string;    // ProRes cache file (used for playback)
  startTime: number;
  duration: number;
  trimIn: number;
  trimOut: number;
  trackId: number;
}
```

**IPC Channels:**
- `transcode-file` - Request: `{ filePath: string }` → Response: `{ intermediatePath: string }`
- `transcode-progress` - Event: `{ percent: number, file: string }` (Main → Renderer)
- `clear-cache` - Request: `void` → Response: `{ freedSpace: number }`

### File Structure

```
.chop-shop/
└── cache/
    ├── {uuid}-intermediate.mov    # ProRes intermediate files
    ├── cache-manifest.json        # Tracks cache files and sizes
    └── README.txt                 # "Cache directory for optimized editing files"
```

### Performance Considerations

**Disk Space:**
- ProRes files are 10-20x larger than H.264 originals
- 1GB H.264 → ~10-20GB ProRes intermediate
- Need disk space warnings and cache management

**Transcode Time:**
- ~1-2x real-time for ProRes conversion
- Show progress to user during import
- Allow cancellation if import takes too long

**Playback Performance:**
- ProRes optimized for editing (fast seek, smooth playback)
- Should achieve 60fps playback vs 30fps with H.264
- Lower CPU usage during playback and scrubbing

### Testing Strategy

**Unit Tests:**
- `transcode.service.test.ts` - Test VFR detection, path generation, FFmpeg command building
- `timelineStore.test.ts` - Verify intermediate path usage in clip operations

**Manual Testing:**
1. Import H.264 video → verify transcode to ProRes with progress
2. Import VFR screen recording → verify CFR conversion
3. Cut video at arbitrary position → verify frame-accurate cut
4. Multi-track timeline → verify perfect sync during playback
5. Export → verify H.264 output quality
6. Clear cache → verify disk space freed

**Edge Cases:**
- Very large files (>5GB) - verify transcode completes
- Disk space full during transcode - handle gracefully
- Transcode cancellation - clean up partial files
- Import failure - don't leave orphaned cache files

### Project Structure Notes

New/Modified Files:
```
src/main/services/
  ├── transcode.service.ts       # NEW - ProRes conversion
  ├── file.service.ts            # MODIFIED - trigger transcode
  └── ffmpeg.service.ts          # MODIFIED - read intermediate files

src/renderer/src/store/
  └── timelineStore.ts           # MODIFIED - use intermediate paths

src/renderer/src/utils/
  └── VideoCompositor.ts         # MODIFIED - load intermediate files

src/renderer/src/components/MediaLibrary/
  └── ImportProgress.tsx         # NEW - transcode progress UI
```

### References

- Industry standard workflow: [Source: Research findings on professional NLE format strategy]
- FFmpeg ProRes encoding: [Source: FFmpeg documentation, ProRes profile 2 = 422]
- VFR detection: [Source: ffprobe frame analysis, GOP structure examination]
- Architecture patterns: [Source: docs/architecture.md - IPC patterns, Service layer]
- Timeline data model: [Source: docs/architecture.md - Timeline Data Model, sections 720-756]
- Testing strategy: [Source: docs/architecture.md - Testing patterns, section 1115-1143]

## Dev Agent Record

### Context Reference

- docs/stories/4-8-intermediate-codec-conversion-for-frame-accurate-editing.context.xml

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List
