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
import { useToolStore } from '@/store/toolStore'
import { useUIStore } from '@/store/uiStore'
import { TimelineRuler } from './TimelineRuler'
import { TimelineTrack } from './TimelineTrack'
import { TimelineGrid } from './TimelineGrid'
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const { files } = useMediaStore()
  const {
    tracks,
    totalDuration,
    pixelsPerSecond,
    selectedClipId,
    addClip,
    addClipToTrack,
    selectClip,
    removeClip,
    moveClipToPosition,
    zoomIn,
    zoomOut,
    setZoomLevel,
    fitToTimeline
  } = useTimelineStore()

  // Measure container width (used for manual Fit to Timeline calculation)
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

  // Note: Auto-zoom removed in Story 4.2 - users now control zoom manually
  // Use "Fit" button (backslash key) to fit timeline to viewport

  /**
   * Handle drag over - allow drop and show drop indicator
   */
  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault()

    // Check if this is a clip reorder drag (has clipIndex) or library drag (has fileId)
    // Note: dataTransfer.types lowercases the keys
    const isClipReorder = e.dataTransfer.types.includes('clipindex')

    if (isClipReorder) {
      // Clip reorder: calculate drop position
      e.dataTransfer.dropEffect = 'move'
      const dropIndex = calculateDropIndex(e)
      setDragOverIndex(dropIndex)
    } else {
      // Library drag: use copy effect
      e.dataTransfer.dropEffect = 'copy'
      setDragOverIndex(null)
    }
  }

  /**
   * Handle drag leave - clear drop indicator
   */
  function handleDragLeave(): void {
    setDragOverIndex(null)
  }

  /**
   * Calculate drop index based on mouse position
   */
  function calculateDropIndex(e: React.DragEvent): number {
    if (!containerRef.current) return 0

    const rect = containerRef.current.getBoundingClientRect()
    const relativeX = e.clientX - rect.left
    const clickedTime = relativeX / pixelsPerSecond

    const clips = tracks[0]?.clips || []
    if (clips.length === 0) return 0

    // Find insertion point based on clicked time
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const clipMidpoint = clip.startTime + (clip.duration - clip.trimIn - clip.trimOut) / 2

      if (clickedTime < clipMidpoint) {
        return i
      }
    }

    // Default to end of timeline
    return clips.length
  }

  /**
   * Handle drop on specific track - adds clip to targeted track
   * Implements AC #2 (multi-track drag-drop)
   */
  function handleTrackDrop(e: React.DragEvent, trackId: number): void {
    e.preventDefault()

    // Check for clip reorder/move (Story 3.4 + position-based movement)
    const clipId = e.dataTransfer.getData('clipId')
    if (clipId && clipId !== '') {
      // Calculate actual timeline position from drop coordinates
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const relativeX = e.clientX - rect.left
      const dropPosition = relativeX / pixelsPerSecond

      // Clear drag state
      setDragOverIndex(null)

      // Move clip to the dropped position (allows gaps, Premiere Pro style)
      moveClipToPosition(clipId, dropPosition)
      return
    }

    // Clear drag state for library drops
    setDragOverIndex(null)

    // Library drag to specific track (Story 4.1)
    const fileId = e.dataTransfer.getData('fileId')
    if (!fileId) return

    const file = files.find((f) => f.id === fileId)
    if (!file) return

    // Calculate next available position on target track (sequential placement - AC #5)
    const targetTrack = tracks.find((t) => t.id === trackId)
    const trackClips = targetTrack?.clips || []
    const nextPosition = calculateNextPosition(trackClips)

    // Add clip to specific track (AC #2)
    addClipToTrack(
      {
        sourceFile: file.path,
        startTime: nextPosition,
        duration: file.duration,
        trimIn: 0,
        trimOut: 0,
        thumbnail: file.thumbnail
      },
      trackId
    )
  }

  /**
   * Handle drop on timeline container (fallback to Track 1)
   * Implements AC #2, #3, #5 (library drag)
   */
  function handleDrop(e: React.DragEvent): void {
    // Fallback: if dropped outside tracks, default to Track 1
    handleTrackDrop(e, 1)
  }

  /**
   * Handle clip click - Tool-aware routing (Tool Selection System)
   * Routes to different handlers based on active tool
   */
  function handleClipClick(clipId: string, e: React.MouseEvent): void {
    const { selectedTool } = useToolStore.getState()
    const { splitClip } = useTimelineStore.getState()

    if (selectedTool === 'split') {
      // Split tool: Split clip at mouse click position
      const clip = tracks.flatMap((track) => track.clips).find((c) => c.id === clipId)
      if (!clip) return

      // Calculate mouse position relative to the clip element
      const clipElement = e.currentTarget as HTMLElement
      const rect = clipElement.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      // Convert mouse X position to timeline time
      const splitTime = clip.startTime + (mouseX / pixelsPerSecond)

      // Validate split time is within clip bounds (with small edge margin)
      const clipStart = clip.startTime
      const clipEnd = clip.startTime + (clip.duration - clip.trimIn - clip.trimOut)
      const EDGE_MARGIN = 0.1 // Don't split within 0.1s of edges

      if (splitTime > clipStart + EDGE_MARGIN && splitTime < clipEnd - EDGE_MARGIN) {
        splitClip(clipId, splitTime)
        console.log(`[Timeline] Split clip ${clipId} at ${splitTime.toFixed(2)}s (mouse position)`)
      } else {
        // Show user feedback when split fails (too close to edges)
        useUIStore.getState().showError(
          'Cannot split too close to the edge of a clip.',
          'Cannot Split Clip'
        )
        console.warn('[Timeline] Split position too close to clip edge')
      }
    } else {
      // Select or Trim tool: Select clip and seek to its start
      selectClip(clipId)

      // Seek to clip's start time in the compositor
      const clip = tracks.flatMap((track) => track.clips).find((c) => c.id === clipId)
      if (clip) {
        usePlaybackStore.getState().seek(clip.startTime)
      }
    }
  }

  /**
   * Handle keyboard shortcuts
   * - Delete/Backspace: Delete selected clip (Story 3.3)
   * - Escape: Deselect clip (Story 3.1)
   * - V/C: Tool selection (Tool Selection System)
   * - Cmd/Ctrl + "+": Zoom in (Story 4.2)
   * - Cmd/Ctrl + "-": Zoom out (Story 4.2)
   * - Cmd/Ctrl + "0": Reset zoom to 100% (Story 4.2)
   * - Backslash "\" : Fit timeline to viewport (Story 4.2)
   */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Tool selection shortcuts (V/C)
      const { setTool } = useToolStore.getState()
      if (e.key.toLowerCase() === 'v') {
        setTool('select')
        return
      } else if (e.key.toLowerCase() === 'c') {
        setTool('split')
        return
      }

      // Zoom shortcuts (Story 4.2)
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault() // Prevent browser zoom
        zoomIn()
        return
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault() // Prevent browser zoom
        zoomOut()
        return
      } else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        setZoomLevel(1.0) // Reset to 100%
        return
      } else if (e.key === '\\') {
        fitToTimeline()
        return
      }

      // Clip manipulation shortcuts
      if (e.key === 'Escape') {
        selectClip(null)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        e.preventDefault() // Prevent browser back navigation on Backspace
        removeClip(selectedClipId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, selectClip, removeClip, zoomIn, zoomOut, setZoomLevel, fitToTimeline])

  /**
   * Prevent default browser zoom on Cmd/Ctrl + scroll
   * Story 4.2: Task 3
   */
  useEffect(() => {
    function handleWheel(e: WheelEvent): void {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault() // Prevent browser zoom
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  /**
   * Handle timeline seeking (AC #6)
   * Finds clip at clicked time and seeks to offset within clip
   * Now uses effective duration to properly handle trimmed clips
   */
  function handleTimelineSeek(clickedTime: number): void {
    const playbackStore = usePlaybackStore.getState()

    // Simply seek to the global timeline position
    // Compositor automatically handles which clips should be active
    playbackStore.seek(clickedTime)

    // Update playhead position (redundant but keeps UI in sync immediately)
    useTimelineStore.getState().setPlayhead(clickedTime)
  }

  return (
    <div
      className="h-full flex flex-col overflow-x-auto overflow-y-hidden border-t"
      style={{
        backgroundColor: 'var(--bg-timeline)',
        borderColor: 'var(--border-subtle)'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Ruler - AC #4 */}
      <TimelineRuler
        totalDuration={Math.max(totalDuration, 60)} // Show at least 60s
        zoomLevel={pixelsPerSecond}
      />

      {/* Track area with playhead */}
      <div
        ref={containerRef}
        data-timeline-container
        className="flex-1 relative min-h-[200px]"
        style={{ backgroundColor: 'var(--bg-timeline)' }}
      >
        {/* Grid lines - CapCut/Premiere Pro style */}
        <TimelineGrid
          totalDuration={Math.max(totalDuration, 60)}
          zoomLevel={pixelsPerSecond}
        />

        {/* Playhead - AC #7 */}
        <Playhead zoomLevel={pixelsPerSecond} />

        {/* Drop indicator - shows where clip will be inserted during drag */}
        {dragOverIndex !== null && tracks[0]?.clips && (
          <div
            className="absolute h-full w-1 pointer-events-none z-10"
            style={{
              left: `${
                dragOverIndex === 0
                  ? 0
                  : (tracks[0].clips[dragOverIndex - 1]?.startTime || 0) * pixelsPerSecond +
                    (tracks[0].clips[dragOverIndex - 1]?.duration -
                      tracks[0].clips[dragOverIndex - 1]?.trimIn -
                      tracks[0].clips[dragOverIndex - 1]?.trimOut || 0) *
                      pixelsPerSecond
              }px`,
              backgroundColor: 'var(--accent)',
              opacity: 0.8
            }}
          />
        )}

        {/* Tracks - AC #1, AC #2 (multi-track) */}
        {tracks.map((track) => (
          <TimelineTrack
            key={track.id}
            track={track}
            zoomLevel={pixelsPerSecond}
            selectedClipId={selectedClipId}
            onClipClick={handleClipClick}
            onTrackClick={handleTimelineSeek}
            onDrop={(e) => handleTrackDrop(e, track.id)}
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
