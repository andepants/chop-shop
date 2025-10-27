import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPCResponse, IPC_CHANNELS } from '../shared/types'

/**
 * Custom APIs exposed to renderer process
 * All IPC communication must go through these secure bridges
 */
const api = {
  /**
   * Send a ping to the main process and receive a pong response
   * Used for testing IPC communication
   */
  ping: (): Promise<IPCResponse<string>> => ipcRenderer.invoke(IPC_CHANNELS.PING),

  /**
   * Test FFmpeg export - converts input video to MP4
   * @param inputPath - Path to input video file
   * @param outputPath - Path to output MP4 file
   * @returns Promise with export result
   */
  testExport: (
    inputPath: string,
    outputPath: string
  ): Promise<IPCResponse<{ outputPath: string }>> =>
    ipcRenderer.invoke('test-export', inputPath, outputPath),

  /**
   * Import a video file and extract metadata
   * @param filePath - Absolute path to video file
   * @returns Promise with media file metadata
   */
  importFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FILE, { filePath }),

  /**
   * Generate thumbnail from video file
   * @param filePath - Absolute path to video file
   * @param timestamp - Time in seconds (default: 0)
   * @returns Promise with thumbnail data URL
   */
  generateThumbnail: (filePath: string, timestamp?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_THUMBNAIL, { filePath, timestamp }),

  /**
   * Open native file picker dialog for video selection
   * @returns Promise with array of selected file paths
   */
  openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
