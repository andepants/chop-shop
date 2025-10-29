/**
 * TimelineTrack Component
 *
 * Represents a single timeline track containing positioned video clips.
 * Supports multi-track timeline with visual track separation (Story 4.1).
 *
 * Track visual indicators (Adobe Premiere Pro style):
 * - Track 1: Cyan left border (#06b6d4), darker background (#1a1a1a)
 * - Track 2: Purple left border (#a855f7), lighter background (#252525)
 */

import { TimelineClip } from './TimelineClip'
import type { Track } from './timeline.types'
import { Tooltip } from '../Tooltip'
import { useState } from 'react'

interface TimelineTrackProps {
  /** Track data including ID and clips */
  track: Track
  /** Zoom level in pixels per second */
  zoomLevel: number
  /** IDs of currently selected clips */
  selectedClipIds: string[]
  /** Click handler for clip selection - receives clip ID and mouse event for position-based operations */
  onClipClick: (clipId: string, e: React.MouseEvent) => void
  /** Click handler for timeline seeking */
  onTrackClick?: (time: number) => void
  /** Drag over handler for track-specific drop targeting */
  onDragOver?: (e: React.DragEvent) => void
  /** Drag leave handler to clear highlight */
  onDragLeave?: (e: React.DragEvent) => void
  /** Drop handler for clip placement on this track */
  onDrop?: (e: React.DragEvent) => void
}

/**
 * Renders a timeline track with clips
 *
 * Track structure:
 * - Fixed height (80px) with 4px spacing between tracks
 * - Visual label on left side with track ID and color indicator
 * - Clips positioned absolutely within track using CSS left/width
 * - Clips sorted by startTime
 * - Drag-over highlight for drop targeting
 *
 * @param track - Track data with clips array
 * @param zoomLevel - Pixels per second for clip positioning
 * @param selectedClipIds - IDs of selected clips for highlighting
 * @param onClipClick - Handler for clip selection
 * @param onTrackClick - Handler for timeline seeking
 * @param onDragOver - Handler for drag-over highlighting
 * @param onDragLeave - Handler to clear drag highlight
 * @param onDrop - Handler for clip drop on track
 */
export function TimelineTrack({
  track,
  zoomLevel,
  selectedClipIds,
  onClipClick,
  onTrackClick,
  onDragOver,
  onDragLeave,
  onDrop
}: TimelineTrackProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)

  /**
   * Handle track click for timeline seeking (AC #6)
   * Calculates clicked time based on mouse X position and zoom level
   */
  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>): void {
    // Only handle clicks on the track background, not on clips
    if (e.target !== e.currentTarget) return

    if (onTrackClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickedTime = clickX / zoomLevel
      onTrackClick(clickedTime)
    }
  }

  /**
   * Handle drag over to show visual feedback
   */
  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault()
    setIsDragOver(true)
    onDragOver?.(e)
  }

  /**
   * Handle drag leave to clear visual feedback
   */
  function handleDragLeave(e: React.DragEvent): void {
    setIsDragOver(false)
    onDragLeave?.(e)
  }

  /**
   * Handle drop event and clear visual feedback
   * Stops event propagation to prevent parent Timeline from handling the drop again
   */
  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling to parent Timeline container
    setIsDragOver(false)
    onDrop?.(e)
  }

  // Track-specific styling (Adobe Premiere Pro pattern)
  const trackStyles = {
    1: {
      borderColor: '#06b6d4', // Cyan
      backgroundColor: '#1a1a1a', // Darker
      labelBg: 'bg-cyan-600'
    },
    2: {
      borderColor: '#a855f7', // Purple
      backgroundColor: '#252525', // Lighter
      labelBg: 'bg-purple-600'
    }
  }

  const style = trackStyles[track.id as keyof typeof trackStyles] || trackStyles[1]

  return (
    <div className="mb-1" data-track-id={track.id}>
      {/* Track container with visual indicator and label */}
      <div className="flex">
        {/* Track label with color indicator - Premiere Pro style */}
        <div
          className="w-20 flex flex-col justify-between px-1.5 py-2 text-xs font-medium border-r"
          style={{
            height: `${track.height}px`,
            backgroundColor: 'rgb(24, 24, 27)', // zinc-900
            borderColor: 'rgb(39, 39, 42)' // zinc-800
          }}
        >
          {/* Track number badge and color indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-0.5 h-6 ${style.labelBg} rounded-full`}
              style={{
                boxShadow: '0 0 4px rgba(0, 0, 0, 0.3)'
              }}
            />
            <span
              className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'rgb(39, 39, 42)', // zinc-800
                color: 'rgb(161, 161, 170)' // zinc-400
              }}
            >
              V{track.id}
            </span>
          </div>

          {/* Track controls - Premiere Pro style icons */}
          <div className="flex flex-col gap-1">
            {/* Mute/Solo/Lock buttons - placeholder for now */}
            <div className="flex items-center justify-center gap-1">
              {/* Mute button */}
              <Tooltip text="Mute track">
                <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-300">
                  <span className="text-[10px]">M</span>
                </button>
              </Tooltip>
              {/* Solo button */}
              <Tooltip text="Solo track">
                <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-300">
                  <span className="text-[10px]">S</span>
                </button>
              </Tooltip>
              {/* Lock button */}
              <Tooltip text="Lock track">
                <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-300">
                  <span className="text-[10px]">L</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Track content area with clips */}
        <div
          className="flex-1 relative cursor-pointer transition-all duration-150"
          style={{
            height: `${track.height}px`,
            backgroundColor: style.backgroundColor,
            borderLeft: `3px solid ${style.borderColor}`,
            opacity: isDragOver ? 0.8 : 1,
            outline: isDragOver ? `2px dashed ${style.borderColor}` : 'none',
            outlineOffset: '-2px'
          }}
          onClick={handleTrackClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {track.clips.map((clip, index) => (
            <TimelineClip
              key={clip.id}
              clip={clip}
              clipIndex={index}
              zoomLevel={zoomLevel}
              isSelected={selectedClipIds.includes(clip.id)}
              onClick={(e) => onClipClick(clip.id, e)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
