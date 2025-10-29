/**
 * Generation Panel
 *
 * Interface for generating platform-optimized social media posts from transcriptions.
 * Includes platform selection, emoji toggle, voice persona selection, and generation trigger.
 */

import { PersonaSelector } from './PersonaSelector'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { useAIStore, type Platform } from '../../store/aiStore'
import { Youtube, Twitter, Linkedin, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { CacheEntry, GeneratedPost, Transcription, GenerationRequest } from '../../types/cache.types'
import { VALIDATION_ERRORS } from '../../../../shared/constants/error-messages'
import { logError, showErrorToast } from '../../utils/error-handler'

/**
 * Platform configuration for rendering checkboxes
 */
const PLATFORMS: Array<{ id: Platform; label: string; icon: React.ReactNode }> = [
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" /> },
  { id: 'twitter', label: 'Twitter', icon: <Twitter className="w-4 h-4" /> },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" /> }
]

/**
 * Character limits for each platform
 */
const PLATFORM_LIMITS: Record<Platform, number | null> = {
  twitter: 280,
  linkedin: 3000,
  youtube: null
}

/**
 * Save generation to cache after successful completion
 */
async function saveToCacheAfterGeneration(request: {
  transcription?: string
  userGuidance?: string
  personas: string[]
  platforms: Platform[]
  includeEmojis: boolean
}): Promise<void> {
  try {
    const aiStore = useAIStore.getState()

    // Get transcription data
    const currentTranscription = aiStore.currentTranscription
    if (!currentTranscription) {
      console.warn('[GenerationPanel] No transcription available to cache')
      return
    }

    // Build transcription object
    const transcription: Transcription = {
      id: crypto.randomUUID(),
      text: currentTranscription.text,
      audioSourceClips: [], // Would need to track source clips if available
      createdAt: new Date(currentTranscription.timestamp).toISOString(),
      duration: currentTranscription.duration
    }

    // Build generated posts array from aiStore
    const generatedPosts: GeneratedPost[] = []
    const postsState = aiStore.generatedPosts

    request.platforms.forEach((platform) => {
      const content = postsState[platform]
      if (content && content.trim().length > 0) {
        const charCount = content.length
        const limit = PLATFORM_LIMITS[platform]

        generatedPosts.push({
          id: crypto.randomUUID(),
          platform,
          content,
          characterCount: charCount,
          exceedsLimit: limit !== null && charCount > limit,
          generatedAt: new Date().toISOString()
        })
      }
    })

    // Build generation request object
    const generationRequest: GenerationRequest = {
      transcription: request.transcription,
      userGuidance: request.userGuidance,
      personas: request.personas,
      platforms: request.platforms,
      includeEmojis: request.includeEmojis
    }

    // Create cache entry
    const cacheEntry: CacheEntry = {
      id: crypto.randomUUID(),
      transcription,
      generatedPosts,
      request: generationRequest,
      createdAt: new Date().toISOString()
    }

    // Save to cache
    const success = await aiStore.saveCacheEntry(cacheEntry)

    if (success) {
      console.log('[GenerationPanel] Successfully saved generation to cache')
    } else {
      console.error('[GenerationPanel] Failed to save generation to cache')
    }
  } catch (error) {
    console.error('[GenerationPanel] Error saving to cache:', error)
  }
}

/**
 * GenerationPanel Component Props
 */
interface GenerationPanelProps {
  onGenerationStart?: () => void
}

/**
 * GenerationPanel Component
 * Renders platform selection, emoji toggle, and generation controls
 */
export function GenerationPanel({ onGenerationStart }: GenerationPanelProps) {
  const [validationError, setValidationError] = useState<string | null>(null)

  // State from aiStore
  const selectedPlatforms = useAIStore((state) => state.selectedPlatforms)
  const includeEmojis = useAIStore((state) => state.includeEmojis)
  const togglePlatform = useAIStore((state) => state.togglePlatform)
  const setIncludeEmojis = useAIStore((state) => state.setIncludeEmojis)
  const transcriptionText = useAIStore((state) => state.transcriptionText)
  const userGuidance = useAIStore((state) => state.userGuidance)
  const includeTranscription = useAIStore((state) => state.includeTranscription)

  // Validation: at least one platform selected
  const isPlatformSelected = selectedPlatforms.length > 0

  // Validation: at least one input (transcription or guidance)
  const hasTranscriptionInput = includeTranscription && transcriptionText.trim().length > 0
  const hasUserGuidanceInput = userGuidance.trim().length > 0
  const hasInput = hasTranscriptionInput || hasUserGuidanceInput

  // Generate button enabled when validations pass
  const isGenerateEnabled = isPlatformSelected && hasInput

  /**
   * Handle generate button click
   */
  const handleGenerate = async () => {
    // Clear previous validation errors
    setValidationError(null)

    // Validate platforms
    if (!isPlatformSelected) {
      setValidationError('No platform selected. Please select at least one platform.')
      return
    }

    // Validate inputs
    if (!hasInput) {
      setValidationError(
        'No content to generate. Please provide a transcription or additional guidance.'
      )
      return
    }

    try {
      // Set generation status to generating
      useAIStore.getState().setGenerationStatus('generating')

      // Navigate to Results tab immediately when generation starts
      if (onGenerationStart) {
        onGenerationStart()
      }

      // Build generation request
      const request = {
        transcription: includeTranscription ? transcriptionText : undefined,
        userGuidance: userGuidance || undefined,
        personas: useAIStore.getState().selectedPersonas,
        platforms: selectedPlatforms,
        includeEmojis
      }

      // Call IPC handler
      const response = await window.api.generatePosts(request)

      if (response.success) {
        // Set generation status to complete
        useAIStore.getState().setGenerationStatus('complete')

        // Auto-save to cache after successful generation
        await saveToCacheAfterGeneration(request)

        // Navigate to Results tab
        // Note: This requires passing setActiveTab from AIGeneratorPage
        // For now, we'll log and let the user manually navigate
        console.log('Generation complete! Navigate to Results tab to view.')
      } else {
        // Set error status and show error message
        useAIStore.getState().setGenerationStatus('error')
        setValidationError(response.error || 'Generation failed. Please try again.')
      }
    } catch (error) {
      console.error('Generation failed:', error)
      useAIStore.getState().setGenerationStatus('error')
      setValidationError(
        error instanceof Error ? error.message : 'An unknown error occurred during generation.'
      )
    }
  }

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-300 mb-2">Generate</h2>
          <p className="text-sm text-zinc-500">
            Generate platform-optimized social media posts from your transcriptions.
          </p>
        </div>

        {/* Voice Persona Selection */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
          <PersonaSelector />
        </div>

        {/* Platform Selection */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-3 block">
              Select Platforms
            </label>
            <div className="space-y-3">
              {PLATFORMS.map((platform) => {
                const isChecked = selectedPlatforms.includes(platform.id)

                return (
                  <div key={platform.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={isChecked}
                      onCheckedChange={() => togglePlatform(platform.id)}
                    />
                    <label
                      htmlFor={`platform-${platform.id}`}
                      className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer"
                    >
                      {platform.icon}
                      {platform.label}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Emoji Toggle */}
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-emojis"
                checked={includeEmojis}
                onCheckedChange={(checked) => setIncludeEmojis(checked === true)}
              />
              <label htmlFor="include-emojis" className="text-sm text-zinc-300 cursor-pointer">
                Include Emojis
              </label>
            </div>
            <p className="text-xs text-zinc-500 mt-2 ml-7">
              Add emojis to generated content for more engaging posts
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="space-y-3">
          <Button
            onClick={handleGenerate}
            disabled={!isGenerateEnabled}
            className="w-full"
            size="lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Posts
          </Button>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{validationError}</p>
            </div>
          )}

          {/* Inline Help Text */}
          {!isPlatformSelected && (
            <p className="text-xs text-zinc-500 text-center">
              Select at least one platform to enable generation
            </p>
          )}
          {isPlatformSelected && !hasInput && (
            <p className="text-xs text-zinc-500 text-center">
              Provide a transcription or additional guidance in the Transcribe tab
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
