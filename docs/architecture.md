# Chop Shop - Decision Architecture

**Author:** andrew
**Date:** 2025-10-27
**Project:** Chop Shop (Level 2 - 72-hour sprint)
**Version:** 1.0

---

## Executive Summary

Chop Shop is a desktop video editor built with Electron, React, TypeScript, and FFmpeg, optimized for rapid development under extreme time constraints (72-hour deadline). The architecture prioritizes pragmatic, battle-tested choices that enable AI agents to work independently while producing compatible code. This document serves as the consistency contract for all implementation agents.

## Project Initialization

**Foundation: electron-react-boilerplate (Already Initialized)**

The project is already initialized with electron-react-boilerplate, which provides:
- Electron + React + TypeScript + Webpack
- electron-builder for macOS packaging
- Jest testing framework
- ESLint + Prettier
- Hot reload development environment
- Two-package.json structure (production/development)

**First Implementation Task: Add Tailwind CSS (Story 1.3)**

```bash
npm install -D tailwindcss postcss autoprefixer clsx tailwind-merge
npx tailwindcss init -p
```

Configure Tailwind for renderer process (see Styling section below).

---

## Decision Summary

| Category | Decision | Version | Affects Epics | Rationale |
|----------|----------|---------|---------------|-----------|
| **State Management** | Zustand | 5.0.8 | All | Minimal boilerplate, excellent TypeScript support, perfect for 72-hour timeline |
| **Electron Framework** | electron-react-boilerplate | Latest | All | Pre-configured build system, eliminates setup time |
| **FFmpeg Integration** | ffmpeg-static | 5.2.0 (FFmpeg 6.0) | Epic 3, 4 | Bundles FFmpeg binaries, no external dependencies |
| **IPC Architecture** | Main: FFmpeg/File I/O, Renderer: UI | N/A | All | Security best practice, prevents UI freezing |
| **Screen Recording** | desktopCapturer + getUserMedia | Native Electron | Epic 4 | Native API, no external libraries needed |
| **Preview Rendering** | HTML5 video + Canvas overlay | Native | Epic 2, 4 | Simple, performant, meets 30fps requirement |
| **Styling** | Tailwind CSS | 3.x | All | Co-located styles, faster development, fewer files |
| **Testing** | Jest | From boilerplate | All | Pre-configured, unit tests for logic |
| **File Management** | OS temp directory | Node.js os module | Epic 3, 4 | Standard approach, automatic cleanup |
| **Error Handling** | Try-catch + user-friendly messages | N/A | All | Pragmatic, user-focused error recovery |
| **TypeScript** | Strict mode | 5.x | All | Type safety, better AI agent collaboration |

---

## Project Structure

