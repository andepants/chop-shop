/**
 * AI IPC Handlers
 *
 * Handles IPC communication between renderer and main process for AI operations.
 * Manages API key storage, retrieval, clearing, and connection testing.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { apiKeyManager } from '../services/ai/api-key-manager.service'
import {
  audioExtractorService,
  type TimelineClip
} from '../services/ai/audio-extractor.service'
import { whisperService } from '../services/ai/whisper.service'
import OpenAI from 'openai'

/**
 * Standard IPC response structure
 */
interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Registers all AI-related IPC handlers
 */
export function registerAIHandlers(): void {
  /**
   * Store an API key securely
   * Channel: ai:store-key
   */
  ipcMain.handle('ai:store-key', async (_event, apiKey: string): Promise<IPCResponse<{ success: boolean }>> => {
    try {
      const result = await apiKeyManager.storeKey(apiKey)

      if (result.success) {
        return { success: true, data: { success: true } }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  })

  /**
   * Retrieve the stored API key
   * Channel: ai:get-key
   */
  ipcMain.handle('ai:get-key', async (): Promise<IPCResponse<{ key: string | null }>> => {
    try {
      const key = await apiKeyManager.getKey()
      return { success: true, data: { key } }
    } catch (error) {
      return {
        success: false,
        error: `Failed to retrieve API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  })

  /**
   * Clear the stored API key
   * Channel: ai:clear-key
   */
  ipcMain.handle('ai:clear-key', async (): Promise<IPCResponse<{ success: boolean }>> => {
    try {
      const result = await apiKeyManager.clearKey()

      if (result.success) {
        return { success: true, data: { success: true } }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  })

  /**
   * Test connection to OpenAI with the provided API key
   * Channel: ai:test-connection
   */
  ipcMain.handle(
    'ai:test-connection',
    async (_event, apiKey: string): Promise<IPCResponse<{ valid: boolean; message: string }>> => {
      try {
        // Validate input
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
          return {
            success: false,
            error: 'API key is required'
          }
        }

        // Create OpenAI client with the provided key
        const openai = new OpenAI({ apiKey })

        // Make a minimal API call to test the key (list models endpoint)
        await openai.models.list()

        return {
          success: true,
          data: {
            valid: true,
            message: 'API key is valid and connection successful'
          }
        }
      } catch (error) {
        // Handle different types of errors
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase()

          // Invalid API key
          if (errorMessage.includes('incorrect api key') || errorMessage.includes('invalid api key')) {
            return {
              success: true,
              data: {
                valid: false,
                message: 'Invalid API key. Please check your key and try again.'
              }
            }
          }

          // Network errors
          if (errorMessage.includes('network') || errorMessage.includes('enotfound') || errorMessage.includes('timeout')) {
            return {
              success: true,
              data: {
                valid: false,
                message: 'Network error. Please check your internet connection and try again.'
              }
            }
          }

          // Rate limit or quota errors
          if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
            return {
              success: true,
              data: {
                valid: false,
                message: 'API rate limit or quota exceeded. Please try again later.'
              }
            }
          }

          // Generic error
          return {
            success: true,
            data: {
              valid: false,
              message: `Connection failed: ${error.message}`
            }
          }
        }

        // Unknown error type
        return {
          success: true,
          data: {
            valid: false,
            message: 'An unknown error occurred while testing the connection'
          }
        }
      }
    }
  )

  /**
   * Check if an API key is stored
   * Channel: ai:has-key
   */
  ipcMain.handle('ai:has-key', async (): Promise<IPCResponse<{ hasKey: boolean }>> => {
    try {
      const hasKey = await apiKeyManager.hasKey()
      return { success: true, data: { hasKey } }
    } catch (error) {
      return {
        success: false,
        error: `Failed to check API key status: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  })

  /**
   * Transcribe audio from timeline clips
   * Channel: ai:transcribe-audio
   *
   * Orchestrates the complete transcription workflow:
   * 1. Extract audio from timeline clips
   * 2. Transcribe using Whisper API
   * 3. Return transcription result
   * 4. Clean up temporary files
   *
   * Emits progress events: ai-transcription-progress
   */
  ipcMain.handle(
    'ai:transcribe-audio',
    async (
      event,
      clips: TimelineClip[]
    ): Promise<
      IPCResponse<{
        text: string
        duration: number
        warning?: string
      }>
    > => {
      let audioFilePath: string | null = null

      try {
        // Get main window for sending progress events
        const mainWindow = BrowserWindow.fromWebContents(event.sender)

        /**
         * Send progress event to renderer
         */
        function sendProgress(percentage: number, message: string): void {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-transcription-progress', { percentage, message })
          }
        }

        // Validate clips
        if (!clips || clips.length === 0) {
          return {
            success: false,
            error: 'No clips found on timeline. Please add video clips before transcribing.'
          }
        }

        // Get API key
        sendProgress(0, 'Retrieving API key...')
        const apiKey = await apiKeyManager.getKey()

        if (!apiKey) {
          return {
            success: false,
            error: 'No API key found. Please add your OpenAI API key in AI Settings.'
          }
        }

        // Step 1: Extract audio from timeline clips (0-50%)
        sendProgress(10, 'Extracting audio from timeline...')

        const extractionResult = await audioExtractorService.extractAudioFromTimeline(clips, {
          bitrate: '128k',
          sampleRate: 44100,
          format: 'mp3'
        })

        audioFilePath = extractionResult.audioFilePath

        sendProgress(50, 'Audio extraction complete. Starting transcription...')

        // Step 2: Transcribe using Whisper API (50-90%)
        sendProgress(60, 'Transcribing audio with Whisper API...')

        const transcriptionResult = await whisperService.transcribeAudio(audioFilePath, {
          apiKey,
          temperature: 0
        })

        sendProgress(90, 'Transcription complete. Finalizing...')

        // Step 3: Clean up temporary audio file
        await audioExtractorService.cleanupAudioFile(audioFilePath)
        audioFilePath = null // Mark as cleaned up

        sendProgress(100, 'Transcription complete!')

        return {
          success: true,
          data: {
            text: transcriptionResult.text,
            duration: transcriptionResult.duration,
            warning: transcriptionResult.warning
          }
        }
      } catch (error) {
        console.error('[AIHandlers] Transcription failed:', error)

        // Clean up audio file if it exists
        if (audioFilePath) {
          await audioExtractorService.cleanupAudioFile(audioFilePath).catch((cleanupErr) => {
            console.error('[AIHandlers] Failed to cleanup audio file:', cleanupErr)
          })
        }

        // Return user-friendly error message
        if (error instanceof Error) {
          return {
            success: false,
            error: error.message
          }
        }

        return {
          success: false,
          error: 'An unknown error occurred during transcription'
        }
      }
    }
  )
}
