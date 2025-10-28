/**
 * TimelineClip Component
 *
 * Displays a video clip on the timeline with thumbnail, duration, and positioning.
 * Clips are positioned using CSS left/width properties based on startTime and duration,
 * scaled by the current zoom level (pixels per second).
 */

import { useState, useRef } from 'react'
import { formatTime } from '@/utils'
import { cn } from '@/utils/cn.util'
import { TrimTool } from '@/components/EditTools'
import { useToolStore } from '@/store/toolStore'
import { useTimelineStore } from '@/store/timelineStore'
import type { Clip } from './timeline.types'

interface TimelineClipProps {
  /** Clip data including position, duration, and source file */
  clip: Clip
  /** Index of clip in track (for drag-to-reorder) */
  clipIndex: number
  /** Zoom level in pixels per second for positioning calculations */
  zoomLevel: number
  /** Whether this clip is currently selected */
  isSelected?: boolean
  /** Click handler for clip selection/tools - receives mouse event for position-based operations */
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Renders a video clip on the timeline
 *
 * Clip positioning:
 * - left: startTime * zoomLevel (px)
 * - width: duration * zoomLevel (px)
 *
 * Visual design:
 * - Dark background with border
 * - Thumbnail (if available) or placeholder
 * - Duration label
 * - Hover and selection states
 *
 * @param clip - Clip data with position and duration
 * @param zoomLevel - Pixels per second for scaling
 * @param isSelected - Highlight state
 * @param onClick - Selection handler
 */
export function TimelineClip({
  clip,
  clipIndex,
  zoomLevel,
  isSelected = false,
  onClick
}: TimelineClipProps): React.JSX.Element {
  // Get active tool for conditional rendering
  const selectedTool = useToolStore((state) => state.selectedTool)

  // Drag state for visual feedback
  const [isDragging, setIsDragging] = useState(false)

  // Razor tool state - tracks mouse position for split preview
  const [razorMouseX, setRazorMouseX] = useState<number | null>(null)
  const clipRef = useRef<HTMLDivElement>(null)

  // Calculate effective duration accounting for trim values (Story 3.1)
  const effectiveDuration = clip.duration - clip.trimIn - clip.trimOut

  const leftPosition = clip.startTime * zoomLevel
  // Ensure minimum width of 80px so clips are always visible
  const calculatedWidth = effectiveDuration * zoomLevel
  const width = Math.max(80, calculatedWidth)

  // Determine cursor based on active tool
  const cursorStyle = isDragging
    ? 'grabbing'
    : selectedTool === 'trim'
      ? 'ew-resize'
      : selectedTool === 'split'
        ? 'crosshair'
        : 'grab'

  /**
   * Handle drag start - store clip ID and index for drop handler
   */
  function handleDragStart(e: React.DragEvent): void {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('clipId', clip.id)
    e.dataTransfer.setData('clipIndex', clipIndex.toString())

    // Create semi-transparent drag image
    if (e.currentTarget instanceof HTMLElement) {
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
      dragImage.style.opacity = '0.5'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    }
  }

  /**
   * Handle drag end - clear dragging state
   */
  function handleDragEnd(): void {
    setIsDragging(false)
  }

  /**
   * Handle mouse move for razor tool preview
   * Tracks mouse X position within clip for split line preview
   */
  function handleMouseMove(e: React.MouseEvent): void {
    if (selectedTool !== 'split') return
    if (!clipRef.current) return

    const rect = clipRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    setRazorMouseX(mouseX)
  }

  /**
   * Handle mouse leave - clear razor preview
   */
  function handleMouseLeave(): void {
    setRazorMouseX(null)
  }

  /**
   * Calculate split position with snap-to-playhead logic
   * @param mouseX - Mouse X position relative to clip element
   * @returns Split position in pixels within clip, or null if too close to edges
   */
  function calculateSplitPosition(mouseX: number): { position: number; snapped: boolean; time: number } | null {
    const SNAP_THRESHOLD = 15 // pixels - snap to playhead if within this distance
    const EDGE_THRESHOLD = 10 // pixels - don't allow split too close to edges

    // Don't split too close to clip edges
    if (mouseX < EDGE_THRESHOLD || mouseX > width - EDGE_THRESHOLD) {
      return null
    }

    // Calculate playhead position relative to clip
    const playheadPosition = useTimelineStore.getState().playheadPosition
    const playheadX = (playheadPosition - clip.startTime) * zoomLevel

    // Check if playhead is within clip bounds
    const playheadInClip = playheadPosition > clip.startTime && playheadPosition < clip.startTime + effectiveDuration

    // Snap to playhead if mouse is close and playhead is in clip
    if (playheadInClip && Math.abs(mouseX - playheadX) < SNAP_THRESHOLD) {
      const snapTime = playheadPosition
      return { position: playheadX, snapped: true, time: snapTime }
    }

    // Otherwise use mouse position
    const splitTime = clip.startTime + (mouseX / zoomLevel)
    return { position: mouseX, snapped: false, time: splitTime }
  }

  // Extract filename from sourceFile path
  const filename = clip.sourceFile.split('/').pop() || clip.sourceFile

  return (
    <div
      ref={clipRef}
      className={cn(
        'absolute rounded',
        'transition-all duration-200 ease-out',
        // Fallback background if no thumbnail
        !clip.thumbnail && 'bg-cyan-500/60',
        'hover:opacity-90 hover:border-zinc-500',
        isSelected
          ? 'border-2 border-cyan-500'
          : 'border border-transparent',
        isDragging && 'opacity-50 scale-105'
      )}
      style={{
        left: `${leftPosition}px`,
        width: `${width}px`,
        height: '80px',
        top: '8px',
        cursor: cursorStyle
      }}
      draggable={selectedTool === 'select'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => onClick?.(e)}
      role="button"
      tabIndex={0}
      aria-label={`Clip at ${formatTime(clip.startTime)}, duration ${formatTime(effectiveDuration)}`}
    >
      {/* Clip container with repeating thumbnail filmstrip (Premiere Pro style) */}
      <div
        className="h-full w-full relative overflow-hidden rounded"
        style={{
          ...(clip.thumbnail && {
            backgroundImage: `url(${clip.thumbnail})`,
            backgroundSize: 'auto 100%', // Height 100%, width auto (maintains aspect ratio)
            backgroundRepeat: 'repeat-x', // Repeat horizontally
            backgroundPosition: 'left center',
            opacity: isSelected ? 0.8 : 0.6
          })
        }}
      >
        {/* Filename label - top left */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-mono bg-black/75 text-zinc-100 truncate max-w-[calc(100%-3rem)] z-10">
          {filename}
        </div>

        {/* Duration label - bottom right */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-mono bg-black/75 text-zinc-100 z-10">
          {formatTime(effectiveDuration)}
        </div>

        {/* Razor tool split preview - red line follows mouse cursor */}
        {selectedTool === 'split' && razorMouseX !== null && (() => {
          const splitInfo = calculateSplitPosition(razorMouseX)
          if (!splitInfo) return null

          const { position, snapped, time } = splitInfo

          return (
            <>
              {/* Red split line preview */}
              <div
                className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-20 transition-all duration-75"
                style={{
                  left: `${position}px`,
                  backgroundColor: snapped ? '#fbbf24' : '#ef4444', // Yellow when snapped, red otherwise
                  boxShadow: snapped
                    ? '0 0 6px rgba(251, 191, 36, 0.8)' // Yellow glow when snapped
                    : '0 0 6px rgba(239, 68, 68, 0.8)' // Red glow
                }}
              >
                {/* Triangle indicator at top */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `6px solid ${snapped ? '#fbbf24' : '#ef4444'}` // Yellow when snapped, red otherwise
                  }}
                />
              </div>

              {/* Timestamp tooltip showing exact cut position */}
              <div
                className="absolute pointer-events-none z-30 px-2 py-1 rounded text-xs font-mono whitespace-nowrap"
                style={{
                  left: `${position}px`,
                  top: '-28px',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  color: snapped ? '#fbbf24' : '#ef4444',
                  border: `1px solid ${snapped ? '#fbbf24' : '#ef4444'}`
                }}
              >
                {formatTime(time)}
                {snapped && ' ⚡'}
              </div>
            </>
          )
        })()}

        {/* Trim handles - only shown when Trim tool active AND clip selected (Tool Selection System) */}
        {isSelected && selectedTool === 'trim' && <TrimTool clip={clip} zoomLevel={zoomLevel} />}
      </div>
    </div>
  )
}