```
chop-shop/
├── .erb/                          # electron-react-boilerplate configs
├── assets/                        # App icons, images
│   ├── icon.icns                 # macOS app icon
│   └── capcut_reference.jpg      # Design reference
├── release/                       # Build output
│   ├── app/                      # Production dependencies
│   └── build/                    # Packaged .dmg files
│
├── src/
│   ├── main/                     # Main Process (Node.js/Electron)
│   │   ├── README.md             # "Main Process - FFmpeg, file I/O, recording"
│   │   ├── main.ts               # Entry point, window creation
│   │   ├── preload.ts            # IPC bridge (secure context)
│   │   ├── menu.ts               # App menu
│   │   │
│   │   ├── ipc/                  # IPC Handlers
│   │   │   ├── README.md         # "IPC handlers - called from renderer"
│   │   │   ├── index.ts          # Register all handlers
│   │   │   ├── ffmpeg.handlers.ts      # Export operations
│   │   │   ├── file.handlers.ts        # Import/file dialogs
│   │   │   └── recording.handlers.ts   # Recording handlers
│   │   │
│   │   ├── services/             # Main process services
│   │   │   ├── README.md         # "Services - business logic"
│   │   │   ├── ffmpeg.service.ts       # FFmpeg execution
│   │   │   ├── file.service.ts         # File operations
│   │   │   ├── recording.service.ts    # Screen/webcam capture
│   │   │   └── thumbnail.service.ts    # Thumbnail generation
│   │   │
│   │   └── utils/
│   │       ├── paths.util.ts     # Path helpers
│   │       └── logger.util.ts    # Logging utility
│   │
│   ├── renderer/                 # Renderer Process (React UI)
│   │   ├── README.md             # "Renderer - React UI"
│   │   ├── index.tsx             # Entry point
│   │   ├── App.tsx               # Root component
│   │   │
│   │   ├── components/           # React components
│   │   │   ├── README.md         # "Components - organized by feature"
│   │   │   │
│   │   │   ├── Layout/           # EPIC 1 - App shell
│   │   │   │   ├── README.md
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── MediaLibrary/     # EPIC 2 - Import
│   │   │   │   ├── README.md
│   │   │   │   ├── MediaLibrary.tsx
│   │   │   │   ├── MediaItem.tsx
│   │   │   │   ├── ImportZone.tsx
│   │   │   │   ├── media.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Timeline/         # EPIC 2, 3, 4 - Timeline
│   │   │   │   ├── README.md
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── TimelineTrack.tsx
│   │   │   │   ├── TimelineClip.tsx
│   │   │   │   ├── Playhead.tsx
│   │   │   │   ├── ZoomControls.tsx
│   │   │   │   ├── timeline.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Preview/          # EPIC 2, 4 - Video preview
│   │   │   │   ├── README.md
│   │   │   │   ├── PreviewPlayer.tsx
│   │   │   │   ├── VideoCanvas.tsx      # Multi-track compositing
│   │   │   │   ├── PlaybackControls.tsx
│   │   │   │   ├── preview.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── EditTools/        # EPIC 3 - Editing
│   │   │   │   ├── README.md
│   │   │   │   ├── TrimTool.tsx
│   │   │   │   ├── SplitTool.tsx
│   │   │   │   ├── DeleteTool.tsx
│   │   │   │   ├── editTools.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Recording/        # EPIC 4 - Recording
│   │   │   │   ├── README.md
│   │   │   │   ├── RecordingModal.tsx
│   │   │   │   ├── SourceSelector.tsx
│   │   │   │   ├── RecordingPreview.tsx
│   │   │   │   ├── recording.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Export/           # EPIC 3 - Export
│   │   │   │   ├── README.md
│   │   │   │   ├── ExportModal.tsx
│   │   │   │   ├── ExportProgress.tsx
│   │   │   │   ├── export.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── shared/           # Shared UI
│   │   │       ├── README.md
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── ErrorDialog.tsx
│   │   │       └── index.ts
│   │   │
│   │   ├── store/                # Zustand stores
│   │   │   ├── README.md         # "Global state management"
│   │   │   ├── timelineStore.ts        # Clips, tracks, timeline state
│   │   │   ├── timelineStore.test.ts
│   │   │   ├── mediaStore.ts           # Imported media library
│   │   │   ├── playbackStore.ts        # Playhead, playback state
│   │   │   ├── recordingStore.ts       # Recording state
│   │   │   ├── uiStore.ts              # Modals, dialogs
│   │   │   └── index.ts
│   │   │
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── README.md
│   │   │   ├── useIPC.ts
│   │   │   ├── useTimeline.ts
│   │   │   ├── usePlayback.ts
│   │   │   ├── useRecording.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                # Shared TypeScript types
│   │   │   ├── README.md
│   │   │   ├── timeline.types.ts
│   │   │   ├── media.types.ts
│   │   │   ├── ipc.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                # Renderer utilities
│   │   │   ├── README.md
│   │   │   ├── timeFormat.util.ts
│   │   │   ├── video.util.ts
│   │   │   ├── cn.util.ts        # Tailwind class merger
│   │   │   └── constants.ts
│   │   │
│   │   └── styles/
│   │       └── globals.css       # Tailwind imports + theme
│   │
│   └── shared/                   # Shared between processes
│       ├── README.md
│       ├── constants.ts          # IPC channels, formats
│       └── types.ts              # Cross-process types
│
├── docs/                         # Documentation
│   ├── README.md
│   ├── PRD.md
│   ├── epics.md
│   ├── architecture.md           # This document
│   └── AI_GUIDE.md               # Quick reference for AI
│
├── package.json
├── tsconfig.json
├── tailwind.config.js            # Tailwind configuration
└── README.md
```

