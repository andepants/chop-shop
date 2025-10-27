/**
 * Tests for App component
 * Validates MainLayout rendering with 3-panel structure
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
  it('renders the main layout', () => {
    render(<App />)
    // Should render MainLayout with all its components
    expect(screen.getByText('Chop Shop')).toBeInTheDocument()
  })

  it('renders TopBar with title', () => {
    render(<App />)
    expect(screen.getByText('Chop Shop')).toBeInTheDocument()
  })

  it('renders Sidebar with Media', () => {
    render(<App />)
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('renders Preview area', () => {
    render(<App />)
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('renders Timeline area', () => {
    render(<App />)
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('renders Export button', () => {
    render(<App />)
    const exportButton = screen.getByRole('button', { name: /export/i })
    expect(exportButton).toBeInTheDocument()
    expect(exportButton).toBeDisabled()
  })
})
