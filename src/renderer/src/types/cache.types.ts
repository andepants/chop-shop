/**
 * Cache Data Types
 * Defines data structures for persisting transcriptions and generated posts
 */

/**
 * Cache entry containing all generation data
 * Stored in userData/ai-cache.json for cross-session persistence
 */
export interface CacheEntry {
  /** Unique identifier (UUID) */
  id: string
  /** Transcription data */
  transcription: Transcription
  /** Generated posts for each platform */
  generatedPosts: GeneratedPost[]
  /** Original generation request parameters */
  request: GenerationRequest
  /** ISO 8601 timestamp of when entry was created */
  createdAt: string
}

/**
 * Transcription data from audio extraction
 */
export interface Transcription {
  /** Unique identifier */
  id: string
  /** Full transcription text */
  text: string
  /** Array of source clip IDs used for transcription */
  audioSourceClips: string[]
  /** ISO 8601 timestamp of transcription creation */
  createdAt: string
  /** Total duration in seconds */
  duration: number
}

/**
 * Generated social media post
 */
export interface GeneratedPost {
  /** Unique identifier */
  id: string
  /** Target platform */
  platform: 'youtube' | 'twitter' | 'linkedin'
  /** Generated post content */
  content: string
  /** Character count of content */
  characterCount: number
  /** Whether content exceeds platform character limit */
  exceedsLimit: boolean
  /** ISO 8601 timestamp of generation */
  generatedAt: string
}

/**
 * Generation request parameters
 * Captured to enable regeneration with same settings
 */
export interface GenerationRequest {
  /** Transcription text used as input (optional) */
  transcription?: string
  /** User-provided guidance/instructions (optional) */
  userGuidance?: string
  /** Selected voice personas */
  personas: string[]
  /** Target platforms for generation */
  platforms: ('youtube' | 'twitter' | 'linkedin')[]
  /** Whether to include emojis in generated content */
  includeEmojis: boolean
}
