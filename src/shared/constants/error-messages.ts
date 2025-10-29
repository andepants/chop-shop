/**
 * Error Messages
 *
 * User-friendly error messages for all error scenarios in the AI workflow.
 * Messages are actionable and provide clear guidance to users.
 */

/**
 * API Key Error Messages
 */
export const API_KEY_ERRORS = {
  MISSING: 'No API key found. Please add your OpenAI API key in Settings.',
  INVALID: 'Invalid API key. Please verify your OpenAI API key.',
  TEST_FAILED: 'API connection test failed. Please check your key and internet connection.',
  UNAUTHORIZED: 'API key unauthorized. Please verify your key has access to Whisper and GPT models.'
} as const

/**
 * Timeline Error Messages
 */
export const TIMELINE_ERRORS = {
  NO_CLIPS: 'No clips found on timeline. Please add video clips before transcribing.',
  NO_AUDIO: 'Timeline clips have no audio. Please import videos with audio tracks.',
  EMPTY: 'Timeline is empty. Please add clips to your project.'
} as const

/**
 * Whisper API Error Messages
 */
export const WHISPER_ERRORS = {
  FILE_TOO_LARGE:
    'Audio file exceeds 25MB limit. Please use shorter clips or split your timeline.',
  QUOTA_EXCEEDED: 'OpenAI API quota exceeded. Please check your account or upgrade your plan.',
  INVALID_FORMAT: 'Audio extraction failed. Please check your video files are not corrupted.',
  NETWORK_ERROR: 'Network error during transcription. Please check your internet connection.',
  EXTRACTION_FAILED: 'Failed to extract audio from timeline. Please try again.',
  GENERIC: 'Transcription failed. Please try again or contact support.'
} as const

/**
 * GPT API Error Messages
 */
export const GPT_ERRORS = {
  RATE_LIMIT: 'Rate limit exceeded. Please wait 60 seconds and try again.',
  QUOTA_EXCEEDED: 'API quota exceeded. Please check your OpenAI account.',
  NETWORK_ERROR: 'Network error during generation. Please check your internet connection.',
  STREAM_INTERRUPTED: 'Generation interrupted. Partial content may be incomplete. Please retry.',
  INVALID_REQUEST: 'Invalid generation request. Please check your inputs.',
  GENERIC: 'Generation failed. Please try again or contact support.'
} as const

/**
 * Validation Error Messages
 */
export const VALIDATION_ERRORS = {
  NO_INPUT: 'Please provide either a transcription or additional guidance to generate posts.',
  NO_PLATFORMS: 'Please select at least one platform (YouTube, Twitter, LinkedIn).',
  NO_TRANSCRIPTION_FOR_GENERATION:
    'No transcription available. Please transcribe your audio first.',
  INVALID_PLATFORM: 'Invalid platform selected. Please choose YouTube, Twitter, or LinkedIn.'
} as const

/**
 * Character Limit Warning Messages
 */
export const CHARACTER_LIMIT_WARNINGS = {
  TWITTER_EXCEEDED: "Content exceeds Twitter's 280 character limit. Please edit before posting.",
  LINKEDIN_EXCEEDED:
    "Content exceeds LinkedIn's 3000 character limit. Please edit before posting.",
  YOUTUBE_LONG: 'Content is very long. Consider shortening for better engagement.'
} as const

/**
 * Generic Error Messages
 */
export const GENERIC_ERRORS = {
  UNKNOWN: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your internet connection and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.'
} as const

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  TRANSCRIPTION_COMPLETE: 'Transcription completed successfully!',
  GENERATION_COMPLETE: 'Posts generated successfully!',
  API_KEY_SAVED: 'API key saved successfully.',
  API_KEY_REMOVED: 'API key removed successfully.',
  CACHE_CLEARED: 'Cache cleared successfully.'
} as const

/**
 * Character Limits by Platform
 */
export const PLATFORM_CHARACTER_LIMITS = {
  twitter: 280,
  linkedin: 3000,
  youtube: Infinity // No enforced limit
} as const

/**
 * Error type categories for classification
 */
export enum ErrorCategory {
  AUTH = 'auth',
  NETWORK = 'network',
  QUOTA = 'quota',
  VALIDATION = 'validation',
  FORMAT = 'format',
  UNKNOWN = 'unknown'
}

/**
 * Map error strings to categories
 */
export function categorizeError(errorMessage: string): ErrorCategory {
  const msg = errorMessage.toLowerCase()

  if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('401')) {
    return ErrorCategory.AUTH
  }

  if (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('enotfound')
  ) {
    return ErrorCategory.NETWORK
  }

  if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429')) {
    return ErrorCategory.QUOTA
  }

  if (msg.includes('invalid') || msg.includes('validation') || msg.includes('400')) {
    return ErrorCategory.VALIDATION
  }

  if (msg.includes('format') || msg.includes('corrupt')) {
    return ErrorCategory.FORMAT
  }

  return ErrorCategory.UNKNOWN
}

/**
 * Determines if an error should be retried based on its category
 * @param error - The error to check
 * @returns true if error is retriable (network, quota), false otherwise (auth, validation, format)
 */
export function isRetriableError(error: Error | unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const category = categorizeError(message)

  // Retry network and quota errors only
  // Don't retry auth, validation, or format errors
  return category === ErrorCategory.NETWORK || category === ErrorCategory.QUOTA
}
