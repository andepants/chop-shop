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

/**
 * Format seconds to MM:SS.FF timecode
 *
 * @param seconds - Time in seconds
 * @returns Formatted timecode string
 */
function formatTimecode(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 30) // Assuming 30fps
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`
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
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)

  const { files, selectFile } = useMediaStore()
  const {
    tracks,
    totalDuration,
    pixelsPerSecond,
    zoomLevel,
    snapTolerance,
    selectedClipIds,
    playheadPosition,
    addClipToTrack,
    selectClip,
    toggleClipSelection,
    selectClipRange,
    clearSelection,
    removeClip,
    rippleDeleteClips,
    zoomIn,
    zoomOut,
    setZoomLevel,
    fitToTimeline,
    undo,
    redo
  } = useTimelineStore()


  // Note: Auto-zoom removed in Story 4.2 - users now control zoom manually
  // Use "Fit" button (backslash key) to fit timeline to viewport

  /**
   * Handle drag over - allow drop for library files
   * Clips now handle their own dragging via mouse events
   */
  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault()
    // Library drag: use copy effect
    e.dataTransfer.dropEffect = 'copy'
  }

  /**
   * Handle drag leave - cleanup for library file drags
   */
  function handleDragLeave(): void {
    // No cleanup needed - clips handle their own dragging
  }


  /**
   * Handle drop on specific track - adds library files to targeted track
   * Clips now handle their own dragging via mouse events
   */
  function handleTrackDrop(e: React.DragEvent, trackId: number): void {
    e.preventDefault()

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
        name: file.name,
        sourceFile: file.path,
        intermediatePath: file.intermediatePath || file.path, // Use intermediate if available, fallback to source
        startTime: nextPosition,
        duration: file.duration,
        trimIn: 0,
        trimOut: 0,
        thumbnail: file.thumbnail,
        hasAudio: file.hasAudio, // Pass through audio stream detection for export
        resolution: file.resolution // Pass through resolution for H.264 level calculation
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
      } else {
        // Show user feedback when split fails (too close to edges)
        useUIStore.getState().showError(
          'Cannot split too close to the edge of a clip.',
          'Cannot Split Clip'
        )
      }
    } else {
      // Select or Trim tool: Handle clip selection with modifier keys
      // Clear media library selection to prevent simultaneous selection conflicts
      selectFile(null)

      // Cmd/Ctrl+click: Toggle clip in/out of selection
      if (e.metaKey || e.ctrlKey) {
        toggleClipSelection(clipId)
      }
      // Shift+click: Select range from last selected to this clip
      else if (e.shiftKey && selectedClipIds.length > 0) {
        const lastSelectedId = selectedClipIds[selectedClipIds.length - 1]
        selectClipRange(lastSelectedId, clipId)
      }
      // No modifiers: Single select (replaces selection)
      else {
        selectClip(clipId)

        // Seek to clip's start time in the compositor
        const clip = tracks.flatMap((track) => track.clips).find((c) => c.id === clipId)
        if (clip) {
          usePlaybackStore.getState().seek(clip.startTime)
        }
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
      // CRITICAL: Prevent default for ALL Cmd/Ctrl zoom shortcuts FIRST
      // Electron intercepts these before our handler otherwise
      if (e.metaKey || e.ctrlKey) {
        // Check if it's a zoom-related key
        const isZoomKey =
          e.key === '=' || e.key === '+' || e.code === 'Equal' ||
          e.key === '-' || e.code === 'Minus' ||
          e.key === '0' || e.code === 'Digit0'

        if (isZoomKey) {
          e.preventDefault() // Prevent browser/Electron zoom BEFORE checking conditions
        }
      }

      // DEBUG: Log all keyboard events with Cmd/Ctrl modifier
      // Keyboard shortcuts active

      // Tool selection shortcuts (V/C)
      const { setTool } = useToolStore.getState()
      if (e.key.toLowerCase() === 'v') {
        setTool('select')
        return
      } else if (e.key.toLowerCase() === 'c') {
        setTool('split')
        return
      }

      // Undo/Redo shortcuts (Adobe Premiere Pro style)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redo()
        return
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }

      // Zoom shortcuts (Story 4.2)
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+' || e.code === 'Equal')) {
        zoomIn()
        return
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.code === 'Minus')) {
        zoomOut()
        return
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '0' || e.code === 'Digit0')) {
        setZoomLevel(1.0) // Reset to 100%
        return
      } else if (e.key === '\\' || e.code === 'Backslash') {
        fitToTimeline()
        return
      }

      // Clip manipulation shortcuts
      if (e.key === 'Escape') {
        clearSelection()
        selectFile(null) // Also clear media library selection
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipIds.length > 0) {
        e.preventDefault() // Prevent browser back navigation on Backspace

        // Premiere Pro style: Ripple delete (atomic multi-clip removal with gap closing)
        // This prevents the stale position bug that occurs with iterative delete
        rippleDeleteClips(selectedClipIds)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipIds, clearSelection, removeClip, rippleDeleteClips, zoomIn, zoomOut, setZoomLevel, fitToTimeline, undo, redo, selectFile])

  /**
   * Track mouse position on timeline for cursor-aware zoom
   * Story 4.2: Task 5
   */
  useEffect(() => {
    function handleMouseMove(e: MouseEvent): void {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()

      // Check if mouse is over the timeline container
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      } else {
        setMousePosition(null)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  /**
   * Handle cursor-aware zoom with Alt + scroll wheel (Story 4.2: Task 5)
   * Also prevents default browser zoom on Cmd/Ctrl + scroll (Task 3)
   */
  useEffect(() => {
    function handleWheel(e: WheelEvent): void {
      // Prevent browser zoom on Cmd/Ctrl + scroll
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        return
      }

      // Cursor-aware zoom on Alt + scroll (Premiere Pro pattern)
      if (e.altKey && containerRef.current) {
        e.preventDefault()

        // Get scroll container for offset adjustment
        const scrollContainer = containerRef.current.parentElement
        if (!scrollContainer) return

        // Calculate time at cursor position before zoom
        const cursorX = mousePosition?.x ?? scrollContainer.scrollLeft + scrollContainer.clientWidth / 2
        const timeBeforeZoom = cursorX / pixelsPerSecond

        // Zoom in/out based on wheel direction
        if (e.deltaY < 0) {
          zoomIn()
        } else {
          zoomOut()
        }

        // Wait for zoom state to update, then adjust scroll position
        requestAnimationFrame(() => {
          const newPixelsPerSecond = useTimelineStore.getState().pixelsPerSecond

          // Calculate new pixel position of the cursor time
          const newCursorX = timeBeforeZoom * newPixelsPerSecond

          // Adjust scroll offset to keep cursor time at same visual position
          const scrollAdjustment = newCursorX - cursorX
          scrollContainer.scrollLeft += scrollAdjustment
        })
      }
    }

    const scrollContainer = containerRef.current?.parentElement
    if (!scrollContainer) return

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false })
    return () => scrollContainer.removeEventListener('wheel', handleWheel)
  }, [mousePosition, pixelsPerSecond, zoomIn, zoomOut])

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

        {/* Tracks - AC #1, AC #2 (multi-track) */}
        {tracks.map((track) => (
          <TimelineTrack
            key={track.id}
            track={track}
            zoomLevel={pixelsPerSecond}
            selectedClipIds={selectedClipIds}
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

        {/* Zoom Controls - Premiere Pro style (bottom-right corner) */}
        <div
          className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-md shadow-lg z-50"
          style={{
            backgroundColor: 'rgba(24, 24, 27, 0.95)', // zinc-900 with transparency
            border: '1px solid rgba(63, 63, 70, 0.8)', // zinc-700
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Zoom Out Button */}
          <button
            onClick={() => useTimelineStore.getState().zoomOut()}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-200"
            title="Zoom Out (Cmd+-)"
          >
            <span className="text-sm font-bold">−</span>
          </button>

          {/* Zoom Slider */}
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => useTimelineStore.getState().setZoomLevel(parseFloat(e.target.value))}
            className="w-24 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(34, 211, 238) 0%, rgb(34, 211, 238) ${((zoomLevel - 0.1) / (5 - 0.1)) * 100}%, rgb(63, 63, 70) ${((zoomLevel - 0.1) / (5 - 0.1)) * 100}%, rgb(63, 63, 70) 100%)`
            }}
            title="Zoom Level"
          />

          {/* Zoom In Button */}
          <button
            onClick={() => useTimelineStore.getState().zoomIn()}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-200"
            title="Zoom In (Cmd++)"
          >
            <span className="text-sm font-bold">+</span>
          </button>

          {/* Zoom Percentage Display */}
          <div
            className="text-xs font-mono font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(39, 39, 42, 0.8)', // zinc-800
              color: 'rgb(161, 161, 170)', // zinc-400
              minWidth: '48px',
              textAlign: 'center'
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </div>

          {/* Fit to Timeline Button */}
          <button
            onClick={() => useTimelineStore.getState().fitToTimeline()}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-200"
            title="Fit to Timeline"
          >
            <span className="text-[10px]">⇄</span>
          </button>

          {/* Separator */}
          <div
            className="w-px h-6 mx-1"
            style={{ backgroundColor: 'rgba(63, 63, 70, 0.8)' }}
          />

          {/* Snap Tolerance Label */}
          <div className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'rgb(161, 161, 170)' }}
              title="Snap Tolerance"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </div>

          {/* Snap Tolerance Slider */}
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={snapTolerance}
            onChange={(e) =>
              useTimelineStore.getState().setSnapTolerance(parseFloat(e.target.value))
            }
            className="w-20 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(34, 211, 238) 0%, rgb(34, 211, 238) ${((snapTolerance - 0.1) / (2.0 - 0.1)) * 100}%, rgb(63, 63, 70) ${((snapTolerance - 0.1) / (2.0 - 0.1)) * 100}%, rgb(63, 63, 70) 100%)`
            }}
            title="Snap Tolerance (seconds)"
          />

          {/* Snap Value Display */}
          <div
            className="text-xs font-mono font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(39, 39, 42, 0.8)',
              color: 'rgb(161, 161, 170)',
              minWidth: '42px',
              textAlign: 'center'
            }}
          >
            {snapTolerance.toFixed(1)}s
          </div>
        </div>
      </div>
    </div>
  )
}
