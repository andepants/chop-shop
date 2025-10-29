# Story 6.3: Audio Extraction & Transcription Service (Whisper API)

Status: ready-for-dev

## Story

As a content creator,
I want to automatically extract and transcribe audio from my timeline,
so that I can use it as context for social media post generation.

## Acceptance Criteria

1. Main process service extracts audio from all timeline clips (concatenated)
2. Extracted audio converted to format compatible with Whisper API (MP3/WAV)
3. Service validates timeline has audio/video clips before extraction
4. Whisper API integration transcribes audio using `whisper-1` model
5. Progress indicator shows transcription status (percentage if possible)
6. Transcription result returned to renderer process via IPC
7. Error handling for API failures with user-friendly messages
8. Service properly handles large audio files (up to 25MB Whisper limit)

## Tasks / Subtasks

- [ ] Task 1: Create audio extraction service (AC: 1, 2, 3)
  - [ ] Create `audio-extractor.service.ts` in `src/main/services/ai/`
  - [ ] Implement `extractAudioFromTimeline()` method
  - [ ] Read clips from timeline data (IPC or shared state)
  - [ ] Validate timeline has at least one clip with audio
  - [ ] Use FFmpeg to extract audio from each clip
  - [ ] Concatenate extracted audio tracks into single file
  - [ ] Convert to MP3 or WAV format (Whisper compatible)
  - [ ] Save temporary audio file to `os.tmpdir()/chop-shop/ai-audio/`

- [ ] Task 2: Implement Whisper API integration service (AC: 4, 8)
  - [ ] Create `whisper.service.ts` in `src/main/services/ai/`
  - [ ] Install and import `openai` package
  - [ ] Implement `transcribeAudio(audioFilePath, apiKey)` method
  - [ ] Use OpenAI SDK to call Whisper API (`openai.audio.transcriptions.create()`)
  - [ ] Set model to "whisper-1"
  - [ ] Handle file size validation (max 25MB)
  - [ ] Implement file chunking/compression if over 25MB
  - [ ] Return transcription text result

- [ ] Task 3: Add IPC handler for transcription (AC: 6)
  - [ ] Update `ai.handlers.ts` to add `ai-transcribe-audio` handler
  - [ ] Handler orchestrates: extract audio → transcribe → return result
  - [ ] Retrieve API key from API key manager service
  - [ ] Call audio extractor service
  - [ ] Call Whisper service with extracted audio
  - [ ] Return transcription text and metadata (duration) to renderer
  - [ ] Clean up temporary audio files after transcription

- [ ] Task 4: Implement progress tracking and IPC events (AC: 5)
  - [ ] Add IPC event sender: `ai-transcription-progress`
  - [ ] Emit progress during audio extraction: "Extracting audio..." (0-50%)
  - [ ] Emit progress during Whisper API call: "Transcribing..." (50-100%)
  - [ ] Send final progress: 100% when complete
  - [ ] Include descriptive message with each progress update

- [ ] Task 5: Add comprehensive error handling (AC: 7, 8)
  - [ ] Handle timeline validation errors (no clips, no audio tracks)
  - [ ] Handle FFmpeg extraction failures (codec issues, corrupted files)
  - [ ] Handle file size errors (audio > 25MB after compression)
  - [ ] Handle Whisper API errors (auth failures, rate limits, network issues)
  - [ ] Handle OpenAI API quota/rate limit errors
  - [ ] Return user-friendly error messages via IPC response
  - [ ] Log all errors with context for debugging

- [ ] Task 6: Implement file size management (AC: 8)
  - [ ] Check audio file size before Whisper API call
  - [ ] If > 25MB, apply audio compression (lower bitrate)
  - [ ] If still > 25MB after compression, split into chunks
  - [ ] Process chunks sequentially with Whisper API
  - [ ] Concatenate transcription results from chunks
  - [ ] Warn user if compression/splitting may reduce quality

- [ ] Task 7: Add temporary file cleanup (Best practice)
  - [ ] Delete temporary audio files after successful transcription
  - [ ] Delete temporary files on error (cleanup in finally block)
  - [ ] Implement timeout-based cleanup for orphaned files
  - [ ] Create and clean temp directory structure

- [ ] Task 8: Update aiStore for transcription state (AC: 6)
  - [ ] Add state in `aiStore.ts`: `currentTranscription`, `transcriptionStatus`
  - [ ] Add action: `setTranscription(text, duration)`
  - [ ] Add action: `setTranscriptionStatus(status)` (idle, extracting, transcribing, complete, error)
  - [ ] Store transcription result when IPC returns

