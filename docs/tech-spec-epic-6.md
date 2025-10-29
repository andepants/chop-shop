# Epic Technical Specification: AI-Powered Social Media Content Generator

Date: 2025-10-29
Author: andrew
Epic ID: 6
Status: Draft

---

## Overview

Epic 6 introduces AI-powered social media content generation capabilities to Chop Shop, transforming the application from a video editing tool into a complete content creation platform. This epic enables users to automatically transcribe audio from their edited timeline using OpenAI's Whisper API, and then generate platform-optimized social media posts (YouTube descriptions, Twitter posts, LinkedIn posts) using GPT-4o-mini with streaming responses. The system supports voice persona selection for style customization, real-time streaming content generation, and comprehensive caching for transcriptions and generated posts. This feature completes the end-to-end workflow: record → edit → export → distribute.

The implementation leverages Electron's secure storage for API key management, maintains separation between main and renderer processes for security, and uses shadcn/ui components for a consistent, professional UI. All AI operations occur in the main process with streaming results delivered to the renderer via IPC, ensuring the UI remains responsive during potentially long-running API calls.

## Objectives and Scope

**In Scope:**
- Secure OpenAI API key storage using Electron safeStorage (per-project encryption)
- Dedicated AI Generator page with tab navigation (History, Transcribe, Generate, Results)
- Audio extraction from timeline clips (concatenated, converted to Whisper-compatible format)
- Whisper API integration for audio-to-text transcription with progress indicators
- Editable transcription UI with optional user guidance input
- Multi-select voice persona system (12+ personas with style blending)
- GPT-4o-mini API integration with streaming responses for parallel platform generation
- Platform-specific system prompts (YouTube, Twitter, LinkedIn) with emoji toggle
- Real-time streaming results display with character counts and platform limit warnings
- Individual copy-to-clipboard buttons per platform with feedback
- Transcription and post history with persistent caching (JSON storage)
- Comprehensive error handling and validation for API failures, rate limits, network issues

**Out of Scope (Deferred):**
- Backend proxy server for API key management (using local-first approach for development)
- Usage analytics and cost monitoring
- Multiple API provider support (only OpenAI for MVP)
- Batch processing of multiple videos
- Scheduled/automated post generation
- Direct publishing to social media platforms
- Template-based post customization
- A/B testing variants of generated content

## System Architecture Alignment

Epic 6 aligns with Chop Shop's existing Electron + React + TypeScript architecture and follows established patterns:

**Process Separation:** AI services (Whisper, GPT-4o-mini API calls) execute in the main process (`src/main/services/ai/`) to maintain security and prevent UI blocking, while the renderer process (`src/renderer/components/AI/`) handles all user interface and state management via Zustand.

**IPC Communication:** Uses existing IPC patterns with typed request/response formats for secure main ↔ renderer communication. New IPC channels: `ai-test-connection`, `ai-transcribe-audio`, `ai-generate-posts`, `ai-stream-chunk`.

**State Management:** Integrates with Zustand for global state via new `aiStore.ts` (API key status, transcriptions, generated posts, cache management) and `uiStore.ts` (AI Generator page visibility, active tab state).

**Storage:** Leverages Electron's `safeStorage` API for encrypted API key persistence and `app.getPath('userData')` for caching transcriptions/posts in JSON format, following existing file management patterns.

**Component Structure:** Follows established component organization with `src/renderer/components/AI/` containing all AI-related UI components, using shadcn/ui components (already integrated in Epic 2, Story 2.6) for consistent styling.

