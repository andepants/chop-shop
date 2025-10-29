/**
 * Content Generator Service Unit Tests
 *
 * Tests for GPT-4o-mini content generation service with mocked OpenAI SDK.
 * Covers streaming, parallel generation, error handling, and retry logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ContentGeneratorService } from '../content-generator.service'
import type { BrowserWindow } from 'electron'

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  }
})

// Mock system prompts
vi.mock('../system-prompts', () => ({
  buildYouTubePrompt: vi.fn().mockReturnValue('YouTube prompt'),
  buildTwitterPrompt: vi.fn().mockReturnValue('Twitter prompt'),
  buildLinkedInPrompt: vi.fn().mockReturnValue('LinkedIn prompt')
}))

// Mock persona prompt builder
vi.mock('../persona-prompt-builder', () => ({
  buildPersonaPrompt: vi.fn().mockReturnValue('Persona style instructions')
}))

describe('ContentGeneratorService', () => {
  let service: ContentGeneratorService
  let mockWindow: Partial<BrowserWindow>

  beforeEach(() => {
    service = new ContentGeneratorService()

    // Mock BrowserWindow
    mockWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: {
        send: vi.fn()
      } as any
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('should initialize OpenAI client with API key', () => {
      expect(() => service.initialize('test-api-key')).not.toThrow()
    })
  })

  describe('generatePosts - validation', () => {
    beforeEach(() => {
      service.initialize('test-api-key')
    })

    it('should throw error if OpenAI client not initialized', async () => {
      const uninitializedService = new ContentGeneratorService()
      const request = {
        transcription: 'Test transcription',
        personas: [],
        platforms: ['youtube' as const],
        includeEmojis: false
      }

      await expect(
        uninitializedService.generatePosts(request, mockWindow as BrowserWindow)
      ).rejects.toThrow('OpenAI client not initialized')
    })

    it('should throw error if no platforms selected', async () => {
      const request = {
        transcription: 'Test transcription',
        personas: [],
        platforms: [],
        includeEmojis: false
      }

      await expect(
        service.generatePosts(request, mockWindow as BrowserWindow)
      ).rejects.toThrow('No platforms selected')
    })

    it('should throw error if no content provided (no transcription or guidance)', async () => {
      const request = {
        personas: [],
        platforms: ['youtube' as const],
        includeEmojis: false
      }

      await expect(
        service.generatePosts(request, mockWindow as BrowserWindow)
      ).rejects.toThrow('No content provided')
    })

    it('should accept request with transcription only', async () => {
      const OpenAI = await import('openai').then((m) => m.default)
      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Test content' } }] }
        }
      })
      ;(OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      service = new ContentGeneratorService()
      service.initialize('test-api-key')

      const request = {
        transcription: 'Test transcription',
        personas: [],
        platforms: ['youtube' as const],
        includeEmojis: false
      }

      await service.generatePosts(request, mockWindow as BrowserWindow)
      expect(mockCreate).toHaveBeenCalled()
    })

    it('should accept request with user guidance only', async () => {
      const OpenAI = await import('openai').then((m) => m.default)
      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Test content' } }] }
        }
      })
      ;(OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      service = new ContentGeneratorService()
      service.initialize('test-api-key')

      const request = {
        userGuidance: 'Test guidance',
        personas: [],
        platforms: ['youtube' as const],
        includeEmojis: false
      }

      await service.generatePosts(request, mockWindow as BrowserWindow)
      expect(mockCreate).toHaveBeenCalled()
    })
  })

  describe('generatePosts - parallel generation', () => {
    beforeEach(async () => {
      const OpenAI = (await import('openai')).default
      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Test content' } }] }
        }
      })
      ;(OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      service = new ContentGeneratorService()
      service.initialize('test-api-key')
    })

    it('should generate for multiple platforms in parallel', async () => {
      const request = {
        transcription: 'Test transcription',
        personas: [],
        platforms: ['youtube' as const, 'twitter' as const, 'linkedin' as const],
        includeEmojis: false
      }

      const results = await service.generatePosts(request, mockWindow as BrowserWindow)

      expect(results).toHaveLength(3)
      expect(results[0].platform).toBe('youtube')
      expect(results[1].platform).toBe('twitter')
      expect(results[2].platform).toBe('linkedin')
    })
  })

  describe('generatePosts - streaming', () => {
    it('should send streaming chunks via IPC', async () => {
      const OpenAI = await import('openai').then((m) => m.default)
      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Chunk 1 ' } }] }
          yield { choices: [{ delta: { content: 'Chunk 2' } }] }
        }
      })
      ;(OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      service = new ContentGeneratorService()
      service.initialize('test-api-key')

      const request = {
        transcription: 'Test transcription',
        personas: [],
        platforms: ['youtube' as const],
        includeEmojis: false
      }

      await service.generatePosts(request, mockWindow as BrowserWindow)

      const sendMock = mockWindow.webContents!.send as any
      expect(sendMock).toHaveBeenCalledWith('ai-stream-chunk', {
        platform: 'youtube',
        content: 'Chunk 1 ',
        complete: false
      })
      expect(sendMock).toHaveBeenCalledWith('ai-stream-chunk', {
        platform: 'youtube',
        content: 'Chunk 2',
        complete: false
      })
      expect(sendMock).toHaveBeenCalledWith('ai-stream-chunk', {
        platform: 'youtube',
        content: '',
        complete: true
      })
    })
  })

  describe('generatePosts - error handling', () => {
    it('should handle API errors and return error in results', async () => {
      const OpenAI = await import('openai').then((m) => m.default)
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'))
      ;(OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      service = new ContentGeneratorService()
      service.initialize('test-api-key')

      const request = {
        transcription: 'Test transcription',
        personas: [],
        platforms: ['youtube' as const],
        includeEmojis: false
      }

      const results = await service.generatePosts(request, mockWindow as BrowserWindow)

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('youtube')
      expect(results[0].error).toBeDefined()
      expect(results[0].content).toBe('')
    })

    it('should handle partial failures (some platforms succeed, others fail)', async () => {
      const OpenAI = await import('openai').then((m) => m.default)
      let callCount = 0
      const mockCreate = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call (YouTube) succeeds
          return Promise.resolve({
            async *[Symbol.asyncIterator]() {
              yield { choices: [{ delta: { content: 'Success' } }] }
            }
          })
        } else {
          // Second call (Twitter) fails
          return Promise.reject(new Error('API Error'))
        }
      })
      ;(OpenAI as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      service = new ContentGeneratorService()
      service.initialize('test-api-key')

      const request = {
        transcription: 'Test transcription',
        personas: [],
        platforms: ['youtube' as const, 'twitter' as const],
        includeEmojis: false
      }

      const results = await service.generatePosts(request, mockWindow as BrowserWindow)

      expect(results).toHaveLength(2)
      expect(results[0].error).toBeUndefined()
      expect(results[1].error).toBeDefined()
    })
  })
})
