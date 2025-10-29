/**
 * Canvas-Based Video Compositor
 *
 * Manages multiple video elements and renders composited frames to canvas
 * for seamless multi-track playback with frame-accurate seeking.
 *
 * Architecture:
 * - Maintains a pool of HTMLVideoElement instances (one per unique source file)
 * - Renders at 60fps using requestAnimationFrame
 * - Composites multiple tracks with proper z-ordering
 * - Handles timeline synchronization and clip transitions
 */

import type {
  VideoSource,
  CompositorClip,
  CompositorTrack,
  CompositorState,
  CompositorOptions,
  CompositorEvent,
  CompositorEventCallback,
  CompositorEventType
} from '../types/compositor.types'
import { AudioMixer } from './AudioMixer'

export class VideoCompositor {
  // Time precision epsilon for floating-point boundary comparisons (1ms)
  private static readonly TIME_EPSILON = 0.001

  // Canvas and rendering
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  // Video source pool
  private sources: Map<string, VideoSource> = new Map()
  private maxVideoElements: number
  private preloadAhead: number

  // Timeline and playback state
  private state: CompositorState
  private tracks: CompositorTrack[] = []
  private timelineDuration: number = 0

  // Event handling
  private eventListeners: Map<CompositorEventType, Set<CompositorEventCallback>> = new Map()

  // Audio mixing
  private audioMixer: AudioMixer

  // Performance tracking
  private frameCount: number = 0
  private lastFrameTime: number = 0

  // Transition state tracking
  private isTransitioning: boolean = false
  private lastTransitionTime: number = 0
  private noClipsStartTime: number = 0 // Track when we first detected no active clips
  private isLoadingSources: boolean = false // Prevent updateActiveClips while loading sources

