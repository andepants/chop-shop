/**
 * Error Handler Utility
 *
 * Provides utilities for displaying user-friendly error messages using shadcn/ui components.
 * Handles toast notifications and inline alert displays.
 */

import { toast } from 'sonner'

/**
 * Display error as toast notification
 *
 * @param message - Primary error message
 * @param details - Optional additional details
 */
export function showErrorToast(message: string, details?: string): void {
  console.error('[AI-Error]', message, details || '')

  toast.error(message, {
    description: details,
    duration: 5000
  })
}

/**
 * Display success toast notification
 *
 * @param message - Success message
 * @param details - Optional additional details
 */
export function showSuccessToast(message: string, details?: string): void {
  toast.success(message, {
    description: details,
    duration: 3000
  })
}

/**
 * Display warning toast notification
 *
 * @param message - Warning message
 * @param details - Optional additional details
 */
export function showWarningToast(message: string, details?: string): void {
  toast.warning(message, {
    description: details,
    duration: 4000
  })
}

/**
 * Display info toast notification
 *
 * @param message - Info message
 * @param details - Optional additional details
 */
export function showInfoToast(message: string, details?: string): void {
  toast.info(message, {
    description: details,
    duration: 3000
  })
}

/**
 * Log error with consistent format for debugging
 *
 * @param context - Context where error occurred (e.g., 'TranscriptionPanel', 'WhisperService')
 * @param error - Error object or message
 * @param additionalInfo - Optional additional context
 */
export function logError(context: string, error: unknown, additionalInfo?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  console.error('[AI-Error]', {
    timestamp,
    context,
    message: errorMessage,
    stack: errorStack,
    ...additionalInfo
  })
}

/**
 * Extract user-friendly message from error object
 *
 * @param error - Error object or string
 * @returns User-friendly error message
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}
