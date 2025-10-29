/**
 * AI Store
 *
 * Manages AI-related state including API key status, connection testing,
 * and AI feature availability.
 */

import { create } from 'zustand'

/**
 * Result of API key connection test
 */
interface ConnectionTestResult {
  valid: boolean
  message: string
  timestamp: number
}

/**
 * Transcription status states
 */
export type TranscriptionStatus = 'idle' | 'extracting' | 'transcribing' | 'complete' | 'error'

/**
 * Transcription progress event data
 */
export interface TranscriptionProgress {
  percentage: number
  message: string
}

/**
 * Transcription result data
 */
export interface TranscriptionResult {
  text: string
  duration: number
  warning?: string
  timestamp: number
}

/**
 * Generation status states
 */
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error'

/**
 * Platform types for content generation
 */
export type Platform = 'youtube' | 'twitter' | 'linkedin'

/**
 * Streaming status for individual platforms
 */
export type StreamingStatus = 'idle' | 'streaming' | 'complete' | 'error'

/**
 * AI store state
 */
interface AIState {
  // API key state
  hasApiKey: boolean
  apiKeyStatus: 'unknown' | 'stored' | 'missing' | 'error'

  // Connection test state
  isTestingConnection: boolean
  lastTestResult: ConnectionTestResult | null

  // Transcription state
  transcriptionStatus: TranscriptionStatus
  currentTranscription: TranscriptionResult | null
  transcriptionProgress: TranscriptionProgress | null
  transcriptionError: string | null

  // Transcription editing state
  transcriptionText: string
  userGuidance: string
  includeTranscription: boolean

  // Voice persona selection state
  selectedPersonas: string[]

  // Generation state
  selectedPlatforms: Platform[]
  includeEmojis: boolean
  generationStatus: GenerationStatus

  // Generated posts state
  generatedPosts: {
    youtube: string
    twitter: string
    linkedin: string
  }
  streamingStatus: {
    youtube: StreamingStatus
    twitter: StreamingStatus
    linkedin: StreamingStatus
  }

  // Actions
  setHasApiKey: (hasKey: boolean) => void
  setApiKeyStatus: (status: AIState['apiKeyStatus']) => void
  setTestingConnection: (isTesting: boolean) => void
  setTestResult: (result: ConnectionTestResult) => void
  clearTestResult: () => void
  setTranscription: (text: string, duration: number, warning?: string) => void
  setTranscriptionStatus: (status: TranscriptionStatus) => void
  setTranscriptionProgress: (progress: TranscriptionProgress) => void
  setTranscriptionError: (error: string | null) => void
  clearTranscription: () => void
  setTranscriptionText: (text: string) => void
  setUserGuidance: (text: string) => void
  setIncludeTranscription: (include: boolean) => void

  // Voice persona actions
  addPersona: (id: string) => void
  removePersona: (id: string) => void
  clearPersonas: () => void

  // Generation actions
  setPlatforms: (platforms: Platform[]) => void
  togglePlatform: (platform: Platform) => void
  setIncludeEmojis: (include: boolean) => void
  setGenerationStatus: (status: GenerationStatus) => void

  // Generated posts actions
  appendStreamChunk: (platform: Platform, content: string) => void
  setStreamingStatus: (platform: Platform, status: StreamingStatus) => void
  clearGeneratedPosts: () => void

  // Async operations
  checkApiKey: () => Promise<void>
  testConnection: (apiKey: string) => Promise<ConnectionTestResult>
  storeApiKey: (apiKey: string) => Promise<boolean>
  clearApiKey: () => Promise<boolean>
}

/**
 * AI Store
 * Manages API key status and connection testing for OpenAI integration
 */
