/**
 * File IPC Handlers
 * Handles file import and thumbnail generation requests from renderer
 */

import { ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { importVideoFile } from '../services/file.service'
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

      // Import file with validation and transcoding to ProRes intermediate
      const metadata = await importVideoFile(filePath)

      // Generate thumbnail
      let thumbnail: string | undefined
      try {
        thumbnail = await generateThumbnail(filePath, 0)
      } catch (error) {
        console.warn('[Main] Thumbnail generation failed:', error)
        // Continue without thumbnail - not critical
      }

      // Create media file object with intermediate path
      const mediaFile: MediaFile = {
        id: generateId(),
        path: filePath,
        name: path.basename(filePath),
        format: metadata.format,
        duration: metadata.duration,
        resolution: metadata.resolution,
        size: metadata.size,
        thumbnail,
        intermediatePath: metadata.intermediatePath || undefined,
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

/**
 * Handle save-file-dialog IPC request
 * Opens native save dialog for export location
 */
ipcMain.handle(
  'save-file-dialog',
  async (
    _,
    options?: { defaultPath?: string; filters?: Electron.FileFilter[] }
  ): Promise<IPCResponse<string | null>> => {
    try {
      console.log('[Main] Opening save file dialog')

      const result = await dialog.showSaveDialog({
        title: 'Export Video',
        defaultPath: options?.defaultPath,
        filters: options?.filters || [{ name: 'MP4 Video', extensions: ['mp4'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      })

      if (result.canceled || !result.filePath) {
        return {
          success: true,
          data: null
        }
      }

      console.log('[Main] Selected save path:', result.filePath)

      return {
        success: true,
        data: result.filePath
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[Main] Save dialog failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

/**
 * Handle open-file-location IPC request
 * Opens the file in the system file manager and selects it
 */
ipcMain.handle(
  'open-file-location',
  async (_, { filePath }: { filePath: string }): Promise<IPCResponse<boolean>> => {
    try {
      console.log('[Main] Opening file location:', filePath)

      // Show the file in its folder
      shell.showItemInFolder(filePath)

      return {
        success: true,
        data: true
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[Main] Failed to open file location:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

console.log('[Main] File IPC handlers registered')
