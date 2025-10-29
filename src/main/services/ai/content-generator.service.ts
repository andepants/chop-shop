/**
 * Content Generator Service
 *
 * GPT-4o-mini streaming integration for platform-specific social media content generation.
 * Handles parallel generation, streaming responses, error handling, and retry logic.
 */

import OpenAI from 'openai'
import type { BrowserWindow } from 'electron'
import { buildYouTubePrompt, buildTwitterPrompt, buildLinkedInPrompt } from './system-prompts'
import { buildPersonaPrompt } from './persona-prompt-builder'

/**
 * Platform types for content generation
 */
export type Platform = 'youtube' | 'twitter' | 'linkedin'

/**
 * Request for content generation
 */
export interface GenerationRequest {
  transcription?: string
  userGuidance?: string
  personas: string[] // Persona IDs
  platforms: Platform[]
  includeEmojis: boolean
}

/**
 * Streaming chunk event payload
 */
export interface StreamChunk {
  platform: Platform
  content: string
  complete: boolean
}

/**
 * Result from platform generation
 */
interface PlatformResult {
  platform: Platform
  content: string
  error?: string
}

/**
 * Configuration for retry logic
 */
interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 1000 // 1 second
}

/**
 * Content Generator Service
 * Manages GPT-4o-mini API calls with streaming, parallel generation, and error handling
 */
export class ContentGeneratorService {
  private openai: OpenAI | null = null

  /**
   * Initialize OpenAI client with API key
   * @param apiKey - OpenAI API key
   */
  initialize(apiKey: string): void {
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Generate posts for all selected platforms in parallel
   *
   * @param request - Generation request with platforms, content, and settings
   * @param mainWindow - Electron window for streaming chunks via IPC
   * @returns Array of platform results (success and failures)
   */
  async generatePosts(
    request: GenerationRequest,
    mainWindow: BrowserWindow
  ): Promise<PlatformResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Call initialize() first.')
    }

    // Validate request
    this.validateRequest(request)

    // Build persona prompt
    const personaPrompt = buildPersonaPrompt(request.personas)

    // Build user message from transcription/guidance
    const userMessage = this.buildUserMessage(request.transcription, request.userGuidance)

    // Generate for all platforms in parallel
    const promises = request.platforms.map((platform) =>
      this.generateForPlatform(platform, userMessage, personaPrompt, request.includeEmojis, mainWindow)
    )

    // Use Promise.allSettled to capture both successes and failures
    const results = await Promise.allSettled(promises)