**Dependencies:** Adds `openai` npm package (official OpenAI Node.js SDK) for API integration. No conflicts with existing dependencies (ffmpeg-static, Video.js, Zustand).

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|---------|---------|-------|
| `api-key-manager.service.ts` | Secure API key storage/retrieval using Electron safeStorage | API key (string) | Encrypted key stored in userData, decrypted key on retrieval | Main Process |
| `whisper.service.ts` | Audio transcription via OpenAI Whisper API | Audio file path, API key | Transcription text, progress events | Main Process |
| `content-generator.service.ts` | Social media post generation via GPT-4o-mini with streaming | Transcription, user guidance, personas, platforms, emoji setting, API key | Streaming post content per platform | Main Process |
| `audio-extractor.service.ts` | Extract and concatenate audio from timeline clips | Timeline clips array, output path | MP3/WAV audio file path | Main Process |
| `AISettings.tsx` | API key management UI | User input (API key) | Test connection result, save confirmation | Renderer |
| `AIGeneratorPage.tsx` | Main AI Generator page container | None | Tab navigation state | Renderer |
| `TranscriptionPanel.tsx` | Transcription UI with editing | Timeline clips, API key | Transcription text, user guidance | Renderer |
| `GenerationPanel.tsx` | Post generation controls | Platform selection, personas, emoji toggle | Generation trigger | Renderer |
| `ResultsPanel.tsx` | Streaming results display | Stream chunks from IPC | Rendered posts with copy buttons | Renderer |
| `HistoryPanel.tsx` | Cached transcriptions/posts browser | Cache entries | Selected history item | Renderer |
| `aiStore.ts` | AI state management (Zustand) | User actions | Global AI state (key status, transcriptions, posts, cache) | Renderer |

### Data Models and Contracts

**API Key Storage:**
```typescript
// Stored in Electron's userData directory as encrypted string
interface APIKeyStorage {
  encrypted: string; // Base64-encoded encrypted key
  timestamp: string; // ISO 8601 timestamp of last update
}
```

**Transcription:**
```typescript
interface Transcription {
  id: string; // UUID
  text: string; // Full transcription text
  audioSourceClips: string[]; // Array of clip IDs used
  createdAt: string; // ISO 8601 timestamp
  duration: number; // Audio duration in seconds
}
```

**Generated Post:**
```typescript
interface GeneratedPost {
  id: string; // UUID
  platform: 'youtube' | 'twitter' | 'linkedin';
  content: string; // Generated post text
  characterCount: number;
  exceedsLimit: boolean;
  generatedAt: string; // ISO 8601 timestamp
}
```

**Generation Request:**
```typescript
interface GenerationRequest {
  transcription?: string; // Optional transcription text
  userGuidance?: string; // Optional additional context
  personas: string[]; // Array of selected persona names
  platforms: ('youtube' | 'twitter' | 'linkedin')[]; // Selected platforms
  includeEmojis: boolean;
}
```

**Cache Entry:**
```typescript
interface CacheEntry {
  id: string; // UUID
  transcription: Transcription;
  generatedPosts: GeneratedPost[];
  request: GenerationRequest;
  createdAt: string; // ISO 8601 timestamp
}
```

**Voice Personas:**
```typescript
const VOICE_PERSONAS = [
  // Business/Tech
  { id: 'naval', name: 'Naval Ravikant', category: 'business' },
  { id: 'elon', name: 'Elon Musk', category: 'business' },
  { id: 'garyvee', name: 'Gary Vaynerchuk', category: 'business' },
  { id: 'tim', name: 'Tim Ferriss', category: 'business' },

  // Creative/Humor
  { id: 'scott', name: 'Scott Adams', category: 'creative' },
  { id: 'seth', name: 'Seth Godin', category: 'creative' },
  { id: 'casey', name: 'Casey Neistat', category: 'creative' },
  { id: 'mkbhd', name: 'MKBHD', category: 'creative' },

  // Professional
  { id: 'simon', name: 'Simon Sinek', category: 'professional' },
  { id: 'brene', name: 'Brené Brown', category: 'professional' },
  { id: 'adam', name: 'Adam Grant', category: 'professional' },
  { id: 'malcolm', name: 'Malcolm Gladwell', category: 'professional' }
] as const;
```

### APIs and Interfaces

**IPC Handlers (Main Process):**

