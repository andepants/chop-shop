/**
 * Transcode IPC Handlers
 * Handles intermediate codec conversion requests from renderer
 * Provides progress updates during transcode operations
 */

import { ipcMain, BrowserWindow } from 'electron'
import { importVideoFile } from '../services/file.service'
import { getCacheDirectory } from '../services/transcode.service'
import { readdir, stat, rm } from 'fs/promises'
import { join } from 'path'
import type { IPCResponse, VideoMetadata } from '../../shared/types'

/**
 * Handle import-with-transcode IPC request
 * Validates video file and transcodes to intermediate codec with progress updates
 */
ipcMain.handle(
  'import-with-transcode',
  async (
    event,
    { filePath }: { filePath: string }
  ): Promise<IPCResponse<VideoMetadata>> => {
    try {
      console.log('[Main] Importing with transcode:', filePath)

      // Get the window to send progress events
      const window = BrowserWindow.fromWebContents(event.sender)

      // Import file with transcode and progress callbacks
      const metadata = await importVideoFile(filePath, (progress) => {
        // Send progress event to renderer
        if (window && !window.isDestroyed()) {
          window.webContents.send('transcode-progress', progress)
          console.log(
            `[Main] Transcode progress: ${progress.percent}% - ${progress.file}`
          )
        }
      })

      console.log('[Main] Import with transcode complete:', metadata)

      return {
        success: true,
        data: metadata
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Transcode failed'
      console.error('[Main] Import with transcode failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

/**
 * Handle clear-cache IPC request
 * Deletes all intermediate files from cache directory
 */
ipcMain.handle(
  'clear-cache',
  async (): Promise<IPCResponse<{ freedSpace: number }>> => {
    try {
      console.log('[Main] Clearing transcode cache...')

      const cacheDir = getCacheDirectory()
      let freedSpace = 0

      // Read all files in cache directory
      const files = await readdir(cacheDir)

      // Delete each file and track freed space
      for (const file of files) {
        const filePath = join(cacheDir, file)
        try {
          const stats = await stat(filePath)
          freedSpace += stats.size
          await rm(filePath, { force: true })
          console.log('[Main] Deleted cache file:', file)
        } catch (error) {
          console.warn('[Main] Failed to delete cache file:', file, error)
        }
      }

      console.log(
        `[Main] Cache cleared. Freed ${(freedSpace / 1024 / 1024).toFixed(2)}MB`
      )

      return {
        success: true,
        data: { freedSpace }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to clear cache'
      console.error('[Main] Cache clear failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

/**
 * Handle get-cache-size IPC request
 * Returns total size of cache directory
 */
ipcMain.handle(
  'get-cache-size',
  async (): Promise<IPCResponse<{ size: number; fileCount: number }>> => {
    try {
      console.log('[Main] Getting cache size...')

      const cacheDir = getCacheDirectory()
      let size = 0
      let fileCount = 0

      try {
        const files = await readdir(cacheDir)
        fileCount = files.length

        for (const file of files) {
          const filePath = join(cacheDir, file)
          try {
            const stats = await stat(filePath)
            size += stats.size
          } catch (error) {
            console.warn('[Main] Failed to stat cache file:', file, error)
          }
        }
      } catch (error) {
        // Cache directory doesn't exist yet
        console.log('[Main] Cache directory not found, returning 0')
      }

      console.log(
        `[Main] Cache size: ${(size / 1024 / 1024).toFixed(2)}MB (${fileCount} files)`
      )

      return {
        success: true,
        data: { size, fileCount }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get cache size'
      console.error('[Main] Get cache size failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

console.log('[Main] Transcode IPC handlers registered')
