# Epic Technical Specification: Recording Capabilities & Enhanced Editing

Date: 2025-10-28
Author: andrew
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 implements recording capabilities (screen, webcam, picture-in-picture) and enhances the timeline with multi-track support and zoom controls. Building on Epic 3's complete editing and export pipeline, this epic transforms Chop Shop from a basic editor into a full recording + editing solution. Users can now capture content directly within the application using native Electron APIs (desktopCapturer + getUserMedia), layer multiple tracks for picture-in-picture effects, and perform precision editing with timeline zoom.

This epic represents the **FINAL SUBMISSION for Wednesday, October 29, 10:59 PM CT** and completes the full product vision outlined in the PRD: record → arrange → edit → export. All PRD functional requirements for recording (FR013-FR015) and multi-track editing are satisfied by this epic.

## Objectives and Scope

**In Scope:**

- Multi-track timeline infrastructure supporting 2 tracks (main + overlay) with independent clip management
- Timeline zoom controls with keyboard shortcuts for precision editing
- Screen recording using Electron's desktopCapturer (full screen or window selection)
- Webcam recording using MediaRecorder API with device selection
- Picture-in-picture recording capturing screen + webcam simultaneously as separate tracks
- Recording stop functionality with automatic import of recorded files to media library and timeline
- Multi-track compositing preview using Canvas API for overlay rendering
- Recording state management in Zustand store
- Recording UI components (modal, source selectors, preview, controls)
- Auto-import workflow placing screen recordings on Track 1 and webcam on Track 2
- Enhanced Timeline component supporting track-based clip placement and drag-drop
- Export pipeline extension to handle multi-track compositing (building on Epic 3)

**Out of Scope:**

- More than 2 tracks (PRD specifies PiP only, not full multi-track editor)
- Recording pause/resume functionality (defer to post-launch)
- Audio mixing controls (volume, fade) for multi-track audio (PRD out of scope)
- Recording quality settings (resolution, framerate, bitrate customization)
- Recording preview during capture (post-launch optimization)
- GPU-accelerated compositing (Canvas is sufficient for 2 tracks per NFR003)
- Recording to formats other than WebM (MediaRecorder native output)
- System audio capture on macOS (requires signed app with entitlements)
- Recording annotations or overlays during capture
- Webcam position/size adjustment in PiP mode (fixed corner position for MVP)

## System Architecture Alignment

Epic 4 integrates with the Electron + React + Zustand architecture while extending Epic 2 and Epic 3 foundations:

**Component Layer (Renderer Process):**
- Recording components (`RecordingModal.tsx`, `SourceSelector.tsx`, `RecordingPreview.tsx`) provide recording UI workflow
- Timeline components extended with multi-track layout, zoom controls, and track-specific drag-drop handlers
- Preview components extended with `VideoCanvas.tsx` for multi-track compositing using Canvas API
- ZoomControls component integrated into Timeline toolbar

**State Management:**
- `recordingStore.ts` manages recording state (mode, selected sources, recording status, output files)
- `timelineStore.ts` extended with track-based clip management: `addClipToTrack()`, multi-track operations
- `playbackStore.ts` extended to handle multi-track playback synchronization
- All stores maintain Zustand immutability patterns

**Service Layer (Main Process):**
- `recording.service.ts` NEW service handling screen/webcam capture using desktopCapturer and MediaRecorder
- `ffmpeg.service.ts` extended to support multi-track export with Canvas compositing or FFmpeg overlay filters
- `file.service.ts` handles recording temp file management in `os.tmpdir()/chop-shop/recordings/`
- IPC handlers in `recording.handlers.ts` bridge renderer recording requests to main process

**Native APIs:**
- `desktopCapturer.getSources()` - Screen/window enumeration for recording
- `getUserMedia()` - Webcam and microphone access
- `MediaRecorder` - Recording to WebM format
- Canvas API - Multi-track compositing for preview

