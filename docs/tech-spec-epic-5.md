# Epic Technical Specification: Screen & Webcam Capture (Simplified)

Date: 2025-10-28
Author: andrew
Epic ID: 5
Status: Draft

---

## Overview

Epic 5 implements a simplified, standalone screen and webcam capture system for Chop Shop. Unlike the complex multi-option approach in Epic 4, this epic focuses on intelligent auto-configuration and minimal user interaction. The system automatically selects the primary screen and default webcam, positions the webcam overlay in a fixed bottom-right corner (20% size, circular), and immediately places recorded clips on the appropriate timeline tracks.

This epic builds on Epic 3's editing and export foundation but operates as an independent module with minimal integration points. Users can record screen-only, webcam-only, or picture-in-picture content with just 2-3 clicks, eliminating complex source selection dialogs and configuration options. The recording workflow prioritizes speed over customization, following CapCut's philosophy of "smart defaults, edit later."

All PRD functional requirements for recording (FR013-FR015) are satisfied with a dramatically simplified implementation that reduces story count and technical complexity while maintaining full feature parity.

## Objectives and Scope

**In Scope:**

- Screen recording with auto-selection of primary display (no window picker)
- Webcam recording with auto-selection of default camera device
- Picture-in-picture recording (screen + webcam) with auto-positioned overlay (bottom-right, 20% size, circular)
- Single-button recording start (no multi-step configuration wizard)
- Automatic audio capture from microphone (no source selection)
- Recording stop with automatic import to media library and timeline placement
- Two-track auto-placement: Track 1 for screen, Track 2 for webcam overlay
- Fixed webcam positioning (customize later in timeline, not during recording)
- Standalone `recording.service.ts` with minimal external dependencies
- Simple recording state management in Zustand store
- Minimal recording UI: mode selection modal + floating stop button
- WebM recording with automatic conversion to editing codec if needed

**Out of Scope:**

- Source selection dialogs (screen picker, window picker, webcam selector) - uses auto-defaults
- Preview positioning controls during recording - fixed bottom-right corner
- Recording quality settings (resolution, framerate, bitrate) - uses smart defaults
- Webcam size/shape customization during recording - fixed 20% circular
- Multiple recording profiles or presets
- Recording pause/resume functionality
- System audio capture (requires macOS entitlements)
- Recording annotations or overlays during capture
- Live preview during recording (optimization for later)
- Audio mixing controls during recording

## System Architecture Alignment

Epic 5 implements a standalone recording module that integrates minimally with existing architecture:

**Standalone Service Layer (Main Process):**
- `recording.service.ts` - Single self-contained service handling all recording logic (screen, webcam, PiP)
- Uses Electron's `desktopCapturer` for screen access and `getUserMedia` for webcam
- Manages MediaRecorder instances and temp file storage independently
- No dependencies on other services (ffmpeg, file service used only for final import)

**Minimal Component Layer (Renderer Process):**
- `RecordingButton.tsx` - Single button in left sidebar (already in design)
- `RecordingModeModal.tsx` - 3-button modal: Screen Only / Webcam Only / Screen + Webcam (PiP)
- `RecordingTimer.tsx` - Floating stop button with elapsed time during recording
- No source selectors, no preview controls, no configuration screens

**State Management:**
- `recordingStore.ts` - Minimal state: `isRecording`, `mode`, `duration`, `outputFiles`
- Auto-import leverages existing `mediaStore.addFile()` and `timelineStore.addClipToTrack()`
- No recording-specific timeline extensions needed

**Integration Points (Minimal):**
1. Media Library: Auto-import uses existing import pipeline
2. Timeline: Auto-placement uses existing multi-track support from Epic 4
3. Export: No changes needed, works with existing FFmpeg pipeline

