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
import { PlaybackControls } from './PlaybackControls'

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
  const setDuration = usePlaybackStore((state) => state.setDuration)
  const pause = usePlaybackStore((state) => state.pause)
  const loadClip = usePlaybackStore((state) => state.loadClip)

  // Timeline state
  const setPlayhead = useTimelineStore((state) => state.setPlayhead)
  const tracks = useTimelineStore((state) => state.tracks)

  /**
   * Initialize Video.js player on mount
   */
  useEffect(() => {
    if (!videoRef.current) return

    // Create video element for Video.js
    const videoElement = document.createElement('video-js')
    videoElement.className = 'vjs-big-play-centered'
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
    player.on('error', handleError)
    player.on('play', () => {
      console.log('Video playing')
    })
    player.on('pause', () => {
      console.log('Video paused')
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
   */
  function handleTimeUpdate() {
    const player = playerRef.current
    if (!player) return

    const currentTime = player.currentTime() || 0

    setCurrentTime(currentTime)

    // Synchronize timeline playhead position
    if (currentClipId) {
      const clip = tracks.flatMap((track) => track.clips).find((c) => c.id === currentClipId)

      if (clip) {
        // Calculate timeline position: clip start time + (current time - trim in)
        const timelinePosition = clip.startTime + (currentTime - clip.trimIn)
        setPlayhead(timelinePosition)
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
   */
  function handleLoadedMetadata() {
    const player = playerRef.current
    if (!player) return

    const duration = player.duration() || 0
    setDuration(duration)
    setLoading(false)
  }

  /**
   * Handle video error event
   * Displays user-friendly error message
   */
  function handleError() {
    const player = playerRef.current
    if (!player) return

    const error = player.error()

    let errorMessage = 'Failed to load video'
    if (error) {
      switch (error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = 'Video loading aborted'
          break
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = 'Network error while loading video'
          break
        case 3: // MEDIA_ERR_DECODE
          errorMessage = 'Video decoding failed'
          break
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = 'Video format not supported'
          break
      }
    }

    console.error('Video error:', errorMessage, error)
    setLoading(false)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-black">
      {!currentClipId && !isLoading && (
        <div className="text-zinc-500 text-center">
          <p className="text-lg">No clip selected</p>
          <p className="text-sm mt-2">Click a clip on the timeline to preview</p>
        </div>
      )}

      {isLoading && (
        <div className="text-zinc-400 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      )}

      <div
        ref={videoRef}
        className={`w-full h-full flex items-center justify-center ${!currentClipId || isLoading ? 'hidden' : ''}`}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />

      <PlaybackControls />
    </div>
  )
}