**Architecture Constraints:**
- Recording streams managed in renderer process (MediaRecorder requires DOM context)
- Main process coordinates source enumeration and file management (per ADR-002)
- Multi-track preview uses Canvas for compositing (ADR-004 extension)
- Timeline maintains 30fps with 2 tracks per NFR001
- Export handles multi-track compositing without blocking UI

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|--------|---------|-------|
| `recording.service.ts` | Screen/webcam source enumeration, MediaRecorder coordination, recording file management | Recording mode, source IDs, audio settings | Recording streams, output file paths, recording metadata | Main process |
| `ffmpeg.service.ts` (extended) | Multi-track export with overlay compositing | Multi-track clips array, resolution, PiP positioning | Composited MP4 output | Main process |
| `file.service.ts` (extended) | Recording temp directory management, file cleanup | Recording files, temp paths | Managed file paths, cleanup status | Main process |
| `recordingStore.ts` | Recording state management (mode, sources, status) | Recording actions, source selections | Recording state updates | Renderer (Zustand) |
| `timelineStore.ts` (multi-track) | Track-based clip management, multi-track operations | Clip additions with track IDs, track operations | Multi-track timeline state | Renderer (Zustand) |
| `playbackStore.ts` (multi-track) | Multi-track playback synchronization | Playhead position, track states | Synchronized playback state | Renderer (Zustand) |
| `RecordingModal.tsx` | Recording setup UI (mode selection, source pickers) | Available sources, recording modes | User selections, recording triggers | Renderer component |
| `SourceSelector.tsx` | Screen/webcam source selection UI | Source lists from desktopCapturer | Selected source IDs | Renderer component |
| `RecordingPreview.tsx` | Live preview of selected sources before recording | MediaStream from getUserMedia | Visual preview display | Renderer component |
| `Timeline.tsx` (multi-track) | 2-track timeline UI with track-specific drag-drop | Multi-track clips, zoom level | Track-based clip layout | Renderer component |
| `TimelineTrack.tsx` | Individual track component rendering | Track clips, track ID | Single track display | Renderer component |
| `ZoomControls.tsx` | Timeline zoom UI (slider/buttons) | Current zoom level | Zoom level changes | Renderer component |
| `VideoCanvas.tsx` | Multi-track compositing for preview using Canvas API | Track 1 + Track 2 video elements, PiP positioning | Composited canvas output | Renderer component |
| `recording.handlers.ts` | IPC handlers for recording operations | Recording requests, source queries | Recording responses, source lists | Main process IPC |

### Data Models and Contracts

**Recording Mode:**

```typescript
type RecordingMode = 'screen' | 'webcam' | 'pip';
```

**Source (Screen/Webcam):**

```typescript
interface Source {
  id: string;                    // Electron source ID or device ID
  name: string;                  // Display name ("Built-in Camera", "Chrome Window")
  type: 'screen' | 'window' | 'webcam';
  thumbnail?: string;            // Data URL thumbnail for screen sources
}
```

**Recording State:**

```typescript
interface RecordingState {
  isRecording: boolean;
  mode: RecordingMode | null;
  selectedScreen: string | null;      // Source ID
  selectedWebcam: string | null;      // Device ID
  recordingDuration: number;          // Elapsed seconds
  outputFiles: string[];              // Paths to recorded WebM files

  // Actions
  startRecording: (mode: RecordingMode) => void;
  stopRecording: () => Promise<string[]>;  // Returns output file paths
  setSelectedScreen: (id: string) => void;
  setSelectedWebcam: (id: string) => void;
  updateDuration: (seconds: number) => void;
}
```

**Track Model (Extended Timeline):**

```typescript
interface Track {
  id: number;                    // 1 = main track, 2 = overlay track
  clips: Clip[];                 // Clips on this track
  height: number;                // Track height in pixels
}

interface TimelineState {
  tracks: Track[];               // Always 2 tracks for Epic 4
  playheadPosition: number;
  totalDuration: number;
  zoomLevel: number;             // 1.0 = default, 2.0 = 2x zoom, etc.
  selectedClipId: string | null;

  // New multi-track actions
  addClipToTrack: (clip: Omit<Clip, 'id'>, trackId: number) => void;
  getClipsForTrack: (trackId: number) => Clip[];
  setZoomLevel: (level: number) => void;
}
```

**Clip Model (Extended with Track):**

```typescript
interface Clip {
  id: string;
  sourceFile: string;
  startTime: number;
  duration: number;
  trimIn: number;
  trimOut: number;
  trackId: number;               // NEW: 1 or 2
}
```

**Recording Configuration:**

```typescript
interface RecordingConfig {
  mode: RecordingMode;
  screenSourceId?: string;       // Required for 'screen' and 'pip' modes
  webcamDeviceId?: string;       // Required for 'webcam' and 'pip' modes
  audioSourceId?: string;        // Microphone device ID
  captureSystemAudio?: boolean;  // Future: macOS system audio (out of scope for MVP)
}
```

**Multi-Track Export Options:**

```typescript
interface MultiTrackExportOptions extends ExportOptions {
  tracks: {
    main: Clip[];                // Track 1 clips
    overlay: Clip[];             // Track 2 clips
  };
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pipSize: number;               // Percentage of main video (e.g., 25 = 25%)
}
```

### APIs and Interfaces

**IPC Channel: `get-sources`**

Request:
```typescript
void
```

Response:
```typescript
IPCResponse<{
  screens: Source[];    // All available screen/window sources
  webcams: Source[];    // All available webcam devices
}>
```

**IPC Channel: `start-recording`**

Request:
```typescript
{
  mode: RecordingMode;
  screenSourceId?: string;
  webcamDeviceId?: string;
  audioSourceId?: string;
}
```

Response:
```typescript
IPCResponse<void>
```

**IPC Channel: `stop-recording`**

Request:
```typescript
void
```