**Architecture Constraints:**
- Recording runs entirely in renderer process (MediaRecorder requires DOM context)
- Main process only used for source enumeration (auto-select, no user choice)
- Fixed PiP positioning eliminates need for Canvas compositing during recording
- All customization happens post-recording in timeline (leverages existing trim/split/reorder tools)
- No new IPC channels beyond basic start/stop commands

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|--------|---------|-------|
| `recording.service.ts` | All recording logic: screen capture, webcam capture, PiP coordination, MediaRecorder management, auto-source selection, temp file storage | Recording mode ('screen', 'webcam', 'pip') | Recording streams, output file paths (WebM), recording metadata | Main process |
| `recordingStore.ts` | Minimal recording state management | Recording actions (start, stop, tick) | Recording state (`isRecording`, `mode`, `duration`, `outputFiles`) | Renderer (Zustand) |
| `RecordingButton.tsx` | Single "Record" button in left sidebar | Click events | Opens RecordingModeModal | Renderer component |
| `RecordingModeModal.tsx` | 3-button mode selection modal (Screen Only / Webcam Only / Screen + Webcam) | Mode selection clicks | Triggers recording start with selected mode | Renderer component |
| `RecordingTimer.tsx` | Floating timer display with stop button during recording | Recording duration updates from store | Stop recording trigger | Renderer component |
| `mediaStore.ts` (reused) | Auto-import recorded files to media library | File paths from recording service | Media library entries with thumbnails | Renderer (Zustand) |
| `timelineStore.ts` (reused) | Auto-place clips on tracks (Track 1: screen, Track 2: webcam) | Clip data with track assignments | Updated timeline with recorded clips | Renderer (Zustand) |

**Key Simplifications:**
- **Single Service File**: All recording logic consolidated in one 300-400 line service file
- **No Source Selectors**: Eliminates SourceSelector.tsx, RecordingPreview.tsx components
- **No IPC Handlers File**: Recording commands handled inline in main process, minimal API surface
- **Reuses Existing Stores**: No new timeline or media extensions needed

### Data Models and Contracts

**Recording Mode (Simplified):**

```typescript
type RecordingMode = 'screen' | 'webcam' | 'pip';
```

**Recording State (Minimal):**

```typescript
interface RecordingState {
  isRecording: boolean;
  mode: RecordingMode | null;
  duration: number;              // Seconds elapsed
  outputFiles: {                 // Populated on stop
    screen?: string;             // Path to screen recording (WebM)
    webcam?: string;             // Path to webcam recording (WebM)
  };

  // Actions
  startRecording: (mode: RecordingMode) => Promise<void>;
  stopRecording: () => Promise<void>;
  updateDuration: (duration: number) => void;
}
```

**Recording Configuration (Auto-Defaults):**

```typescript
// Fixed configuration - no user input required
const RECORDING_DEFAULTS = {
  screen: {
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    videoBitsPerSecond: 8000000  // 8 Mbps
  },
  webcam: {
    resolution: { width: 640, height: 480 },
    frameRate: 30,
    videoBitsPerSecond: 2500000,  // 2.5 Mbps
    position: 'bottom-right',      // Fixed position
    size: 0.2,                     // 20% of screen
    shape: 'circle'
  },
  audio: {
    autoSelectMicrophone: true,
    echoCancellation: true,
    noiseSuppression: true
  },
  storage: {
    tempDir: path.join(os.tmpdir(), 'chop-shop', 'recordings'),
    format: 'webm',
    codec: 'vp9'
  }
};
```

**Recording Output:**

```typescript
interface RecordingOutput {
  files: {
    screen?: {
      path: string;              // Absolute path to WebM file
      duration: number;          // Seconds
      resolution: { width: number; height: number };
    };
    webcam?: {
      path: string;
      duration: number;
      resolution: { width: number; height: number };
    };
  };
  metadata: {
    startTime: Date;
    endTime: Date;
    mode: RecordingMode;
  };
}
```

### APIs and Interfaces

**IPC Commands (Minimal Surface):**

```typescript
// Channel: 'recording:start'
interface StartRecordingRequest {
  mode: RecordingMode;
}

Response: IPCResponse<{ success: boolean }>

// Channel: 'recording:stop'
Request: void

Response: IPCResponse<RecordingOutput>

// Channel: 'recording:get-default-sources' (internal, no user interaction)
Request: void

Response: IPCResponse<{
  screen: { id: string; name: string };
  webcam: { id: string; name: string };
}>
```

**Main Process Recording Service API:**

```typescript
class RecordingService {
  // Auto-select primary screen (no user choice)
  async getPrimaryScreen(): Promise<DesktopCapturerSource>;

  // Auto-select default webcam (no user choice)
  async getDefaultWebcam(): Promise<MediaDeviceInfo>;

  // Start recording with mode
  async startRecording(mode: RecordingMode): Promise<void>;

  // Stop recording and return file paths
  async stopRecording(): Promise<RecordingOutput>;

  // Internal: Create MediaRecorder for screen
  private createScreenRecorder(stream: MediaStream): MediaRecorder;

  // Internal: Create MediaRecorder for webcam
  private createWebcamRecorder(stream: MediaStream): MediaRecorder;

  // Internal: Save recorded chunks to WebM file
  private saveRecording(chunks: Blob[], filename: string): Promise<string>;
}
```

