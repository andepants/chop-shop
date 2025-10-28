/**
 * PreviewPlayer Component (Compositor-based)
 * Canvas-based video player using VideoCompositor for seamless multi-track playback
 * Replaces Video.js with custom compositor for better control and performance
 */

import { useEffect, useRef } from 'react'
import { usePlaybackStore } from '@/store/playbackStore'
import { useTimelineStore } from '@/store/timelineStore'

/**
 * PreviewPlayer component
 * Renders canvas for compositor and handles timeline synchronization
 *
 * @returns React component with canvas player
 */
export function PreviewPlayer(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)

  // Playback state
  const isPlaying = usePlaybackStore((state) => state.isPlaying)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const play = usePlaybackStore((state) => state.play)
  const pause = usePlaybackStore((state) => state.pause)
  const initializeCompositor = usePlaybackStore((state) => state.initializeCompositor)
  const loadTimeline = usePlaybackStore((state) => state.loadTimeline)

  // Timeline state
  const tracks = useTimelineStore((state) => state.tracks)

  /**
   * Initialize compositor on mount
   */
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current

    if (!canvas || !container || isInitialized.current) {
      return
    }

    console.log('[PreviewPlayer] Initializing compositor')

    // Get container dimensions for canvas sizing
    const rect = container.getBoundingClientRect()
    const width = rect.width || 1280
    const height = rect.height || 720

    // Initialize compositor
    initializeCompositor(canvas, width, height)
    isInitialized.current = true

    console.log('[PreviewPlayer] Compositor initialized', { width, height })

    // Cleanup on unmount
    return () => {
      console.log('[PreviewPlayer] Unmounting, compositor will be disposed')
      isInitialized.current = false
    }
  }, [initializeCompositor])

  /**
   * Load timeline into compositor when tracks change
   * Per user requirement: pause and reload when timeline changes
   */
  useEffect(() => {
    if (!isInitialized.current) {
      return
    }

    console.log('[PreviewPlayer] Timeline changed, reloading compositor')

    // Load timeline (will pause if playing per store implementation)
    loadTimeline()
  }, [tracks, loadTimeline])

  /**
   * Handle click on player area to toggle play/pause
   */
  function handlePlayerClick() {
    if (duration === 0) {
      console.log('[PreviewPlayer] No timeline loaded, ignoring click')
      return
    }

    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  /**
   * Handle canvas resize on window resize
   */
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current

      if (!canvas || !container) return

      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      console.log('[PreviewPlayer] Canvas resized', { width: rect.width, height: rect.height })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const hasTimeline = duration > 0

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-black" ref={containerRef}>
      {!hasTimeline && (
        <div
          style={{ color: 'var(--text-secondary)', position: 'absolute', zIndex: 10 }}
          className="text-center pointer-events-none"
        >
          <p className="text-sm">No clips on timeline</p>
          <p className="text-xs mt-1">Drag media to timeline to start</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={handlePlayerClick}
        className="cursor-pointer"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
      />

      {/* Debug info (remove in production) */}
      {hasTimeline && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 20
          }}
        >
          <div>Time: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s</div>
          <div>State: {isPlaying ? 'Playing' : 'Paused'}</div>
          <div>Tracks: {tracks.length}</div>
          <div>
            Clips: {tracks.reduce((sum, track) => sum + track.clips.length, 0)}
          </div>
        </div>
      )}
    </div>
  )
}
