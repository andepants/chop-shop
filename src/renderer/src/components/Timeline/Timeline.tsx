/**
 * Timeline Component
 *
 * Main timeline container displaying tracks, clips, ruler, and playhead.
 * Handles drag-and-drop from media library, sequential clip placement,
 * and automatic zoom adjustment to fit content.
 */

import { useEffect, useRef, useState } from 'react'
import { useMediaStore } from '@/store/mediaStore'
import { useTimelineStore } from '@/store/timelineStore'
import { usePlaybackStore } from '@/store/playbackStore'
import { TimelineRuler } from './TimelineRuler'
import { TimelineTrack } from './TimelineTrack'
import { Playhead } from './Playhead'

const MIN_ZOOM = 10 // Minimum 10 pixels per second
const MAX_ZOOM = 100 // Maximum 100 pixels per second
const DEFAULT_WIDTH = 1000 // Default timeline width for initial zoom calculation

/**
 * Calculate auto-zoom level to fit all clips in container
 *
 * @param totalDuration - Total timeline duration in seconds
 * @param containerWidth - Available width in pixels
 * @returns Zoom level clamped between MIN_ZOOM and MAX_ZOOM
 */
function calculateAutoZoom(totalDuration: number, containerWidth: number): number {
  if (totalDuration === 0) {
    return 50 // Default zoom when empty
  }

  const calculatedZoom = containerWidth / totalDuration
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom))
}

/**
 * Calculate next available position for sequential clip placement
 *
 * @param clips - All clips on track
 * @returns Next position in seconds (0 if timeline empty)
 */
function calculateNextPosition(clips: Array<{ startTime: number; duration: number }>): number {
  if (clips.length === 0) {
    return 0
  }

  // Find the clip that ends latest
  const maxEndTime = clips.reduce((max, clip) => {
    const endTime = clip.startTime + clip.duration
    return endTime > max ? endTime : max
  }, 0)

  return maxEndTime
}

/**
 * Main timeline component
 *
 * Features:
 * - Horizontal track layout at bottom of screen
 * - Drag-and-drop from media library
 * - Sequential clip placement (no overlap)
 * - Auto-zoom to fit all clips
 * - Ruler with time markers
 * - Playhead indicator
 *
 * AC Coverage:
 * - AC #1: Timeline renders as horizontal track at bottom
 * - AC #2: User can drag clip from media library to timeline
 * - AC #3: Dropped clip appears with thumbnail strip
 * - AC #4: Clip shows duration and position on ruler
 * - AC #5: Multiple clips placed sequentially
 * - AC #6: Timeline auto-adjusts zoom to fit clips
 * - AC #7: Playhead visible at timeline start
 */
export function Timeline(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH)

  const { files } = useMediaStore()
  const {
    tracks,
    playheadPosition,
    totalDuration,
    zoomLevel,
    selectedClipId,
    addClip,
    selectClip
  } = useTimelineStore()

  // Measure container width for auto-zoom
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Auto-zoom when clips change or container resizes
  useEffect(() => {
    const newZoom = calculateAutoZoom(totalDuration, containerWidth)
    if (newZoom !== zoomLevel) {
      useTimelineStore.setState({ zoomLevel: newZoom })
    }
  }, [totalDuration, containerWidth])

  /**
   * Handle drag over - allow drop
   */
  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  /**
   * Handle drop - add clip to timeline
   * Implements AC #2, #3, #5
   */
  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()

    const fileId = e.dataTransfer.getData('fileId')
    if (!fileId) return

    const file = files.find((f) => f.id === fileId)
    if (!file) return

    // Calculate next available position (sequential placement - AC #5)
    const allClips = tracks[0]?.clips || []
    const nextPosition = calculateNextPosition(allClips)

    // Add clip to timeline (AC #2, #3)
    addClip({
      sourceFile: file.path,
      startTime: nextPosition,
      duration: file.duration,
      trimIn: 0,
      trimOut: file.duration,
      trackId: 1
    })
  }

  /**
   * Handle clip selection
   * Loads clip in preview player (AC #2)
   */
  function handleClipClick(clipId: string): void {
    selectClip(clipId)
    usePlaybackStore.getState().loadClip(clipId)
  }

  /**
   * Handle timeline seeking (AC #6)
   * Finds clip at clicked time and seeks to offset within clip
   */
  function handleTimelineSeek(clickedTime: number): void {
    const allClips = tracks
      .flatMap((track) => track.clips)
      .sort((a, b) => a.startTime - b.startTime)

    // Find clip at this timeline position
    const clip = allClips.find((c) => {
      const clipEndTime = c.startTime + c.duration
      return clickedTime >= c.startTime && clickedTime < clipEndTime
    })

    if (clip) {
      const playbackStore = usePlaybackStore.getState()

      // Load clip if different from current
      if (playbackStore.currentClipId !== clip.id) {
        playbackStore.loadClip(clip.id)
      }

      // Calculate offset within clip and seek
      const offsetInClip = clickedTime - clip.startTime
      const seekTime = clip.trimIn + offsetInClip
      playbackStore.seek(seekTime)

      // Update playhead position
      useTimelineStore.getState().setPlayhead(clickedTime)
    }
  }

  return (
    <div
      className="h-full flex flex-col overflow-x-auto overflow-y-hidden border-t"
      style={{
        backgroundColor: 'var(--bg-timeline)',
        borderColor: 'var(--border-subtle)'
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Ruler - AC #4 */}
      <TimelineRuler
        totalDuration={Math.max(totalDuration, 60)} // Show at least 60s
        zoomLevel={zoomLevel}
      />

      {/* Track area with playhead */}
      <div
        ref={containerRef}
        className="flex-1 relative min-h-[200px]"
        style={{ backgroundColor: 'var(--bg-timeline)' }}
      >
        {/* Playhead - AC #7 */}
        <Playhead position={playheadPosition} zoomLevel={zoomLevel} />

        {/* Tracks - AC #1 */}
        {tracks.map((track) => (
          <TimelineTrack
            key={track.id}
            track={track}
            zoomLevel={zoomLevel}
            selectedClipId={selectedClipId}
            onClipClick={handleClipClick}
            onTrackClick={handleTimelineSeek}
          />
        ))}

        {/* Empty state hint */}
        {tracks.every((track) => track.clips.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
              <svg
                className="w-10 h-10 mx-auto mb-2 opacity-40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
              <p className="text-xs">Drag videos here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
