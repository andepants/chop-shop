/**
 * File IPC Handlers
 * Handles file import and thumbnail generation requests from renderer
 */

import { ipcMain, dialog } from 'electron'
import path from 'path'
import { validateVideoFile } from '../services/file.service'
import { generateThumbnail } from '../services/thumbnail.service'
import { IPC_CHANNELS, type IPCResponse, type MediaFile } from '../../shared/types'
import { SUPPORTED_FORMATS } from '../../shared/constants'

/**
 * Generate unique ID for media file
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Handle import-file IPC request
 * Validates video file and returns metadata
 */
ipcMain.handle(
  IPC_CHANNELS.IMPORT_FILE,
  async (_, { filePath }: { filePath: string }): Promise<IPCResponse<MediaFile>> => {
    try {
      console.log('[Main] Importing file:', filePath)

      // Validate file and extract metadata
      const metadata = await validateVideoFile(filePath)

      // Generate thumbnail
      let thumbnail: string | undefined
      try {
        thumbnail = await generateThumbnail(filePath, 0)
      } catch (error) {
        console.warn('[Main] Thumbnail generation failed:', error)
        // Continue without thumbnail - not critical
      }

      // Create media file object
      const mediaFile: MediaFile = {
        id: generateId(),
        path: filePath,
        name: path.basename(filePath),
        format: metadata.format,
        duration: metadata.duration,
        resolution: metadata.resolution,
        size: metadata.size,
        thumbnail,
        createdAt: Date.now()
      }

      console.log('[Main] File imported successfully:', mediaFile.name)

      return {
        success: true,
        data: mediaFile
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[Main] Import failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

/**
 * Handle generate-thumbnail IPC request
 * Generates thumbnail for existing video file
 */
ipcMain.handle(
  IPC_CHANNELS.GENERATE_THUMBNAIL,
  async (
    _,
    { filePath, timestamp }: { filePath: string; timestamp?: number }
  ): Promise<IPCResponse<string>> => {
    try {
      console.log('[Main] Generating thumbnail for:', filePath)

      const thumbnail = await generateThumbnail(filePath, timestamp)

      return {
        success: true,
        data: thumbnail
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[Main] Thumbnail generation failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

/**
 * Handle open-file-dialog IPC request
 * Opens native file picker for video selection
 */
ipcMain.handle(
  IPC_CHANNELS.OPEN_FILE_DIALOG,
  async (): Promise<IPCResponse<string[]>> => {
    try {
      console.log('[Main] Opening file picker dialog')

      const result = await dialog.showOpenDialog({
        title: 'Import Video Files',
        filters: [{ name: 'Videos', extensions: [...SUPPORTED_FORMATS] }],
        properties: ['openFile', 'multiSelections']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: true,
          data: []
        }
      }

      console.log('[Main] Selected files:', result.filePaths.length)

      return {
        success: true,
        data: result.filePaths
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[Main] File dialog failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

console.log('[Main] File IPC handlers registered')
