/**
 * ErrorDialog Component Tests
 * Tests for error display functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorDialog } from '../ErrorDialog'
import { useUIStore } from '../../../store/uiStore'

describe('ErrorDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({ error: { isVisible: false, message: '', title: undefined } })
  })

  it('does not render when error is not visible', () => {
    const { container } = render(<ErrorDialog />)
    expect(container.firstChild).toBeNull()
  })

  it('displays error message when visible (AC: #5)', () => {
    const { showError } = useUIStore.getState()

    showError('Unable to import file.mp4. Supported formats: MP4, MOV, WebM', 'Unsupported Format')

    render(<ErrorDialog />)

    expect(screen.getByText('Unsupported Format')).toBeInTheDocument()
    expect(screen.getByText(/Unable to import file.mp4/i)).toBeInTheDocument()
  })

  it('shows supported formats in error message (AC: #5)', () => {
    const { showError } = useUIStore.getState()

    showError('Unable to import test.avi. Supported formats: MP4, MOV, WebM')

    render(<ErrorDialog />)

    expect(screen.getByText(/Supported formats: MP4, MOV, WebM/i)).toBeInTheDocument()
  })

  it('allows user to dismiss error', () => {
    const { showError } = useUIStore.getState()

    showError('Test error message')

    render(<ErrorDialog />)

    const dismissButton = screen.getByText('Dismiss')
    fireEvent.click(dismissButton)

    const state = useUIStore.getState()
    expect(state.error.isVisible).toBe(false)
  })

  it('uses default title when not provided', () => {
    const { showError } = useUIStore.getState()

    showError('Test error message')

    render(<ErrorDialog />)

    expect(screen.getByText('Error')).toBeInTheDocument()
  })
})