**Renderer Recording Hooks (Simple):**

```typescript
// Custom hook for recording operations
function useRecording() {
  const { isRecording, mode, duration, startRecording, stopRecording } =
    useRecordingStore();

  const handleStart = async (mode: RecordingMode) => {
    await startRecording(mode);
  };

  const handleStop = async () => {
    const output = await stopRecording();
    // Auto-import to media library and timeline
    await autoImportRecordings(output);
  };

  return { isRecording, mode, duration, handleStart, handleStop };
}
```

### Workflows and Sequencing

**Workflow 1: Screen-Only Recording**

```
1. User clicks "Record" button in left sidebar
2. RecordingModeModal opens with 3 buttons
3. User clicks "Screen Only"
4. Main process auto-selects primary screen via desktopCapturer
5. Renderer requests screen stream via getUserMedia with auto-selected source
6. MediaRecorder starts capturing screen + microphone audio
7. RecordingTimer appears (floating, top-right) showing elapsed time
8. User clicks "Stop Recording" button
9. MediaRecorder stops, saves WebM file to temp directory
10. Auto-import: File added to media library with thumbnail
11. Auto-place: Clip added to Timeline Track 1
12. Success notification: "Screen recording added to timeline"
```

**Workflow 2: Webcam-Only Recording**

```
1. User clicks "Record" button
2. RecordingModeModal opens
3. User clicks "Webcam Only"
4. Main process auto-selects default webcam device
5. Renderer requests webcam stream via getUserMedia (video + audio)
6. MediaRecorder starts capturing webcam
7. RecordingTimer appears showing elapsed time
8. User clicks "Stop Recording"
9. MediaRecorder stops, saves WebM file
10. Auto-import: File added to media library
11. Auto-place: Clip added to Timeline Track 2 (overlay track)
12. Success notification: "Webcam recording added to timeline"
```

**Workflow 3: Picture-in-Picture Recording (Primary Use Case)**

```
1. User clicks "Record" button
2. RecordingModeModal opens
3. User clicks "Screen + Webcam (PiP)" [DEFAULT/HIGHLIGHTED]
4. Main process auto-selects:
   - Primary screen via desktopCapturer
   - Default webcam via getUserMedia
5. Renderer creates TWO MediaRecorder instances:
   a. Screen recorder (1920x1080, 30fps, screen + mic audio)
   b. Webcam recorder (640x480, 30fps, webcam audio)
6. Both recorders start simultaneously
7. RecordingTimer appears showing elapsed time
8. User clicks "Stop Recording"
9. Both recorders stop, save two separate WebM files:
   - screen-recording-[timestamp].webm
   - webcam-recording-[timestamp].webm
10. Auto-import: Both files added to media library
11. Auto-place on timeline:
    - Screen recording → Track 1 (main/background)
    - Webcam recording → Track 2 (overlay, bottom-right, 20% size, circular)
12. Success notification: "PiP recording added to timeline (2 tracks)"
13. User can now adjust webcam position/size in timeline if needed
```

**Sequence Diagram (PiP Recording - Simplified):**

```
User          RecordingButton    RecordingModeModal    RecordingStore    RecordingService    MediaRecorder(s)    Timeline
 |                  |                    |                   |                  |                    |              |
 |-- click -------->|                    |                   |                  |                    |              |
 |                  |-- open modal ----->|                   |                  |                    |              |
 |                  |                    |-- "Screen+Webcam"-|                  |                    |              |
 |                  |                    |                   |--startRecording->|                    |              |
 |                  |                    |                   |                  |--auto-select------>|              |
 |                  |                    |                   |                  |  sources           |              |
 |                  |                    |                   |                  |--createRecorders-->|              |
 |                  |                    |                   |                  |                    |--start()---->|
 |                  |                    |                   |<--isRecording=true|                    |              |
 |                  |                    |                   |                  |                    |              |
 |<-- Timer appears with Stop button ----|                   |                  |                    |              |
 |                  |                    |                   |                  |                    |--recording-->|
 |-- click Stop --->|                    |                   |                  |                    |              |
 |                  |                    |                   |--stopRecording-->|                    |              |
 |                  |                    |                   |                  |                    |--stop()----->|
 |                  |                    |                   |                  |<--chunks-----------|              |
 |                  |                    |                   |                  |--save to files---->|              |
 |                  |                    |                   |<--output files---|                    |              |
 |                  |                    |                   |--autoImport------|                    |              |
 |                  |                    |                   |                  |                    |              |
 |<-- Files appear in Media Library -----|                   |                  |                    |              |
 |                  |                    |                   |--addToTracks-----|                    |              |
 |<-- Clips placed on Timeline Track 1 + Track 2 ------------|                  |                    |------------->|
 |<-- Success notification --------------|                   |                  |                    |              |
```

