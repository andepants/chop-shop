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
    <div className="flex items-center gap-4 px-6 py-4 bg-zinc-950 border-t border-zinc-800 w-full shadow-lg">
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        disabled={!currentClipId}
        className="group relative w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-cyan-500/50 disabled:shadow-none"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Time Display */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 rounded-md border border-zinc-800">
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-mono font-semibold text-zinc-100 min-w-[80px]">
            {formatTime(currentTime)}
          </span>
        </div>
        <span className="text-zinc-600 font-bold">/</span>
        <div className="px-3 py-1.5 bg-zinc-900 rounded-md border border-zinc-800">
          <span className="text-sm font-mono font-semibold text-zinc-400 min-w-[80px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Status Indicator */}
      {currentClipId && (
        <div className="flex items-center gap-2 ml-auto">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-600'}`}></div>
          <span className="text-xs text-zinc-500 font-medium">
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
        </div>
      )}
    </div>
  )
}
