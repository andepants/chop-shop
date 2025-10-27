/**
 * Shared type definitions for the application
 * Used across main, renderer, and preload processes
 */

/**
 * Standard IPC response format
 * All IPC handlers must return this format for consistency
 *
 * @template T - The type of data being returned
 */
export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * IPC channel names
 * Using kebab-case naming convention
 */
export const IPC_CHANNELS = {
  PING: 'ping',
  PONG: 'pong',
  IMPORT_FILE: 'import-file',
  GENERATE_THUMBNAIL: 'generate-thumbnail',
  OPEN_FILE_DIALOG: 'open-file-dialog'
} as const

export type IPCChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/**
 * Media file metadata
 */
export interface MediaFile {
  id: string
  path: string
  name: string
  format: string
  duration: number // in seconds
  resolution: {
    width: number
    height: number
  }
  size: number // in bytes
  thumbnail?: string // data URL or file path
  createdAt: number // timestamp
}

/**
 * Video file validation result
 */
export interface VideoMetadata {
  duration: number
  resolution: {
    width: number
    height: number
  }
  format: string
  size: number
  hasVideo: boolean
  hasAudio: boolean
}
