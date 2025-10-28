/**
 * ZoomControls Component
 *
 * Timeline zoom controls with slider and buttons
 * Allows users to zoom in/out on timeline for precise editing
 * Adobe Premiere Pro style: slider + buttons, right-aligned in toolbar
 */

import * as React from 'react'
import { useCallback, useRef } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { useTimelineStore } from '@/store/timelineStore'

/**
 * Debounce function for zoom slider (Story 4.2: Task 7)
 * Limits updates to 16ms (60fps) for smooth performance
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * ZoomControls component
 * Renders zoom slider, +/- buttons, Fit button, and zoom percentage display
 */
export function ZoomControls(): React.JSX.Element {
  const { zoomLevel, setZoomLevel, zoomIn, zoomOut, fitToTimeline, tracks } = useTimelineStore()

  // Disable zoom controls when timeline is empty (Story 4.2: Task 10, edge case)
  const hasClips = tracks.some((track) => track.clips.length > 0)

  // Debounced zoom setter (16ms = 60fps)
  const debouncedSetZoom = useRef(
    debounce((level: number) => {
      setZoomLevel(level)
    }, 16)
  ).current

  /**
   * Handle slider value change with debouncing
   * Slider returns array of values, we use first value
   * Debounced to maintain 60fps performance (Story 4.2: Task 7, AC #7)
   */
  const handleSliderChange = useCallback(
    (values: number[]): void => {
      debouncedSetZoom(values[0])
    },
    [debouncedSetZoom]
  )

  /**
   * Format zoom level as percentage for display
   * 1.0 → "100%", 2.5 → "250%"
   */
  function formatZoomPercentage(zoom: number): string {
    return `${Math.round(zoom * 100)}%`
  }

  return (
    <div className="flex items-center gap-2">
      {/* Zoom Out Button */}
      <button
        onClick={zoomOut}
        disabled={!hasClips}
        className="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={hasClips ? 'Zoom Out (Cmd/Ctrl -)' : 'Add clips to zoom'}
        aria-label="Zoom Out"
      >
        <ZoomOut size={16} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {/* Zoom Slider with Visual Markers (Story 4.2: Task 8) */}
      <div className="relative w-40">
        <Slider
          value={[zoomLevel]}
          onValueChange={handleSliderChange}
          min={0.1}
          max={5.0}
          step={0.1}
          disabled={!hasClips}
          className="cursor-pointer transition-all duration-100 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Zoom Level"
        />

        {/* Visual markers for common zoom levels (0.5x, 1x, 2x, 5x) */}
        <div className="absolute top-5 left-0 right-0 flex justify-between px-1 pointer-events-none">
          {[0.5, 1.0, 2.0, 5.0].map((marker) => {
            // Calculate position: (marker - min) / (max - min) * 100%
            const position = ((marker - 0.1) / (5.0 - 0.1)) * 100
            const isActive = Math.abs(zoomLevel - marker) < 0.15

            return (
              <div
                key={marker}
                className="absolute flex flex-col items-center"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className="w-0.5 h-1 rounded-full transition-all duration-100"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                    opacity: isActive ? 1 : 0.3
                  }}
                />
                <span
                  className="text-[9px] font-medium mt-0.5 transition-all duration-100"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    opacity: isActive ? 1 : 0.5
                  }}
                >
                  {marker === 1.0 ? '1×' : `${marker}×`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Zoom In Button */}
      <button
        onClick={zoomIn}
        disabled={!hasClips}
        className="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={hasClips ? 'Zoom In (Cmd/Ctrl +)' : 'Add clips to zoom'}
        aria-label="Zoom In"
      >
        <ZoomIn size={16} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {/* Zoom Percentage Display with smooth transition */}
      <span
        className="text-xs font-medium min-w-[3rem] text-center transition-all duration-100"
        style={{ color: 'var(--text-secondary)', opacity: hasClips ? 1 : 0.3 }}
      >
        {formatZoomPercentage(zoomLevel)}
      </span>

      {/* Fit to Timeline Button */}
      <button
        onClick={fitToTimeline}
        disabled={!hasClips}
        className="h-8 px-2 flex items-center gap-1 rounded hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={hasClips ? 'Fit Timeline (\\)' : 'Add clips to zoom'}
        aria-label="Fit to Timeline"
      >
        <Maximize2 size={14} style={{ color: 'var(--text-secondary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Fit
        </span>
      </button>
    </div>
  )
}