Response:
```typescript
IPCResponse<{
  filePaths: string[];   // Paths to recorded WebM files
}>
```

**IPC Event: `recording-tick` (Main → Renderer)**

Payload:
```typescript
{
  duration: number;      // Elapsed seconds
}
```

**Recording Service Methods:**

```typescript
class RecordingService {
  async getSources(): Promise<{ screens: Source[], webcams: Source[] }>;
  async startRecording(config: RecordingConfig): Promise<void>;
  async stopRecording(): Promise<string[]>;
  createRecordingDirectory(): string;
  cleanupOldRecordings(): Promise<void>;
}
```

**Timeline Store Methods (Multi-Track):**

```typescript
interface TimelineStoreActions {
  // Existing from Epic 3
  addClip: (clip: Omit<Clip, 'id'>) => void;

  // New for Epic 4
  addClipToTrack: (clip: Omit<Clip, 'id'>, trackId: number) => void;
  getClipsForTrack: (trackId: number) => Clip[];
  setZoomLevel: (level: number) => void;

  // Zoom helpers
  zoomIn: () => void;   // Increase zoom by 0.5x
  zoomOut: () => void;  // Decrease zoom by 0.5x (min 0.5x)
}
```

**Canvas Compositing API (VideoCanvas Component):**

```typescript
interface VideoCanvasProps {
  mainTrackVideo: HTMLVideoElement | null;     // Track 1 video element
  overlayTrackVideo: HTMLVideoElement | null;  // Track 2 video element
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pipSize: number;                             // Percentage (default 25)
  width: number;                               // Canvas width
  height: number;                              // Canvas height
}

// Canvas rendering method
function compositeFrame(
  ctx: CanvasRenderingContext2D,
  mainVideo: HTMLVideoElement,
  overlayVideo: HTMLVideoElement,
  pipPosition: string,
  pipSize: number
): void;
```

### Workflows and Sequencing

**Screen Recording Workflow:**

1. User clicks "Record" button in sidebar
2. `RecordingModal` opens with mode selection
3. User selects "Screen Only" mode
4. Renderer invokes `get-sources` IPC
5. Main process calls `desktopCapturer.getSources()` to enumerate screens/windows
6. Main returns source list to renderer
7. `SourceSelector` displays available screens/windows with thumbnails
8. User selects source (e.g., "Chrome Window")
9. User clicks "Start Recording"
10. 3-2-1 countdown displays
11. Renderer calls `navigator.mediaDevices.getUserMedia()` with screen constraints
12. MediaRecorder starts capturing to WebM
13. Recording state updates: `isRecording = true`
14. Timer ticks every second, updating `recordingDuration`
15. User clicks "Stop Recording"
16. MediaRecorder stops, blob saved to temp file
17. Renderer invokes `stop-recording` IPC
18. Main process moves file to recordings directory
19. Main returns file path
20. Renderer triggers auto-import: adds file to media library + timeline Track 1
21. Recording modal closes, timeline shows new clip

**Webcam Recording Workflow:**

1. User clicks "Record" → selects "Webcam Only" mode
2. Renderer invokes `get-sources` IPC for webcam list
3. `SourceSelector` displays available webcams
4. User selects webcam device (e.g., "Built-in Camera")
5. `RecordingPreview` shows live webcam feed via getUserMedia
6. User clicks "Start Recording" → countdown → recording starts
7. MediaRecorder captures webcam + mic to WebM
8. Recording proceeds with timer updates
9. Stop → file saved → auto-import to media library + timeline Track 1
10. Recording modal closes

**Picture-in-Picture Recording Workflow:**

1. User clicks "Record" → selects "Screen + Webcam (PiP)" mode
2. Renderer invokes `get-sources` IPC
3. User selects screen source AND webcam device
4. `RecordingPreview` shows screen preview with webcam overlay in corner
5. User adjusts webcam position preview (visual only, not functional for MVP)
6. User clicks "Start Recording" → countdown starts
7. Renderer creates TWO MediaRecorder instances:
   - Recorder 1: Screen capture stream
   - Recorder 2: Webcam capture stream
8. Both recorders start simultaneously
9. Recording state tracks both streams
10. Timer displays elapsed time
11. User clicks "Stop Recording"
12. Both recorders stop, two WebM files saved
13. Renderer invokes `stop-recording` IPC with both file paths
14. Main process moves files to recordings directory
15. Main returns both file paths
16. Renderer triggers auto-import:
    - Screen recording → Media library → Timeline Track 1
    - Webcam recording → Media library → Timeline Track 2
17. Timeline displays both clips, aligned at start time
18. Preview shows composited output (screen with webcam overlay)
19. Recording modal closes

**Multi-Track Timeline Interaction:**

