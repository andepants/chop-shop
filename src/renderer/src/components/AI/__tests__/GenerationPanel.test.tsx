/**
 * GenerationPanel Integration Tests
 *
 * Tests for GenerationPanel component including platform selection,
 * emoji toggle, validation, and generation trigger.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GenerationPanel } from '../GenerationPanel'
import { useAIStore } from '../../../store/aiStore'

// Mock window.api
const mockGeneratePosts = vi.fn()
global.window.api = {
  generatePosts: mockGeneratePosts
} as any

describe('GenerationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAIStore.setState({
      selectedPlatforms: [],
      includeEmojis: false,
      generationStatus: 'idle',
      transcriptionText: '',
      userGuidance: '',
      includeTranscription: true,
      selectedPersonas: []
    })
  })

  describe('Platform selection', () => {
    it('should render platform checkboxes (YouTube, Twitter, LinkedIn)', () => {
      render(<GenerationPanel />)

      expect(screen.getByLabelText(/YouTube/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Twitter/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/LinkedIn/i)).toBeInTheDocument()
    })

    it('should toggle platform selection when checkbox clicked', () => {
      render(<GenerationPanel />)

      const youtubeCheckbox = screen.getByLabelText(/YouTube/i)

      // Initially unchecked
      expect(useAIStore.getState().selectedPlatforms).not.toContain('youtube')

      // Click to select
      fireEvent.click(youtubeCheckbox)
      expect(useAIStore.getState().selectedPlatforms).toContain('youtube')

      // Click to deselect
      fireEvent.click(youtubeCheckbox)
      expect(useAIStore.getState().selectedPlatforms).not.toContain('youtube')
    })

    it('should allow multiple platforms to be selected', () => {
      render(<GenerationPanel />)

      const youtubeCheckbox = screen.getByLabelText(/YouTube/i)
      const twitterCheckbox = screen.getByLabelText(/Twitter/i)

      fireEvent.click(youtubeCheckbox)
      fireEvent.click(twitterCheckbox)

      const platforms = useAIStore.getState().selectedPlatforms
      expect(platforms).toContain('youtube')
      expect(platforms).toContain('twitter')
      expect(platforms).toHaveLength(2)
    })
  })

  describe('Emoji toggle', () => {
    it('should render emoji checkbox (default unchecked)', () => {
      render(<GenerationPanel />)

      const emojiCheckbox = screen.getByLabelText(/Include Emojis/i)
      expect(emojiCheckbox).toBeInTheDocument()
      expect(useAIStore.getState().includeEmojis).toBe(false)
    })

    it('should toggle emoji setting when checkbox clicked', () => {
      render(<GenerationPanel />)

      const emojiCheckbox = screen.getByLabelText(/Include Emojis/i)

      // Click to enable
      fireEvent.click(emojiCheckbox)
      expect(useAIStore.getState().includeEmojis).toBe(true)

      // Click to disable
      fireEvent.click(emojiCheckbox)
      expect(useAIStore.getState().includeEmojis).toBe(false)
    })
  })

  describe('Generate button', () => {
    it('should render Generate Posts button', () => {
      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      expect(button).toBeInTheDocument()
    })

    it('should be disabled when no platforms selected', () => {
      useAIStore.setState({
        selectedPlatforms: [],
        transcriptionText: 'Test transcription'
      })

      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled when no content provided', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        transcriptionText: '',
        userGuidance: '',
        includeTranscription: true
      })

      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      expect(button).toBeDisabled()
    })

    it('should be enabled when platforms selected and content provided (transcription)', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        transcriptionText: 'Test transcription',
        includeTranscription: true
      })

      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      expect(button).not.toBeDisabled()
    })

    it('should be enabled when platforms selected and content provided (user guidance)', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        userGuidance: 'Test guidance',
        includeTranscription: false
      })

      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      expect(button).not.toBeDisabled()
    })
  })

  describe('Validation', () => {
    it('should show inline help text when no platform selected', () => {
      render(<GenerationPanel />)

      expect(screen.getByText(/Select at least one platform/i)).toBeInTheDocument()
    })

    it('should show inline help text when platform selected but no content', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        transcriptionText: '',
        userGuidance: ''
      })

      render(<GenerationPanel />)

      expect(
        screen.getByText(/Provide a transcription or additional guidance/i)
      ).toBeInTheDocument()
    })
  })

  describe('Generation flow', () => {
    beforeEach(() => {
      mockGeneratePosts.mockResolvedValue({ success: true })
    })

    it('should call IPC handler when Generate button clicked', async () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube', 'twitter'],
        transcriptionText: 'Test transcription',
        includeTranscription: true,
        userGuidance: 'Additional context',
        selectedPersonas: ['naval'],
        includeEmojis: true
      })

      const onGenerationStart = vi.fn()
      render(<GenerationPanel onGenerationStart={onGenerationStart} />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockGeneratePosts).toHaveBeenCalledWith({
          transcription: 'Test transcription',
          userGuidance: 'Additional context',
          personas: ['naval'],
          platforms: ['youtube', 'twitter'],
          includeEmojis: true
        })
      })
    })

    it('should set generation status to "generating" when starting', async () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        transcriptionText: 'Test transcription'
      })

      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(useAIStore.getState().generationStatus).toBe('generating')
      })
    })

    it('should call onGenerationStart callback when generation starts', async () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        transcriptionText: 'Test transcription'
      })

      const onGenerationStart = vi.fn()
      render(<GenerationPanel onGenerationStart={onGenerationStart} />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(onGenerationStart).toHaveBeenCalled()
      })
    })

    it('should set generation status to "complete" when generation succeeds', async () => {
      mockGeneratePosts.mockResolvedValue({ success: true })

      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        transcriptionText: 'Test transcription'
      })

      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(useAIStore.getState().generationStatus).toBe('complete')
      })
    })

    it('should set generation status to "error" and show error message when generation fails', async () => {
      mockGeneratePosts.mockResolvedValue({
        success: false,
        error: 'API key invalid'
      })

      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        transcriptionText: 'Test transcription'
      })

      render(<GenerationPanel />)

      const button = screen.getByRole('button', { name: /Generate Posts/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(useAIStore.getState().generationStatus).toBe('error')
        expect(screen.getByText(/API key invalid/i)).toBeInTheDocument()
      })
    })
  })
})
