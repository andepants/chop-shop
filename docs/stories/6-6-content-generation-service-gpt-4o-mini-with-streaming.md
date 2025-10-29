# Story 6.6: Content Generation Service (GPT-4o-mini with Streaming)

Status: ready-for-dev

## Story

As a content creator,
I want AI to generate platform-optimized social media posts in real-time,
so that I can immediately use content tailored for YouTube, Twitter, and LinkedIn.

## Acceptance Criteria

1. Generate tab shows platform checkboxes: YouTube, Twitter, LinkedIn (multi-select)
2. "Include Emojis" toggle checkbox (default: off)
3. "Generate Posts" button enabled when at least one platform selected
4. Main process service calls GPT-4o-mini API with streaming enabled
5. System prompts crafted as expert social media strategist per platform:
   - YouTube: SEO-optimized descriptions with timestamps, no emojis by default
   - Twitter: 280 char max, engaging hooks, hashtags, no emojis by default
   - LinkedIn: Professional tone, 1-3 paragraphs, value-focused, no emojis by default
6. Selected voice personas blended into system prompt
7. Transcription and/or user guidance included in prompt if checked
8. Emoji setting explicitly instructed in system prompts
9. Parallel generation: All selected platforms generate simultaneously
10. Streaming responses sent via IPC to renderer as chunks arrive
11. Error handling for API failures, rate limits, and network issues

## Tasks / Subtasks

- [ ] Task 1: Create Generation Panel UI component (AC: 1, 2, 3)
  - [ ] Create `GenerationPanel.tsx` in `src/renderer/src/components/AI/`
  - [ ] Add platform checkboxes: YouTube, Twitter, LinkedIn (shadcn/ui Checkbox)
  - [ ] Add "Include Emojis" toggle checkbox (default unchecked)
  - [ ] Add "Generate Posts" button (shadcn/ui Button)
  - [ ] Integrate PersonaSelector component from Story 6.5
  - [ ] Button enabled only when at least one platform selected

- [ ] Task 2: Add generation state to aiStore (AC: 9)
  - [ ] Update `aiStore.ts` to add `selectedPlatforms` field (string array)
  - [ ] Add `includeEmojis` field (boolean, default false)
  - [ ] Add `generationStatus` field ('idle' | 'generating' | 'complete' | 'error')
  - [ ] Add actions: `setPlatforms()`, `setIncludeEmojis()`, `setGenerationStatus()`

- [ ] Task 3: Create platform-specific system prompts (AC: 5, 8)
  - [ ] Create `system-prompts.ts` in `src/main/services/ai/`
  - [ ] Define function: `buildYouTubePrompt(includeEmojis: boolean, personaPrompt: string)`
  - [ ] Define function: `buildTwitterPrompt(includeEmojis: boolean, personaPrompt: string)`
  - [ ] Define function: `buildLinkedInPrompt(includeEmojis: boolean, personaPrompt: string)`
  - [ ] Each prompt clearly instructs emoji usage and platform constraints
  - [ ] Inject persona prompt into system message

- [ ] Task 4: Create content generation service (AC: 4, 9, 10)
  - [ ] Create `content-generator.service.ts` in `src/main/services/ai/`
  - [ ] Implement `generatePosts()` method accepting GenerationRequest
  - [ ] Use OpenAI SDK to call GPT-4o-mini API
  - [ ] Set `stream: true` for streaming responses
  - [ ] For each selected platform, spawn parallel API calls
  - [ ] Process stream chunks and emit via IPC events
  - [ ] Return when all platform streams complete

- [ ] Task 5: Implement streaming chunk processing (AC: 10)
  - [ ] For each platform stream, listen for data chunks
  - [ ] Accumulate chunks into full content per platform
  - [ ] Send IPC event `ai-stream-chunk` for each chunk
  - [ ] Event payload: `{ platform, content, complete }`
  - [ ] Set `complete: true` when stream ends for that platform

- [ ] Task 6: Add IPC handler for generation (AC: 4, 10)
  - [ ] Update `ai.handlers.ts` to add `ai-generate-posts` handler
  - [ ] Accept GenerationRequest: `{ transcription?, userGuidance?, personas, platforms, includeEmojis }`
  - [ ] Retrieve API key from API key manager
  - [ ] Build system prompts for each platform
  - [ ] Build persona prompt from selected personas
  - [ ] Call content-generator service
  - [ ] Return success/error response