**Key Simplification:** No preview step, no source selection dialogs, no configuration screens. Just click mode → record → auto-import.

## Non-Functional Requirements

### Performance

- **Recording Start Latency**: Recording must start within 2 seconds of mode selection (auto-source selection eliminates user wait time)
- **UI Responsiveness**: RecordingTimer must update smoothly at 1fps minimum during recording without blocking main UI
- **Memory Usage**: Combined screen + webcam recording must not exceed 500MB RAM for 10-minute recording
- **File Write Performance**: WebM files must be saved to disk within 3 seconds of stopping recording
- **Auto-Import Speed**: Recorded files must appear in media library within 5 seconds of recording stop
- **Timeline Placement**: Auto-placement on timeline tracks must complete instantly (<500ms)
- **No Frame Drops**: Screen recording must maintain 30fps capture rate without dropped frames on typical hardware
- **Concurrent Recording**: PiP mode must handle 2 simultaneous MediaRecorder instances without performance degradation

**Rationale**: Meets PRD NFR001 (30fps responsiveness) and NFR002 (no memory leaks during 15-minute sessions). Auto-defaults eliminate configuration overhead that slows down competing products.

### Security

- **Permission Handling**: App must request macOS screen recording permissions on first recording attempt with clear user guidance
- **Microphone Permissions**: App must request microphone access with appropriate privacy justification
- **Temp File Security**: Recording files stored in OS-standard temp directory with user-only read/write permissions
- **No External Network**: Recording functionality must operate completely offline (no cloud upload, no analytics)
- **MediaStream Cleanup**: All MediaStream tracks must be explicitly stopped on recording completion to release camera/mic access
- **IPC Validation**: Recording IPC commands must validate mode parameter against allowed enum values

**Rationale**: Follows Electron security best practices (ADR-002) and macOS privacy requirements. Minimal IPC surface reduces attack vectors.

### Reliability/Availability

- **Graceful Degradation**: If webcam unavailable, PiP mode falls back to screen-only with user notification
- **Recording Failure Recovery**: If recording fails (permissions denied, device busy), display clear error with actionable guidance
- **File System Resilience**: Check available disk space before recording (warn if <1GB free)
- **Crash Recovery**: If app crashes during recording, temp files must be preserved and recoverable on restart
- **MediaRecorder Error Handling**: Handle `onerror` events from MediaRecorder with user-friendly messages
- **Source Availability**: If primary screen unavailable, automatically select first available screen
- **No Data Loss**: Recorded chunks must be buffered and periodically flushed to disk (every 5 seconds) to prevent loss on crash

**Rationale**: Meets PRD NFR002 (zero crashes during core workflow). Auto-fallbacks eliminate user frustration from device conflicts.

### Observability

- **Recording Logs**: Log recording start/stop events with mode, duration, file sizes to console with `[Recording]` prefix
- **Error Logging**: Log all recording errors with full stack traces and context (mode, duration, sources)
- **Performance Metrics**: Log recording initialization time, file save time, auto-import time for performance monitoring
- **Permission Status**: Log screen recording and microphone permission status on app launch
- **File Paths**: Log absolute paths to recorded files for debugging playback/import issues
- **MediaRecorder State**: Log state transitions (inactive → recording → paused → inactive) with timestamps

