/**
 * Playback Store
 * Zustand store for managing video playback state, current clip, and Video.js player control
 */

import { create } from 'zustand'
import type Player from 'video.js/dist/types/player'
import { useTimelineStore } from './timelineStore'
import type { Clip } from '../components/Timeline/timeline.types'

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
  /** Volume level (0-100) */
  volume: number
  /** Whether audio is muted */
  isMuted: boolean
  /** Whether playback is pending (waiting for video to be ready) */
  pendingPlay: boolean
  /** Global timeline position (in seconds) - differs from currentTime which is clip-specific */
  globalTimelinePosition: number
  /** Ordered array of clips for playback */
  playbackQueue: Clip[]
  /** ID of the next clip in sequence */
  nextClipId: string | null
  /** Whether a clip transition is in progress */
  isTransitioning: boolean

  // Actions
  /** Load a clip into the player by ID */
  loadClip: (clipId: string, autoPlay?: boolean) => void
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
  /** Set volume level (0-100) */
  setVolume: (volume: number) => void
  /** Toggle mute state */
  toggleMute: () => void
  /** Step forward one frame (~1/30 second) */
  stepForward: () => void
  /** Step backward one frame (~1/30 second) */
  stepBackward: () => void
  /** Attempt to play if there's a pending play request */
  tryPendingPlay: () => void
  /** Update global timeline position */
  setGlobalTimelinePosition: (position: number) => void
  /** Update playback queue from timeline */
  updatePlaybackQueue: () => void
  /** Transition to next clip */
  transitionToNextClip: () => Promise<void>
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
  volume: 100,
  isMuted: false,
  pendingPlay: false,
  globalTimelinePosition: 0,
  playbackQueue: [],
  nextClipId: null,
  isTransitioning: false,

  // Actions

  /**
   * Load a clip into the player
   * Looks up clip from timeline store and sets video source to file path
   * Uses proper file:// URL encoding for Electron
   */
  loadClip: (clipId: string, autoPlay = false) => {
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
    // Effective duration = total duration - trim from start - trim from end
    const clipDuration = clip.duration - clip.trimIn - clip.trimOut
    set({
      isLoading: true,
      currentClipId: clipId,
      duration: clipDuration,
      pendingPlay: autoPlay // Set pending play if autoPlay requested
    })

    // Set video source using proper file:// protocol for Electron local files
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = clip.sourceFile.replace(/\\/g, '/')
    const fileUrl = `file://${normalizedPath}`

    console.log('Loading clip:', { clipId, sourceFile: clip.sourceFile, fileUrl, clipDuration, autoPlay })

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

    // Update playback queue after loading to ensure nextClipId is set
    // Use setTimeout to ensure state updates have propagated
    setTimeout(() => {
      get().updatePlaybackQueue()
    }, 0)
  },

  /**
   * Start video playback
   * Returns a promise that resolves when playback starts
   * Uses smart retry mechanism - if video isn't ready, sets pendingPlay flag
   * and will automatically play once video becomes ready
   */
  play: async () => {
    const { videoPlayer, currentClipId } = get()

    console.log('[PlaybackStore] Play button clicked', {
      hasVideoPlayer: !!videoPlayer,
      currentClipId,
      timestamp: new Date().toISOString()
    })

    if (!videoPlayer) {
      console.warn('[PlaybackStore] Cannot play: video player not initialized')
      return
    }

    // Update playback queue BEFORE starting playback
    // This ensures nextClipId is set for continuous playback
    console.log('[PlaybackStore] Updating playback queue before play')
    get().updatePlaybackQueue()

    // Log detailed video player state
    const readyState = videoPlayer.readyState()
    const currentTime = videoPlayer.currentTime()
    const duration = videoPlayer.duration()
    const src = videoPlayer.currentSrc()
    const paused = videoPlayer.paused()
    const ended = videoPlayer.ended()
    const networkState = videoPlayer.networkState()

    console.log('[PlaybackStore] Video player state:', {
      readyState,
      readyStateDescription: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][readyState] || 'UNKNOWN',
      currentTime,
      duration,
      src,
      paused,
      ended,
      networkState,
      networkStateDescription: ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'][networkState] || 'UNKNOWN'
    })

    // Check if video is ready to play (readyState >= 2 means we have current frame)
    if (readyState < 2) {
      console.log('[PlaybackStore] Video not ready yet, setting pendingPlay=true. Will auto-play when ready.')
      set({ pendingPlay: true })
      return
    }

    try {
      console.log('[PlaybackStore] Attempting to play video...')
      await videoPlayer.play()
      console.log('[PlaybackStore] Playback started successfully')
      set({ isPlaying: true, pendingPlay: false })
    } catch (error) {
      console.error('[PlaybackStore] Playback failed:', error)
      set({ pendingPlay: false })
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
   * Constrains seeking to trimmed region (Story 3.1 - AC #4)
   */
  seek: (time: number) => {
    const { videoPlayer, currentClipId } = get()
    if (!videoPlayer) {
      console.warn('Cannot seek: video player not initialized')
      return
    }

    // Clamp seek time to trim bounds
    let clampedTime = time
    if (currentClipId) {
      const timelineState = useTimelineStore.getState()
      const clip = timelineState.tracks
        .flatMap((track) => track.clips)
        .find((c) => c.id === currentClipId)

      if (clip) {
        const trimStart = clip.trimIn
        const trimEnd = clip.duration - clip.trimOut
        clampedTime = Math.max(trimStart, Math.min(time, trimEnd))
      }
    }

    videoPlayer.currentTime(clampedTime)
    set({ currentTime: clampedTime })
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
   * Syncs initial volume and mute state to the player
   */
  setVideoPlayer: (player: Player | null) => {
    if (player) {
      const { volume, isMuted } = get()
      // Sync initial volume and mute state
      player.volume(volume / 100) // Video.js uses 0-1 range
      player.muted(isMuted)
    }
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
  },

  /**
   * Set volume level (0-100)
   * Also updates the Video.js player volume
   */
  setVolume: (volume: number) => {
    const { videoPlayer } = get()
    const clampedVolume = Math.max(0, Math.min(100, volume))

    if (videoPlayer) {
      videoPlayer.volume(clampedVolume / 100) // Video.js uses 0-1 range
    }

    set({ volume: clampedVolume })
  },

  /**
   * Toggle mute state
   * Mutes/unmutes the Video.js player
   */
  toggleMute: () => {
    const { videoPlayer, isMuted } = get()

    if (videoPlayer) {
      videoPlayer.muted(!isMuted)
    }

    set({ isMuted: !isMuted })
  },

  /**
   * Step forward one frame (approximately 1/30 second)
   * Pauses playback if playing
   */
  stepForward: () => {
    const { videoPlayer, isPlaying, pause } = get()
    if (!videoPlayer) {
      console.warn('Cannot step forward: video player not initialized')
      return
    }

    // Pause if playing
    if (isPlaying) {
      pause()
    }

    // Step forward by 1/30 second (standard frame rate)
    const currentTime = videoPlayer.currentTime() || 0
    const newTime = currentTime + 1 / 30
    videoPlayer.currentTime(newTime)
  },

  /**
   * Step backward one frame (approximately 1/30 second)
   * Pauses playback if playing
   */
  stepBackward: () => {
    const { videoPlayer, isPlaying, pause } = get()
    if (!videoPlayer) {
      console.warn('Cannot step backward: video player not initialized')
      return
    }

    // Pause if playing
    if (isPlaying) {
      pause()
    }

    // Step backward by 1/30 second (standard frame rate)
    const currentTime = videoPlayer.currentTime() || 0
    const newTime = Math.max(0, currentTime - 1 / 30)
    videoPlayer.currentTime(newTime)
  },

  /**
   * Try to play video if there's a pending play request
   * Called by PreviewPlayer when video becomes ready (canplay event)
   */
  tryPendingPlay: () => {
    const { pendingPlay, play, videoPlayer } = get()

    if (!pendingPlay) {
      return
    }

    console.log('[PlaybackStore] Video ready, attempting pending play')
    const readyState = videoPlayer?.readyState()
    console.log('[PlaybackStore] Current readyState:', readyState)

    // Trigger play which will clear pendingPlay flag
    play()
  },

  /**
   * Update global timeline position
   * Called by PlaybackOrchestrator during RAF monitoring
   */
  setGlobalTimelinePosition: (position: number) => {
    set({ globalTimelinePosition: position })

    // Also update timeline store's playhead position for visual sync
    useTimelineStore.getState().setPlayhead(position)
  },

  /**
   * Update playback queue from timeline
   * Builds ordered list of clips and calculates next clip
   */
  updatePlaybackQueue: () => {
    const { currentClipId } = get()
    const timelineState = useTimelineStore.getState()

    // Build ordered queue
    const queue = timelineState.tracks
      .flatMap(track => track.clips)
      .sort((a, b) => a.startTime - b.startTime)

    // Find next clip
    let nextClipId: string | null = null
    if (currentClipId) {
      const currentIndex = queue.findIndex(c => c.id === currentClipId)
      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        nextClipId = queue[currentIndex + 1].id
      }
    }

    set({ playbackQueue: queue, nextClipId })
    console.log('[PlaybackStore] Updated playback queue:', { queueLength: queue.length, nextClipId })
  },

  /**
   * Transition to the next clip in the playback queue
   * Called by PlaybackOrchestrator when approaching trim end
   */
  transitionToNextClip: async () => {
    const { nextClipId, isTransitioning, loadClip } = get()

    if (isTransitioning) {
      console.log('[PlaybackStore] Transition already in progress, skipping')
      return
    }

    if (!nextClipId) {
      console.log('[PlaybackStore] No next clip to transition to')
      return
    }

    set({ isTransitioning: true })
    console.log('[PlaybackStore] Transitioning to next clip:', nextClipId)

    try {
      // Load next clip with autoPlay
      loadClip(nextClipId, true)

      // Update queue to reflect new current clip
      get().updatePlaybackQueue()

      console.log('[PlaybackStore] Transition complete')
    } catch (error) {
      console.error('[PlaybackStore] Transition failed:', error)
    } finally {
      set({ isTransitioning: false })
    }
  }
}))