- [ ] Task 7: Build user messages for GPT (AC: 7)
  - [ ] Construct user message from transcription and/or user guidance
  - [ ] If transcription included: "Transcription: [text]\n\n"
  - [ ] If user guidance included: "Additional context: [guidance]\n\n"
  - [ ] Combine both if both provided
  - [ ] Validate at least one input present (should be validated in renderer)

- [ ] Task 8: Implement parallel generation (AC: 9)
  - [ ] Use Promise.all() or Promise.allSettled() for parallel API calls
  - [ ] Each platform gets its own GPT-4o-mini stream
  - [ ] Streams run concurrently (not sequentially)
  - [ ] Collect results from all streams before returning
  - [ ] Handle partial failures (some platforms succeed, others fail)

- [ ] Task 9: Add comprehensive error handling (AC: 11)
  - [ ] Handle invalid/missing API key
  - [ ] Handle OpenAI API errors (auth, quota, rate limits)
  - [ ] Handle network failures during streaming
  - [ ] Handle stream interruptions (partial content)
  - [ ] Return detailed error messages via IPC
  - [ ] Log all errors with context

- [ ] Task 10: Implement retry logic (AC: 11)
  - [ ] Add retry logic for transient failures (network, rate limits)
  - [ ] Max 2 retries with exponential backoff
  - [ ] Don't retry for auth failures (invalid key)
  - [ ] User notified of retry attempts

- [ ] Task 11: Add validation in GenerationPanel (AC: 3, 7)
  - [ ] Validate at least one platform selected
  - [ ] Validate at least one input (transcription or guidance) via Story 6.4 validation
  - [ ] Disable button if validation fails
  - [ ] Show inline error message if user clicks disabled button

- [ ] Task 12: Trigger generation on button click (AC: 4)
  - [ ] On "Generate Posts" click, collect all state from aiStore
  - [ ] Build GenerationRequest payload
  - [ ] Call `ai-generate-posts` IPC channel
  - [ ] Handle IPC response (success/error)
  - [ ] Navigate to Results tab when streaming starts

- [ ] Task 13: Write unit tests for system prompts (Testing)
  - [ ] Test each platform prompt builder function
  - [ ] Test emoji inclusion/exclusion in prompts
  - [ ] Test persona prompt injection
  - [ ] Verify prompt format and structure

- [ ] Task 14: Write unit tests for content generation service (Testing)
  - [ ] Test `generatePosts()` with mocked OpenAI SDK
  - [ ] Test streaming chunk processing
  - [ ] Test parallel generation for multiple platforms
  - [ ] Test error handling for API failures

- [ ] Task 15: Write integration tests for generation flow (Testing)
  - [ ] Test complete flow: button → IPC → service → streaming → results
  - [ ] Test with mocked OpenAI API responses
  - [ ] Test error propagation to renderer
  - [ ] Test parallel generation behavior

## Dev Notes

### Architecture Patterns

- **Streaming Architecture**: GPT-4o-mini API streams content via Server-Sent Events (SSE), chunks sent to renderer via IPC events
- **Parallel Execution**: Each platform generates concurrently using separate API calls (Promise.all)
- **System Prompts**: Platform-specific prompts inject persona styles and emoji settings
- **IPC Communication**: Main process handles generation, streams chunks to renderer via `ai-stream-chunk` events

### Services to Create

**Main Process:**
- `src/main/services/ai/content-generator.service.ts` - GPT-4o-mini streaming integration
- `src/main/services/ai/system-prompts.ts` - Platform-specific prompt builders

**Renderer Process:**
- `src/renderer/src/components/AI/GenerationPanel.tsx` - Generation controls UI

**Updates:**
- `src/main/ipc/ai.handlers.ts` - Add `ai-generate-posts` IPC handler
- `src/renderer/src/store/aiStore.ts` - Add generation state (platforms, emojis, status)

### Data Models

**GenerationRequest:**
```typescript
interface GenerationRequest {
  transcription?: string;
  userGuidance?: string;
  personas: string[]; // Persona IDs
  platforms: ('youtube' | 'twitter' | 'linkedin')[];
  includeEmojis: boolean;
}
```

