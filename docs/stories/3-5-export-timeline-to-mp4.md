# Story 3.5: Export Timeline to MP4

Status: ready-for-dev

## Story

As a content creator,
I want to export my edited timeline as an MP4 file,
So that I can share my video or upload it to platforms.

## Acceptance Criteria

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

## Tasks / Subtasks

- [ ] Create FFmpeg service for export operations (AC: 4, 5, 6)
  - [ ] Create ffmpeg.service.ts in src/main/services/
  - [ ] Implement `executeExport(options: ExportOptions): Promise<{outputPath: string}>`
  - [ ] Use ffmpeg-static package to get FFmpeg binary path
  - [ ] Build FFmpeg command with concat demuxer for multiple clips
  - [ ] Apply trim values (trimIn, trimOut) using FFmpeg -ss and -t parameters
  - [ ] Handle resolution options: 720p (-s 1280x720), 1080p (-s 1920x1080), source (no scaling)
  - [ ] Execute FFmpeg using child_process.spawn (Node.js)
  - [ ] Return output file path on success

- [ ] Implement FFmpeg progress parsing (AC: 3)
  - [ ] Add `parseProgress(stderr: string): number` method to ffmpeg.service.ts
  - [ ] Parse FFmpeg stderr for time=XX:XX:XX.XX format
  - [ ] Convert parsed time to percentage (current time / total duration * 100)
  - [ ] Emit progress events to renderer via IPC every ~100ms
  - [ ] Clamp progress to 0-100 range

- [ ] Create IPC handlers for export operations (AC: 3, 8)
  - [ ] Create ffmpeg.handlers.ts in src/main/ipc/
  - [ ] Implement handler for 'start-export' channel
  - [ ] Validate input: clips array, resolution, outputPath
  - [ ] Call ffmpegService.executeExport(options)
  - [ ] Send 'export-progress' events to renderer during export
  - [ ] Send 'export-complete' event on success with output path
  - [ ] Send 'export-error' event on failure with error message
  - [ ] Register handlers in src/main/ipc/index.ts

- [ ] Create ExportModal component (AC: 2)
  - [ ] Create ExportModal.tsx in src/renderer/components/Export/
  - [ ] Render modal dialog with resolution options (radio buttons or select)
  - [ ] Add "Choose File Location" button to open native save dialog
  - [ ] Call Electron dialog.showSaveDialog via IPC to get output path
  - [ ] Default filename: "chop-shop-export-{timestamp}.mp4"
  - [ ] Add "Export" button (primary action, calls start-export IPC)
  - [ ] Add "Cancel" button to close modal
  - [ ] Disable Export button until output path is selected

- [ ] Create ExportProgress component (AC: 3, 8)
  - [ ] Create ExportProgress.tsx in src/renderer/components/Export/
  - [ ] Display progress bar (0-100%) with percentage text
  - [ ] Show current clip being processed (optional)
  - [ ] Listen to 'export-progress' IPC events and update progress state
  - [ ] Show success notification on 'export-complete' with output file path
  - [ ] Show error dialog on 'export-error' with user-friendly message
  - [ ] Include "Open File Location" button in success notification

- [ ] Integrate Export button in TopBar (AC: 1)
  - [ ] Modify TopBar.tsx to add Export button
  - [ ] Read clips count from timelineStore
  - [ ] Enable Export button only when clips.length > 0
  - [ ] Clicking Export button opens ExportModal
  - [ ] Style with accent color (cyan/teal per architecture)
  - [ ] Add keyboard shortcut (Cmd/Ctrl+E) for Export

- [ ] Implement FFmpeg command building logic (AC: 4)
  - [ ] Create `buildFFmpegCommand(clips, resolution, outputPath): string[]` method
  - [ ] Generate FFmpeg filter_complex for concat with trim support
  - [ ] Example: `ffmpeg -i clip1.mp4 -ss {trimIn} -t {duration} ... -filter_complex concat=n={clipCount} output.mp4`
  - [ ] Apply resolution scaling: `-vf scale=1920:1080` for 1080p
  - [ ] Use libx264 codec: `-c:v libx264 -preset fast`
  - [ ] Use aac audio codec: `-c:a aac -b:a 192k`
  - [ ] Ensure command is safe (no shell injection, use argument array)
  - [ ] Log complete FFmpeg command for debugging

