/**
 * TimelineClip Component Tests
 * Tests for timeline clip display and positioning
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineClip } from '../TimelineClip'
import type { Clip } from '../timeline.types'

describe('TimelineClip', () => {
  const mockClip: Clip = {
    id: 'clip-123',
    sourceFile: '/test/videos/sample-video.mp4',
              intermediatePath: '/cache/sample-intermediate.mov',
              startTime: 0,
    duration: 30,
    trimIn: 0,
    trimOut: 0, // Trim offset from end (0 = no trim)
    trackId: 1
  }

  const mockOnClick = vi.fn()

  it('renders with correct positioning based on startTime and zoom (AC: #3)', () => {
    const zoomLevel = 50 // 50px per second
    const { container } = render(
      <TimelineClip clip={mockClip} zoomLevel={zoomLevel} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    expect(clipDiv.style.left).toBe('500px') // 10s * 50px/s
    expect(clipDiv.style.width).toBe('1500px') // 30s * 50px/s
  })

  it('displays formatted duration (AC: #4)', () => {
    render(<TimelineClip clip={mockClip} zoomLevel={50} onClick={mockOnClick} />)

    expect(screen.getByText('00:30')).toBeInTheDocument()
  })

  it('displays filename from sourceFile path (AC: #3)', () => {
    render(<TimelineClip clip={mockClip} zoomLevel={50} onClick={mockOnClick} />)

    expect(screen.getByText('sample-video.mp4')).toBeInTheDocument()
  })

  it('applies selection highlight when selected', () => {
    const { container } = render(
      <TimelineClip clip={mockClip} zoomLevel={50} isSelected={true} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    expect(clipDiv.className).toContain('border-cyan-500')
    expect(clipDiv.className).toContain('border-2')
  })

  it('does not apply selection highlight when not selected', () => {
    const { container } = render(
      <TimelineClip clip={mockClip} zoomLevel={50} isSelected={false} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    expect(clipDiv.className).not.toContain('border-cyan-500')
    expect(clipDiv.className).not.toContain('border-2')
  })

  it('calls onClick when clicked', () => {
    const { container } = render(
      <TimelineClip clip={mockClip} zoomLevel={50} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    fireEvent.click(clipDiv)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('adjusts width based on different zoom levels (AC: #6)', () => {
    const { container: container1 } = render(
      <TimelineClip clip={mockClip} zoomLevel={100} onClick={mockOnClick} />
    )
    const { container: container2 } = render(
      <TimelineClip clip={mockClip} zoomLevel={25} onClick={mockOnClick} />
    )

    const clip1 = container1.firstChild as HTMLElement
    const clip2 = container2.firstChild as HTMLElement

    expect(clip1.style.width).toBe('3000px') // 30s * 100px/s
    expect(clip2.style.width).toBe('750px') // 30s * 25px/s
  })

  it('has hover effect styling', () => {
    const { container } = render(
      <TimelineClip clip={mockClip} zoomLevel={50} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    expect(clipDiv.className).toContain('hover:border-zinc-500')
  })

  it('is keyboard accessible with role and tabIndex', () => {
    const { container } = render(
      <TimelineClip clip={mockClip} zoomLevel={50} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    expect(clipDiv.getAttribute('role')).toBe('button')
    expect(clipDiv.getAttribute('tabIndex')).toBe('0')
  })

  it('has appropriate aria-label for accessibility', () => {
    const { container } = render(
      <TimelineClip clip={mockClip} zoomLevel={50} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    const ariaLabel = clipDiv.getAttribute('aria-label')
    expect(ariaLabel).toContain('Clip at 00:10')
    expect(ariaLabel).toContain('duration 00:30')
  })

  it('positions correctly at timeline start (position 0)', () => {
    const clipAtStart: Clip = { ...mockClip, startTime: 0 }
    const { container } = render(
      <TimelineClip clip={clipAtStart} zoomLevel={50} onClick={mockOnClick} />
    )

    const clipDiv = container.firstChild as HTMLElement
    expect(clipDiv.style.left).toBe('0px')
  })
})
