# Chop Shop Product Requirements Document (PRD)

**Author:** andrew
**Date:** 2025-10-27
**Project Level:** 2
**Target Scale:** Level 2 - Focused MVP set

---

## Goals and Background Context

### Goals

- Ship a working desktop video editor within 72 hours (by October 29, 10:59 PM CT)
- Enable solo content creators to record, edit, and export tutorial/demo videos with minimal friction
- Demonstrate desktop application development and FFmpeg media processing expertise
- Prove ability to make pragmatic technical decisions and ship production-grade software under extreme time constraints

### Background Context

Video editing remains technically complex and intimidating for many creators. Professional tools like Adobe Premiere have steep learning curves, while mobile apps lack the precision and power needed for serious work. Desktop editing tools should be powerful yet approachable, allowing creators to focus on content rather than fighting with software.

Chop Shop addresses this gap by providing a focused desktop video editor that combines recording and editing in one tool. Inspired by CapCut's accessible approach, Chop Shop emphasizes the core editing loop: record, import, arrange, and export. This is a 72-hour sprint project (October 27-29, 2025) with a hard deadline before relocation to Austin, demonstrating technical velocity and the ability to ship production-grade software under extreme time constraints.

---

## Requirements

### Functional Requirements

**Core Application & Import**

- FR001: Application shall launch as a native desktop application (Electron/Tauri) on macOS within 5 seconds
- FR002: Application shall support drag-and-drop import of video files (MP4, MOV, WebM formats)
- FR003: Application shall provide a file picker dialog for video import
- FR004: Application shall display imported video clips in a media library panel with thumbnail previews

**Timeline & Preview**

- FR005: Application shall provide a visual timeline interface showing imported clips with playhead/scrubber
- FR006: Application shall display video preview with Video.js player supporting play/pause controls
- FR007: Application shall synchronize playhead position between timeline and preview player
- FR008: Application shall support timeline scrubbing with real-time preview updates

**Editing Operations**

- FR009: Application shall allow users to set in/out trim points on individual clips
- FR010: Application shall support multi-clip arrangement on timeline with drag-to-reorder functionality
- FR011: Application shall support split operation at playhead position to divide clips
- FR012: Application shall allow deletion of clips from timeline

**Recording Capabilities**

- FR013: Application shall provide screen recording (full screen or window selection)
- FR014: Application shall provide webcam recording with device selection
- FR015: Application shall support picture-in-picture recording (screen + webcam simultaneously)

**Export**

- FR016: Application shall export edited timeline to MP4 format using FFmpeg
- FR017: Application shall provide resolution options for export (720p, 1080p, source quality)
- FR018: Application shall display real-time export progress indicator with percentage complete

### Non-Functional Requirements

- NFR001: **Performance** - Timeline UI shall maintain 30+ fps responsiveness with 10 or more clips loaded
- NFR002: **Stability** - Application shall operate without memory leaks during 15-minute editing sessions with zero crashes during core workflow (import → edit → export)
- NFR003: **Usability** - Preview playback shall maintain smooth 30fps minimum frame rate with synchronized audio

---

## User Journeys

### Journey: Solo Content Creator Records and Edits a Tutorial Video

**User:** Sarah, a software developer creating a coding tutorial

**Goal:** Record a screen + webcam tutorial, add existing footage, trim mistakes, and export for YouTube

**Journey Steps:**

1. **Launch Application**
   - Sarah opens Chop Shop from her Applications folder
   - App launches within 5 seconds, showing empty timeline and preview

2. **Start Recording**
   - Sarah clicks "Record" button
   - Selects "Screen + Webcam" (picture-in-picture mode)
   - Chooses her IDE window for screen capture
   - Selects built-in webcam and microphone
   - Clicks "Start Recording" and begins tutorial

3. **Complete Recording**
   - Sarah finishes her 10-minute tutorial
   - Clicks "Stop Recording"
   - Recording automatically appears in media library and timeline

4. **Import Additional Footage**
   - Sarah has a pre-recorded intro video on her desktop
   - Drags intro.mp4 file into Chop Shop media library
   - Drags intro clip to beginning of timeline before main recording

5. **Review and Trim**
   - Sarah plays back the full sequence in preview
   - Notices she stumbled at the beginning of main recording
   - Sets in-point at 0:15 to trim awkward start
   - Finds another mistake at 6:30, splits the clip
   - Trims out 30-second mistake section
   - Deletes the mistake clip from timeline

6. **Final Review**
   - Sarah scrubs through timeline to verify edits
   - Plays full timeline to check flow
   - Satisfied with the result

