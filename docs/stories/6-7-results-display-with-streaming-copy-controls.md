# Story 6.7: Results Display with Streaming & Copy Controls

Status: ready-for-dev

## Story

As a content creator,
I want to see generated posts stream in real-time with copy buttons and character counts,
so that I can quickly distribute my content across platforms.

## Acceptance Criteria

1. Results tab automatically activated when generation starts
2. Platform sections display in parallel (YouTube, Twitter, LinkedIn)
3. Generated text streams into each section as API returns chunks
4. Real-time character count displayed below each platform's text
5. Warning indicator if character count exceeds platform limits:
   - Twitter: 280 chars
   - YouTube: No hard limit, but show count
   - LinkedIn: 3000 chars
6. Individual "Copy to Clipboard" button per platform (shadcn/ui Button)
7. Copy button shows confirmation feedback ("Copied!") on click
8. Generated content remains in view until session ends or cleared
9. Loading spinner shown while generation in progress
10. Smooth UI updates during streaming (no flickering/jumping)

## Tasks / Subtasks

- [ ] Task 1: Create Results Panel component (AC: 2, 8)
  - [ ] Create `ResultsPanel.tsx` in `src/renderer/src/components/AI/`
  - [ ] Create platform sections for YouTube, Twitter, LinkedIn
  - [ ] Each section has: platform label, content area, char count, copy button
  - [ ] Apply dark theme styling
  - [ ] Make layout responsive

- [ ] Task 2: Add generated posts state to aiStore (AC: 8)
  - [ ] Update `aiStore.ts` to add `generatedPosts` object
  - [ ] Structure: `{ youtube: string, twitter: string, linkedin: string }`
  - [ ] Add action: `appendStreamChunk(platform, content)`
  - [ ] Add action: `clearGeneratedPosts()`
  - [ ] Posts persist until session ends or user clears

- [ ] Task 3: Implement streaming display logic (AC: 3, 10)
  - [ ] Listen for `ai-stream-chunk` IPC events
  - [ ] On chunk received, call `appendStreamChunk()` to update state
  - [ ] Content displays incrementally as chunks arrive
  - [ ] Use smooth scroll/animation to show new content
  - [ ] Prevent UI flickering (use CSS transitions)

- [ ] Task 4: Auto-activate Results tab on generation start (AC: 1)
  - [ ] When generation starts, switch active tab to "Results"
  - [ ] Update AIGeneratorPage tab state
  - [ ] Ensure smooth transition from Generate tab to Results tab

- [ ] Task 5: Implement real-time character counting (AC: 4)
  - [ ] For each platform section, calculate character count of content
  - [ ] Display count below content: "X characters"
  - [ ] Update count in real-time as content streams in
  - [ ] Use React state or derived value for count

- [ ] Task 6: Add character limit warnings (AC: 5)
  - [ ] Define limits: Twitter 280, LinkedIn 3000, YouTube no limit
  - [ ] If count exceeds limit, show warning indicator (red text or icon)
  - [ ] Warning message: "Exceeds Twitter character limit (280)"
  - [ ] Use shadcn/ui Alert or Badge for warning display

- [ ] Task 7: Implement copy-to-clipboard functionality (AC: 6, 7)
  - [ ] Add "Copy" button per platform (shadcn/ui Button)
  - [ ] On click, copy platform content to clipboard (navigator.clipboard API)
  - [ ] Show "Copied!" confirmation feedback (temporary text change or toast)
  - [ ] Revert button text after 2 seconds
  - [ ] Handle clipboard permission errors gracefully

- [ ] Task 8: Add loading spinner during generation (AC: 9)
  - [ ] Show spinner in each platform section while generating
  - [ ] Use shadcn/ui Spinner or custom loading animation
  - [ ] Hide spinner when stream completes for that platform
  - [ ] Display "Generating..." text with spinner

