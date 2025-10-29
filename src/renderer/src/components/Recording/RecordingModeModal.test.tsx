/**
 * RecordingModeModal Component Tests
 * Tests recording mode selection modal functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecordingModeModal } from './RecordingModeModal'
import { useUIStore } from '../../store/uiStore'
import { useRecordingStore } from '../../store/recordingStore'

// Mock stores
vi.mock('../../store/uiStore')
vi.mock('../../store/recordingStore')

// Mock window.api
const mockStartRecording = vi.fn()
global.window.api = {
  startRecording: mockStartRecording
} as any

describe('RecordingModeModal', () => {
  const mockCloseModal = vi.fn()
  const mockStartRecordingAction = vi.fn()
  const mockShowError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default store mocks
    vi.mocked(useUIStore).mockImplementation((selector: any) => {
      const state = {
        recordingModal: { isModalOpen: true },
        closeRecordingModal: mockCloseModal,
        showError: mockShowError
      }
      return selector(state)
    })

    vi.mocked(useRecordingStore).mockImplementation((selector: any) => {
      const state = {
        startRecording: mockStartRecordingAction
      }
      return selector(state)
    })

    mockStartRecordingAction.mockResolvedValue(undefined)
  })

  it('should render modal when open', () => {
    render(<RecordingModeModal />)

    expect(screen.getByText('Choose Recording Mode')).toBeInTheDocument()
    expect(screen.getByText('Select how you want to record your content')).toBeInTheDocument()
  })

  it('should render all 3 mode buttons', () => {
    render(<RecordingModeModal />)

    expect(screen.getByText('Screen Only')).toBeInTheDocument()
    expect(screen.getByText('Webcam Only')).toBeInTheDocument()
    expect(screen.getByText('Screen + Webcam (PiP)')).toBeInTheDocument()
  })

  it('should highlight PiP mode as recommended', () => {
    render(<RecordingModeModal />)

    const recommendedBadge = screen.getByText('Recommended')
    expect(recommendedBadge).toBeInTheDocument()

    // Verify it's associated with PiP button
    const pipButton = screen.getByText('Screen + Webcam (PiP)').closest('button')
    expect(pipButton).toContainElement(recommendedBadge)
  })

  it('should call startRecording with "screen" mode when Screen Only clicked', async () => {
    render(<RecordingModeModal />)

    const screenButton = screen.getByText('Screen Only')
    fireEvent.click(screenButton)

    await waitFor(() => {
      expect(mockStartRecordingAction).toHaveBeenCalledWith('screen')
    })
  })

  it('should call startRecording with "webcam" mode when Webcam Only clicked', async () => {
    render(<RecordingModeModal />)

    const webcamButton = screen.getByText('Webcam Only')
    fireEvent.click(webcamButton)

    await waitFor(() => {
      expect(mockStartRecordingAction).toHaveBeenCalledWith('webcam')
    })
  })

  it('should call startRecording with "pip" mode when PiP clicked', async () => {
    render(<RecordingModeModal />)

    const pipButton = screen.getByText('Screen + Webcam (PiP)')
    fireEvent.click(pipButton)

    await waitFor(() => {
      expect(mockStartRecordingAction).toHaveBeenCalledWith('pip')
    })
  })

  it('should close modal after successful mode selection', async () => {
    render(<RecordingModeModal />)

    const screenButton = screen.getByText('Screen Only')
    fireEvent.click(screenButton)

    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled()
    })
  })

  it('should show error if recording start fails', async () => {
    const error = new Error('Recording failed')
    mockStartRecordingAction.mockRejectedValue(error)

    render(<RecordingModeModal />)

    const screenButton = screen.getByText('Screen Only')
    fireEvent.click(screenButton)

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to start recording: Recording failed',
        'Recording Error'
      )
    })
  })

  it('should close modal when cancel button clicked', () => {
    render(<RecordingModeModal />)

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockCloseModal).toHaveBeenCalled()
    expect(mockStartRecordingAction).not.toHaveBeenCalled()
  })

  it('should not render when modal is closed', () => {
    vi.mocked(useUIStore).mockImplementation((selector: any) => {
      const state = {
        recordingModal: { isModalOpen: false },
        closeRecordingModal: mockCloseModal,
        showError: mockShowError
      }
      return selector(state)
    })

    const { container } = render(<RecordingModeModal />)

    // Dialog should not be visible when isOpen is false
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })
})