```typescript
// ai-test-connection
ipcMain.handle('ai-test-connection', async (event, apiKey: string) => {
  return IPCResponse<{ valid: boolean; message: string }>;
});

// ai-store-key
ipcMain.handle('ai-store-key', async (event, apiKey: string) => {
  return IPCResponse<void>;
});

// ai-get-key
ipcMain.handle('ai-get-key', async (event) => {
  return IPCResponse<{ key: string | null }>;
});

// ai-clear-key
ipcMain.handle('ai-clear-key', async (event) => {
  return IPCResponse<void>;
});

// ai-transcribe-audio
ipcMain.handle('ai-transcribe-audio', async (event) => {
  // Extracts audio from timeline clips, calls Whisper API
  return IPCResponse<{ transcription: string; duration: number }>;
});

// ai-generate-posts
ipcMain.handle('ai-generate-posts', async (event, request: GenerationRequest) => {
  // Triggers streaming generation, sends chunks via 'ai-stream-chunk' events
  return IPCResponse<void>;
});

// IPC Events (Main → Renderer):

// ai-stream-chunk
interface StreamChunk {
  platform: 'youtube' | 'twitter' | 'linkedin';
  content: string; // Incremental content chunk
  complete: boolean; // True when stream finished
}

// ai-transcription-progress
interface TranscriptionProgress {
  percent: number; // 0-100
  message: string; // e.g., "Extracting audio...", "Transcribing..."
}
```

**OpenAI API Integration:**

```typescript
// Whisper API (audio transcription)
POST https://api.openai.com/v1/audio/transcriptions
Headers:
  Authorization: Bearer ${API_KEY}
  Content-Type: multipart/form-data
Body:
  file: audio.mp3 (max 25MB)
  model: "whisper-1"
  language: "en" (optional)
Response: { text: string }

// GPT-4o-mini API (streaming chat completion)
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer ${API_KEY}
  Content-Type: application/json
Body:
  model: "gpt-4o-mini"
  messages: [
    { role: "system", content: "<platform-specific system prompt>" },
    { role: "user", content: "<transcription + guidance>" }
  ]
  stream: true
Response: Server-Sent Events (SSE) stream of chunks
```

**System Prompts (Examples):**

```typescript
// YouTube System Prompt
const youtubeSystemPrompt = `You are an expert YouTube content strategist. Generate an SEO-optimized video description that:
- Starts with a compelling hook (first 2-3 lines)
- Includes relevant keywords naturally
- Provides value and context
- Uses clear section headers
- ${includeEmojis ? 'Can include emojis' : 'Does NOT include emojis'}
${personasPrompt}

Keep descriptions informative and engaging, optimized for YouTube search.`;

// Twitter System Prompt
const twitterSystemPrompt = `You are an expert Twitter content strategist. Generate an engaging tweet that:
- MAXIMUM 280 characters (strict limit)
- Starts with a strong hook
- Includes 1-3 relevant hashtags
- ${includeEmojis ? 'Can include emojis' : 'Does NOT include emojis'}
${personasPrompt}

Be concise, engaging, and optimized for Twitter engagement.`;

// LinkedIn System Prompt
const linkedinSystemPrompt = `You are an expert LinkedIn content strategist. Generate a professional post that:
- 1-3 paragraphs maximum
- Professional and value-focused tone
- Provides insights or takeaways
- Engages professional audience
- ${includeEmojis ? 'Can include emojis sparingly' : 'Does NOT include emojis'}
${personasPrompt}

Keep it professional, insightful, and optimized for LinkedIn engagement.`;
```

### Workflows and Sequencing

**Workflow 1: API Key Setup**
1. User opens AI Settings (from app settings or AI Generator page)
2. User inputs OpenAI API key (password-masked input)
3. User clicks "Test Connection"
4. Renderer → IPC `ai-test-connection` → Main
5. Main process calls OpenAI API (minimal test request)
6. Main → Renderer: Success/failure message
7. If successful, user clicks "Save"
8. Renderer → IPC `ai-store-key` → Main
9. Main encrypts key with safeStorage, stores in userData
10. Confirmation shown to user