- [ ] Task 9: Handle parallel display (AC: 2)
  - [ ] All three platform sections visible simultaneously
  - [ ] Each section updates independently as its stream progresses
  - [ ] Use grid or flex layout for side-by-side display (if space allows)
  - [ ] Responsive: stack vertically on narrow screens

- [ ] Task 10: Handle stream completion (AC: 3, 9)
  - [ ] Listen for `complete: true` flag in stream chunks
  - [ ] When complete, hide loading spinner for that platform
  - [ ] Enable copy button (disable while loading)
  - [ ] Final character count displayed

- [ ] Task 11: Add clear/reset functionality (Optional enhancement)
  - [ ] Add "Clear Results" button at top of panel
  - [ ] Button calls `clearGeneratedPosts()` action
  - [ ] Confirmation dialog before clearing (shadcn/ui AlertDialog)
  - [ ] Clears all platform content

- [ ] Task 12: Implement smooth scrolling (AC: 10)
  - [ ] As content streams in, auto-scroll to show latest text
  - [ ] Use smooth scroll behavior (CSS or JavaScript)
  - [ ] Don't force scroll if user manually scrolled up
  - [ ] Prevent layout shift/jumping during updates

- [ ] Task 13: Add error state display (Error handling)
  - [ ] If generation fails for a platform, show error message
  - [ ] Error message: "Generation failed for [platform]. Retry?"
  - [ ] Display partial content if stream interrupted
  - [ ] Provide retry button

- [ ] Task 14: Write component tests for Results Panel (Testing)
  - [ ] Test component renders with all platform sections
  - [ ] Test streaming updates (simulate IPC events)
  - [ ] Test character counting logic
  - [ ] Test character limit warnings (Twitter, LinkedIn)
  - [ ] Test copy-to-clipboard functionality

- [ ] Task 15: Write integration tests for streaming display (Testing)
  - [ ] Test complete streaming flow: IPC events → state updates → UI render
  - [ ] Test parallel streaming for multiple platforms
  - [ ] Test tab auto-activation on generation start
  - [ ] Test error handling for failed streams

## Dev Notes

### Architecture Patterns

- **Streaming Display**: Real-time UI updates as IPC events arrive, smooth animations prevent flickering
- **State Management**: Zustand `aiStore` accumulates stream chunks per platform
- **Character Counting**: Derived value from content length, no separate state needed
- **Copy-to-Clipboard**: Native Clipboard API with fallback for older browsers

### Components to Create

**Renderer Process:**
- `src/renderer/src/components/AI/ResultsPanel.tsx` - Results display UI
- `src/renderer/src/components/AI/PlatformResultCard.tsx` - Individual platform card (optional sub-component)

**Updates:**
- `src/renderer/src/store/aiStore.ts` - Add generatedPosts state
- `src/renderer/src/components/AI/AIGeneratorPage.tsx` - Auto-activate Results tab

### Component Layout

```
ResultsPanel
├── Header (optional: "Clear Results" button)
├── Platform Sections (Grid/Flex)
│   ├── YouTube Section
│   │   ├── Label: "YouTube Description"
│   │   ├── Content Area (streaming text)
│   │   ├── Character Count: "X characters"
│   │   ├── Loading Spinner (conditional)
│   │   └── "Copy" Button
│   ├── Twitter Section
│   │   ├── Label: "Twitter Post"
│   │   ├── Content Area (streaming text)
│   │   ├── Character Count: "X / 280 characters" (warning if > 280)
│   │   ├── Loading Spinner (conditional)
│   │   └── "Copy" Button
│   └── LinkedIn Section
│       ├── Label: "LinkedIn Post"
│       ├── Content Area (streaming text)
│       ├── Character Count: "X / 3000 characters" (warning if > 3000)
│       ├── Loading Spinner (conditional)
│       └── "Copy" Button
```

### State Schema (aiStore)

