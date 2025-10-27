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
  generateThumbnail: (filePath: string, timestamp?: number) => Promise<IPCResponse<string>>
  openFileDialog: () => Promise<IPCResponse<string[]>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
