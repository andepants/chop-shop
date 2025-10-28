/**
 * TrimTool Component
 *
 * Renders draggable trim handles at clip boundaries for non-destructive trimming.
 * Uses GPU-accelerated CSS transforms for 60fps performance (NFR001).
 *
 * NON-DESTRUCTIVE EDITING (Story 3.1 - AC #7):
 * - Trim operations ONLY update Zustand state (trimIn/trimOut fields)
 * - Source media files remain completely unchanged on disk
 * - trimIn/trimOut are playback metadata offsets, not file modifications
 *
 * Features:
 * - Drag start handle to adjust trimIn offset
 * - Drag end handle to adjust trimOut offset
 * - Visual feedback during drag
 * - Clamped to valid range (prevents invalid trim values)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTimelineStore } from '@/store/timelineStore'
import type { Clip } from '@/components/Timeline/timeline.types'

interface TrimToolProps {
  clip: Clip
  /** Zoom level in pixels per second */
  zoomLevel: number
}

/**
 * TrimTool component with draggable handles for clip trimming
 */
export function TrimTool({ clip, zoomLevel }: TrimToolProps): JSX.Element {
  const updateClip = useTimelineStore((state) => state.updateClip)

  const [isDraggingStart, setIsDraggingStart] = useState(false)
  const [isDraggingEnd, setIsDraggingEnd] = useState(false)
  const dragStartX = useRef(0)
  const initialTrimValue = useRef(0)

  const effectiveDuration = clip.duration - clip.trimIn - clip.trimOut

  /**
   * Calculate trim handle positions in pixels
   */
  const startHandlePosition = clip.trimIn * zoomLevel
  const endHandlePosition = (clip.trimIn + effectiveDuration) * zoomLevel

  /**
   * Clamp trim value to valid range
   * Ensures trimIn + trimOut <= duration
   */
  function clampTrimValue(value: number, isStart: boolean): number {
    if (isStart) {
      // trimIn: 0 to (duration - trimOut)
      return Math.max(0, Math.min(value, clip.duration - clip.trimOut))
    } else {
      // trimOut: 0 to (duration - trimIn)
      return Math.max(0, Math.min(value, clip.duration - clip.trimIn))
    }
  }

  /**
   * Handle trim start drag initialization
   */
  const handleStartMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingStart(true)
    dragStartX.current = e.clientX
    initialTrimValue.current = clip.trimIn
  }, [clip.trimIn])

  /**
   * Handle trim end drag initialization
   */
  const handleEndMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingEnd(true)
    dragStartX.current = e.clientX
    initialTrimValue.current = clip.trimOut
  }, [clip.trimOut])

  /**
   * Handle mouse move during trim drag
   */
  useEffect(() => {
    if (!isDraggingStart && !isDraggingEnd) return

    function handleMouseMove(e: MouseEvent): void {
      const deltaX = e.clientX - dragStartX.current
      const deltaSeconds = deltaX / zoomLevel

      if (isDraggingStart) {
        const newTrimIn = clampTrimValue(initialTrimValue.current + deltaSeconds, true)
        updateClip(clip.id, { trimIn: newTrimIn })
      } else if (isDraggingEnd) {
        const newTrimOut = clampTrimValue(initialTrimValue.current - deltaSeconds, false)
        updateClip(clip.id, { trimOut: newTrimOut })
      }
    }

    function handleMouseUp(): void {
      setIsDraggingStart(false)
      setIsDraggingEnd(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingStart, isDraggingEnd, clip.id, zoomLevel, updateClip])

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Start trim handle */}
      <div
        className={`
          absolute top-0 bottom-0 w-2 cursor-ew-resize pointer-events-auto
          bg-cyan-500 hover:bg-cyan-400 transition-colors
          ${isDraggingStart ? 'opacity-75' : 'opacity-100'}
        `}
        style={{
          transform: `translateX(${startHandlePosition}px)`,
          willChange: 'transform'
        }}
        onMouseDown={handleStartMouseDown}
        role="slider"
        aria-label="Trim start handle"
        aria-valuemin={0}
        aria-valuemax={clip.duration - clip.trimOut}
        aria-valuenow={clip.trimIn}
      />

      {/* End trim handle */}
      <div
        className={`
          absolute top-0 bottom-0 w-2 cursor-ew-resize pointer-events-auto
          bg-cyan-500 hover:bg-cyan-400 transition-colors
          ${isDraggingEnd ? 'opacity-75' : 'opacity-100'}
        `}
        style={{
          transform: `translateX(${endHandlePosition}px)`,
          willChange: 'transform'
        }}
        onMouseDown={handleEndMouseDown}
        role="slider"
        aria-label="Trim end handle"
        aria-valuemin={0}
        aria-valuemax={clip.duration - clip.trimIn}
        aria-valuenow={clip.trimOut}
      />
    </div>
  )
}
