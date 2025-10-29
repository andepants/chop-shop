/**
 * TranscriptionPanel Integration Tests
 *
 * Tests for complete transcription flow including IPC, progress, and state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TranscriptionPanel } from '../TranscriptionPanel'
import { useAIStore } from '../../../store/aiStore'
import { useTimelineStore } from '../../../store/timelineStore'

// Mock stores
vi.mock('../../../store/aiStore')
vi.mock('../../../store/timelineStore')

describe('TranscriptionPanel Integration Tests', () => {
  let mockSetTranscription: any
  let mockSetTranscriptionStatus: any
  let mockSetTranscriptionProgress: any
  let mockSetTranscriptionError: any
  let mockTranscribeAudio: any
  let mockOnTranscriptionProgress: any
  let progressCallback: any

  beforeEach(() => {
    mockSetTranscription = vi.fn()
    mockSetTranscriptionStatus = vi.fn()
    mockSetTranscriptionProgress = vi.fn()
    mockSetTranscriptionError = vi.fn()
    mockTranscribeAudio = vi.fn()
    mockOnTranscriptionProgress = vi.fn((callback) => {
      progressCallback = callback
      return vi.fn() // unsubscribe function
    })

    // Setup window.api mock
    global.window = {
      api: {
        transcribeAudio: mockTranscribeAudio,
        onTranscriptionProgress: mockOnTranscriptionProgress
      }
    } as any

    // Default store setup
    vi.mocked(useAIStore).mockReturnValue({
      transcriptionStatus: 'idle',
      transcriptionProgress: null,
      transcriptionText: '',
      userGuidance: '',
      includeTranscription: true,
      transcriptionError: null,
      setTranscription: mockSetTranscription,
      setTranscriptionStatus: mockSetTranscriptionStatus,
      setTranscriptionProgress: mockSetTranscriptionProgress,
      setTranscriptionError: mockSetTranscriptionError,
      setTranscriptionText: vi.fn(),
      setUserGuidance: vi.fn(),
      setIncludeTranscription: vi.fn(),
      clearTranscription: vi.fn()
    } as any)

    vi.mocked(useTimelineStore).mockReturnValue({
      clips: [{ id: '1', file: 'test.mp4' }]
    } as any)
  })

  describe('Complete transcription flow', () => {
    it('should handle complete flow: button → IPC → progress → result → display', async () => {
      // Mock successful transcription
      mockTranscribeAudio.mockResolvedValue({
        success: true,
        data: {
          text: 'This is a complete transcription of the video.',
          duration: 120,
          warning: null
        }
      })

      render(<TranscriptionPanel />)

      // Click transcribe button
      const button = screen.getByRole('button', { name: /transcribe audio/i })
      fireEvent.click(button)

      // Should set status to extracting
      await waitFor(() => {
        expect(mockSetTranscriptionStatus).toHaveBeenCalledWith('extracting')
      })

      // Should clear previous errors
      expect(mockSetTranscriptionError).toHaveBeenCalledWith(null)

      // Should call IPC
      expect(mockTranscribeAudio).toHaveBeenCalled()

      // Should set transcription result
      await waitFor(() => {
        expect(mockSetTranscription).toHaveBeenCalledWith(
          'This is a complete transcription of the video.',
          120,
          null
        )
      })
    })

    it('should update progress during transcription', async () => {
      mockTranscribeAudio.mockResolvedValue({
        success: true,
        data: { text: 'Test', duration: 60 }
      })

      render(<TranscriptionPanel />)

      // Verify progress listener was registered
      expect(mockOnTranscriptionProgress).toHaveBeenCalled()

      // Simulate progress updates
      progressCallback({ percentage: 25, message: 'Extracting audio...' })
      expect(mockSetTranscriptionProgress).toHaveBeenCalledWith({
        percentage: 25,
        message: 'Extracting audio...'
      })

      progressCallback({ percentage: 75, message: 'Transcribing...' })
      expect(mockSetTranscriptionProgress).toHaveBeenCalledWith({
        percentage: 75,
        message: 'Transcribing...'
      })
    })
  })

  describe('Error handling', () => {
    it('should handle IPC failure gracefully', async () => {
      mockTranscribeAudio.mockResolvedValue({
        success: false,
        error: 'OpenAI API key is invalid'
      })

      render(<TranscriptionPanel />)

      const button = screen.getByRole('button', { name: /transcribe audio/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSetTranscriptionError).toHaveBeenCalledWith('OpenAI API key is invalid')
      })
    })

    it('should handle IPC exception', async () => {
      mockTranscribeAudio.mockRejectedValue(new Error('Network error'))

      render(<TranscriptionPanel />)

      const button = screen.getByRole('button', { name: /transcribe audio/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSetTranscriptionError).toHaveBeenCalledWith('Network error')
      })
    })

    it('should handle missing response data', async () => {
      mockTranscribeAudio.mockResolvedValue({
        success: false,
        error: null
      })

      render(<TranscriptionPanel />)

      const button = screen.getByRole('button', { name: /transcribe audio/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSetTranscriptionError).toHaveBeenCalledWith(
          'Transcription failed. Please check your API key and try again.'
        )
      })
    })
  })

  describe('Validation logic', () => {
    it('should validate empty fields', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'idle',
        transcriptionProgress: null,
        transcriptionText: '',
        userGuidance: '',
        includeTranscription: true,
        transcriptionError: null,
        setTranscription: vi.fn(),
        setTranscriptionStatus: vi.fn(),
        setTranscriptionProgress: vi.fn(),
        setTranscriptionError: vi.fn(),
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      render(<TranscriptionPanel />)

      // Both fields empty - should not show validation error initially
      expect(screen.queryByText(/please provide either a transcription or additional guidance/i)).not.toBeInTheDocument()
    })

    it('should validate with transcription only', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'complete',
        transcriptionProgress: null,
        transcriptionText: 'Test transcription',
        userGuidance: '',
        includeTranscription: true,
        transcriptionError: null,
        setTranscription: vi.fn(),
        setTranscriptionStatus: vi.fn(),
        setTranscriptionProgress: vi.fn(),
        setTranscriptionError: vi.fn(),
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      render(<TranscriptionPanel />)

      // Should not show validation error
      expect(screen.queryByText(/please provide either/i)).not.toBeInTheDocument()
    })

    it('should validate with user guidance only', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'idle',
        transcriptionProgress: null,
        transcriptionText: '',
        userGuidance: 'Test guidance',
        includeTranscription: false,
        transcriptionError: null,
        setTranscription: vi.fn(),
        setTranscriptionStatus: vi.fn(),
        setTranscriptionProgress: vi.fn(),
        setTranscriptionError: vi.fn(),
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      render(<TranscriptionPanel />)

      // Should not show validation error
      expect(screen.queryByText(/please provide either/i)).not.toBeInTheDocument()
    })
  })

  describe('State persistence', () => {
    it('should persist state across component re-renders', () => {
      const { rerender } = render(<TranscriptionPanel />)

      // Update store to simulate transcription completion
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'complete',
        transcriptionProgress: null,
        transcriptionText: 'Persisted transcription',
        userGuidance: 'Persisted guidance',
        includeTranscription: false,
        transcriptionError: null,
        setTranscription: vi.fn(),
        setTranscriptionStatus: vi.fn(),
        setTranscriptionProgress: vi.fn(),
        setTranscriptionError: vi.fn(),
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      rerender(<TranscriptionPanel />)

      // Verify state persists
      const transcriptionTextarea = screen.getByPlaceholderText(/transcription will appear here/i)
      const guidanceTextarea = screen.getByPlaceholderText(/add any additional context/i)
      const checkbox = screen.getByRole('checkbox')

      expect(transcriptionTextarea).toHaveValue('Persisted transcription')
      expect(guidanceTextarea).toHaveValue('Persisted guidance')
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('Timeline validation integration', () => {
    it('should prevent transcription when no clips on timeline', () => {
      vi.mocked(useTimelineStore).mockReturnValue({
        clips: []
      } as any)

      render(<TranscriptionPanel />)

      const button = screen.getByRole('button', { name: /transcribe audio/i })
      expect(button).toBeDisabled()
    })

    it('should allow transcription when clips exist', () => {
      vi.mocked(useTimelineStore).mockReturnValue({
        clips: [
          { id: '1', file: 'video1.mp4' },
          { id: '2', file: 'video2.mp4' }
        ]
      } as any)

      render(<TranscriptionPanel />)

      const button = screen.getByRole('button', { name: /transcribe audio/i })
      expect(button).not.toBeDisabled()
    })
  })

  describe('Clear functionality integration', () => {
    it('should clear transcription and guidance on confirm', async () => {
      const mockClearTranscription = vi.fn()
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'complete',
        transcriptionProgress: null,
        transcriptionText: 'Test transcription',
        userGuidance: 'Test guidance',
        includeTranscription: true,
        transcriptionError: null,
        setTranscription: vi.fn(),
        setTranscriptionStatus: vi.fn(),
        setTranscriptionProgress: vi.fn(),
        setTranscriptionError: vi.fn(),
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: mockClearTranscription
      } as any)

      render(<TranscriptionPanel />)

      // Click clear button
      const clearButton = screen.getByRole('button', { name: /clear transcription/i })
      fireEvent.click(clearButton)

      // Confirm dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/this will clear both the transcription and additional guidance/i)).toBeInTheDocument()
      })

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /clear/i })
      fireEvent.click(confirmButton)

      // Should call clearTranscription
      expect(mockClearTranscription).toHaveBeenCalled()
    })
  })
})
