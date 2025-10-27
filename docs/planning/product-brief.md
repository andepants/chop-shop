# Product Brief: Chop Shop Desktop Video Editor

**Date:** October 27, 2025
**Author:** Andre
**Status:** Active Development Sprint

---

## Executive Summary

Chop Shop is a native desktop video editor built to ship in 72 hours (October 27-29, 2025). Inspired by CapCut's accessible approach to video editing, Chop Shop focuses on the core editing loop: record, import, arrange, and export. This is a sprint project that prioritizes pragmatic execution and working software over feature completeness, with a hard deadline before relocation to Austin on October 30th.

The project demonstrates velocity, technical breadth across media processing and desktop development, and the ability to ship production-grade software under extreme time constraints.

---

## Problem Statement

Video editing remains technically complex and intimidating for many creators. Professional tools like Adobe Premiere have steep learning curves, while mobile apps lack the precision and power needed for serious work. Desktop editing tools should be powerful yet approachable, allowing creators to focus on content rather than fighting with software.

This project solves the personal challenge of building a complete desktop application with media processing capabilities in an extremely compressed timeline, demonstrating ability to ship under pressure.

---

## Proposed Solution

A native desktop video editor built with Electron or Tauri that provides:

- **Native recording capabilities**: Screen capture, webcam, and picture-in-picture
- **Intuitive timeline interface**: Visual arrangement, trimming, splitting, and multi-track editing
- **Real-time preview**: Synchronized playback with scrubbing and audio
- **Professional export**: MP4 output with resolution options and encoding progress

The application focuses on the essential editing workflow without unnecessary complexity, shipping a working product that creators can use immediately.

---

## Target Users

### Primary User Segment

**Solo content creators** who need to quickly produce screen recordings, tutorials, or demo videos. They value speed and simplicity over advanced features and need reliable software that "just works" for basic editing tasks.

- Age: 18-45
- Technical comfort: Medium to high
- Use case: Tutorial videos, demo recordings, social media content
- Pain point: Existing tools are too complex or don't support their workflow

### Secondary User Segment

**Developers and technical evaluators** reviewing this as a portfolio project. They're assessing technical execution, architecture decisions, and ability to deliver under constraints.

- Looking for: Clean code, pragmatic technical choices, working software
- Evaluating: Desktop development skills, media processing knowledge, delivery speed
- Key interest: Can the developer ship production-grade software in 72 hours?

---

## Goals and Success Metrics

### Business Objectives

**Primary Goal**: Complete a shippable desktop video editor within 72 hours (by October 29, 10:59 PM CT)

**Secondary Goals**:

- Demonstrate desktop application development expertise
- Show media processing and FFmpeg integration knowledge
- Prove ability to make pragmatic technical decisions under pressure
- Build portfolio-worthy project before Austin relocation

### User Success Metrics

- User can record screen + webcam without crashes
- User can import, arrange, and trim clips in under 5 minutes (first use)
- User can export a multi-clip video successfully on first attempt
- Application launches in under 5 seconds
- Timeline remains responsive with 10+ clips

### Key Performance Indicators (KPIs)

**Technical KPIs**:

- MVP checkpoint passed by Tuesday 10:59 PM CT (October 28)
- Final submission ready by Wednesday 10:59 PM CT (October 29)
- Application successfully builds and packages for distribution
- Zero crashes during core workflow testing (import → edit → export)

**Performance KPIs**:

- Timeline UI: 30+ fps with 10 clips
- App launch: < 5 seconds cold start
- Export: No memory leaks during 15-minute editing sessions
- Preview playback: Smooth 30fps minimum

---

## Strategic Alignment and Financial Impact

### Financial Impact

This is a portfolio/learning project with no direct financial impact. The value is in:

- Demonstrating technical capabilities to potential employers/clients
- Building reusable knowledge in desktop and media processing
- Creating a foundation for potential future commercial tools

### Company Objectives Alignment

