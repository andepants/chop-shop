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

  constructor(options: CompositorOptions) {
    this.canvas = options.canvas
    this.width = options.width
    this.height = options.height
    this.maxVideoElements = options.maxVideoElements ?? 10
    this.preloadAhead = options.preloadAhead ?? 2 // seconds

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

    console.log('[VideoCompositor] Initialized', {
      width: this.width,
      height: this.height,
      maxVideoElements: this.maxVideoElements
    })
  }

  /**
   * Load timeline data into the compositor
   * @param tracks Array of tracks with clips
   */
  async loadTimeline(tracks: CompositorTrack[]): Promise<void> {
    console.log('[VideoCompositor] Loading timeline', { trackCount: tracks.length })

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

    console.log('[VideoCompositor] Timeline duration:', this.timelineDuration)

    // Collect unique intermediate files for playback
    const sourceFiles = new Set<string>()
    for (const track of this.tracks) {
      for (const clip of track.clips) {
        // Use intermediate path for playback (ProRes optimized for editing)
        sourceFiles.add(clip.intermediatePath)
      }
    }

    console.log('[VideoCompositor] Unique sources:', sourceFiles.size)

    // Unload sources no longer needed
    for (const [filePath] of this.sources) {
      if (!sourceFiles.has(filePath)) {
        this.unloadVideoSource(filePath)
      }
    }

    // Load sources for clips near current time
    const currentSources = this.getSourcesNearTime(this.state.currentTime)
    for (const sourceFile of currentSources) {
      if (!this.sources.has(sourceFile)) {
        await this.loadVideoSource(sourceFile).catch((error) => {
          console.error('[VideoCompositor] Failed to load source:', sourceFile, error)
        })
      }
    }

    // Update active clips
    this.updateActiveClips()

    // Emit event
    this.emit({ type: 'sourceloaded', currentTime: this.state.currentTime })
  }

  /**
   * Start playback
   */
  async play(): Promise<void> {
    if (this.state.isPlaying) return

    console.log('[VideoCompositor] Play from', this.state.currentTime)

    // Start all active video elements
    const playPromises: Promise<void>[] = []
    for (const clip of this.state.activeClips) {
      const source = this.sources.get(clip.intermediatePath)
      if (source && source.isLoaded) {
        // Calculate offset within source video
        const clipElapsed = this.state.currentTime - clip.startTime
        const sourceTime = clip.trimIn + clipElapsed

        source.element.currentTime = sourceTime
        playPromises.push(
          source.element.play().catch((err) => {
            console.error('[VideoCompositor] Play failed for', clip.intermediatePath, err)
          })
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

    console.log('[VideoCompositor] Pause at', this.state.currentTime)

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

    console.log('[VideoCompositor] Seek to', time)

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
   * Dispose of compositor and free resources
   */
  dispose(): void {
    console.log('[VideoCompositor] Disposing')

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
   * Start the render loop
   */
  private startRenderLoop(): void {
    if (this.state.rafHandle !== null) return

    this.frameCount = 0

    const render = (_timestamp: number): void => {
      if (!this.state.isPlaying) return

      // Update frame tracking
      this.frameCount++

      // Update current time based on video element times
      this.updateCurrentTimeFromVideos()

      // Check if reached end
      if (this.state.currentTime >= this.state.duration) {
        this.pause()
        this.emit({ type: 'ended', currentTime: this.state.currentTime })
        return
      }

      // Update active clips if changed
      this.updateActiveClips()

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

      // Verify video is at correct time (allow small tolerance)
      const timeDiff = Math.abs(video.currentTime - sourceTime)
      if (timeDiff > 0.1) {
        // Video element out of sync, seek it
        video.currentTime = sourceTime
      }

      // Draw video to canvas with opacity
      this.ctx.globalAlpha = clip.opacity

      if (clip.trackIndex === 0) {
        // Track 1: Render full-screen with aspect-fit (existing behavior)
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = this.width / this.height

        let drawWidth = this.width
        let drawHeight = this.height
        let drawX = 0
        let drawY = 0

        if (videoAspect > canvasAspect) {
          // Video is wider - fit width
          drawHeight = this.width / videoAspect
          drawY = (this.height - drawHeight) / 2
        } else {
          // Video is taller - fit height
          drawWidth = this.height * videoAspect
          drawX = (this.width - drawWidth) / 2
        }

        this.ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)
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
        }
      }
    }

    // Reset alpha
    this.ctx.globalAlpha = 1.0
  }

  /**
   * Update current time based on video element playback
   * Use the most advanced video element time as source of truth
   */
  private updateCurrentTimeFromVideos(): void {
    if (this.state.activeClips.length === 0) return

    // Find the most advanced clip time
    let maxTime = this.state.currentTime

    for (const clip of this.state.activeClips) {
      const source = this.sources.get(clip.intermediatePath)
      if (!source || !source.isLoaded) continue

      const videoTime = source.element.currentTime
      const clipElapsed = videoTime - clip.trimIn
      const globalTime = clip.startTime + clipElapsed

      if (globalTime > maxTime) {
        maxTime = globalTime
      }
    }

    this.state.currentTime = Math.min(maxTime, this.state.duration)
  }

  /**
   * Update active clips based on current time
   */
  private updateActiveClips(): void {
    const previousClipIds = this.state.activeClips.map((c) => c.id)
    const newActiveClips: CompositorClip[] = []

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration
        if (this.state.currentTime >= clip.startTime && this.state.currentTime < clipEnd) {
          newActiveClips.push(clip)
        }
      }
    }

    // Check if clips changed
    const newClipIds = newActiveClips.map((c) => c.id)
    const clipsChanged =
      previousClipIds.length !== newClipIds.length ||
      previousClipIds.some((id, i) => id !== newClipIds[i])

    if (clipsChanged) {
      console.log('[VideoCompositor] Active clips changed', {
        previous: previousClipIds,
        new: newClipIds,
        time: this.state.currentTime
      })

      this.state.activeClips = newActiveClips
      this.emit({ type: 'clipchange', clipIds: newClipIds, currentTime: this.state.currentTime })

      // Start playing new clips if in playback mode
      if (this.state.isPlaying) {
        for (const clip of newActiveClips) {
          const source = this.sources.get(clip.intermediatePath)
          if (source && source.isLoaded) {
            const clipElapsed = this.state.currentTime - clip.startTime
            const sourceTime = clip.trimIn + clipElapsed
            source.element.currentTime = sourceTime
            source.element.play().catch((err) => {
              console.error('[VideoCompositor] Failed to play clip', clip.id, err)
            })
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
        const clipEnd = clip.startTime + clip.duration
        // Include if clip overlaps with [time, preloadEnd]
        // Use intermediate path for playback (ProRes optimized for editing)
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

    console.log('[VideoCompositor] Loading source:', filePath)

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
      lastAccessed: Date.now()
    }

    this.sources.set(filePath, source)

    // Load video
    return new Promise((resolve, reject) => {
      const onLoadedMetadata = (): void => {
        source.isLoaded = true
        source.duration = video.duration
        console.log('[VideoCompositor] Source loaded:', filePath, 'duration:', video.duration)

        // Connect to AudioMixer for per-track gain control
        const trackIndex = this.getTrackIndexForSource(filePath)
        this.audioMixer.connectVideo(video, trackIndex)

        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('error', onError)
        resolve()
      }

      const onError = (err: Event): void => {
        console.error('[VideoCompositor] Source load error:', filePath, err)
        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('error', onError)
        this.sources.delete(filePath)
        this.emit({ type: 'sourceerror', sourceFile: filePath, error: new Error('Failed to load video') })
        reject(new Error(`Failed to load video: ${filePath}`))
      }

      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('error', onError)

      // Set source with proper file:// protocol
      const normalizedPath = filePath.replace(/\\/g, '/')
      video.src = `file://${normalizedPath}`
    })
  }

  /**
   * Unload a video source from the pool
   */
  private unloadVideoSource(filePath: string): void {
    const source = this.sources.get(filePath)
    if (!source) return

    console.log('[VideoCompositor] Unloading source:', filePath)

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
      console.log('[VideoCompositor] Evicting LRU source:', oldestPath)
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
        const clipEnd = clip.startTime + clip.duration
        if (clipEnd > maxEnd) {
          maxEnd = clipEnd
        }
      }
    }

    return maxEnd
  }
}
