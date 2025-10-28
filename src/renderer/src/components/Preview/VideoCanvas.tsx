/**
 * VideoCanvas Component
 *
 * Composites multiple video tracks into a single canvas for preview playback.
 * Implements Adobe Premiere Pro style picture-in-picture overlay rendering.
 *
 * Architecture:
 * - Track 1 (main): Rendered full-screen
 * - Track 2 (overlay): Rendered as PiP in corner at 25% size
 * - 30fps rendering loop via requestAnimationFrame (NFR003)
 */

import { useEffect, useRef } from 'react'

export interface VideoCanvasProps {
  /** Track 1 video element (main track, full-screen) */
  mainTrackVideo: HTMLVideoElement | null
  /** Track 2 video element (overlay track, PiP) */
  overlayTrackVideo: HTMLVideoElement | null
  /** PiP position in corner */
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** PiP size as percentage of canvas width (default: 25) */
  pipSize?: number
  /** Canvas width in pixels */
  width: number
  /** Canvas height in pixels */
  height: number
}

/**
 * Composites video tracks onto canvas
 *
 * Rendering pipeline:
 * 1. Clear canvas
 * 2. Draw Track 1 (main) full-screen if available
 * 3. Draw Track 2 (overlay) as PiP if available
 * 4. Repeat at 30fps via requestAnimationFrame
 *
 * Performance targets (NFR003):
 * - 30fps minimum (33ms per frame)
 * - Graceful fallback if compositing fails (show Track 1 only)
 */
export function VideoCanvas({
  mainTrackVideo,
  overlayTrackVideo,
  pipPosition = 'bottom-right',
  pipSize = 25,
  width,
  height
}: VideoCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  /**
   * Composite frame: Draw main track + overlay PiP
   * Called by requestAnimationFrame loop
   */
  function compositeFrame(): void {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    try {
      // Draw Track 1 (main) full-screen
      if (mainTrackVideo && mainTrackVideo.readyState >= 2) {
        ctx.drawImage(mainTrackVideo, 0, 0, width, height)
      }

      // Draw Track 2 (overlay) as PiP
      if (overlayTrackVideo && overlayTrackVideo.readyState >= 2) {
        const pipWidth = (width * pipSize) / 100
        const pipHeight = (pipWidth * overlayTrackVideo.videoHeight) / overlayTrackVideo.videoWidth
        const padding = 10 // 10px padding from edges

        // Calculate PiP position
        let pipX = 0
        let pipY = 0
        switch (pipPosition) {
          case 'top-left':
            pipX = padding
            pipY = padding
            break
          case 'top-right':
            pipX = width - pipWidth - padding
            pipY = padding
            break
          case 'bottom-left':
            pipX = padding
            pipY = height - pipHeight - padding
            break
          case 'bottom-right':
          default:
            pipX = width - pipWidth - padding
            pipY = height - pipHeight - padding
            break
        }

        // Draw PiP with border
        ctx.save()
        ctx.strokeStyle = '#a855f7' // Purple border (matches Track 2 color)
        ctx.lineWidth = 3
        ctx.strokeRect(pipX - 2, pipY - 2, pipWidth + 4, pipHeight + 4)
        ctx.drawImage(overlayTrackVideo, pipX, pipY, pipWidth, pipHeight)
        ctx.restore()
      }
    } catch (error) {
      // Graceful fallback: Continue rendering next frame (NFR002)
      console.warn('[VideoCanvas] Frame composite error:', error)
    }

    // Schedule next frame (30fps = ~33ms)
    animationFrameRef.current = requestAnimationFrame(compositeFrame)
  }

  /**
   * Start/stop rendering loop based on video availability
   */
  useEffect(() => {
    // Start rendering loop
    compositeFrame()

    // Cleanup: stop rendering loop on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [mainTrackVideo, overlayTrackVideo, width, height, pipPosition, pipSize])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full object-contain bg-black"
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}
