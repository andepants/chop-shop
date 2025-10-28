/**
 * TimelineTrack Component
 *
 * Represents a single timeline track containing positioned video clips.
 * For MVP, supports single track with sequential clip placement.
 * Multi-track support deferred to Story 4.1.
 */

import { TimelineClip } from './TimelineClip'
import type { Track } from './timeline.types'

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
}

/**
 * Renders a timeline track with clips
 *
 * Track structure:
 * - Fixed height (80px) for MVP
 * - Label on left side ("Track 1")
 * - Clips positioned absolutely within track using CSS left/width
 * - Clips sorted by startTime
 *
 * @param track - Track data with clips array
 * @param zoomLevel - Pixels per second for clip positioning
 * @param selectedClipId - ID of selected clip for highlighting
 * @param onClipClick - Handler for clip selection
 */
export function TimelineTrack({
  track,
  zoomLevel,
  selectedClipId,
  onClipClick,
  onTrackClick
}: TimelineTrackProps): React.JSX.Element {
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

  return (
    <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      {/* Track content area with clips */}
      <div
        className="h-24 relative cursor-pointer transition-opacity hover:opacity-90"
        onClick={handleTrackClick}
        style={{ backgroundColor: 'var(--bg-timeline)' }}
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
  )
}
