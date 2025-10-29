# Story 6.2: AI Generator UI Layout & Navigation

Status: ready-for-dev

## Story

As a content creator,
I want a dedicated AI Generator page with organized tabs,
so that I can easily navigate between transcription, generation, and history.

## Acceptance Criteria

1. "AI Generator" button added next to Record button in sidebar
2. Button always visible/enabled (validation happens on action)
3. Clicking button opens dedicated AI Generator page/modal (separate from timeline)
4. Page contains tab navigation: History, Transcribe, Generate, Results
5. Tab system implemented with shadcn/ui Tabs component
6. Navigation between tabs maintains state within session
7. "Back to Editor" button returns to main timeline view
8. Layout responsive and matches dark theme

## Tasks / Subtasks

- [ ] Task 1: Add AI Generator button to sidebar (AC: 1, 2)
  - [ ] Update `Sidebar.tsx` to add "AI Generator" button
  - [ ] Position button next to existing Record button
  - [ ] Use shadcn/ui Button component matching existing button styles
  - [ ] Add AI icon (e.g., sparkles, robot, or brain icon)
  - [ ] Button always enabled (no disabled state)

- [ ] Task 2: Create AI Generator page container component (AC: 3, 7, 8)
  - [ ] Create `AIGeneratorPage.tsx` in `src/renderer/src/components/AI/`
  - [ ] Implement full-screen page layout (separate from timeline view)
  - [ ] Add top bar with "AI Generator" title and "Back to Editor" button
  - [ ] Apply dark theme styling matching existing UI
  - [ ] Make layout responsive to window resize
  - [ ] Add slide-in transition animation when opening

- [ ] Task 3: Implement tab navigation system (AC: 4, 5, 6)
  - [ ] Use shadcn/ui Tabs component for tab container
  - [ ] Create four tabs: "History", "Transcribe", "Generate", "Results"
  - [ ] Set default active tab to "History" or "Transcribe"
  - [ ] Store active tab in local component state
  - [ ] Tab switching maintains content state (no data loss)
  - [ ] Add tab indicator/highlight for active tab

- [ ] Task 4: Create placeholder panel components (AC: 4)
  - [ ] Create `HistoryPanel.tsx` stub with "History" placeholder text
  - [ ] Create `TranscriptionPanel.tsx` stub with "Transcribe" placeholder text
  - [ ] Create `GenerationPanel.tsx` stub with "Generate" placeholder text
  - [ ] Create `ResultsPanel.tsx` stub with "Results" placeholder text
  - [ ] Each panel renders within tab content area

- [ ] Task 5: Add UI state management for AI Generator visibility (AC: 3, 7)
  - [ ] Update `uiStore.ts` to add `aiGeneratorVisible` state (boolean)
  - [ ] Add `showAIGenerator()` and `hideAIGenerator()` actions
  - [ ] Connect sidebar button click to `showAIGenerator()`
  - [ ] Connect "Back to Editor" button to `hideAIGenerator()`
  - [ ] Conditionally render AIGeneratorPage based on visibility state

- [ ] Task 6: Implement page routing/navigation (AC: 3, 7)
  - [ ] When AI Generator visible, hide main timeline view
  - [ ] When timeline visible, hide AI Generator page
  - [ ] Maintain timeline state when switching to AI Generator
  - [ ] Ensure smooth transitions between views (no flicker)

- [ ] Task 7: Style and theme the AI Generator page (AC: 8)
  - [ ] Apply dark theme colors matching existing UI
  - [ ] Use consistent typography and spacing
  - [ ] Ensure proper contrast for accessibility
  - [ ] Add hover states for interactive elements
  - [ ] Match existing design patterns from timeline UI

- [ ] Task 8: Add keyboard shortcuts for navigation (Optional enhancement)
  - [ ] Implement Esc key to close AI Generator (return to timeline)
  - [ ] Implement Cmd/Ctrl+G to toggle AI Generator visibility
  - [ ] Tab keyboard navigation between tabs (Arrow keys)

- [ ] Task 9: Write component tests for AI Generator page (Testing)
  - [ ] Test AIGeneratorPage component renders with all tabs
  - [ ] Test tab switching functionality
  - [ ] Test "Back to Editor" button hides page
  - [ ] Test sidebar button shows AI Generator page
  - [ ] Test state persistence across tab switches

- [ ] Task 10: Write integration tests for navigation flow (Testing)
  - [ ] Test complete navigation: sidebar → AI Generator → tabs → back to editor
  - [ ] Test visibility state in uiStore
  - [ ] Test that timeline state is preserved when switching views

## Dev Notes

### Architecture Patterns

- **Component Structure**: AI Generator page is a top-level route/page component (`AIGeneratorPage.tsx`) that orchestrates panel components
- **State Management**: Use `uiStore.ts` (Zustand) to manage page visibility (`aiGeneratorVisible`)
- **Tab System**: shadcn/ui Tabs component provides accessible tab navigation with keyboard support
- **Routing**: Simple conditional rendering based on visibility state (no complex routing library needed for 2 views)

### Components to Create

**Renderer Process:**
- `src/renderer/src/components/AI/AIGeneratorPage.tsx` - Main page container
- `src/renderer/src/components/AI/HistoryPanel.tsx` - History tab (placeholder)
- `src/renderer/src/components/AI/TranscriptionPanel.tsx` - Transcribe tab (placeholder)
- `src/renderer/src/components/AI/GenerationPanel.tsx` - Generate tab (placeholder)
- `src/renderer/src/components/AI/ResultsPanel.tsx` - Results tab (placeholder)

**Updates:**
- `src/renderer/src/components/Sidebar.tsx` - Add AI Generator button
- `src/renderer/src/store/uiStore.ts` - Add AI Generator visibility state

### Component Hierarchy

```
AIGeneratorPage (container)
├── Top Bar
│   ├── Title: "AI Generator"
│   └── Back to Editor Button
└── Tabs (shadcn/ui)
    ├── Tab: History → HistoryPanel
    ├── Tab: Transcribe → TranscriptionPanel
    ├── Tab: Generate → GenerationPanel
    └── Tab: Results → ResultsPanel
```

### Design Reference

- Tab layout similar to browser tabs or settings tabs
- Full-screen takeover (like a modal page)
- "Back to Editor" button in top-left or top-right corner
- Dark theme with subtle borders/dividers between sections

### Testing Standards

- Component tests for each panel and main page
- Integration test for full navigation flow
- Visual regression testing for dark theme consistency
- Accessibility testing for tab navigation (keyboard, screen readers)

### Project Structure Notes

- Follows Epic 6 tech spec: AI components under `src/renderer/src/components/AI/`
- Uses shadcn/ui Tabs component (already installed in Epic 2, Story 2.6)
- Aligns with existing UI patterns (dark theme, button styles)
- uiStore pattern matches existing stores (`recordingStore.ts`, `timelineStore.ts`)

### Dependencies

- shadcn/ui Tabs component (from `@radix-ui/react-tabs` v1.1.13+, already installed)
- No new dependencies required

### References

- [Source: docs/tech-spec-epic-6.md#Services and Modules] - AIGeneratorPage.tsx specification
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.2 AC section
- [Source: docs/epics.md#Story 6.2] - User story and prerequisites
- [Source: docs/tech-spec-epic-6.md#Component Structure] - Component organization pattern

## Dev Agent Record

### Context Reference

- docs/stories/6-2-ai-generator-ui-layout-navigation.context.xml

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