- [ ] Handle export errors gracefully (AC: 7, 8)
  - [ ] Wrap FFmpeg execution in try-catch
  - [ ] Capture FFmpeg exit codes: 0 = success, non-zero = error
  - [ ] On disk full (ENOSPC), show: "Export failed. Check disk space and try again."
  - [ ] On invalid file path, show: "Export failed. Invalid output location."
  - [ ] On FFmpeg crash, show: "Export failed. Please try again."
  - [ ] Log full error details to console for debugging
  - [ ] Ensure no partial/corrupted MP4 files left on error (delete temp file)

- [ ] Add export state management (AC: 3)
  - [ ] Extend uiStore.ts with export state:
    - isExporting: boolean
    - exportProgress: number
    - exportError: string | null
  - [ ] Actions: startExport, updateProgress, completeExport, failExport
  - [ ] ExportModal and ExportProgress consume this state

- [ ] Test export functionality end-to-end (AC: 5, 6, 7)
  - [ ] Manual test: Timeline with 3 clips (trimmed and untrimmed)
  - [ ] Click Export, select 1080p, choose Desktop as output location
  - [ ] Verify progress bar updates smoothly from 0-100%
  - [ ] Verify export completes and shows success notification
  - [ ] Open exported MP4 in QuickTime → verify video plays correctly
  - [ ] Open exported MP4 in VLC → verify audio and video synced
  - [ ] Check file size is reasonable (not corrupted)
  - [ ] Test error scenario: export to read-only directory → verify error shown

