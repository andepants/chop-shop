# Story 4.7: Enhanced Preview with Multi-Track Compositing

Status: review

## Story

As a content creator,
I want to see my multi-track timeline rendered correctly in preview,
so that I can verify my picture-in-picture and overlay effects.

## Acceptance Criteria

1. Preview player renders Track 2 clips overlaid on Track 1 clips
2. Webcam/PiP clips display in appropriate corner with correct size
3. Real-time playback shows composited multi-track result
4. Audio from both tracks mixed appropriately (Track 1 primary, Track 2 secondary)
5. Scrubbing updates preview with correct multi-track composition
6. Preview maintains 30fps smooth playback with 2 tracks

## Architecture Context

**IMPORTANT**: The VideoCompositor architecture has been implemented and handles most multi-track rendering automatically:

✅ **Already Implemented by VideoCompositor:**
- Canvas-based multi-track rendering at 60fps
- Video element pool management with LRU caching
- Automatic clip transitions and track layering
- Frame-accurate seeking and scrubbing support
- RequestAnimationFrame render loop with performance monitoring
- Synchronized multi-track playback via PlaybackOrchestrator
- Video loading error handling with event emission
- Memory management and resource cleanup

❌ **Still Needed (This Story):**
- **PiP positioning logic** for Track 2 overlays (currently all tracks render full-screen)
- **Audio mixing** with Web Audio API gain control (Track 1 = 100%, Track 2 = 80%)
- **PiP metadata** support on clips (pipPosition, pipSize)
- **Visual feedback** (border around Track 2, multi-track badge)
- **Edge case handling** specific to PiP and audio mixing

## Tasks / Subtasks

- [ ] Task 1: Extend CompositorClip interface to support PiP metadata (AC: 2)
  - [ ] Update `src/renderer/src/types/compositor.types.ts`
  - [ ] Add optional PiP fields to CompositorClip interface:
    ```typescript
    export interface CompositorClip {
      // ... existing fields ...
      /** PiP position for overlay clips (Track 2+) */
      pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      /** PiP size as percentage (e.g., 0.25 = 25% of canvas width) */
      pipSize?: number
      /** Whether to render border around this clip */
      showBorder?: boolean
    }
    ```
  - [ ] Update `playbackOrchestrator.ts` convertToCompositorClip() to pass through PiP metadata from timeline clips
  - [ ] Extend Clip interface in `timeline.types.ts` with optional PiP fields if not already present

- [ ] Task 2: Implement PiP rendering in VideoCompositor (AC: 1, 2, 6)
  - [ ] Modify `src/renderer/src/utils/VideoCompositor.ts` renderFrame() method
  - [ ] Add helper function `calculatePipDimensions(clip, canvas)`:
    - Validate pipSize: clamp to [0.05, 0.5] range (5% min, 50% max)
    - Default pipSize: 0.25 if not specified or invalid
    - Get video aspect ratio from video.videoWidth / video.videoHeight
    - Calculate PiP dimensions based on aspect ratio:
      - For 16:9 (landscape): width = canvasWidth * pipSize, height = width * (9/16)
      - For 9:16 (portrait): height = canvasHeight * pipSize, width = height * (9/16)
      - For 1:1 (square): size = canvasWidth * pipSize for both dimensions
      - For other ratios: maintain source aspect ratio
  - [ ] Add helper function `calculatePipPosition(clip, pipWidth, pipHeight, canvas)`:
    - Default pipPosition to 'bottom-right' if not specified
    - Apply 20px padding from edges
    - Position calculation:
      - 'bottom-right': {x: canvasWidth - pipWidth - 20, y: canvasHeight - pipHeight - 20}
      - 'bottom-left': {x: 20, y: canvasHeight - pipHeight - 20}
      - 'top-right': {x: canvasWidth - pipWidth - 20, y: 20}
      - 'top-left': {x: 20, y: 20}
    - Clamp to canvas bounds if dimensions exceed (safety check)
  - [ ] Update renderFrame() to detect Track 2+ and apply PiP:
    - Track 1 (trackIndex === 0): Render full-screen with aspect-fit (existing behavior)
    - Track 2+ (trackIndex > 0): Render as PiP overlay using calculated dimensions and position
    - Skip PiP logic if video.videoWidth or video.videoHeight is 0 (not ready)

