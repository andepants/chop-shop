/**
 * PlaybackOrchestrator
 *
 * Adapter layer between timeline data and the VideoCompositor.
 * Converts timeline clips to compositor format and manages compositor lifecycle.
 *
 * Key responsibilities:
 * - Convert timeline clips to compositor tracks/clips format
 * - Initialize and manage VideoCompositor instance
 * - Forward compositor events to callbacks
 * - Provide utility functions for timeline calculations
 *
 * Architecture Note:
 * With the canvas-based compositor, we no longer need complex RAF monitoring
 * or transition detection - the compositor handles all rendering and sequencing internally.
 */

import type { Clip, Track } from '../components/Timeline/timeline.types'
import type { CompositorClip, CompositorTrack } from '../types/compositor.types'
import { VideoCompositor } from './VideoCompositor'

/**
 * Calculate the effective duration of a clip (after trim adjustments)
 */
export function calculateEffectiveDuration(clip: Clip): number {
  return clip.duration - clip.trimIn - clip.trimOut
}

/**
 * Calculate the end time of a clip on the global timeline
 */
export function calculateClipEndTime(clip: Clip): number {
  return clip.startTime + calculateEffectiveDuration(clip)
}

/**
 * Convert timeline clip to compositor clip format
 * Uses intermediatePath (H.264 Intra) for playback to enable frame-accurate editing
 */
function convertToCompositorClip(clip: Clip, trackId: string, trackIndex: number): CompositorClip {
  return {
    id: clip.id,
    trackId,
    trackIndex,
    sourceFile: clip.sourceFile, // Original file (kept for reference)
    intermediatePath: clip.intermediatePath, // H.264 Intra intermediate (used for playback)
    startTime: clip.startTime,
    duration: calculateEffectiveDuration(clip),
    trimIn: clip.trimIn,
    trimOut: clip.trimOut,
    opacity: 1.0, // Default opacity, can be extended later
    // PiP metadata (Track 2+ overlays)
    pipPosition: clip.pipPosition || (trackIndex > 0 ? 'bottom-right' : undefined),
    pipSize: clip.pipSize || (trackIndex > 0 ? 0.25 : undefined),
    showBorder: trackIndex > 0 ? true : false // Default: border on Track 2+, no border on Track 1
  }
}

/**
 * Convert timeline tracks to compositor tracks format
 */
function convertToCompositorTracks(tracks: Track[]): CompositorTrack[] {
  return tracks.map((track, index) => ({
    id: String(track.id), // Convert number to string
    index,
    clips: track.clips.map((clip) => convertToCompositorClip(clip, String(track.id), index))
  }))
}

/**
 * PlaybackOrchestrator class
 * Adapter between timeline data and VideoCompositor
 */
export class PlaybackOrchestrator {
  private compositor: VideoCompositor | null = null

  // Callbacks for events
  private onTimeUpdate?: (time: number) => void
  private onPlayStateChange?: (isPlaying: boolean) => void
  private onPlaybackEnd?: () => void
  private onActiveClipsChange?: (clipIds: string[]) => void
  private onSourcesLoading?: (loaded: number, total: number) => void
  private onSourcesReady?: (loaded: number, total: number) => void

  constructor() {
    // Initialize playback orchestrator
  }

