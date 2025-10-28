/**
 * TopBar Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from '../TopBar'

// Mock window.api for export functionality
Object.defineProperty(window, 'api', {
  writable: true,
  value: {
    onExportProgress: vi.fn(() => () => {}), // Return cleanup function
    onExportComplete: vi.fn(() => () => {}),
    onExportError: vi.fn(() => () => {})
  }
})

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('renders app title', () => {
    render(<TopBar />)
    expect(screen.getByText('chop shop')).toBeInTheDocument()
  })

  it('renders Export button', () => {
    render(<TopBar />)
    const exportButton = screen.getByRole('button', { name: /export/i })
    expect(exportButton).toBeInTheDocument()
  })

  it('Export button is disabled when no clips', () => {
    render(<TopBar />)
    const exportButton = screen.getByRole('button', { name: /export/i })
    expect(exportButton).toBeDisabled()
  })

  it('applies correct styling', () => {
    const { container } = render(<TopBar />)
    const topBar = container.firstChild as HTMLElement
    expect(topBar).toHaveClass('border-b')
  })
})