- [ ] Performance and reliability testing (AC: 7)
  - [ ] Export 10-minute timeline → verify completes within 20 minutes (2x real-time)
  - [ ] Monitor memory usage during export → verify no memory leaks (Activity Monitor)
  - [ ] Verify UI remains responsive during export (main window doesn't freeze)
  - [ ] Test rapid export cancellation (if cancel button added)
  - [ ] Export multiple times sequentially → verify no degradation

## Dev Notes

### Architecture Constraints

- **Main/renderer separation (ADR-002)**: FFmpeg MUST run in main process (security, Node.js access)
- **IPC security**: Validate all export options in main process handlers (prevent injection)
- **No UI blocking**: FFmpeg runs in child process, UI remains responsive during export
- **FFmpeg binary**: Use ffmpeg-static (already in package.json) to bundle FFmpeg 6.0 binaries
- **Progress throttling**: Send progress events max 10Hz (every 100ms) to avoid IPC flooding

### Component Structure

New files to create:
- `src/main/services/ffmpeg.service.ts` - FFmpeg command building and execution
- `src/main/services/__tests__/ffmpeg.service.test.ts` - Unit tests for FFmpeg service
- `src/main/ipc/ffmpeg.handlers.ts` - IPC handlers for export operations
- `src/renderer/components/Export/ExportModal.tsx` - Export settings dialog
- `src/renderer/components/Export/ExportProgress.tsx` - Progress bar UI
- `src/renderer/components/Export/export.types.ts` - TypeScript types for export
- `src/renderer/components/Export/index.ts` - Barrel export

Files to modify:
- `src/renderer/components/Layout/TopBar.tsx` - Add Export button
- `src/renderer/store/uiStore.ts` - Add export state management
- `src/main/ipc/index.ts` - Register ffmpeg.handlers
- `src/shared/constants.ts` - Add IPC channel constants

### Technical Implementation Details

**Export Options Interface** (from tech-spec-epic-3.md):
```typescript
interface ExportOptions {
  clips: Clip[];                           // All timeline clips in sequence
  resolution: '720p' | '1080p' | 'source'; // Export resolution target
  outputPath: string;                      // Absolute path for output MP4
}
```

**IPC Response Format**:
```typescript
interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string };
}
```

**FFmpeg Command Example**:
```bash
# For 3 clips with trim values, exporting to 1080p
ffmpeg \
  -i clip1.mp4 -ss 2 -t 8 \
  -i clip2.mp4 -ss 0 -t 5 \
  -i clip3.mp4 -ss 1 -t 9 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]" \
  -map "[outv]" -map "[outa]" \
  -vf scale=1920:1080 \
  -c:v libx264 -preset fast -c:a aac -b:a 192k \
  output.mp4
```

**Progress Parsing Pattern**:
```typescript
parseProgress(stderr: string): number {
  // FFmpeg stderr: frame=123 fps=30 time=00:00:05.23 ...
  const match = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/)
  if (!match) return 0

  const hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const seconds = parseFloat(match[3])

  const currentTime = hours * 3600 + minutes * 60 + seconds
  const totalDuration = calculateTotalDuration(clips)
  return Math.min(Math.round((currentTime / totalDuration) * 100), 100)
}
```

**IPC Handler Pattern**:
```typescript
// src/main/ipc/ffmpeg.handlers.ts
import { ipcMain } from 'electron'
import { ffmpegService } from '../services/ffmpeg.service'

ipcMain.handle('start-export', async (event, options: ExportOptions) => {
  try {
    // Validate inputs
    if (!options.clips || options.clips.length === 0) {
      return {
        success: false,
        error: { message: 'No clips to export', code: 'INVALID_INPUT' }
      }
    }

    // Execute export
    const result = await ffmpegService.executeExport(options, (progress) => {
      event.sender.send('export-progress', { percent: progress })
    })

    event.sender.send('export-complete', { success: true, outputPath: result.outputPath })
    return { success: true, data: result }

  } catch (error) {
    console.error('[Main] Export failed:', error)
    event.sender.send('export-error', {
      message: 'Export failed. Please try again.',
      code: 'EXPORT_FAILED'
    })
    return {
      success: false,
      error: { message: 'Export failed. Please try again.', code: 'EXPORT_FAILED' }
    }
  }
})
```

**Child Process Execution**:
```typescript
import { spawn } from 'child_process'
import ffmpegPath from 'ffmpeg-static'

executeExport(options: ExportOptions, onProgress: (percent: number) => void): Promise<{outputPath: string}> {
  return new Promise((resolve, reject) => {
    const args = this.buildFFmpegCommand(options.clips, options.resolution, options.outputPath)

    console.log('[FFmpeg] Executing:', ffmpegPath, args.join(' '))

    const ffmpeg = spawn(ffmpegPath, args)

    ffmpeg.stderr.on('data', (data) => {
      const progress = this.parseProgress(data.toString())
      if (progress > 0) {
        onProgress(progress)
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('[FFmpeg] Export complete:', options.outputPath)
        resolve({ outputPath: options.outputPath })
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })

    ffmpeg.on('error', (error) => {
      console.error('[FFmpeg] Process error:', error)
      reject(error)
    })
  })
}
```

### Sequencing Notes

**Prerequisite: Stories 3.1-3.4, Epic 2**
- Requires clip model with trimIn/trimOut (3.1)
- Requires timeline with clips (Epic 2)
- Requires FFmpeg integration setup (Story 1.4)

**Dependencies**:
- ffmpeg-static package (installed in Epic 1)
- Electron dialog API (native file picker)
- Electron IPC (main ↔ renderer communication)
- child_process (Node.js, main process only)

### Styling Approach

Use Tailwind CSS (per architecture):
- Export button (TopBar): `bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded font-medium`
- Modal dialog: Use shadcn/ui Dialog component (installed in Story 2.6)
- Progress bar: Use shadcn/ui Progress component
- Resolution radio buttons: Use shadcn/ui RadioGroup

### Testing Strategy

**Unit Tests** (ffmpeg.service.test.ts):
```typescript
describe('FFmpegService', () => {
  describe('buildFFmpegCommand', () => {
    it('should build command for single clip', () => {
      const clips = [{ id: '1', sourceFile: '/path/video.mp4', duration: 10, trimIn: 0, trimOut: 0, startTime: 0, trackId: 1 }]
      const args = service.buildFFmpegCommand(clips, '1080p', '/output.mp4')
      expect(args).toContain('-i')
      expect(args).toContain('/path/video.mp4')
      expect(args).toContain('scale=1920:1080')
    })

    it('should apply trim values correctly', () => {
      const clips = [{ id: '1', sourceFile: '/video.mp4', duration: 10, trimIn: 2, trimOut: 1, startTime: 0, trackId: 1 }]
      const args = service.buildFFmpegCommand(clips, 'source', '/output.mp4')
      expect(args).toContain('-ss')
      expect(args).toContain('2')  // trimIn
      expect(args).toContain('-t')
      expect(args).toContain('7')  // duration - trimIn - trimOut
    })

    it('should concatenate multiple clips', () => {
      const clips = [
        { id: '1', sourceFile: '/v1.mp4', duration: 5, trimIn: 0, trimOut: 0, startTime: 0, trackId: 1 },
        { id: '2', sourceFile: '/v2.mp4', duration: 5, trimIn: 0, trimOut: 0, startTime: 5, trackId: 1 }
      ]
      const args = service.buildFFmpegCommand(clips, 'source', '/output.mp4')
      expect(args.join(' ')).toContain('concat=n=2')
    })
  })

  describe('parseProgress', () => {
    it('should parse FFmpeg time output', () => {
      const stderr = 'frame=123 fps=30 time=00:01:30.50 bitrate=1000'
      const progress = service.parseProgress(stderr)
      expect(progress).toBeGreaterThan(0)
    })
  })
})
```

**Manual Integration Tests**:
1. **Basic Export Test**:
   - Timeline: 3 clips totaling 30 seconds
   - Click Export, select 1080p, save to Desktop
   - Verify progress bar reaches 100%
   - Open output.mp4 in QuickTime → plays correctly
   - Check file metadata: resolution 1920x1080

2. **Trimmed Clips Export Test**:
   - Timeline: 2 clips with trim values (trimIn=2s, trimOut=1s each)
   - Export to 720p
   - Verify exported duration matches trimmed duration (not original)
   - Play in VLC → verify correct segments exported

3. **Audio Sync Test**:
   - Timeline: 3 clips with audio
   - Export to source quality
   - Play in QuickTime and VLC → verify audio perfectly synced
   - Scrub to different positions → verify sync maintained

4. **Error Handling Tests**:
   - Export to read-only directory → verify error message shown
   - Export with 0 clips (shouldn't be possible, button disabled) → verify button disabled
   - Cancel export mid-process (if cancel added) → verify FFmpeg process terminated

5. **Performance Test**:
   - Timeline: 10 clips, total 10 minutes
   - Export to 1080p
   - Monitor Activity Monitor during export → verify no memory leaks
   - Verify export completes within 20 minutes (2x real-time per NFR)
   - Verify UI remains responsive (can minimize/resize window)

**Edge Cases**:
- Export with single clip (no concat needed)
- Export with heavily trimmed clips (e.g., 10s clip trimmed to 1s)
- Export very short timeline (<5 seconds total)
- Export very long timeline (>30 minutes)
- Disk full during export (ENOSPC error)
- FFmpeg crash mid-export (verify error handled, partial file deleted)

### Project Structure Notes

Following architecture.md:
- Main services: `src/main/services/ffmpeg.service.ts`
- IPC handlers: `src/main/ipc/ffmpeg.handlers.ts`
- Export components: `src/renderer/components/Export/` (new folder)
- Constants: `src/shared/constants.ts` for IPC_CHANNELS

### References

- [Source: docs/tech-spec-epic-3.md#AC-3.5] - Acceptance criteria for export operation
- [Source: docs/tech-spec-epic-3.md#Detailed Design - FFmpeg Service] - Service implementation details
- [Source: docs/tech-spec-epic-3.md#APIs and Interfaces - IPC Channels] - IPC contract specifications
- [Source: docs/tech-spec-epic-3.md#Workflows - Export Operation Sequence] - Detailed export workflow (15 steps)
- [Source: docs/epics.md#Story 3.5] - User story statement
- [Source: docs/architecture.md#ADR-002] - FFmpeg must run in main process
- [Source: docs/architecture.md#IPC Patterns] - Request/response format and error handling
- [Source: docs/architecture.md#Technology Stack] - ffmpeg-static 5.2.0 (FFmpeg 6.0)
- [Source: docs/PRD.md#FR016-FR018] - Functional requirements for export operations
- [Source: docs/PRD.md#NFR002] - Stability: export must handle failures gracefully

## Dev Agent Record

### Context Reference

- `docs/stories/3-5-export-timeline-to-mp4.context.xml`

### Agent Model Used

<!-- Will be filled during implementation -->

### Debug Log References

### Completion Notes List

### File List
