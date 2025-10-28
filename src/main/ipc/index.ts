/**
 * IPC Handlers Registration
 * Central registration point for all IPC handlers
 */
import { registerFFmpegHandlers } from './ffmpeg.handlers'
import './file.handlers' // File import/export handlers (self-registering)
import './transcode.handlers' // Transcode handlers (self-registering)

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers(): void {
  console.log('[Main] Registering IPC handlers...')

  registerFFmpegHandlers()

  console.log('[Main] All IPC handlers registered successfully')
}
