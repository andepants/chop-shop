/**
 * Audio Extractor Service Tests
 *
 * Unit tests for audio extraction functionality including:
 * - Timeline validation
 * - Audio extraction from clips
 * - Audio concatenation
 * - FFmpeg command generation
 * - Error handling
 *
 * Story 6.3: Audio Extraction & Transcription Service (Whisper API)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioExtractorService, type TimelineClip } from '../audio-extractor.service'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { spawn } from 'child_process'

// Mock child_process spawn
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

// Mock fs/promises
vi.mock('fs/promises')

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp')
}))

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/local/bin/ffmpeg'
}))

describe('AudioExtractorService', () => {
  let service: AudioExtractorService
  const mockTempDir = '/tmp/chop-shop/ai-audio'

  beforeEach(() => {
    service = new AudioExtractorService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('extractAudioFromTimeline', () => {
    it('should throw error if no clips provided', async () => {
      await expect(service.extractAudioFromTimeline([])).rejects.toThrow(
        'No clips found on timeline'
      )
    })

    it('should throw error if no clips have audio', async () => {
      const clips: TimelineClip[] = [
        {
          id: '1',
          sourceFile: '/path/to/video1.mp4',
          intermediatePath: '/path/to/intermediate1.mp4',
          startTime: 0,
          duration: 10,
          trimIn: 0,
          trimOut: 0,
          hasAudio: false
        }
      ]

      await expect(service.extractAudioFromTimeline(clips)).rejects.toThrow(
        'No audio tracks found'
      )
    })

    it('should extract and concatenate audio from multiple clips', async () => {
      const clips: TimelineClip[] = [
        {
          id: '1',
          sourceFile: '/path/to/video1.mp4',
          intermediatePath: '/path/to/intermediate1.mp4',
          startTime: 0,
          duration: 10,
          trimIn: 0,
          trimOut: 0,
          hasAudio: true
        },
        {
          id: '2',
          sourceFile: '/path/to/video2.mp4',
          intermediatePath: '/path/to/intermediate2.mp4',
          startTime: 10,
          duration: 15,
          trimIn: 0,
          trimOut: 0,
          hasAudio: true
        }
      ]

      // Mock fs operations
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024000 } as any)
      vi.mocked(fs.rename).mockResolvedValue(undefined)

      // Mock FFmpeg processes
      let callCount = 0
      vi.mocked(spawn).mockImplementation((() => {
        callCount++
        const mockProcess = {
          stdout: {
            on: vi.fn((event, callback) => {
              if (event === 'data' && callCount === 3) {
                // Duration call (ffprobe)
                callback(Buffer.from('25.0\n'))
              }
            })
          },
          stderr: {
            on: vi.fn()
          },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              callback(0) // Success
            }
          })
        }
        return mockProcess as any
      }) as any)

      const result = await service.extractAudioFromTimeline(clips)

      expect(result).toBeDefined()
      expect(result.fileSize).toBe(1024000)
      expect(result.duration).toBe(25.0)
      expect(fs.mkdir).toHaveBeenCalledWith(mockTempDir, { recursive: true })
      expect(spawn).toHaveBeenCalledTimes(3) // 2 extractions + 1 duration check
    })

    it('should use intermediate path if available', async () => {
      const clips: TimelineClip[] = [
        {
          id: '1',
          sourceFile: '/path/to/video1.mp4',
          intermediatePath: '/path/to/intermediate1.mp4',
          startTime: 0,
          duration: 10,
          trimIn: 0,
          trimOut: 0,
          hasAudio: true
        }
      ]

      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.stat).mockResolvedValue({ size: 512000 } as any)

      let ffmpegArgs: string[] = []
      vi.mocked(spawn).mockImplementation(((cmd: string, args: string[]) => {
        if (cmd.includes('ffmpeg')) {
          ffmpegArgs = args
        }
        return {
          stdout: {
            on: vi.fn((event, callback) => {
              if (event === 'data') {
                callback(Buffer.from('10.0\n'))
              }
            })
          },
          stderr: {
            on: vi.fn()
          },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              callback(0)
            }
          })
        } as any
      }) as any)

      await service.extractAudioFromTimeline(clips)

      // Should use intermediatePath
      expect(ffmpegArgs).toContain('/path/to/intermediate1.mp4')
    })

    it('should handle FFmpeg extraction failure', async () => {
      const clips: TimelineClip[] = [
        {
          id: '1',
          sourceFile: '/path/to/video1.mp4',
          intermediatePath: '/path/to/intermediate1.mp4',
          startTime: 0,
          duration: 10,
          trimIn: 0,
          trimOut: 0,
          hasAudio: true
        }
      ]

      vi.mocked(fs.mkdir).mockResolvedValue(undefined)

      // Mock FFmpeg failure
      vi.mocked(spawn).mockReturnValue({
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('FFmpeg error'))
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1) // Error code
          }
        })
      } as any)

      await expect(service.extractAudioFromTimeline(clips)).rejects.toThrow(
        'Audio extraction failed'
      )
    })
  })

  describe('cleanupAudioFile', () => {
    it('should delete audio file', async () => {
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      await service.cleanupAudioFile('/tmp/test-audio.mp3')

      expect(fs.unlink).toHaveBeenCalledWith('/tmp/test-audio.mp3')
    })

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error('File not found'))

      // Should not throw
      await expect(service.cleanupAudioFile('/tmp/missing.mp3')).resolves.toBeUndefined()
    })
  })

  describe('cleanupOrphanedFiles', () => {
    it('should delete old files', async () => {
      const now = Date.now()
      const oldFileTime = now - 7200000 // 2 hours ago

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readdir).mockResolvedValue(['old-file.mp3', 'recent-file.mp3'] as any)
      vi.mocked(fs.stat).mockImplementation((filePath) => {
        const isOld = (filePath as string).includes('old-file')
        return Promise.resolve({
          mtimeMs: isOld ? oldFileTime : now
        } as any)
      })
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      await service.cleanupOrphanedFiles(3600000) // 1 hour max age

      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockTempDir, 'old-file.mp3'))
      expect(fs.unlink).not.toHaveBeenCalledWith(path.join(mockTempDir, 'recent-file.mp3'))
    })

    it('should handle missing temp directory gracefully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'))

      // Should not throw
      await expect(service.cleanupOrphanedFiles()).resolves.toBeUndefined()
    })
  })
})
