/**
 * TimelineClip Component
 *
 * Displays a video clip on the timeline with thumbnail, duration, and positioning.
 * Clips are positioned using CSS left/width properties based on startTime and duration,
 * scaled by the current zoom level (pixels per second).
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { formatTime } from '@/utils'
import { cn } from '@/utils/cn.util'
import { useToolStore } from '@/store/toolStore'
import { useTimelineStore } from '@/store/timelineStore'
import { useDrag } from '@/hooks/useDrag'
import type { Clip } from './timeline.types'

interface TimelineClipProps {
  /** Clip data including position, duration, and source file */
  clip: Clip
  /** Index of clip in track (for drag-to-reorder) */
  clipIndex: number
  /** Zoom level in pixels per second for positioning calculations */
  zoomLevel: number
  /** Whether this clip is currently selected */
  isSelected?: boolean
  /** Click handler for clip selection/tools - receives mouse event for position-based operations */
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Renders a video clip on the timeline
 *
 * Clip positioning:
 * - left: startTime * zoomLevel (px)
 * - width: duration * zoomLevel (px)
 *
 * Visual design:
 * - Dark background with border
 * - Thumbnail (if available) or placeholder
 * - Duration label
 * - Hover and selection states
 *
 * @param clip - Clip data with position and duration
 * @param zoomLevel - Pixels per second for scaling
 * @param isSelected - Highlight state
 * @param onClick - Selection handler
 */
