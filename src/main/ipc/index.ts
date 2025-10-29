/**
 * IPC Handlers Registration
 * Central registration point for all IPC handlers
 */
import { registerFFmpegHandlers } from './ffmpeg.handlers'
import { registerAIHandlers } from './ai.handlers'
import { registerClipboardHandlers } from './clipboard.handlers'
import './file.handlers' // File import/export handlers (self-registering)
import './transcode.handlers' // Transcode handlers (self-registering)
import './recording.handlers' // Recording handlers (self-registering)

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers(): void {
  console.log('[Main] Registering IPC handlers...')

  registerFFmpegHandlers()
  registerAIHandlers()
  registerClipboardHandlers()

  console.log('[Main] All IPC handlers registered successfully')
}
