/**
 * PlaybackOrchestrator
 *
 * Manages continuous playback across multiple timeline clips with seamless transitions.
 * Handles trim bounds, clip sequencing, pre-loading, and playhead synchronization.
 *
 * Key responsibilities:
 * - Build playback queue from timeline clips
 * - Convert between global timeline position and clip-specific time
 * - Detect approaching trim end points and trigger transitions
 * - Provide smooth 60fps playhead synchronization via RAF
 * - Pre-load next clips to eliminate transition lag
 *
 * Architecture Note:
 * This orchestrator reads directly from Zustand stores on every RAF tick
 * to avoid closure capture bugs. This ensures it always sees the latest
 * timeline state, even when clips are trimmed/deleted during playback.
 */

import type { Clip } from '../components/Timeline/timeline.types'
import { usePlaybackStore } from '../store/playbackStore'
import { useTimelineStore } from '../store/timelineStore'

export interface ClipPosition {
  clip: Clip
  clipTime: number // Time within the clip (accounting for trimIn)
}

export interface PlaybackQueue {
  clips: Clip[]
  totalDuration: number
}

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
 * PlaybackOrchestrator class
 * Singleton pattern for managing timeline playback state
 */
export class PlaybackOrchestrator {
  private rafId: number | null = null
  private isMonitoring = false
  private transitionBuffer = 0.15 // 150ms before end to start transition

  // Callbacks for orchestrator actions
  private onPlayheadUpdate?: (position: number) => void
  private onClipTransition?: (nextClipId: string) => Promise<void>
  private onPlaybackEnd?: () => void
  private getCurrentTime?: () => number

  constructor() {
    console.log('[PlaybackOrchestrator] Initialized')
  }

  /**
   * Build ordered playback queue from timeline clips
   */
  buildPlaybackQueue(tracks: Array<{ clips: Clip[] }>): PlaybackQueue {
    const allClips = tracks
      .flatMap(track => track.clips)
      .sort((a, b) => a.startTime - b.startTime)

    const totalDuration = allClips.length > 0
      ? Math.max(...allClips.map(clip => calculateClipEndTime(clip)))
      : 0

    return { clips: allClips, totalDuration }
  }

  /**
   * Convert clip-specific time to global timeline position
   */
  calculateGlobalPosition(clip: Clip, clipTime: number): number {
    // Global position = clip start + (current time - trim offset)
    return clip.startTime + (clipTime - clip.trimIn)
  }

  /**
   * Find clip at a specific global timeline position
   * Returns the clip and the time to seek to within that clip
   */
  findClipAtPosition(position: number, clips: Clip[]): ClipPosition | null {
    for (const clip of clips) {
      const effectiveDuration = calculateEffectiveDuration(clip)
      const clipEnd = clip.startTime + effectiveDuration

      // Check if position falls within this clip
      if (position >= clip.startTime && position < clipEnd) {
        const offsetInClip = position - clip.startTime
        const clipTime = clip.trimIn + offsetInClip
        return { clip, clipTime }
      }
    }

    return null
  }

  /**
   * Get the next clip in the playback queue
   */
  getNextClip(currentClipId: string, clips: Clip[]): Clip | null {
    const currentIndex = clips.findIndex(c => c.id === currentClipId)

    if (currentIndex >= 0 && currentIndex < clips.length - 1) {
      return clips[currentIndex + 1]
    }

    return null
  }

  /**
   * Check if current playback is approaching the trim end boundary
   * Returns true if within transition buffer
   */
  isApproachingTrimEnd(clip: Clip, currentTime: number): boolean {
    const trimEndTime = clip.duration - clip.trimOut
    return currentTime >= trimEndTime - this.transitionBuffer
  }

  /**
   * Check if current playback has reached the trim end boundary
   */
  hasReachedTrimEnd(clip: Clip, currentTime: number): boolean {
    const trimEndTime = clip.duration - clip.trimOut
    return currentTime >= trimEndTime
  }

