/**
 * Playback Store
 * Zustand store for managing video playback state, current clip, and video element control
 */

import { create } from 'zustand'
import { useTimelineStore } from './timelineStore'
import type { Clip } from '@/components/Timeline/timeline.types'

/**
 * Playback state interface
 * Manages video player state, current clip, playback time, and video element reference
 */
export interface PlaybackState {
  /** ID of the currently loaded clip */
  currentClipId: string | null
  /** Whether video is currently playing */
  isPlaying: boolean
  /** Current playback time within the clip (in seconds) */
  currentTime: number
  /** Total duration of the current clip (in seconds) */
  duration: number
  /** Reference to the HTML5 video element for direct control */
  videoElement: HTMLVideoElement | null
  /** Whether the video is currently loading */
  isLoading: boolean

  // Actions
  /** Load a clip into the player by ID */
  loadClip: (clipId: string) => void
  /** Start playback */
  play: () => Promise<void>
  /** Pause playback */
  pause: () => void
  /** Seek to a specific time in the current clip */
  seek: (time: number) => void
  /** Update current playback time */
  setCurrentTime: (time: number) => void
  /** Set the video element reference */
  setVideoElement: (element: HTMLVideoElement | null) => void
  /** Set loading state */
  setLoading: (loading: boolean) => void
  /** Set duration when metadata loads */
  setDuration: (duration: number) => void
}

/**
 * Playback state store
 * Manages video playback state and controls
 *
 * Initializes with:
 * - No clip loaded
 * - Playback paused
 * - Time at 0:00
 * - No video element reference
 */
export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  // State
  currentClipId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  videoElement: null,
  isLoading: false,

  // Actions

  /**
   * Load a clip into the player
   * Looks up clip from timeline store and sets video source to file path
   */
  loadClip: (clipId: string) => {
    const { videoElement } = get()
    if (!videoElement) {
      console.warn('Cannot load clip: video element not initialized')
      return
    }

    // Find clip in timeline store
    const timelineState = useTimelineStore.getState()
    const clip = timelineState.tracks
      .flatMap((track) => track.clips)
      .find((c) => c.id === clipId)

    if (!clip) {
      console.warn(`Clip not found: ${clipId}`)
      return
    }

    set({ isLoading: true, currentClipId: clipId })

    // Set video source using file:// protocol for local files
    videoElement.src = `file://${clip.sourceFile}`

    // Set initial current time to trim-in point
    videoElement.currentTime = clip.trimIn
  },

  /**
   * Start video playback
   * Returns a promise that resolves when playback starts
   */
  play: async () => {
    const { videoElement } = get()
    if (!videoElement) {
      console.warn('Cannot play: video element not initialized')
      return
    }

    try {
      await videoElement.play()
      set({ isPlaying: true })
    } catch (error) {
      console.error('Playback failed:', error)
    }
  },

  /**
   * Pause video playback
   */
  pause: () => {
    const { videoElement } = get()
    if (!videoElement) {
      console.warn('Cannot pause: video element not initialized')
      return
    }

    videoElement.pause()
    set({ isPlaying: false })
  },

  /**
   * Seek to a specific time in the current clip
   */
  seek: (time: number) => {
    const { videoElement } = get()
    if (!videoElement) {
      console.warn('Cannot seek: video element not initialized')
      return
    }

    videoElement.currentTime = time
    set({ currentTime: time })
  },

  /**
   * Update current playback time
   * Called by video timeupdate event handler
   */
  setCurrentTime: (time: number) => {
    set({ currentTime: time })
  },

  /**
   * Set the video element reference
   * Called when PreviewPlayer component mounts
   */
  setVideoElement: (element: HTMLVideoElement | null) => {
    set({ videoElement: element })
  },

  /**
   * Set loading state
   */
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  /**
   * Set duration when video metadata loads
   */
  setDuration: (duration: number) => {
    set({ duration })
  }
}))