1. User has screen clip on Track 1, webcam clip on Track 2
2. Timeline displays 2 horizontal tracks stacked vertically
3. User drags new clip from media library
4. Drop target highlights based on mouse Y position (Track 1 or Track 2)
5. Clip dropped on Track 2
6. Timeline updates: `addClipToTrack(clip, 2)`
7. Timeline re-renders showing clip on Track 2
8. User can trim, split, delete clips independently per track
9. Playhead synchronizes across both tracks during playback

**Timeline Zoom Workflow:**

1. Timeline displays at default zoom level (1.0x)
2. User clicks "+" zoom button or presses Cmd/Ctrl + "+"
3. `setZoomLevel(1.5)` called
4. Timeline scale increases: each second occupies more horizontal pixels
5. Timeline content re-renders at new scale
6. Playhead position maintains visual alignment
7. User can now see more detail per clip (trim precision)
8. User clicks "−" button to zoom out
9. Timeline scale decreases, showing more clips in viewport
10. Zoom level persists during editing session

**Multi-Track Preview Compositing:**

1. Timeline has screen clip on Track 1, webcam clip on Track 2
2. User clicks play
3. `PreviewPlayer` component loads Track 1 video in main `<video>` element
4. `VideoCanvas` component created with both video sources
5. Canvas rendering loop starts via `requestAnimationFrame`:
   - Draw Track 1 video full-size on canvas
   - Draw Track 2 video as overlay (25% size) in bottom-right corner
   - Sync both video currentTime to playhead position
6. Canvas displays composited frame at 30fps
7. Audio plays from both tracks (mixed by browser)
8. Playhead advances, canvas updates in real-time
9. User sees preview with webcam overlaid on screen recording

**Multi-Track Export Workflow:**

1. User clicks "Export" with multi-track timeline
2. Export modal detects Track 2 has clips
3. Export options include PiP position selection (corner)
4. User selects resolution and output path
5. Renderer sends multi-track export options to main process
6. Main process `ffmpegService.executeMultiTrackExport()`:
   - Option A: Use FFmpeg overlay filter to composite tracks
   - Option B: Use Canvas to pre-render composite, then encode
7. FFmpeg processes timeline with overlay filter:
   ```bash
   ffmpeg -i track1.mp4 -i track2.mp4 \
     -filter_complex "[1:v]scale=iw*0.25:ih*0.25[pip];[0:v][pip]overlay=W-w-10:H-h-10" \
     -c:a aac output.mp4
   ```
8. Progress updates sent to renderer
9. Export completes with composited MP4 output
10. User verifies webcam appears as overlay in exported video

## Non-Functional Requirements

### Performance

**NFR001 (Timeline UI Responsiveness):**
- Multi-track timeline with 2 tracks and 10+ clips maintains 30fps minimum during interaction
- Zoom operations complete within 100ms with smooth visual feedback
- Track-specific drag-drop operations maintain 30fps with visual drop target indicators
- Timeline re-renders complete within 33ms (30fps) after clip additions or removals

**Recording Performance:**
- Screen recording captures at minimum 30fps with 1080p resolution
- Webcam recording captures at 30fps with 720p resolution
- PiP recording maintains 30fps for both streams simultaneously without frame drops
- Recording start countdown (3-2-1) displays without lag or stutter
- MediaRecorder does not cause UI freezing during active recording

**Multi-Track Preview Performance:**
- Canvas compositing maintains 30fps during playback (NFR003 compliance)
- requestAnimationFrame loop executes within 16ms per frame (60fps target for smooth 30fps playback)
- Audio playback synchronization within 50ms tolerance across both tracks
- Preview rendering does not block UI interactions (scrubbing, pause, play)

**Zoom Performance:**
- Zoom in/out operations complete within 100ms
- Timeline content re-layout at new zoom level completes within 200ms
- Smooth scrolling maintained at all zoom levels (30fps minimum)

### Security

**Recording Permissions:**
- Screen recording requires explicit user permission via macOS system dialog
- Webcam/microphone access requires explicit user permission via browser getUserMedia prompt
- Recording permissions validated before MediaRecorder initialization
- Permission denial handled gracefully with actionable error messages

**IPC Security:**
- Recording operations validated in main process handlers (source ID validation, mode validation)
- Recording file paths restricted to temp directory (`os.tmpdir()/chop-shop/recordings/`)
- No arbitrary file system writes outside temp and user-selected export directories
- Source enumeration limited to available devices (no arbitrary device access)

**File System Security:**
- Recording files stored with secure permissions (owner read/write only)
- Temp file cleanup on app quit prevents sensitive content leakage
- WebM files validated before import to timeline (format check, size check)

**MediaStream Security:**
- MediaStreams stopped immediately on recording stop to prevent background capture
- getUserMedia constraints validated before stream creation
- No persistent recording without user awareness (visual recording indicator always visible)

### Reliability/Availability