---

## Epic to Architecture Mapping

| Epic | Primary Components | Services | State |
|------|-------------------|----------|-------|
| **Epic 1: Foundation** | `Layout/MainLayout`, `Layout/TopBar`, `Layout/Sidebar` | `ffmpeg.service` (setup) | `uiStore` |
| **Epic 2: Import & Timeline** | `MediaLibrary/*`, `Timeline/*`, `Preview/PreviewPlayer` | `file.service`, `thumbnail.service` | `mediaStore`, `timelineStore`, `playbackStore` |
| **Epic 3: Editing & Export** | `EditTools/*`, `Export/*`, `Timeline/*` (operations) | `ffmpeg.service` (export) | `timelineStore` (mutations) |
| **Epic 4: Recording** | `Recording/*`, `Timeline/*` (multi-track), `Preview/VideoCanvas` | `recording.service` | `recordingStore`, `timelineStore` (multi-track) |

---

## Technology Stack Details

### Core Technologies

**Runtime:**
- Electron (from boilerplate) - Desktop application framework
- Node.js (from boilerplate) - Main process runtime
- React 18 (from boilerplate) - UI framework
- TypeScript 5.x (from boilerplate) - Type safety

**State Management:**
- Zustand 5.0.8 - Global state management
- React hooks - Local component state

**Build & Dev Tools:**
- Webpack (from boilerplate) - Module bundler
- electron-builder (from boilerplate) - Packaging for macOS
- Babel (from boilerplate) - JavaScript transpilation
- ESLint + Prettier (from boilerplate) - Code quality

**Styling:**
- Tailwind CSS 3.x - Utility-first CSS framework
- PostCSS + Autoprefixer - CSS processing

**Testing:**
- Jest (from boilerplate) - Unit testing framework
- React Testing Library (from boilerplate) - Component testing

**Video Processing:**
- ffmpeg-static 5.2.0 - FFmpeg binaries (FFmpeg 6.0)
- Native Electron APIs - Screen/webcam capture
- MediaRecorder API - Recording to WebM
- HTML5 Video API - Playback
- Canvas API - Multi-track compositing

### Integration Points

**Main ↔ Renderer Communication:**
- IPC (Inter-Process Communication) via Electron
- Secure preload script exposes limited API
- Type-safe request/response patterns

**FFmpeg Integration:**
- Executed from main process via Node.js child_process
- Progress monitoring via stdout/stderr parsing
- Command building in ffmpeg.service.ts

**File System:**
- Import: User selects files via native dialog
- Temp storage: `os.tmpdir()/chop-shop/recordings/`
- Export: User selects destination via native dialog

**Media Capture:**
- Screen: `desktopCapturer.getSources()` → `getUserMedia`
- Webcam: `getUserMedia({video: true, audio: true})`
- Recording: MediaRecorder API → WebM files

---

## Implementation Patterns

### NAMING CONVENTIONS (MANDATORY)

**Files:**
```
✅ Components: PascalCase.tsx
   Timeline.tsx, MediaLibrary.tsx, ExportModal.tsx

✅ Services: camelCase.service.ts
   ffmpeg.service.ts, recording.service.ts

✅ Stores: camelCase.ts
   timelineStore.ts, mediaStore.ts

✅ Types: camelCase.types.ts
   timeline.types.ts, media.types.ts

✅ Utils: camelCase.util.ts
   timeFormat.util.ts, video.util.ts

✅ Tests: [FileName].test.tsx or .test.ts
   Timeline.test.tsx, timelineStore.test.ts

✅ Handlers: camelCase.handlers.ts
   ffmpeg.handlers.ts, file.handlers.ts
```

**Code:**
```typescript
// ✅ camelCase for variables, functions
const playheadPosition = 0
function startExport() {}

// ✅ PascalCase for React components
function Timeline() {}

// ✅ SCREAMING_SNAKE_CASE for constants
const MAX_TRACKS = 2
const SUPPORTED_FORMATS = ['mp4', 'mov', 'webm']

// ✅ kebab-case for IPC channels
'start-export', 'import-file', 'update-progress'
```

