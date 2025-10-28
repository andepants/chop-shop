/**
 * TimelineClip Component
 *
 * Displays a video clip on the timeline with thumbnail, duration, and positioning.
 * Clips are positioned using CSS left/width properties based on startTime and duration,
 * scaled by the current zoom level (pixels per second).
 */

import { formatTime } from '@/utils'
import { cn } from '@/utils/cn.util'
import type { Clip } from './timeline.types'

interface TimelineClipProps {
  /** Clip data including position, duration, and source file */
  clip: Clip
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
  zoomLevel,
  isSelected = false,
  onClick
}: TimelineClipProps): React.JSX.Element {
  const leftPosition = clip.startTime * zoomLevel
  // Ensure minimum width of 80px so clips are always visible
  const calculatedWidth = clip.duration * zoomLevel
  const width = Math.max(80, calculatedWidth)

  return (
    <div
      className={cn(
        'absolute rounded cursor-pointer transition-opacity',
        'hover:opacity-80',
        isSelected && 'ring-1'
      )}
      style={{
        left: `${leftPosition}px`,
        width: `${width}px`,
        height: '80px',
        top: '8px',
        backgroundColor: isSelected ? 'var(--accent)' : 'rgba(0, 212, 212, 0.6)',
        borderColor: isSelected ? 'var(--accent)' : 'transparent'
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Clip at ${formatTime(clip.startTime)}, duration ${formatTime(clip.duration)}`}
    >
      {/* Minimal clip container with duration only */}
      <div className="h-full w-full relative overflow-hidden rounded">
        {/* Duration label */}
        <div
          className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', color: 'var(--text-primary)' }}
        >
          {formatTime(clip.duration)}
        </div>
      </div>
    </div>
  )
}
