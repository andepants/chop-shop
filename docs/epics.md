# Chop Shop - Epic Breakdown

**Author:** andrew
**Date:** 2025-10-27
**Project Level:** 2
**Target Scale:** Level 2 - Focused MVP set

---

## Overview

This document provides the detailed epic breakdown for Chop Shop, expanding on the high-level epic list in the [PRD](./PRD.md).

Each epic includes:

- Expanded goal and value proposition
- Complete story breakdown with user stories
- Acceptance criteria for each story
- Story sequencing and dependencies

**Epic Sequencing Principles:**

- Epic 1 establishes foundational infrastructure and initial functionality
- Subsequent epics build progressively, each delivering significant end-to-end value
- Stories within epics are vertically sliced and sequentially ordered
- No forward dependencies - each story builds only on previous work

---

## Epic 1: Project Foundation & Setup

**Expanded Goal:**

Establish the foundational Electron desktop application with a working build/packaging system and basic UI shell. This epic creates the technical foundation that all subsequent features will build upon. By the end, we'll have a distributable macOS app that launches successfully with an empty but properly structured interface matching the CapCut-inspired layout.

**Value Delivery:**

Proves technical feasibility early, establishes development workflow, and creates a deployable baseline. This is critical for identifying any build/packaging issues before the MVP checkpoint.

---

### Story Breakdown

**Story 1.1: Electron Project Setup**

As a developer,
I want an Electron project initialized with React and TypeScript,
So that I have a solid foundation for building the desktop application.

**Acceptance Criteria:**

1. Electron project created with `electron-builder` for packaging
2. React + TypeScript configured with hot reload in development
3. Main process and renderer process communication (IPC) working
4. Dev server launches and displays "Hello Chop Shop" test page
5. Project structure follows Electron best practices (main/renderer separation)

**Prerequisites:** None

---

**Story 1.2: Build and Packaging System**

As a developer,
I want a working macOS build and packaging system,
So that I can create distributable .dmg files throughout development.

**Acceptance Criteria:**

1. `npm run build` creates production build successfully
2. `npm run package` generates macOS .dmg installer
3. Packaged app launches without errors on macOS
4. App icon and metadata (name, version) configured correctly
5. Build process completes in under 5 minutes

**Prerequisites:** Story 1.1

---

**Story 1.3: UI Shell with 3-Panel Layout**

As a content creator,
I want to see the basic application layout when I launch Chop Shop,
So that I understand where media, preview, and timeline will appear.

**Acceptance Criteria:**

1. Dark theme UI shell implemented matching CapCut reference
2. Left sidebar (media library area) renders with placeholder
3. Center preview area renders with placeholder
4. Bottom timeline area renders with placeholder
5. Top bar with "Chop Shop" title and Export button (disabled) renders
6. Layout is responsive and maintains proportions when window resizes

**Prerequisites:** Story 1.2

---

**Story 1.4: FFmpeg Integration Setup**

As a developer,
I want FFmpeg binaries bundled and accessible from the Electron app,
So that I can process video files for export.

**Acceptance Criteria:**

1. FFmpeg binaries bundled with application (using `ffmpeg-static` or similar)
2. Main process can execute FFmpeg commands successfully
3. Simple test export (any video → MP4) works to validate integration
4. FFmpeg stdout/stderr captured for progress monitoring
5. Error handling implemented for FFmpeg failures

**Prerequisites:** Story 1.2

---

## Epic 2: Media Import & Timeline Foundation

**Expanded Goal:**

Enable users to import video files into Chop Shop and create a functional timeline with playback controls. This epic establishes the core editing interface where users can see their media, arrange clips on a timeline, and preview playback. By completion, users can import videos, drag them to the timeline, and watch them play in the preview window.

**Value Delivery:**

Creates the fundamental editing workflow loop: import → arrange → preview. Without this foundation, no editing operations can occur. This sets up the visual timeline structure that will support trim/split operations in Epic 3.

---