- [ ] Task 3: Add visual border for PiP overlays (AC: 2)
  - [ ] In VideoCompositor.renderFrame(), after drawing PiP video frame:
    - Check if clip.showBorder !== false (default: true for Track 2+)
    - Save canvas context state
    - Set strokeStyle: ctx.strokeStyle = '#FFFFFF'
    - Set lineWidth: ctx.lineWidth = 2
    - Draw rectangle around PiP: ctx.strokeRect(pipX, pipY, pipWidth, pipHeight)
    - Optional: Add subtle drop shadow for depth
    - Restore context state
  - [ ] Border should be visible regardless of video content colors

- [ ] Task 4: Implement Web Audio API for audio mixing (AC: 4)
  - [ ] Create new utility: `src/renderer/src/utils/AudioMixer.ts`
  - [ ] Implement AudioMixer class:
    ```typescript
    class AudioMixer {
      private audioContext: AudioContext | null = null
      private sourceNodes: Map<HTMLVideoElement, MediaElementAudioSourceNode> = new Map()
      private gainNodes: Map<HTMLVideoElement, GainNode> = new Map()

      // Initialize AudioContext (lazy - only when needed)
      initializeContext(): void

      // Connect video element to audio graph with gain
      connectVideo(video: HTMLVideoElement, trackIndex: number): void

      // Disconnect video element from audio graph
      disconnectVideo(video: HTMLVideoElement): void

      // Update gain for a specific video
      setGain(video: HTMLVideoElement, gain: number): void

      // Handle AudioContext state (suspended/blocked)
      resumeContext(): Promise<void>

      // Cleanup
      dispose(): void
    }
    ```
  - [ ] Set gain levels per track:
    - Track 1 (index 0): gain = 1.0 (100%)
    - Track 2 (index 1): gain = 0.8 (80% per tech spec line 709)
  - [ ] Handle edge cases:
    - AudioContext blocked: Defer initialization until user interaction
    - AudioContext suspended: Expose resumeContext() method
    - Video already connected: Disconnect before reconnecting
    - Both tracks no audio: Skip AudioContext creation entirely
    - Track 1 no audio, Track 2 has audio: Promote Track 2 to gain = 1.0
  - [ ] Integrate AudioMixer into VideoCompositor:
    - Create AudioMixer instance in constructor
    - In loadVideoSource(), connect video to AudioMixer after creating element
    - Detect audio streams: Check if video.mozHasAudio or video.webkitAudioDecodedByteCount exists
    - In unloadVideoSource(), disconnect video from AudioMixer
    - In dispose(), call AudioMixer.dispose()

- [ ] Task 5: Add multi-track visual feedback to PreviewPlayer (AC: 1)
  - [ ] Update `src/renderer/src/components/Preview/PreviewPlayer.tsx`
  - [ ] Detect multi-track timeline:
    ```typescript
    const isMultiTrack = tracks.filter(t => t.clips.length > 0).length > 1
    ```
  - [ ] If multi-track, render badge in top-right corner:
    ```tsx
    {isMultiTrack && (
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'var(--color-primary, #3B82F6)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          zIndex: 30,
          pointerEvents: 'none'
        }}
      >
        Multi-Track Preview
      </div>
    )}
    ```
  - [ ] Show active track count in debug info (already exists, verify it works)