export function TimelineClip({
  clip,
  clipIndex,
  zoomLevel,
  isSelected = false,
  onClick
}: TimelineClipProps): React.JSX.Element {
  // Get active tool for conditional rendering
  const selectedTool = useToolStore((state) => state.selectedTool)

  // Razor tool state - tracks mouse position for split preview
  const [razorMouseX, setRazorMouseX] = useState<number | null>(null)
  const clipRef = useRef<HTMLDivElement>(null)

  // Timeline container ref for drag calculations
  const timelineContainerRef = useRef<HTMLElement | null>(null)

  // Find timeline container on mount
  useEffect(() => {
    if (clipRef.current) {
      const container = clipRef.current.closest('[data-timeline-container]') as HTMLElement
      timelineContainerRef.current = container
    }
  }, [])

  // Edge trim state - Adobe Premiere style edge detection
  type EdgeHoverState = 'start-edge' | 'end-edge' | 'center' | null
  const [edgeHoverState, setEdgeHoverState] = useState<EdgeHoverState>(null)
  const [isTrimming, setIsTrimming] = useState(false)
  const [trimmingEdge, setTrimmingEdge] = useState<'start' | 'end' | null>(null)

  // Preview trim values (only applied on mouse release)
  const [previewTrimIn, setPreviewTrimIn] = useState(clip.trimIn)
  const [previewTrimOut, setPreviewTrimOut] = useState(clip.trimOut)

  // Ref to store initial trim state (captured on mouse down, not first mouse move)
  const trimStartRef = useRef<{
    mouseX: number
    trimIn: number
    trimOut: number
    startTime: number
  } | null>(null)

  // Track current mouse X position for visual feedback
  const [currentMouseX, setCurrentMouseX] = useState<number>(0)

  // Track if trim is at bounds (for cursor feedback)
  const [isAtBounds, setIsAtBounds] = useState(false)

  // Refs to store latest preview values (avoids closure issues in mouseup handler)
  const previewTrimInRef = useRef<number>(clip.trimIn)
  const previewTrimOutRef = useRef<number>(clip.trimOut)

  // Store for updating clip
  const updateClip = useTimelineStore((state) => state.updateClip)
  const moveClipToPosition = useTimelineStore((state) => state.moveClipToPosition)

  // Custom drag with cursor offset preservation (Adobe Premiere Pro pattern)
  // Only allow drag when in select tool and cursor is on center (not edges)
  const isDragEnabled = selectedTool === 'select' && edgeHoverState === 'center' && !isTrimming

  const { isDragging, dragPosition, onMouseDown: startDrag } = useDrag({
    containerRef: timelineContainerRef,
    disabled: !isDragEnabled,
    onDragEnd: (position) => {
      // Convert pixel position to time
      const timePosition = position / zoomLevel
      moveClipToPosition(clip.id, timePosition)
    }
  })

  // Sync preview values when clip changes
  useEffect(() => {
    setPreviewTrimIn(clip.trimIn)
    setPreviewTrimOut(clip.trimOut)
    previewTrimInRef.current = clip.trimIn
    previewTrimOutRef.current = clip.trimOut
  }, [clip.trimIn, clip.trimOut])

  // Calculate effective duration using preview values during trim, actual values otherwise
  const activeTrimIn = isTrimming ? previewTrimIn : clip.trimIn
  const activeTrimOut = isTrimming ? previewTrimOut : clip.trimOut
  const effectiveDuration = clip.duration - activeTrimIn - activeTrimOut

  // Calculate preview position for start-edge trim (ripple behavior)
  const previewStartTime = isTrimming && trimmingEdge === 'start' && trimStartRef.current
    ? trimStartRef.current.startTime + (previewTrimIn - trimStartRef.current.trimIn)
    : clip.startTime

  // Use drag position if currently dragging, otherwise use clip position
  const leftPosition = useMemo(() => {
    return isDragging && dragPosition !== null
      ? dragPosition
      : previewStartTime * zoomLevel
  }, [isDragging, dragPosition, previewStartTime, zoomLevel])

  // Width is always proportional to duration (use zoom to make small clips larger)
  const width = useMemo(() => {
    return effectiveDuration * zoomLevel
  }, [effectiveDuration, zoomLevel])


  // Determine cursor based on active tool and edge hover state
  const cursorStyle = isDragging
    ? 'grabbing'
    : isTrimming && isAtBounds
      ? 'not-allowed'
      : isTrimming
        ? trimmingEdge === 'start'
          ? 'e-resize'
          : 'w-resize'
        : selectedTool === 'split'
          ? 'crosshair'
          : selectedTool === 'select' && edgeHoverState === 'start-edge'
            ? 'e-resize'
            : selectedTool === 'select' && edgeHoverState === 'end-edge'
              ? 'w-resize'
              : 'grab'


  /**
   * Handle mouse move - detects edge proximity for trimming and tracks razor position
   */
  function handleMouseMove(e: React.MouseEvent): void {
    if (!clipRef.current) return

    const rect = clipRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left

    // Razor tool preview
    if (selectedTool === 'split') {
      setRazorMouseX(mouseX)
      return
    }

    // Edge detection for trimming (only in select tool, not while dragging)
    if (selectedTool === 'select' && !isDragging && !isTrimming) {
      // Zoom-aware edge threshold: at least 10px or 0.5 seconds worth of pixels
      const EDGE_THRESHOLD = Math.max(10, 0.5 * zoomLevel)

      if (mouseX < EDGE_THRESHOLD) {
        setEdgeHoverState('start-edge')
      } else if (mouseX > width - EDGE_THRESHOLD) {
        setEdgeHoverState('end-edge')
      } else {
        setEdgeHoverState('center')
      }
    }
  }

  /**
   * Handle mouse leave - clear razor preview and edge hover state
   */
  function handleMouseLeave(): void {
    setRazorMouseX(null)
    if (!isTrimming) {
      setEdgeHoverState(null)
    }
  }

  /**
   * Calculate split position with snap-to-playhead logic
   * @param mouseX - Mouse X position relative to clip element
   * @returns Split position in pixels within clip, or null if too close to edges
   */
  function calculateSplitPosition(mouseX: number): { position: number; snapped: boolean; time: number } | null {
    const SNAP_THRESHOLD = 15 // pixels - snap to playhead if within this distance
    const EDGE_THRESHOLD = 10 // pixels - don't allow split too close to edges

    // Don't split too close to clip edges
    if (mouseX < EDGE_THRESHOLD || mouseX > width - EDGE_THRESHOLD) {
      return null
    }

    // Calculate playhead position relative to clip
    const playheadPosition = useTimelineStore.getState().playheadPosition
    const playheadX = (playheadPosition - clip.startTime) * zoomLevel

    // Check if playhead is within clip bounds
    const playheadInClip = playheadPosition > clip.startTime && playheadPosition < clip.startTime + effectiveDuration

    // Snap to playhead if mouse is close and playhead is in clip
    if (playheadInClip && Math.abs(mouseX - playheadX) < SNAP_THRESHOLD) {
      const snapTime = playheadPosition
      return { position: playheadX, snapped: true, time: snapTime }
    }

    // Otherwise use mouse position
    const splitTime = clip.startTime + (mouseX / zoomLevel)
    return { position: mouseX, snapped: false, time: splitTime }
  }

  /**
   * Handle mouse down on clip - start trim if on edge, start drag if on center
   */
  function handleMouseDown(e: React.MouseEvent): void {
    // Handle trim on edges in select mode
    if (selectedTool === 'select' && (edgeHoverState === 'start-edge' || edgeHoverState === 'end-edge')) {
      e.preventDefault()
      e.stopPropagation()

      // Capture initial state immediately (not on first mouse move)
      if (clipRef.current) {
        const rect = clipRef.current.getBoundingClientRect()
        trimStartRef.current = {
          mouseX: e.clientX - rect.left,
          trimIn: clip.trimIn,
          trimOut: clip.trimOut,
          startTime: clip.startTime
        }
      }

      setIsTrimming(true)
      setTrimmingEdge(edgeHoverState === 'start-edge' ? 'start' : 'end')
    }
    // Handle drag on center in select mode
    else if (selectedTool === 'select' && edgeHoverState === 'center') {
      startDrag(e)
    }
  }

  /**
   * Global mouse move and mouse up handlers for trim operations
   */
  useEffect(() => {
    if (!isTrimming || !trimmingEdge || !trimStartRef.current) return

    const initialState = trimStartRef.current

    function handleGlobalMouseMove(e: MouseEvent): void {
      if (!clipRef.current || !isTrimming || !initialState) return

      const rect = clipRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      // Update mouse position for visual feedback
      setCurrentMouseX(mouseX)

      // Calculate delta from initial mouse position (captured on mouse down)
      const deltaX = mouseX - initialState.mouseX
      const deltaTime = deltaX / zoomLevel

      if (trimmingEdge === 'start') {
        // Trimming start edge - adjust trimIn
        const unclamped = initialState.trimIn + deltaTime
        const maxTrimIn = clip.duration - initialState.trimOut - 0.1
        const newTrimIn = Math.max(0, Math.min(unclamped, maxTrimIn))

        // Check if we're at bounds
        setIsAtBounds(unclamped <= 0 || unclamped >= maxTrimIn)
        // Update both state (for UI) and ref (for mouseup handler)
        setPreviewTrimIn(newTrimIn)
        previewTrimInRef.current = newTrimIn
      } else {
        // Trimming end edge - adjust trimOut
        const unclamped = initialState.trimOut - deltaTime
        const maxTrimOut = clip.duration - initialState.trimIn - 0.1
        const newTrimOut = Math.max(0, Math.min(unclamped, maxTrimOut))

        // Check if we're at bounds
        setIsAtBounds(unclamped <= 0 || unclamped >= maxTrimOut)
        // Update both state (for UI) and ref (for mouseup handler)
        setPreviewTrimOut(newTrimOut)
        previewTrimOutRef.current = newTrimOut
      }
    }

    function handleGlobalMouseUp(): void {
      if (!isTrimming || !initialState) return

      // Calculate updates - READ FROM REFS to avoid stale closure values
      const updates: Partial<Clip> = {
        trimIn: previewTrimInRef.current,
        trimOut: previewTrimOutRef.current
      }

      // If trimming start edge, adjust startTime to move clip on timeline (ripple behavior)
      if (trimmingEdge === 'start') {
        const trimInDelta = previewTrimInRef.current - initialState.trimIn
        updates.startTime = initialState.startTime + trimInDelta
      }

      // Apply all updates to store
      updateClip(clip.id, updates)

      // Reset trim state and refs
      setIsTrimming(false)
      setTrimmingEdge(null)
      trimStartRef.current = null
      setCurrentMouseX(0)
      setIsAtBounds(false)
      previewTrimInRef.current = clip.trimIn
      previewTrimOutRef.current = clip.trimOut
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
    // Dependencies: only include values that are READ by the effect, not values that are SET by it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrimming, trimmingEdge, clip.duration, zoomLevel, updateClip])

  // Extract filename from sourceFile path
  const filename = clip.sourceFile.split('/').pop() || clip.sourceFile

  return (
    <div
      ref={clipRef}
      className={cn(
        'absolute rounded-sm z-5',
        // Fallback background if no thumbnail
        !clip.thumbnail && 'bg-cyan-500/60'
      )}
      style={{
        left: `${leftPosition}px`,
        width: `${width}px`,
        height: '92px',
        top: '4px',
        cursor: cursorStyle,
        // Premiere Pro style borders and shadows
        border: isSelected
          ? '2px solid rgb(34, 211, 238)' // cyan-400
          : '1px solid rgba(63, 63, 70, 0.8)', // zinc-700 with opacity
        boxShadow: isSelected
          ? '0 0 0 1px rgb(34, 211, 238), 0 0 12px rgba(34, 211, 238, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)' // Selection glow
          : '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)', // Subtle depth
        // Visual feedback during drag
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 100 : undefined,
        transition: 'none' // No transitions on position/size to prevent jumping
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={(e) => onClick?.(e)}
      role="button"
      tabIndex={0}
      aria-label={`Clip at ${formatTime(clip.startTime)}, duration ${formatTime(effectiveDuration)}`}
    >
      {/* Clip container with repeating thumbnail filmstrip (Premiere Pro style) */}
      <div
        className="h-full w-full relative overflow-hidden rounded-sm"
        style={{
          ...(clip.thumbnail && {
            backgroundImage: `url(${clip.thumbnail})`,
            backgroundSize: 'auto 100%', // Height 100%, width auto (maintains aspect ratio)
            backgroundRepeat: 'repeat-x', // Repeat horizontally
            backgroundPosition: 'left center',
            opacity: isSelected ? 0.85 : 0.7
          }),
          backgroundColor: clip.thumbnail ? 'transparent' : 'rgba(6, 182, 212, 0.15)' // cyan fallback
        }}
      >
        {/* Filename label - top left */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-mono bg-black/75 text-zinc-100 truncate max-w-[calc(100%-3rem)] z-10">
          {filename}
        </div>

        {/* Duration label - bottom right */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-mono bg-black/75 text-zinc-100 z-10">
          {formatTime(effectiveDuration)}
        </div>

        {/* Track label - bottom left (visible on hover) */}
        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-mono bg-black/75 text-zinc-100 z-10 opacity-0 hover:opacity-100 transition-opacity">
          Track {clip.trackId}
        </div>

        {/* Drag position tooltip - Premiere Pro style */}
        {isDragging && dragPosition !== null && (
          <div
            className="absolute pointer-events-none z-30 px-2 py-1 rounded text-xs font-mono whitespace-nowrap"
            style={{
              left: '50%',
              top: '-32px',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              color: 'rgb(34, 211, 238)', // cyan-400
              border: '1px solid rgb(34, 211, 238)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
            }}
          >
            {formatTime(dragPosition / zoomLevel)}
          </div>
        )}

        {/* Trim preview overlay - grey out trimmed area during drag */}
        {isTrimming && trimmingEdge && (() => {
          const trimmedAreaWidth = trimmingEdge === 'start'
            ? (previewTrimIn - clip.trimIn) * zoomLevel
            : (previewTrimOut - clip.trimOut) * zoomLevel

          const overlayLeft = trimmingEdge === 'start'
            ? 0
            : width + trimmedAreaWidth

          return (
            <>
              {/* Gray overlay showing trimmed region */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-15 transition-all duration-75"
                style={{
                  left: `${overlayLeft}px`,
                  width: `${Math.abs(trimmedAreaWidth)}px`,
                  backgroundColor: 'rgba(239, 68, 68, 0.4)', // Red-tinted gray
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.1) 10px, rgba(0, 0, 0, 0.1) 20px)'
                }}
              />

              {/* Vertical line at cursor position (Premiere Pro style) */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-20 transition-all duration-75"
                style={{
                  left: `${currentMouseX}px`,
                  width: '2px',
                  backgroundColor: '#3b82f6', // Blue
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)'
                }}
              >
                {/* Triangle indicator at top */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '8px solid #3b82f6'
                  }}
                />
              </div>

              {/* Timecode tooltip showing trim amount */}
              {trimStartRef.current && (
                <div
                  className="absolute pointer-events-none z-30 px-2 py-1 rounded text-xs font-mono whitespace-nowrap"
                  style={{
                    left: `${currentMouseX}px`,
                    top: '-32px',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    color: '#3b82f6',
                    border: '1px solid #3b82f6',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {(() => {
                    const trimAmount = trimmingEdge === 'start'
                      ? previewTrimIn - trimStartRef.current.trimIn
                      : previewTrimOut - trimStartRef.current.trimOut
                    const sign = trimAmount >= 0 ? '+' : ''
                    return `${sign}${formatTime(Math.abs(trimAmount))}`
                  })()}
                </div>
              )}
            </>
          )
        })()}

        {/* Razor tool split preview - red line follows mouse cursor */}
        {selectedTool === 'split' && razorMouseX !== null && (() => {
          const splitInfo = calculateSplitPosition(razorMouseX)
          if (!splitInfo) return null

          const { position, snapped, time } = splitInfo

          return (
            <>
              {/* Red split line preview */}
              <div
                className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-20 transition-all duration-75"
                style={{
                  left: `${position}px`,
                  backgroundColor: snapped ? '#fbbf24' : '#ef4444', // Yellow when snapped, red otherwise
                  boxShadow: snapped
                    ? '0 0 6px rgba(251, 191, 36, 0.8)' // Yellow glow when snapped
                    : '0 0 6px rgba(239, 68, 68, 0.8)' // Red glow
                }}
              >
                {/* Triangle indicator at top */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `6px solid ${snapped ? '#fbbf24' : '#ef4444'}` // Yellow when snapped, red otherwise
                  }}
                />
              </div>

              {/* Timestamp tooltip showing exact cut position */}
              <div
                className="absolute pointer-events-none z-30 px-2 py-1 rounded text-xs font-mono whitespace-nowrap"
                style={{
                  left: `${position}px`,
                  top: '-28px',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  color: snapped ? '#fbbf24' : '#ef4444',
                  border: `1px solid ${snapped ? '#fbbf24' : '#ef4444'}`
                }}
              >
                {formatTime(time)}
                {snapped && ' ⚡'}
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}