- [ ] Task 9: Write unit tests for audio extraction service (Testing)
  - [ ] Test `extractAudioFromTimeline()` with mock timeline clips
  - [ ] Test FFmpeg command generation
  - [ ] Test concatenation logic for multiple clips
  - [ ] Test audio format conversion
  - [ ] Test error handling for missing clips

- [ ] Task 10: Write unit tests for Whisper service (Testing)
  - [ ] Test `transcribeAudio()` with mocked OpenAI SDK
  - [ ] Test file size validation
  - [ ] Test error handling for API failures
  - [ ] Test chunking logic for large files

- [ ] Task 11: Write integration tests for transcription flow (Testing)
  - [ ] Test complete flow: timeline → extract → transcribe → return
  - [ ] Test IPC handler with mocked services
  - [ ] Test progress event emission
  - [ ] Test error propagation to renderer

## Dev Notes

### Architecture Patterns

- **Process Separation**: Audio extraction and Whisper API calls execute entirely in main process for security and performance
- **IPC Communication**: Use `ai-transcribe-audio` channel with typed request/response, emit `ai-transcription-progress` events for updates
- **FFmpeg Integration**: Reuse existing FFmpeg setup from Epic 1, Story 1.4 (`ffmpeg-static` package)
- **OpenAI SDK**: Use official `openai` npm package for Whisper API integration
- **Error Handling**: Main process catches and returns user-friendly error messages via IPC

### Services to Create

**Main Process:**
- `src/main/services/ai/audio-extractor.service.ts` - Extract and concatenate audio from timeline clips
- `src/main/services/ai/whisper.service.ts` - Whisper API integration for transcription

**Updates:**
- `src/main/ipc/ai.handlers.ts` - Add `ai-transcribe-audio` IPC handler
- `src/renderer/src/store/aiStore.ts` - Add transcription state management

### FFmpeg Commands

**Audio Extraction (per clip):**
```bash
ffmpeg -i <clip-video-path> -vn -acodec libmp3lame -ar 44100 -ab 128k <output-audio.mp3>
```

**Concatenation (multiple clips):**
```bash
ffmpeg -i "concat:audio1.mp3|audio2.mp3|audio3.mp3" -acodec copy <final-audio.mp3>
```

### Whisper API Integration

**OpenAI SDK Usage:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: apiKey });

const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream(audioFilePath),
  model: 'whisper-1',
  language: 'en' // Optional, auto-detect if omitted
});

return transcription.text;
```

### Temporary File Storage

- **Location**: `${os.tmpdir()}/chop-shop/ai-audio/`
- **Naming**: `transcription-<timestamp>-<random>.mp3`
- **Cleanup**: Delete after transcription completes or fails

### File Size Limits

- **Whisper API Limit**: 25MB maximum
- **Compression Strategy**: Reduce bitrate to 64kbps if over 25MB
- **Chunking Strategy**: Split audio into 10-minute segments if compression insufficient
- **User Warning**: Display message if quality degradation expected

### Testing Standards

- Unit tests for audio-extractor and whisper services with mocked dependencies
- Integration tests for IPC flow with mocked OpenAI API
- Manual testing with real timeline clips and OpenAI API (use test API key)
- Test edge cases: empty timeline, very large audio files, API failures

### Project Structure Notes

- Follows Epic 6 tech spec structure: AI services under `src/main/services/ai/`
- Reuses FFmpeg integration from Epic 1 (already bundled with app)
- Uses established IPC patterns from existing handlers
- Aligns with OpenAI SDK best practices (official package, streaming support)

### Dependencies

- **openai** package (v4.78.0+) - Already required by Story 6.1
- **ffmpeg-static** (v5.2.0+) - Already installed in Epic 1, Story 1.4
- No new dependencies required

### Error Messages (User-Friendly)

- "No clips found on timeline. Please add video clips before transcribing."
- "Audio extraction failed. Please check your video files."
- "Audio file too large (> 25MB). Please use shorter clips or split your timeline."
- "Transcription failed: Invalid API key. Please check your AI Settings."
- "Transcription failed: API quota exceeded. Please try again later."
- "Network error during transcription. Please check your internet connection."

### References

- [Source: docs/tech-spec-epic-6.md#Services and Modules] - Audio extractor and Whisper service specifications
- [Source: docs/tech-spec-epic-6.md#APIs and Interfaces] - IPC handler contracts, Whisper API integration
- [Source: docs/tech-spec-epic-6.md#Workflows and Sequencing] - Workflow 2: Audio Transcription flow
- [Source: docs/tech-spec-epic-6.md#Non-Functional Requirements] - Performance and reliability requirements
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.3 AC section
- [Source: docs/epics.md#Story 6.3] - User story and prerequisites

## Dev Agent Record

### Context Reference

- docs/stories/6-3-audio-extraction-transcription-service-whisper-api.context.xml

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
