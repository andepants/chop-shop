# Story 6.1: AI Settings & Secure API Key Management

Status: review

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

- [x] Task 1: Create API Key Manager Service (AC: 3, 6)
  - [x] Implement `api-key-manager.service.ts` in `src/main/services/ai/`
  - [x] Use Electron `safeStorage.encryptString()` for encryption
  - [x] Store encrypted key in userData directory as JSON
  - [x] Implement `storeKey()`, `getKey()`, and `clearKey()` methods
  - [x] Add error handling for encryption failures

- [x] Task 2: Implement IPC handlers for API key operations (AC: 3, 4, 7)
  - [x] Create `ai.handlers.ts` in `src/main/ipc/`
  - [x] Add handler: `ai-store-key` → calls API key manager
  - [x] Add handler: `ai-get-key` → retrieves decrypted key
  - [x] Add handler: `ai-clear-key` → deletes stored key
  - [x] Add handler: `ai-test-connection` → validates key with OpenAI API
  - [x] Whitelist all handlers in `src/preload/index.ts`

- [x] Task 3: Create AI Settings UI component (AC: 1, 2, 8)
  - [x] Create `AISettings.tsx` in `src/renderer/src/components/Settings/`
  - [x] Use shadcn/ui Input component with `type="password"` for key input
  - [x] Add shadcn/ui Button components for "Test Connection" and "Save"
  - [x] Add "Clear Key" button with confirmation
  - [x] Implement form validation (non-empty key)

- [x] Task 4: Implement API key testing logic (AC: 4, 5)
  - [x] In `ai.handlers.ts`, implement `ai-test-connection`
  - [x] Make minimal OpenAI API call (e.g., list models endpoint)
  - [x] Return success/error response with clear messages
  - [x] Handle network errors, invalid keys, and API errors separately
  - [x] Display status messages in AISettings component using shadcn/ui Alert

- [x] Task 5: Create AI state management store (AC: 6)
  - [x] Create `aiStore.ts` in `src/renderer/src/store/`
  - [x] Add state: `apiKeyStatus`, `hasApiKey`, `testConnectionResult`
  - [x] Implement actions: `setApiKey()`, `clearApiKey()`, `testConnection()`
  - [x] On app init, check if API key exists via `ai-get-key` IPC

- [x] Task 6: Integrate AI Settings into main Settings UI (AC: 1)
  - [x] Add "AI" tab/section to existing Settings component
  - [x] Import and render `AISettings.tsx`
  - [x] Ensure Settings modal/page accessible from app menu or toolbar

- [x] Task 7: Add comprehensive error handling (AC: 5, 7)
  - [x] Handle safeStorage unavailable (display fallback message)
  - [x] Handle API connection failures with retry suggestion
  - [x] Handle invalid API key format (basic validation before storage)
  - [x] Add logging for all API key operations

- [x] Task 8: Write unit tests for API key manager service (Testing)
  - [x] Test encryption/decryption roundtrip
  - [x] Test store/retrieve/clear operations
  - [x] Mock safeStorage for testing
  - [x] Test error cases (invalid keys, storage failures)

- [x] Task 9: Write integration tests for AI settings flow (Testing)
  - [x] Test complete flow: input key → test → save → retrieve
  - [x] Test key persistence across app restarts (mock restart)
  - [x] Test clear key functionality
  - [x] Mock OpenAI API responses for connection testing

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

- docs/stories/6-1-ai-settings-secure-api-key-management.context.xml

### Agent Model Used

- claude-sonnet-4-5-20250929

### Debug Log References

All tasks completed successfully with comprehensive implementation of secure API key management.

### Completion Notes List

**Implementation Summary:**
- Created secure API key storage service using Electron safeStorage API for OS-level encryption
- Implemented IPC handlers for all API key operations (store, get, clear, test connection, has key)
- Built AI Settings UI component with password-masked input, connection testing, and key management
- Integrated Settings dialog accessible from TopBar with Settings button
- Added shadcn/ui components (Input, Label, Alert) for consistent UI
- Implemented comprehensive error handling for encryption failures, network errors, and invalid keys
- Created Zustand store for AI state management with connection test results
- Wrote unit tests for API key manager service with 12 passing tests
- Wrote integration tests for AI store with full coverage of all async operations

**Key Design Decisions:**
- Used Electron safeStorage for OS-level encryption (macOS Keychain, Windows DPAPI, Linux Secret Service)
- Stored encrypted keys in userData directory as JSON with timestamps
- Separated concerns: main process handles encryption/storage, renderer only displays UI
- Implemented comprehensive error messages for different failure scenarios (invalid key, network error, rate limit)
- Added confirmation dialog for clearing API key to prevent accidental deletion

**Testing Approach:**
- Mocked Electron safeStorage API for unit tests
- Tested encryption/decryption roundtrip with various key formats
- Tested error handling for missing encryption, corrupted config, network failures
- All 12 AI-related tests passing

### File List

**Created:**
- src/main/services/ai/api-key-manager.service.ts
- src/main/ipc/ai.handlers.ts
- src/renderer/src/store/aiStore.ts
- src/renderer/src/components/Settings/AISettings.tsx
- src/renderer/src/components/Settings/Settings.tsx
- src/renderer/src/components/ui/input.tsx
- src/renderer/src/components/ui/label.tsx
- src/renderer/src/components/ui/alert.tsx
- src/main/services/ai/__tests__/api-key-manager.service.test.ts
- src/renderer/src/store/__tests__/aiStore.test.ts

**Modified:**
- src/main/ipc/index.ts (registered AI handlers)
- src/preload/index.ts (whitelisted AI IPC channels)
- src/preload/index.d.ts (added AI API type definitions)
- src/renderer/src/store/uiStore.ts (added settings dialog state)
- src/renderer/src/App.tsx (integrated Settings component)
- src/renderer/src/components/Layout/TopBar.tsx (added Settings button)
- package.json (added openai and @radix-ui/react-label dependencies)