**Workflow 2: Audio Transcription**
1. User clicks "AI Generator" button in sidebar
2. AI Generator page opens with tab navigation
3. User navigates to "Transcribe" tab
4. User clicks "Transcribe Audio" button
5. Renderer validates timeline has clips
6. Renderer → IPC `ai-transcribe-audio` → Main
7. Main extracts audio from all timeline clips (concatenated)
8. Main converts audio to MP3/WAV format
9. Main sends progress events: "Extracting audio..."
10. Main uploads audio to Whisper API
11. Main sends progress events: "Transcribing..."
12. Whisper API returns transcription text
13. Main → Renderer: Transcription result
14. Renderer displays transcription in editable textarea
15. Transcription auto-cached in aiStore

**Workflow 3: Post Generation (Streaming)**
1. User edits transcription (optional)
2. User enters additional guidance (optional)
3. User selects voice personas (multi-select)
4. User navigates to "Generate" tab
5. User selects platforms (YouTube, Twitter, LinkedIn checkboxes)
6. User toggles "Include Emojis" (default off)
7. User clicks "Generate Posts"
8. Renderer validates at least one input (transcription OR guidance)
9. Renderer → IPC `ai-generate-posts` with GenerationRequest → Main
10. Main validates API key exists
11. Main builds platform-specific system prompts (with persona blending)
12. **Parallel Execution:** Main spawns 3 concurrent streams (one per selected platform)
13. For each platform:
    - Main calls GPT-4o-mini API with streaming enabled
    - As chunks arrive, Main → Renderer: `ai-stream-chunk` events
    - Renderer appends chunks to respective platform display in real-time
14. Results tab auto-activates when first chunk arrives
15. Character counts update in real-time
16. When all streams complete, posts cached to userData
17. User can copy individual posts with "Copy" buttons

**Workflow 4: History & Caching**
1. User navigates to "History" tab
2. Renderer loads cached entries from aiStore (reads from userData JSON)
3. History displays chronological list with timestamps
4. User clicks history entry
5. Renderer loads transcription into Transcribe tab
6. Renderer loads generated posts into Results tab
7. User can regenerate or copy from history
8. User clicks "Clear Cache" → Confirmation dialog → Cache cleared

## Non-Functional Requirements

### Performance

- **API Response Time:** Whisper API transcription completes within 30 seconds for up to 10 minutes of audio (typical use case)
- **Streaming Latency:** First chunk of generated post content appears within 2-3 seconds of API call initiation
- **UI Responsiveness:** AI Generator page maintains 30fps during streaming updates, no UI freezing during API calls
- **Audio Extraction:** Timeline audio extraction completes within 10 seconds for up to 20 clips
- **Cache Loading:** History tab loads and displays up to 100 cached entries within 1 second
- **Character Count Updates:** Real-time character counting updates without noticeable lag (<50ms) as content streams in
- **Memory Usage:** AI operations do not increase memory footprint beyond 100MB during peak usage (streaming 3 platforms simultaneously)

### Security

- **API Key Encryption:** OpenAI API keys encrypted using Electron's `safeStorage` API (OS-level encryption: Keychain on macOS)
- **Key Storage Location:** Encrypted keys stored in Electron userData directory (`~/Library/Application Support/chop-shop/` on macOS), not in project files or version control
- **IPC Validation:** All AI-related IPC channels validated and whitelisted in preload script; API keys never exposed to renderer process directly
- **API Key Transmission:** API keys passed via IPC only when necessary; main process retrieves from storage for API calls
- **Network Security:** All OpenAI API calls use HTTPS; no API key logging to console or files
- **User Data Protection:** Cached transcriptions and posts stored locally only; no data sent to external servers except OpenAI API
- **Sandboxing:** Renderer process sandboxed per Electron best practices; no direct file system or Node.js API access

### Reliability/Availability

