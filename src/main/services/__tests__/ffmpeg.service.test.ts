/**
 * FFmpeg Service Tests
 * Tests for FFmpeg video processing functions
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventEmitter } from 'events'
import type { ChildProcess } from 'child_process'

/**
 * Create a mock child process that extends EventEmitter
 */
function createMockProcess(): ChildProcess {
  const process = new EventEmitter() as ChildProcess
  process.stdout = new EventEmitter() as any
  process.stderr = new EventEmitter() as any
  process.kill = vi.fn()
  return process
}

// Mock functions that will be assigned during setup
let mockProcess: ChildProcess
const mockSpawn = vi.fn()
const mockExistsSync = vi.fn()

// Mock child_process module
vi.mock('child_process', () => ({
  spawn: (...args: any[]) => mockSpawn(...args)
}))

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/mock/path/to/ffmpeg'
}))

// Mock fs module
vi.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args)
}))

// Import the module after mocks are defined
import {
  getFfmpegPath,
  executeFFmpegCommand,
  testExport,
  FFmpegError,
  FFmpegErrorCode
} from '../ffmpeg.service'

describe('ffmpeg.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProcess = createMockProcess()
    mockSpawn.mockReturnValue(mockProcess)
    mockExistsSync.mockReturnValue(true)
  })

  describe('getFfmpegPath (AC: #1)', () => {
    it('returns valid path to ffmpeg-static binary', () => {
      const path = getFfmpegPath()
      expect(path).toBe('/mock/path/to/ffmpeg')
      expect(path).toBeTruthy()
    })
  })

  describe('executeFFmpegCommand (AC: #2, #4)', () => {
    it('executes FFmpeg command successfully with exit code 0', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']

      // Start execution
      const promise = executeFFmpegCommand(args)

      // Simulate successful completion
      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 10)

      await expect(promise).resolves.toBeUndefined()
      expect(mockSpawn).toHaveBeenCalledWith('/mock/path/to/ffmpeg', args)
    })

    it('captures stdout for progress monitoring (AC: #4)', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']
      const mockProgressCallback = vi.fn()

      // Start execution
      const promise = executeFFmpegCommand(args, mockProgressCallback, 100)

      // Simulate FFmpeg stderr progress output
      setTimeout(() => {
        mockProcess.stderr?.emit(
          'data',
          Buffer.from('frame=  120 fps= 30 q=28.0 size=512kB time=00:00:04.00 bitrate=1048.6kbits/s')
        )
      }, 10)

      // Simulate successful completion
      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 20)

      await promise

      expect(mockProgressCallback).toHaveBeenCalled()
      const call = mockProgressCallback.mock.calls[0][0]
      expect(call).toHaveProperty('percent')
      expect(call).toHaveProperty('frame', 120)
      expect(call).toHaveProperty('fps', 30)
      expect(call).toHaveProperty('time', '00:00:04.00')
    })

    it('rejects with FFmpegError on non-zero exit code (AC: #5)', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']

      // Start execution
      const promise = executeFFmpegCommand(args)

      // Simulate FFmpeg error
      setTimeout(() => {
        mockProcess.stderr?.emit('data', Buffer.from('Invalid data found when processing input'))
      }, 10)

      // Simulate failure
      setTimeout(() => {
        mockProcess.emit('close', 1)
      }, 20)

      await expect(promise).rejects.toThrow(FFmpegError)
      await expect(promise).rejects.toMatchObject({
        code: FFmpegErrorCode.UNSUPPORTED_FORMAT,
        message: 'Unsupported video format'
      })
    })

    it('handles process error event (AC: #5)', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']

      // Start execution
      const promise = executeFFmpegCommand(args)

      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn ENOENT'))
      }, 10)

      await expect(promise).rejects.toThrow(FFmpegError)
      await expect(promise).rejects.toMatchObject({
        code: FFmpegErrorCode.EXECUTION_FAILED,
        message: 'spawn ENOENT'
      })
    })
  })

  describe('parseFFmpegError (AC: #5)', () => {
    it('detects unsupported format errors', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']
      const promise = executeFFmpegCommand(args)

      setTimeout(() => {
        mockProcess.stderr?.emit(
          'data',
          Buffer.from('Invalid data found when processing input')
        )
        mockProcess.emit('close', 1)
      }, 10)

      await expect(promise).rejects.toMatchObject({
        code: FFmpegErrorCode.UNSUPPORTED_FORMAT,
        message: 'Unsupported video format'
      })
    })

    it('detects file not found errors', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']
      const promise = executeFFmpegCommand(args)

      setTimeout(() => {
        mockProcess.stderr?.emit(
          'data',
          Buffer.from('input.mp4: No such file or directory')
        )
        mockProcess.emit('close', 1)
      }, 10)

      await expect(promise).rejects.toMatchObject({
        code: FFmpegErrorCode.FILE_NOT_FOUND,
        message: 'Input file not found'
      })
    })

    it('detects permission denied errors', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']
      const promise = executeFFmpegCommand(args)

      setTimeout(() => {
        mockProcess.stderr?.emit('data', Buffer.from('output.mp4: Permission denied'))
        mockProcess.emit('close', 1)
      }, 10)

      await expect(promise).rejects.toMatchObject({
        code: FFmpegErrorCode.PERMISSION_DENIED,
        message: 'Permission denied for output file'
      })
    })
  })

  describe('testExport (AC: #3)', () => {
    it('successfully exports video to MP4', async () => {
      mockExistsSync.mockReturnValue(true)

      const promise = testExport('/input/video.mov', '/output/video.mp4')

      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 10)

      await expect(promise).resolves.toBeUndefined()

      expect(mockSpawn).toHaveBeenCalledWith('/mock/path/to/ffmpeg', [
        '-i',
        '/input/video.mov',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-c:a',
        'aac',
        '-y',
        '/output/video.mp4'
      ])

      // Verify input existence was checked
      expect(mockExistsSync).toHaveBeenCalledWith('/input/video.mov')
    })

    it('throws error if input file does not exist', async () => {
      // Mock input file doesn't exist
      mockExistsSync.mockReturnValueOnce(false)

      await expect(testExport('/missing/video.mov', '/output/video.mp4')).rejects.toMatchObject({
        code: FFmpegErrorCode.FILE_NOT_FOUND,
        message: 'Input file not found: /missing/video.mov'
      })

      // Verify spawn was never called
      expect(mockSpawn).not.toHaveBeenCalled()
    })

    it('throws error if output file is not created', async () => {
      // Input exists, but output doesn't get created
      mockExistsSync
        .mockReturnValueOnce(true) // input exists
        .mockReturnValueOnce(false) // output doesn't exist after FFmpeg

      const promise = testExport('/input/video.mov', '/output/video.mp4')

      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 10)

      await expect(promise).rejects.toMatchObject({
        code: FFmpegErrorCode.EXECUTION_FAILED,
        message: 'Output file was not created'
      })
    })

    it('accepts progress callback for monitoring', async () => {
      mockExistsSync.mockReturnValue(true)
      const mockProgressCallback = vi.fn()

      const promise = testExport('/input/video.mov', '/output/video.mp4', mockProgressCallback)

      // Simulate progress
      setTimeout(() => {
        mockProcess.stderr?.emit(
          'data',
          Buffer.from('frame=  60 fps= 30 time=00:00:02.00 bitrate=512kbits/s')
        )
      }, 10)

      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 20)

      await promise

      expect(mockProgressCallback).toHaveBeenCalled()
    })
  })

  describe('progress parsing (AC: #4)', () => {
    it('parses FFmpeg progress output correctly', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']
      const mockProgressCallback = vi.fn()
      const totalDuration = 100 // 100 seconds

      const promise = executeFFmpegCommand(args, mockProgressCallback, totalDuration)

      // Simulate FFmpeg progress at 4.5 seconds
      setTimeout(() => {
        mockProcess.stderr?.emit(
          'data',
          Buffer.from('frame=  120 fps= 30.5 q=28.0 time=00:00:04.50 bitrate=1048kbits/s')
        )
      }, 10)

      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 20)

      await promise

      expect(mockProgressCallback).toHaveBeenCalled()
      const progress = mockProgressCallback.mock.calls[0][0]
      expect(progress.frame).toBe(120)
      expect(progress.fps).toBe(30.5)
      expect(progress.time).toBe('00:00:04.50')
      expect(progress.percent).toBeCloseTo(4.5, 1) // 4.5 seconds / 100 seconds = 4.5%
    })

    it('handles progress without duration (percent = 0)', async () => {
      const args = ['-i', 'input.mp4', 'output.mp4']
      const mockProgressCallback = vi.fn()

      const promise = executeFFmpegCommand(args, mockProgressCallback) // No totalDuration

      setTimeout(() => {
        mockProcess.stderr?.emit(
          'data',
          Buffer.from('frame=  60 fps= 25 time=00:00:02.00 bitrate=512kbits/s')
        )
      }, 10)

      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 20)

      await promise

      expect(mockProgressCallback).toHaveBeenCalled()
      const progress = mockProgressCallback.mock.calls[0][0]
      expect(progress.percent).toBe(0) // No duration provided, so percent = 0
    })
  })
})