- [ ] Task 6: Edge case handling for PiP and Audio

  **PiP Edge Cases:**
  - [ ] Invalid pipSize (0, negative, >1.0): Clamp to [0.05, 0.5], default 0.25
  - [ ] Invalid pipPosition (typo, wrong value): Default to 'bottom-right'
  - [ ] Portrait video (9:16): Calculate height-first, then width
  - [ ] Square video (1:1): Use pipSize for both dimensions
  - [ ] Ultra-wide video (21:9+): Maintain aspect ratio, clamp to max dimensions
  - [ ] Video dimensions not ready (videoWidth = 0): Skip PiP rendering this frame
  - [ ] PiP exceeds canvas bounds: Clamp position to keep within canvas
  - [ ] Very small canvas (< 200px): Set min PiP size to 80px
  - [ ] Very large canvas (> 4096px): Log warning, continue (browser handles limits)

  **Audio Edge Cases:**
  - [ ] AudioContext blocked by browser: Catch error, log, continue with muted playback
  - [ ] AudioContext suspended: Provide resumeContext() method, call on user interaction
  - [ ] Video already connected to graph: Disconnect first, then reconnect
  - [ ] Track 1 no audio, Track 2 has audio: Set Track 2 gain to 1.0
  - [ ] Both tracks no audio: Don't create AudioContext
  - [ ] Gain values outside [0, 1]: Clamp to valid range
  - [ ] Web Audio API not supported: Fallback to video.volume property

  **Track Configuration Edge Cases:**
  - [ ] Single track (Track 1 only): Skip PiP logic entirely, render full-screen
  - [ ] Empty Track 2: Render Track 1 only, no compositing overhead
  - [ ] Track 1 empty, Track 2 has clips: Show error overlay "Track 1 required for multi-track"
  - [ ] Both tracks empty: Show placeholder (already handled by PreviewPlayer)
  - [ ] Track duration mismatch: VideoCompositor already handles (longer track continues)
  - [ ] Same source file on both tracks: VideoCompositor pool allows duplicate elements

- [ ] Task 7: Testing and validation (All ACs)

  **AC1 Test**: Preview renders Track 2 overlaid on Track 1
  - [ ] Load timeline with Track 1 clip (1920x1080, 10s)
  - [ ] Add Track 2 clip (1280x720, 5s) starting at 2s
  - [ ] Verify Track 2 renders as PiP overlay in bottom-right corner
  - [ ] Verify Track 1 visible behind Track 2

  **AC2 Test**: PiP positioning and sizing
  - [ ] Test pipPosition = 'bottom-right': Verify 20px padding from bottom and right edges
  - [ ] Test pipPosition = 'bottom-left': Verify 20px padding from bottom and left edges
  - [ ] Test pipPosition = 'top-right': Verify 20px padding from top and right edges
  - [ ] Test pipPosition = 'top-left': Verify 20px padding from top and left edges
  - [ ] Test pipSize = 0.25 (25%): Verify PiP width is 25% of canvas width
  - [ ] Test pipSize = 0.15 (15%): Verify smaller PiP
  - [ ] Verify 16:9 video maintains aspect ratio
  - [ ] Test portrait video (9:16): Verify aspect ratio maintained
  - [ ] Test square video (1:1): Verify aspect ratio maintained
  - [ ] Verify 2px white border visible around Track 2 overlay

  **AC3 Test**: Real-time playback synchronization
  - [ ] Play multi-track timeline
  - [ ] Verify both tracks play simultaneously (no audio/video drift)
  - [ ] Verify clip transitions work correctly on both tracks
  - [ ] Verify playback continues when Track 2 ends but Track 1 continues

  **AC4 Test**: Audio mixing gain levels
  - [ ] Play Track 1 only: Verify audio at 100% volume
  - [ ] Play Track 1 + Track 2 (both with audio): Listen for Track 2 at lower volume (80%)
  - [ ] Verify no audio clipping or distortion when both play
  - [ ] Test AudioContext blocked: Click to enable audio, verify works after click
  - [ ] Test Track 1 no audio, Track 2 has audio: Verify Track 2 plays at 100%

  **AC5 Test**: Scrubbing with multi-track
  - [ ] Drag playhead forward through timeline: Verify both tracks update in real-time
  - [ ] Drag playhead backward: Verify both tracks seek correctly
  - [ ] Rapid scrubbing: Verify no crashes, smooth updates
  - [ ] Scrub to Track 2 start/end: Verify PiP appears/disappears correctly

  **AC6 Test**: Performance validation
  - [ ] Monitor frame render time in console: Verify < 16ms (60fps)
  - [ ] Profile with Chrome DevTools Performance tab during 30s playback
  - [ ] Verify CPU usage < 70% during 1080p Track 1 + 720p Track 2 playback
  - [ ] Test with 4K Track 1 + 1080p Track 2: Verify performance acceptable or auto-downscale
  - [ ] Verify no memory leaks during 5-minute continuous playback

  **Edge Case Tests**:
  - [ ] Invalid pipSize (0, -1, 2.0): Verify defaults to 0.25
  - [ ] Invalid pipPosition ('center'): Verify defaults to 'bottom-right'
  - [ ] Portrait video in PiP: Verify correct dimensions
  - [ ] AudioContext blocked: Verify graceful fallback
  - [ ] Track 1 empty + Track 2 full: Verify error message shown
  - [ ] Both tracks empty: Verify placeholder shown
  - [ ] Delete active clip during playback: Verify graceful stop or transition