### Story Breakdown

**Story 2.1: Drag-and-Drop Video Import**

As a content creator,
I want to drag video files from my desktop into Chop Shop,
So that I can quickly add media to my project.

**Acceptance Criteria:**

1. Left sidebar displays drag-and-drop zone with instructions
2. User can drag MP4, MOV, or WebM files into the import area
3. Dropped files trigger file validation (format, readability)
4. Valid video files show thumbnail preview in media library
5. Invalid files show error message with supported formats list
6. Multiple files can be imported simultaneously

**Prerequisites:** Story 1.3

---

**Story 2.2: File Picker Import Dialog**

As a content creator,
I want to click an Import button to browse for video files,
So that I can add media without drag-and-drop.

**Acceptance Criteria:**

1. "Import" button visible in left sidebar
2. Clicking Import opens native file picker dialog (via Electron)
3. File picker filters to show only MP4, MOV, WebM files
4. Selected files appear in media library with thumbnails
5. User can select multiple files in single file picker operation
6. Import process shows loading indicator for large files

**Prerequisites:** Story 2.1

---

**Story 2.3: Media Library Display**

As a content creator,
I want to see all my imported media in a library panel,
So that I can manage and select clips for my timeline.

**Acceptance Criteria:**

1. Media library shows thumbnail, filename, and duration for each clip
2. Thumbnails generated from first frame of video
3. Clicking a clip selects it (visual highlight)
4. Selected clip can be dragged to timeline
5. Media library scrolls if content exceeds visible area
6. Clips display file size and resolution metadata

**Prerequisites:** Story 2.2

---

**Story 2.4: Timeline Clip Placement and Display**

As a content creator,
I want to drag clips from media library to the timeline,
So that I can arrange my video sequence.

**Acceptance Criteria:**

1. Timeline renders as horizontal track at bottom of screen
2. User can drag clip from media library to timeline
3. Dropped clip appears on timeline with thumbnail strip
4. Clip shows duration and position on timeline ruler (time markers)
5. Multiple clips can be placed sequentially on timeline
6. Timeline automatically adjusts zoom to fit all clips initially
7. Playhead indicator visible at timeline start (position 0:00)

**Prerequisites:** Story 2.3

---

**Story 2.5: Video Preview Player and Playback Controls**

As a content creator,
I want to play timeline content in the preview window,
So that I can review my video sequence.

**Acceptance Criteria:**

1. HTML5 video player renders in center preview area
2. Clicking timeline clip loads it in preview player
3. Play/pause button controls playback
4. Playhead moves along timeline synchronized with playback
5. Preview displays current time and total duration
6. Seeking on timeline updates preview to that timestamp
7. Audio plays synchronized with video during playback

**Prerequisites:** Story 2.4

---

## Epic 3: Editing & Export (MVP Checkpoint)

**Expanded Goal:**

Implement core editing operations (trim, split, delete) and the FFmpeg export pipeline. This epic completes the MVP by enabling users to edit their timeline and produce a final MP4 video file. By completion, the full editing loop works: import → arrange → trim/split → export.

**Value Delivery:**

This is the **HARD GATE for Tuesday, October 28, 10:59 PM CT**. Successful completion proves you can ship a working video editor. Users can create real, usable video content. Without this, the project fails the MVP checkpoint.

---

### Story Breakdown

**Story 3.1: Clip Trim with In/Out Points**

As a content creator,
I want to set trim points on a clip to remove unwanted sections,
So that I can include only the desired portions of my footage.

**Acceptance Criteria:**

1. User can select a clip on timeline to enable trim mode
2. Trim handles appear at clip start and end
3. Dragging trim handles adjusts in/out points visually
4. Preview updates to show trimmed region during adjustment
5. Timeline displays trimmed duration accurately
6. Trimmed clip plays only the selected region in preview
7. Original imported media remains unchanged (non-destructive editing)

**Prerequisites:** Story 2.5

---

**Story 3.2: Split Clip at Playhead**

