/**
 * Results Panel Component Tests
 *
 * Tests streaming display, character counting, warnings, copy functionality,
 * and real-time UI updates for the ResultsPanel component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultsPanel } from '../ResultsPanel'
import { useAIStore } from '../../../store/aiStore'

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

// Mock window.confirm
global.confirm = vi.fn(() => true)

// Mock IPC renderer
const mockIpcRendererOn = vi.fn()
const mockIpcRendererRemoveListener = vi.fn()

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      on: mockIpcRendererOn,
      removeListener: mockIpcRendererRemoveListener
    }
  },
  writable: true
})

describe('ResultsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAIStore.setState({
      generatedPosts: {
        youtube: '',
        twitter: '',
        linkedin: ''
      },
      streamingStatus: {
        youtube: 'idle',
        twitter: 'idle',
        linkedin: 'idle'
      },
      selectedPlatforms: [],
      generationStatus: 'idle'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Empty State', () => {
    it('should render empty state when no content generated', () => {
      render(<ResultsPanel />)

      expect(screen.getByText('No Results Yet')).toBeInTheDocument()
      expect(
        screen.getByText(/Generate content in the.*Generate.*tab to see results here/)
      ).toBeInTheDocument()
    })

    it('should not show platform cards when no platforms selected', () => {
      render(<ResultsPanel />)

      expect(screen.queryByText('YouTube Description')).not.toBeInTheDocument()
      expect(screen.queryByText('Twitter Post')).not.toBeInTheDocument()
      expect(screen.queryByText('LinkedIn Post')).not.toBeInTheDocument()
    })
  })

  describe('Platform Display (AC 2, 9)', () => {
    it('should display all selected platform sections in parallel', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube', 'twitter', 'linkedin'],
        generationStatus: 'generating'
      })

      render(<ResultsPanel />)

      expect(screen.getByText('YouTube Description')).toBeInTheDocument()
      expect(screen.getByText('Twitter Post')).toBeInTheDocument()
      expect(screen.getByText('LinkedIn Post')).toBeInTheDocument()
    })

    it('should only display selected platforms', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube', 'twitter'],
        generationStatus: 'generating'
      })

      render(<ResultsPanel />)

      expect(screen.getByText('YouTube Description')).toBeInTheDocument()
      expect(screen.getByText('Twitter Post')).toBeInTheDocument()
      expect(screen.queryByText('LinkedIn Post')).not.toBeInTheDocument()
    })
  })

  describe('Streaming Display (AC 3, 10)', () => {
    it('should register IPC event listener for streaming chunks', () => {
      render(<ResultsPanel />)

      expect(mockIpcRendererOn).toHaveBeenCalledWith('ai-stream-chunk', expect.any(Function))
    })

    it('should cleanup IPC listener on unmount', () => {
      const { unmount } = render(<ResultsPanel />)

      unmount()

      expect(mockIpcRendererRemoveListener).toHaveBeenCalledWith(
        'ai-stream-chunk',
        expect.any(Function)
      )
    })

    it('should append streaming chunks to platform content', async () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generationStatus: 'generating'
      })

      render(<ResultsPanel />)

      // Get the registered listener
      const streamListener = mockIpcRendererOn.mock.calls.find(
        (call) => call[0] === 'ai-stream-chunk'
      )?.[1]

      // Simulate streaming chunks
      streamListener?.(null, { platform: 'youtube', content: 'Hello ', complete: false })
      streamListener?.(null, { platform: 'youtube', content: 'World', complete: false })

      await waitFor(() => {
        const store = useAIStore.getState()
        expect(store.generatedPosts.youtube).toBe('Hello World')
        expect(store.streamingStatus.youtube).toBe('streaming')
      })
    })

    it('should set streaming status to complete when chunk is complete', async () => {
      useAIStore.setState({
        selectedPlatforms: ['twitter'],
        generationStatus: 'generating'
      })

      render(<ResultsPanel />)

      const streamListener = mockIpcRendererOn.mock.calls.find(
        (call) => call[0] === 'ai-stream-chunk'
      )?.[1]

      // Simulate completion
      streamListener?.(null, { platform: 'twitter', content: '', complete: true })

      await waitFor(() => {
        const store = useAIStore.getState()
        expect(store.streamingStatus.twitter).toBe('complete')
      })
    })

    it('should display streamed content in real-time', async () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generationStatus: 'generating',
        generatedPosts: {
          youtube: 'Streaming content...',
          twitter: '',
          linkedin: ''
        }
      })

      render(<ResultsPanel />)

      expect(screen.getByText('Streaming content...')).toBeInTheDocument()
    })
  })

  describe('Character Counting (AC 4, 5)', () => {
    it('should display character count for each platform', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube', 'twitter', 'linkedin'],
        generatedPosts: {
          youtube: 'Test content',
          twitter: 'Tweet',
          linkedin: 'LinkedIn post'
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'complete',
          linkedin: 'complete'
        }
      })

      render(<ResultsPanel />)

      expect(screen.getByText(/12 characters/)).toBeInTheDocument() // YouTube (no limit shown)
      expect(screen.getByText(/5 \/ 280 characters/)).toBeInTheDocument() // Twitter
      expect(screen.getByText(/13 \/ 3000 characters/)).toBeInTheDocument() // LinkedIn
    })

    it('should update character count in real-time as content streams', async () => {
      useAIStore.setState({
        selectedPlatforms: ['twitter'],
        generationStatus: 'generating'
      })

      render(<ResultsPanel />)

      const streamListener = mockIpcRendererOn.mock.calls.find(
        (call) => call[0] === 'ai-stream-chunk'
      )?.[1]

      // Stream content progressively
      streamListener?.(null, { platform: 'twitter', content: 'Hello', complete: false })

      await waitFor(() => {
        expect(screen.getByText(/5 \/ 280 characters/)).toBeInTheDocument()
      })

      streamListener?.(null, { platform: 'twitter', content: ' World', complete: false })

      await waitFor(() => {
        expect(screen.getByText(/11 \/ 280 characters/)).toBeInTheDocument()
      })
    })

    it('should show warning when Twitter exceeds 280 characters', () => {
      const longTweet = 'a'.repeat(300)

      useAIStore.setState({
        selectedPlatforms: ['twitter'],
        generatedPosts: {
          youtube: '',
          twitter: longTweet,
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'idle',
          twitter: 'complete',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      expect(screen.getByText(/300 \/ 280 characters/)).toBeInTheDocument()
      expect(screen.getByText(/Exceeds Twitter Post character limit/)).toBeInTheDocument()
      // Check for red styling
      const charCount = screen.getByText(/300 \/ 280 characters/)
      expect(charCount).toHaveClass('text-red-500')
    })

    it('should show warning when LinkedIn exceeds 3000 characters', () => {
      const longPost = 'a'.repeat(3100)

      useAIStore.setState({
        selectedPlatforms: ['linkedin'],
        generatedPosts: {
          youtube: '',
          twitter: '',
          linkedin: longPost
        },
        streamingStatus: {
          youtube: 'idle',
          twitter: 'idle',
          linkedin: 'complete'
        }
      })

      render(<ResultsPanel />)

      expect(screen.getByText(/3100 \/ 3000 characters/)).toBeInTheDocument()
      expect(screen.getByText(/Exceeds LinkedIn Post character limit/)).toBeInTheDocument()
    })

    it('should not show warning for YouTube (no limit)', () => {
      const longContent = 'a'.repeat(5000)

      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: longContent,
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      expect(screen.getByText(/5000 characters/)).toBeInTheDocument()
      expect(screen.queryByText(/Exceeds/)).not.toBeInTheDocument()
    })
  })

  describe('Copy to Clipboard (AC 6, 7)', () => {
    it('should render copy button for each platform', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube', 'twitter', 'linkedin'],
        generatedPosts: {
          youtube: 'YouTube content',
          twitter: 'Twitter content',
          linkedin: 'LinkedIn content'
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'complete',
          linkedin: 'complete'
        }
      })

      render(<ResultsPanel />)

      const copyButtons = screen.getAllByText('Copy to Clipboard')
      expect(copyButtons).toHaveLength(3)
    })

    it('should copy content to clipboard when button clicked', async () => {
      const user = userEvent.setup()

      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Test YouTube content',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      const copyButton = screen.getByText('Copy to Clipboard')
      await user.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test YouTube content')
    })

    it('should show "Copied!" confirmation feedback after copy', async () => {
      const user = userEvent.setup()

      useAIStore.setState({
        selectedPlatforms: ['twitter'],
        generatedPosts: {
          youtube: '',
          twitter: 'Tweet content',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'idle',
          twitter: 'complete',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      const copyButton = screen.getByText('Copy to Clipboard')
      await user.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })
    })

    it('should revert button text after 2 seconds', async () => {
      vi.useFakeTimers()
      const user = userEvent.setup({ delay: null })

      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Content',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      const copyButton = screen.getByText('Copy to Clipboard')
      await user.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })

      // Fast-forward 2 seconds
      vi.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument()
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
      })

      vi.useRealTimers()
    })

    it('should disable copy button while streaming', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Partial content...',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'streaming',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      const copyButton = screen.getByRole('button', { name: /Copy to Clipboard/i })
      expect(copyButton).toBeDisabled()
    })

    it('should disable copy button when no content', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: '',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'idle',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      const copyButton = screen.getByRole('button', { name: /Copy to Clipboard/i })
      expect(copyButton).toBeDisabled()
    })
  })

  describe('Loading Spinner (AC 9)', () => {
    it('should show loading spinner while generation in progress', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generationStatus: 'generating',
        streamingStatus: {
          youtube: 'streaming',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      expect(screen.getByText('Generating...')).toBeInTheDocument()
      expect(screen.getByText(/Generating content\.\.\. This may take a few moments\./)).toBeInTheDocument()
    })

    it('should hide loading spinner when stream completes', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Complete content',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'idle',
          linkedin: 'idle'
        },
        generationStatus: 'complete'
      })

      render(<ResultsPanel />)

      expect(screen.queryByText('Generating...')).not.toBeInTheDocument()
      expect(screen.queryByText(/Generating content\.\.\. This may take a few moments\./)).not.toBeInTheDocument()
    })
  })

  describe('Content Persistence (AC 8)', () => {
    it('should persist generated content until cleared', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Persisted content',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'idle',
          linkedin: 'idle'
        },
        generationStatus: 'complete'
      })

      const { rerender } = render(<ResultsPanel />)

      expect(screen.getByText('Persisted content')).toBeInTheDocument()

      // Rerender (simulating re-mount or state change)
      rerender(<ResultsPanel />)

      expect(screen.getByText('Persisted content')).toBeInTheDocument()
    })
  })

  describe('Clear Functionality (AC 8)', () => {
    it('should show Clear Results button when content exists', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Content to clear',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'idle',
          linkedin: 'idle'
        },
        generationStatus: 'complete'
      })

      render(<ResultsPanel />)

      expect(screen.getByText('Clear Results')).toBeInTheDocument()
    })

    it('should not show Clear Results button while generating', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Generating...',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'streaming',
          twitter: 'idle',
          linkedin: 'idle'
        },
        generationStatus: 'generating'
      })

      render(<ResultsPanel />)

      expect(screen.queryByText('Clear Results')).not.toBeInTheDocument()
    })

    it('should clear all generated posts when Clear button clicked', async () => {
      const user = userEvent.setup()

      useAIStore.setState({
        selectedPlatforms: ['youtube', 'twitter'],
        generatedPosts: {
          youtube: 'YouTube content',
          twitter: 'Twitter content',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'complete',
          linkedin: 'idle'
        },
        generationStatus: 'complete'
      })

      render(<ResultsPanel />)

      const clearButton = screen.getByText('Clear Results')
      await user.click(clearButton)

      const store = useAIStore.getState()
      expect(store.generatedPosts.youtube).toBe('')
      expect(store.generatedPosts.twitter).toBe('')
      expect(store.generatedPosts.linkedin).toBe('')
    })

    it('should show confirmation dialog before clearing', async () => {
      const user = userEvent.setup()

      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Content',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'complete',
          twitter: 'idle',
          linkedin: 'idle'
        },
        generationStatus: 'complete'
      })

      render(<ResultsPanel />)

      const clearButton = screen.getByText('Clear Results')
      await user.click(clearButton)

      expect(global.confirm).toHaveBeenCalledWith(
        'Clear all generated content? This action cannot be undone.'
      )
    })
  })

  describe('Error State Display', () => {
    it('should display error message when platform generation fails', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: '',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'error',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      expect(screen.getByText('Generation failed for youtube')).toBeInTheDocument()
    })
  })

  describe('Smooth UI Updates (AC 10)', () => {
    it('should apply smooth scroll behavior to content area', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Content',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'streaming',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      // Find content area within YouTube card
      const youtubeCard = screen.getByText('YouTube Description').closest('div')!
      const contentArea = within(youtubeCard).getByText('Content').closest('div')!

      expect(contentArea).toHaveStyle({ scrollBehavior: 'smooth' })
    })

    it('should apply transition CSS for smooth content updates', () => {
      useAIStore.setState({
        selectedPlatforms: ['youtube'],
        generatedPosts: {
          youtube: 'Smooth transition content',
          twitter: '',
          linkedin: ''
        },
        streamingStatus: {
          youtube: 'streaming',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      render(<ResultsPanel />)

      const contentDiv = screen.getByText('Smooth transition content')
      expect(contentDiv).toHaveClass('transition-all', 'duration-150', 'ease-out')
    })
  })
})