    // Map results to platform results
    return results.map((result, index) => {
      const platform = request.platforms[index]

      if (result.status === 'fulfilled') {
        return {
          platform,
          content: result.value
        }
      } else {
        console.error(`[ContentGenerator] ${platform} generation failed:`, result.reason)
        return {
          platform,
          content: '',
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        }
      }
    })
  }

  /**
   * Generate post for a single platform (used for regeneration)
   *
   * @param platform - Single platform to generate for
   * @param request - Generation request with content and settings (platforms field ignored)
   * @param mainWindow - Electron window for streaming chunks via IPC
   * @returns Platform result (success or failure)
   */
  async generateSinglePlatform(
    platform: Platform,
    request: GenerationRequest,
    mainWindow: BrowserWindow
  ): Promise<PlatformResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Call initialize() first.')
    }

    // Build persona prompt
    const personaPrompt = buildPersonaPrompt(request.personas)

    // Build user message from transcription/guidance
    const userMessage = this.buildUserMessage(request.transcription, request.userGuidance)

    try {
      const content = await this.generateForPlatform(
        platform,
        userMessage,
        personaPrompt,
        request.includeEmojis,
        mainWindow
      )

      return {
        platform,
        content
      }
    } catch (error) {
      console.error(`[ContentGenerator] ${platform} generation failed:`, error)
      return {
        platform,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate content for a single platform with streaming and retry logic
   *
   * @param platform - Target platform (youtube, twitter, linkedin)
   * @param userMessage - User message content
   * @param personaPrompt - Persona style instructions
   * @param includeEmojis - Whether to include emojis
   * @param mainWindow - Electron window for streaming chunks
   * @returns Generated content for the platform
   */
  private async generateForPlatform(
    platform: Platform,
    userMessage: string,
    personaPrompt: string,
    includeEmojis: boolean,
    mainWindow: BrowserWindow,
    retryCount: number = 0
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    try {
      // Build system prompt for the platform
      const systemPrompt = this.getSystemPrompt(platform, includeEmojis, personaPrompt)

      // Call GPT-4o-mini with streaming
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true
      })

      // Accumulate chunks and stream to renderer
      let fullContent = ''

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''

        if (content) {
          fullContent += content

          // Send streaming chunk to renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-stream-chunk', {
              platform,
              content: content,
              complete: false
            } as StreamChunk)
          }
        }
      }

      // Send completion event
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ai-stream-chunk', {
          platform,
          content: '',
          complete: true
        } as StreamChunk)
      }

      return fullContent
    } catch (error) {
      // Check if error is retryable
      if (this.isRetryableError(error) && retryCount < DEFAULT_RETRY_CONFIG.maxRetries) {
        const delay = this.calculateBackoff(retryCount)

        console.warn(
          `[ContentGenerator] ${platform} generation failed (attempt ${retryCount + 1}/${DEFAULT_RETRY_CONFIG.maxRetries}). Retrying in ${delay}ms...`
        )

        // Notify user of retry
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ai-generation-retry', {
            platform,
            attempt: retryCount + 1,
            maxAttempts: DEFAULT_RETRY_CONFIG.maxRetries,
            delay
          })
        }

        // Wait before retrying
        await this.sleep(delay)

        // Retry with incremented count
        return this.generateForPlatform(
          platform,
          userMessage,
          personaPrompt,
          includeEmojis,
          mainWindow,
          retryCount + 1
        )
      }

      // Not retryable or max retries exceeded
      throw this.enhanceError(error, platform)
    }
  }

  /**
   * Get system prompt for a specific platform
   */
  private getSystemPrompt(platform: Platform, includeEmojis: boolean, personaPrompt: string): string {
    switch (platform) {
      case 'youtube':
        return buildYouTubePrompt(includeEmojis, personaPrompt)
      case 'twitter':
        return buildTwitterPrompt(includeEmojis, personaPrompt)
      case 'linkedin':
        return buildLinkedInPrompt(includeEmojis, personaPrompt)
      default:
        throw new Error(`Unknown platform: ${platform}`)
    }
  }

  /**
   * Build user message from transcription and guidance
   */
  private buildUserMessage(transcription?: string, userGuidance?: string): string {
    const parts: string[] = []

    if (transcription && transcription.trim()) {
      parts.push(`Transcription:\n${transcription}`)
    }

    if (userGuidance && userGuidance.trim()) {
      parts.push(`Additional context:\n${userGuidance}`)
    }

    if (parts.length === 0) {
      throw new Error('No content provided. Include transcription or user guidance.')
    }

    return parts.join('\n\n')
  }

  /**
   * Validate generation request
   */
  private validateRequest(request: GenerationRequest): void {
    if (!request.platforms || request.platforms.length === 0) {
      throw new Error('No platforms selected. Select at least one platform.')
    }

    const hasTranscription = request.transcription && request.transcription.trim().length > 0
    const hasGuidance = request.userGuidance && request.userGuidance.trim().length > 0

    if (!hasTranscription && !hasGuidance) {
      throw new Error('No content to generate. Provide transcription or user guidance.')
    }
  }

  /**
   * Determine if an error is retryable (transient failures)
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const message = error.message.toLowerCase()

    // Retryable: network errors, rate limits, timeouts
    if (
      message.includes('network') ||
      message.includes('enotfound') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return true
    }

    // Non-retryable: auth errors, invalid requests
    if (
      message.includes('incorrect api key') ||
      message.includes('invalid api key') ||
      message.includes('401') ||
      message.includes('400')
    ) {
      return false
    }

    return false
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(retryCount: number): number {
    return DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(2, retryCount)
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Enhance error message with user-friendly context
   */
  private enhanceError(error: unknown, platform: Platform): Error {
    if (!(error instanceof Error)) {
      return new Error(`Generation failed for ${platform}: Unknown error`)
    }

    const message = error.message.toLowerCase()

    // Invalid/missing API key
    if (message.includes('incorrect api key') || message.includes('invalid api key')) {
      return new Error('Generation failed: Invalid API key. Please check your AI Settings.')
    }

    // Quota exceeded
    if (message.includes('quota')) {
      return new Error('Generation failed: API quota exceeded. Please try again later.')
    }

    // Rate limit
    if (message.includes('rate limit')) {
      return new Error('Generation failed: API rate limit exceeded. Please try again in a few moments.')
    }

    // Network error
    if (message.includes('network') || message.includes('enotfound') || message.includes('timeout')) {
      return new Error('Generation failed: Network error. Please check your internet connection.')
    }

    // Generic error
    return new Error(`Generation failed for ${platform}: ${error.message}`)
  }
}

// Export singleton instance
export const contentGeneratorService = new ContentGeneratorService()
