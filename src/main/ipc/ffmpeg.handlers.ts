/**
 * FFmpeg IPC Handlers
 * Exposes FFmpeg operations to renderer process
 */
import { ipcMain } from 'electron'
import { testExport, FFmpegError } from '../services/ffmpeg.service'

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

  console.log('[Main] FFmpeg IPC handlers registered')
}