As a content creator,
I want to split a clip at the playhead position,
So that I can separate sections and remove unwanted parts.

**Acceptance Criteria:**

1. "Split" button available in timeline toolbar
2. User positions playhead on a clip and clicks Split
3. Selected clip splits into two separate clips at playhead position
4. Both resulting clips appear on timeline with correct durations
5. Split clips can be individually selected, moved, or deleted
6. Split operation is immediate (no loading delay)

**Prerequisites:** Story 3.1

---

**Story 3.3: Delete Clip from Timeline**

As a content creator,
I want to delete clips I don't need from the timeline,
So that I can remove mistakes or unwanted footage.

**Acceptance Criteria:**

1. User can select a clip on timeline
2. Delete button or keyboard shortcut (Delete/Backspace key) removes selected clip
3. Remaining clips automatically shift left to close gap
4. Timeline updates playhead position if it was on deleted clip
5. Deleted clip disappears from timeline but remains in media library
6. User can delete multiple clips sequentially

**Prerequisites:** Story 3.2

---

**Story 3.4: Drag-to-Reorder Timeline Clips**

As a content creator,
I want to drag clips to reorder them on the timeline,
So that I can arrange my video sequence in any order.

**Acceptance Criteria:**

1. User can click and drag a timeline clip to a new position
2. Clips automatically shift to make space during drag operation
3. Drop clip between other clips to insert at that position
4. Timeline updates time markers after reordering
5. Preview updates to show reordered sequence during playback
6. Drag operation is smooth with visual feedback (ghost/preview)

**Prerequisites:** Story 3.3

---

**Story 3.5: Export Timeline to MP4**

As a content creator,
I want to export my edited timeline as an MP4 file,
So that I can share my video or upload it to platforms.

**Acceptance Criteria:**

1. Export button in top bar becomes enabled when timeline has clips
2. Clicking Export opens export dialog with settings:
   - Resolution options: 720p, 1080p, Source quality
   - Output file location picker
3. Export process starts and displays progress bar with percentage
4. FFmpeg processes timeline clips in sequence with proper encoding
5. Exported MP4 file plays correctly in external player (QuickTime, VLC)
6. Audio and video remain synchronized in exported file
7. Export completes without memory leaks or crashes
8. User receives success notification with file location

**Prerequisites:** Story 3.4

---

**🚨 CRITICAL: Epic 3 must be complete by Tuesday, October 28, 10:59 PM CT - MVP CHECKPOINT**

---

## Epic 4: Recording Capabilities & Enhanced Editing

**Expanded Goal:**

Add recording capabilities (screen, webcam, picture-in-picture) and enhance the timeline with multi-track support and zoom controls. This epic transforms Chop Shop from a basic editor into a complete recording + editing solution. Users can now record their content directly in the app, layer tracks (main + overlay), and perform precision editing.

**Value Delivery:**

Completes the full product vision: record → edit → export. This is your **FINAL SUBMISSION for Wednesday, October 29, 10:59 PM CT**. With this epic, users have a fully functional tutorial/demo video creation tool.

---

### Story Breakdown

**Story 4.1: Multi-Track Timeline (2 Tracks)**

As a content creator,
I want to place clips on multiple timeline tracks,
So that I can create picture-in-picture or overlay effects.

**Acceptance Criteria:**

1. Timeline displays 2 horizontal tracks: Track 1 (main) and Track 2 (overlay)
2. Users can drag clips from media library to either track
3. Track 2 clips render on top of Track 1 in preview (overlay/PiP positioning)
4. Each track independently supports trim, split, delete operations
5. Playhead synchronizes across both tracks during playback
6. Export renders both tracks composited into single output video
7. Track 2 clips show visual indicator (border/label) distinguishing from Track 1

**Prerequisites:** Story 3.5

---

**Story 4.2: Timeline Zoom Controls**

As a content creator,
I want to zoom in and out on the timeline,
So that I can perform precise editing on specific sections.