### COMPONENT STRUCTURE (MANDATORY ORDER)

```tsx
// 1. Imports (grouped)
import React from 'react'                    // React imports
import { useTimelineStore } from '@/store'   // Internal imports
import type { Clip } from '@/types'          // Type imports

// 2. Types/Interfaces (component-specific)
interface TimelineProps {
  onClipSelect?: (clip: Clip) => void
}

// 3. Component definition
export function Timeline({ onClipSelect }: TimelineProps) {
  // 3a. Hooks (grouped by type)
  const clips = useTimelineStore(state => state.clips)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  // 3b. Handlers
  const handleClipClick = (clip: Clip) => {
    setSelectedId(clip.id)
    onClipSelect?.(clip)
  }

  // 3c. Effects
  React.useEffect(() => {
    // effect logic
  }, [clips])

  // 3d. Render
  return (
    <div className="timeline">
      {/* JSX */}
    </div>
  )
}
```

### ZUSTAND STORE STRUCTURE

```typescript
import { create } from 'zustand'

// Types
interface Clip {
  id: string
  sourceFile: string  // Absolute path
  startTime: number
  duration: number
  trimIn: number
  trimOut: number
}

interface TimelineState {
  // State
  clips: Clip[]
  playheadPosition: number

  // Actions
  addClip: (clip: Clip) => void
  removeClip: (id: string) => void
  updatePlayhead: (position: number) => void
}

// Store creation
export const useTimelineStore = create<TimelineState>((set) => ({
  // Initial state
  clips: [],
  playheadPosition: 0,

  // Actions
  addClip: (clip) => set((state) => ({
    clips: [...state.clips, clip]
  })),

  removeClip: (id) => set((state) => ({
    clips: state.clips.filter(c => c.id !== id)
  })),

  updatePlayhead: (position) => set({ playheadPosition: position }),
}))
```

### IPC PATTERNS

**Channel Naming:**
```typescript
// constants.ts
export const IPC_CHANNELS = {
  START_EXPORT: 'start-export',
  EXPORT_PROGRESS: 'export-progress',
  IMPORT_FILE: 'import-file',
  START_RECORDING: 'start-recording',
  STOP_RECORDING: 'stop-recording',
  GET_SOURCES: 'get-sources',
  OPEN_FILE_DIALOG: 'open-file-dialog',
  GENERATE_THUMBNAIL: 'generate-thumbnail',
} as const
```

**Request/Response Format:**
```typescript
// All IPC handlers return this shape
interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}

// Handler example
ipcMain.handle('start-export', async (event, options) => {
  try {
    const result = await ffmpegService.executeExport(options)
    return { success: true, data: result }
  } catch (error) {
    console.error('[Main] Export failed:', error)
    return {
      success: false,
      error: {
        message: 'Export failed. Please try again.',
        code: 'EXPORT_FAILED'
      }
    }
  }
})
```

**Renderer Usage:**
```typescript
// Invoke (request-response)
const response = await window.electron.ipcRenderer.invoke('start-export', options)

// Listen (events from main)
window.electron.ipcRenderer.on('export-progress', (data) => {
  updateProgressStore(data.percent)
})
```

### STYLING PATTERNS (TAILWIND)

**Setup:**
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#06b6d4',
      },
    },
  },
  plugins: [],
}
```

```css
/* src/renderer/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #18181b;
  --bg-secondary: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
}
```

**Component Usage:**
```tsx
import { cn } from '@/utils/cn.util'

export function Timeline() {
  const [isSelected, setIsSelected] = useState(false)

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-700">
        <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
          Split
        </button>
      </div>

      <div className={cn(
        "relative h-16 bg-zinc-800 rounded",
        isSelected && "ring-2 ring-cyan-500"
      )}>
        {/* Clip content */}
      </div>
    </div>
  )
}
```

**cn() Utility:**
```typescript
// src/renderer/utils/cn.util.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### FILE PATH PATTERNS

