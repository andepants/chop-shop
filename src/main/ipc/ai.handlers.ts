/**
 * AI IPC Handlers
 *
 * Handles IPC communication between renderer and main process for AI operations.
 * Manages API key storage, retrieval, clearing, and connection testing.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { unlink } from 'fs/promises'
import { apiKeyManager } from '../services/ai/api-key-manager.service'
import { audioExtractorService } from '../services/ai/audio-extractor.service'
import { whisperService } from '../services/ai/whisper.service'
import {
  contentGeneratorService,
  type GenerationRequest
} from '../services/ai/content-generator.service'
import * as cacheService from '../services/ai/cache.service'
import { exportTimelineForTranscription } from '../services/ai/temp-export.service'
import type { CacheEntry } from '../../renderer/src/types/cache.types'
import type { Track } from '../../shared/types'
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
   * Transcribe audio from timeline tracks (multi-track support)
   * Channel: ai:transcribe-audio
   *
   * Orchestrates the complete transcription workflow:
   * 1. Export timeline to temporary video (with multi-track audio mixing)
   * 2. Extract audio from temporary video
   * 3. Transcribe using Whisper API
   * 4. Return transcription result
   * 5. Clean up temporary files
   *
   * Emits progress events: ai-transcription-progress
   */
  ipcMain.handle(
    'ai:transcribe-audio',
    async (
      event,
      tracks: Track[]
    ): Promise<
      IPCResponse<{
        text: string
        duration: number
        warning?: string
      }>
    > => {
      let tempVideoPath: string | null = null
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

        // Validate tracks
        if (!tracks || tracks.length === 0) {
          return {
            success: false,
            error: 'No tracks found on timeline. Please add video clips before transcribing.'
          }
        }

        // Validate at least one track has clips
        const hasClips = tracks.some((track) => track.clips.length > 0)
        if (!hasClips) {
          return {
            success: false,
            error: 'No clips found on timeline. Please add video clips before transcribing.'
          }
        }

        // Validate at least one clip has audio
        const hasAudio = tracks.some((track) =>
          track.clips.some((clip) => clip.hasAudio !== false)
        )
        if (!hasAudio) {
          return {
            success: false,
            error: 'No audio detected in timeline clips.'
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

        // Step 1: Export timeline to temporary video (0-40%)
        sendProgress(10, 'Exporting timeline with mixed audio...')

        const tempExportResult = await exportTimelineForTranscription({ tracks })
        tempVideoPath = tempExportResult.videoPath

        sendProgress(40, 'Export complete. Extracting audio...')

        // Step 2: Extract audio from temporary video (40-60%)
        sendProgress(50, 'Extracting audio from exported video...')

        const extractionResult = await audioExtractorService.extractAudioFromVideo(tempVideoPath, {
          bitrate: '128k',
          sampleRate: 44100,
          format: 'mp3'
        })

        audioFilePath = extractionResult.audioFilePath

        sendProgress(60, 'Audio extraction complete. Starting transcription...')

        // Step 3: Transcribe using Whisper API (60-90%)
        sendProgress(70, 'Transcribing audio with Whisper API...')

        const transcriptionResult = await whisperService.transcribeAudio(audioFilePath, {
          apiKey,
          temperature: 0
        })

        sendProgress(90, 'Transcription complete. Cleaning up...')

        // Step 4: Clean up temporary files
        await audioExtractorService.cleanupAudioFile(audioFilePath)
        audioFilePath = null // Mark as cleaned up

        if (tempVideoPath) {
          await unlink(tempVideoPath).catch((err) => {
            console.warn('[AIHandlers] Failed to delete temporary video:', err)
          })
          tempVideoPath = null // Mark as cleaned up
        }

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

        // Clean up temporary files if they exist
        if (audioFilePath) {
          await audioExtractorService.cleanupAudioFile(audioFilePath).catch((cleanupErr) => {
            console.error('[AIHandlers] Failed to cleanup audio file:', cleanupErr)
          })
        }

        if (tempVideoPath) {
          await unlink(tempVideoPath).catch((cleanupErr) => {
            console.error('[AIHandlers] Failed to cleanup temp video:', cleanupErr)
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

  /**
   * Generate platform-optimized social media posts
   * Channel: ai:generate-posts
   *
   * Orchestrates content generation for selected platforms:
   * 1. Retrieve API key
   * 2. Initialize content generator service
   * 3. Generate posts for all platforms in parallel with streaming
   * 4. Return success/error response
   *
   * Emits streaming events: ai-stream-chunk, ai-generation-retry
   */
  ipcMain.handle(
    'ai:generate-posts',
    async (
      event,
      request: GenerationRequest
    ): Promise<IPCResponse<{ success: boolean }>> => {
      try {
        // Get main window for sending streaming events
        const mainWindow = BrowserWindow.fromWebContents(event.sender)

        if (!mainWindow) {
          return {
            success: false,
            error: 'Main window not found'
          }
        }

        // Get API key
        const apiKey = await apiKeyManager.getKey()

        if (!apiKey) {
          return {
            success: false,
            error: 'No API key found. Please add your OpenAI API key in AI Settings.'
          }
        }

        // Initialize content generator service with API key
        contentGeneratorService.initialize(apiKey)

        // Generate posts for all selected platforms
        const results = await contentGeneratorService.generatePosts(request, mainWindow)

        // Check if any platforms failed
        const failedPlatforms = results.filter((r) => r.error)

        if (failedPlatforms.length === results.length) {
          // All platforms failed
          return {
            success: false,
            error: `Generation failed for all platforms: ${failedPlatforms.map((r) => r.error).join(', ')}`
          }
        }

        if (failedPlatforms.length > 0) {
          // Partial failure
          console.warn('[AIHandlers] Partial generation failure:', failedPlatforms)
          // Return success but log failures (chunks were still streamed for successful platforms)
        }

        return {
          success: true,
          data: { success: true }
        }
      } catch (error) {
        console.error('[AIHandlers] Generation failed:', error)

        // Return user-friendly error message
        if (error instanceof Error) {
          return {
            success: false,
            error: error.message
          }
        }

        return {
          success: false,
          error: 'An unknown error occurred during content generation'
        }
      }
    }
  )

  /**
   * Load all cache entries
   * Channel: ai:load-cache
   */
  ipcMain.handle('ai:load-cache', async (): Promise<IPCResponse<CacheEntry[]>> => {
    try {
      const entries = await cacheService.loadCache()
      return { success: true, data: entries }
    } catch (error) {
      return {
        success: false,
        error: `Failed to load cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  })

  /**
   * Save a new cache entry
   * Channel: ai:save-cache-entry
   */
  ipcMain.handle(
    'ai:save-cache-entry',
    async (_event, entry: CacheEntry): Promise<IPCResponse<{ success: boolean }>> => {
      try {
        await cacheService.saveCacheEntry(entry)
        return { success: true, data: { success: true } }
      } catch (error) {
        return {
          success: false,
          error: `Failed to save cache entry: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    }
  )

  /**
   * Clear all cache entries
   * Channel: ai:clear-cache
   */
  ipcMain.handle('ai:clear-cache', async (): Promise<IPCResponse<{ success: boolean }>> => {
    try {
      await cacheService.clearCache()
      return { success: true, data: { success: true } }
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  })
}