  /**
   * Initialize compositor with canvas element
   */
  initializeCompositor(canvas: HTMLCanvasElement, width: number, height: number): void {
    if (this.compositor) {
      this.compositor.dispose()
    }

    this.compositor = new VideoCompositor({
      canvas,
      width,
      height,
      maxVideoElements: 10,
      preloadAhead: 2
    })

    // Wire up compositor events
    this.compositor.on('timeupdate', (event) => {
      if (event.currentTime !== undefined) {
        this.onTimeUpdate?.(event.currentTime)
      }
    })

    this.compositor.on('play', () => {
      this.onPlayStateChange?.(true)
    })

    this.compositor.on('pause', () => {
      this.onPlayStateChange?.(false)
    })

    this.compositor.on('ended', () => {
      this.onPlayStateChange?.(false)
      this.onPlaybackEnd?.()
    })

    this.compositor.on('clipchange', (event) => {
      if (event.clipIds) {
        this.onActiveClipsChange?.(event.clipIds)
      }
    })

    this.compositor.on('sourcesLoading', (event) => {
      if (event.loaded !== undefined && event.total !== undefined) {
        this.onSourcesLoading?.(event.loaded, event.total)
      }
    })

    this.compositor.on('sourcesReady', (event) => {
      if (event.loaded !== undefined && event.total !== undefined) {
        this.onSourcesReady?.(event.loaded, event.total)
      }
    })
  }

  /**
   * Load timeline into compositor
   */
  async loadTimeline(tracks: Track[]): Promise<void> {
    if (!this.compositor) {
      throw new Error('Compositor not initialized')
    }

    const compositorTracks = convertToCompositorTracks(tracks)
    await this.compositor.loadTimeline(compositorTracks)
  }

  /**
   * Play from current position
   */
  async play(): Promise<void> {
    if (!this.compositor) {
      throw new Error('Compositor not initialized')
    }

    await this.compositor.play()
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.compositor) {
      throw new Error('Compositor not initialized')
    }

    this.compositor.pause()
  }

  /**
   * Seek to specific time
   */
  async seek(time: number): Promise<void> {
    if (!this.compositor) {
      throw new Error('Compositor not initialized')
    }

    await this.compositor.seek(time)
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.compositor) {
      return 0
    }

    return this.compositor.getCurrentTime()
  }

  /**
   * Get timeline duration
   */
  getDuration(): number {
    if (!this.compositor) {
      return 0
    }

    return this.compositor.getDuration()
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    if (!this.compositor) {
      return false
    }

    return this.compositor.isPlaying()
  }

  /**
   * Get active clips at current time
   */
  getActiveClipIds(): string[] {
    if (!this.compositor) {
      return []
    }

    return this.compositor.getActiveClips().map(clip => clip.id)
  }

  /**
   * Resize the compositor canvas
   * @param width New canvas width
   * @param height New canvas height
   */
  resize(width: number, height: number): void {
    if (!this.compositor) {
      throw new Error('Compositor not initialized')
    }

    this.compositor.resize(width, height)
  }

  /**
   * Set callback functions
   */
  setCallbacks(callbacks: {
    onTimeUpdate?: (time: number) => void
    onPlayStateChange?: (isPlaying: boolean) => void
    onPlaybackEnd?: () => void
    onActiveClipsChange?: (clipIds: string[]) => void
    onSourcesLoading?: (loaded: number, total: number) => void
    onSourcesReady?: (loaded: number, total: number) => void
  }): void {
    this.onTimeUpdate = callbacks.onTimeUpdate
    this.onPlayStateChange = callbacks.onPlayStateChange
    this.onPlaybackEnd = callbacks.onPlaybackEnd
    this.onActiveClipsChange = callbacks.onActiveClipsChange
    this.onSourcesLoading = callbacks.onSourcesLoading
    this.onSourcesReady = callbacks.onSourcesReady
  }

  /**
   * Calculate total timeline duration from tracks
   */
  calculateTimelineDuration(tracks: Track[]): number {
    let maxEnd = 0

    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = calculateClipEndTime(clip)
        if (clipEnd > maxEnd) {
          maxEnd = clipEnd
        }
      }
    }

    return maxEnd
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.compositor) {
      this.compositor.dispose()
      this.compositor = null
    }

    this.onTimeUpdate = undefined
    this.onPlayStateChange = undefined
    this.onPlaybackEnd = undefined
    this.onActiveClipsChange = undefined
  }
}

/**
 * Create a singleton instance
 */
export const playbackOrchestrator = new PlaybackOrchestrator()
