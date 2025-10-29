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
})
