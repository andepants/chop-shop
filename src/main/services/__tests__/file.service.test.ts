/**
 * File Service Tests
 * Tests for video file validation and metadata extraction
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MAX_FILE_SIZE } from '../../../shared/constants'
import type { Stats } from 'fs'

// Mock modules
vi.mock('child_process', () => ({
  exec: vi.fn()
}))

vi.mock('fs/promises', () => ({
  access: vi.fn(),
  stat: vi.fn()
}))

vi.mock('ffprobe-static', () => ({
  default: {
    path: '/mock/path/to/ffprobe'
  }
}))

// Import after mocks
import { validateVideoFile } from '../file.service'
import { exec } from 'child_process'
import { access, stat } from 'fs/promises'

describe('file.service', () => {
  const mockExec = vi.mocked(exec)
  const mockAccess = vi.mocked(access)
  const mockStat = vi.mocked(stat)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateVideoFile', () => {
    const validFilePath = '/test/video.mp4'

    it('successfully validates video file with metadata', async () => {
      // Mock file access check
      mockAccess.mockResolvedValueOnce(undefined)

      // Mock file stats (100MB file)
      mockStat.mockResolvedValueOnce({
        size: 100 * 1024 * 1024
      } as Stats)

      // Mock FFprobe output
      const mockFFprobeOutput = JSON.stringify({
        format: {
          duration: '120.5'
        },
        streams: [
          {
            codec_type: 'video',
            width: 1920,
            height: 1080
          },
          {
            codec_type: 'audio'
          }
        ]
      })

      // Mock exec callback
      mockExec.mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: mockFFprobeOutput, stderr: '' })
        return null as any
      })

      const result = await validateVideoFile(validFilePath)

      expect(result).toEqual({
        duration: 120.5,
        resolution: { width: 1920, height: 1080 },
        format: 'MP4',
        size: 100 * 1024 * 1024,
        hasVideo: true,
        hasAudio: true
      })

      // Verify FFprobe was called with bundled binary
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('/mock/path/to/ffprobe'),
        expect.any(Function)
      )
    })

    it('throws error if file is not readable', async () => {
      mockAccess.mockRejectedValueOnce(new Error('EACCES'))

      await expect(validateVideoFile(validFilePath)).rejects.toThrow(
        'Cannot read file. Please check permissions.'
      )
    })

    it('throws error if file exceeds size limit', async () => {
      mockAccess.mockResolvedValueOnce(undefined)

      // Mock file stats (3GB file - exceeds 2GB limit)
      const largeFileSize = 3 * 1024 * 1024 * 1024
      mockStat.mockResolvedValueOnce({
        size: largeFileSize
      } as Stats)

      await expect(validateVideoFile(validFilePath)).rejects.toThrow(
        /File too large.*Maximum supported size is/
      )

      // Verify FFprobe was NOT called
      expect(mockExec).not.toHaveBeenCalled()
    })

    it('includes file size in error message for oversized files', async () => {
      mockAccess.mockResolvedValueOnce(undefined)

      const largeFileSize = 3 * 1024 * 1024 * 1024 // 3GB
      mockStat.mockResolvedValueOnce({
        size: largeFileSize
      } as Stats)

      try {
        await validateVideoFile(validFilePath)
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const message = (error as Error).message
        expect(message).toContain('3072MB') // 3GB in MB
        expect(message).toContain('2048MB') // 2GB max in MB
      }
    })

    it('accepts file at exact size limit', async () => {
      mockAccess.mockResolvedValueOnce(undefined)

      // Mock file at exactly 2GB
      mockStat.mockResolvedValueOnce({
        size: MAX_FILE_SIZE
      } as Stats)

      const mockFFprobeOutput = JSON.stringify({
        format: { duration: '60' },
        streams: [{ codec_type: 'video', width: 1920, height: 1080 }]
      })

      mockExec.mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: mockFFprobeOutput, stderr: '' })
        return null as any
      })

      const result = await validateVideoFile(validFilePath)

      expect(result.size).toBe(MAX_FILE_SIZE)
      expect(mockExec).toHaveBeenCalled()
    })

    it('throws error if no video stream found', async () => {
      mockAccess.mockResolvedValueOnce(undefined)
      mockStat.mockResolvedValueOnce({ size: 1024 } as Stats)

      // Audio-only file
      const mockFFprobeOutput = JSON.stringify({
        format: { duration: '60' },
        streams: [{ codec_type: 'audio' }]
      })

      mockExec.mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: mockFFprobeOutput, stderr: '' })
        return null as any
      })

      await expect(validateVideoFile(validFilePath)).rejects.toThrow(
        'No video stream found'
      )
    })

    it('handles FFprobe execution failure', async () => {
      mockAccess.mockResolvedValueOnce(undefined)
      mockStat.mockResolvedValueOnce({ size: 1024 } as Stats)

      mockExec.mockImplementation((cmd: string, callback: any) => {
        callback(new Error('ffprobe error'), null)
        return null as any
      })

      await expect(validateVideoFile(validFilePath)).rejects.toThrow(
        /Failed to process video/
      )
    })

    it('extracts metadata for video without audio', async () => {
      mockAccess.mockResolvedValueOnce(undefined)
      mockStat.mockResolvedValueOnce({
        size: 50 * 1024 * 1024
      } as Stats)

      const mockFFprobeOutput = JSON.stringify({
        format: { duration: '30.0' },
        streams: [
          {
            codec_type: 'video',
            width: 1280,
            height: 720
          }
        ]
      })

      mockExec.mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: mockFFprobeOutput, stderr: '' })
        return null as any
      })

      const result = await validateVideoFile(validFilePath)

      expect(result.hasVideo).toBe(true)
      expect(result.hasAudio).toBe(false)
    })

    it('handles missing width/height in video stream', async () => {
      mockAccess.mockResolvedValueOnce(undefined)
      mockStat.mockResolvedValueOnce({ size: 1024 } as Stats)

      const mockFFprobeOutput = JSON.stringify({
        format: { duration: '10' },
        streams: [
          {
            codec_type: 'video'
            // width and height missing
          }
        ]
      })

      mockExec.mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: mockFFprobeOutput, stderr: '' })
        return null as any
      })

      const result = await validateVideoFile(validFilePath)

      expect(result.resolution).toEqual({ width: 0, height: 0 })
    })
  })
})
