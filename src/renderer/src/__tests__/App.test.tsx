/**
 * Tests for App component
 * Validates "Hello Chop Shop" rendering and IPC communication
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Hello Chop Shop" heading', () => {
    render(<App />)
    expect(screen.getByText('Hello Chop Shop')).toBeInTheDocument()
  })

  it('displays Electron logo', () => {
    render(<App />)
    const logo = screen.getByAltText('Electron logo')
    expect(logo).toBeInTheDocument()
  })

  it('shows IPC test button', () => {
    render(<App />)
    expect(screen.getByText('Test IPC (Ping)')).toBeInTheDocument()
  })

  it('successfully handles IPC ping response', async () => {
    const user = userEvent.setup()
    const mockPing = vi.fn().mockResolvedValue({
      success: true,
      data: 'pong'
    })
    window.api.ping = mockPing

    render(<App />)

    const button = screen.getByText('Test IPC (Ping)')
    await user.click(button)

    await waitFor(() => {
      expect(mockPing).toHaveBeenCalledOnce()
      expect(screen.getByText(/IPC Success: Received "pong"/)).toBeInTheDocument()
    })
  })

  it('displays error message when IPC fails', async () => {
    const user = userEvent.setup()
    const mockPing = vi.fn().mockResolvedValue({
      success: false,
      error: 'Connection failed'
    })
    window.api.ping = mockPing

    render(<App />)

    const button = screen.getByText('Test IPC (Ping)')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText(/Error: Connection failed/)).toBeInTheDocument()
    })
  })

  it('handles IPC exception gracefully', async () => {
    const user = userEvent.setup()
    const mockPing = vi.fn().mockRejectedValue(new Error('Network error'))
    window.api.ping = mockPing

    render(<App />)

    const button = screen.getByText('Test IPC (Ping)')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument()
    })
  })
})
