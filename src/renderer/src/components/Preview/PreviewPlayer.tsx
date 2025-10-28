/**
 * PreviewPlayer Component
 * Video.js player that renders in the center preview area
 * Subscribes to playbackStore for current clip and playback state
 */

import { useEffect, useRef } from 'react'
import videojs from 'video.js'
import type Player from 'video.js/dist/types/player'
import { usePlaybackStore } from '@/store/playbackStore'
import { useTimelineStore } from '@/store/timelineStore'

/**
 * PreviewPlayer component
 * Renders Video.js player with playback controls
 * Handles video events: timeupdate, ended, loadedmetadata, error
 * Synchronizes playhead position with timeline during playback
 *
 * @returns React component with video player and controls
 */
export function PreviewPlayer(): React.JSX.Element {
  const videoRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Player | null>(null)

  // Playback state
  const currentClipId = usePlaybackStore((state) => state.currentClipId)
  const isLoading = usePlaybackStore((state) => state.isLoading)
  const setVideoPlayer = usePlaybackStore((state) => state.setVideoPlayer)
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime)
  const setLoading = usePlaybackStore((state) => state.setLoading)
  const pause = usePlaybackStore((state) => state.pause)
  const loadClip = usePlaybackStore((state) => state.loadClip)
  const tryPendingPlay = usePlaybackStore((state) => state.tryPendingPlay)

  // Timeline state
  const setPlayhead = useTimelineStore((state) => state.setPlayhead)
  const tracks = useTimelineStore((state) => state.tracks)

  /**
   * Initialize Video.js player on mount
   */
  useEffect(() => {
    if (!videoRef.current) return

    // Create video element for Video.js
    const videoElement = document.createElement('video')
    videoElement.className = 'video-js vjs-big-play-centered'
    videoRef.current.appendChild(videoElement)

    // Initialize Video.js player
    const player = videojs(
      videoElement,
      {
        controls: false, // We use custom controls
        preload: 'auto',
        fluid: false,
        responsive: false,
        fill: true,
        aspectRatio: '16:9',
        errorDisplay: false, // Handle errors ourselves
        loadingSpinner: false // Use custom loading indicator
      },
      function onPlayerReady() {
        console.log('Video.js player is ready')
      }
    )

    playerRef.current = player

    // Set up event listeners
    player.on('timeupdate', handleTimeUpdate)
    player.on('ended', handleEnded)
    player.on('loadedmetadata', handleLoadedMetadata)
    player.on('canplay', handleCanPlay)
    player.on('error', handleError)
    player.on('play', () => {
      console.log('[PreviewPlayer] Video play event fired', {
        currentTime: player.currentTime(),
        src: player.currentSrc()
      })
    })
    player.on('pause', () => {
      console.log('[PreviewPlayer] Video pause event fired', {
        currentTime: player.currentTime(),
        src: player.currentSrc()
      })
    })
    player.on('loadstart', () => {
      console.log('[PreviewPlayer] Video load started', {
        src: player.currentSrc()
      })
    })
    player.on('loadeddata', () => {
      console.log('[PreviewPlayer] Video data loaded (first frame)', {
        readyState: player.readyState(),
        currentTime: player.currentTime()
      })
    })

    // Set player reference in store
    setVideoPlayer(player)

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
        playerRef.current = null
      }
      setVideoPlayer(null)
    }
  }, [setVideoPlayer])

  /**
   * Handle video timeupdate event
   * Updates playback store current time and synchronizes timeline playhead
   * Enforces trim bounds by pausing at trimOut point (Story 3.1 - AC #6)
   */
  function handleTimeUpdate() {
    const player = playerRef.current
    if (!player) return

    const currentTime = player.currentTime() || 0

    setCurrentTime(currentTime)

    // Synchronize timeline playhead position and enforce trim bounds
    if (currentClipId) {
      const clip = tracks.flatMap((track) => track.clips).find((c) => c.id === currentClipId)

      if (clip) {
        // Calculate timeline position: clip start time + (current time - trim in)
        const timelinePosition = clip.startTime + (currentTime - clip.trimIn)
        setPlayhead(timelinePosition)

        // Enforce trim end boundary: pause when reaching (duration - trimOut)
        const trimEndTime = clip.duration - clip.trimOut
        if (currentTime >= trimEndTime) {
          pause()
          // Keep currentTime at the boundary (don't let it go beyond)
          player.currentTime(trimEndTime)
        }
      }
    }
  }

  /**
   * Handle video ended event
   * Transitions to next clip if available, otherwise stops playback
   */
  function handleEnded() {
    if (!currentClipId) return

    // Get all clips sorted by start time
    const allClips = tracks.flatMap((track) => track.clips).sort((a, b) => a.startTime - b.startTime)

    const currentIndex = allClips.findIndex((c) => c.id === currentClipId)

    // Check if there's a next clip
    if (currentIndex >= 0 && currentIndex < allClips.length - 1) {
      const nextClip = allClips[currentIndex + 1]
      loadClip(nextClip.id)
      // Play will be triggered by the loadedmetadata event
    } else {
      // End of timeline - stop playback and reset playhead
      pause()
      setPlayhead(0)
    }
  }

  /**
   * Handle video loadedmetadata event
   * Fired when video metadata (duration, dimensions) is available
   * Note: Duration is already set from clip data in loadClip(), so we don't overwrite it here
   */
  function handleLoadedMetadata() {
    const player = playerRef.current
    if (!player) return

    const duration = player.duration()
    const videoWidth = player.videoWidth()
    const videoHeight = player.videoHeight()
    const readyState = player.readyState()

    console.log('[PreviewPlayer] Video metadata loaded', {
      duration,
      videoWidth,
      videoHeight,
      readyState,
      src: player.currentSrc()
    })

    // Duration is already set from clip data, just mark as loaded
    setLoading(false)
  }

  /**
   * Handle video canplay event
   * Fired when video is ready to play
   * Triggers pending play if user clicked play while video was loading
   */
  function handleCanPlay() {
    const player = playerRef.current
    if (!player) return

    const readyState = player.readyState()
    const currentTime = player.currentTime()
    const buffered = player.buffered()
    const bufferedEnd = buffered.length > 0 ? buffered.end(0) : 0

    console.log('[PreviewPlayer] Video can play event fired', {
      readyState,
      readyStateDescription: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][readyState] || 'UNKNOWN',
      currentTime,
      bufferedEnd,
      src: player.currentSrc()
    })

    // Try to play if there's a pending play request
    console.log('[PreviewPlayer] Checking for pending play...')
    tryPendingPlay()
  }

  /**
   * Handle video error event
   * Displays user-friendly error message with detailed logging
   */
  function handleError() {
    const player = playerRef.current
    if (!player) return

    const error = player.error()

    let errorMessage = 'Failed to load video'
    let errorCode = 'UNKNOWN'

    if (error) {
      switch (error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = 'Video loading aborted'
          errorCode = 'MEDIA_ERR_ABORTED'
          break
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = 'Network error while loading video'
          errorCode = 'MEDIA_ERR_NETWORK'
          break
        case 3: // MEDIA_ERR_DECODE
          errorMessage = 'Video decoding failed'
          errorCode = 'MEDIA_ERR_DECODE'
          break
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = 'Video format not supported'
          errorCode = 'MEDIA_ERR_SRC_NOT_SUPPORTED'
          break
      }
    }

    console.error('[PreviewPlayer] Video error occurred', {
      errorCode,
      errorMessage,
      message: error?.message,
      src: player.currentSrc(),
      readyState: player.readyState(),
      networkState: player.networkState(),
      fullError: error
    })

    setLoading(false)
  }

  /**
   * Handle click on player area to toggle play/pause
   */
  function handlePlayerClick() {
    const player = playerRef.current
    if (!player || !currentClipId) return

    const isPlaying = usePlaybackStore.getState().isPlaying
    const play = usePlaybackStore.getState().play
    const pause = usePlaybackStore.getState().pause

    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-black">
      {!currentClipId && !isLoading && (
        <div style={{ color: 'var(--text-secondary)' }} className="text-center">
          <p className="text-sm">No clip selected</p>
          <p className="text-xs mt-1">Drag media to timeline</p>
        </div>
      )}

      {isLoading && (
        <div style={{ color: 'var(--text-secondary)' }} className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3"
            style={{ borderColor: 'var(--accent)' }}
          ></div>
          <p className="text-sm">Loading...</p>
        </div>
      )}

      <div
        ref={videoRef}
        onClick={handlePlayerClick}
        className={`w-full h-full flex items-center justify-center cursor-pointer ${!currentClipId || isLoading ? 'hidden' : ''}`}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  )
}