N/A - Personal project

### Strategic Initiatives

**Career Development**: Builds expertise in desktop application development and media processing, valuable skills for video/media product companies.

**Portfolio Enhancement**: Demonstrates ability to:

- Ship complete products under extreme deadlines
- Make pragmatic technical tradeoffs
- Build native applications with complex requirements
- Integrate third-party libraries (FFmpeg) effectively

---

## MVP Scope

### Core Features (Must Have)

**By Tuesday, October 28 at 10:59 PM CT:**

1. **Desktop Application**
   - Launches successfully (Electron or Tauri)
   - Native app packaging (not just dev mode)

2. **Video Import**
   - Drag & drop support (MP4/MOV files)
   - File picker dialog
   - Displays imported clips

3. **Timeline View**
   - Visual timeline showing clips
   - Playhead/scrubber
   - Basic clip visualization

4. **Video Preview**
   - Plays imported clips
   - Basic playback controls (play/pause)

5. **Trim Functionality**
   - Set in/out points on single clip
   - Basic trim interface

6. **Export**
   - Export to MP4 format
   - Single clip export works reliably

**Critical**: MVP proves ability to handle media files in desktop context. Without this checkpoint, project fails.

### Out of Scope for MVP

- Screen/webcam recording
- Multi-clip arrangement
- Advanced timeline features (split, multi-track)
- Real-time preview of edits
- Resolution options
- Text overlays, transitions, effects
- Cloud upload/sharing
- Keyboard shortcuts
- Undo/redo

### MVP Success Criteria

✅ Application builds and packages successfully
✅ User can import a video file
✅ User can see video in preview player
✅ User can trim video (set start/end points)
✅ User can export trimmed video to MP4
✅ Exported video plays correctly in external player

---

## Post-MVP Vision

### Phase 2 Features (Tuesday Night - Wednesday)

**Recording Capabilities**:

- Screen recording (full screen or window)
- Webcam recording
- Picture-in-picture (screen + webcam)
- Audio capture from microphone

**Enhanced Timeline**:

- Multi-clip arrangement
- Drag clips to reorder
- Split clips at playhead
- Delete clips from timeline
- Multiple tracks (2 minimum)
- Snap-to-grid/clip edges
- Zoom controls

**Improved Preview**:

- Real-time timeline preview
- Audio synchronization
- Scrubbing with audio feedback

**Better Export**:

- Resolution options (720p, 1080p, source)
- Progress indicator
- Export settings UI

**Media Management**:

- Media library panel
- Thumbnail previews
- Metadata display (duration, resolution, size)

### Long-term Vision (If Continued Beyond Sprint)

- Text overlays with custom fonts
- Transitions (fade, slide, dissolve)
- Audio controls (volume, fade in/out)
- Color correction and filters
- Export presets (YouTube, Instagram, TikTok)
- Keyboard shortcuts for all actions
- Project save/load
- Undo/redo system
- Plugin architecture for effects
- GPU-accelerated rendering

### Expansion Opportunities

- Cloud collaboration features
- Asset libraries (stock footage, music, effects)
- AI-powered features (auto-captions, smart cropping)
- Mobile companion app
- Browser-based version
- Team/enterprise features

---

## Technical Considerations

### Platform Requirements

**Desktop Platforms**:

- macOS (primary development and testing)
- Windows (secondary, if time permits)
- Linux (stretch goal)

**Minimum System Requirements**:

- 8GB RAM
- Dual-core processor
- 2GB free disk space
- OpenGL 2.0 or better

### Technology Preferences

**Desktop Framework**:

- **Electron** (Recommended): More mature, extensive documentation, larger community, proven for media apps
- **Tauri** (Alternative): Smaller bundle size, Rust-based, better performance but less mature ecosystem

**Frontend Framework**:

- React (preferred for speed and familiarity)
- Vue or Svelte (acceptable alternatives)
- Vanilla JS (if no build complexity desired)