**Example Log Output**:
```
[Recording] Starting PiP recording...
[Recording] Auto-selected: Screen 'Built-in Display' (id: screen:0)
[Recording] Auto-selected: Webcam 'FaceTime HD Camera' (id: default)
[Recording] MediaRecorder (screen) started: 1920x1080 @ 30fps
[Recording] MediaRecorder (webcam) started: 640x480 @ 30fps
[Recording] Recording duration: 125.3s
[Recording] Saved: /tmp/chop-shop/recordings/screen-20251028-143022.webm (187.4 MB)
[Recording] Saved: /tmp/chop-shop/recordings/webcam-20251028-143022.webm (45.2 MB)
[Recording] Auto-import completed: 2 files added to timeline
```

**Rationale**: Enables rapid debugging of recording issues during sprint. Consistent `[Recording]` prefix allows easy log filtering.

## Dependencies and Integrations

**External Dependencies:**

| Dependency | Version | Purpose | Notes |
|------------|---------|---------|-------|
| Electron | ^38.1.2 | Desktop framework, provides `desktopCapturer` API | Already in package.json |
| Native Web APIs | Browser standard | `getUserMedia`, `MediaRecorder` for recording | No installation needed |
| Node.js `os` module | Built-in | Temp directory path resolution | No installation needed |
| Node.js `path` module | Built-in | File path manipulation | No installation needed |
| Node.js `fs` module | Built-in | File system operations for WebM saving | No installation needed |

**Internal Dependencies (Existing Code):**

| Component | Location | Integration Point | Usage |
|-----------|----------|-------------------|-------|
| `mediaStore.ts` | `src/renderer/store/` | `addFile()` action | Auto-import recorded files to media library |
| `timelineStore.ts` | `src/renderer/store/` | `addClipToTrack()` action | Auto-place clips on Track 1 and Track 2 |
| `uiStore.ts` | `src/renderer/store/` | Modal state management | Show/hide RecordingModeModal |
| Timeline components | `src/renderer/components/Timeline/` | Track rendering | Display auto-placed recording clips |
| Media Library | `src/renderer/components/MediaLibrary/` | Thumbnail generation | Show recorded file thumbnails |

**No New Dependencies Required**: Epic 5 uses only native Electron/Web APIs and existing codebase infrastructure.

**Integration Points (Minimal Coupling):**

1. **Media Library Integration**:
   - Uses existing `mediaStore.addFile()` API
   - No modifications needed to media library code
   - Recording service provides file paths, media library generates thumbnails

2. **Timeline Integration**:
   - Uses existing `timelineStore.addClipToTrack()` API
   - Requires multi-track support from Epic 4 (Track 1 and Track 2)
   - No modifications needed if Epic 4 multi-track is complete

3. **Export Integration**:
   - No changes needed
   - WebM files from recording work with existing export pipeline
   - FFmpeg handles WebM → MP4 conversion in export

**Standalone Design Benefits**:
- Recording module can be developed independently
- No cross-epic dependencies (except multi-track timeline from Epic 4)
- Can be tested in isolation before integration
- Future enhancements (pause/resume, quality settings) won't affect other modules

## Acceptance Criteria (Authoritative)

**AC-1: Screen-Only Recording**
- User can click "Record" button and select "Screen Only" mode
- Primary screen is auto-selected without user interaction
- Recording starts within 2 seconds of mode selection
- RecordingTimer displays elapsed time in MM:SS format
- User can click "Stop Recording" to end capture
- Screen recording saved as WebM file in temp directory
- Recording automatically appears in media library with thumbnail
- Recording automatically placed on Timeline Track 1
- No frame drops during 5-minute recording test

**AC-2: Webcam-Only Recording**
- User can select "Webcam Only" mode from RecordingModeModal
- Default webcam device is auto-selected
- Webcam video + audio captured successfully
- Recording stops cleanly and saves WebM file
- Webcam recording automatically placed on Timeline Track 2 (overlay track)
- Microphone audio captured with echo cancellation enabled

**AC-3: Picture-in-Picture Recording (Primary Use Case)**
- User can select "Screen + Webcam (PiP)" mode
- Both primary screen and default webcam auto-selected
- Two separate MediaRecorder instances start simultaneously
- Recording produces two separate WebM files (screen + webcam)
- Both files automatically imported to media library
- Screen recording auto-placed on Track 1
- Webcam recording auto-placed on Track 2 with 20% size, bottom-right position
- Both recordings have identical duration (synchronized)
- Success notification displays: "PiP recording added to timeline (2 tracks)"