  /**
   * Set callback functions for orchestrator events
   */
  setCallbacks(callbacks: {
    onPlayheadUpdate?: (position: number) => void
    onClipTransition?: (nextClipId: string) => Promise<void>
    onPlaybackEnd?: () => void
    getCurrentTime?: () => number
  }): void {
    this.onPlayheadUpdate = callbacks.onPlayheadUpdate
    this.onClipTransition = callbacks.onClipTransition
    this.onPlaybackEnd = callbacks.onPlaybackEnd
    this.getCurrentTime = callbacks.getCurrentTime
  }

  /**
   * Start monitoring playback for smooth updates and transitions
   * Uses requestAnimationFrame for 60fps updates
   * Reads directly from stores to avoid closure capture bugs
   */
  startMonitoring(): void {
    // Stop existing monitoring first to allow fresh starts
    if (this.isMonitoring) {
      console.log('[PlaybackOrchestrator] Restarting monitoring with fresh state')
      this.stopMonitoring()
    }

    this.isMonitoring = true
    console.log('[PlaybackOrchestrator] Started monitoring')

    let hasTriggeredTransition = false

    const monitor = (): void => {
      // Stop if no longer monitoring
      if (!this.isMonitoring) {
        this.rafId = null
        return
      }

      // Continue RAF loop
      this.rafId = requestAnimationFrame(monitor)

      // Read fresh state from stores on every tick (no closures!)
      const playbackState = usePlaybackStore.getState()
      const timelineState = useTimelineStore.getState()

      const { isPlaying, currentClipId, nextClipId } = playbackState
      const { tracks } = timelineState

      // Only process if playing
      if (!isPlaying) {
        hasTriggeredTransition = false
        return
      }

      // Find current clip in FRESH tracks (no closure capture!)
      const currentClip = tracks
        .flatMap(track => track.clips)
        .find(clip => clip.id === currentClipId)

      const currentTime = this.getCurrentTime?.()

      if (!currentClip || currentTime === undefined) {
        return
      }

      // Update playhead position
      const globalPosition = this.calculateGlobalPosition(currentClip, currentTime)
      this.onPlayheadUpdate?.(globalPosition)

      // Check for clip transition
      if (this.isApproachingTrimEnd(currentClip, currentTime)) {
        // Find next clip in FRESH tracks
        const nextClip = tracks
          .flatMap(track => track.clips)
          .find(clip => clip.id === nextClipId)

        if (nextClip && !hasTriggeredTransition) {
          hasTriggeredTransition = true
          console.log('[PlaybackOrchestrator] Approaching trim end, transitioning to next clip:', nextClip.id)

          // Trigger transition
          this.onClipTransition?.(nextClip.id).then(() => {
            // Reset flag after transition completes
            setTimeout(() => {
              hasTriggeredTransition = false
            }, 200)
          }).catch(err => {
            console.error('[PlaybackOrchestrator] Transition failed:', err)
            hasTriggeredTransition = false
          })
        } else if (!nextClip && !hasTriggeredTransition) {
          hasTriggeredTransition = true
          console.log('[PlaybackOrchestrator] Reached end of timeline')
          this.onPlaybackEnd?.()
        }
      } else {
        hasTriggeredTransition = false
      }

      // Enforce hard boundary (fallback)
      if (this.hasReachedTrimEnd(currentClip, currentTime)) {
        // Check if there's a next clip
        const nextClip = tracks
          .flatMap(track => track.clips)
          .find(clip => clip.id === nextClipId)

        if (!nextClip) {
          console.log('[PlaybackOrchestrator] Hard boundary reached, stopping playback')
          this.onPlaybackEnd?.()
        }
      }
    }

    // Start the loop
    this.rafId = requestAnimationFrame(monitor)
  }

  /**
   * Stop monitoring playback
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    console.log('[PlaybackOrchestrator] Stopped monitoring')
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopMonitoring()
    this.onPlayheadUpdate = undefined
    this.onClipTransition = undefined
    this.onPlaybackEnd = undefined
    this.getCurrentTime = undefined
    console.log('[PlaybackOrchestrator] Disposed')
  }
}

/**
 * Create a singleton instance
 */
export const playbackOrchestrator = new PlaybackOrchestrator()