**Acceptance Criteria:**

1. Zoom controls (+ / - buttons or slider) visible in timeline toolbar
2. Zoom in increases timeline scale, showing more detail per clip
3. Zoom out decreases timeline scale, showing more clips in view
4. Playhead position maintains visual alignment during zoom
5. Zoom level persists during editing session
6. Keyboard shortcuts (Cmd/Ctrl + / Cmd/Ctrl -) for zoom operations
7. Timeline remains smooth and responsive during zoom (30fps minimum)

**Prerequisites:** Story 4.1

---

**Story 4.3: Screen Recording Setup**

As a content creator,
I want to record my screen,
So that I can capture tutorials and demonstrations.

**Acceptance Criteria:**

1. "Record" button visible in left sidebar
2. Clicking Record opens recording setup modal
3. User can select recording mode: "Screen Only"
4. User can choose full screen or specific window/application
5. Preview shows what will be recorded before starting
6. Audio source selection (microphone, system audio, both, or none)
7. "Start Recording" button initiates countdown (3-2-1) then begins capture

**Prerequisites:** Story 4.2

---

**Story 4.4: Webcam Recording**

As a content creator,
I want to record from my webcam,
So that I can capture talking head videos or reactions.

**Acceptance Criteria:**

1. Recording setup modal includes "Webcam Only" mode option
2. User can select from available webcam devices
3. Live webcam preview shown in setup modal
4. Audio recording from selected microphone included
5. Recording starts after countdown (3-2-1)
6. Stop button visible during recording to end capture
7. Completed recording automatically imports to media library and timeline

**Prerequisites:** Story 4.3

---

**Story 4.5: Picture-in-Picture Recording (Screen + Webcam)**

As a content creator,
I want to record screen and webcam simultaneously,
So that I can create tutorials with my face visible.

**Acceptance Criteria:**

1. Recording setup modal includes "Screen + Webcam (PiP)" mode
2. User selects screen source (full screen or window) AND webcam device
3. Webcam preview overlay shows position on screen preview (adjustable corner/size)
4. Both screen and webcam captured as separate video streams
5. Recording produces 2 clips: screen recording (Track 1) and webcam (Track 2)
6. Both clips automatically placed on timeline in correct tracks
7. Webcam clip positioned as overlay/PiP in preview compositing

**Prerequisites:** Story 4.4

---

**Story 4.6: Recording Stop and Auto-Import**

As a content creator,
I want my recording to stop cleanly and automatically appear in my timeline,
So that I can immediately begin editing without manual import.

**Acceptance Criteria:**

1. "Stop Recording" button accessible during any recording mode
2. Clicking Stop ends recording immediately and saves files
3. Recording files processed and optimized for editing (codec conversion if needed)
4. Completed recording(s) automatically added to media library with thumbnails
5. For PiP recordings, both clips automatically placed on correct timeline tracks
6. Recording files stored in organized temp directory structure
7. User sees success notification with recording duration

**Prerequisites:** Story 4.5

---

**Story 4.7: Enhanced Preview with Multi-Track Compositing**

As a content creator,
I want to see my multi-track timeline rendered correctly in preview,
So that I can verify my picture-in-picture and overlay effects.

**Acceptance Criteria:**

1. Preview player renders Track 2 clips overlaid on Track 1 clips
2. Webcam/PiP clips display in appropriate corner with correct size
3. Real-time playback shows composited multi-track result
4. Audio from both tracks mixed appropriately (Track 1 primary, Track 2 secondary)
5. Scrubbing updates preview with correct multi-track composition
6. Preview maintains 30fps smooth playback with 2 tracks

**Prerequisites:** Story 4.6

---

**📅 FINAL DEADLINE: Wednesday, October 29, 10:59 PM CT**

---

---

## Story Guidelines Reference

**Story Format:**

```
**Story [EPIC.N]: [Story Title]**

As a [user type],
I want [goal/desire],
So that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]
3. [etc.]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**

- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
