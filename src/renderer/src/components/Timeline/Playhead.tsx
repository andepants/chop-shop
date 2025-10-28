/**
 * Playhead Component
 *
 * Draggable vertical line indicator showing current playback position.
 * Features:
 * - Click and drag to scrub through timeline (Premiere Pro style)
 * - Syncs with video player during scrub
 * - Visual feedback on hover and drag
 * - GPU-accelerated positioning for smooth movement
 */

import { useState, useEffect, useRef } from 'react'
import { useTimelineStore } from '@/store/timelineStore'
import { usePlaybackStore } from '@/store/playbackStore'

interface PlayheadProps {
  /** Zoom level in pixels per second for positioning */
  zoomLevel: number
}

/**
 * Renders draggable timeline playhead indicator
 *
 * Dragging behavior:
 * - mousedown on playhead head/line starts drag
 * - mousemove updates position in real-time
 * - mouseup ends drag and syncs with video player
 * - Magnetic snap to timeline start (0s)
 *
 * Visual feedback:
 * - Hover: cursor changes to col-resize (Premiere Pro style)
 * - Dragging: cursor remains col-resize, slight opacity change
 *
 * @param zoomLevel - Pixels per second for positioning
 */
export function Playhead({ zoomLevel }: PlayheadProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Subscribe directly to playheadPosition for real-time updates during video playback
  const position = useTimelineStore((state) => state.playheadPosition)
  const { setPlayhead } = useTimelineStore()
  const { tracks } = useTimelineStore()

  const leftPosition = position * zoomLevel

  /**
   * Start drag - capture mouse and track movement
   */
  function handleMouseDown(e: React.MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  /**
   * Handle mouse move during drag - update playhead position
   */
  useEffect(() => {
    if (!isDragging) return

    function handleMouseMove(e: MouseEvent): void {
      // Find timeline container to get correct bounds
      const timelineContainer = document.querySelector('[data-timeline-container]')
      if (!timelineContainer) return

      const rect = timelineContainer.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      let newPosition = mouseX / zoomLevel

      // Clamp to valid range (0 to totalDuration)
      newPosition = Math.max(0, newPosition)

      // Magnetic snap to timeline start (within 0.3 seconds)
      if (newPosition < 0.3) {
        newPosition = 0
      }

      // Update playhead position
      setPlayhead(newPosition)

      // Sync with video player: find clip at this position and seek
      const allClips = tracks
        .flatMap((track) => track.clips)
        .sort((a, b) => a.startTime - b.startTime)

      const clipAtPosition = allClips.find((clip) => {
        const clipEnd = clip.startTime + (clip.duration - clip.trimIn - clip.trimOut)
        return newPosition >= clip.startTime && newPosition < clipEnd
      })

      if (clipAtPosition) {
        const playbackStore = usePlaybackStore.getState()

        // Load clip if different
        if (playbackStore.currentClipId !== clipAtPosition.id) {
          playbackStore.loadClip(clipAtPosition.id)
        }

        // Calculate offset within clip and seek
        const offsetInClip = newPosition - clipAtPosition.startTime
        const seekTime = clipAtPosition.trimIn + offsetInClip
        playbackStore.seek(seekTime)

        // Update playback queue to reflect current state
        playbackStore.updatePlaybackQueue()
      }
    }

    function handleMouseUp(): void {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, zoomLevel, setPlayhead, tracks])

  return (
    <div
      ref={containerRef}
      className="absolute top-0 bottom-0 z-40"
      style={{
        transform: `translateX(${leftPosition}px)`,
        cursor: 'col-resize', // Premiere Pro style cursor
        pointerEvents: 'auto' // Enable mouse interactions
      }}
      onMouseDown={handleMouseDown}
      aria-label={`Playhead at ${position.toFixed(2)} seconds`}
    >
      {/* Draggable head at top - Premiere Pro style */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 cursor-col-resize"
        style={{
          marginTop: '0px'
        }}
      >
        {/* Red rectangular head (Premiere Pro style) */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 transition-opacity rounded-sm"
          style={{
            width: '14px',
            height: '18px',
            backgroundColor: '#EF4444', // red-500
            opacity: isDragging ? 0.9 : 1,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
          }}
        />
      </div>

      {/* Vertical white line - full height, draggable (Premiere Pro style) */}
      <div
        className="h-full bg-white transition-opacity cursor-col-resize relative z-50"
        style={{
          width: '4px',
          opacity: isDragging ? 0.9 : 1,
          boxShadow: '0 0 8px rgba(0, 0, 0, 0.8), 0 0 2px rgba(255, 255, 255, 0.5)' // Enhanced shadow for better visibility
        }}
      />
    </div>
  )
}
