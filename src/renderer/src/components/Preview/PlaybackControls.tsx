/**
 * PlaybackControls Component
 * Play/pause button and time display for video playback
 * Positioned at bottom of preview area with dark toolbar styling
 */

import { usePlaybackStore } from '@/store/playbackStore'
import { formatTime } from '@/utils/formatTime.util'

/**
 * PlayIcon component
 * SVG icon for play button
 */
function PlayIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

/**
 * PauseIcon component
 * SVG icon for pause button
 */
function PauseIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  )
}

/**
 * PlaybackControls component
 * Renders play/pause button and time display
 * Shows current time and total duration in MM:SS format
 *
 * @returns React component with playback controls toolbar
 */
export function PlaybackControls(): React.JSX.Element {
  const isPlaying = usePlaybackStore((state) => state.isPlaying)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const currentClipId = usePlaybackStore((state) => state.currentClipId)
  const play = usePlaybackStore((state) => state.play)
  const pause = usePlaybackStore((state) => state.pause)

  /**
   * Handle play/pause button click
   * Toggles between play and pause states
   */
  function handlePlayPause() {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900 w-full">
      <button
        onClick={handlePlayPause}
        disabled={!currentClipId}
        className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="text-sm text-zinc-300">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  )
}