7. **Export**
   - Sarah clicks "Export"
   - Selects "1080p" resolution
   - Chooses output location (Desktop/tutorial.mp4)
   - Clicks "Export" and watches progress bar
   - Export completes in ~2 minutes

8. **Success**
   - Sarah opens exported video in QuickTime
   - Verifies video plays correctly with audio synced
   - Uploads to YouTube successfully

**Total Time:** ~20 minutes from launch to upload-ready video

---

## UX Design Principles

- **Immediate Usability**: Core actions (record, import, trim, export) accessible within one click from main view
- **Visual Clarity**: Timeline and preview dominate the interface; minimal chrome and distractions
- **Progressive Disclosure**: Advanced features hidden until needed; MVP focuses on essential workflow
- **Speed Over Polish**: Functional and responsive over visually elaborate

---

## User Interface Design Goals

**Visual Reference:** `docs/design/capcut_reference.jpg` - CapCut-inspired interface (simplified)

**Layout Structure:**

- **Left Sidebar**: Media library with import area (drag-and-drop zone) and Record button
- **Center**: Large video preview player
- **Right Sidebar**: Clip details and properties panel
- **Bottom**: Timeline with playhead, zoom controls, and basic editing tools (split, trim, delete)
- **Top Bar**: Project title, Export button

**Simplified from CapCut Reference:**

- **Remove**: AI media, avatars, text tools, stickers, effects, transitions, captions, filters, adjustments
- **Keep**: Media import, Record button, Timeline, Preview player, Export, basic trim/split/delete tools
- **Focus**: Clean 3-panel layout (media/preview/timeline) with minimal toolbar

**Visual Design:**

- Dark theme for video editing context
- High contrast for playhead and selected clips
- Accent color (cyan/teal) for primary actions (Export button)
- Simple, functional UI that can be built within 72-hour sprint

---

## Epic List

### Epic Structure for 72-Hour Sprint

**Epic 1: Project Foundation & Setup**

- Goal: Establish Electron desktop application with deployable build system and basic UI shell
- Estimated stories: 3-4 stories
- Deliverable: Packaged desktop app that launches with empty UI shell

**Epic 2: Media Import & Timeline Foundation**

- Goal: Enable video import and create functional timeline with playback controls
- Estimated stories: 4-5 stories
- Deliverable: User can import videos, see them in media library, drag to timeline, and play in preview

**Epic 3: Editing & Export (MVP Checkpoint)**

- Goal: Implement trim/split operations and FFmpeg export pipeline
- Estimated stories: 4-5 stories
- Deliverable: User can trim/split clips and export to MP4
- **HARD GATE: Due Tuesday, October 28, 10:59 PM CT**

**Epic 4: Recording Capabilities & Enhanced Editing**

- Goal: Add screen/webcam recording, picture-in-picture, and multi-clip timeline enhancements
- Estimated stories: 5-7 stories
- Deliverable: Full recording suite with enhanced timeline (drag-reorder, multiple clips, complete workflow)
- **Final Submission: Due Wednesday, October 29, 10:59 PM CT**

**Total: 4 epics, 16-21 stories**

### Epic Dependencies

- Epic 2 builds on Epic 1 (needs app shell)
- Epic 3 builds on Epic 2 (needs timeline + preview)
- Epic 4 builds on Epic 3 (needs complete editing pipeline)
- No forward dependencies - each epic completes foundation for next

> **Note:** Detailed epic breakdown with full story specifications is available in [epics.md](./epics.md)

---

## Out of Scope

**Deferred to Future Phases:**

- Text overlays and custom fonts
- Transitions (fade, slide, dissolve)
- Audio controls (volume adjustments, fade in/out)
- Color correction and filters
- Visual effects and stickers
- Project save/load functionality
- Undo/redo system
- Keyboard shortcuts
- Auto-save functionality

**Platform Limitations:**

- Windows and Linux builds (macOS only for sprint)
- Mobile companion app
- Browser-based version
- Cloud upload/sharing features

**Advanced Features:**

- AI-powered features (auto-captions via Whisper - reserved for optional Epic 5)
- GPU-accelerated rendering
- Plugin architecture for effects
- Export presets (YouTube, Instagram, TikTok)
- Asset libraries (stock footage, music, sound effects)
- Multi-track audio editing
- Advanced timeline features (snap-to-grid, markers, nested sequences)

**Integration & Collaboration:**

- Cloud collaboration features
- Team/enterprise features
- Social media direct publishing
- Third-party integrations

**Scope Boundaries:**

- Professional-grade color grading
- Multi-camera editing
- 360° video support
- 4K+ export (max 1080p)
