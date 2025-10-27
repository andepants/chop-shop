/**
 * Sidebar Component Tests
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

describe('Sidebar', () => {
  it('renders Media Library heading', () => {
    render(<Sidebar />)
    expect(screen.getByText('Media Library')).toBeInTheDocument()
  })

  it('renders placeholder text', () => {
    render(<Sidebar />)
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<Sidebar />)
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-[280px]')
    expect(sidebar).toHaveClass('bg-zinc-800')
  })
})
