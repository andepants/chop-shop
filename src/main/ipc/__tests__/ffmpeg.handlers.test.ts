/**
 * FFmpeg IPC Handlers Tests
 * Tests for IPC communication between renderer and main process
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock functions
const mockIpcMainHandle = vi.fn()
const mockTestExport = vi.fn()

// Mock electron module
vi.mock('electron', () => ({
  ipcMain: {
    handle: (...args: any[]) => mockIpcMainHandle(...args)
  }
}))

// Mock ffmpeg service
vi.mock('../../services/ffmpeg.service', () => ({
  testExport: (...args: any[]) => mockTestExport(...args),
  FFmpegError: class FFmpegError extends Error {
    constructor(
      message: string,
      public code: string
    ) {
      super(message)
      this.name = 'FFmpegError'
    }
  },
  FFmpegErrorCode: {
    UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    EXECUTION_FAILED: 'EXECUTION_FAILED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  }
}))

// Import after mocks
import { registerFFmpegHandlers, IPCResponse } from '../ffmpeg.handlers'
import { FFmpegError, FFmpegErrorCode } from '../../services/ffmpeg.service'

describe('ffmpeg.handlers', () => {
  let testExportHandler: (event: any, inputPath: string, outputPath: string) => Promise<IPCResponse>

  beforeEach(() => {
    vi.clearAllMocks()

    // Call register to set up handlers
    registerFFmpegHandlers()

    // Extract the handler function from the mock call
    const handleCall = mockIpcMainHandle.mock.calls.find((call) => call[0] === 'test-export')
    if (handleCall) {
      testExportHandler = handleCall[1]
    }
  })

  describe('registerFFmpegHandlers', () => {
    it('registers test-export IPC handler', () => {
      expect(mockIpcMainHandle).toHaveBeenCalledWith('test-export', expect.any(Function))
    })
  })

  describe('test-export handler', () => {
    it('returns success response when export succeeds (AC: #3)', async () => {
      mockTestExport.mockResolvedValue(undefined)

      const response = await testExportHandler(
        null,
        '/input/video.mov',
        '/output/video.mp4'
      )

      expect(mockTestExport).toHaveBeenCalledWith('/input/video.mov', '/output/video.mp4')
      expect(response).toEqual({
        success: true,
        data: { outputPath: '/output/video.mp4' }
      })
    })

    it('returns error response when FFmpegError is thrown (AC: #5)', async () => {
      const error = new FFmpegError('Input file not found', FFmpegErrorCode.FILE_NOT_FOUND)
      mockTestExport.mockRejectedValue(error)

      const response = await testExportHandler(
        null,
        '/missing/video.mov',
        '/output/video.mp4'
      )

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Input file not found',
          code: FFmpegErrorCode.FILE_NOT_FOUND
        }
      })
    })

    it('handles FFmpegError with UNSUPPORTED_FORMAT code', async () => {
      const error = new FFmpegError('Unsupported video format', FFmpegErrorCode.UNSUPPORTED_FORMAT)
      mockTestExport.mockRejectedValue(error)

      const response = await testExportHandler(
        null,
        '/input/video.webm',
        '/output/video.mp4'
      )

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Unsupported video format',
          code: FFmpegErrorCode.UNSUPPORTED_FORMAT
        }
      })
    })

    it('handles FFmpegError with PERMISSION_DENIED code', async () => {
      const error = new FFmpegError(
        'Permission denied for output file',
        FFmpegErrorCode.PERMISSION_DENIED
      )
      mockTestExport.mockRejectedValue(error)

      const response = await testExportHandler(
        null,
        '/input/video.mov',
        '/restricted/output.mp4'
      )

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Permission denied for output file',
          code: FFmpegErrorCode.PERMISSION_DENIED
        }
      })
    })

    it('handles generic Error objects', async () => {
      const error = new Error('Something went wrong')
      mockTestExport.mockRejectedValue(error)

      const response = await testExportHandler(
        null,
        '/input/video.mov',
        '/output/video.mp4'
      )

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Something went wrong',
          code: 'UNKNOWN_ERROR'
        }
      })
    })

    it('handles non-Error thrown values', async () => {
      mockTestExport.mockRejectedValue('string error')

      const response = await testExportHandler(
        null,
        '/input/video.mov',
        '/output/video.mp4'
      )

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Unknown error occurred',
          code: 'UNKNOWN_ERROR'
        }
      })
    })

    it('calls testExport with correct parameters', async () => {
      mockTestExport.mockResolvedValue(undefined)

      await testExportHandler(
        null,
        '/path/to/input.mp4',
        '/path/to/output.mp4'
      )

      expect(mockTestExport).toHaveBeenCalledTimes(1)
      expect(mockTestExport).toHaveBeenCalledWith('/path/to/input.mp4', '/path/to/output.mp4')
    })
  })
})
