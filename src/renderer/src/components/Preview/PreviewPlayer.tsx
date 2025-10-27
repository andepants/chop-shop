/**
 * PreviewPlayer Component
 * HTML5 video player that renders in the center preview area
 * Subscribes to playbackStore for current clip and playback state
 */

import { useEffect, useRef } from 'react'
import { usePlaybackStore } from '@/store/playbackStore'
import { useTimelineStore } from '@/store/timelineStore'
import { PlaybackControls } from './PlaybackControls'

/**
 * PreviewPlayer component
 * Renders HTML5 video element with playback controls
 * Handles video events: timeupdate, ended, loadedmetadata, error
 * Synchronizes playhead position with timeline during playback
 *
 * @returns React component with video player and controls
 */
export function PreviewPlayer(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Playback state
  const currentClipId = usePlaybackStore((state) => state.currentClipId)
  const isLoading = usePlaybackStore((state) => state.isLoading)
  const setVideoElement = usePlaybackStore((state) => state.setVideoElement)
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime)
  const setLoading = usePlaybackStore((state) => state.setLoading)
  const setDuration = usePlaybackStore((state) => state.setDuration)
  const pause = usePlaybackStore((state) => state.pause)
  const loadClip = usePlaybackStore((state) => state.loadClip)

  // Timeline state
  const setPlayhead = useTimelineStore((state) => state.setPlayhead)
  const tracks = useTimelineStore((state) => state.tracks)

  /**
   * Initialize video element reference on mount
   */
  useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current)
    }

    return () => {
      setVideoElement(null)
    }
  }, [setVideoElement])

  /**
   * Handle video timeupdate event
   * Updates playback store current time and synchronizes timeline playhead
   */
  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget
    const currentTime = video.currentTime

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
  function handleLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget
    setDuration(video.duration)
    setLoading(false)
  }

  /**
   * Handle video error event
   * Displays user-friendly error message
   */
  function handleError(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget
    const error = video.error

    let errorMessage = 'Failed to load video'
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading aborted'
          break
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video'
          break
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Video decoding failed'
          break
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported'
          break
      }
    }

    console.error('Video error:', errorMessage)
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

      <video
        ref={videoRef}
        className={`max-w-full max-h-full ${!currentClipId || isLoading ? 'hidden' : ''}`}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      />

      <PlaybackControls />
    </div>
  )
}
