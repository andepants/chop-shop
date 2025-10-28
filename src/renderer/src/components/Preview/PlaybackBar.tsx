/**
 * PlaybackBar Component
 * Simple playback control bar with play/pause button
 */

import { usePlaybackStore } from '@/store/playbackStore'

/**
 * PlayIcon component
 */
function PlayIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

/**
 * PauseIcon component
 */
function PauseIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  )
}

/**
 * Simple playback bar with play/pause button above timeline
 */
export function PlaybackBar(): React.JSX.Element {
  const isPlaying = usePlaybackStore((state) => state.isPlaying)
  const currentClipId = usePlaybackStore((state) => state.currentClipId)
  const play = usePlaybackStore((state) => state.play)
  const pause = usePlaybackStore((state) => state.pause)

  /**
   * Handle play/pause button click
   */
  function handlePlayPause() {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  return (
    <div
      className="flex items-center justify-center px-4 py-3 border-b"
      style={{
        backgroundColor: 'var(--bg-timeline)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        disabled={!currentClipId}
        className="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg"
        style={{
          backgroundColor: !currentClipId ? 'var(--bg-secondary)' : 'var(--accent)',
          color: 'var(--text-primary)'
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  )
}
