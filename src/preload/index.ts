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
    ipcRenderer.invoke('test-export', inputPath, outputPath)
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
