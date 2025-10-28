/**
 * TimelineClip Component
 *
 * Displays a video clip on the timeline with thumbnail, duration, and positioning.
 * Clips are positioned using CSS left/width properties based on startTime and duration,
 * scaled by the current zoom level (pixels per second).
 */

import { useState } from 'react'
import { formatTime } from '@/utils'
import { cn } from '@/utils/cn.util'
import { TrimTool } from '@/components/EditTools'
import { useToolStore } from '@/store/toolStore'
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
  /** Click handler for clip selection */
  onClick?: () => void
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
   * Handle drag start - store clip index for drop handler
   */
  function handleDragStart(e: React.DragEvent): void {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
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

  return (
    <div
      className={cn(
        'absolute rounded',
        'transition-all duration-200 ease-out',
        'hover:opacity-90',
        isSelected && 'ring-1',
        isDragging && 'opacity-50 scale-105'
      )}
      style={{
        left: `${leftPosition}px`,
        width: `${width}px`,
        height: '80px',
        top: '8px',
        backgroundColor: isSelected ? 'var(--accent)' : 'rgba(0, 212, 212, 0.6)',
        borderColor: isSelected ? 'var(--accent)' : 'transparent',
        cursor: cursorStyle
      }}
      draggable={selectedTool === 'select'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Clip at ${formatTime(clip.startTime)}, duration ${formatTime(effectiveDuration)}`}
    >
      {/* Minimal clip container with duration only */}
      <div className="h-full w-full relative overflow-hidden rounded">
        {/* Duration label - shows effective duration after trimming */}
        <div
          className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', color: 'var(--text-primary)' }}
        >
          {formatTime(effectiveDuration)}
        </div>

        {/* Trim handles - only shown when Trim tool active AND clip selected (Tool Selection System) */}
        {isSelected && selectedTool === 'trim' && <TrimTool clip={clip} zoomLevel={zoomLevel} />}
      </div>
    </div>
  )
}
