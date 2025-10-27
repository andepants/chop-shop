import { ElectronAPI } from '@electron-toolkit/preload'
import { IPCResponse } from '../shared/types'

/**
 * Custom API interface exposed to renderer process
 */
export interface API {
  ping: () => Promise<IPCResponse<string>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