**AC-4: Auto-Source Selection**
- No source selection dialogs shown to user
- Primary screen selected automatically via `desktopCapturer.getSources()[0]`
- Default webcam selected automatically via `getUserMedia()`
- If primary source unavailable, automatically fall back to first available source
- Clear error message if no screen or webcam available

**AC-5: Recording State Management**
- `recordingStore.isRecording` correctly reflects recording state
- Duration updates every second during recording
- RecordingTimer UI updates in real-time
- Clicking "Record" during active recording shows warning (prevent concurrent recordings)
- Recording state resets to initial state after stop completes

**AC-6: Temp File Management**
- Recordings saved to `os.tmpdir()/chop-shop/recordings/` directory
- Filename format: `{mode}-recording-{timestamp}.webm` (e.g., `screen-recording-20251028-143022.webm`)
- Temp directory created automatically if doesn't exist
- Files have user-only read/write permissions (0600)
- Disk space checked before recording (warn if <1GB available)

**AC-7: Auto-Import Workflow**
- Recorded files automatically added to media library within 5 seconds of stop
- Thumbnails generated for both screen and webcam recordings
- Media library entries show correct duration and resolution metadata
- No manual import action required from user

**AC-8: Auto-Placement on Timeline**
- Screen recordings placed on Track 1 at end of existing clips
- Webcam recordings placed on Track 2 at same timestamp as screen recording
- Timeline scrolls to show newly added clips
- Clips are immediately editable (trim, split, delete)
- Auto-placement completes in <500ms

**AC-9: Permission Handling**
- App requests screen recording permission on first recording attempt
- App requests microphone permission on first recording attempt
- Clear modal shows if permissions denied with instructions to enable in System Preferences
- Recording fails gracefully with actionable error message if permissions not granted
- Permission status logged on app launch

**AC-10: Error Handling and Recovery**
- If webcam busy (used by another app), show clear error and suggest closing other apps
- If recording fails to start, display error with retry option
- If recording fails mid-capture, preserve partial recording and notify user
- MediaRecorder errors logged with full context
- All MediaStream tracks properly stopped/cleaned up on error

**AC-11: Performance Requirements**
- Recording start latency <2 seconds (measured from mode selection to first frame captured)
- UI remains responsive (30fps) during recording
- Combined memory usage <500MB for 10-minute PiP recording
- No memory leaks after multiple record/stop cycles
- File save completes within 3 seconds of stop

**AC-12: UI/UX Requirements**
- RecordingModeModal has clear, large buttons for each mode
- "Screen + Webcam (PiP)" mode visually highlighted as recommended option
- RecordingTimer appears floating in top-right corner (non-blocking)
- Stop button large and easily clickable during recording
- Success notification appears after auto-import completes

## Traceability Mapping

| Acceptance Criterion | Spec Section | Component/API | Test Approach |
|---------------------|--------------|---------------|---------------|
| AC-1: Screen-Only Recording | Workflows, Services & Modules | `recording.service.ts`, `RecordingModeModal.tsx`, `RecordingTimer.tsx` | Manual: Record screen, verify file saved and imported to Track 1 |
| AC-2: Webcam-Only Recording | Workflows, APIs & Interfaces | `recording.service.ts`, `getUserMedia()`, Track 2 placement | Manual: Record webcam, verify audio capture and Track 2 placement |
| AC-3: Picture-in-Picture Recording | Workflows (Primary Use Case), Data Models | `recording.service.ts` (dual MediaRecorder), `timelineStore.addClipToTrack()` | Manual: Record PiP, verify 2 files created and placed on both tracks |
| AC-4: Auto-Source Selection | APIs & Interfaces, Data Models (RECORDING_DEFAULTS) | `getPrimaryScreen()`, `getDefaultWebcam()` | Unit: Mock `desktopCapturer`, verify first source selected |
| AC-5: Recording State Management | Data Models (RecordingState) | `recordingStore.ts` | Unit: Test Zustand store actions (start, stop, updateDuration) |
| AC-6: Temp File Management | Data Models (RECORDING_DEFAULTS.storage) | `recording.service.ts` (saveRecording) | Unit: Verify files created in correct directory with correct permissions |
| AC-7: Auto-Import Workflow | Workflows, Integration Points | `mediaStore.addFile()`, thumbnail generation | Integration: Record → verify media library entry created |
| AC-8: Auto-Placement on Timeline | Workflows, Integration Points | `timelineStore.addClipToTrack()` | Integration: Record → verify clips on correct tracks |
| AC-9: Permission Handling | Security NFR | macOS permission dialogs, error handling | Manual: Test with permissions denied, verify error messages |
| AC-10: Error Handling | Reliability NFR | MediaRecorder `onerror`, try-catch blocks | Manual: Simulate webcam busy, disk full scenarios |
| AC-11: Performance Requirements | Performance NFR | MediaRecorder configuration, memory profiling | Manual: Record 10-minute PiP, monitor RAM with Activity Monitor |
| AC-12: UI/UX Requirements | Services & Modules (UI components) | `RecordingModeModal.tsx`, `RecordingTimer.tsx` | Manual: Visual inspection, click testing |

