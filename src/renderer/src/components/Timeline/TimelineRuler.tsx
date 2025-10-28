/**
 * TimelineRuler Component
 *
 * Displays time markers and labels above the timeline tracks.
 * Marker intervals adjust dynamically based on zoom level to maintain
 * readable spacing (minimum 60px between markers).
 */

import { formatTime } from '@/utils'

interface TimelineRulerProps {
  /** Total duration of timeline in seconds */
  totalDuration: number
  /** Zoom level in pixels per second */
  zoomLevel: number
}

/**
 * Calculate appropriate marker interval based on zoom level
 *
 * Ensures markers are spaced at least 60px apart for readability.
 * Intervals follow standard time increments: 5s, 10s, 30s, 60s, 120s, etc.
 *
 * @param zoomLevel - Pixels per second
 * @returns Marker interval in seconds
 */
function calculateMarkerInterval(zoomLevel: number): number {
  const minPixelSpacing = 60 // Minimum pixels between markers

  // Standard time intervals in seconds (Story 4.2: includes 1s, 2s for high zoom)
  const intervals = [1, 2, 5, 10, 30, 60, 120, 300, 600]

  for (const interval of intervals) {
    if (interval * zoomLevel >= minPixelSpacing) {
      return interval
    }
  }

  // For very low zoom, use larger intervals
  return Math.ceil(minPixelSpacing / zoomLevel / 60) * 60
}

/**
 * Renders timeline ruler with time markers
 *
 * Displays time labels at regular intervals along the top of the timeline.
 * Interval spacing adjusts automatically based on zoom level to prevent
 * overcrowding or excessive gaps.
 *
 * @param totalDuration - Timeline duration in seconds
 * @param zoomLevel - Pixels per second for positioning
 */
export function TimelineRuler({
  totalDuration,
  zoomLevel
}: TimelineRulerProps): React.JSX.Element {
  const markerInterval = calculateMarkerInterval(zoomLevel)
  const markerCount = Math.ceil(totalDuration / markerInterval) + 1

  const markers = Array.from({ length: markerCount }, (_, i) => {
    const time = i * markerInterval
    return {
      time,
      position: time * zoomLevel,
      label: formatTime(time)
    }
  })

  return (
    <div className="h-10 border-b border-zinc-700 bg-zinc-900 relative">
      <div className="h-full relative">
        {markers.map((marker) => (
          <div
            key={marker.time}
            className="absolute top-0 h-full flex flex-col"
            style={{ left: `${marker.position}px` }}
          >
            {/* Subtle vertical tick mark from top */}
            <div className="w-px h-3 bg-zinc-600" />

            {/* Time label at bottom of ruler */}
            <div className="absolute bottom-1 -translate-x-1/2 px-1 text-[11px] font-mono text-zinc-400 leading-tight">
              {marker.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
