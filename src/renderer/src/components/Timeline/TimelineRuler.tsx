/**
 * TimelineRuler Component (Premiere Pro Style)
 *
 * Displays time markers and labels above the timeline tracks.
 * Marker intervals adjust dynamically based on zoom level to maintain
 * readable spacing (minimum 60px between markers).
 *
 * Adobe Premiere Pro enhancements:
 * - Increased height from 40px to 48px for better visibility
 * - Frame markers at high zoom levels (30 fps grid)
 * - Enhanced styling with gradients and improved typography
 * - More prominent tick marks
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

  // Frame markers: Show at high zoom (>50px per second = very zoomed in)
  // 30 fps = 1 frame every ~0.033 seconds
  const FRAME_RATE = 30
  const FRAME_INTERVAL = 1 / FRAME_RATE
  const showFrameMarkers = zoomLevel > 50

  const frameMarkers = showFrameMarkers
    ? Array.from({ length: Math.ceil(totalDuration * FRAME_RATE) }, (_, i) => {
        const time = i * FRAME_INTERVAL
        return {
          time,
          position: time * zoomLevel,
          frameNumber: i
        }
      })
    : []

  return (
    <div
      className="h-12 border-b relative"
      style={{
        borderColor: 'rgba(63, 63, 70, 1)', // zinc-700
        background: 'linear-gradient(to bottom, rgb(24, 24, 27), rgb(39, 39, 42))' // zinc-900 to zinc-800
      }}
    >
      <div className="h-full relative">
        {/* Frame markers (very fine grid at high zoom) */}
        {frameMarkers.map((frame) => (
          <div
            key={`frame-${frame.frameNumber}`}
            className="absolute top-0"
            style={{ left: `${frame.position}px` }}
          >
            {/* Tiny tick for frame boundaries */}
            <div
              className="w-px bg-zinc-600"
              style={{
                height: '4px',
                opacity: 0.4
              }}
            />
          </div>
        ))}

        {/* Main time markers */}
        {markers.map((marker) => (
          <div
            key={marker.time}
            className="absolute top-0 h-full flex flex-col"
            style={{ left: `${marker.position}px` }}
          >
            {/* Prominent vertical tick mark */}
            <div
              className="w-px bg-zinc-500"
              style={{
                height: '8px',
                boxShadow: '0 0 2px rgba(0, 0, 0, 0.5)'
              }}
            />

            {/* Time label at bottom - Premiere Pro style */}
            <div
              className="absolute bottom-1 -translate-x-1/2 px-1.5 text-xs font-mono leading-tight"
              style={{
                color: 'rgb(212, 212, 216)', // zinc-300
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                fontWeight: 500
              }}
            >
              {marker.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
