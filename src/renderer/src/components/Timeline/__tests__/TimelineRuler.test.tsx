/**
 * TimelineRuler Component Tests
 * Tests for timeline ruler with time markers
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineRuler } from '../TimelineRuler'

describe('TimelineRuler', () => {
  it('renders time markers at regular intervals (AC: #4)', () => {
    render(<TimelineRuler totalDuration={60} zoomLevel={50} containerWidth={3000} />)

    // With 50px/s zoom and 60s duration, should show markers at 0:00, 0:10, 0:20, etc.
    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(screen.getByText('00:10')).toBeInTheDocument()
    expect(screen.getByText('00:20')).toBeInTheDocument()
  })

  it('positions markers correctly based on zoom level (AC: #4)', () => {
    const { container } = render(
      <TimelineRuler totalDuration={60} zoomLevel={50} containerWidth={3000} />
    )

    const markers = container.querySelectorAll('[style*="left"]')
    expect(markers.length).toBeGreaterThan(0)

    // First marker should be at position 0
    const firstMarker = markers[0] as HTMLElement
    expect(firstMarker.style.left).toBe('0px')
  })

  it('adjusts marker interval based on zoom level', () => {
    // At high zoom (100px/s), markers should be closer together
    const { container: highZoom } = render(
      <TimelineRuler totalDuration={60} zoomLevel={100} containerWidth={6000} />
    )

    // At low zoom (10px/s), markers should be farther apart
    const { container: lowZoom } = render(
      <TimelineRuler totalDuration={60} zoomLevel={10} containerWidth={600} />
    )

    const highZoomMarkers = highZoom.querySelectorAll('[style*="left"]')
    const lowZoomMarkers = lowZoom.querySelectorAll('[style*="left"]')

    // High zoom should have more markers for same duration
    expect(highZoomMarkers.length).toBeGreaterThan(lowZoomMarkers.length)
  })

  it('displays markers up to total duration', () => {
    render(<TimelineRuler totalDuration={45} zoomLevel={50} containerWidth={2250} />)

    // Should show markers covering the duration
    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(screen.getByText('00:10')).toBeInTheDocument()
    expect(screen.getByText('00:20')).toBeInTheDocument()
    expect(screen.getByText('00:30')).toBeInTheDocument()
    expect(screen.getByText('00:40')).toBeInTheDocument()
  })

  it('uses monospace font for time labels (AC: #4)', () => {
    const { container } = render(
      <TimelineRuler totalDuration={60} zoomLevel={50} containerWidth={3000} />
    )

    const timeLabels = container.querySelectorAll('.font-mono')
    expect(timeLabels.length).toBeGreaterThan(0)
  })

  it('renders with dark background and border', () => {
    const { container } = render(
      <TimelineRuler totalDuration={60} zoomLevel={50} containerWidth={3000} />
    )

    const rulerDiv = container.firstChild as HTMLElement
    expect(rulerDiv.className).toContain('bg-zinc-900')
    expect(rulerDiv.className).toContain('border-b')
    expect(rulerDiv.className).toContain('border-zinc-700')
  })

  it('handles very short durations', () => {
    render(<TimelineRuler totalDuration={5} zoomLevel={50} containerWidth={250} />)

    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('handles very long durations', () => {
    render(<TimelineRuler totalDuration={600} zoomLevel={10} containerWidth={6000} />)

    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(screen.getByText('05:00')).toBeInTheDocument() // 5 minutes
    expect(screen.getByText('10:00')).toBeInTheDocument() // 10 minutes
  })
})