## Risks, Assumptions, Open Questions

**Risks:**

1. **RISK: macOS Screen Recording Permissions Denied**
   - **Impact**: Users cannot record screen without explicit permission grant
   - **Mitigation**: Display clear modal with step-by-step instructions to enable permissions in System Preferences → Privacy & Security → Screen Recording
   - **Likelihood**: Medium (first-time users always hit this)

2. **RISK: MediaRecorder Browser Compatibility**
   - **Impact**: Different Chromium versions may support different codecs
   - **Mitigation**: Use VP9 codec (widely supported), fall back to VP8 if unavailable
   - **Likelihood**: Low (Electron bundles specific Chromium version)

3. **RISK: Webcam Already in Use**
   - **Impact**: PiP recording fails if webcam accessed by another app (Zoom, FaceTime)
   - **Mitigation**: Graceful fallback to screen-only mode with user notification
   - **Likelihood**: Medium (common scenario for video creators)

4. **RISK: Large File Sizes**
   - **Impact**: 10-minute 1080p recording = ~300MB WebM file, may fill disk
   - **Mitigation**: Check available disk space before recording, warn if <1GB free
   - **Likelihood**: Low (temp directory typically has space)

5. **RISK: Audio/Video Sync Drift**
   - **Impact**: Long recordings (>5 minutes) may have A/V sync issues
   - **Mitigation**: Use MediaRecorder with audio constraints (echoCancellation, noiseSuppression), test with 10-minute recordings
   - **Likelihood**: Low (WebM container handles sync well)

**Assumptions:**

1. **Multi-track timeline from Epic 4 is complete and working**
   - Assumption: `timelineStore.addClipToTrack()` API exists and supports Track 1 and Track 2
   - Validation: Review Epic 4 completion status before starting Epic 5

2. **User has granted screen recording and microphone permissions**
   - Assumption: macOS permission dialogs are correctly triggered on first recording attempt
   - Validation: Test on fresh macOS install with no existing permissions

3. **Primary screen is always available**
   - Assumption: `desktopCapturer.getSources()` returns at least one screen
   - Validation: Handle edge case where no screens available (unlikely but possible)

4. **WebM format is compatible with existing export pipeline**
   - Assumption: FFmpeg can read WebM files from recording and convert to MP4
   - Validation: Test export with recorded WebM files (already validated in Epic 3)

5. **MediaRecorder produces playable WebM files**
   - Assumption: Browser-generated WebM files work with Video.js player and FFmpeg
   - Validation: Test playback in preview player immediately after recording

6. **Temp directory is writable**
   - Assumption: `os.tmpdir()` returns a path with write permissions
   - Validation: Check write permissions before creating recording directory

**Open Questions:**

1. **QUESTION: Should recording auto-start after mode selection, or show a countdown (3-2-1)?**
   - **Option A**: Immediate start (faster workflow)
   - **Option B**: 3-second countdown (gives user time to prepare)
   - **Recommendation**: Start with countdown for better UX, can remove later if users prefer instant start
   - **Decision**: Add countdown in RecordingTimer component

2. **QUESTION: What happens if user closes app during recording?**
   - **Option A**: Discard recording (lost work)
   - **Option B**: Save partial recording to temp directory and offer recovery on restart
   - **Recommendation**: Implement periodic chunk flushing (every 5 seconds) to enable recovery
   - **Decision**: Add to Reliability NFR

3. **QUESTION: Should webcam shape be circular or rounded rectangle?**
   - **Option A**: Circular (modern, cleaner look)
   - **Option B**: Rounded rectangle (shows more of webcam frame)
   - **Recommendation**: Start with circular (matches CapCut pattern), can make configurable later
   - **Decision**: Circular (20% size, bottom-right)

