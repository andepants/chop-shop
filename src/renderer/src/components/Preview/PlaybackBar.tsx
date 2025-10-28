/**
 * PlaybackBar Component
 * Enhanced playback control bar with play/pause, time display, frame controls, and volume
 */

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { usePlaybackStore } from '@/store/playbackStore'
import { useTimelineStore } from '@/store/timelineStore'

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
  const currentClipId = usePlaybackStore((state) => state.currentClipId)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const volume = usePlaybackStore((state) => state.volume)
  const isMuted = usePlaybackStore((state) => state.isMuted)

  // Playback actions
  const play = usePlaybackStore((state) => state.play)
  const pause = usePlaybackStore((state) => state.pause)
  const loadClip = usePlaybackStore((state) => state.loadClip)
  const stepForward = usePlaybackStore((state) => state.stepForward)
  const stepBackward = usePlaybackStore((state) => state.stepBackward)
  const setVolume = usePlaybackStore((state) => state.setVolume)
  const toggleMute = usePlaybackStore((state) => state.toggleMute)

  // Timeline state
  const tracks = useTimelineStore((state) => state.tracks)

  // Check if there are any clips on the timeline
  const hasClips = tracks.some((track) => track.clips.length > 0)

  /**
   * Handle play/pause button click
   * Auto-loads first clip if no clip is currently loaded
   */
  function handlePlayPause() {
    console.log('[PlaybackBar] Play/Pause button clicked', {
      isPlaying,
      currentClipId,
      hasClips,
      currentTime,
      duration,
      timestamp: new Date().toISOString()
    })

    if (isPlaying) {
      console.log('[PlaybackBar] Pausing playback')
      pause()
    } else {
      // If no clip is loaded but there are clips on timeline, load the first one
      if (!currentClipId && hasClips) {
        const allClips = tracks.flatMap((track) => track.clips)
        const firstClip = allClips.sort((a, b) => a.startTime - b.startTime)[0]

        if (firstClip) {
          console.log('[PlaybackBar] No clip loaded, loading first clip:', {
            clipId: firstClip.id,
            sourceFile: firstClip.sourceFile,
            startTime: firstClip.startTime
          })
          loadClip(firstClip.id)
          console.log('[PlaybackBar] Clip load initiated. Video will auto-play when ready.')
          return
        }
      }

      console.log('[PlaybackBar] Triggering play()')
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
          disabled={!hasClips}
          className="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg"
          style={{
            backgroundColor: !hasClips ? 'var(--bg-secondary)' : 'var(--accent)',
            color: 'var(--text-primary)'
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        {/* Frame Controls */}
        <button
          onClick={stepBackward}
          disabled={!currentClipId}
          className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
          style={{ color: 'var(--text-primary)' }}
          aria-label="Previous frame"
          title="Previous frame (1/30s)"
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={stepForward}
          disabled={!currentClipId}
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
          disabled={!currentClipId}
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
          disabled={!currentClipId}
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