**StreamChunk (IPC Event):**
```typescript
interface StreamChunk {
  platform: 'youtube' | 'twitter' | 'linkedin';
  content: string; // Incremental chunk
  complete: boolean; // True when stream finished
}
```

### System Prompt Examples

**YouTube:**
```typescript
const youtubeSystemPrompt = `You are an expert YouTube content strategist. Generate an SEO-optimized video description that:
- Starts with a compelling hook (first 2-3 lines)
- Includes relevant keywords naturally
- Provides value and context
- Uses clear section headers
- ${includeEmojis ? 'Can include emojis' : 'Does NOT include emojis'}
${personaPrompt}

Keep descriptions informative and engaging, optimized for YouTube search.`;
```

**Twitter:**
```typescript
const twitterSystemPrompt = `You are an expert Twitter content strategist. Generate an engaging tweet that:
- MAXIMUM 280 characters (strict limit)
- Starts with a strong hook
- Includes 1-3 relevant hashtags
- ${includeEmojis ? 'Can include emojis' : 'Does NOT include emojis'}
${personaPrompt}

Be concise, engaging, and optimized for Twitter engagement.`;
```

**LinkedIn:**
```typescript
const linkedinSystemPrompt = `You are an expert LinkedIn content strategist. Generate a professional post that:
- 1-3 paragraphs maximum
- Professional and value-focused tone
- Provides insights or takeaways
- Engages professional audience
- ${includeEmojis ? 'Can include emojis sparingly' : 'Does NOT include emojis'}
${personaPrompt}

Keep it professional, insightful, and optimized for LinkedIn engagement.`;
```

### OpenAI SDK Streaming Example

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: apiKey });

const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  if (content) {
    // Send IPC event with chunk
    mainWindow.webContents.send('ai-stream-chunk', {
      platform: 'youtube',
      content: content,
      complete: false
    });
  }
}

// Send final complete event
mainWindow.webContents.send('ai-stream-chunk', {
  platform: 'youtube',
  content: '',
  complete: true
});
```

### Parallel Generation Pattern

```typescript
async function generatePosts(request: GenerationRequest) {
  const promises = request.platforms.map(platform =>
    generateForPlatform(platform, request)
  );

  const results = await Promise.allSettled(promises);

  // Handle partial failures
  results.forEach((result, index) => {
    const platform = request.platforms[index];
    if (result.status === 'rejected') {
      console.error(`${platform} generation failed:`, result.reason);
    }
  });
}
```

### Error Messages (User-Friendly)

- "No platform selected. Please select at least one platform."
- "No content to generate. Please provide a transcription or additional guidance."
- "Generation failed: Invalid API key. Please check your AI Settings."
- "Generation failed: API quota exceeded. Please try again later."
- "Generation failed: Network error. Please check your internet connection."
- "Generation interrupted. Some content may be incomplete."

### Testing Standards

- Unit tests for system prompt builders (all platforms, emoji variations)
- Unit tests for content generation service with mocked OpenAI SDK
- Integration tests for IPC flow and streaming events
- Manual testing with real OpenAI API (use test key)

### Project Structure Notes

- Follows Epic 6 tech spec: AI services under `src/main/services/ai/`
- Uses OpenAI SDK (already required by Story 6.1)
- Aligns with IPC patterns from existing handlers
- Integrates with persona system from Story 6.5

### Dependencies

- **openai** package (v4.78.0+) - Already required by Story 6.1
- No new dependencies required

### Performance Considerations

- Parallel generation reduces total time (vs. sequential)
- Streaming provides immediate feedback (first chunk in 2-3 seconds)
- Long-running operations in main process prevent UI blocking
- IPC events keep UI responsive during generation

### References

- [Source: docs/tech-spec-epic-6.md#Services and Modules] - Content generator service specification
- [Source: docs/tech-spec-epic-6.md#APIs and Interfaces] - GPT-4o-mini API integration, IPC contracts
- [Source: docs/tech-spec-epic-6.md#Workflows and Sequencing] - Workflow 3: Post Generation flow
- [Source: docs/tech-spec-epic-6.md#System Prompts] - Platform-specific prompt examples
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.6 AC section
- [Source: docs/epics.md#Story 6.6] - User story and prerequisites

## Dev Agent Record

### Context Reference

- docs/stories/6-6-content-generation-service-gpt-4o-mini-with-streaming.context.xml

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
