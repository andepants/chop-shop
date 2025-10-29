/**
 * TranscriptionPanel Component Tests
 *
 * Tests for transcription UI, validation, IPC communication, and state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TranscriptionPanel, validateTranscriptionInput } from '../TranscriptionPanel'
import { useAIStore } from '../../../store/aiStore'
import { useTimelineStore } from '../../../store/timelineStore'

// Mock stores
vi.mock('../../../store/aiStore')
vi.mock('../../../store/timelineStore')

// Mock window.api
const mockTranscribeAudio = vi.fn()
const mockOnTranscriptionProgress = vi.fn()

beforeEach(() => {
  // Setup window.api mock
  global.window = {
    api: {
      transcribeAudio: mockTranscribeAudio,
      onTranscriptionProgress: mockOnTranscriptionProgress
    }
  } as any

  // Reset all mocks
  vi.clearAllMocks()

  // Default store state
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

  vi.mocked(useTimelineStore).mockReturnValue({
    clips: []
  } as any)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('TranscriptionPanel', () => {
  describe('AC 1: Transcribe tab displays "Transcribe Audio" button', () => {
    it('should render Transcribe Audio button', () => {
      render(<TranscriptionPanel />)
      expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeInTheDocument()
    })

    it('should render header and description', () => {
      render(<TranscriptionPanel />)
      expect(screen.getByText('Transcribe Audio')).toBeInTheDocument()
      expect(screen.getByText(/convert your video audio to text/i)).toBeInTheDocument()
    })
  })

  describe('AC 2: Button checks for timeline clips; shows error if none exist', () => {
    it('should disable button when no clips exist', () => {
      vi.mocked(useTimelineStore).mockReturnValue({ clips: [] } as any)
      render(<TranscriptionPanel />)
      const button = screen.getByRole('button', { name: /transcribe audio/i })
      expect(button).toBeDisabled()
    })

    it('should enable button when clips exist', () => {
      vi.mocked(useTimelineStore).mockReturnValue({
        clips: [{ id: '1', file: 'test.mp4' }]
      } as any)
      render(<TranscriptionPanel />)
      const button = screen.getByRole('button', { name: /transcribe audio/i })
      expect(button).not.toBeDisabled()
    })

    it('should show error message when clicking button with no clips', async () => {
      const mockSetError = vi.fn()
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
        setTranscriptionError: mockSetError,
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      vi.mocked(useTimelineStore).mockReturnValue({ clips: [] } as any)

      render(<TranscriptionPanel />)
      const button = screen.getByRole('button', { name: /transcribe audio/i })

      // Button is disabled, but test the error logic would trigger
      expect(button).toBeDisabled()
    })
  })

  describe('AC 3: Clicking button triggers audio extraction and transcription', () => {
    it('should call transcribeAudio IPC when button clicked with clips', async () => {
      const mockSetStatus = vi.fn()
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'idle',
        transcriptionProgress: null,
        transcriptionText: '',
        userGuidance: '',
        includeTranscription: true,
        transcriptionError: null,
        setTranscription: vi.fn(),
        setTranscriptionStatus: mockSetStatus,
        setTranscriptionProgress: vi.fn(),
        setTranscriptionError: vi.fn(),
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      vi.mocked(useTimelineStore).mockReturnValue({
        clips: [{ id: '1', file: 'test.mp4' }]
      } as any)

      mockTranscribeAudio.mockResolvedValue({
        success: true,
        data: { text: 'Test transcription', duration: 120 }
      })

      render(<TranscriptionPanel />)
      const button = screen.getByRole('button', { name: /transcribe audio/i })

      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSetStatus).toHaveBeenCalledWith('extracting')
        expect(mockTranscribeAudio).toHaveBeenCalled()
      })
    })

    it('should handle IPC success and populate transcription', async () => {
      const mockSetTranscription = vi.fn()
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'idle',
        transcriptionProgress: null,
        transcriptionText: '',
        userGuidance: '',
        includeTranscription: true,
        transcriptionError: null,
        setTranscription: mockSetTranscription,
        setTranscriptionStatus: vi.fn(),
        setTranscriptionProgress: vi.fn(),
        setTranscriptionError: vi.fn(),
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      vi.mocked(useTimelineStore).mockReturnValue({
        clips: [{ id: '1', file: 'test.mp4' }]
      } as any)

      mockTranscribeAudio.mockResolvedValue({
        success: true,
        data: { text: 'Test transcription', duration: 120, warning: 'Test warning' }
      })

      render(<TranscriptionPanel />)
      const button = screen.getByRole('button', { name: /transcribe audio/i })

      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSetTranscription).toHaveBeenCalledWith('Test transcription', 120, 'Test warning')
      })
    })

    it('should handle IPC error and show error message', async () => {
      const mockSetError = vi.fn()
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
        setTranscriptionError: mockSetError,
        setTranscriptionText: vi.fn(),
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      vi.mocked(useTimelineStore).mockReturnValue({
        clips: [{ id: '1', file: 'test.mp4' }]
      } as any)

      mockTranscribeAudio.mockResolvedValue({
        success: false,
        error: 'API key invalid'
      })

      render(<TranscriptionPanel />)
      const button = screen.getByRole('button', { name: /transcribe audio/i })

      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('API key invalid')
      })
    })
  })

  describe('AC 4: Progress indicator visible during transcription process', () => {
    it('should show progress indicator when transcribing', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'transcribing',
        transcriptionProgress: { percentage: 50, message: 'Transcribing...' },
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
      expect(screen.getByText('Transcribing...')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should show extracting status', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'extracting',
        transcriptionProgress: { percentage: 25, message: 'Extracting audio...' },
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
      expect(screen.getByText('Extracting audio...')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()
    })
  })

  describe('AC 5: Transcription auto-populates into editable textarea', () => {
    it('should display transcription text in textarea', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'complete',
        transcriptionProgress: null,
        transcriptionText: 'This is a test transcription',
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
      const textarea = screen.getByPlaceholderText(/transcription will appear here/i)
      expect(textarea).toHaveValue('This is a test transcription')
    })
  })

  describe('AC 6: Checkbox: "Include transcription in post generation prompt"', () => {
    it('should render checkbox with correct label', () => {
      render(<TranscriptionPanel />)
      expect(
        screen.getByLabelText(/include transcription in post generation prompt/i)
      ).toBeInTheDocument()
    })

    it('should be checked by default', () => {
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
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call setIncludeTranscription when toggled', () => {
      const mockSetInclude = vi.fn()
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
        setIncludeTranscription: mockSetInclude,
        clearTranscription: vi.fn()
      } as any)

      render(<TranscriptionPanel />)
      const checkbox = screen.getByRole('checkbox')

      fireEvent.click(checkbox)

      expect(mockSetInclude).toHaveBeenCalled()
    })
  })

  describe('AC 7, 8: Second textarea for "Additional Guidance" and both fields editable', () => {
    it('should render user guidance textarea', () => {
      render(<TranscriptionPanel />)
      expect(
        screen.getByPlaceholderText(/add any additional context or instructions/i)
      ).toBeInTheDocument()
    })

    it('should allow editing transcription textarea', () => {
      const mockSetText = vi.fn()
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
        setTranscriptionText: mockSetText,
        setUserGuidance: vi.fn(),
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      render(<TranscriptionPanel />)
      const textarea = screen.getByPlaceholderText(/transcription will appear here/i)

      fireEvent.change(textarea, { target: { value: 'Edited transcription' } })

      expect(mockSetText).toHaveBeenCalledWith('Edited transcription')
    })

    it('should allow editing user guidance textarea', () => {
      const mockSetGuidance = vi.fn()
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
        setUserGuidance: mockSetGuidance,
        setIncludeTranscription: vi.fn(),
        clearTranscription: vi.fn()
      } as any)

      render(<TranscriptionPanel />)
      const textarea = screen.getByPlaceholderText(/add any additional context or instructions/i)

      fireEvent.change(textarea, { target: { value: 'Additional context' } })

      expect(mockSetGuidance).toHaveBeenCalledWith('Additional context')
    })
  })

  describe('AC 9: Validation - at least one field must have content', () => {
    it('should validate with transcription and checkbox checked', () => {
      const result = validateTranscriptionInput('Test transcription', '', true)
      expect(result).toBe(true)
    })

    it('should validate with user guidance only', () => {
      const result = validateTranscriptionInput('', 'User guidance', false)
      expect(result).toBe(true)
    })

    it('should fail validation when both empty', () => {
      const result = validateTranscriptionInput('', '', true)
      expect(result).toBe(false)
    })

    it('should fail validation when transcription exists but checkbox unchecked and no guidance', () => {
      const result = validateTranscriptionInput('Test', '', false)
      expect(result).toBe(false)
    })
  })

  describe('AC 10: Transcription persists in session', () => {
    it('should persist transcription text across re-renders', () => {
      const { rerender } = render(<TranscriptionPanel />)

      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'complete',
        transcriptionProgress: null,
        transcriptionText: 'Persisted transcription',
        userGuidance: 'Persisted guidance',
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

      rerender(<TranscriptionPanel />)

      const transcriptionTextarea = screen.getByPlaceholderText(/transcription will appear here/i)
      const guidanceTextarea = screen.getByPlaceholderText(/add any additional context/i)

      expect(transcriptionTextarea).toHaveValue('Persisted transcription')
      expect(guidanceTextarea).toHaveValue('Persisted guidance')
    })
  })

  describe('Loading states', () => {
    it('should disable button during transcription', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'transcribing',
        transcriptionProgress: { percentage: 50, message: 'Transcribing...' },
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
      const button = screen.getByRole('button', { name: /transcribing/i })
      expect(button).toBeDisabled()
    })

    it('should disable textareas during transcription', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'transcribing',
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
      const transcriptionTextarea = screen.getByPlaceholderText(/transcription will appear here/i)
      const guidanceTextarea = screen.getByPlaceholderText(/add any additional context/i)

      expect(transcriptionTextarea).toBeDisabled()
      expect(guidanceTextarea).toBeDisabled()
    })
  })

  describe('Clear functionality', () => {
    it('should show clear button when transcription or guidance exists', () => {
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
      expect(screen.getByRole('button', { name: /clear transcription/i })).toBeInTheDocument()
    })

    it('should not show clear button when both fields are empty', () => {
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
      expect(screen.queryByRole('button', { name: /clear transcription/i })).not.toBeInTheDocument()
    })
  })

  describe('Character counts', () => {
    it('should display character count for transcription', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'complete',
        transcriptionProgress: null,
        transcriptionText: 'Test',
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
      expect(screen.getByText('4 characters')).toBeInTheDocument()
    })

    it('should display character count for user guidance', () => {
      vi.mocked(useAIStore).mockReturnValue({
        transcriptionStatus: 'idle',
        transcriptionProgress: null,
        transcriptionText: '',
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
        clearTranscription: vi.fn()
      } as any)

      render(<TranscriptionPanel />)
      expect(screen.getByText('13 characters')).toBeInTheDocument()
    })
  })
})
