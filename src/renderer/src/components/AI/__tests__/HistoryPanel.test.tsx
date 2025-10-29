/**
 * History Panel Component Tests
 *
 * Tests for HistoryPanel.tsx covering rendering, click handlers, and cache operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HistoryPanel } from '../HistoryPanel'
import { useAIStore } from '../../../store/aiStore'
import type { CacheEntry } from '../../../types/cache.types'

// Mock zustand store
vi.mock('../../../store/aiStore', () => ({
  useAIStore: vi.fn()
}))

// Sample cache entries for testing
function createMockCacheEntry(overrides?: Partial<CacheEntry>): CacheEntry {
  return {
    id: 'test-entry-1',
    transcription: {
      id: 'trans-1',
      text: 'This is a test transcription for history panel',
      audioSourceClips: ['clip-1'],
      createdAt: '2025-10-29T12:00:00Z',
      duration: 60
    },
    generatedPosts: [
      {
        id: 'post-1',
        platform: 'youtube',
        content: 'Test YouTube description',
        characterCount: 24,
        exceedsLimit: false,
        generatedAt: '2025-10-29T12:05:00Z'
      },
      {
        id: 'post-2',
        platform: 'twitter',
        content: 'Test Twitter post',
        characterCount: 17,
        exceedsLimit: false,
        generatedAt: '2025-10-29T12:05:00Z'
      }
    ],
    request: {
      transcription: 'This is a test transcription',
      userGuidance: 'Test guidance',
      personas: ['naval'],
      platforms: ['youtube', 'twitter'],
      includeEmojis: false
    },
    createdAt: '2025-10-29T12:05:00Z',
    ...overrides
  }
}

describe('HistoryPanel', () => {
  const mockLoadCache = vi.fn()
  const mockClearCache = vi.fn()
  const mockSetTranscriptionText = vi.fn()
  const mockSetTranscription = vi.fn()
  const mockSetUserGuidance = vi.fn()
  const mockSetIncludeTranscription = vi.fn()
  const mockSetIncludeEmojis = vi.fn()
  const mockClearPersonas = vi.fn()
  const mockAddPersona = vi.fn()
  const mockClearGeneratedPosts = vi.fn()
  const mockAppendStreamChunk = vi.fn()
  const mockSetStreamingStatus = vi.fn()
  const mockSetGenerationStatus = vi.fn()

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock default store state (empty cache)
    ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        cacheEntries: [],
        loadCache: mockLoadCache,
        clearCache: mockClearCache,
        setTranscriptionText: mockSetTranscriptionText,
        setTranscription: mockSetTranscription,
        setUserGuidance: mockSetUserGuidance,
        setIncludeTranscription: mockSetIncludeTranscription,
        setIncludeEmojis: mockSetIncludeEmojis,
        clearPersonas: mockClearPersonas,
        addPersona: mockAddPersona,
        clearGeneratedPosts: mockClearGeneratedPosts,
        appendStreamChunk: mockAppendStreamChunk,
        setStreamingStatus: mockSetStreamingStatus,
        setGenerationStatus: mockSetGenerationStatus
      }
      return selector(state)
    })

    // Mock getState for click handlers
    useAIStore.getState = vi.fn(() => ({
      setTranscriptionText: mockSetTranscriptionText,
      setTranscription: mockSetTranscription,
      setUserGuidance: mockSetUserGuidance,
      setIncludeTranscription: mockSetIncludeTranscription,
      setIncludeEmojis: mockSetIncludeEmojis,
      clearPersonas: mockClearPersonas,
      addPersona: mockAddPersona,
      clearGeneratedPosts: mockClearGeneratedPosts,
      appendStreamChunk: mockAppendStreamChunk,
      setStreamingStatus: mockSetStreamingStatus,
      setGenerationStatus: mockSetGenerationStatus
    }))
  })

  describe('Rendering', () => {
    it('should load cache on mount', () => {
      render(<HistoryPanel />)

      expect(mockLoadCache).toHaveBeenCalledOnce()
    })

    it('should display empty state when no cache entries', () => {
      render(<HistoryPanel />)

      expect(screen.getByText('No history yet')).toBeInTheDocument()
      expect(screen.getByText(/Generate your first posts to see them here/i)).toBeInTheDocument()
    })

    it('should display cache entries when available', () => {
      const mockEntries = [
        createMockCacheEntry({ id: 'entry-1' }),
        createMockCacheEntry({ id: 'entry-2', transcription: { ...createMockCacheEntry().transcription, text: 'Second entry text' } })
      ]

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: mockEntries, loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      expect(screen.getByText(/This is a test transcription for history panel/)).toBeInTheDocument()
      expect(screen.getByText(/Second entry text/)).toBeInTheDocument()
    })

    it('should display timestamp in correct format', () => {
      const mockEntry = createMockCacheEntry({
        createdAt: '2025-10-29T14:30:00Z'
      })

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Timestamp should be formatted (exact format depends on locale)
      expect(screen.getByText(/Oct.*29.*2025/)).toBeInTheDocument()
    })

    it('should display platform icons for generated posts', () => {
      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Should show "Generated:" text and platform icons
      expect(screen.getByText('Generated:')).toBeInTheDocument()
    })

    it('should truncate long transcription snippets', () => {
      const longText = 'A'.repeat(200)
      const mockEntry = createMockCacheEntry({
        transcription: { ...createMockCacheEntry().transcription, text: longText }
      })

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Should be truncated to 100 chars + "..."
      const displayedText = screen.getByText(/^A+\.\.\./)
      expect(displayedText.textContent?.length).toBeLessThanOrEqual(103)
    })
  })

  describe('Clear Cache Button', () => {
    it('should not show clear cache button when no entries', () => {
      render(<HistoryPanel />)

      expect(screen.queryByText('Clear Cache')).not.toBeInTheDocument()
    })

    it('should show clear cache button when entries exist', () => {
      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      expect(screen.getByText('Clear Cache')).toBeInTheDocument()
    })

    it('should show confirmation dialog when clear cache clicked', async () => {
      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      const clearButton = screen.getByText('Clear Cache')
      fireEvent.click(clearButton)

      await waitFor(() => {
        expect(screen.getByText('Clear all cache?')).toBeInTheDocument()
        expect(screen.getByText(/This will delete all cached transcriptions/)).toBeInTheDocument()
      })
    })

    it('should call clearCache when confirmation accepted', async () => {
      mockClearCache.mockResolvedValueOnce(true)

      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Open dialog
      const clearButton = screen.getByText('Clear Cache')
      fireEvent.click(clearButton)

      // Confirm
      await waitFor(() => {
        const confirmButton = screen.getByText(/Clear Cache/i, { selector: 'button:not([data-state])' })
        fireEvent.click(confirmButton)
      })

      expect(mockClearCache).toHaveBeenCalledOnce()
    })
  })

  describe('History Entry Click Handler', () => {
    it('should load transcription when entry clicked', () => {
      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Click entry card
      const entryCard = screen.getByText(/This is a test transcription for history panel/)
      fireEvent.click(entryCard)

      // Should load transcription
      expect(mockSetTranscriptionText).toHaveBeenCalledWith(mockEntry.transcription.text)
      expect(mockSetTranscription).toHaveBeenCalledWith(
        mockEntry.transcription.text,
        mockEntry.transcription.duration,
        undefined
      )
    })

    it('should load generation request settings when entry clicked', () => {
      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Click entry card
      const entryCard = screen.getByText(/This is a test transcription for history panel/)
      fireEvent.click(entryCard)

      // Should load settings
      expect(mockSetUserGuidance).toHaveBeenCalledWith('Test guidance')
      expect(mockSetIncludeTranscription).toHaveBeenCalledWith(true)
      expect(mockSetIncludeEmojis).toHaveBeenCalledWith(false)
    })

    it('should load personas when entry clicked', () => {
      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Click entry card
      const entryCard = screen.getByText(/This is a test transcription for history panel/)
      fireEvent.click(entryCard)

      // Should clear existing and add personas
      expect(mockClearPersonas).toHaveBeenCalledOnce()
      expect(mockAddPersona).toHaveBeenCalledWith('naval')
    })

    it('should load generated posts when entry clicked', () => {
      const mockEntry = createMockCacheEntry()

      ;(useAIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({ cacheEntries: [mockEntry], loadCache: mockLoadCache, clearCache: mockClearCache })
      })

      render(<HistoryPanel />)

      // Click entry card
      const entryCard = screen.getByText(/This is a test transcription for history panel/)
      fireEvent.click(entryCard)

      // Should clear existing posts
      expect(mockClearGeneratedPosts).toHaveBeenCalledOnce()

      // Should append posts for each platform
      expect(mockAppendStreamChunk).toHaveBeenCalledWith('youtube', 'Test YouTube description')
      expect(mockAppendStreamChunk).toHaveBeenCalledWith('twitter', 'Test Twitter post')

      // Should set streaming status to complete
      expect(mockSetStreamingStatus).toHaveBeenCalledWith('youtube', 'complete')
      expect(mockSetStreamingStatus).toHaveBeenCalledWith('twitter', 'complete')

      // Should set generation status to complete
      expect(mockSetGenerationStatus).toHaveBeenCalledWith('complete')
    })
  })
})
