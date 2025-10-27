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
  PONG: 'pong'
} as const

export type IPCChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
