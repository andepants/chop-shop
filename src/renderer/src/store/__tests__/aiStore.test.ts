/**
 * AI Store Tests
 *
 * Tests for AI state management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAIStore } from '../aiStore'

// Mock window.api
const mockAPI = {
  hasApiKey: vi.fn(),
  testApiConnection: vi.fn(),
  storeApiKey: vi.fn(),
  clearApiKey: vi.fn()
}

// @ts-expect-error - Mocking global window.api
global.window = {
  api: mockAPI
}

describe('AIStore', () => {
  beforeEach(() => {
    // Reset store state
    useAIStore.setState({
      hasApiKey: false,
      apiKeyStatus: 'unknown',
      isTestingConnection: false,
      lastTestResult: null
    })

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('checkApiKey', () => {
    it('should update state when API key exists', async () => {
      mockAPI.hasApiKey.mockResolvedValue({
        success: true,
        data: { hasKey: true }
      })

      await useAIStore.getState().checkApiKey()

      const state = useAIStore.getState()
      expect(state.hasApiKey).toBe(true)
      expect(state.apiKeyStatus).toBe('stored')
    })

    it('should update state when no API key exists', async () => {
      mockAPI.hasApiKey.mockResolvedValue({
        success: true,
        data: { hasKey: false }
      })

      await useAIStore.getState().checkApiKey()

      const state = useAIStore.getState()
      expect(state.hasApiKey).toBe(false)
      expect(state.apiKeyStatus).toBe('missing')
    })

    it('should handle errors gracefully', async () => {
      mockAPI.hasApiKey.mockResolvedValue({
        success: false,
        error: 'Test error'
      })

      await useAIStore.getState().checkApiKey()

      const state = useAIStore.getState()
      expect(state.hasApiKey).toBe(false)
      expect(state.apiKeyStatus).toBe('error')
    })
  })

  describe('testConnection', () => {
    it('should return valid result for valid API key', async () => {
      mockAPI.testApiConnection.mockResolvedValue({
        success: true,
        data: {
          valid: true,
          message: 'Connection successful'
        }
      })

      const result = await useAIStore.getState().testConnection('sk-test123')

      expect(result.valid).toBe(true)
      expect(result.message).toBe('Connection successful')
      expect(useAIStore.getState().isTestingConnection).toBe(false)
      expect(useAIStore.getState().lastTestResult).toEqual(expect.objectContaining({
        valid: true,
        message: 'Connection successful'
      }))
    })

    it('should return invalid result for invalid API key', async () => {
      mockAPI.testApiConnection.mockResolvedValue({
        success: true,
        data: {
          valid: false,
          message: 'Invalid API key'
        }
      })

      const result = await useAIStore.getState().testConnection('invalid-key')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('Invalid API key')
      expect(useAIStore.getState().lastTestResult).toEqual(expect.objectContaining({
        valid: false,
        message: 'Invalid API key'
      }))
    })

    it('should set testing state during connection test', async () => {
      let testingStateDuringCall = false

      mockAPI.testApiConnection.mockImplementation(async () => {
        testingStateDuringCall = useAIStore.getState().isTestingConnection
        return {
          success: true,
          data: { valid: true, message: 'Success' }
        }
      })

      await useAIStore.getState().testConnection('sk-test123')

      expect(testingStateDuringCall).toBe(true)
      expect(useAIStore.getState().isTestingConnection).toBe(false)
    })

    it('should handle API errors', async () => {
      mockAPI.testApiConnection.mockResolvedValue({
        success: false,
        error: 'Network error'
      })

      const result = await useAIStore.getState().testConnection('sk-test123')

      expect(result.valid).toBe(false)
      expect(result.message).toContain('Network error')
    })
  })

  describe('storeApiKey', () => {
    it('should store API key successfully', async () => {
      mockAPI.storeApiKey.mockResolvedValue({
        success: true,
        data: { success: true }
      })

      const success = await useAIStore.getState().storeApiKey('sk-test123')

      expect(success).toBe(true)
      expect(useAIStore.getState().hasApiKey).toBe(true)
      expect(useAIStore.getState().apiKeyStatus).toBe('stored')
    })

    it('should handle storage errors', async () => {
      mockAPI.storeApiKey.mockResolvedValue({
        success: false,
        error: 'Storage error'
      })

      const success = await useAIStore.getState().storeApiKey('sk-test123')

      expect(success).toBe(false)
    })
  })

  describe('clearApiKey', () => {
    it('should clear API key successfully', async () => {
      // Set up initial state with API key
      useAIStore.setState({
        hasApiKey: true,
        apiKeyStatus: 'stored',
        lastTestResult: {
          valid: true,
          message: 'Test result',
          timestamp: Date.now()
        }
      })

      mockAPI.clearApiKey.mockResolvedValue({
        success: true,
        data: { success: true }
      })

      const success = await useAIStore.getState().clearApiKey()

      expect(success).toBe(true)
      expect(useAIStore.getState().hasApiKey).toBe(false)
      expect(useAIStore.getState().apiKeyStatus).toBe('missing')
      expect(useAIStore.getState().lastTestResult).toBeNull()
    })

    it('should handle clear errors', async () => {
      mockAPI.clearApiKey.mockResolvedValue({
        success: false,
        error: 'Clear error'
      })

      const success = await useAIStore.getState().clearApiKey()

      expect(success).toBe(false)
    })
  })

  describe('clearTestResult', () => {
    it('should clear test result from state', () => {
      useAIStore.setState({
        lastTestResult: {
          valid: true,
          message: 'Test result',
          timestamp: Date.now()
        }
      })

      useAIStore.getState().clearTestResult()

      expect(useAIStore.getState().lastTestResult).toBeNull()
    })
  })

  describe('Generated Posts - appendStreamChunk', () => {
    it('should append content chunk to platform', () => {
      useAIStore.setState({
        generatedPosts: {
          youtube: 'Hello',
          twitter: '',
          linkedin: ''
        }
      })

      useAIStore.getState().appendStreamChunk('youtube', ' World')

      const state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('Hello World')
    })

    it('should append multiple chunks sequentially', () => {
      useAIStore.setState({
        generatedPosts: {
          youtube: '',
          twitter: '',
          linkedin: ''
        }
      })

      useAIStore.getState().appendStreamChunk('twitter', 'This ')
      useAIStore.getState().appendStreamChunk('twitter', 'is ')
      useAIStore.getState().appendStreamChunk('twitter', 'streaming!')

      const state = useAIStore.getState()
      expect(state.generatedPosts.twitter).toBe('This is streaming!')
    })

    it('should handle empty chunks', () => {
      useAIStore.setState({
        generatedPosts: {
          youtube: 'Content',
          twitter: '',
          linkedin: ''
        }
      })

      useAIStore.getState().appendStreamChunk('youtube', '')

      const state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('Content')
    })

    it('should not affect other platforms when appending', () => {
      useAIStore.setState({
        generatedPosts: {
          youtube: 'YouTube content',
          twitter: 'Twitter content',
          linkedin: 'LinkedIn content'
        }
      })

      useAIStore.getState().appendStreamChunk('youtube', ' more')

      const state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('YouTube content more')
      expect(state.generatedPosts.twitter).toBe('Twitter content')
      expect(state.generatedPosts.linkedin).toBe('LinkedIn content')
    })
  })

  describe('Generated Posts - setStreamingStatus', () => {
    it('should update streaming status for platform', () => {
      useAIStore.setState({
        streamingStatus: {
          youtube: 'idle',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      useAIStore.getState().setStreamingStatus('youtube', 'streaming')

      const state = useAIStore.getState()
      expect(state.streamingStatus.youtube).toBe('streaming')
    })

    it('should transition through streaming states', () => {
      useAIStore.setState({
        streamingStatus: {
          youtube: 'idle',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      useAIStore.getState().setStreamingStatus('twitter', 'streaming')
      expect(useAIStore.getState().streamingStatus.twitter).toBe('streaming')

      useAIStore.getState().setStreamingStatus('twitter', 'complete')
      expect(useAIStore.getState().streamingStatus.twitter).toBe('complete')
    })

    it('should handle error status', () => {
      useAIStore.setState({
        streamingStatus: {
          youtube: 'streaming',
          twitter: 'idle',
          linkedin: 'idle'
        }
      })

      useAIStore.getState().setStreamingStatus('youtube', 'error')

      const state = useAIStore.getState()
      expect(state.streamingStatus.youtube).toBe('error')
    })

    it('should not affect other platforms streaming status', () => {
      useAIStore.setState({
        streamingStatus: {
          youtube: 'streaming',
          twitter: 'complete',
          linkedin: 'idle'
        }
      })

      useAIStore.getState().setStreamingStatus('youtube', 'complete')

      const state = useAIStore.getState()
      expect(state.streamingStatus.youtube).toBe('complete')
      expect(state.streamingStatus.twitter).toBe('complete')
      expect(state.streamingStatus.linkedin).toBe('idle')
    })
  })

  describe('Generated Posts - clearGeneratedPosts', () => {
    it('should clear all generated posts', () => {
      useAIStore.setState({
        generatedPosts: {
          youtube: 'YouTube content',
          twitter: 'Twitter content',
          linkedin: 'LinkedIn content'
        }
      })

      useAIStore.getState().clearGeneratedPosts()

      const state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('')
      expect(state.generatedPosts.twitter).toBe('')
      expect(state.generatedPosts.linkedin).toBe('')
    })

    it('should reset all streaming statuses to idle', () => {
      useAIStore.setState({
        streamingStatus: {
          youtube: 'complete',
          twitter: 'streaming',
          linkedin: 'error'
        }
      })

      useAIStore.getState().clearGeneratedPosts()

      const state = useAIStore.getState()
      expect(state.streamingStatus.youtube).toBe('idle')
      expect(state.streamingStatus.twitter).toBe('idle')
      expect(state.streamingStatus.linkedin).toBe('idle')
    })

    it('should reset generation status to idle', () => {
      useAIStore.setState({
        generationStatus: 'complete'
      })

      useAIStore.getState().clearGeneratedPosts()

      const state = useAIStore.getState()
      expect(state.generationStatus).toBe('idle')
    })

    it('should clear content when streaming is in progress', () => {
      useAIStore.setState({
        generatedPosts: {
          youtube: 'Partial content...',
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

      useAIStore.getState().clearGeneratedPosts()

      const state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('')
      expect(state.streamingStatus.youtube).toBe('idle')
      expect(state.generationStatus).toBe('idle')
    })
  })

  describe('Generated Posts - Integration with Generation Flow', () => {
    it('should handle complete streaming workflow', () => {
      // Initial state
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
        generationStatus: 'idle'
      })

      // Start generation
      useAIStore.getState().setGenerationStatus('generating')
      useAIStore.getState().setStreamingStatus('youtube', 'streaming')

      // Stream chunks
      useAIStore.getState().appendStreamChunk('youtube', 'Check out ')
      useAIStore.getState().appendStreamChunk('youtube', 'this amazing ')
      useAIStore.getState().appendStreamChunk('youtube', 'video!')

      let state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('Check out this amazing video!')
      expect(state.streamingStatus.youtube).toBe('streaming')

      // Complete streaming
      useAIStore.getState().setStreamingStatus('youtube', 'complete')
      useAIStore.getState().setGenerationStatus('complete')

      state = useAIStore.getState()
      expect(state.streamingStatus.youtube).toBe('complete')
      expect(state.generationStatus).toBe('complete')

      // Content persists
      expect(state.generatedPosts.youtube).toBe('Check out this amazing video!')

      // Clear content
      useAIStore.getState().clearGeneratedPosts()

      state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('')
      expect(state.streamingStatus.youtube).toBe('idle')
      expect(state.generationStatus).toBe('idle')
    })

    it('should handle parallel streaming for multiple platforms', () => {
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
        }
      })

      // Start streaming for all platforms
      useAIStore.getState().setStreamingStatus('youtube', 'streaming')
      useAIStore.getState().setStreamingStatus('twitter', 'streaming')
      useAIStore.getState().setStreamingStatus('linkedin', 'streaming')

      // Stream content to each platform
      useAIStore.getState().appendStreamChunk('youtube', 'YouTube: ')
      useAIStore.getState().appendStreamChunk('twitter', 'Twitter: ')
      useAIStore.getState().appendStreamChunk('linkedin', 'LinkedIn: ')

      useAIStore.getState().appendStreamChunk('youtube', 'Full description')
      useAIStore.getState().appendStreamChunk('twitter', 'Short tweet')
      useAIStore.getState().appendStreamChunk('linkedin', 'Professional post')

      const state = useAIStore.getState()
      expect(state.generatedPosts.youtube).toBe('YouTube: Full description')
      expect(state.generatedPosts.twitter).toBe('Twitter: Short tweet')
      expect(state.generatedPosts.linkedin).toBe('LinkedIn: Professional post')

      // Complete all streams
      useAIStore.getState().setStreamingStatus('youtube', 'complete')
      useAIStore.getState().setStreamingStatus('twitter', 'complete')
      useAIStore.getState().setStreamingStatus('linkedin', 'complete')

      const finalState = useAIStore.getState()
      expect(finalState.streamingStatus.youtube).toBe('complete')
      expect(finalState.streamingStatus.twitter).toBe('complete')
      expect(finalState.streamingStatus.linkedin).toBe('complete')
    })
  })
})
