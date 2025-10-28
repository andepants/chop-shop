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
import { useState } from 'react'

interface TimelineTrackProps {
  /** Track data including ID and clips */
  track: Track
  /** Zoom level in pixels per second */
  zoomLevel: number
  /** ID of currently selected clip */
  selectedClipId: string | null
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
 * @param selectedClipId - ID of selected clip for highlighting
 * @param onClipClick - Handler for clip selection
 * @param onTrackClick - Handler for timeline seeking
 * @param onDragOver - Handler for drag-over highlighting
 * @param onDragLeave - Handler to clear drag highlight
 * @param onDrop - Handler for clip drop on track
 */
export function TimelineTrack({
  track,
  zoomLevel,
  selectedClipId,
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
   */
  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
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
        {/* Track label with color indicator */}
        <div
          className="w-20 flex items-center px-2 text-xs font-medium text-zinc-400 border-r border-zinc-800"
          style={{ height: `${track.height}px` }}
        >
          <div className={`w-1 h-full ${style.labelBg} mr-2 rounded-sm`} />
          <span>Track {track.id}</span>
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
              isSelected={clip.id === selectedClipId}
              onClick={(e) => onClipClick(clip.id, e)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