```typescript
// ✅ ALWAYS use path.join
import path from 'path'
import os from 'os'

const recordingsDir = path.join(os.tmpdir(), 'chop-shop', 'recordings')
const outputPath = path.join(userSelectedDir, 'output.mp4')

// ✅ ALWAYS store absolute paths in state
interface Clip {
  sourceFile: string  // "/Users/andrew/Desktop/video.mp4"
}

// ❌ NEVER use string concatenation or relative paths
const badPath = tmpDir + '/recordings'  // WRONG
const badPath2 = './recordings'  // WRONG
```

### ERROR HANDLING PATTERNS

```typescript
// Pattern: Try-catch + user-friendly messages + console logging

// Main Process
try {
  await operation()
} catch (error) {
  console.error('[Main] Operation failed:', error)
  return {
    success: false,
    error: {
      message: 'User-friendly message',
      code: 'OPERATION_FAILED'
    }
  }
}

// Renderer
try {
  await ipcInvoke('operation')
} catch (error) {
  console.error('[Renderer] Operation failed:', error)
  showErrorDialog('Export failed. Please try again.')
}
```

**Error Codes:**
```typescript
export const ERROR_CODES = {
  EXPORT_FAILED: 'EXPORT_FAILED',
  IMPORT_FAILED: 'IMPORT_FAILED',
  RECORDING_FAILED: 'RECORDING_FAILED',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const
```

**User-Friendly Messages:**
```typescript
// ✅ CORRECT - actionable and clear
'Export failed. Please try again.'
'Unable to import file. Format not supported.'
'Recording failed. Check screen recording permissions in System Preferences.'

// ❌ WRONG - technical errors
'ENOENT: no such file or directory'
'FFmpeg exited with code 1'
```

### LOGGING PATTERNS

```typescript
// ✅ ALWAYS include context prefix
console.log('[Main] Starting export...')
console.error('[Renderer] Failed to load clip:', error)
console.log('[FFmpeg] Progress: 45%')
console.log('[IPC] Received start-export command')

// ✅ Log errors with context
console.error('[Main] Export failed:', {
  error: error.message,
  options,
  timestamp: new Date().toISOString()
})
```

### TIME FORMAT PATTERNS

```typescript
// ✅ ALWAYS store time as seconds (number)
const duration = 125.5  // 2 minutes 5.5 seconds
const playheadPosition = 42.3

// ✅ Display format: MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Usage in components
import { formatTime } from '@/utils/timeFormat.util'

<span>{formatTime(clip.duration)}</span>  // "2:05"
```

### IMPORT PATH PATTERNS

**Configure aliases (tsconfig.json):**
```json
{
  "compilerOptions": {
    "paths": {
      "@/components/*": ["src/renderer/components/*"],
      "@/store/*": ["src/renderer/store/*"],
      "@/hooks/*": ["src/renderer/hooks/*"],
      "@/types/*": ["src/renderer/types/*"],
      "@/utils/*": ["src/renderer/utils/*"],
      "@/main/*": ["src/main/*"],
      "@/shared/*": ["src/shared/*"]
    }
  }
}
```

**Always use aliases:**
```typescript
// ✅ CORRECT
import { Timeline } from '@/components/Timeline'
import { useTimelineStore } from '@/store/timelineStore'
import { formatTime } from '@/utils/timeFormat.util'

// ❌ AVOID
import { Timeline } from '../../../components/Timeline'
```

### EXPORT PATTERNS

**Every folder MUST have index.ts:**
```typescript
// src/renderer/components/Timeline/index.ts
export { Timeline } from './Timeline'
export { TimelineTrack } from './TimelineTrack'
export { TimelineClip } from './TimelineClip'
export { Playhead } from './Playhead'
export type * from './timeline.types'
```

---

## Data Architecture

### Timeline Data Model

