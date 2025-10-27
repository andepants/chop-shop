/**
 * MainLayout Component Tests
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MainLayout } from '../MainLayout'

describe('MainLayout', () => {
  it('renders all child components', () => {
    render(<MainLayout />)

    // TopBar should be rendered
    expect(screen.getByText('Chop Shop')).toBeInTheDocument()

    // Sidebar should be rendered
    expect(screen.getByText('Media Library')).toBeInTheDocument()

    // Preview area should be rendered
    expect(screen.getByText('Preview')).toBeInTheDocument()

    // Timeline area should be rendered
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('applies correct layout structure', () => {
    const { container } = render(<MainLayout />)
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('flex')
    expect(mainDiv).toHaveClass('flex-col')
    expect(mainDiv).toHaveClass('h-screen')
  })

  it('renders TopBar at the top', () => {
    render(<MainLayout />)
    const topBar = screen.getByText('Chop Shop').parentElement
    expect(topBar).toBeInTheDocument()
  })

  it('renders Sidebar on the left', () => {
    render(<MainLayout />)
    const sidebar = screen.getByText('Media Library').closest('aside')
    expect(sidebar).toBeInTheDocument()
    expect(sidebar).toHaveClass('w-[280px]')
  })
})
