import { ElectronAPI } from '@electron-toolkit/preload'
import { IPCResponse, MediaFile, RecordingMode, RecordingOutputFiles } from '../shared/types'

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
  startMultiTrackExport: (options: {
    tracks: {
      main: unknown[]
      overlay: unknown[]
    }
    resolution: '720p' | '1080p' | 'source'
    outputPath: string
    pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    pipSize?: number
  }) => Promise<unknown>
  onExportProgress: (callback: (data: { percent: number }) => void) => () => void
  onExportComplete: (callback: (data: { success: boolean; outputPath: string }) => void) => () => void
  onExportError: (callback: (data: { message: string; code: string }) => void) => () => void
  openFileLocation: (filePath: string) => Promise<IPCResponse<boolean>>
  startRecording: (options: { mode: RecordingMode }) => Promise<IPCResponse<{ success: boolean }>>
  stopRecording: () => Promise<IPCResponse<{ outputFiles: RecordingOutputFiles }>>
  getRecordingState: () => Promise<IPCResponse<{ isRecording: boolean; currentMode: RecordingMode | null }>>
  resetRecordingState: () => Promise<IPCResponse<{ success: boolean }>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
