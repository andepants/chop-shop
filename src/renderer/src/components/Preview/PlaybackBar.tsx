/**
 * PlaybackBar Component
 * Enhanced playback control bar with play/pause, time display, frame controls, and volume
 */

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { usePlaybackStore } from '@/store/playbackStore'

/**
 * Format seconds to MM:SS display
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Enhanced playback bar with full controls above timeline
 */
export function PlaybackBar(): React.JSX.Element {
  // Playback state
  const isPlaying = usePlaybackStore((state) => state.isPlaying)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const volume = usePlaybackStore((state) => state.volume)
  const isMuted = usePlaybackStore((state) => state.isMuted)
  const isLoadingSources = usePlaybackStore((state) => state.isLoadingSources)
  const sourcesLoadProgress = usePlaybackStore((state) => state.sourcesLoadProgress)

  // Playback actions
  const play = usePlaybackStore((state) => state.play)
  const pause = usePlaybackStore((state) => state.pause)
  const stepForward = usePlaybackStore((state) => state.stepForward)
  const stepBackward = usePlaybackStore((state) => state.stepBackward)
  const setVolume = usePlaybackStore((state) => state.setVolume)
  const toggleMute = usePlaybackStore((state) => state.toggleMute)

  // Check if there's a timeline loaded
  const hasTimeline = duration > 0

  /**
   * Handle play/pause button click
   * Compositor manages all clips automatically
   */
  function handlePlayPause() {
    if (!hasTimeline) {
      return
    }

    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  /**
   * Handle volume slider change
   */
  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVolume = parseInt(e.target.value, 10)
    setVolume(newVolume)
  }

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b"
      style={{
        backgroundColor: 'var(--bg-timeline)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* Left Section: Playback Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={!hasTimeline || isLoadingSources}
          className="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg"
          style={{
            backgroundColor: !hasTimeline || isLoadingSources ? 'var(--bg-secondary)' : 'var(--accent)',
            color: 'var(--text-primary)'
          }}
          aria-label={
            isLoadingSources
              ? 'Loading sources...'
              : isPlaying
                ? 'Pause'
                : 'Play'
          }
          title={
            isLoadingSources
              ? `Loading sources ${sourcesLoadProgress.loaded}/${sourcesLoadProgress.total}...`
              : isPlaying
                ? 'Pause'
                : 'Play'
          }
        >
          {isLoadingSources ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={24} />
          ) : (
            <Play size={24} />
          )}
        </button>

        {/* Frame Controls */}
        <button
          onClick={stepBackward}
          disabled={!hasTimeline}
          className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
          style={{ color: 'var(--text-primary)' }}
          aria-label="Previous frame"
          title="Previous frame (1/30s)"
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={stepForward}
          disabled={!hasTimeline}
          className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
          style={{ color: 'var(--text-primary)' }}
          aria-label="Next frame"
          title="Next frame (1/30s)"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Center Section: Time Display */}
      <div
        className="font-mono text-sm tabular-nums"
        style={{ color: 'var(--text-secondary)' }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Section: Volume Controls */}
      <div className="flex items-center gap-2">
        {/* Mute/Unmute Button */}
        <button
          onClick={toggleMute}
          disabled={!hasTimeline}
          className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
          style={{ color: 'var(--text-primary)' }}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* Volume Slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          disabled={!hasTimeline}
          className="w-24 h-1 rounded-full appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${volume}%, var(--bg-secondary) ${volume}%, var(--bg-secondary) 100%)`
          }}
          aria-label="Volume"
          title={`Volume: ${volume}%`}
        />
      </div>
    </div>
  )
}
