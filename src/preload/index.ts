import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPCResponse, IPC_CHANNELS, RecordingMode, RecordingOutputFiles } from '../shared/types'

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
   * Import a video file from a File object (e.g., from drag-and-drop)
   * Uses webUtils.getPathForFile to securely extract the file path
   * @param file - File object from drag-and-drop or file input
   * @returns Promise with media file metadata
   */
  importFileFromObject: (file: File) => {
    const filePath = webUtils.getPathForFile(file)
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FILE, { filePath })
  },

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
  openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG),

  /**
   * Open native save dialog for export location
   * @param options - Optional save dialog options
   * @returns Promise with selected file path or null if canceled
   */
  saveFileDialog: (options?: { defaultPath?: string }) =>
    ipcRenderer.invoke('save-file-dialog', options),

  /**
   * Start timeline export to MP4
   * @param options - Export options (clips, resolution, outputPath)
   * @returns Promise with export result
   */
  startExport: (options: {
    clips: unknown[]
    resolution: '720p' | '1080p' | 'source'
    outputPath: string
  }) => ipcRenderer.invoke('start-export', options),

  /**
   * Start multi-track timeline export to MP4 with overlay compositing
   * @param options - Multi-track export options
   * @returns Promise with export result
   */
  startMultiTrackExport: (options: {
    tracks: {
      main: unknown[]
      overlay: unknown[]
    }
    resolution: '720p' | '1080p' | 'source'
    outputPath: string
    pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    pipSize?: number
  }) => ipcRenderer.invoke('start-multitrack-export', options),

  /**
   * Subscribe to export progress events
   * @param callback - Callback function receiving progress updates
   * @returns Cleanup function to remove the listener
   */
  onExportProgress: (callback: (data: { percent: number }) => void) => {
    const listener = (_event: unknown, data: { percent: number }) => callback(data)
    ipcRenderer.on('export-progress', listener)
    return () => ipcRenderer.removeListener('export-progress', listener)
  },

  /**
   * Subscribe to export complete events
   * @param callback - Callback function called when export completes
   * @returns Cleanup function to remove the listener
   */
  onExportComplete: (callback: (data: { success: boolean; outputPath: string }) => void) => {
    const listener = (_event: unknown, data: { success: boolean; outputPath: string }) =>
      callback(data)
    ipcRenderer.on('export-complete', listener)
    return () => ipcRenderer.removeListener('export-complete', listener)
  },

  /**
   * Subscribe to export error events
   * @param callback - Callback function called when export fails
   * @returns Cleanup function to remove the listener
   */
  onExportError: (callback: (data: { message: string; code: string }) => void) => {
    const listener = (_event: unknown, data: { message: string; code: string }) => callback(data)
    ipcRenderer.on('export-error', listener)
    return () => ipcRenderer.removeListener('export-error', listener)
  },

  /**
   * Open file location in system file manager
   * @param filePath - Path to the file to show
   * @returns Promise with success result
   */
  openFileLocation: (filePath: string) =>
    ipcRenderer.invoke('open-file-location', { filePath }),

  /**
   * Start recording with selected mode
   * @param options - Recording options (mode)
   * @returns Promise with recording start result
   */
  startRecording: (options: { mode: RecordingMode }) =>
    ipcRenderer.invoke('recording:start', options),

  /**
   * Stop recording and get output file paths
   * @returns Promise with output files
   */
  stopRecording: (): Promise<IPCResponse<{ outputFiles: RecordingOutputFiles }>> =>
    ipcRenderer.invoke('recording:stop'),

  /**
   * Get current recording state from main process
   * @returns Promise with recording state
   */
  getRecordingState: () =>
    ipcRenderer.invoke('recording:get-state'),

  /**
   * Reset recording state in main process
   * Used for recovery when renderer and main process states are out of sync
   * @returns Promise with success result
   */
  resetRecordingState: () =>
    ipcRenderer.invoke('recording:reset-state')
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
