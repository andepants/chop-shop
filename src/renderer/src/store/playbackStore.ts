/**
 * Playback Store
 * Zustand store for managing video playback state, current clip, and Video.js player control
 */

import { create } from 'zustand'
import type Player from 'video.js/dist/types/player'
import { useTimelineStore } from './timelineStore'

/**
 * Playback state interface
 * Manages video player state, current clip, playback time, and Video.js player reference
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
  /** Reference to the Video.js player instance for direct control */
  videoPlayer: Player | null
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
  /** Set the Video.js player reference */
  setVideoPlayer: (player: Player | null) => void
  /** Set loading state */
  setLoading: (loading: boolean) => void
  /** Set duration when metadata loads */
  setDuration: (duration: number) => void
}

/**
 * Playback state store
 * Manages video playback state and controls using Video.js API
 *
 * Initializes with:
 * - No clip loaded
 * - Playback paused
 * - Time at 0:00
 * - No video player reference
 */
export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  // State
  currentClipId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  videoPlayer: null,
  isLoading: false,

  // Actions

  /**
   * Load a clip into the player
   * Looks up clip from timeline store and sets video source to file path
   * Uses proper file:// URL encoding for Electron
   */
  loadClip: (clipId: string) => {
    const { videoPlayer } = get()
    if (!videoPlayer) {
      console.warn('Cannot load clip: video player not initialized')
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

    // Set clip duration immediately from timeline data
    // This ensures duration is correct even before video metadata loads
    const clipDuration = clip.trimOut - clip.trimIn
    set({ isLoading: true, currentClipId: clipId, duration: clipDuration })

    // Set video source using proper file:// protocol for Electron local files
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = clip.sourceFile.replace(/\\/g, '/')
    const fileUrl = `file://${normalizedPath}`

    console.log('Loading clip:', { clipId, sourceFile: clip.sourceFile, fileUrl, clipDuration })

    // Determine video type from file extension
    const extension = clip.sourceFile.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska'
    }
    const videoType = extension ? typeMap[extension] || 'video/mp4' : 'video/mp4'

    // Set source with Video.js API
    videoPlayer.src({
      src: fileUrl,
      type: videoType
    })

    // Set initial current time to trim-in point
    videoPlayer.currentTime(clip.trimIn)
  },

  /**
   * Start video playback
   * Returns a promise that resolves when playback starts
   */
  play: async () => {
    const { videoPlayer } = get()
    if (!videoPlayer) {
      console.warn('Cannot play: video player not initialized')
      return
    }

    try {
      await videoPlayer.play()
      set({ isPlaying: true })
    } catch (error) {
      console.error('Playback failed:', error)
    }
  },

  /**
   * Pause video playback
   */
  pause: () => {
    const { videoPlayer } = get()
    if (!videoPlayer) {
      console.warn('Cannot pause: video player not initialized')
      return
    }

    videoPlayer.pause()
    set({ isPlaying: false })
  },

  /**
   * Seek to a specific time in the current clip
   */
  seek: (time: number) => {
    const { videoPlayer } = get()
    if (!videoPlayer) {
      console.warn('Cannot seek: video player not initialized')
      return
    }

    videoPlayer.currentTime(time)
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
   * Set the Video.js player reference
   * Called when PreviewPlayer component mounts and initializes Video.js
   */
  setVideoPlayer: (player: Player | null) => {
    set({ videoPlayer: player })
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
