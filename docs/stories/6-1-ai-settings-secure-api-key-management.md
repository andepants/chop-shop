# Story 6.1: AI Settings & Secure API Key Management

Status: drafted

## Story

As a content creator,
I want to securely store my OpenAI API key in the application,
so that I can use AI features without exposing my credentials.

## Acceptance Criteria

1. AI Settings panel accessible from main application settings
2. Input field for OpenAI API key with password masking
3. API key stored using Electron's safeStorage (encrypted, per-project)
4. "Test Connection" button validates API key with OpenAI
5. Success/error messages displayed for connection test
6. Key persists across application restarts
7. Option to clear/reset stored API key
8. Settings panel uses shadcn/ui components (Input, Button, Label)

## Tasks / Subtasks

- [ ] Task 1: Create API Key Manager Service (AC: 3, 6)
  - [ ] Implement `api-key-manager.service.ts` in `src/main/services/ai/`
  - [ ] Use Electron `safeStorage.encryptString()` for encryption
  - [ ] Store encrypted key in userData directory as JSON
  - [ ] Implement `storeKey()`, `getKey()`, and `clearKey()` methods
  - [ ] Add error handling for encryption failures

- [ ] Task 2: Implement IPC handlers for API key operations (AC: 3, 4, 7)
  - [ ] Create `ai.handlers.ts` in `src/main/ipc/`
  - [ ] Add handler: `ai-store-key` → calls API key manager
  - [ ] Add handler: `ai-get-key` → retrieves decrypted key
  - [ ] Add handler: `ai-clear-key` → deletes stored key
  - [ ] Add handler: `ai-test-connection` → validates key with OpenAI API
  - [ ] Whitelist all handlers in `src/preload/index.ts`

- [ ] Task 3: Create AI Settings UI component (AC: 1, 2, 8)
  - [ ] Create `AISettings.tsx` in `src/renderer/src/components/Settings/`
  - [ ] Use shadcn/ui Input component with `type="password"` for key input
  - [ ] Add shadcn/ui Button components for "Test Connection" and "Save"
  - [ ] Add "Clear Key" button with confirmation
  - [ ] Implement form validation (non-empty key)

- [ ] Task 4: Implement API key testing logic (AC: 4, 5)
  - [ ] In `ai.handlers.ts`, implement `ai-test-connection`
  - [ ] Make minimal OpenAI API call (e.g., list models endpoint)
  - [ ] Return success/error response with clear messages
  - [ ] Handle network errors, invalid keys, and API errors separately
  - [ ] Display status messages in AISettings component using shadcn/ui Alert

- [ ] Task 5: Create AI state management store (AC: 6)
  - [ ] Create `aiStore.ts` in `src/renderer/src/store/`
  - [ ] Add state: `apiKeyStatus`, `hasApiKey`, `testConnectionResult`
  - [ ] Implement actions: `setApiKey()`, `clearApiKey()`, `testConnection()`
  - [ ] On app init, check if API key exists via `ai-get-key` IPC

- [ ] Task 6: Integrate AI Settings into main Settings UI (AC: 1)
  - [ ] Add "AI" tab/section to existing Settings component
  - [ ] Import and render `AISettings.tsx`
  - [ ] Ensure Settings modal/page accessible from app menu or toolbar

- [ ] Task 7: Add comprehensive error handling (AC: 5, 7)
  - [ ] Handle safeStorage unavailable (display fallback message)
  - [ ] Handle API connection failures with retry suggestion
  - [ ] Handle invalid API key format (basic validation before storage)
  - [ ] Add logging for all API key operations

- [ ] Task 8: Write unit tests for API key manager service (Testing)
  - [ ] Test encryption/decryption roundtrip
  - [ ] Test store/retrieve/clear operations
  - [ ] Mock safeStorage for testing
  - [ ] Test error cases (invalid keys, storage failures)

- [ ] Task 9: Write integration tests for AI settings flow (Testing)
  - [ ] Test complete flow: input key → test → save → retrieve
  - [ ] Test key persistence across app restarts (mock restart)
  - [ ] Test clear key functionality
  - [ ] Mock OpenAI API responses for connection testing

## Dev Notes

### Architecture Patterns

- **Process Separation**: API key storage and encryption handled entirely in main process (`src/main/services/ai/api-key-manager.service.ts`). Renderer never has direct access to encrypted keys.
- **IPC Communication**: Use typed IPC channels following existing patterns in `src/main/ipc/`. Whitelist in preload script.
- **State Management**: Zustand store (`aiStore.ts`) manages API key status and test results in renderer.
- **Security**: Electron's `safeStorage` API uses OS-level encryption (macOS Keychain). Keys never logged or exposed to renderer directly.

### Components to Create

**Main Process:**
- `src/main/services/ai/api-key-manager.service.ts` - Core key management service
- `src/main/ipc/ai.handlers.ts` - IPC handlers for AI operations

**Renderer Process:**
- `src/renderer/src/components/Settings/AISettings.tsx` - Settings UI
- `src/renderer/src/store/aiStore.ts` - Zustand state management

**Shared:**
- Update `src/preload/index.ts` - Whitelist new IPC channels

### Storage Location

- **API Key**: `~/Library/Application Support/chop-shop/ai-config.json` (encrypted)
- Uses `app.getPath('userData')` for cross-platform compatibility

### Testing Standards

- Unit tests for `api-key-manager.service.ts` with mocked safeStorage
- Integration tests for IPC flow with mocked OpenAI API
- Manual testing for actual OpenAI connection validation

### Project Structure Notes

- Follows Epic 6 tech spec structure: `src/main/services/ai/` for AI services
- Aligns with existing IPC patterns in `src/main/ipc/`
- Uses established shadcn/ui components from Epic 2, Story 2.6
- Zustand store pattern matches `recordingStore.ts`, `timelineStore.ts`

### Dependencies

- **openai** package (v4.78.0+) - Install via `npm install openai`
- Electron's `safeStorage` API (built-in, requires Electron 13+)
- shadcn/ui components: Input, Button, Label, Alert (already installed)

### References

- [Source: docs/tech-spec-epic-6.md#Services and Modules] - API Key Manager service specification
- [Source: docs/tech-spec-epic-6.md#APIs and Interfaces] - IPC handler contracts
- [Source: docs/tech-spec-epic-6.md#Security] - API key encryption requirements
- [Source: docs/tech-spec-epic-6.md#Acceptance Criteria] - Story 6.1 AC section

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->