export const useAIStore = create<AIState>((set) => ({
  // Initial state
  hasApiKey: false,
  apiKeyStatus: 'unknown',
  isTestingConnection: false,
  lastTestResult: null,

  // Transcription initial state
  transcriptionStatus: 'idle',
  currentTranscription: null,
  transcriptionProgress: null,
  transcriptionError: null,

  // Transcription editing initial state
  transcriptionText: '',
  userGuidance: '',
  includeTranscription: true,

  // Voice persona initial state
  selectedPersonas: [],

  // Generation initial state
  selectedPlatforms: [],
  includeEmojis: false,
  generationStatus: 'idle',

  // Generated posts initial state
  generatedPosts: {
    youtube: '',
    twitter: '',
    linkedin: ''
  },
  streamingStatus: {
    youtube: 'idle',
    twitter: 'idle',
    linkedin: 'idle'
  },

  // Synchronous actions
  setHasApiKey: (hasKey) => set({ hasApiKey: hasKey }),

  setApiKeyStatus: (status) => set({ apiKeyStatus: status }),

  setTestingConnection: (isTesting) => set({ isTestingConnection: isTesting }),

  setTestResult: (result) => set({ lastTestResult: result }),

  clearTestResult: () => set({ lastTestResult: null }),

  setTranscription: (text, duration, warning) =>
    set({
      currentTranscription: {
        text,
        duration,
        warning,
        timestamp: Date.now()
      },
      transcriptionStatus: 'complete',
      transcriptionError: null,
      transcriptionText: text
    }),

  setTranscriptionStatus: (status) => set({ transcriptionStatus: status }),

  setTranscriptionProgress: (progress) => set({ transcriptionProgress: progress }),

  setTranscriptionError: (error) =>
    set({
      transcriptionError: error,
      transcriptionStatus: 'error'
    }),

  clearTranscription: () =>
    set({
      currentTranscription: null,
      transcriptionStatus: 'idle',
      transcriptionProgress: null,
      transcriptionError: null,
      transcriptionText: '',
      userGuidance: ''
    }),

  setTranscriptionText: (text) => set({ transcriptionText: text }),

  setUserGuidance: (text) => set({ userGuidance: text }),

  setIncludeTranscription: (include) => set({ includeTranscription: include }),

  // Voice persona actions
  addPersona: (id) =>
    set((state) => {
      // Don't add duplicates
      if (state.selectedPersonas.includes(id)) {
        return state
      }
      // Enforce max limit of 5 personas
      if (state.selectedPersonas.length >= 5) {
        return state
      }
      return { selectedPersonas: [...state.selectedPersonas, id] }
    }),

  removePersona: (id) =>
    set((state) => ({
      selectedPersonas: state.selectedPersonas.filter((p) => p !== id)
    })),

  clearPersonas: () => set({ selectedPersonas: [] }),

  // Generation actions
  setPlatforms: (platforms) => set({ selectedPlatforms: platforms }),

  togglePlatform: (platform) =>
    set((state) => {
      if (state.selectedPlatforms.includes(platform)) {
        return { selectedPlatforms: state.selectedPlatforms.filter((p) => p !== platform) }
      }
      return { selectedPlatforms: [...state.selectedPlatforms, platform] }
    }),

  setIncludeEmojis: (include) => set({ includeEmojis: include }),

  setGenerationStatus: (status) => set({ generationStatus: status }),

  // Generated posts actions
  appendStreamChunk: (platform, content) =>
    set((state) => ({
      generatedPosts: {
        ...state.generatedPosts,
        [platform]: state.generatedPosts[platform] + content
      }
    })),

  setStreamingStatus: (platform, status) =>
    set((state) => ({
      streamingStatus: {
        ...state.streamingStatus,
        [platform]: status
      }
    })),

  clearGeneratedPosts: () =>
    set({
      generatedPosts: {
        youtube: '',
        twitter: '',
        linkedin: ''
      },
      streamingStatus: {
        youtube: 'idle',
        twitter: 'idle',
        linkedin: 'idle'
      },
      generationStatus: 'idle'
    }),

  // Async operations
  /**
   * Check if an API key is currently stored
   */
  checkApiKey: async () => {
    try {
      const response = await window.api.hasApiKey()

      if (response.success && response.data) {
        const hasKey = response.data.hasKey
        set({
          hasApiKey: hasKey,
          apiKeyStatus: hasKey ? 'stored' : 'missing'
        })
      } else {
        set({
          hasApiKey: false,
          apiKeyStatus: 'error'
        })
      }
    } catch (error) {
      console.error('Failed to check API key:', error)
      set({
        hasApiKey: false,
        apiKeyStatus: 'error'
      })
    }
  },

  /**
   * Test connection to OpenAI with the provided API key
   * @param apiKey - API key to test
   * @returns Test result with validity and message
   */
  testConnection: async (apiKey: string): Promise<ConnectionTestResult> => {
    set({ isTestingConnection: true })

    try {
      const response = await window.api.testApiConnection(apiKey)

      if (response.success && response.data) {
        const result: ConnectionTestResult = {
          valid: response.data.valid,
          message: response.data.message,
          timestamp: Date.now()
        }

        set({
          isTestingConnection: false,
          lastTestResult: result
        })

        return result
      } else {
        const errorResult: ConnectionTestResult = {
          valid: false,
          message: response.error || 'Failed to test connection',
          timestamp: Date.now()
        }

        set({
          isTestingConnection: false,
          lastTestResult: errorResult
        })

        return errorResult
      }
    } catch (error) {
      const errorResult: ConnectionTestResult = {
        valid: false,
        message: error instanceof Error ? error.message : 'An error occurred while testing the connection',
        timestamp: Date.now()
      }

      set({
        isTestingConnection: false,
        lastTestResult: errorResult
      })

      return errorResult
    }
  },

  /**
   * Store an API key securely
   * @param apiKey - The API key to store
   * @returns True if stored successfully
   */
  storeApiKey: async (apiKey: string): Promise<boolean> => {
    try {
      const response = await window.api.storeApiKey(apiKey)

      if (response.success) {
        set({
          hasApiKey: true,
          apiKeyStatus: 'stored'
        })
        return true
      } else {
        console.error('Failed to store API key:', response.error)
        return false
      }
    } catch (error) {
      console.error('Failed to store API key:', error)
      return false
    }
  },

  /**
   * Clear the stored API key
   * @returns True if cleared successfully
   */
  clearApiKey: async (): Promise<boolean> => {
    try {
      const response = await window.api.clearApiKey()

      if (response.success) {
        set({
          hasApiKey: false,
          apiKeyStatus: 'missing',
          lastTestResult: null
        })
        return true
      } else {
        console.error('Failed to clear API key:', response.error)
        return false
      }
    } catch (error) {
      console.error('Failed to clear API key:', error)
      return false
    }
  }
}))