```typescript
// Stored in timelineStore.ts

interface Track {
  id: number
  clips: Clip[]
}

interface Clip {
  id: string                // UUID
  sourceFile: string        // Absolute path to video file
  startTime: number         // Position on timeline (seconds)
  duration: number          // Original clip duration (seconds)
  trimIn: number            // Trim start offset (seconds)
  trimOut: number           // Trim end offset (seconds)
  trackId: number           // Which track (1 or 2)
}

interface TimelineState {
  tracks: Track[]           // Max 2 tracks for PiP
  playheadPosition: number  // Current position (seconds)
  totalDuration: number     // Computed from clips
  selectedClipId: string | null

  // Actions
  addClip: (clip: Omit<Clip, 'id'>) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<Clip>) => void
  splitClip: (clipId: string, position: number) => void
  setPlayhead: (position: number) => void
}
```

### Media Library Model

```typescript
// Stored in mediaStore.ts

interface MediaFile {
  id: string                // UUID
  filePath: string          // Absolute path
  fileName: string          // Display name
  duration: number          // Duration in seconds
  resolution: {
    width: number
    height: number
  }
  format: 'mp4' | 'mov' | 'webm'
  fileSize: number          // Bytes
  thumbnail: string | null  // Data URL or path
  importedAt: Date
}

interface MediaState {
  files: MediaFile[]
  isImporting: boolean

  // Actions
  addFile: (file: MediaFile) => void
  removeFile: (fileId: string) => void
  setThumbnail: (fileId: string, thumbnail: string) => void
}
```

### Recording State Model

```typescript
// Stored in recordingStore.ts

type RecordingMode = 'screen' | 'webcam' | 'pip'

interface RecordingState {
  isRecording: boolean
  mode: RecordingMode | null
  selectedScreen: string | null
  selectedWebcam: string | null
  recordingDuration: number     // Seconds elapsed
  outputFiles: string[]         // Paths to recorded files

  // Actions
  startRecording: (mode: RecordingMode) => void
  stopRecording: () => void
  setSelectedScreen: (id: string) => void
  setSelectedWebcam: (id: string) => void
}
```

---

## API Contracts

### IPC Commands (Renderer → Main)

**Export:**
```typescript
// Channel: 'start-export'
interface ExportOptions {
  clips: Clip[]
  resolution: '720p' | '1080p' | 'source'
  outputPath: string
}

Response: IPCResponse<{ outputPath: string }>
```

**Import:**
```typescript
// Channel: 'import-file'
Request: { filePath: string }
Response: IPCResponse<MediaFile>

// Channel: 'open-file-dialog'
Request: void
Response: IPCResponse<{ filePaths: string[] }>
```

**Recording:**
```typescript
// Channel: 'get-sources'
Request: void
Response: IPCResponse<{ screens: Source[], webcams: Source[] }>

// Channel: 'start-recording'
Request: {
  mode: RecordingMode
  screenId?: string
  webcamId?: string
}
Response: IPCResponse<void>

// Channel: 'stop-recording'
Request: void
Response: IPCResponse<{ filePaths: string[] }>
```

**Thumbnails:**
```typescript
// Channel: 'generate-thumbnail'
Request: { filePath: string }
Response: IPCResponse<{ thumbnail: string }> // Data URL
```

### IPC Events (Main → Renderer)

```typescript
// 'export-progress'
{ percent: number, currentFile: string }

// 'export-complete'
{ success: boolean, outputPath: string }

// 'export-error'
{ message: string, code: string }

// 'recording-tick'
{ duration: number }
```

---

## Security Architecture

### IPC Security

**Preload Script (ONLY exposed API):**
```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      // Whitelist channels
      const validChannels = [
        'start-export',
        'import-file',
        'start-recording',
        // ... etc
      ]
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args)
      }
      throw new Error(`Invalid IPC channel: ${channel}`)
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['export-progress', 'export-complete']
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args))
      }
    },
  },
})
```

**Renderer Context:**
- No direct Node.js API access
- No direct file system access
- All operations via IPC bridge
- Sandboxed by default

### Data Validation

```typescript
// Validate all IPC inputs in handlers
ipcMain.handle('start-export', async (event, options) => {
  // Validate
  if (!options.clips || !Array.isArray(options.clips)) {
    return { success: false, error: { message: 'Invalid clips', code: 'INVALID_INPUT' } }
  }

  if (!['720p', '1080p', 'source'].includes(options.resolution)) {
    return { success: false, error: { message: 'Invalid resolution', code: 'INVALID_INPUT' } }
  }

  // Process
  // ...
})
```