- **Error Recovery:** All API failures (network errors, rate limits, authentication failures) handled gracefully with retry logic (max 2 retries with exponential backoff)
- **Graceful Degradation:** If API key invalid/missing, AI Generator page displays clear setup instructions; other app features remain functional
- **Audio Extraction Failures:** If audio extraction fails (codec issues, corrupted files), user receives actionable error message with option to retry or skip problematic clips
- **Whisper API 25MB Limit:** Audio files exceeding 25MB automatically compressed or split; user warned if quality degradation expected
- **Stream Interruption Handling:** If streaming connection drops mid-generation, partial content displayed with option to retry
- **Cache Corruption Resilience:** If cache JSON corrupted, app initializes fresh cache without crashing; user notified of cache reset
- **Offline Mode:** AI features disabled when no internet connection; clear offline indicator shown; local features (editing, export) remain functional

### Observability

- **Logging:** All AI operations logged with context prefixes `[AI]`, `[Whisper]`, `[GPT]`, `[Cache]` for debugging
- **Error Tracking:** API failures logged with error codes, request metadata, and timestamps
- **Progress Monitoring:** Transcription and generation progress events logged with timestamps for performance analysis
- **API Usage Metrics:** Each API call logged with model, token count (if available), duration, and success/failure status
- **Cache Operations:** Cache reads, writes, and clears logged with entry counts and file sizes
- **IPC Monitoring:** All AI-related IPC calls logged with channel names, payload sizes, and round-trip times
- **User Actions:** User interactions (button clicks, tab switches, settings changes) logged for workflow analysis

## Dependencies and Integrations

**New Dependencies:**

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `openai` | ^4.78.0 | Official OpenAI Node.js SDK for Whisper and GPT API integration | MIT |

**Existing Dependencies (Epic 6 Integration):**

| Package | Version | Integration Point |
|---------|---------|-------------------|
| `zustand` | ^5.0.8 | New `aiStore.ts` for AI state management |
| `@radix-ui/react-tabs` | ^1.1.13 | AI Generator page tab navigation (already installed in Epic 2) |
| `@radix-ui/react-select` | ^2.2.6 | Voice persona multi-select dropdown (already installed) |
| `@radix-ui/react-dialog` | ^1.1.15 | Confirmation dialogs for cache clearing (already installed) |
| `ffmpeg-static` | ^5.2.0 | Audio extraction from video clips (already installed in Epic 1) |
| `electron` | ^38.1.2 | safeStorage API for API key encryption |

**External API Integrations:**

| API | Endpoint | Authentication | Rate Limits |
|-----|----------|----------------|-------------|
| OpenAI Whisper | `https://api.openai.com/v1/audio/transcriptions` | Bearer token (API key) | Tier-based (default: 3 RPM, 200 RPD) |
| OpenAI GPT-4o-mini | `https://api.openai.com/v1/chat/completions` | Bearer token (API key) | Tier-based (default: 500 RPM, 200K tokens/day) |

**File System Integration:**

- **API Key Storage:** `~/Library/Application Support/chop-shop/ai-config.json` (encrypted)
- **Cache Storage:** `~/Library/Application Support/chop-shop/ai-cache.json` (plain JSON)
- **Temp Audio Files:** `${os.tmpdir()}/chop-shop/ai-audio/` (cleaned up after transcription)

**Timeline Integration:**

- Reads clips from `timelineStore.ts` (Zustand store)
- Accesses clip metadata: `sourceFile` (video path), `duration`, `trackId`
- No modifications to timeline; read-only audio extraction

**IPC Integration:**

- Uses existing IPC patterns from `src/shared/constants.ts`
- New channels added to IPC whitelist in `preload.ts`
- Follows `IPCResponse<T>` format from architecture

## Acceptance Criteria (Authoritative)

### Story 6.1: AI Settings & Secure API Key Management
1. AI Settings panel accessible from main application settings
2. Input field for OpenAI API key with password masking
3. API key stored using Electron's safeStorage (encrypted, per-project)
4. "Test Connection" button validates API key with OpenAI
5. Success/error messages displayed for connection test
6. Key persists across application restarts
7. Option to clear/reset stored API key
8. Settings panel uses shadcn/ui components (Input, Button, Label)

