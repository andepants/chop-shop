/**
 * Sidebar Component Tests
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

// Mock window.api to prevent errors
vi.stubGlobal('api', {
  openFileDialog: vi.fn(),
  importFile: vi.fn()
})

describe('Sidebar', () => {
  it('renders Media heading', () => {
    render(<Sidebar />)
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('renders ImportZone component', () => {
    render(<Sidebar />)
    expect(screen.getByText(/Drag video files here/i)).toBeInTheDocument()
  })

  it('renders Import button', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<Sidebar />)
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-[280px]')
    expect(sidebar).toHaveClass('bg-zinc-800')
  })
})