---

## Performance Considerations

### Timeline Rendering
- Render only visible clips (virtual scrolling if >50 clips)
- Use CSS transforms for playhead movement (GPU accelerated)
- Debounce zoom operations (300ms)
- Lazy load thumbnails

### Video Preview
- HTML5 video for main track (hardware accelerated)
- Canvas compositing only for multi-track (PiP)
- RequestAnimationFrame for smooth playhead updates
- Maintain 30fps minimum requirement

### FFmpeg Export
- Run in main process to prevent UI blocking
- Stream progress updates every 100ms
- Use FFmpeg's fast presets for 72-hour timeline
- No quality optimization (pragmatic over perfect)

### Memory Management
- Limit thumbnail cache to 100 items
- Clear unused video elements from DOM
- Clean up temp files on app quit
- No memory leaks in 15-minute sessions (NFR002)

---

## Deployment Architecture

### Build Process

```bash
# Development
npm start                    # Hot reload dev mode

# Production build
npm run build               # Webpack production build
npm run package            # Create macOS .dmg

# Output
release/build/chop-shop-1.0.0.dmg
```

### Packaging Configuration

```json
// package.json (already configured by boilerplate)
{
  "build": {
    "productName": "Chop Shop",
    "appId": "com.chopshop.app",
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    }
  }
}
```

### Distribution
- macOS only for 72-hour sprint
- Local distribution (.dmg file)
- No code signing (defer to post-launch)
- No auto-update (defer to post-launch)

---

## Development Environment

### Prerequisites

- Node.js 18+ (LTS)
- npm 9+
- macOS 12+ (Monterey or later)
- 8GB RAM minimum
- 2GB free disk space

### Setup Commands

```bash
# 1. Clone repository (already done)
# git clone <repo-url> chop-shop

# 2. Install dependencies
cd chop-shop
npm install

# 3. Install Tailwind (Story 1.3)
npm install -D tailwindcss postcss autoprefixer clsx tailwind-merge
npx tailwindcss init -p

# 4. Start development
npm start

# 5. Run tests
npm test

# 6. Package for distribution
npm run package
```

### Development Scripts