### Story 6.2: AI Generator UI Layout & Navigation
1. "AI Generator" button added next to Record button in sidebar
2. Button always visible/enabled (validation happens on action)
3. Clicking button opens dedicated AI Generator page/modal (separate from timeline)
4. Page contains tab navigation: History, Transcribe, Generate, Results
5. Tab system implemented with shadcn/ui Tabs component
6. Navigation between tabs maintains state within session
7. "Back to Editor" button returns to main timeline view
8. Layout responsive and matches dark theme

### Story 6.3: Audio Extraction & Transcription Service (Whisper API)
1. Main process service extracts audio from all timeline clips (concatenated)
2. Extracted audio converted to format compatible with Whisper API (MP3/WAV)
3. Service validates timeline has audio/video clips before extraction
4. Whisper API integration transcribes audio using `whisper-1` model
5. Progress indicator shows transcription status (percentage if possible)
6. Transcription result returned to renderer process via IPC
7. Error handling for API failures with user-friendly messages
8. Service properly handles large audio files (up to 25MB Whisper limit)

### Story 6.4: Transcription Tab UI & Editing
1. Transcribe tab displays "Transcribe Audio" button
2. Button checks for timeline clips; shows error if none exist
3. Clicking button triggers audio extraction and transcription
4. Progress indicator visible during transcription process
5. Transcription auto-populates into editable textarea (shadcn/ui Textarea)
6. Checkbox: "Include transcription in post generation prompt"
7. Second textarea: "Additional Guidance" (optional user input)
8. Both fields editable and optional (can be left empty)
9. Validation: At least one field must have content to enable Generate button
10. Transcription persists in session (cached until cleared)

### Story 6.5: Voice Persona Selection System
1. Multi-select dropdown implemented with shadcn/ui Select component
2. Dropdown includes 12+ voice personas (Naval Ravikant, Elon Musk, Gary Vaynerchuk, Tim Ferriss, Scott Adams, Seth Godin, Casey Neistat, MKBHD, Simon Sinek, Brené Brown, Adam Grant, Malcolm Gladwell)
3. Users can select multiple personas (style blending)
4. Selected personas shown as tags/chips with remove option
5. System prompt generator blends selected personas into unified style instructions
6. Default state: No personas selected (neutral/professional tone)
7. Persona selection persists across session
8. Dropdown searchable/filterable for easy selection

### Story 6.6: Content Generation Service (GPT-4o-mini with Streaming)
1. Generate tab shows platform checkboxes: YouTube, Twitter, LinkedIn (multi-select)
2. "Include Emojis" toggle checkbox (default: off)
3. "Generate Posts" button enabled when at least one platform selected
4. Main process service calls GPT-4o-mini API with streaming enabled
5. System prompts crafted as expert social media strategist per platform (YouTube: SEO-optimized descriptions; Twitter: 280 char max, engaging hooks; LinkedIn: Professional tone, 1-3 paragraphs)
6. Selected voice personas blended into system prompt
7. Transcription and/or user guidance included in prompt if checked
8. Emoji setting explicitly instructed in system prompts
9. Parallel generation: All selected platforms generate simultaneously
10. Streaming responses sent via IPC to renderer as chunks arrive
11. Error handling for API failures, rate limits, and network issues

### Story 6.7: Results Display with Streaming & Copy Controls
1. Results tab automatically activated when generation starts
2. Platform sections display in parallel (YouTube, Twitter, LinkedIn)
3. Generated text streams into each section as API returns chunks
4. Real-time character count displayed below each platform's text
5. Warning indicator if character count exceeds platform limits (Twitter: 280 chars; LinkedIn: 3000 chars)
6. Individual "Copy to Clipboard" button per platform (shadcn/ui Button)
7. Copy button shows confirmation feedback ("Copied!") on click
8. Generated content remains in view until session ends or cleared
9. Loading spinner shown while generation in progress
10. Smooth UI updates during streaming (no flickering/jumping)

### Story 6.8: Transcription & Post History with Caching
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