**NFR002 (Stability):**
- Recording failures (permission denied, device unavailable, disk full) handled gracefully with user error messages
- MediaRecorder errors caught and logged without crashing app
- Multi-track export failures do not corrupt timeline state
- Canvas compositing errors fall back to single-track playback

**Error Recovery:**
- Recording permission denial shows actionable message: "Screen recording requires permission. Enable in System Preferences > Privacy & Security > Screen Recording."
- Device unavailable (webcam in use) shows: "Camera unavailable. Close other apps using camera and try again."
- Disk full during recording shows: "Recording stopped. Insufficient disk space."
- Failed recordings do not leave partial files (cleanup on error)

**Recording Reliability:**
- Recording timer updates every 1 second without drift (verified over 10-minute recording)
- Stop recording completes within 2 seconds (MediaRecorder finalization)
- Auto-import after recording succeeds 100% of time for valid WebM files
- PiP recording stops both streams atomically (no orphaned recordings)

**Multi-Track Stability:**
- Track operations (add, remove, reorder clips) never corrupt timeline state
- Zoom operations never cause clip misalignment or playhead desync
- Canvas compositing failure falls back to main track only (no crash)

### Observability

**Logging:**
- All recording operations logged: `[Recording] Starting screen capture: source-id-123`
- MediaRecorder state changes logged: `[MediaRecorder] State: recording → stopped`
- Recording file paths logged: `[Recording] Saved to: /tmp/chop-shop/recordings/screen-20251029.webm`
- IPC recording commands logged: `[IPC] Received start-recording: mode=pip`
- Canvas compositing logged: `[Canvas] Compositing frame: track1=loaded, track2=loaded`
- Zoom operations logged: `[Timeline] Zoom level: 1.0x → 1.5x`

**Monitoring:**
- Recording duration tracked and logged every 10 seconds during capture
- MediaRecorder blob size monitored (warning if exceeds 2GB for single recording)
- Canvas frame rate monitored: log warning if drops below 20fps for >5 seconds
- Multi-track export duration tracked and logged (total time, per-clip time)

**Error Logging:**
- getUserMedia failures logged with reason: `[Recording] getUserMedia failed: NotAllowedError - permission denied`
- Recording permission errors logged: `[Recording] Screen capture permission denied by user`
- Canvas compositing errors logged: `[Canvas] Failed to composite frame: track2 video not loaded`
- Export errors logged with FFmpeg stderr output for debugging

## Dependencies and Integrations

**NPM Dependencies (from package.json):**

- `zustand@5.0.8` - State management for recordingStore, extended timelineStore with multi-track support
- `ffmpeg-static@5.2.0` - FFmpeg 6.0 binaries for multi-track export with overlay filters
- `video.js@8.23.4` - Video player for main track playback (hardware-accelerated)
- `@radix-ui/react-dialog@^1.1.15` - Recording modal UI component
- `@radix-ui/react-select@^2.2.6` - Source selector dropdowns (screen/webcam selection)
- `@radix-ui/react-slider@^1.3.6` - Timeline zoom slider control
- `lucide-react@^0.548.0` - Icons for recording controls (record, stop, camera, screen icons)
- `clsx@^2.1.1` and `tailwind-merge@^3.3.1` - Tailwind utilities for component styling

**Electron APIs:**

- `desktopCapturer` - Screen/window source enumeration for recording
  - `desktopCapturer.getSources({ types: ['screen', 'window'] })`
- `navigator.mediaDevices.getUserMedia()` - Webcam and microphone access
  - Screen capture via desktopCapturer source IDs
  - Webcam capture via video constraints
- `MediaRecorder` API - Recording to WebM format
  - `new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })`
- `ipcMain.handle()` - Recording command handling (get-sources, start-recording, stop-recording)
- `ipcRenderer.invoke()` - Recording requests from renderer
- `child_process.spawn()` - FFmpeg execution for multi-track export
- Canvas API - Multi-track compositing for preview
  - `canvas.getContext('2d')`
  - `ctx.drawImage(video, x, y, w, h)`
  - `requestAnimationFrame()` for smooth rendering

**Internal Integrations:**

- Timeline components (Epic 2, 3) - Extended with multi-track layout and track-based operations
- Preview player (Epic 2) - Extended with VideoCanvas component for multi-track compositing
- Media store (Epic 2) - Receives auto-imported recording files
- Export pipeline (Epic 3) - Extended to handle multi-track compositing and overlay filters
- Playback store (Epic 2) - Extended to synchronize playback across multiple tracks

**File System:**

- Recording temp directory: `os.tmpdir()/chop-shop/recordings/`
- Recording file naming: `screen-YYYYMMDDHHmmss.webm`, `webcam-YYYYMMDDHHmmss.webm`
- WebM files auto-imported to media library after recording stops

**External Tools:**

- FFmpeg 6.0 (via ffmpeg-static) - Multi-track export with overlay filter_complex:
  - `overlay` filter for PiP compositing
  - `scale` filter for webcam resize
  - Audio mixing for multi-track audio

