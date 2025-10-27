# IPC Handlers

Inter-Process Communication (IPC) handlers for main<->renderer communication.

## Structure

IPC handlers expose main process functionality to the renderer:

- **ffmpeg.handlers.ts** - FFmpeg operation handlers
- **index.ts** - Handler registration
- Future handlers: file, settings, etc.

## Usage

```typescript
// In main.ts
import { registerIPCHandlers } from './ipc'
registerIPCHandlers()

// In renderer
const result = await window.api.testExport(inputPath, outputPath)
```

## Patterns

- All handlers use IPCResponse format
- Handlers catch errors and return structured error responses
- Use ipcMain.handle() for request/response pattern
- Logging follows [Main] prefix convention
