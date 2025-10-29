# Story 6.5: Voice Persona Selection System

Status: ready-for-dev

## Story

As a content creator,
I want to select voice personas to influence the tone and style of generated posts,
so that my content matches my brand personality.

## Acceptance Criteria

1. Multi-select dropdown implemented with shadcn/ui Select component
2. Dropdown includes 12+ voice personas:
   - **Business/Tech**: Naval Ravikant, Elon Musk, Gary Vaynerchuk, Tim Ferriss
   - **Creative/Humor**: Scott Adams, Seth Godin, Casey Neistat, MKBHD
   - **Professional**: Simon Sinek, Brené Brown, Adam Grant, Malcolm Gladwell
3. Users can select multiple personas (style blending)
4. Selected personas shown as tags/chips with remove option
5. System prompt generator blends selected personas into unified style instructions
6. Default state: No personas selected (neutral/professional tone)
7. Persona selection persists across session
8. Dropdown searchable/filterable for easy selection

## Tasks / Subtasks

- [ ] Task 1: Define voice persona data structure (AC: 2)
  - [ ] Create `personas.constants.ts` in `src/shared/constants/`
  - [ ] Define `VoicePersona` interface: `{ id, name, category }`
  - [ ] Create `VOICE_PERSONAS` array with all 12+ personas
  - [ ] Organize by category: business, creative, professional
  - [ ] Export as const for type safety

- [ ] Task 2: Add persona state to aiStore (AC: 7)
  - [ ] Update `aiStore.ts` to add `selectedPersonas` field (string[] of persona IDs)
  - [ ] Add action: `addPersona(id: string)`
  - [ ] Add action: `removePersona(id: string)`
  - [ ] Add action: `clearPersonas()`
  - [ ] State persists within session (not cleared on tab switch)

- [ ] Task 3: Create multi-select persona dropdown component (AC: 1, 8)
  - [ ] Create `PersonaSelector.tsx` in `src/renderer/src/components/AI/`
  - [ ] Use shadcn/ui Select or Combobox component for multi-select
  - [ ] Display all personas grouped by category
  - [ ] Implement search/filter functionality (filter by name)
  - [ ] Clicking persona adds to selection (if not already selected)

- [ ] Task 4: Implement selected personas display (AC: 3, 4)
  - [ ] Show selected personas as chips/tags below dropdown
  - [ ] Use shadcn/ui Badge component for persona chips
  - [ ] Each chip displays persona name
  - [ ] Each chip has remove "X" button
  - [ ] Clicking "X" removes persona from selection
  - [ ] Support selecting multiple personas (no limit, but 3-4 recommended)

- [ ] Task 5: Implement persona blending prompt logic (AC: 5)
  - [ ] Create `persona-prompt-builder.ts` utility in `src/main/services/ai/`
  - [ ] Function: `buildPersonaPrompt(personaIds: string[]): string`
  - [ ] If no personas selected, return empty string (neutral tone)
  - [ ] If 1 persona selected, return single persona description
  - [ ] If multiple personas selected, blend styles into unified instruction
  - [ ] Example: "Write in a style that combines [Persona A]'s [trait] with [Persona B]'s [trait]"

- [ ] Task 6: Create persona descriptions for prompts (AC: 5)
  - [ ] Add `description` field to VoicePersona interface
  - [ ] Write concise style descriptions for each persona (1-2 sentences)
  - [ ] Examples:
  - - Naval: "Concise, philosophical, focused on first principles"
  - - Gary Vee: "Energetic, direct, motivational with urgency"
  - - Casey Neistat: "Authentic storytelling with visual creativity"
  - - Malcolm Gladwell: "Analytical insights with compelling narratives"

- [ ] Task 7: Integrate persona selector into Generation Panel (AC: 1)
  - [ ] Update `GenerationPanel.tsx` to import and render `PersonaSelector`
  - [ ] Position selector above platform checkboxes or in separate section
  - [ ] Add label: "Voice Personas (optional)"
  - [ ] Bind to aiStore selectedPersonas state

- [ ] Task 8: Add persona blending to content generation (AC: 5)
  - [ ] Update content generation service (Story 6.6) to accept persona IDs
  - [ ] Call `buildPersonaPrompt()` before generating posts
  - [ ] Inject persona prompt into system prompts for each platform
  - [ ] Pass selected personas from aiStore via IPC to main process

- [ ] Task 9: Handle edge cases and validation (AC: 6)
  - [ ] Default state: empty array (no personas)
  - [ ] Allow generation with no personas (neutral tone)
  - [ ] Limit persona selection to 5 maximum (prevent overly complex blending)
  - [ ] Display warning if > 3 personas selected (may dilute style)

