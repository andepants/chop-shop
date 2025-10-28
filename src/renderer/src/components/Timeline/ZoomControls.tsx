/**
 * ZoomControls Component
 *
 * Timeline zoom controls with slider and buttons
 * Allows users to zoom in/out on timeline for precise editing
 * Adobe Premiere Pro style: slider + buttons, right-aligned in toolbar
 */

import * as React from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { useTimelineStore } from '@/store/timelineStore'

/**
 * ZoomControls component
 * Renders zoom slider, +/- buttons, Fit button, and zoom percentage display
 */
export function ZoomControls(): React.JSX.Element {
  const { zoomLevel, setZoomLevel, zoomIn, zoomOut, fitToTimeline } = useTimelineStore()

  /**
   * Handle slider value change
   * Slider returns array of values, we use first value
   */
  function handleSliderChange(values: number[]): void {
    setZoomLevel(values[0])
  }

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
        className="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
        title="Zoom Out (Cmd/Ctrl -)"
        aria-label="Zoom Out"
      >
        <ZoomOut size={16} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {/* Zoom Slider */}
      <div className="w-32">
        <Slider
          value={[zoomLevel]}
          onValueChange={handleSliderChange}
          min={0.1}
          max={5.0}
          step={0.1}
          className="cursor-pointer"
          aria-label="Zoom Level"
        />
      </div>

      {/* Zoom In Button */}
      <button
        onClick={zoomIn}
        className="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
        title="Zoom In (Cmd/Ctrl +)"
        aria-label="Zoom In"
      >
        <ZoomIn size={16} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {/* Zoom Percentage Display */}
      <span
        className="text-xs font-medium min-w-[3rem] text-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        {formatZoomPercentage(zoomLevel)}
      </span>

      {/* Fit to Timeline Button */}
      <button
        onClick={fitToTimeline}
        className="h-8 px-2 flex items-center gap-1 rounded hover:bg-white/5 transition-colors"
        title="Fit Timeline (\)"
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
