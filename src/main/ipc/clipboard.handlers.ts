/**
 * Clipboard IPC Handlers
 * Provides secure clipboard operations using Electron's native clipboard API
 * Avoids permission issues with web Clipboard API in renderer process
 */
import { ipcMain, clipboard } from 'electron'
import { IPCResponse } from '../../shared/types'

/**
 * Register clipboard IPC handlers
 */
export function registerClipboardHandlers(): void {
  /**
   * Write text to system clipboard
   * Uses Electron's native clipboard module for reliable cross-platform support
   */
  ipcMain.handle('clipboard:write-text', async (_event, text: string): Promise<IPCResponse<void>> => {
    try {
      if (typeof text !== 'string') {
        throw new Error('Clipboard text must be a string')
      }

      clipboard.writeText(text)

      return {
        success: true,
        data: undefined,
        message: 'Text copied to clipboard'
      }
    } catch (error) {
      console.error('[Clipboard] Failed to write text:', error)
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to copy text to clipboard'
      }
    }
  })

  /**
   * Read text from system clipboard
   * Useful for paste operations
   */
  ipcMain.handle('clipboard:read-text', async (): Promise<IPCResponse<string>> => {
    try {
      const text = clipboard.readText()

      return {
        success: true,
        data: text,
        message: 'Text read from clipboard'
      }
    } catch (error) {
      console.error('[Clipboard] Failed to read text:', error)
      return {
        success: false,
        data: '',
        error: error instanceof Error ? error.message : 'Failed to read text from clipboard'
      }
    }
  })

  console.log('[Main] Clipboard IPC handlers registered')
}