```json
{
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "format": "prettier --write ."
  }
}
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Zustand for State Management
**Decision:** Use Zustand 5.0.8 for global state management
**Context:** Need simple, fast state management for 72-hour timeline
**Rationale:** Minimal boilerplate, excellent TypeScript support, no Redux complexity
**Alternatives Considered:** Redux (too much boilerplate), Context API (performance concerns)

### ADR-002: FFmpeg in Main Process
**Decision:** Execute FFmpeg operations in Electron main process
**Context:** Need video export and processing capabilities
**Rationale:** Security best practice, prevents UI blocking, access to Node.js APIs
**Alternatives Considered:** Renderer process (security risk), Web Workers (no FFmpeg access)

### ADR-003: Tailwind CSS for Styling
**Decision:** Use Tailwind CSS instead of separate CSS files
**Context:** Need fast styling approach for 72-hour sprint
**Rationale:** Co-located styles, fewer files, faster development, excellent for AI agents
**Alternatives Considered:** CSS Modules (more files), Styled Components (runtime cost)

### ADR-004: HTML5 Video + Canvas for Preview
**Decision:** Use HTML5 video for single track, Canvas for multi-track compositing
**Context:** Need 30fps video preview with multi-track support
**Rationale:** Native performance, hardware accelerated, meets NFR requirements
**Alternatives Considered:** Full canvas rendering (complex), WebGL (overkill)

### ADR-005: OS Temp Directory for Recordings
**Decision:** Store recordings in `os.tmpdir()/chop-shop/recordings/`
**Context:** Need temporary storage for screen/webcam recordings
**Rationale:** Standard OS location, automatic cleanup, no user config needed
**Alternatives Considered:** User documents folder (clutters), app directory (permissions)

### ADR-006: Jest for Testing
**Decision:** Use Jest (from boilerplate) for unit testing
**Context:** Need testing framework for 72-hour sprint
**Rationale:** Pre-configured, excellent TypeScript support, fast
**Alternatives Considered:** Vitest (not in boilerplate), Mocha (less features)

### ADR-007: No Undo System for MVP
**Decision:** Defer undo/redo to post-launch
**Context:** 72-hour timeline with hard deadline
**Rationale:** Explicitly out of scope in PRD, adds significant complexity
**Alternatives Considered:** Command pattern (too complex for timeline)

### ADR-008: Manual Testing for Media Operations
**Decision:** Manual testing for recording, playback, export
**Context:** Automated testing of media operations is complex
**Rationale:** Pragmatic for 72-hour sprint, automated tests can be added later
**Alternatives Considered:** E2E tests (too slow), Mock media (not realistic)

### ADR-009: WebM Recording with FFmpeg Conversion
**Decision:** Record in WebM, convert to MP4 for timeline
**Context:** MediaRecorder API outputs WebM natively
**Rationale:** Native browser API, FFmpeg handles conversion seamlessly
**Alternatives Considered:** Direct MP4 recording (not supported by MediaRecorder)

### ADR-010: Two-Track Limit for MVP
**Decision:** Maximum 2 timeline tracks (main + overlay)
**Context:** PiP requirement from PRD
**Rationale:** Meets all PRD requirements, simpler than unlimited tracks
**Alternatives Considered:** Unlimited tracks (unnecessary complexity for sprint)

---

## Constraints & Assumptions

### Technical Constraints
- macOS only (no Windows/Linux for 72-hour sprint)
- Max 1080p export (no 4K per PRD out-of-scope)
- MP4, MOV, WebM formats only
- 2 timeline tracks maximum
- No undo/redo (out of scope)
- No cloud features (out of scope)

### Timeline Constraints
- 72-hour development window (Oct 27-29, 2025)
- MVP checkpoint: Tuesday Oct 28, 10:59 PM CT (Epic 3 complete)
- Final deadline: Wednesday Oct 29, 10:59 PM CT (Epic 4 complete)

### Performance Requirements
- Timeline UI: 30+ fps with 10+ clips (NFR001)
- No crashes during core workflow (NFR002)
- Preview playback: 30fps minimum (NFR003)
- App launch: < 5 seconds (FR001)

### Assumptions
- Developer has macOS development environment
- FFmpeg operations complete without crashes
- Screen recording permissions granted by user
- Sufficient disk space for temp recordings
- No network connectivity required

---

## AI Agent Guidelines

### Quick Reference for Implementation

**Where to implement features:**
- Export functionality → `src/main/services/ffmpeg.service.ts` + `src/renderer/components/Export/`
- Import functionality → `src/main/services/file.service.ts` + `src/renderer/components/MediaLibrary/`
- Timeline operations → `src/renderer/components/Timeline/` + `src/renderer/store/timelineStore.ts`
- Recording → `src/main/services/recording.service.ts` + `src/renderer/components/Recording/`

**Mandatory patterns:**
- ✅ Use Zustand for state management
- ✅ Use Tailwind for styling (no separate CSS files)
- ✅ Use path.join for all file paths
- ✅ Use formatTime() for all time displays
- ✅ Use IPC for main ↔ renderer communication
- ✅ Log with context prefixes: [Main], [Renderer], [FFmpeg]
- ✅ Return IPCResponse format from all handlers
- ✅ Use kebab-case for IPC channel names
- ✅ Store time as seconds (number)
- ✅ Store file paths as absolute paths

**File naming:**
- Components: `Timeline.tsx`
- Services: `ffmpeg.service.ts`
- Stores: `timelineStore.ts`
- Types: `timeline.types.ts`
- Utils: `timeFormat.util.ts`
- Tests: `Timeline.test.tsx`

**Import aliases:**
```typescript
import { Timeline } from '@/components/Timeline'
import { useTimelineStore } from '@/store/timelineStore'
import { formatTime } from '@/utils/timeFormat.util'
```

---

_Generated by BMAD Decision Architecture Workflow v1.3.2_
_Date: 2025-10-27_
_For: andrew_
_Project: Chop Shop (Level 2)_
