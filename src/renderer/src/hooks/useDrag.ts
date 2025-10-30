/**
 * Custom Drag Hook
 *
 * Provides mouse-based dragging functionality with cursor offset preservation.
 * Replaces native HTML5 drag-and-drop for pixel-perfect clip manipulation.
 *
 * Adobe Premiere Pro pattern:
 * - Preserves cursor offset (where you clicked stays under cursor)
 * - Real-time position updates during drag
 * - Smooth visual feedback
 */

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Drag state returned by the hook
 */
interface DragState {
  /** Whether currently dragging */
  isDragging: boolean
  /** Current drag position in pixels (relative to container) */
  dragPosition: number | null
  /** Offset from start of element where user clicked (in pixels) */
  dragOffset: number
}

/**
 * Drag handlers to attach to element
 */
interface DragHandlers {
  /** Attach to draggable element's onMouseDown */
  onMouseDown: (e: React.MouseEvent) => void
}

/**
 * Configuration for drag behavior
 */
interface UseDragConfig {
  /** Called when drag completes with final position in pixels */
  onDragEnd?: (position: number) => void
  /** Called during drag with current position in pixels (throttled via RAF) */
  onDragMove?: (position: number) => void
  /** Reference to container element for boundary calculations */
  containerRef: React.RefObject<HTMLElement>
  /** Whether dragging is currently enabled */
  disabled?: boolean
}

/**
 * Custom hook for mouse-based dragging with cursor offset preservation
 *
 * Usage:
 * ```tsx
 * const { isDragging, dragPosition, dragOffset, onMouseDown } = useDrag({
 *   containerRef: timelineRef,
 *   onDragEnd: (position) => moveClip(position),
 *   onDragMove: (position) => updatePreview(position)
 * })
 * ```
 *
 * @param config - Drag configuration with callbacks and container reference
 * @returns Drag state and handlers
 */
export function useDrag(config: UseDragConfig): DragState & DragHandlers {
  const { onDragEnd, onDragMove, containerRef, disabled = false } = config

  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  // Store RAF ID for throttling move events
  const rafIdRef = useRef<number | null>(null)

  // Store initial mouse position for delta calculation
  const initialMouseRef = useRef<{ x: number; containerLeft: number } | null>(null)

  /**
   * Handle mouse down - start drag
   * Captures initial mouse position and offset within element
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !containerRef.current) return

      // Only start drag on left click
      if (e.button !== 0) return

      e.preventDefault()
      e.stopPropagation()

      const containerRect = containerRef.current.getBoundingClientRect()
      const elementRect = e.currentTarget.getBoundingClientRect()

      // Calculate offset: where within the element the user clicked
      const clickX = e.clientX - elementRect.left

      // Get current position of element relative to container
      // This preserves the exact current position - no jump!
      const currentLeft = elementRect.left - containerRect.left

      // Store initial state
      initialMouseRef.current = {
        x: e.clientX,
        containerLeft: containerRect.left
      }

      setDragOffset(clickX)
      setIsDragging(true)

      // Preserve exact visual position to prevent any jump during the timing gap
      // before first mousemove. This captures the DOM-rendered position which may
      // differ from calculated store position due to collision detection, rounding, etc.
      setDragPosition(currentLeft)
    },
    [disabled, containerRef]
  )

  /**
   * Global mouse move handler - update drag position
   * Throttled with requestAnimationFrame for smooth 60fps updates
   */
  useEffect(() => {
    if (!isDragging || !containerRef.current || !initialMouseRef.current) return

    function handleMouseMove(e: MouseEvent): void {
      if (!containerRef.current || !initialMouseRef.current) return

      // Throttle with RAF for performance
      if (rafIdRef.current !== null) return

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null

        if (!containerRef.current || !initialMouseRef.current) return

        const containerRect = containerRef.current.getBoundingClientRect()
        const mouseX = e.clientX

        // Calculate position: mouse position relative to container, minus offset
        const position = mouseX - containerRect.left - dragOffset

        // Clamp to container bounds (minimum 0)
        const clampedPosition = Math.max(0, position)

        setDragPosition(clampedPosition)

        // Call move callback for real-time preview
        if (onDragMove) {
          onDragMove(clampedPosition)
        }
      })
    }

    /**
     * Global mouse up handler - end drag
     */
    function handleMouseUp(): void {
      // Cancel any pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      if (dragPosition !== null && onDragEnd) {
        onDragEnd(dragPosition)
      }

      // Reset state
      setIsDragging(false)
      setDragPosition(null)
      initialMouseRef.current = null
    }

    // Attach global listeners
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)

      // Cleanup RAF on unmount
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [isDragging, dragOffset, dragPosition, onDragEnd, onDragMove, containerRef])

  return {
    isDragging,
    dragPosition,
    dragOffset,
    onMouseDown: handleMouseDown
  }
}
