/**
 * Shared Constants
 * Application-wide constants used across main and renderer processes
 */

/**
 * Supported video file formats for import
 * Used in file picker dialog filters and validation logic
 */
export const SUPPORTED_FORMATS = ['mp4', 'mov', 'webm'] as const

export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number]
