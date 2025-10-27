# Services Layer

Business logic and external service integrations for the main process.

## Structure

Services encapsulate complex operations and external API interactions:

- **ffmpeg.service.ts** - FFmpeg video processing operations
- Future services: file management, encoding profiles, etc.

## Usage

```typescript
import { getFfmpegPath, testExport } from './services/ffmpeg.service'

// Get FFmpeg binary path
const ffmpegPath = getFfmpegPath()

// Run test export
await testExport(inputPath, outputPath)
```

## Patterns

- Services are pure functions or classes with no state
- All services return Promises for async operations
- Errors are thrown and handled by callers
- Logging follows [ServiceName] prefix convention
