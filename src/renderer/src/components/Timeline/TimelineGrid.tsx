/**
 * TimelineGrid Component
 *
 * Renders vertical grid lines through the timeline for visual reference.
 * Implements CapCut/Premiere Pro style grid with major and minor lines:
 * - Major lines: Every 5/10/30 seconds (based on zoom) - more visible
 * - Minor lines: Every 1 second - subtle
 *
 * Grid lines extend from ruler through all tracks for precise editing.
 */

interface TimelineGridProps {
  /** Total duration of timeline in seconds */
  totalDuration: number
  /** Zoom level in pixels per second */
  zoomLevel: number
}

/**
 * Calculate grid line intervals based on zoom level
 *
 * Returns both major interval (for prominent lines) and whether to show minor lines.
 * Logic matches professional editors (Premiere Pro, Final Cut Pro, CapCut):
 * - Higher zoom: Show minor lines every second
 * - Lower zoom: Only show major lines to avoid clutter
 *
 * @param zoomLevel - Pixels per second
 * @returns Object with majorInterval (seconds) and showMinor (boolean)
 */
function calculateGridIntervals(zoomLevel: number): {
  majorInterval: number
  showMinor: boolean
} {
  const minPixelSpacing = 60 // Minimum pixels between major lines

  // Standard intervals for major grid lines (in seconds)
  const intervals = [5, 10, 30, 60, 120, 300]

  // Find appropriate major interval
  let majorInterval = 5
  for (const interval of intervals) {
    if (interval * zoomLevel >= minPixelSpacing) {
      majorInterval = interval
      break
    }
  }

  // Show minor lines (every 1 second) only if zoom is high enough
  // Minimum 15px per second to avoid overcrowding
  const showMinor = zoomLevel >= 15

  return { majorInterval, showMinor }
}

/**
 * Renders grid lines extending through timeline
 *
 * Professional video editor style:
 * - Major lines (every 5-60s depending on zoom): rgba(255,255,255,0.08)
 * - Minor lines (every 1s when zoomed in): rgba(255,255,255,0.03)
 * - Extends full height of timeline tracks
 * - Positioned behind clips for non-intrusive reference
 *
 * @param totalDuration - Timeline duration in seconds
 * @param zoomLevel - Pixels per second for positioning
 */
export function TimelineGrid({
  totalDuration,
  zoomLevel
}: TimelineGridProps): React.JSX.Element {
  const { majorInterval, showMinor } = calculateGridIntervals(zoomLevel)

  // Generate major grid lines
  const majorLineCount = Math.ceil(totalDuration / majorInterval) + 1
  const majorLines = Array.from({ length: majorLineCount }, (_, i) => {
    const time = i * majorInterval
    return {
      time,
      position: time * zoomLevel
    }
  })

  // Generate minor grid lines (every second, excluding major lines)
  const minorLines = showMinor
    ? Array.from({ length: Math.ceil(totalDuration) }, (_, i) => {
        const time = i
        // Skip if this is a major line
        if (time % majorInterval === 0) return null
        return {
          time,
          position: time * zoomLevel
        }
      }).filter((line): line is { time: number; position: number } => line !== null)
    : []

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Minor grid lines - subtle */}
      {minorLines.map((line) => (
        <div
          key={`minor-${line.time}`}
          className="absolute top-0 h-full w-px"
          style={{
            left: `${line.position}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.08)' // Subtle but visible
          }}
        />
      ))}

      {/* Major grid lines - more visible */}
      {majorLines.map((line) => (
        <div
          key={`major-${line.time}`}
          className="absolute top-0 h-full w-px"
          style={{
            left: `${line.position}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.12)' // More visible for major intervals
          }}
        />
      ))}
    </div>
  )
}
