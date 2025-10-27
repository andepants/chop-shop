/**
 * TopBar Component Tests
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from '../TopBar'

describe('TopBar', () => {
  it('renders app title', () => {
    render(<TopBar />)
    expect(screen.getByText('Chop Shop')).toBeInTheDocument()
  })

  it('renders Export button', () => {
    render(<TopBar />)
    const exportButton = screen.getByRole('button', { name: /export/i })
    expect(exportButton).toBeInTheDocument()
  })

  it('Export button is disabled', () => {
    render(<TopBar />)
    const exportButton = screen.getByRole('button', { name: /export/i })
    expect(exportButton).toBeDisabled()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<TopBar />)
    const topBar = container.firstChild as HTMLElement
    expect(topBar).toHaveClass('bg-zinc-900')
    expect(topBar).toHaveClass('border-b')
  })
})
