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
    playheadPosition,
    totalDuration,
    zoomLevel,
    selectedClipId,
    addClip,
    selectClip,
    removeClip,
    reorderClips
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
    const clickedTime = relativeX / zoomLevel

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
   * Handle drop - add clip to timeline or reorder existing clip
   * Implements AC #2, #3, #5 (library drag) and AC #3 (clip reorder)
   */
  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()

    // Check for clip reorder (Story 3.4)
    const clipIndexStr = e.dataTransfer.getData('clipIndex')
    if (clipIndexStr && clipIndexStr !== '') {
      const sourceIndex = parseInt(clipIndexStr, 10)
      const destIndex = dragOverIndex !== null ? dragOverIndex : sourceIndex

      // Clear drag state
      setDragOverIndex(null)

      // Only reorder if indices differ
      if (sourceIndex !== destIndex && !isNaN(sourceIndex)) {
        reorderClips(sourceIndex, destIndex)
      }
      return
    }

    // Clear drag state for library drops
    setDragOverIndex(null)

    // Fallback to library drag (Story 2.4)
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
      trimIn: 0, // Trim offset from start (seconds)
      trimOut: 0, // Trim offset from end (seconds)
      trackId: 1,
      thumbnail: file.thumbnail // Pass thumbnail data URL for visual preview
    })
  }

  /**
   * Handle clip click - Tool-aware routing (Tool Selection System)
   * Routes to different handlers based on active tool
   */
  function handleClipClick(clipId: string): void {
    const { selectedTool } = useToolStore.getState()
    const { splitClip } = useTimelineStore.getState()

    if (selectedTool === 'split') {
      // Split tool: Split clip at playhead if playhead is over this clip
      const clip = tracks.flatMap((track) => track.clips).find((c) => c.id === clipId)
      if (!clip) return

      const clipStart = clip.startTime
      const clipEnd = clip.startTime + (clip.duration - clip.trimIn - clip.trimOut)

      // Check if playhead is within clip bounds
      if (playheadPosition > clipStart && playheadPosition < clipEnd) {
        splitClip(clipId, playheadPosition)
        console.log(`[Timeline] Split clip ${clipId} at ${playheadPosition}s`)
      } else {
        // Show user feedback when split fails
        useUIStore.getState().showError(
          'Position the playhead within the clip to split it.',
          'Cannot Split Clip'
        )
        console.warn('[Timeline] Playhead not within clip bounds for split operation')
      }
    } else {
      // Select or Trim tool: Select clip and load in preview
      selectClip(clipId)
      usePlaybackStore.getState().loadClip(clipId)
    }
  }

  /**
   * Handle keyboard shortcuts
   * - Delete/Backspace: Delete selected clip (Story 3.3)
   * - Escape: Deselect clip (Story 3.1)
   * - V/B/C: Tool selection (Tool Selection System)
   */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Tool selection shortcuts (V/B/C)
      const { setTool } = useToolStore.getState()
      if (e.key.toLowerCase() === 'v') {
        setTool('select')
        return
      } else if (e.key.toLowerCase() === 'b') {
        setTool('trim')
        return
      } else if (e.key.toLowerCase() === 'c') {
        setTool('split')
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
  }, [selectedClipId, selectClip, removeClip])

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
      onDragLeave={handleDragLeave}
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

        {/* Drop indicator - shows where clip will be inserted during drag */}
        {dragOverIndex !== null && tracks[0]?.clips && (
          <div
            className="absolute h-full w-1 pointer-events-none z-10"
            style={{
              left: `${
                dragOverIndex === 0
                  ? 0
                  : (tracks[0].clips[dragOverIndex - 1]?.startTime || 0) * zoomLevel +
                    (tracks[0].clips[dragOverIndex - 1]?.duration -
                      tracks[0].clips[dragOverIndex - 1]?.trimIn -
                      tracks[0].clips[dragOverIndex - 1]?.trimOut || 0) *
                      zoomLevel
              }px`,
              backgroundColor: 'var(--accent)',
              opacity: 0.8
            }}
          />
        )}

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
