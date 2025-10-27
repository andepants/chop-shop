# Story 1.2: Build and Packaging System

Status: drafted

## Story

As a developer,
I want a working macOS build and packaging system,
so that I can create distributable .dmg files throughout development.

## Acceptance Criteria

1. `npm run build` creates production build successfully
2. `npm run package` generates macOS .dmg installer
3. Packaged app launches without errors on macOS
4. App icon and metadata (name, version) configured correctly
5. Build process completes in under 5 minutes

## Tasks / Subtasks

- [ ] Task 1: Configure production build settings (AC: #1)
  - [ ] Verify webpack production configuration in .erb/configs
  - [ ] Ensure proper minification and optimization settings
  - [ ] Test `npm run build` command execution
  - [ ] Verify build output in release/app directory

- [ ] Task 2: Configure electron-builder for macOS packaging (AC: #2, #4)
  - [ ] Verify build configuration in package.json
  - [ ] Configure macOS target as DMG
  - [ ] Set productName to "Chop Shop"
  - [ ] Set appId to "com.chopshop.app"
  - [ ] Configure app icon path (assets/icon.icns)
  - [ ] Test `npm run package` command execution

- [ ] Task 3: Validate packaged application (AC: #3)
  - [ ] Locate generated .dmg file in release/build directory
  - [ ] Mount .dmg and install application
  - [ ] Launch packaged app and verify it opens without errors
  - [ ] Check app displays "Hello Chop Shop" test page from Story 1.1
  - [ ] Verify app metadata (name, version) in About dialog

- [ ] Task 4: Optimize build performance (AC: #5)
  - [ ] Measure baseline build time
  - [ ] If > 5 minutes, review webpack optimization settings
  - [ ] Verify build caching is enabled
  - [ ] Document final build time

- [ ] Task 5: Write unit tests for build validation
  - [ ] Test build configuration integrity
  - [ ] Test package.json build settings validity
  - [ ] Ensure tests run successfully with `npm test`

## Dev Notes

### Build System Architecture

**electron-react-boilerplate Build System:**
- Uses electron-builder for packaging (pre-configured)
- Two-package.json structure (production/development)
- Webpack for module bundling
- Babel for transpilation
- Output directory: `release/build/`

**Critical Files:**
- `package.json` - Build configuration and metadata
- `.erb/configs/webpack.config.*.js` - Webpack configurations
- `assets/icon.icns` - macOS app icon

**Build Process Flow:**
1. `npm run build` → Webpack production build → `release/app/`
2. `npm run package` → electron-builder → `release/build/chop-shop-1.0.0.dmg`

### Project Structure Notes

**Alignment with architecture.md:**
- Build output: `release/build/chop-shop-1.0.0.dmg`
- App packaging follows deployment architecture (Section: Deployment Architecture)
- Configuration matches packaging config in architecture.md (lines 1003-1015)

**Key Paths:**
- Assets: `assets/icon.icns`
- Build output: `release/app/` (pre-packaging)
- Distribution: `release/build/` (final .dmg)

### References

- [Source: docs/PRD.md#Epic 1: Project Foundation & Setup] - "Deliverable: Packaged desktop app that launches with empty UI shell"
- [Source: docs/architecture.md#Deployment Architecture] - Build process and packaging configuration
- [Source: docs/architecture.md#Packaging Configuration] - electron-builder configuration (lines 1003-1015)
- [Source: docs/epics.md#Story 1.2] - Full acceptance criteria and prerequisites

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled during implementation -->

### Debug Log References

<!-- To be added during implementation -->

### Completion Notes List

<!-- To be added after story completion -->

### File List

<!-- To be added during implementation -->