4. **QUESTION: Should recording continue if user switches to another app?**
   - **Option A**: Continue recording (captures app switches)
   - **Option B**: Pause recording when Chop Shop loses focus
   - **Recommendation**: Continue recording (users may want to demo other apps)
   - **Decision**: Continue recording regardless of app focus

5. **QUESTION: How to handle very long recordings (>30 minutes)?**
   - **Option A**: Allow unlimited duration (risk of huge files)
   - **Option B**: Warn user at 30 minutes, suggest stopping and splitting into parts
   - **Recommendation**: No hard limit for MVP, add warning at 30 minutes in future iteration
   - **Decision**: No duration limit for Epic 5

## Test Strategy Summary

**Unit Tests (Vitest):**

1. **recordingStore.ts Tests**
   - Test `startRecording()` sets `isRecording = true` and stores mode
   - Test `stopRecording()` resets state and returns output files
   - Test `updateDuration()` increments duration correctly
   - Test state immutability (Zustand pattern)

2. **recording.service.ts Tests (Mock Heavy)**
   - Mock `desktopCapturer.getSources()` and verify primary screen selected
   - Mock `getUserMedia()` and verify default webcam selected
   - Test file path generation: `{mode}-recording-{timestamp}.webm`
   - Test temp directory creation logic
   - Test disk space check logic (mock `fs.statfs`)

**Integration Tests:**

1. **Auto-Import Integration**
   - Record screen → Verify `mediaStore.addFile()` called with correct file path
   - Verify thumbnail generated for recorded file
   - Verify media library UI updates with new recording

2. **Auto-Placement Integration**
   - Record screen → Verify clip added to Track 1
   - Record webcam → Verify clip added to Track 2
   - Record PiP → Verify both clips added to correct tracks with synchronized timestamps

3. **Export Integration**
   - Record screen → Export timeline → Verify MP4 file created successfully
   - Record PiP → Export multi-track timeline → Verify composited output with webcam overlay

**Manual Tests (Critical User Flows):**

1. **Happy Path: PiP Recording**
   - Click Record → Select "Screen + Webcam (PiP)" → Wait 5 minutes → Click Stop
   - Verify: 2 files created, both imported, both on timeline, playback works, export works
   - Success Criteria: No crashes, A/V sync maintained, files playable

2. **Permission Denied Flow**
   - Fresh macOS install (no permissions granted)
   - Click Record → System asks for screen recording permission → Deny
   - Verify: Clear error message, instructions to enable in System Preferences
   - Grant permission → Retry → Verify recording works

3. **Webcam Busy Flow**
   - Open FaceTime (locks webcam)
   - Click Record → Select "Screen + Webcam (PiP)"
   - Verify: Error message "Webcam in use by another app", fallback to screen-only

4. **Low Disk Space Flow**
   - Fill disk to <500MB free space
   - Click Record → Verify warning message before recording starts
   - Recording stops early if disk fills during recording

5. **Long Recording (10 minutes)**
   - Record PiP mode for 10 minutes
   - Monitor RAM usage in Activity Monitor (must stay <500MB)
   - Verify: No memory leaks, no frame drops, A/V sync maintained

6. **Multiple Record/Stop Cycles**
   - Record → Stop → Record → Stop → Repeat 10 times
   - Verify: No memory leaks, no state corruption, all recordings imported correctly

**Performance Tests:**

1. **Recording Start Latency**: Measure time from mode selection to first frame captured (target: <2 seconds)
2. **File Save Time**: Measure time from stop click to file written to disk (target: <3 seconds)
3. **Auto-Import Speed**: Measure time from stop to media library update (target: <5 seconds)
4. **UI Responsiveness**: Monitor FPS during recording with Chrome DevTools (target: >30fps)

**Test Coverage Goals:**
- Unit test coverage: >80% for `recordingStore.ts` and core service logic
- Integration tests: All 3 recording modes + auto-import + auto-placement
- Manual tests: All acceptance criteria validated
- Performance tests: All NFR performance targets validated

**Test Execution Timeline:**
- Unit tests: Automated in CI (Vitest), run on every commit
- Integration tests: Run manually before story completion
- Manual tests: Run during story development and before epic completion
- Performance tests: Run once during epic validation (10-minute recording test)
