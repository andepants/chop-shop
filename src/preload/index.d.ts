import { ElectronAPI } from '@electron-toolkit/preload'
import { IPCResponse, MediaFile } from '../shared/types'

/**
 * Custom API interface exposed to renderer process
 */
export interface API {
  ping: () => Promise<IPCResponse<string>>
  testExport: (
    inputPath: string,
    outputPath: string
  ) => Promise<IPCResponse<{ outputPath: string }>>
  importFile: (filePath: string) => Promise<IPCResponse<MediaFile>>
  importFileFromObject: (file: File) => Promise<IPCResponse<MediaFile>>
  generateThumbnail: (filePath: string, timestamp?: number) => Promise<IPCResponse<string>>
  openFileDialog: () => Promise<IPCResponse<string[]>>
  saveFileDialog: (options?: { defaultPath?: string }) => Promise<IPCResponse<string | null>>
  startExport: (options: {
    clips: unknown[]
    resolution: '720p' | '1080p' | 'source'
    outputPath: string
  }) => Promise<unknown>
  onExportProgress: (callback: (data: { percent: number }) => void) => () => void
  onExportComplete: (callback: (data: { success: boolean; outputPath: string }) => void) => () => void
  onExportError: (callback: (data: { message: string; code: string }) => void) => () => void
  openFileLocation: (filePath: string) => Promise<IPCResponse<boolean>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