  constructor(options: CompositorOptions) {
    this.canvas = options.canvas
    this.width = options.width
    this.height = options.height
    this.maxVideoElements = options.maxVideoElements ?? 10
    this.preloadAhead = options.preloadAhead ?? 3 // seconds (increased from 2)

    // Get 2D context
    const ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true // Better performance
    })
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context')
    }
    this.ctx = ctx

    // Set canvas dimensions
    this.canvas.width = this.width
    this.canvas.height = this.height

    // Initialize state
    this.state = {
      currentTime: 0,
      isPlaying: false,
      duration: 0,
      activeClips: [],
      rafHandle: null,
      canvas: this.canvas
    }

    // Initialize audio mixer
    this.audioMixer = new AudioMixer()
  }

  /**
   * Load timeline data into the compositor
   * @param tracks Array of tracks with clips
   */
  async loadTimeline(tracks: CompositorTrack[]): Promise<void> {
    // Stop playback if active
    if (this.state.isPlaying) {
      this.pause()
    }

    // Store tracks
    this.tracks = tracks.map((track, index) => ({
      ...track,
      index,
      clips: track.clips.sort((a, b) => a.startTime - b.startTime)
    }))

    // Calculate timeline duration
    this.timelineDuration = this.calculateTimelineDuration()
    this.state.duration = this.timelineDuration

    // Collect unique intermediate files for playback
    const sourceFiles = new Set<string>()
    for (const track of this.tracks) {
      for (const clip of track.clips) {
        // Use intermediate path for playback (H.264 Intra optimized for editing)
        sourceFiles.add(clip.intermediatePath)
      }
    }

    // Unload sources no longer needed
    for (const [filePath] of this.sources) {
      if (!sourceFiles.has(filePath)) {
        this.unloadVideoSource(filePath)
      }
    }

    // Load ALL timeline sources upfront (emits sourcesLoading/sourcesReady events)
    await this.loadAllTimelineSources()

    // Update active clips
    this.updateActiveClips()

    // Emit event (kept for backward compatibility)
    this.emit({ type: 'sourceloaded', currentTime: this.state.currentTime })
  }

  /**
   * Load all timeline sources upfront (regardless of time position)
   * Emits 'sourcesLoading' event at start and 'sourcesReady' when complete
   * @returns Promise that resolves when all sources are loaded
   */
  private async loadAllTimelineSources(): Promise<void> {
    // Collect unique intermediate files for ALL clips on timeline
    const sourceFiles = new Set<string>()
    for (const track of this.tracks) {
      for (const clip of track.clips) {
        sourceFiles.add(clip.intermediatePath)
      }
    }

    const totalSources = sourceFiles.size
    let loadedSources = 0

    // Emit loading started event
    this.emit({
      type: 'sourcesLoading',
      loaded: 0,
      total: totalSources
    })

    console.log('[VideoCompositor] Loading all timeline sources:', {
      total: totalSources,
      files: Array.from(sourceFiles)
    })

    // Load all sources
    const loadPromises: Promise<void>[] = []
    for (const sourceFile of sourceFiles) {
      if (!this.sources.has(sourceFile)) {
        const loadPromise = this.loadVideoSource(sourceFile)
          .then(() => {
            loadedSources++
            console.log(`[VideoCompositor] Source loaded (${loadedSources}/${totalSources}):`, sourceFile)
          })
          .catch((err) => {
            loadedSources++
            console.error(`[VideoCompositor] Failed to load source (${loadedSources}/${totalSources}):`, sourceFile, err)
          })
        loadPromises.push(loadPromise)
      } else {
        // Source already loaded
        loadedSources++
      }
    }

    // Wait for all sources to load
    await Promise.all(loadPromises)

    // Emit ready event
    this.emit({
      type: 'sourcesReady',
      loaded: loadedSources,
      total: totalSources
    })

    console.log('[VideoCompositor] All sources loaded:', {
      loaded: loadedSources,
      total: totalSources
    })
  }

  /**
   * Start playback
   */
  async play(): Promise<void> {
    if (this.state.isPlaying) return

    console.log('[Playback] Starting playback:', {
      currentTime: this.state.currentTime.toFixed(2),
      activeClips: this.state.activeClips.length
    })

    // Start all active video elements with retry logic
    const playPromises: Promise<boolean>[] = []
    for (const clip of this.state.activeClips) {
      const source = this.sources.get(clip.intermediatePath)
      if (source && source.isLoaded) {
        // Calculate offset within source video
        const clipElapsed = this.state.currentTime - clip.startTime
        const sourceTime = clip.trimIn + clipElapsed

        source.element.currentTime = sourceTime
        playPromises.push(
          this.playVideoWithRetry(source.element, clip.id, 'play()')
        )
      }
    }

    await Promise.all(playPromises)

    this.state.isPlaying = true
    this.startRenderLoop()
    this.emit({ type: 'play', currentTime: this.state.currentTime })
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.state.isPlaying) return

    // Pause all video elements
    for (const source of this.sources.values()) {
      source.element.pause()
    }

    this.state.isPlaying = false
    this.stopRenderLoop()
    this.emit({ type: 'pause', currentTime: this.state.currentTime })
  }

  /**
   * Seek to specific time
   */
  async seek(time: number): Promise<void> {
    const wasPlaying = this.state.isPlaying

    // Clamp time to valid range
    time = Math.max(0, Math.min(time, this.state.duration))

    // Pause if playing
    if (wasPlaying) {
      this.pause()
    }

    // Update state
    this.state.currentTime = time

    // Update active clips
    this.updateActiveClips()

    // Load sources if needed
    const sourcesNeeded = this.getSourcesNearTime(time)
    for (const sourceFile of sourcesNeeded) {
      if (!this.sources.has(sourceFile)) {
        await this.loadVideoSource(sourceFile)
      }
    }

    // Seek all active video elements
    for (const clip of this.state.activeClips) {
      const source = this.sources.get(clip.intermediatePath)
      if (source && source.isLoaded) {
        const clipElapsed = time - clip.startTime
        const sourceTime = clip.trimIn + clipElapsed
        source.element.currentTime = sourceTime
      }
    }

    // Render single frame
    this.renderFrame()

    // Resume if was playing
    if (wasPlaying) {
      await this.play()
    }

    this.emit({ type: 'timeupdate', currentTime: this.state.currentTime })
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.state.currentTime
  }

  /**
   * Get timeline duration
   */
  getDuration(): number {
    return this.state.duration
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying
  }

  /**
   * Get active clips at current time
   */
  getActiveClips(): CompositorClip[] {
    return this.state.activeClips
  }

  /**
   * Resize the compositor canvas and update rendering dimensions
   * @param width New canvas width
   * @param height New canvas height
   */
  resize(width: number, height: number): void {
    // Update internal dimensions
    this.width = width
    this.height = height

    // Update canvas dimensions
    this.canvas.width = width
    this.canvas.height = height

    // Re-render current frame at new dimensions
    this.renderFrame()

    console.log('[VideoCompositor] Resized to', { width, height })
  }

  /**
   * Dispose of compositor and free resources
   */
  dispose(): void {
    // Stop playback
    this.pause()

    // Unload all sources
    for (const filePath of this.sources.keys()) {
      this.unloadVideoSource(filePath)
    }

    // Dispose audio mixer
    this.audioMixer.dispose()

    // Clear event listeners
    this.eventListeners.clear()

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  /**
   * Subscribe to compositor events
   */
  on(eventType: CompositorEventType, callback: CompositorEventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(callback)
  }

  /**
   * Unsubscribe from compositor events
   */
  off(eventType: CompositorEventType, callback: CompositorEventCallback): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * Emit compositor event
   */
  private emit(event: CompositorEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      for (const callback of listeners) {
        callback(event)
      }
    }
  }

  /**
   * Verify time consistency across all active video elements
   * Resyncs any videos that are >0.15s out of sync
   */
  private verifyTimeConsistency(): void {
    for (const clip of this.state.activeClips) {
      const source = this.sources.get(clip.intermediatePath)
      if (!source || !source.isLoaded) continue

      const clipElapsed = this.state.currentTime - clip.startTime
      const expectedSourceTime = clip.trimIn + clipElapsed
      const actualSourceTime = source.element.currentTime
      const timeDiff = Math.abs(actualSourceTime - expectedSourceTime)

      // If video is >0.15s out of sync, resync it immediately
      if (timeDiff > 0.15) {
        console.warn('[Playback] Time consistency check failed, resyncing:', {
          clipId: clip.id,
          expected: expectedSourceTime.toFixed(3),
          actual: actualSourceTime.toFixed(3),
          diff: timeDiff.toFixed(3)
        })
        source.element.currentTime = expectedSourceTime
      }
    }
  }

  /**
   * Play video element with retry logic for robustness
   * Retries up to 3 times with exponential backoff if play fails
   */
  private async playVideoWithRetry(
    video: HTMLVideoElement,
    clipId: string,
    context: string,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await video.play()
        if (attempt > 1) {
          console.log(`[Playback] Video play succeeded on attempt ${attempt}:`, {
            clipId,
            context,
            currentTime: video.currentTime.toFixed(2)
          })
        }
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        if (attempt === maxRetries) {
          console.error(`[Playback] Failed to play video after ${maxRetries} attempts:`, {
            clipId,
            context,
            error: errorMessage,
            videoSrc: video.src,
            readyState: video.readyState,
            networkState: video.networkState
          })
          return false
        }

        // Log retry attempt
        console.warn(`[Playback] Video play failed (attempt ${attempt}/${maxRetries}):`, {
          clipId,
          context,
          error: errorMessage,
          retryingIn: `${50 * attempt}ms`
        })

        // Exponential backoff: 50ms, 100ms, 150ms
        await new Promise(resolve => setTimeout(resolve, 50 * attempt))
      }
    }

    return false
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    if (this.state.rafHandle !== null) return

    this.frameCount = 0
    this.lastFrameTime = 0

    const render = (timestamp: number): void => {
      if (!this.state.isPlaying) return

      // Initialize lastFrameTime on first frame
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp
      }

      // Calculate delta time in seconds
      const deltaTime = (timestamp - this.lastFrameTime) / 1000
      this.lastFrameTime = timestamp

      // Update frame tracking
      this.frameCount++

      // Update current time using RAF delta time
      this.updateCurrentTimeFromVideos(deltaTime)

      // Check if reached end
      if (this.state.currentTime >= this.state.duration) {
        this.pause()
        this.emit({ type: 'ended', currentTime: this.state.currentTime })
        return
      }

      // Update active clips if changed
      this.updateActiveClips()

      // Preload upcoming clips for smooth transitions
      this.preloadUpcomingClips()

      // Render frame
      this.renderFrame()

      // Emit timeupdate periodically (every 10 frames = ~6 times per second)
      if (this.frameCount % 10 === 0) {
        this.emit({ type: 'timeupdate', currentTime: this.state.currentTime })
      }

      // Continue loop
      this.state.rafHandle = requestAnimationFrame(render)
    }

    this.state.rafHandle = requestAnimationFrame(render)
  }

  /**
   * Stop the render loop
   */
  private stopRenderLoop(): void {
    if (this.state.rafHandle !== null) {
      cancelAnimationFrame(this.state.rafHandle)
      this.state.rafHandle = null
    }
  }

  /**
   * Calculate PiP dimensions based on clip settings, video aspect ratio, and canvas size
   * Handles landscape, portrait, square, and ultra-wide aspect ratios
   */
  private calculatePipDimensions(
    clip: CompositorClip,
    video: HTMLVideoElement
  ): { width: number; height: number } {
    // Validate and clamp pipSize to [0.05, 0.5] range
    let pipSize = clip.pipSize ?? 0.25
    pipSize = Math.max(0.05, Math.min(0.5, pipSize))

    // Skip if video dimensions not ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return { width: this.width * pipSize, height: this.height * pipSize }
    }

    // Get video aspect ratio
    const videoAspect = video.videoWidth / video.videoHeight

    let width: number
    let height: number

    // Determine aspect ratio category
    if (videoAspect > 1.5) {
      // Landscape (16:9, 21:9, etc.) - width-first
      width = this.width * pipSize
      height = width / videoAspect
    } else if (videoAspect < 0.7) {
      // Portrait (9:16, etc.) - height-first
      height = this.height * pipSize
      width = height * videoAspect
    } else {
      // Square or near-square (1:1, 4:3, etc.)
      width = this.width * pipSize
      height = width / videoAspect
    }

    // Handle very small canvas (< 200px) - enforce min PiP size of 80px
    if (this.width < 200 || this.height < 200) {
      const minSize = 80
      if (width < minSize) {
        width = minSize
        height = width / videoAspect
      }
      if (height < minSize) {
        height = minSize
        width = height * videoAspect
      }
    }

    return { width, height }
  }

  /**
   * Calculate PiP position with 20px padding from edges
   * Defaults to 'bottom-right' if position is invalid
   */
  private calculatePipPosition(
    clip: CompositorClip,
    pipWidth: number,
    pipHeight: number
  ): { x: number; y: number } {
    const padding = 20
    let position = clip.pipPosition ?? 'bottom-right'

    // Validate position, default to 'bottom-right' if invalid
    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    if (!validPositions.includes(position)) {
      position = 'bottom-right'
    }

    let x: number
    let y: number

    switch (position) {
      case 'top-left':
        x = padding
        y = padding
        break
      case 'top-right':
        x = this.width - pipWidth - padding
        y = padding
        break
      case 'bottom-left':
        x = padding
        y = this.height - pipHeight - padding
        break
      case 'bottom-right':
      default:
        x = this.width - pipWidth - padding
        y = this.height - pipHeight - padding
        break
    }

    // Clamp to canvas bounds (safety check)
    x = Math.max(0, Math.min(x, this.width - pipWidth))
    y = Math.max(0, Math.min(y, this.height - pipHeight))

    return { x, y }
  }

  /**
   * Render a single frame to canvas
   */
  private renderFrame(): void {
    // Clear canvas with black background
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // If no active clips, return early (canvas already cleared)
    if (this.state.activeClips.length === 0) {
      return
    }

    // Render clips in order (bottom to top based on track index)
    const sortedClips = [...this.state.activeClips].sort((a, b) => a.trackIndex - b.trackIndex)

    for (const clip of sortedClips) {
      const source = this.sources.get(clip.intermediatePath)
      if (!source || !source.isLoaded) continue

      const video = source.element
      if (video.readyState < 2) continue // Need at least HAVE_CURRENT_DATA

      // Calculate clip position in timeline
      const clipElapsed = this.state.currentTime - clip.startTime
      const sourceTime = clip.trimIn + clipElapsed

      // Frame staleness detection: Skip if video frame hasn't advanced
      if (source.lastRenderedTime === video.currentTime && source.lastRenderedTime !== -1) {
        // Same frame as last render - skip to prevent ghosting at split boundaries
        continue
      }

      // Verify video is at correct time (tighter tolerance for frame-accurate transitions)
      const timeDiff = Math.abs(video.currentTime - sourceTime)
      if (timeDiff > 0.016) { // ~1 frame at 60fps (reduced from 0.033s)
        // Video element out of sync, seek it
        video.currentTime = sourceTime
        // Skip this frame until video seeks to correct position
        continue
      }

      // Draw video to canvas with opacity
      this.ctx.globalAlpha = clip.opacity

      if (clip.trackIndex === 0) {
        // Track 1: Render full-screen with aspect-fill (like Adobe Premiere Pro)
        // Video fills entire canvas, crops edges if needed to maintain aspect ratio
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = this.width / this.height

        let sourceX = 0
        let sourceY = 0
        let sourceWidth = video.videoWidth
        let sourceHeight = video.videoHeight

        if (videoAspect > canvasAspect) {
          // Video is wider than canvas - crop left/right edges
          sourceWidth = video.videoHeight * canvasAspect
          sourceX = (video.videoWidth - sourceWidth) / 2
        } else {
          // Video is taller than canvas - crop top/bottom edges
          sourceHeight = video.videoWidth / canvasAspect
          sourceY = (video.videoHeight - sourceHeight) / 2
        }

        // Draw cropped portion to fill entire canvas
        this.ctx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,  // source crop rectangle
          0, 0, this.width, this.height                  // destination (full canvas)
        )

        // Update last rendered time to prevent stale frame rendering
        source.lastRenderedTime = video.currentTime
      } else {
        // Track 2+: Render as PiP overlay
        // Skip if video dimensions not ready
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const { width, height } = this.calculatePipDimensions(clip, video)
          const { x, y } = this.calculatePipPosition(clip, width, height)

          // Draw video
          this.ctx.drawImage(video, x, y, width, height)

          // Draw border if enabled (default true for Track 2+)
          if (clip.showBorder !== false) {
            this.ctx.save()
            this.ctx.strokeStyle = '#FFFFFF'
            this.ctx.lineWidth = 2
            this.ctx.strokeRect(x, y, width, height)
            this.ctx.restore()
          }

          // Update last rendered time to prevent stale frame rendering
          source.lastRenderedTime = video.currentTime
        }
      }
    }

    // Reset alpha
    this.ctx.globalAlpha = 1.0
  }

  /**
   * Update current time based on RAF delta time
   * Uses independent time tracking with video elements for sync verification
   */
  private updateCurrentTimeFromVideos(deltaTime: number): void {
    // Pause time advancement while loading sources to prevent currentTime drift
    if (this.isLoadingSources) {
      console.log('[Playback] Time advancement paused while loading sources')
      return
    }

    // Advance time independently using RAF delta
    this.state.currentTime = Math.min(this.state.currentTime + deltaTime, this.state.duration)

    // Detect if we're approaching a clip boundary (within 0.25s)
    // This forces early transition to prevent playback stalls
    // Uses time-based detection only for reliability
    for (const clip of this.state.activeClips) {
      // Note: clip.duration is already the effective duration (after trim applied)
      const clipEnd = clip.startTime + clip.duration
      const timeUntilClipEnds = clipEnd - this.state.currentTime

      // Early transition detection: Check if next clip is ready when within 0.5s of current clip end
      if (timeUntilClipEnds > 0.25 && timeUntilClipEnds <= 0.5) {
        // Find the next clip that starts at or after this clip ends
        for (const track of this.tracks) {
          for (const nextClip of track.clips) {
            if (nextClip.startTime >= clipEnd - 0.01) { // Small tolerance for floating point
              const nextSource = this.sources.get(nextClip.intermediatePath)
              if (nextSource && nextSource.isLoaded) {
                if (nextSource.element.readyState < 2) {
                  console.warn('[Playback] Next clip not ready for transition:', {
                    currentClipId: clip.id,
                    nextClipId: nextClip.id,
                    timeUntilTransition: timeUntilClipEnds.toFixed(3),
                    nextClipReadyState: nextSource.element.readyState
                  })
                }
              } else {
                console.warn('[Playback] Next clip source not loaded:', {
                  currentClipId: clip.id,
                  nextClipId: nextClip.id,
                  timeUntilTransition: timeUntilClipEnds.toFixed(3),
                  hasSource: !!nextSource,
                  isLoaded: nextSource?.isLoaded
                })
              }
              break // Only check the first clip that starts after current
            }
          }
        }
      }

      // More forgiving boundary detection: 0.25s window (was 0.1s)
      if (timeUntilClipEnds > 0 && timeUntilClipEnds <= 0.25) {
        // Force jump to clip boundary to trigger transition
        // No longer waiting for video.ended - just use time-based detection for reliability
        this.state.currentTime = clipEnd
        console.log('[Playback] Clip boundary detected, forcing transition:', {
          clipId: clip.id,
          clipEnd: clipEnd.toFixed(2),
          timeUntilEnd: timeUntilClipEnds.toFixed(3)
        })
        break
      }
    }

    // Handle gaps in timeline: if no active clips, find and jump to next clip
    if (this.state.activeClips.length === 0) {
      // Track how long we've had no active clips for stuck transition detection
      if (this.noClipsStartTime === 0) {
        this.noClipsStartTime = this.state.currentTime
      }

      const noClipsDuration = this.state.currentTime - this.noClipsStartTime

      // If we've had no clips for >3.0s, this is likely a stuck transition - force recovery
      // (Increased from 0.7s now that we preload all sources upfront)
      if (noClipsDuration > 3.0) {
        console.error('[Playback] STUCK TRANSITION DETECTED - forcing recovery:', {
          stuckDuration: noClipsDuration.toFixed(3),
          currentTime: this.state.currentTime.toFixed(2)
        })
      }

      // We're in a gap - find the next clip that starts after current time
      let nextClipStartTime: number | null = null

      for (const track of this.tracks) {
        for (const clip of track.clips) {
          if (clip.startTime > this.state.currentTime) {
            if (nextClipStartTime === null || clip.startTime < nextClipStartTime) {
              nextClipStartTime = clip.startTime
            }
          }
        }
      }

      if (nextClipStartTime !== null) {
        // Log gap detection (error level if stuck, regular log otherwise)
        const logMessage = {
          currentTime: this.state.currentTime.toFixed(2),
          nextClipAt: nextClipStartTime.toFixed(2),
          gap: (nextClipStartTime - this.state.currentTime).toFixed(2),
          noClipsDuration: noClipsDuration.toFixed(3)
        }

        if (noClipsDuration > 3.0) {
          console.error('[Playback] Gap recovery:', logMessage)
        } else {
          console.log('[Playback] Gap detected:', logMessage)
        }

        // Jump to the next clip's start time
        this.state.currentTime = nextClipStartTime

        // CRITICAL: Load sources for clips at this time BEFORE updating active clips
        // This prevents stuck transitions when sources aren't loaded yet
        const sourcesNeeded = this.getSourcesNearTime(this.state.currentTime)
        const loadPromises: Promise<void>[] = []
        for (const sourceFile of sourcesNeeded) {
          if (!this.sources.has(sourceFile)) {
            console.log('[Playback] Loading missing source for gap jump:', sourceFile)
            loadPromises.push(
              this.loadVideoSource(sourceFile).catch((err) => {
                console.error('[Playback] Failed to load source for gap jump:', sourceFile, err)
              })
            )
          }
        }

        // Wait for sources to load before continuing
        if (loadPromises.length > 0) {
          // Block updateActiveClips() while loading
          this.isLoadingSources = true
          console.log('[Playback] Blocking updateActiveClips while loading sources...')

          Promise.all(loadPromises)
            .then(() => {
              // Sources loaded, unblock and update active clips
              this.isLoadingSources = false
              console.log('[Playback] Sources loaded, resuming updateActiveClips')
              this.updateActiveClips()

              // If playing, resume playback on the newly active clips
              if (this.state.isPlaying) {
                const resumePromises: Promise<boolean>[] = []
                for (const clip of this.state.activeClips) {
                  const source = this.sources.get(clip.intermediatePath)
                  if (source && source.isLoaded) {
                    // Seek to correct position in source video
                    const clipElapsed = this.state.currentTime - clip.startTime
                    const sourceTime = clip.trimIn + clipElapsed
                    source.element.currentTime = sourceTime

                    // Resume playback with retry logic
                    resumePromises.push(
                      this.playVideoWithRetry(source.element, clip.id, 'gap-resume')
                    )
                  }
                }

                // Fire off all resume attempts without blocking the render loop
                Promise.all(resumePromises).then(() => {
                  console.log('[Playback] Gap jump complete:', {
                    newTime: this.state.currentTime.toFixed(2),
                    activeClips: this.state.activeClips.length
                  })
                })
              }
            })
            .catch((err) => {
              // Even if loading failed, unblock to prevent permanent stuck state
              this.isLoadingSources = false
              console.error('[Playback] Source loading failed, unblocking:', err)
              this.updateActiveClips()
            })
        } else {
          // Sources already loaded, proceed immediately
          this.updateActiveClips()

          // If playing, resume playback on the newly active clips
          if (this.state.isPlaying) {
            const resumePromises: Promise<boolean>[] = []
            for (const clip of this.state.activeClips) {
              const source = this.sources.get(clip.intermediatePath)
              if (source && source.isLoaded) {
                // Seek to correct position in source video
                const clipElapsed = this.state.currentTime - clip.startTime
                const sourceTime = clip.trimIn + clipElapsed
                source.element.currentTime = sourceTime

                // Resume playback with retry logic
                resumePromises.push(
                  this.playVideoWithRetry(source.element, clip.id, 'gap-resume')
                )
              }
            }

            // Fire off all resume attempts without blocking the render loop
            Promise.all(resumePromises).then(() => {
              console.log('[Playback] Gap jump complete:', {
                newTime: this.state.currentTime.toFixed(2),
                activeClips: this.state.activeClips.length
              })
            })
          }
        }
      }
      return
    } else {
      // We have active clips - reset stuck transition tracker
      this.noClipsStartTime = 0
    }

    // Periodic sync correction: use video times to verify we're not drifting
    // Check every 5 frames (~12 times per second) for tighter sync control
    if (this.frameCount % 5 === 0) {
      for (const clip of this.state.activeClips) {
        const source = this.sources.get(clip.intermediatePath)
        if (!source || !source.isLoaded) continue

        const videoTime = source.element.currentTime
        const clipElapsed = videoTime - clip.trimIn
        const globalTime = clip.startTime + clipElapsed

        // If we're drifting more than 0.1s from video time, sync up (was 0.2s)
        const drift = Math.abs(globalTime - this.state.currentTime)
        if (drift > 0.1) {
          console.log('[Playback] Sync correction applied:', {
            drift: drift.toFixed(3),
            from: this.state.currentTime.toFixed(2),
            to: globalTime.toFixed(2),
            clipId: clip.id
          })
          this.state.currentTime = Math.min(globalTime, this.state.duration)
          break // Only correct once per check
        }
      }
    }
  }

  /**
   * Update active clips based on current time
   * Only includes clips whose video sources are loaded AND have metadata (readyState >= 1)
   * Rendering will wait for readyState >= 2 before drawing frames
   */
  private updateActiveClips(): void {
    // Don't update active clips while sources are being loaded
    // This prevents race conditions during gap jumps
    if (this.isLoadingSources) {
      return
    }

    const previousClipIds = this.state.activeClips.map((c) => c.id)
    const newActiveClips: CompositorClip[] = []

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        // Note: clip.duration is already the effective duration (after trim applied)
        const clipEnd = clip.startTime + clip.duration

        // Epsilon-based boundary check to prevent floating-point overlap at split points
        // Use >= for start (inclusive) and < for end (exclusive) with epsilon buffer
        // Single epsilon (1ms) is sufficient - double epsilon was causing premature clip deactivation
        const isInTimeRange =
          this.state.currentTime >= clip.startTime - VideoCompositor.TIME_EPSILON &&
          this.state.currentTime < clipEnd - VideoCompositor.TIME_EPSILON

        if (isInTimeRange) {
          // Verify source is loaded AND has metadata before marking clip as active
          const source = this.sources.get(clip.intermediatePath)
          if (source && source.isLoaded) {
            // Check readyState: 1 = HAVE_METADATA (basic info ready, allows early activation)
            // Rendering will wait for readyState >= 2 (HAVE_CURRENT_DATA) before drawing
            if (source.element.readyState >= 1) {
              newActiveClips.push(clip)
            } else {
              console.warn('[Playback] Clip source not ready yet:', {
                clipId: clip.id,
                readyState: source.element.readyState,
                networkState: source.element.networkState
              })
            }
          } else {
            console.warn('[Playback] Clip source not loaded:', {
              clipId: clip.id,
              hasSource: !!source,
              isLoaded: source?.isLoaded
            })
          }
        }
      }
    }

    // Check if clips changed
    const newClipIds = newActiveClips.map((c) => c.id)
    const clipsChanged =
      previousClipIds.length !== newClipIds.length ||
      previousClipIds.some((id, i) => id !== newClipIds[i])

    if (clipsChanged) {
      // Clear canvas immediately to prevent stale frames during transition
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.width, this.height)

      this.state.activeClips = newActiveClips

      // Reset lastRenderedTime for newly activated clips to ensure fresh render
      for (const clip of newActiveClips) {
        const source = this.sources.get(clip.intermediatePath)
        if (source && !previousClipIds.includes(clip.id)) {
          source.lastRenderedTime = -1
        }
      }

      this.isTransitioning = true
      this.lastTransitionTime = this.state.currentTime

      console.log('[Playback] Clip transition detected:', {
        previousClips: previousClipIds,
        newClips: newClipIds,
        currentTime: this.state.currentTime.toFixed(2)
      })

      this.emit({ type: 'clipchange', clipIds: newClipIds, currentTime: this.state.currentTime })

      // Start playing new clips if in playback mode
      if (this.state.isPlaying) {
        const transitionPromises: Promise<boolean>[] = []
        for (const clip of newActiveClips) {
          const source = this.sources.get(clip.intermediatePath)
          if (source && source.isLoaded) {
            const clipElapsed = this.state.currentTime - clip.startTime
            const sourceTime = clip.trimIn + clipElapsed
            source.element.currentTime = sourceTime
            transitionPromises.push(
              this.playVideoWithRetry(source.element, clip.id, 'clip-transition')
            )
          }
        }

        // Wait for all transitions to complete, then verify time consistency
        Promise.all(transitionPromises).then(() => {
          this.isTransitioning = false
          // Verify all videos are at correct time after transition
          this.verifyTimeConsistency()
          console.log('[Playback] Clip transition complete, time verified')
        })
      } else {
        this.isTransitioning = false
      }
    }
  }

  /**
   * Preload upcoming clips to reduce transition lag
   * Pre-seeks video elements for clips starting within 3 seconds
   * Pre-buffers clips within 1.0 seconds and verifies readyState
   * Pre-plays clips starting within 0.2 seconds for seamless transitions
   */
  private preloadUpcomingClips(): void {
    const PRELOAD_WINDOW = 3.0 // Pre-seek clips starting within 3 seconds
    const PREBUFFER_WINDOW = 1.0 // Verify readyState for clips within 1.0s
    const PREPLAY_WINDOW = 0.2 // Start playing clips within 0.2 seconds

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        // Check if clip starts within preload window
        const timeUntilClipStarts = clip.startTime - this.state.currentTime

        if (timeUntilClipStarts > 0 && timeUntilClipStarts <= PRELOAD_WINDOW) {
          const source = this.sources.get(clip.intermediatePath)
          if (source && source.isLoaded) {
            // Pre-seek to the clip's start position (accounting for trim)
            const targetTime = clip.trimIn

            // Only seek if we're not already at the right position
            if (Math.abs(source.element.currentTime - targetTime) > 0.1) {
              source.element.currentTime = targetTime
            }

            // If clip starts soon (within 0.5s), verify readyState
            if (timeUntilClipStarts <= PREBUFFER_WINDOW) {
              if (source.element.readyState < 2) {
                console.warn('[Playback] Upcoming clip not ready:', {
                  clipId: clip.id,
                  startsIn: timeUntilClipStarts.toFixed(2),
                  readyState: source.element.readyState,
                  networkState: source.element.networkState
                })
              }
            }

            // If clip starts very soon (within 0.2s), pre-play it for seamless transition
            if (timeUntilClipStarts <= PREPLAY_WINDOW && source.element.paused) {
              // Only pre-play if video is ready
              if (source.element.readyState >= 2) {
                this.playVideoWithRetry(source.element, clip.id, 'preload').catch(() => {
                  // Pre-play failed - will try again on actual transition
                  console.warn('[Playback] Preload play failed for clip:', clip.id)
                })
              }
            }
          }
        }
      }
    }
  }

  /**
   * Get the primary track index for an intermediate file
   * Returns the lowest trackIndex that uses this intermediate file
   */
  private getTrackIndexForSource(filePath: string): number {
    let minTrackIndex = 999

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        // Compare with intermediate path since we load intermediate files for playback
        if (clip.intermediatePath === filePath && clip.trackIndex < minTrackIndex) {
          minTrackIndex = clip.trackIndex
        }
      }
    }

    return minTrackIndex === 999 ? 0 : minTrackIndex
  }

  /**
   * Get source files needed near a given time
   * Includes current clips and upcoming clips within preload window
   */
  private getSourcesNearTime(time: number): Set<string> {
    const sources = new Set<string>()
    const preloadEnd = time + this.preloadAhead

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        // Note: clip.duration is already the effective duration (after trim applied)
        const clipEnd = clip.startTime + clip.duration
        // Include if clip overlaps with [time, preloadEnd]
        // Use intermediate path for playback (H.264 Intra optimized for editing)
        if (clip.startTime < preloadEnd && clipEnd > time) {
          sources.add(clip.intermediatePath)
        }
      }
    }

    return sources
  }

  /**
   * Load a video source into the pool
   */
  private async loadVideoSource(filePath: string): Promise<void> {
    if (this.sources.has(filePath)) return

    // Check pool limit
    if (this.sources.size >= this.maxVideoElements) {
      this.evictLeastRecentlyUsedSource()
    }

    // Create video element
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = false // We want audio
    video.playsInline = true

    // Create source entry
    const source: VideoSource = {
      filePath,
      element: video,
      isLoaded: false,
      duration: 0,
      lastAccessed: Date.now(),
      lastRenderedTime: -1 // Initialize to -1 (no frame rendered yet)
    }

    this.sources.set(filePath, source)

    // Load video
    return new Promise((resolve, reject) => {
      const onLoadedMetadata = (): void => {
        source.isLoaded = true
        source.duration = video.duration

        // Connect to AudioMixer for per-track gain control
        const trackIndex = this.getTrackIndexForSource(filePath)
        this.audioMixer.connectVideo(video, trackIndex)

        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('error', onError)
        resolve()
      }

      const onError = (): void => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('error', onError)
        this.sources.delete(filePath)
        this.emit({ type: 'sourceerror', sourceFile: filePath, error: new Error('Failed to load video') })
        reject(new Error(`Failed to load video: ${filePath}`))
      }

      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('error', onError)

      // Set source with proper file:// protocol and URL encoding
      // Normalize path separators and encode special characters (spaces, etc.)
      const normalizedPath = filePath.replace(/\\/g, '/')
      const encodedPath = encodeURI(normalizedPath)
      video.src = `file://${encodedPath}`
    })
  }

  /**
   * Unload a video source from the pool
   */
  private unloadVideoSource(filePath: string): void {
    const source = this.sources.get(filePath)
    if (!source) return

    // Disconnect from AudioMixer
    this.audioMixer.disconnectVideo(source.element)

    // Stop and clear video
    source.element.pause()
    source.element.src = ''
    source.element.load()

    this.sources.delete(filePath)
  }

  /**
   * Evict the least recently used source to free up memory
   */
  private evictLeastRecentlyUsedSource(): void {
    let oldestTime = Infinity
    let oldestPath: string | null = null

    for (const [filePath, source] of this.sources) {
      // Don't evict sources for active clips
      const isActive = this.state.activeClips.some((clip) => clip.intermediatePath === filePath)
      if (isActive) continue

      if (source.lastAccessed < oldestTime) {
        oldestTime = source.lastAccessed
        oldestPath = filePath
      }
    }

    if (oldestPath) {
      this.unloadVideoSource(oldestPath)
    }
  }

  /**
   * Calculate total timeline duration
   */
  private calculateTimelineDuration(): number {
    let maxEnd = 0

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        // Note: clip.duration is already the effective duration (after trim applied)
        const clipEnd = clip.startTime + clip.duration
        if (clipEnd > maxEnd) {
          maxEnd = clipEnd
        }
      }
    }

    return maxEnd
  }
}
