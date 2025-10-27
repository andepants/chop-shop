/**
 * Playhead Component Tests
 * Tests for timeline playhead indicator
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Playhead } from '../Playhead'

describe('Playhead', () => {
  it('renders at initial position 0:00 (AC: #7)', () => {
    const { container } = render(<Playhead position={0} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    expect(playheadDiv.style.transform).toBe('translateX(0px)')
  })

  it('positions correctly based on playhead position and zoom', () => {
    const { container } = render(<Playhead position={10} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    expect(playheadDiv.style.transform).toBe('translateX(500px)') // 10s * 50px/s
  })

  it('updates position when zoom level changes', () => {
    const { container: container1 } = render(<Playhead position={10} zoomLevel={50} />)
    const { container: container2 } = render(<Playhead position={10} zoomLevel={100} />)

    const playhead1 = container1.firstChild as HTMLElement
    const playhead2 = container2.firstChild as HTMLElement

    expect(playhead1.style.transform).toBe('translateX(500px)') // 10s * 50px/s
    expect(playhead2.style.transform).toBe('translateX(1000px)') // 10s * 100px/s
  })

  it('uses cyan color for visibility (AC: #7)', () => {
    const { container } = render(<Playhead position={0} zoomLevel={50} />)

    // Check for cyan vertical line
    const verticalLine = container.querySelector('.bg-cyan-500')
    expect(verticalLine).toBeInTheDocument()
  })

  it('has triangle indicator at top for visibility', () => {
    const { container } = render(<Playhead position={0} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    // Triangle is created using inline styles with border properties
    const triangles = playheadDiv.querySelectorAll('div')
    const hasTriangle = Array.from(triangles).some(
      (div) => div.style.borderLeft && div.style.borderRight && div.style.borderTop
    )
    expect(hasTriangle).toBe(true)
  })

  it('is non-interactive (pointer-events-none)', () => {
    const { container } = render(<Playhead position={0} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    expect(playheadDiv.className).toContain('pointer-events-none')
  })

  it('spans full timeline height', () => {
    const { container } = render(<Playhead position={0} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    expect(playheadDiv.className).toContain('top-0')
    expect(playheadDiv.className).toContain('bottom-0')
  })

  it('has higher z-index to appear above clips', () => {
    const { container } = render(<Playhead position={0} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    expect(playheadDiv.className).toContain('z-10')
  })

  it('has aria-label for accessibility', () => {
    const { container } = render(<Playhead position={15.5} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    const ariaLabel = playheadDiv.getAttribute('aria-label')
    expect(ariaLabel).toContain('15.50 seconds')
  })

  it('handles fractional second positions', () => {
    const { container } = render(<Playhead position={12.75} zoomLevel={50} />)

    const playheadDiv = container.firstChild as HTMLElement
    expect(playheadDiv.style.transform).toBe('translateX(637.5px)') // 12.75 * 50
  })
})
