/**
 * FFmpeg IPC Handlers
 * Exposes FFmpeg operations to renderer process
 */
import { ipcMain } from 'electron'
import {
  testExport,
  executeExport,
  executeMultiTrackExport,
  FFmpegError,
  type ExportOptions,
  type MultiTrackExportOptions
} from '../services/ffmpeg.service'

/**
 * IPC Response format
 */
export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}

/**
 * Register FFmpeg IPC handlers
 */
export function registerFFmpegHandlers(): void {
  /**
   * Test export handler
   * Converts input video to MP4 using H.264
   */
  ipcMain.handle(
    'test-export',
    async (
      _event,
      inputPath: string,
      outputPath: string
    ): Promise<IPCResponse<{ outputPath: string }>> => {
      console.log('[Main] test-export invoked')
      console.log('[Main] Input:', inputPath)
      console.log('[Main] Output:', outputPath)

      try {
        await testExport(inputPath, outputPath)

        return {
          success: true,
          data: { outputPath }
        }
      } catch (error) {
        console.error('[Main] test-export failed:', error)

        if (error instanceof FFmpegError) {
          return {
            success: false,
            error: {
              message: error.message,
              code: error.code
            }
          }
        }

        return {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            code: 'UNKNOWN_ERROR'
          }
        }
      }
    }
  )

  /**
   * Start export handler
   * Exports timeline clips to MP4 with progress tracking
   */
  ipcMain.handle(
    'start-export',
    async (event, options: ExportOptions): Promise<IPCResponse<{ outputPath: string }>> => {
      console.log('[Main] start-export invoked')
      console.log('[Main] Clips:', options.clips?.length)
      console.log('[Main] Resolution:', options.resolution)
      console.log('[Main] Output:', options.outputPath)

      // Validate inputs
      if (!options.clips || options.clips.length === 0) {
        return {
          success: false,
          error: {
            message: 'No clips to export',
            code: 'INVALID_INPUT'
          }
        }
      }

      if (!options.resolution) {
        return {
          success: false,
          error: {
            message: 'Resolution is required',
            code: 'INVALID_INPUT'
          }
        }
      }

      if (!options.outputPath) {
        return {
          success: false,
          error: {
            message: 'Output path is required',
            code: 'INVALID_INPUT'
          }
        }
      }

      try {
        // Track last progress to throttle events (max 10Hz = 100ms)
        let lastProgressTime = 0
        const PROGRESS_THROTTLE_MS = 100

        // Execute export with progress callback
        const result = await executeExport(options, (percent) => {
          const now = Date.now()
          if (now - lastProgressTime >= PROGRESS_THROTTLE_MS) {
            event.sender.send('export-progress', { percent })
            lastProgressTime = now
          }
        })

        // Send completion event
        event.sender.send('export-complete', {
          success: true,
          outputPath: result.outputPath
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('[Main] Export failed:', error)

        // Determine user-friendly error message
        let errorMessage = 'Export failed. Please try again.'
        let errorCode = 'EXPORT_FAILED'

        if (error instanceof FFmpegError) {
          errorMessage = error.message
          errorCode = error.code

          // Map specific errors to user-friendly messages
          if (error.message.includes('Permission denied')) {
            errorMessage = 'Export failed. Invalid output location.'
          } else if (error.message.includes('ENOSPC') || error.message.includes('disk')) {
            errorMessage = 'Export failed. Check disk space and try again.'
          }
        }

        // Send error event
        event.sender.send('export-error', {
          message: errorMessage,
          code: errorCode
        })

        return {
          success: false,
          error: {
            message: errorMessage,
            code: errorCode
          }
        }
      }
    }
  )

  /**
   * Multi-track export handler
   * Exports multi-track timeline with overlay compositing
   */
  ipcMain.handle(
    'start-multitrack-export',
    async (event, options: MultiTrackExportOptions): Promise<IPCResponse<{ outputPath: string }>> => {
      console.log('[Main] start-multitrack-export invoked')
      console.log('[Main] Track 1 clips:', options.tracks?.main?.length)
      console.log('[Main] Track 2 clips:', options.tracks?.overlay?.length)
      console.log('[Main] Resolution:', options.resolution)
      console.log('[Main] Output:', options.outputPath)

      // Validate inputs
      if (!options.tracks?.main || options.tracks.main.length === 0) {
        return {
          success: false,
          error: {
            message: 'Track 1 must have at least one clip',
            code: 'INVALID_INPUT'
          }
        }
      }

      if (!options.resolution) {
        return {
          success: false,
          error: {
            message: 'Resolution is required',
            code: 'INVALID_INPUT'
          }
        }
      }

      if (!options.outputPath) {
        return {
          success: false,
          error: {
            message: 'Output path is required',
            code: 'INVALID_INPUT'
          }
        }
      }

      try {
        // Track last progress to throttle events (max 10Hz = 100ms)
        let lastProgressTime = 0
        const PROGRESS_THROTTLE_MS = 100

        // Execute multi-track export with progress callback
        const result = await executeMultiTrackExport(options, (percent) => {
          const now = Date.now()
          if (now - lastProgressTime >= PROGRESS_THROTTLE_MS) {
            event.sender.send('export-progress', { percent })
            lastProgressTime = now
          }
        })

        // Send completion event
        event.sender.send('export-complete', {
          success: true,
          outputPath: result.outputPath
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('[Main] Multi-track export failed:', error)

        // Determine user-friendly error message
        let errorMessage = 'Multi-track export failed. Please try again.'
        let errorCode = 'EXPORT_FAILED'

        if (error instanceof FFmpegError) {
          errorMessage = error.message
          errorCode = error.code

          // Map specific errors to user-friendly messages
          if (error.message.includes('Permission denied')) {
            errorMessage = 'Export failed. Invalid output location.'
          } else if (error.message.includes('ENOSPC') || error.message.includes('disk')) {
            errorMessage = 'Export failed. Check disk space and try again.'
          }
        }

        // Send error event
        event.sender.send('export-error', {
          message: errorMessage,
          code: errorCode
        })

        return {
          success: false,
          error: {
            message: errorMessage,
            code: errorCode
          }
        }
      }
    }
  )

  console.log('[Main] FFmpeg IPC handlers registered')
}
