/**
 * Playhead Component
 *
 * Displays a vertical line indicator showing the current playback position on the timeline.
 * Uses CSS transform for GPU-accelerated positioning and smooth movement.
 */

interface PlayheadProps {
  /** Current playhead position in seconds */
  position: number
  /** Zoom level in pixels per second for positioning */
  zoomLevel: number
}

/**
 * Renders the timeline playhead indicator
 *
 * Positioning:
 * - Uses CSS transform (translateX) for GPU acceleration
 * - Position calculated as: position * zoomLevel (px)
 *
 * Visual design:
 * - Cyan vertical line spanning full timeline height
 * - Triangle indicator at top for visibility
 * - Z-index ensures playhead appears above clips
 *
 * @param position - Playhead position in seconds
 * @param zoomLevel - Pixels per second for positioning
 */
export function Playhead({ position, zoomLevel }: PlayheadProps): React.JSX.Element {
  const leftPosition = position * zoomLevel

  return (
    <div
      className="absolute top-0 bottom-0 z-10 pointer-events-none"
      style={{
        transform: `translateX(${leftPosition}px)`
      }}
      aria-label={`Playhead at ${position.toFixed(2)} seconds`}
    >
      {/* Vertical line */}
      <div className="w-0.5 h-full" style={{ backgroundColor: 'var(--accent)' }} />

      {/* Triangle indicator at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid var(--accent)'
        }}
      />
    </div>
  )
}