**Browser APIs:**

- `MediaStream` - Represents screen/webcam capture streams
- `Blob` - MediaRecorder output format (WebM blobs)
- `URL.createObjectURL()` - Blob to video element source
- `requestAnimationFrame()` - Canvas compositing render loop

## Acceptance Criteria (Authoritative)

**AC-4.1: Multi-Track Timeline (2 Tracks)**

1. Timeline displays 2 horizontal tracks: Track 1 (main) and Track 2 (overlay)
2. Users can drag clips from media library to either track
3. Track 2 clips render on top of Track 1 in preview (overlay/PiP positioning)
4. Each track independently supports trim, split, delete operations
5. Playhead synchronizes across both tracks during playback
6. Export renders both tracks composited into single output video
7. Track 2 clips show visual indicator (border/label) distinguishing from Track 1

**AC-4.2: Timeline Zoom Controls**

1. Zoom controls (+ / - buttons or slider) visible in timeline toolbar
2. Zoom in increases timeline scale, showing more detail per clip
3. Zoom out decreases timeline scale, showing more clips in view
4. Playhead position maintains visual alignment during zoom
5. Zoom level persists during editing session
6. Keyboard shortcuts (Cmd/Ctrl + / Cmd/Ctrl -) for zoom operations
7. Timeline remains smooth and responsive during zoom (30fps minimum)

**AC-4.3: Screen Recording Setup**

1. "Record" button visible in left sidebar
2. Clicking Record opens recording setup modal
3. User can select recording mode: "Screen Only"
4. User can choose full screen or specific window/application
5. Preview shows what will be recorded before starting
6. Audio source selection (microphone, system audio, both, or none)
7. "Start Recording" button initiates countdown (3-2-1) then begins capture

**AC-4.4: Webcam Recording**

1. Recording setup modal includes "Webcam Only" mode option
2. User can select from available webcam devices
3. Live webcam preview shown in setup modal
4. Audio recording from selected microphone included
5. Recording starts after countdown (3-2-1)
6. Stop button visible during recording to end capture
7. Completed recording automatically imports to media library and timeline

**AC-4.5: Picture-in-Picture Recording (Screen + Webcam)**

1. Recording setup modal includes "Screen + Webcam (PiP)" mode
2. User selects screen source (full screen or window) AND webcam device
3. Webcam preview overlay shows position on screen preview (adjustable corner/size)
4. Both screen and webcam captured as separate video streams
5. Recording produces 2 clips: screen recording (Track 1) and webcam (Track 2)
6. Both clips automatically placed on timeline in correct tracks
7. Webcam clip positioned as overlay/PiP in preview compositing

**AC-4.6: Recording Stop and Auto-Import**

1. "Stop Recording" button accessible during any recording mode
2. Clicking Stop ends recording immediately and saves files
3. Recording files processed and optimized for editing (codec conversion if needed)
4. Completed recording(s) automatically added to media library with thumbnails
5. For PiP recordings, both clips automatically placed on correct timeline tracks
6. Recording files stored in organized temp directory structure
7. User sees success notification with recording duration

**AC-4.7: Enhanced Preview with Multi-Track Compositing**

1. Preview player renders Track 2 clips overlaid on Track 1 clips
2. Webcam/PiP clips display in appropriate corner with correct size
3. Real-time playback shows composited multi-track result
4. Audio from both tracks mixed appropriately (Track 1 primary, Track 2 secondary)
5. Scrubbing updates preview with correct multi-track composition
6. Preview maintains 30fps smooth playback with 2 tracks

## Traceability Mapping