### Story 6.9: Error Handling & Validation
1. API key validation: Show specific error if key is invalid/missing
2. Timeline validation: Show error if no audio/video clips exist before transcription
3. Whisper API errors: Display user-friendly messages (e.g., "Audio too large", "API quota exceeded")
4. GPT-4o-mini API errors: Display rate limit warnings, network failures, etc.
5. Empty input validation: Warn if trying to generate with no transcription or guidance
6. Platform limit warnings: Clear visual indicators when exceeding character limits
7. Network error handling: Retry logic with user notification
8. Loading states: Disable buttons during processing to prevent duplicate requests
9. Error messages use shadcn/ui Alert/Toast components
10. All error states allow user to retry or return to previous step

## Traceability Mapping

| AC ID | Spec Section | Component(s)/Service(s) | Test Idea |
|-------|--------------|-------------------------|-----------|
| 6.1.1-6.1.8 | API Key Management | `api-key-manager.service.ts`, `AISettings.tsx`, `aiStore.ts` | Unit test: Encrypt/decrypt key; Integration test: Store and retrieve key across restarts; Manual test: Test connection with valid/invalid keys |
| 6.2.1-6.2.8 | UI Layout & Navigation | `AIGeneratorPage.tsx`, `uiStore.ts`, `Sidebar.tsx` | Component test: Tab navigation state; Visual test: Dark theme consistency; Manual test: Navigate between tabs and return to editor |
| 6.3.1-6.3.8 | Audio Extraction & Transcription | `audio-extractor.service.ts`, `whisper.service.ts`, IPC handlers | Unit test: Audio extraction from clips; Integration test: Whisper API call with mock; Manual test: Transcribe 5-minute video, verify accuracy |
| 6.4.1-6.4.10 | Transcription UI | `TranscriptionPanel.tsx`, `aiStore.ts` | Component test: Textarea editing, checkbox states; Integration test: IPC transcription trigger; Manual test: Edit transcription, verify caching |
| 6.5.1-6.5.8 | Voice Persona Selection | `GenerationPanel.tsx`, `aiStore.ts`, persona constants | Component test: Multi-select behavior; Unit test: Persona blending logic; Manual test: Select personas, verify prompt generation |
| 6.6.1-6.6.11 | Content Generation Service | `content-generator.service.ts`, IPC handlers | Unit test: System prompt building; Integration test: Streaming mock; Manual test: Generate posts for all platforms, verify streaming |
| 6.7.1-6.7.10 | Results Display | `ResultsPanel.tsx`, `aiStore.ts` | Component test: Character count updates; Integration test: Stream chunk rendering; Manual test: Copy buttons, verify clipboard; Visual test: No flickering during streaming |
| 6.8.1-6.8.10 | History & Caching | `HistoryPanel.tsx`, `aiStore.ts`, cache service | Unit test: Cache read/write; Integration test: Load history entry; Manual test: Generate multiple posts, verify history, clear cache |
| 6.9.1-6.9.10 | Error Handling | All services, all components | Unit test: API error responses; Integration test: Network failure simulation; Manual test: Trigger all error scenarios, verify user messages |

## Risks, Assumptions, Open Questions

**Risks:**
- **Risk:** OpenAI API rate limits may block users during high usage
  - **Mitigation:** Implement exponential backoff retry logic; display clear rate limit messages with retry time; consider implementing local queue for requests
- **Risk:** Large audio files (>25MB) cannot be transcribed via Whisper API
  - **Mitigation:** Implement audio compression before upload; split audio into chunks if compression insufficient; warn user of quality degradation
- **Risk:** Streaming API connections may drop mid-generation, leaving partial content
  - **Mitigation:** Display partial content with "Interrupted" indicator; provide "Retry" button; log connection failures for debugging
- **Risk:** API key leakage if user accidentally shares logs or screenshots
  - **Mitigation:** Never log API keys; mask keys in UI (show only last 4 characters); add warning in settings about key security