**Media Processing**:

- **FFmpeg** (Required): Industry standard for video processing
  - `fluent-ffmpeg` for Node.js integration
  - `@ffmpeg/ffmpeg` for WebAssembly fallback
  - Native FFmpeg binaries bundled with app

**Timeline Implementation**:

- HTML5 Canvas for performance
- Fabric.js or Konva.js for interactive objects
- Custom CSS/DOM solution for simpler approach

**Video Playback**:

- HTML5 `<video>` element (simplest)
- Video.js (more features, better controls)
- Plyr (modern, lightweight)

### Architecture Considerations

**Separation of Concerns**:

- **Main Process**: File system access, FFmpeg operations, native dialogs
- **Renderer Process**: UI, timeline, preview player
- **IPC**: Communication between processes

**Media Pipeline**:

```
Import → Decode (FFmpeg) → Timeline Representation → Preview (HTML5) → Export (FFmpeg Encode)
```

**State Management**:

- Timeline state (clips, tracks, edits)
- Preview state (playhead position, playing/paused)
- Export state (progress, settings)

**Performance Optimization**:

- Lazy load thumbnails
- Virtual scrolling for long timelines
- Web Workers for heavy computation
- RequestAnimationFrame for smooth playback
- Debounce/throttle for scrubbing

**File Management**:

- Temporary directory for recordings
- Project file format (JSON)
- Cleanup strategy for temp files

---

## Constraints and Assumptions

### Constraints

**Time**: 72 hours total (October 27-29, 2025)

- Must pass MVP checkpoint by Tuesday 10:59 PM CT
- Final submission by Wednesday 10:59 PM CT
- Cannot extend beyond October 29th due to relocation

**Resources**: Solo developer (no team)

**Scope**: Desktop-only (no web, no mobile)

**Technical**:

- Must use FFmpeg (no alternative video processing libraries)
- Must be native app (not Electron wrapper around web app)
- Must package and distribute (not just dev mode)

### Key Assumptions

**Technical Assumptions**:

- FFmpeg binaries can be bundled with app
- HTML5 video element handles common formats (MP4, MOV, WebM)
- Desktop APIs provide adequate screen/webcam capture
- Export doesn't require GPU acceleration (CPU encoding acceptable)

**User Assumptions**:

- Users have basic video editing knowledge
- Users work with standard video formats
- Users have modern computers (< 5 years old)
- Users don't need advanced color grading or effects

**Scope Assumptions**:

- Simple is better than feature-rich
- Working software beats perfect architecture
- MVP can be ugly but must be functional
- Documentation can be minimal but must be clear

---

## Risks and Open Questions

### Key Risks

**Technical Risks**:

1. **FFmpeg Integration Complexity** (HIGH)
   - Risk: FFmpeg configuration and compilation issues
   - Impact: Cannot export videos, project fails
   - Mitigation: Test export with single clip ASAP (within first 12 hours)

2. **Performance Issues** (MEDIUM)
   - Risk: Timeline UI lags with multiple clips
   - Impact: Poor user experience, unusable product
   - Mitigation: Use Canvas instead of DOM, test with 10+ clips early

3. **Platform-Specific APIs** (MEDIUM)
   - Risk: Screen/webcam capture works differently on Mac/Windows/Linux
   - Impact: Features broken on some platforms
   - Mitigation: Focus on macOS first, use web APIs where possible

4. **Export Encoding Time** (LOW)
   - Risk: Export takes too long for user acceptance
   - Impact: Users abandon app during export
   - Mitigation: Show progress indicator, optimize FFmpeg settings

5. **Memory Leaks** (MEDIUM)
   - Risk: Video processing causes memory buildup
   - Impact: App crashes during long sessions
   - Mitigation: Test 15-minute editing session, clean up resources properly

**Scope Risks**:

1. **Feature Creep** (HIGH)
   - Risk: Adding "just one more feature" destroys timeline
   - Impact: Nothing ships, project fails
   - Mitigation: Ruthlessly prioritize MVP, defer everything non-critical

2. **Packaging/Distribution Issues** (MEDIUM)
   - Risk: App builds in dev but fails to package
   - Impact: Can't distribute final product
   - Mitigation: Create distributable build by Tuesday night

### Open Questions

**Technical Questions**:

- Electron vs Tauri: Which ships faster? (Decision: Electron for maturity)
- FFmpeg: Bundle or require user install? (Decision: Bundle for better UX)
- Timeline: Canvas or DOM? (Decision: Start with DOM, move to Canvas if needed)
- State Management: Redux/Zustand or local state? (Decision: Local state for speed)

**UX Questions**:

- Keyboard shortcuts: Essential or nice-to-have? (Decision: Nice-to-have, defer)
- Project save: Required or optional? (Decision: Optional for MVP)
- Multi-track: How many tracks needed? (Decision: 2 minimum - main + overlay)

**Scope Questions**:

- Recording: Must-have for final submission? (Decision: Yes, core feature)
- Text overlays: Include or defer? (Decision: Defer to stretch goals)
- Transitions: Required? (Decision: Defer to stretch goals)

### Areas Needing Further Research

**Before Starting**:

- [ ] Electron screen capture API documentation
- [ ] FFmpeg encoding presets for web video
- [ ] Timeline UI libraries comparison

**During Development**:

- [ ] Memory profiling for video playback
- [ ] FFmpeg optimal settings for export quality/speed
- [ ] Audio synchronization techniques

**For Future Versions**:

- [ ] GPU acceleration for rendering
- [ ] WebCodecs API for browser-based encoding
- [ ] WebRTC for collaborative editing

---

## Appendices

### A. Research Summary

**Competitive Analysis**:

- **CapCut**: Mobile-first, simple timeline, template-driven
- **Loom**: Recording focus, minimal editing, cloud-first
- **OBS Studio**: Recording powerhouse, no editing
- **Shotcut**: Open-source, desktop, full-featured but complex UI

**Key Insights**:

- Users value speed over features
- Recording + editing in one tool is rare
- Export quality matters more than preview quality
- Simple timeline beats complex tracks for basic editing

### B. Stakeholder Input

**Self (Developer/User)**:

- Must ship before Thursday morning
- Quality over features, but MVP must be complete
- Learning opportunity in desktop + media processing
- Portfolio piece that demonstrates shipping under pressure

**Evaluators (Implicit)**:

- Looking for working software, not perfect code
- Expecting pragmatic technical choices
- Valuing completion over perfectionism
- Assessing ability to execute under constraints

### C. References

**Technical Documentation**:

- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- Electron Documentation: https://www.electronjs.org/docs
- Tauri Documentation: https://tauri.app/
- MediaRecorder API: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

**Inspiration**:

- CapCut Desktop: https://www.capcut.com/
- Loom: https://www.loom.com/
- Descript: https://www.descript.com/

**Libraries to Consider**:

- fluent-ffmpeg: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
- fabric.js: http://fabricjs.com/
- video.js: https://videojs.com/

---

_This Product Brief serves as the foundational document for Chop Shop development._

_Next Steps:_

1. Technical architecture planning (stack selection, component design)
2. MVP implementation (Tuesday 10:59 PM CT deadline)
3. Core features implementation (Wednesday 10:59 PM CT deadline)
4. Testing and packaging
5. Demo video creation
6. GitHub repository and documentation

---

**Project Timeline**:

- **Monday, October 27**: Planning and MVP start
- **Tuesday, October 28, 10:59 PM CT**: MVP checkpoint (HARD GATE)
- **Wednesday, October 29, 10:59 PM CT**: Final submission
- **Thursday, October 30**: Relocation to Austin

**Remember**: Just submit. Shipping beats perfection. 72 hours is not negotiable.