```typescript
interface AIStore {
  generatedPosts: {
    youtube: string;
    twitter: string;
    linkedin: string;
  };
  streamingStatus: {
    youtube: 'idle' | 'streaming' | 'complete' | 'error';
    twitter: 'idle' | 'streaming' | 'complete' | 'error';
    linkedin: 'idle' | 'streaming' | 'complete' | 'error';
  };
  appendStreamChunk: (platform: string, content: string) => void;
  setStreamingStatus: (platform: string, status: string) => void;
  clearGeneratedPosts: () => void;
}
```

### IPC Event Handling

**Listen for stream chunks:**
```typescript
useEffect(() => {
  const handleStreamChunk = (event, chunk: StreamChunk) => {
    if (!chunk.complete) {
      aiStore.appendStreamChunk(chunk.platform, chunk.content);
      aiStore.setStreamingStatus(chunk.platform, 'streaming');
    } else {
      aiStore.setStreamingStatus(chunk.platform, 'complete');
    }
  };

  window.electron.ipcRenderer.on('ai-stream-chunk', handleStreamChunk);

  return () => {
    window.electron.ipcRenderer.removeListener('ai-stream-chunk', handleStreamChunk);
  };
}, []);
```

### Character Counting

```typescript
function getCharacterCount(content: string): number {
  return content.length;
}

function exceedsLimit(platform: string, count: number): boolean {
  const limits = {
    twitter: 280,
    linkedin: 3000,
    youtube: Infinity
  };
  return count > limits[platform];
}
```

### Copy-to-Clipboard Implementation

```typescript
async function copyToClipboard(content: string, platform: string) {
  try {
    await navigator.clipboard.writeText(content);
    // Show "Copied!" feedback
    setButtonText('Copied!');
    setTimeout(() => setButtonText('Copy'), 2000);
  } catch (error) {
    console.error('Copy failed:', error);
    // Fallback: use document.execCommand (deprecated but works)
  }
}
```

### Smooth Streaming CSS

```css
.streaming-content {
  transition: all 0.15s ease-out;
  white-space: pre-wrap;
  word-break: break-word;
}

.content-container {
  overflow-y: auto;
  scroll-behavior: smooth;
}
```

### Character Limit Warnings

- **Twitter**: Red text/icon if > 280 characters
- **LinkedIn**: Red text/icon if > 3000 characters
- **YouTube**: No warning (no hard limit)

### Error Display

- If platform stream fails, show: "Generation failed for [platform]"
- Display partial content if available
- Provide "Retry" button (calls generation again for that platform only)

### Testing Standards

- Component tests for ResultsPanel and character counting
- Integration tests for streaming display (mocked IPC events)
- Manual testing for copy-to-clipboard (browser permissions)
- Visual tests for smooth animations (no flickering)

### Project Structure Notes

- Follows Epic 6 tech spec: AI components under `src/renderer/src/components/AI/`
- Uses shadcn/ui components: Button, Alert, Spinner (already installed)
- Aligns with streaming architecture from Story 6.6
- Integrates with Zustand state management

### Dependencies

- shadcn/ui components (already installed in Epic 2, Story 2.6)
- Native Clipboard API (built-in browser API)
- No new dependencies required

### UX Enhancements (Optional)

- Syntax highlighting for generated text (Markdown preview)
- Expand/collapse sections for longer content
- Export all posts to .txt file
- Regenerate individual platform (without regenerating all)

### Performance Considerations

- Smooth animations prevent UI jank during streaming
- Debounce character count updates if needed (unlikely with modern React)
- Lazy load or virtualize very long content (unlikely for social posts)

### References

- [Source: docs/tech-spec-epic-6.md#Services and Modules] - ResultsPanel.tsx specification
- [Source: docs/tech-spec-epic-6.md#Workflows and Sequencing] - Workflow 3: Post Generation streaming flow
- [Source: docs/tech-spec-epic-6.md#APIs and Interfaces] - StreamChunk IPC event format
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.7 AC section
- [Source: docs/epics.md#Story 6.7] - User story and prerequisites

## Dev Agent Record

### Context Reference

- docs/stories/6-7-results-display-with-streaming-copy-controls.context.xml

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
