/**
 * Playback Store (Compositor-based)
 * Zustand store for managing video playback state using the VideoCompositor
 *
 * Simplified from the Video.js version - the compositor handles:
 * - Multi-clip sequencing (no need for clip transitions)
 * - Video loading and buffering (no pendingPlay flag needed)
 * - Timeline synchronization (no complex RAF monitoring)
 */

import { create } from 'zustand'
import { playbackOrchestrator } from '../utils/playbackOrchestrator'
import { useTimelineStore } from './timelineStore'

/**
 * Playback state interface
 * Manages playback state through the compositor
 */
export interface PlaybackState {
  /** Whether video is currently playing */
  isPlaying: boolean
  /** Current playback time on global timeline (in seconds) */
  currentTime: number
  /** Total duration of the timeline (in seconds) */
  duration: number
  /** Volume level (0-100) */
  volume: number
  /** Whether audio is muted */
  isMuted: boolean
  /** IDs of clips currently being rendered */
  activeClipIds: string[]

  // Actions
  /** Start playback */
  play: () => Promise<void>
  /** Pause playback */
  pause: () => void
  /** Seek to a specific time on the global timeline */
  seek: (time: number) => Promise<void>
  /** Set volume level (0-100) */
  setVolume: (volume: number) => void
  /** Toggle mute state */
  toggleMute: () => void
  /** Step forward one frame (~1/30 second) */
  stepForward: () => Promise<void>
  /** Step backward one frame (~1/30 second) */
  stepBackward: () => Promise<void>
  /** Initialize the compositor (called by PreviewPlayer) */
  initializeCompositor: (canvas: HTMLCanvasElement, width: number, height: number) => void
  /** Load timeline into compositor */
  loadTimeline: () => Promise<void>
  /** Internal: Update current time from compositor */
  _setCurrentTime: (time: number) => void
  /** Internal: Update playing state from compositor */
  _setIsPlaying: (isPlaying: boolean) => void
  /** Internal: Update duration from compositor */
  _setDuration: (duration: number) => void
  /** Internal: Update active clips from compositor */
  _setActiveClips: (clipIds: string[]) => void
}

/**
 * Playback state store
 * Simplified version that delegates to VideoCompositor through PlaybackOrchestrator
 */
export const usePlaybackStore = create<PlaybackState>((set, get) => {
  // Set up orchestrator callbacks once
  playbackOrchestrator.setCallbacks({
    onTimeUpdate: (time: number) => {
      get()._setCurrentTime(time)
    },
    onPlayStateChange: (isPlaying: boolean) => {
      get()._setIsPlaying(isPlaying)
    },
    onPlaybackEnd: () => {
      console.log('[PlaybackStore] Playback ended')
      // Keep playhead at end (per user requirement)
      get()._setIsPlaying(false)
    },
    onActiveClipsChange: (clipIds: string[]) => {
      get()._setActiveClips(clipIds)
    }
  })

  return {
    // State
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    isMuted: false,
    activeClipIds: [],

    // Actions

    /**
     * Initialize compositor with canvas element
     * Should be called once by PreviewPlayer on mount
     */
    initializeCompositor: (canvas: HTMLCanvasElement, width: number, height: number) => {
      console.log('[PlaybackStore] Initializing compositor', { width, height })
      playbackOrchestrator.initializeCompositor(canvas, width, height)
    },

    /**
     * Load timeline from timeline store into compositor
     * Called when timeline changes or on initial load
     */
    loadTimeline: async () => {
      console.log('[PlaybackStore] Loading timeline into compositor')

      const timelineState = useTimelineStore.getState()

      // Pause if playing before reloading (per user requirement)
      if (get().isPlaying) {
        get().pause()
      }

      try {
        await playbackOrchestrator.loadTimeline(timelineState.tracks)

        // Update duration
        const duration = playbackOrchestrator.getDuration()
        set({ duration })

        console.log('[PlaybackStore] Timeline loaded, duration:', duration)
      } catch (error) {
        console.error('[PlaybackStore] Failed to load timeline:', error)
      }
    },

    /**
     * Start video playback
     */
    play: async () => {
      console.log('[PlaybackStore] Play')

      try {
        await playbackOrchestrator.play()
        // State will be updated via callback
      } catch (error) {
        console.error('[PlaybackStore] Play failed:', error)
      }
    },

    /**
     * Pause video playback
     */
    pause: () => {
      console.log('[PlaybackStore] Pause')
      playbackOrchestrator.pause()
      // State will be updated via callback
    },

    /**
     * Seek to a specific time on the global timeline
     */
    seek: async (time: number) => {
      console.log('[PlaybackStore] Seek to', time)

      const { duration } = get()
      const clampedTime = Math.max(0, Math.min(time, duration))

      try {
        await playbackOrchestrator.seek(clampedTime)
        // State will be updated via callback
      } catch (error) {
        console.error('[PlaybackStore] Seek failed:', error)
      }
    },

    /**
     * Set volume level (0-100)
     * Note: Compositor audio control to be implemented
     */
    setVolume: (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(100, volume))
      set({ volume: clampedVolume })

      // TODO: Apply volume to compositor's video elements
      console.log('[PlaybackStore] Volume set to', clampedVolume)
    },

    /**
     * Toggle mute state
     * Note: Compositor audio control to be implemented
     */
    toggleMute: () => {
      const { isMuted } = get()
      set({ isMuted: !isMuted })

      // TODO: Apply mute to compositor's video elements
      console.log('[PlaybackStore] Mute toggled to', !isMuted)
    },

    /**
     * Step forward one frame (approximately 1/30 second)
     * Pauses playback if playing
     */
    stepForward: async () => {
      const { currentTime, duration, pause } = get()

      // Pause if playing
      if (get().isPlaying) {
        pause()
      }

      // Step forward by 1/30 second
      const newTime = Math.min(currentTime + 1 / 30, duration)
      await get().seek(newTime)
    },

    /**
     * Step backward one frame (approximately 1/30 second)
     * Pauses playback if playing
     */
    stepBackward: async () => {
      const { currentTime, pause } = get()

      // Pause if playing
      if (get().isPlaying) {
        pause()
      }

      // Step backward by 1/30 second
      const newTime = Math.max(currentTime - 1 / 30, 0)
      await get().seek(newTime)
    },

    /**
     * Internal: Update current time from compositor
     * Called by orchestrator callback
     */
    _setCurrentTime: (time: number) => {
      set({ currentTime: time })

      // Sync timeline playhead visual
      useTimelineStore.getState().setPlayhead(time)
    },

    /**
     * Internal: Update playing state from compositor
     * Called by orchestrator callback
     */
    _setIsPlaying: (isPlaying: boolean) => {
      set({ isPlaying })
    },

    /**
     * Internal: Update duration from compositor
     * Called by orchestrator callback
     */
    _setDuration: (duration: number) => {
      set({ duration })
    },

    /**
     * Internal: Update active clips from compositor
     * Called by orchestrator callback
     */
    _setActiveClips: (clipIds: string[]) => {
      set({ activeClipIds: clipIds })
    }
  }
})