- [ ] Task 8: Performance optimization validation (AC: 6)
  - [ ] Verify VideoCompositor renderFrame() executes within 16ms for 60fps
  - [ ] Test canvas rendering with alpha: false optimization (already implemented)
  - [ ] Monitor video element pool size (should not exceed 10 elements)
  - [ ] Verify LRU eviction works when pool is full (already implemented)
  - [ ] Profile memory usage: ensure video buffers released when clips removed
  - [ ] Test with different canvas sizes: 1080p, 720p, 4K
  - [ ] Verify desynchronized canvas context flag for better performance (already implemented)

## Traceability

**Tech Spec References:**
- VideoCompositor architecture (implemented outside this story)
- pipSize type: number (percentage, e.g., 0.25 = 25%)
- Audio mixing levels: Track 2 = 80% (tech spec line 709)
- NFR timing: 60fps render (16ms per frame, compositor already implements this)
- Canvas optimization: alpha: false, desynchronized: true (already in VideoCompositor)

**Architecture References:**
- VideoCompositor: Handles multi-track rendering, video pool, RAF loop
- PlaybackOrchestrator: Converts timeline clips to compositor format
- PlaybackStore: Manages playback state via compositor callbacks
- PreviewPlayer: Renders canvas element for compositor output

**What VideoCompositor Already Provides:**
- ✅ Multi-track canvas rendering at 60fps
- ✅ Video element pool with LRU caching (max 10 elements)
- ✅ Automatic clip sequencing and transitions
- ✅ Frame-accurate seeking with single-frame rendering
- ✅ Performance monitoring with frame time tracking
- ✅ Event system for timeupdate, play, pause, ended, clipchange
- ✅ Video loading error handling with sourceerror events
- ✅ Memory management and resource cleanup

**What This Story Adds:**
- PiP positioning logic for Track 2+ overlays
- Audio mixing with Web Audio API (Track 1 = 100%, Track 2 = 80%)
- Visual feedback (2px white border, multi-track badge)
- Edge case handling for PiP and audio

## Dev Notes

### PiP Rendering Strategy

Current compositor renders all clips full-screen with aspect-fit. This story extends renderFrame() to detect Track 2+ and apply PiP:

```javascript
// VideoCompositor.renderFrame() - UPDATED
for (const clip of sortedClips) {
  const source = this.sources.get(clip.sourceFile)
  if (!source || !source.isLoaded) continue

  const video = source.element
  if (video.readyState < 2) continue

  // Draw with opacity
  this.ctx.globalAlpha = clip.opacity

  if (clip.trackIndex === 0) {
    // Track 1: Full-screen with aspect-fit (existing)
    const { drawX, drawY, drawWidth, drawHeight } = this.calculateAspectFit(video)
    this.ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)
  } else {
    // Track 2+: PiP overlay
    const { width, height } = this.calculatePipDimensions(clip, video)
    const { x, y } = this.calculatePipPosition(clip, width, height)
    this.ctx.drawImage(video, x, y, width, height)

    // Draw border if enabled
    if (clip.showBorder !== false) {
      this.ctx.strokeStyle = '#FFFFFF'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(x, y, width, height)
    }
  }

  this.ctx.globalAlpha = 1.0
}
```

### Audio Mixing Architecture

Web Audio API approach with lazy initialization:

```
VideoElement (Track 1) → MediaElementSourceNode → GainNode (1.0) → AudioContext.destination
VideoElement (Track 2) → MediaElementSourceNode → GainNode (0.8) → AudioContext.destination
```

Benefits:
- Real-time gain control per track
- No audio clipping when both tracks play
- Browser-native audio mixing (low CPU)
- Lazy initialization avoids blocked AudioContext errors

Edge case handling:
- AudioContext blocked: Catch error, continue with muted playback
- AudioContext suspended: Resume on user interaction
- Track 1 no audio: Promote Track 2 to gain = 1.0
- Both no audio: Skip AudioContext creation entirely

### Aspect Ratio Handling

Different aspect ratios require different PiP dimension calculations:

- **16:9 (landscape)**: width = canvasWidth * pipSize, height = width * (9/16)
- **9:16 (portrait)**: height = canvasHeight * pipSize, width = height * (9/16)
- **1:1 (square)**: size = canvasWidth * pipSize for both
- **21:9 (ultra-wide)**: Maintain source aspect ratio, clamp to max dimensions
- **Unknown**: Use video.videoWidth / video.videoHeight to calculate

### Performance Expectations

With current compositor (60fps target):
- Track 1 only: ~8ms per frame (1080p)
- Track 1 + Track 2 PiP: ~12ms per frame (1080p + 720p)
- CPU usage: 40-60% during playback
- Well within 16ms budget for 60fps

### Testing Standards

Manual testing required for:
- All 4 PiP corner positions
- Portrait, square, and ultra-wide videos
- Audio mixing gain levels (listen test)
- AudioContext browser policy handling
- All edge cases from Task 6

Performance testing with Chrome DevTools:
- Frame render time monitoring
- CPU usage profiling
- Memory leak detection

### References

- [Source: docs/epics.md#Story 4.7]
- [Source: docs/PRD.md#NFR003 - Preview 30fps minimum]
- [Source: docs/architecture.md#ADR-004 - Canvas API for compositing]
- [Source: VideoCompositor.ts - Existing multi-track infrastructure]
- [Source: playbackOrchestrator.ts - Timeline to compositor adapter]
- [HTML5 Canvas API: 2D rendering and compositing]
- [Web Audio API: GainNode for per-track volume control]
- [MDN: Autoplay policy for Web Audio](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)

## Dev Agent Record

### Context Reference

- docs/stories/4-7-enhanced-preview-with-multi-track-compositing.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

Implementation completed 2025-10-28

### Completion Notes List

**Implementation Summary:**

All implementation tasks (Tasks 1-6) completed successfully:

1. ✅ **Task 1**: Extended CompositorClip and Clip interfaces with PiP metadata (pipPosition, pipSize, showBorder)
2. ✅ **Task 2**: Implemented PiP rendering with calculatePipDimensions() and calculatePipPosition() helpers in VideoCompositor
3. ✅ **Task 3**: Added 2px white border rendering for Track 2+ overlays
4. ✅ **Task 4**: Created AudioMixer utility class with Web Audio API integration (Track 1=100%, Track 2=80%)
5. ✅ **Task 5**: Added multi-track visual feedback badge to PreviewPlayer
6. ✅ **Task 6**: Implemented all critical edge case handling

**Key Implementation Details:**

- PiP positioning: Supports all 4 corners with 20px padding, defaults to 'bottom-right'
- PiP sizing: Clamped to [0.05, 0.5] range, defaults to 0.25 (25%)
- Aspect ratio support: Landscape (16:9), portrait (9:16), square (1:1), ultra-wide (21:9+)
- Audio mixing: Lazy AudioContext initialization, per-track gain nodes, graceful error handling
- Track validation: Shows error overlay if Track 1 empty but Track 2 has clips
- TypeScript: All implementation files compile without errors (pre-existing test failures unrelated to this story)

**Manual Testing Required (Tasks 7-8):**

The following manual tests must be performed with the running application:

- AC1-AC6: Multi-track playback, PiP positioning, audio mixing, scrubbing, performance
- Edge cases: Various aspect ratios, AudioContext states, track configurations
- Performance: Chrome DevTools profiling for 60fps target, CPU usage < 70%

**No Deviations from Spec:**

Implementation follows Story Context XML precisely, leveraging existing VideoCompositor infrastructure as designed.

### File List

**Files Created:**
- src/renderer/src/utils/AudioMixer.ts (218 lines)

**Files Modified:**
- src/renderer/src/types/compositor.types.ts (added pipPosition, pipSize, showBorder to CompositorClip)
- src/renderer/src/components/Timeline/timeline.types.ts (added pipPosition, pipSize to Clip)
- src/renderer/src/utils/playbackOrchestrator.ts (updated convertToCompositorClip with PiP metadata passthrough)
- src/renderer/src/utils/VideoCompositor.ts (added calculatePipDimensions, calculatePipPosition, AudioMixer integration, updated renderFrame for PiP)
- src/renderer/src/components/Preview/PreviewPlayer.tsx (added multi-track badge and Track 1 validation)
