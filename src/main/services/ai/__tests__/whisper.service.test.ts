/**
 * Whisper Service Tests
 *
 * Unit tests for Whisper API integration including:
 * - API key validation
 * - File size validation
 * - Audio compression
 * - Audio chunking for large files
 * - Error handling (auth, rate limits, network)
 *
 * Story 6.3: Audio Extraction & Transcription Service (Whisper API)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WhisperService, type TranscriptionOptions } from '../whisper.service'
import * as fs from 'fs/promises'
import { spawn } from 'child_process'
import OpenAI from 'openai'

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: vi.fn()
        }
      }
    }))
  }
})

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

// Mock fs/promises
vi.mock('fs/promises')

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/local/bin/ffmpeg'
}))

describe('WhisperService', () => {
  let service: WhisperService
  let mockOpenAI: any

  beforeEach(() => {
    service = new WhisperService()
    vi.clearAllMocks()

    // Get mock OpenAI instance
    mockOpenAI = new OpenAI({ apiKey: 'test-key' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('transcribeAudio', () => {
    const options: TranscriptionOptions = {
      apiKey: 'sk-test-key-123',
      temperature: 0
    }

    it('should throw error if API key is empty', async () => {
      const invalidOptions: TranscriptionOptions = {
        apiKey: '',
        temperature: 0
      }

      await expect(service.transcribeAudio('/path/to/audio.mp3', invalidOptions)).rejects.toThrow(
        'Invalid API key'
      )
    })

    it('should transcribe audio file within size limit', async () => {
      const mockTranscriptionText = 'This is a test transcription.'

      // Mock file size (10MB - within limit)
      vi.mocked(fs.stat).mockResolvedValue({ size: 10 * 1024 * 1024 } as any)

      // Mock file read
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('audio data'))

      // Mock ffprobe for duration
      vi.mocked(spawn).mockReturnValue({
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('30.5\n'))
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0)
          }
        })
      } as any)

      // Mock OpenAI API response
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: mockTranscriptionText
      })

      const result = await service.transcribeAudio('/path/to/audio.mp3', options)

      expect(result.text).toBe(mockTranscriptionText)
      expect(result.duration).toBe(30.5)
      expect(result.wasCompressed).toBe(false)
      expect(result.warning).toBeUndefined()
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          temperature: 0
        })
      )
    })

    it('should compress audio if file exceeds 25MB limit', async () => {
      const mockTranscriptionText = 'Compressed audio transcription.'

      // Mock original file size (30MB - exceeds limit)
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 30 * 1024 * 1024 } as any) // Original
        .mockResolvedValueOnce({ size: 20 * 1024 * 1024 } as any) // Compressed

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('compressed audio data'))

      // Mock FFmpeg compression
      vi.mocked(spawn).mockImplementation((cmd: string) => {
        if (cmd.includes('ffprobe')) {
          // Duration check
          return {
            stdout: {
              on: vi.fn((event, callback) => {
                if (event === 'data') {
                  callback(Buffer.from('45.0\n'))
                }
              })
            },
            on: vi.fn((event, callback) => {
              if (event === 'close') {
                callback(0)
              }
            })
          } as any
        } else {
          // FFmpeg compression
          return {
            stderr: {
              on: vi.fn()
            },
            on: vi.fn((event, callback) => {
              if (event === 'close') {
                callback(0)
              }
            })
          } as any
        }
      })

      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: mockTranscriptionText
      })

      const result = await service.transcribeAudio('/path/to/large-audio.mp3', options)

      expect(result.text).toBe(mockTranscriptionText)
      expect(result.wasCompressed).toBe(true)
      expect(result.warning).toContain('compressed')
      expect(fs.unlink).toHaveBeenCalled() // Compressed file cleaned up
    })

    it('should handle invalid API key error', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 5 * 1024 * 1024 } as any)
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('audio data'))
      vi.mocked(spawn).mockReturnValue({
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('20.0\n'))
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0)
          }
        })
      } as any)

      // Mock API error - invalid key
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(
        new Error('Incorrect API key provided')
      )

      await expect(service.transcribeAudio('/path/to/audio.mp3', options)).rejects.toThrow(
        'Invalid API key'
      )
    })

    it('should handle rate limit error', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 5 * 1024 * 1024 } as any)
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('audio data'))
      vi.mocked(spawn).mockReturnValue({
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('20.0\n'))
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0)
          }
        })
      } as any)

      // Mock API error - rate limit
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(new Error('Rate limit exceeded'))

      await expect(service.transcribeAudio('/path/to/audio.mp3', options)).rejects.toThrow(
        'quota exceeded'
      )
    })

    it('should handle network error', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 5 * 1024 * 1024 } as any)
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('audio data'))
      vi.mocked(spawn).mockReturnValue({
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('20.0\n'))
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0)
          }
        })
      } as any)

      // Mock API error - network
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(new Error('Network timeout'))

      await expect(service.transcribeAudio('/path/to/audio.mp3', options)).rejects.toThrow(
        'Network error'
      )
    })

    it('should chunk large files if compression insufficient', async () => {
      const mockTranscriptionText1 = 'First chunk transcription.'
      const mockTranscriptionText2 = 'Second chunk transcription.'

      // Mock original file: 30MB
      // Mock compressed file: still 26MB (exceeds limit)
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 30 * 1024 * 1024 } as any) // Original
        .mockResolvedValueOnce({ size: 26 * 1024 * 1024 } as any) // Compressed (still too large)

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('chunk audio data'))
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      // Mock FFmpeg operations (compression + chunking)
      let callCount = 0
      vi.mocked(spawn).mockImplementation((cmd: string) => {
        callCount++

        if (cmd.includes('ffprobe')) {
          // Duration check - return 1200 seconds (20 minutes) to force chunking
          return {
            stdout: {
              on: vi.fn((event, callback) => {
                if (event === 'data') {
                  callback(Buffer.from('1200.0\n'))
                }
              })
            },
            on: vi.fn((event, callback) => {
              if (event === 'close') {
                callback(0)
              }
            })
          } as any
        } else {
          // FFmpeg operations (compression or chunking)
          return {
            stderr: {
              on: vi.fn()
            },
            on: vi.fn((event, callback) => {
              if (event === 'close') {
                callback(0)
              }
            })
          } as any
        }
      })

      // Mock OpenAI API - return different transcriptions for each chunk
      mockOpenAI.audio.transcriptions.create
        .mockResolvedValueOnce({ text: mockTranscriptionText1 })
        .mockResolvedValueOnce({ text: mockTranscriptionText2 })

      const result = await service.transcribeAudio('/path/to/very-large-audio.mp3', options)

      expect(result.text).toBe(`${mockTranscriptionText1} ${mockTranscriptionText2}`)
      expect(result.wasCompressed).toBe(true)
      expect(result.warning).toContain('chunks')
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledTimes(2)
    })

    it('should include language parameter if provided', async () => {
      const optionsWithLanguage: TranscriptionOptions = {
        ...options,
        language: 'en'
      }

      vi.mocked(fs.stat).mockResolvedValue({ size: 5 * 1024 * 1024 } as any)
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('audio data'))
      vi.mocked(spawn).mockReturnValue({
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('15.0\n'))
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0)
          }
        })
      } as any)

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'English transcription'
      })

      await service.transcribeAudio('/path/to/audio.mp3', optionsWithLanguage)

      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          language: 'en',
          temperature: 0
        })
      )
    })
  })
})
