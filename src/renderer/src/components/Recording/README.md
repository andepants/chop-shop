# Recording Components

Recording mode selection UI components for Chop Shop video editor.

## Components

### RecordingModeModal

Modal dialog for selecting recording mode before starting a recording session.

**Features:**
- 3 recording mode options:
  - **Screen Only**: Record screen activity
  - **Webcam Only**: Record from camera
  - **Screen + Webcam (PiP)**: Record screen with camera overlay (recommended/highlighted)
- Dark theme styling consistent with app design
- Cancel functionality with ESC key support
- Error handling for recording start failures

**Usage:**

```tsx
import { RecordingModeModal } from './components/Recording/RecordingModeModal'

function App() {
  return (
    <>
      <RecordingModeModal />
    </>
  )
}
```

The modal state is managed by `useUIStore`:

```tsx
import { useUIStore } from './store/uiStore'

// Open modal
const openRecordingModal = useUIStore((state) => state.openRecordingModal)
openRecordingModal()

// Close modal
const closeRecordingModal = useUIStore((state) => state.closeRecordingModal)
closeRecordingModal()
```

**Flow:**

1. User clicks "Record" button in sidebar
2. Modal opens with 3 mode options
3. User selects a mode (or cancels)
4. If mode selected:
   - IPC call to `recording:start` with mode parameter
   - Recording store updated with `isRecording: true` and selected mode
   - Modal closes
5. If cancel clicked or ESC pressed:
   - Modal closes without starting recording

## State Management

### recordingStore

Zustand store for managing recording session state.

**State:**

```typescript
interface RecordingState {
  isRecording: boolean          // Whether recording is active
  mode: RecordingMode | null    // Selected recording mode ('screen' | 'webcam' | 'pip')
  duration: number               // Current recording duration in seconds
  outputFiles: {                 // Output file paths after recording stops
    screen?: string
    webcam?: string
  }
}
```

**Actions:**

```typescript
// Start recording with selected mode
await startRecording('pip')

// Stop recording and receive output files
await stopRecording()

// Update duration (called periodically during recording)
updateDuration(30.5)

// Reset store to initial state
reset()
```

**Usage:**

```tsx
import { useRecordingStore } from './store/recordingStore'

function RecordingControls() {
  const isRecording = useRecordingStore((state) => state.isRecording)
  const mode = useRecordingStore((state) => state.mode)
  const duration = useRecordingStore((state) => state.duration)
  const stopRecording = useRecordingStore((state) => state.stopRecording)

  if (!isRecording) return null

  return (
    <div>
      <span>Recording {mode} - {duration}s</span>
      <button onClick={stopRecording}>Stop</button>
    </div>
  )
}
```

## IPC Communication

### recording:start

Starts recording with selected mode.

**Channel:** `recording:start`

**Request:**

```typescript
{
  mode: 'screen' | 'webcam' | 'pip'
}
```

**Response:**

```typescript
IPCResponse<{ success: boolean }>
```

**Usage:**

```typescript
const response = await window.api.startRecording({ mode: 'pip' })
if (response.success) {
  console.log('Recording started')
}
```

### recording:stop

Stops recording and returns output file paths.

**Channel:** `recording:stop`

**Request:** None

**Response:**

```typescript
IPCResponse<{
  outputFiles: {
    screen?: string
    webcam?: string
  }
}>
```

**Usage:**

```typescript
const response = await window.api.stopRecording()
if (response.success) {
  console.log('Recording stopped, files:', response.data.outputFiles)
}
```

## Testing

Component tests use Vitest and React Testing Library:

```bash
npm run test:unit
```

**Test Files:**
- `RecordingModeModal.test.tsx` - Modal component tests
- `recordingStore.test.ts` - Store state management tests

**Coverage:**
- Modal rendering and mode button display
- PiP mode highlighted as recommended
- IPC calls with correct mode parameters
- Error handling for recording failures
- Cancel functionality
- Store state updates for start/stop/duration

## Integration with Main Process

Recording handlers are registered in `src/main/ipc/recording.handlers.ts`:

```typescript
ipcMain.handle('recording:start', async (_, { mode }) => {
  // TODO Story 5.1: Implement actual recording service
  return { success: true, data: { success: true } }
})

ipcMain.handle('recording:stop', async () => {
  // TODO Story 5.1: Implement actual recording service
  return { success: true, data: { outputFiles: {} } }
})
```

Currently stubs that return success responses. Actual recording implementation will be added in Story 5.1.

## Architecture Alignment

**File Structure:**
```
src/
├── renderer/
│   └── src/
│       ├── components/
│       │   └── Recording/
│       │       ├── RecordingModeModal.tsx
│       │       ├── RecordingModeModal.test.tsx
│       │       └── README.md
│       └── store/
│           ├── recordingStore.ts
│           └── recordingStore.test.ts
├── main/
│   └── ipc/
│       └── recording.handlers.ts
└── shared/
    └── types.ts (RecordingMode, RecordingOutputFiles)
```

**Design Consistency:**
- Radix UI Dialog components for modal
- Tailwind dark theme colors
- Lucide React icons
- Matches existing ExportModal pattern
- Follows CapCut-inspired design language

## Future Stories

- **Story 5.1**: Recording service setup (actual capture logic)
- **Story 5.3**: Screen-only recording implementation
- **Story 5.4**: Webcam-only recording implementation
- **Story 5.5**: Picture-in-picture recording implementation
- **Story 5.6**: Recording timer and controls UI
- **Story 5.7**: Auto-import and timeline placement
