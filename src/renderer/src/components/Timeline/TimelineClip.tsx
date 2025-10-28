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
  const width = clip.duration * zoomLevel

  return (
    <div
      className={cn(
        'absolute h-24 rounded border cursor-pointer transition-all duration-200',
        'bg-zinc-700 border-zinc-600 shadow-md',
        'hover:bg-zinc-650 hover:border-zinc-500 hover:shadow-lg',
        isSelected && 'border-cyan-400 border-2 shadow-cyan-500/50 ring-2 ring-cyan-500/20'
      )}
      style={{
        left: `${leftPosition}px`,
        width: `${width}px`
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Clip at ${formatTime(clip.startTime)}, duration ${formatTime(clip.duration)}`}
    >
      {/* Thumbnail (placeholder for now, will use actual thumbnail in future) */}
      <div className="h-full w-full relative overflow-hidden rounded">
        {/* Duration label */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs font-mono text-white">
          {formatTime(clip.duration)}
        </div>

        {/* File name label */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white truncate max-w-[calc(100%-8px)]">
          {clip.sourceFile.split('/').pop() || 'Unknown'}
        </div>
      </div>
    </div>
  )
}
