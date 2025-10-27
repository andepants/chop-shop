/**
 * EmptyState Component Tests
 * Tests for empty media library placeholder
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  it('renders empty state message (AC: #1)', () => {
    render(<EmptyState />)

    expect(
      screen.getByText(/No media imported yet. Drag files or click Import to begin./i)
    ).toBeInTheDocument()
  })

  it('applies centered layout styles (AC: #1)', () => {
    const { container } = render(<EmptyState />)
    const emptyDiv = container.firstChild as HTMLElement

    expect(emptyDiv.className).toContain('flex')
    expect(emptyDiv.className).toContain('items-center')
    expect(emptyDiv.className).toContain('justify-center')
  })

  it('applies muted text color (AC: #1)', () => {
    render(<EmptyState />)

    const messageElement = screen.getByText(
      /No media imported yet. Drag files or click Import to begin./i
    )
    expect(messageElement.className).toContain('text-zinc-500')
  })
})
