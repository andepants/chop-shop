/**
 * SnapToleranceControl Component
 *
 * Configurable snap tolerance control for timeline magnetic snapping
 * Allows users to adjust how aggressively clips snap to edges, playhead, and timeline start
 * Range: 0.1s to 2.0s (default: 0.5s)
 */

import * as React from 'react'
import { useCallback, useRef } from 'react'
import { Magnet } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { useTimelineStore } from '@/store/timelineStore'

/**
 * Debounce function for snap tolerance slider
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
 * SnapToleranceControl component
 * Renders slider and current value display for snap tolerance
 */
export function SnapToleranceControl(): React.JSX.Element {
  const { snapTolerance, setSnapTolerance, tracks } = useTimelineStore()

  // Disable when timeline is empty
  const hasClips = tracks.some((track) => track.clips.length > 0)

  // Debounced setter (16ms = 60fps)
  const debouncedSetSnapTolerance = useRef(
    debounce((value: number) => {
      setSnapTolerance(value)
    }, 16)
  ).current

  /**
   * Handle slider value change with debouncing
   * Slider returns array of values, we use first value
   */
  const handleSliderChange = useCallback(
    (values: number[]): void => {
      debouncedSetSnapTolerance(values[0])
    },
    [debouncedSetSnapTolerance]
  )

  /**
   * Format snap tolerance value for display
   * Shows value in seconds with 1 decimal place
   */
  function formatSnapValue(value: number): string {
    return `${value.toFixed(1)}s`
  }

  return (
    <div className="flex items-center gap-2">
      {/* Magnet Icon */}
      <Magnet
        size={14}
        style={{ color: 'var(--text-secondary)', opacity: hasClips ? 1 : 0.3 }}
        title="Snap Tolerance"
      />

      {/* Snap Tolerance Slider */}
      <div className="relative w-32">
        <Slider
          value={[snapTolerance]}
          onValueChange={handleSliderChange}
          min={0.1}
          max={2.0}
          step={0.1}
          disabled={!hasClips}
          className="cursor-pointer transition-all duration-100 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Snap Tolerance"
        />

        {/* Visual markers for common values (0.1s, 0.5s, 1.0s, 2.0s) */}
        <div className="absolute top-5 left-0 right-0 flex justify-between px-1 pointer-events-none">
          {[0.1, 0.5, 1.0, 2.0].map((marker) => {
            const position = ((marker - 0.1) / (2.0 - 0.1)) * 100
            const isActive = Math.abs(snapTolerance - marker) < 0.05

            return (
              <div
                key={marker}
                className="absolute flex flex-col items-center"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className="w-0.5 h-1 rounded-full transition-all duration-100"
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'var(--text-secondary)',
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
                  {marker}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Value Display */}
      <span
        className="text-xs font-medium min-w-[2.5rem] text-center transition-all duration-100"
        style={{ color: 'var(--text-secondary)', opacity: hasClips ? 1 : 0.3 }}
        title="Snap tolerance in seconds"
      >
        {formatSnapValue(snapTolerance)}
      </span>
    </div>
  )
}