- **Risk:** Persona blending may produce inconsistent or confusing tone
  - **Mitigation:** Limit persona selection to 3 maximum; provide clear examples of blended styles; allow users to regenerate with different personas

**Assumptions:**
- Users have their own OpenAI API keys (local-first approach for development)
- Timeline clips have extractable audio (not silent video-only clips)
- Users understand platform-specific content length limitations
- Internet connection available when using AI features
- OpenAI API v1 endpoints remain stable (Whisper, GPT-4o-mini)
- macOS Keychain available for safeStorage encryption
- Users accept that AI-generated content may require editing
- GPT-4o-mini model remains available and affordable for users

**Open Questions:**
- **Question:** Should we implement token usage tracking to estimate costs for users?
  - **Answer Needed By:** Story 6.6 implementation
  - **Decision Owner:** andrew
- **Question:** Should history cache have a maximum size limit (e.g., 100 entries)?
  - **Answer Needed By:** Story 6.8 implementation
  - **Decision Owner:** andrew
- **Question:** Should we support custom persona creation (user-defined voice styles)?
  - **Answer:** Deferred to post-Epic 6; use predefined personas for MVP
- **Question:** Should we add export functionality for generated posts (e.g., .txt file download)?
  - **Answer:** Yes, covered in Story 6.7 AC (individual copy buttons; consider bulk export in future iteration)

## Test Strategy Summary

**Unit Tests (Vitest):**
- `api-key-manager.service.test.ts`: Encryption/decryption, storage/retrieval, validation
- `whisper.service.test.ts`: API call mocking, error handling, audio format validation
- `content-generator.service.test.ts`: System prompt building, persona blending logic, streaming chunk processing
- `audio-extractor.service.test.ts`: Clip concatenation, format conversion, FFmpeg command building
- `aiStore.test.ts`: State management, cache operations, persistence logic
- `TranscriptionPanel.test.tsx`: Component rendering, user interactions, validation
- `GenerationPanel.test.tsx`: Platform selection, persona dropdown, emoji toggle
- `ResultsPanel.test.tsx`: Streaming updates, character counting, copy functionality
- `HistoryPanel.test.tsx`: Cache loading, entry selection, clear cache confirmation

**Integration Tests:**
- **IPC Communication:** Test all AI-related IPC channels (test-connection, transcribe-audio, generate-posts) with mocked main process responses
- **API Mocking:** Mock OpenAI API responses (Whisper transcription, GPT streaming) to test service integration without actual API calls
- **End-to-End Workflow:** Test complete flow from transcription → generation → display using test fixtures and mocks

**Manual Testing:**
- **Story 6.1:** Test API key storage, test connection with valid/invalid keys, verify persistence across app restarts
- **Story 6.2:** Navigate between all tabs, verify state persistence, test "Back to Editor" button
- **Story 6.3:** Transcribe audio from multiple timeline clips (5-10 min total), verify accuracy, test progress indicators
- **Story 6.4:** Edit transcription, add user guidance, verify validation, test caching
- **Story 6.5:** Select multiple personas (2-4), verify dropdown behavior, test style blending in generated content
- **Story 6.6:** Generate posts for all platforms simultaneously, verify streaming, test with/without emojis
- **Story 6.7:** Verify character counts, test copy buttons, check platform limit warnings, verify no UI flickering during streaming
- **Story 6.8:** Generate multiple posts, verify history display, load history entry, test cache clearing
- **Story 6.9:** Trigger all error scenarios (invalid key, no clips, API failures, network issues), verify user-friendly messages

**Acceptance Testing:**
- **User Workflow Test:** Complete end-to-end workflow: Setup API key → Transcribe timeline → Generate posts → Copy to clipboard → Verify on platforms
- **Performance Test:** Transcribe 10-minute audio, generate posts for 3 platforms simultaneously, verify completion times within NFR targets
- **Error Recovery Test:** Simulate network failure mid-generation, verify graceful degradation and retry functionality
- **Cross-Session Test:** Generate posts, close app, reopen, verify history and cached content persist
