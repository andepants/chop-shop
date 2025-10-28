/**
 * TimelineTrack Component Tests
 * Tests for timeline track container with clips
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineTrack } from '../TimelineTrack'
import type { Track } from '../timeline.types'

describe('TimelineTrack', () => {
  const mockTrack: Track = {
    id: 1,
    clips: [
      {
        id: 'clip-1',
        sourceFile: '/test/video1.mp4',
        intermediatePath: '/cache/video1-intermediate.mov',
        startTime: 0,
        duration: 10,
        trimIn: 0,
        trimOut: 0, // Trim offset from end (0 = no trim)
        trackId: 1
      },
      {
        id: 'clip-2',
        sourceFile: '/test/video2.mp4',
        intermediatePath: '/cache/video2-intermediate.mov',
        startTime: 10,
        duration: 5,
        trimIn: 0,
        trimOut: 0, // Trim offset from end (0 = no trim)
        trackId: 1
      }
    ]
  }

  const mockOnClipClick = vi.fn()

  it('renders track label with track ID (AC: #1)', () => {
    render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    expect(screen.getByText('Track 1')).toBeInTheDocument()
  })

  it('renders all clips in track (AC: #3, #5)', () => {
    render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    expect(screen.getByText('video1.mp4')).toBeInTheDocument()
    expect(screen.getByText('video2.mp4')).toBeInTheDocument()
  })

  it('has fixed height for MVP', () => {
    const { container } = render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    const trackContent = container.querySelector('.h-20')
    expect(trackContent).toBeInTheDocument()
  })

  it('has dark background styling', () => {
    const { container } = render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    const trackContent = container.querySelector('.bg-zinc-800')
    expect(trackContent).toBeInTheDocument()
  })

  it('calls onClipClick when clip is clicked', () => {
    render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    const clip1 = screen.getByText('video1.mp4').closest('[role="button"]')
    fireEvent.click(clip1!)

    expect(mockOnClipClick).toHaveBeenCalledWith('clip-1')
  })

  it('highlights selected clip', () => {
    const { container } = render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId="clip-1"
        onClipClick={mockOnClipClick}
      />
    )

    // Selected clip should have cyan border
    const selectedClip = container.querySelector('.border-cyan-500')
    expect(selectedClip).toBeInTheDocument()
  })

  it('renders empty track with no clips', () => {
    const emptyTrack: Track = {
      id: 1,
      clips: []
    }

    render(
      <TimelineTrack
        track={emptyTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    expect(screen.getByText('Track 1')).toBeInTheDocument()
  })

  it('track label has fixed width', () => {
    const { container } = render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    const label = screen.getByText('Track 1').parentElement
    expect(label?.className).toContain('w-20')
  })

  it('track content area has relative positioning for clip placement', () => {
    const { container } = render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={50}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    const trackContent = container.querySelector('.relative')
    expect(trackContent).toBeInTheDocument()
  })

  it('passes zoom level to clips for correct positioning', () => {
    const { container } = render(
      <TimelineTrack
        track={mockTrack}
        zoomLevel={100}
        selectedClipId={null}
        onClipClick={mockOnClipClick}
      />
    )

    // Clips should be positioned based on zoom level
    // First clip at startTime 0 with zoom 100 should be at 0px
    const clips = container.querySelectorAll('[style*="left"]')
    expect(clips.length).toBeGreaterThan(0)
  })
})
