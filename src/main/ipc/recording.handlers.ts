/**
 * Recording IPC Handlers
 * Handles recording start/stop requests and screen source requests from renderer
 */

import { ipcMain } from 'electron'
import type { IPCResponse, RecordingMode, RecordingOutputFiles } from '../../shared/types'
import { recordingService, RecordingError } from '../services/recording.service'

/**
 * Get screen source for recording
 * Returns primary screen sourceId for renderer to use with getUserMedia
 */
ipcMain.handle(
  'recording:get-screen-source',
  async (): Promise<IPCResponse<{ sourceId: string }>> => {
    try {
      console.log('[Main] Screen source requested')

      const primaryScreen = await recordingService.getPrimaryScreen()

      return {
        success: true,
        data: {
          sourceId: primaryScreen.id
        }
      }
    } catch (error) {
      console.error('[Main] Failed to get screen source:', error)

      if (error instanceof RecordingError) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get screen source'
      }
    }
  }
)

/**
 * Handle recording:start IPC request
 * Starts recording coordination in main process
 * Renderer will handle actual MediaRecorder capture
 */
ipcMain.handle(
  'recording:start',
  async (_, { mode }: { mode: RecordingMode }): Promise<IPCResponse<{ success: boolean }>> => {
    try {
      console.log('[Main] Recording start requested with mode:', mode)

      await recordingService.startRecording(mode)

      return {
        success: true,
        data: { success: true }
      }
    } catch (error) {
      console.error('[Main] Failed to start recording:', error)

      if (error instanceof RecordingError) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }
    }
  }
)

/**
 * Handle recording:stop IPC request
 * Receives recording data from renderer and saves to file
 */
ipcMain.handle(
  'recording:stop',
  async (_, { recordingData }: { recordingData: Uint8Array }): Promise<IPCResponse<{ outputFiles: RecordingOutputFiles; duration?: number }>> => {
    try {
      console.log('[Main] Recording stop requested with data size:', recordingData.length)

      // Convert Uint8Array to Buffer
      const buffer = Buffer.from(recordingData)

      const output = await recordingService.completeRecording(buffer)

      const outputFiles: RecordingOutputFiles = {}
      if (output.files.screen) {
        outputFiles.screen = output.files.screen.path
      }
      if (output.files.webcam) {
        outputFiles.webcam = output.files.webcam.path
      }

      return {
        success: true,
        data: {
          outputFiles,
          duration: output.metadata.totalDuration
        }
      }
    } catch (error) {
      console.error('[Main] Failed to stop recording:', error)

      if (error instanceof RecordingError) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      }
    }
  }
)

/**
 * Get current recording state from main process
 * Used to synchronize state between renderer and main process
 */
ipcMain.handle(
  'recording:get-state',
  async (): Promise<IPCResponse<{ isRecording: boolean; currentMode: RecordingMode | null }>> => {
    try {
      console.log('[Main] Recording state requested')

      const state = recordingService.getRecordingState()

      return {
        success: true,
        data: {
          isRecording: state.isRecording,
          currentMode: state.currentMode
        }
      }
    } catch (error) {
      console.error('[Main] Failed to get recording state:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recording state'
      }
    }
  }
)

/**
 * Force reset recording state in main process
 * Used for recovery when renderer and main process states are out of sync
 */
ipcMain.handle(
  'recording:reset-state',
  async (): Promise<IPCResponse<{ success: boolean }>> => {
    try {
      console.log('[Main] Recording state reset requested')

      recordingService.resetState()

      return {
        success: true,
        data: { success: true }
      }
    } catch (error) {
      console.error('[Main] Failed to reset recording state:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset recording state'
      }
    }
  }
)

console.log('[Main] Recording IPC handlers registered')