| AC | Spec Section | Components/APIs | Test Approach |
|----|--------------|-----------------|---------------|
| AC-4.1 (Multi-Track) | Detailed Design → Timeline multi-track, Track model | `Timeline.tsx`, `TimelineTrack.tsx`, `timelineStore.ts` (multi-track actions) | Manual: Drag clips to Track 1 and Track 2, verify independent operations, check preview shows overlay |
| AC-4.2 (Zoom) | Detailed Design → ZoomControls, Timeline zoom workflow | `ZoomControls.tsx`, `timelineStore.setZoomLevel()`, Timeline rendering | Manual: Use +/- buttons and keyboard shortcuts, verify zoom scale changes, check playhead alignment |
| AC-4.3 (Screen Recording) | Detailed Design → Screen recording workflow, recording.service.ts | `RecordingModal.tsx`, `SourceSelector.tsx`, `recording.service.ts`, desktopCapturer | Manual: Open recording modal, select screen source, start recording, verify countdown and capture begins |
| AC-4.4 (Webcam Recording) | Detailed Design → Webcam recording workflow | `RecordingModal.tsx`, `RecordingPreview.tsx`, getUserMedia, MediaRecorder | Manual: Select webcam mode, verify live preview, start recording, check auto-import to timeline |
| AC-4.5 (PiP Recording) | Detailed Design → PiP recording workflow | Dual MediaRecorder instances, auto-import to tracks | Manual: Select PiP mode, choose screen + webcam, start recording, verify two files created and placed on separate tracks |
| AC-4.6 (Auto-Import) | Detailed Design → Recording stop workflow, auto-import | `recording.service.ts`, mediaStore, timelineStore auto-import | Manual: Stop recording, verify files saved, check media library and timeline update automatically |
| AC-4.7 (Multi-Track Preview) | Detailed Design → Multi-track preview compositing workflow | `VideoCanvas.tsx`, Canvas API compositing, requestAnimationFrame | Manual: Play multi-track timeline, verify webcam overlay renders correctly, check 30fps playback, test scrubbing |
| NFR001 (Performance) | Non-Functional Requirements → Performance | All Timeline and Canvas components | Manual: Multi-track timeline with 10+ clips, verify 30fps responsiveness during zoom, drag, playback |
| NFR002 (Stability) | Non-Functional Requirements → Reliability | Error handling in recording service, Canvas fallback | Manual: Test error scenarios (permission denied, device unavailable), verify graceful recovery |
| NFR003 (Preview 30fps) | Non-Functional Requirements → Multi-Track Preview Performance | Canvas compositing loop, requestAnimationFrame | Manual: Monitor frame rate during multi-track playback, verify smooth 30fps minimum |

## Risks, Assumptions, Open Questions

**Risks:**

- **R1: Recording Permission Complexity** - macOS screen recording permissions require System Preferences configuration and app restart. *Mitigation: Clear error messages with step-by-step instructions linking to System Preferences. Document permission requirements in user guide.*
- **R2: MediaRecorder Browser Compatibility** - MediaRecorder API behavior varies across Electron/Chromium versions. *Mitigation: Pin Electron version, test with target Electron 38.x, use standard WebM VP8 codec for maximum compatibility.*
- **R3: Multi-Track Export Performance** - FFmpeg overlay filter may be slow for long timelines (>20 minutes). *Mitigation: Use FFmpeg's `ultrafast` preset for 72-hour sprint; optimize with hardware acceleration post-launch.*
- **R4: Canvas Compositing Performance** - Real-time Canvas compositing at 30fps with 2 tracks may tax older Macs. *Mitigation: Target modern Macs (2020+), use requestAnimationFrame optimization, fall back to single-track if frame rate drops below 20fps.*
- **R5: WebM to Timeline Integration** - MediaRecorder outputs WebM; timeline may require MP4 conversion. *Mitigation: Test WebM playback in Video.js; if issues occur, use FFmpeg to convert WebM → MP4 during auto-import.*
- **R6: PiP Synchronization** - Screen and webcam recordings may drift out of sync over long captures (>10 minutes). *Mitigation: Start both MediaRecorders simultaneously with timestamp synchronization; acceptable drift <500ms for MVP.*
- **R7: Recording File Size** - Long recordings (>30 minutes) may produce multi-GB files causing import/playback issues. *Mitigation: Warn users if recording exceeds 20 minutes; document recommended recording length <15 minutes.*

**Assumptions:**

- **A1:** macOS screen recording permissions are granted by user before recording attempts
- **A2:** MediaRecorder API supports WebM with VP8/Opus codecs on Electron 38.x without additional configuration
- **A3:** Canvas 2D context can composite 2 video streams at 30fps on target hardware (modern Macs with 8GB+ RAM)
- **A4:** FFmpeg overlay filter produces acceptable quality output without extensive tuning
- **A5:** desktopCapturer provides reliable screen source enumeration with thumbnails
- **A6:** getUserMedia webcam access does not conflict with other apps on macOS
- **A7:** Zustand multi-track state updates complete within 16ms for UI responsiveness
- **A8:** Timeline zoom operations do not corrupt clip alignment or playhead position
- **A9:** WebM files produced by MediaRecorder are compatible with Video.js playback without transcoding
- **A10:** Recording temp directory has sufficient disk space (at least 10GB free) for typical use cases

**Open Questions:**

- **Q1:** Should recording support custom bitrate/quality settings? *Resolution: No - use MediaRecorder defaults for 72-hour sprint (defer to post-launch).*
- **Q2:** How to handle webcam overlay positioning in PiP mode? *Resolution: Fixed bottom-right corner at 25% size for MVP; adjustable positioning is post-launch feature.*
- **Q3:** Should export include audio from both tracks or just main track? *Resolution: Mix both tracks with equal volume; Track 1 audio at 100%, Track 2 audio at 80% to prevent overpowering.*
- **Q4:** What happens if user closes recording modal during active recording? *Resolution: Show confirmation dialog "Recording in progress. Stop recording?" with Stop/Cancel options.*
- **Q5:** Should Timeline zoom affect clip selection/trim precision? *Resolution: Yes - higher zoom enables pixel-precise trim handle positioning for better editing control.*