- [ ] Task 10: Add UI enhancements (Optional)
  - [ ] Group personas by category in dropdown (headers)
  - [ ] Add persona avatars/icons (optional visual enhancement)
  - [ ] Show persona description on hover (tooltip)
  - [ ] Add "Clear All" button for selected personas

- [ ] Task 11: Write unit tests for persona blending logic (Testing)
  - [ ] Test `buildPersonaPrompt()` with 0, 1, and multiple personas
  - [ ] Test persona descriptions are correctly formatted
  - [ ] Test blending logic produces valid prompt strings

- [ ] Task 12: Write component tests for PersonaSelector (Testing)
  - [ ] Test dropdown renders all personas
  - [ ] Test search/filter functionality
  - [ ] Test adding persona to selection
  - [ ] Test removing persona from selection
  - [ ] Test multi-select behavior (multiple personas)
  - [ ] Test state binding to aiStore

## Dev Notes

### Architecture Patterns

- **State Management**: Zustand `aiStore` manages selected personas (persists within session)
- **Multi-Select Component**: Use shadcn/ui Select or Combobox with custom multi-select logic
- **Prompt Building**: Main process utility function blends persona styles into system prompts
- **Separation of Concerns**: UI component handles selection, utility handles prompt generation

### Components to Create

**Shared Constants:**
- `src/shared/constants/personas.constants.ts` - Voice persona definitions

**Renderer Process:**
- `src/renderer/src/components/AI/PersonaSelector.tsx` - Multi-select dropdown UI

**Main Process:**
- `src/main/services/ai/persona-prompt-builder.ts` - Persona blending logic

**Updates:**
- `src/renderer/src/store/aiStore.ts` - Add selectedPersonas state
- `src/renderer/src/components/AI/GenerationPanel.tsx` - Integrate PersonaSelector

### Persona Data Structure

```typescript
interface VoicePersona {
  id: string;
  name: string;
  category: 'business' | 'creative' | 'professional';
  description: string; // Style description for prompts
}

const VOICE_PERSONAS: VoicePersona[] = [
  // Business/Tech
  { id: 'naval', name: 'Naval Ravikant', category: 'business', description: 'Concise, philosophical...' },
  { id: 'elon', name: 'Elon Musk', category: 'business', description: 'Direct, visionary...' },
  // ... (12+ total)
];
```

### Persona Blending Example

**Single Persona:**
```
"Write in the style of Naval Ravikant: concise, philosophical, focused on first principles."
```

**Multiple Personas:**
```
"Write in a style that combines Naval Ravikant's philosophical conciseness with Gary Vaynerchuk's energetic urgency and Simon Sinek's inspirational leadership."
```

### Integration with System Prompts

System prompts (YouTube, Twitter, LinkedIn) will include persona blending:

```typescript
const youtubeSystemPrompt = `You are an expert YouTube content strategist. Generate an SEO-optimized video description...

${personaPrompt} // Injected here

Keep descriptions informative and engaging...`;
```

### State Schema (aiStore)

```typescript
interface AIStore {
  selectedPersonas: string[]; // Array of persona IDs
  addPersona: (id: string) => void;
  removePersona: (id: string) => void;
  clearPersonas: () => void;
}
```

### Testing Standards

- Unit tests for persona blending logic (prompt generation)
- Component tests for PersonaSelector UI and multi-select behavior
- Integration tests for persona state management
- Manual testing for style blending in generated content

### Project Structure Notes

- Follows Epic 6 tech spec: persona data in shared constants, UI in AI components
- Uses shadcn/ui Select/Combobox (already installed)
- Aligns with Zustand state management pattern
- Integrates with content generation service (Story 6.6)

### Dependencies

- shadcn/ui Select or Combobox component (already installed in Epic 2, Story 2.6)
- shadcn/ui Badge component for persona chips (already installed)
- No new dependencies required

### Design Considerations

- Multi-select dropdown should be intuitive (similar to tag/category pickers)
- Selected personas displayed prominently (chips/badges)
- Search/filter helps users find personas quickly
- Category grouping improves organization
- Limit max personas to prevent prompt complexity

### UX Enhancements (Optional)

- Show persona category labels (Business, Creative, Professional)
- Add persona avatars (small icons or initials)
- Display persona description on hover (tooltip)
- Provide example output for each persona (preview)

### References

- [Source: docs/tech-spec-epic-6.md#Data Models and Contracts] - Voice Personas definition
- [Source: docs/tech-spec-epic-6.md#Services and Modules] - GenerationPanel.tsx specification
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.5 AC section
- [Source: docs/epics.md#Story 6.5] - User story and prerequisites

## Dev Agent Record

### Context Reference

- docs/stories/6-5-voice-persona-selection-system.context.xml

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