## Test Strategy Summary

**Unit Tests:**

- `recordingStore.test.ts` - Test recording state management
  - Verify state transitions: idle → recording → stopped
  - Test source selection updates
  - Verify duration timer increments correctly
  - Test stopRecording returns correct file paths

- `timelineStore.test.ts` (multi-track extensions) - Test track-based operations
  - Verify `addClipToTrack()` places clips on correct track
  - Test `getClipsForTrack()` returns only clips for specified track
  - Verify `setZoomLevel()` updates state correctly
  - Test zoom bounds (min 0.5x, max 5.0x)

- `VideoCanvas.test.tsx` - Test Canvas compositing logic
  - Mock video elements and canvas context
  - Verify `compositeFrame()` calculates correct PiP positioning
  - Test different PiP positions (4 corners)
  - Verify canvas draws both videos in correct order

**Integration Tests:**

- Manual IPC testing:
  - Invoke `get-sources` from renderer, verify screens and webcams returned
  - Invoke `start-recording` with screen mode, verify recording begins
  - Invoke `stop-recording`, verify file paths returned

- Manual MediaRecorder testing:
  - Create screen capture stream via desktopCapturer + getUserMedia
  - Start MediaRecorder, verify recording state updates
  - Stop MediaRecorder, verify WebM blob saved to file

- Manual multi-track export testing:
  - Create timeline with clips on both tracks
  - Export with overlay filter, verify FFmpeg command builds correctly
  - Verify output MP4 contains composited video

**Manual Testing (Critical Paths):**

1. **Screen Recording Test:**
   - Click Record button → Select "Screen Only"
   - Choose Chrome window from source list
   - Start recording → verify countdown → record for 30 seconds
   - Stop recording → verify auto-import to media library and Track 1
   - Play timeline → verify screen recording plays correctly

2. **Webcam Recording Test:**
   - Click Record → Select "Webcam Only"
   - Choose built-in camera
   - Verify live preview shows webcam feed
   - Start recording → record for 15 seconds
   - Stop → verify auto-import to timeline
   - Play → verify webcam recording with audio

3. **PiP Recording Test:**
   - Click Record → Select "Screen + Webcam (PiP)"
   - Choose screen source AND webcam
   - Verify preview shows screen with webcam overlay
   - Start recording → record for 30 seconds
   - Stop → verify TWO files created
   - Verify screen on Track 1, webcam on Track 2
   - Play → verify preview shows composited PiP output

4. **Multi-Track Timeline Test:**
   - Import video to Track 1
   - Import second video to Track 2
   - Verify timeline shows both tracks stacked
   - Drag clips to reorder within tracks
   - Play → verify preview shows Track 2 overlaid on Track 1
   - Verify audio from both tracks plays

5. **Timeline Zoom Test:**
   - Timeline with 5 clips
   - Click "+" zoom button → verify scale increases
   - Press Cmd/Ctrl + "-" → verify zoom out
   - Drag playhead → verify position maintains alignment
   - Select clip → drag trim handle → verify precision at high zoom

6. **Multi-Track Export Test:**
   - Timeline with screen clip on Track 1, webcam on Track 2
   - Click Export → select 1080p
   - Verify progress bar updates
   - Wait for completion
   - Open exported MP4 in QuickTime
   - Verify webcam appears as overlay in corner
   - Verify audio from both tracks mixed

7. **Error Scenarios:**
   - Attempt recording without screen permission → verify error message with instructions
   - Select webcam in use by another app → verify "Camera unavailable" error
   - Start recording with disk nearly full → verify "Insufficient disk space" error
   - Close recording modal during active recording → verify confirmation dialog

**Edge Cases:**

- Recording with no audio source selected (video only)
- PiP recording with only one source available (fallback to single-mode)
- Timeline zoom at maximum level (5.0x) with many clips (verify performance)
- Multi-track timeline with clips of different resolutions (1080p main, 720p overlay)
- Export multi-track timeline with no Track 2 clips (should export as single-track)
- Stop recording immediately after start (<1 second) - verify file created
- Long recording (>10 minutes) - verify no memory leaks, file size reasonable

**Performance Testing:**

- Multi-track timeline with 10 clips per track (20 total): Verify 30fps responsiveness
- Timeline zoom operations: Complete within 100ms
- Canvas compositing during playback: Maintain 30fps minimum (monitor frame rate)
- Recording for 5 minutes: Verify UI remains responsive, no stuttering
- Multi-track export of 5-minute timeline: Complete within 10 minutes (2x real-time)

**Acceptance:**

- All 7 stories (4.1-4.7) pass acceptance criteria
- No crashes during recording, multi-track editing, or export
- Multi-track preview maintains 30fps with compositing
- Exported multi-track video plays correctly in QuickTime/VLC with synced audio
- Recording permissions handled gracefully with clear error messages
