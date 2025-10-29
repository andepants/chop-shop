/**
 * Error Messages Constants Tests
 *
 * Tests for error categorization and retriability logic.
 */

import { describe, it, expect } from 'vitest'
import {
  categorizeError,
  isRetriableError,
  ErrorCategory,
  API_KEY_ERRORS,
  TIMELINE_ERRORS,
  WHISPER_ERRORS,
  GPT_ERRORS,
  VALIDATION_ERRORS,
  CHARACTER_LIMIT_WARNINGS,
  PLATFORM_CHARACTER_LIMITS
} from '../error-messages'

describe('Error Messages Constants', () => {
  describe('Error Message Constants', () => {
    it('should have all API key error messages', () => {
      expect(API_KEY_ERRORS.MISSING).toBeDefined()
      expect(API_KEY_ERRORS.INVALID).toBeDefined()
      expect(API_KEY_ERRORS.TEST_FAILED).toBeDefined()
    })

    it('should have all timeline error messages', () => {
      expect(TIMELINE_ERRORS.NO_CLIPS).toBeDefined()
      expect(TIMELINE_ERRORS.NO_AUDIO).toBeDefined()
    })

    it('should have all Whisper error messages', () => {
      expect(WHISPER_ERRORS.FILE_TOO_LARGE).toBeDefined()
      expect(WHISPER_ERRORS.QUOTA_EXCEEDED).toBeDefined()
      expect(WHISPER_ERRORS.INVALID_FORMAT).toBeDefined()
      expect(WHISPER_ERRORS.NETWORK_ERROR).toBeDefined()
    })

    it('should have all GPT error messages', () => {
      expect(GPT_ERRORS.RATE_LIMIT).toBeDefined()
      expect(GPT_ERRORS.QUOTA_EXCEEDED).toBeDefined()
      expect(GPT_ERRORS.NETWORK_ERROR).toBeDefined()
      expect(GPT_ERRORS.STREAM_INTERRUPTED).toBeDefined()
    })

    it('should have all validation error messages', () => {
      expect(VALIDATION_ERRORS.NO_INPUT).toBeDefined()
      expect(VALIDATION_ERRORS.NO_PLATFORMS).toBeDefined()
    })

    it('should have character limit warnings', () => {
      expect(CHARACTER_LIMIT_WARNINGS.TWITTER_EXCEEDED).toBeDefined()
      expect(CHARACTER_LIMIT_WARNINGS.LINKEDIN_EXCEEDED).toBeDefined()
    })

    it('should have platform character limits', () => {
      expect(PLATFORM_CHARACTER_LIMITS.twitter).toBe(280)
      expect(PLATFORM_CHARACTER_LIMITS.linkedin).toBe(3000)
      expect(PLATFORM_CHARACTER_LIMITS.youtube).toBe(Infinity)
    })
  })

  describe('categorizeError', () => {
    describe('AUTH errors', () => {
      it('should categorize API key errors as AUTH', () => {
        expect(categorizeError('Invalid API key')).toBe(ErrorCategory.AUTH)
        expect(categorizeError('api key incorrect')).toBe(ErrorCategory.AUTH)
        expect(categorizeError('Unauthorized access')).toBe(ErrorCategory.AUTH)
        expect(categorizeError('Error 401')).toBe(ErrorCategory.AUTH)
      })
    })

    describe('NETWORK errors', () => {
      it('should categorize network errors as NETWORK', () => {
        expect(categorizeError('Network error occurred')).toBe(ErrorCategory.NETWORK)
        expect(categorizeError('Connection timeout')).toBe(ErrorCategory.NETWORK)
        expect(categorizeError('ENOTFOUND domain.com')).toBe(ErrorCategory.NETWORK)
      })
    })

    describe('QUOTA errors', () => {
      it('should categorize quota/rate limit errors as QUOTA', () => {
        expect(categorizeError('API quota exceeded')).toBe(ErrorCategory.QUOTA)
        expect(categorizeError('Rate limit reached')).toBe(ErrorCategory.QUOTA)
        expect(categorizeError('Error 429')).toBe(ErrorCategory.QUOTA)
      })
    })

    describe('VALIDATION errors', () => {
      it('should categorize validation errors as VALIDATION', () => {
        expect(categorizeError('Invalid input provided')).toBe(ErrorCategory.VALIDATION)
        expect(categorizeError('Validation failed')).toBe(ErrorCategory.VALIDATION)
        expect(categorizeError('Error 400')).toBe(ErrorCategory.VALIDATION)
      })
    })

    describe('FORMAT errors', () => {
      it('should categorize format errors as FORMAT', () => {
        expect(categorizeError('File format not supported')).toBe(ErrorCategory.FORMAT)
        expect(categorizeError('File is corrupt')).toBe(ErrorCategory.FORMAT)
      })
    })

    describe('UNKNOWN errors', () => {
      it('should categorize unknown errors as UNKNOWN', () => {
        expect(categorizeError('Some random error')).toBe(ErrorCategory.UNKNOWN)
        expect(categorizeError('')).toBe(ErrorCategory.UNKNOWN)
      })
    })
  })

  describe('isRetriableError', () => {
    describe('Retriable errors', () => {
      it('should mark network errors as retriable', () => {
        const networkError = new Error('Network error occurred')
        expect(isRetriableError(networkError)).toBe(true)
      })

      it('should mark quota errors as retriable', () => {
        const quotaError = new Error('Rate limit exceeded')
        expect(isRetriableError(quotaError)).toBe(true)
      })

      it('should handle Error objects', () => {
        const error = new Error('Connection timeout')
        expect(isRetriableError(error)).toBe(true)
      })

      it('should handle string errors', () => {
        expect(isRetriableError('Network error')).toBe(true)
        expect(isRetriableError('Rate limit exceeded')).toBe(true)
      })
    })

    describe('Non-retriable errors', () => {
      it('should not mark auth errors as retriable', () => {
        const authError = new Error('Invalid API key')
        expect(isRetriableError(authError)).toBe(false)
      })

      it('should not mark validation errors as retriable', () => {
        const validationError = new Error('Invalid input provided')
        expect(isRetriableError(validationError)).toBe(false)
      })

      it('should not mark format errors as retriable', () => {
        const formatError = new Error('File format is corrupt')
        expect(isRetriableError(formatError)).toBe(false)
      })

      it('should not mark unknown errors as retriable', () => {
        const unknownError = new Error('Some random error')
        expect(isRetriableError(unknownError)).toBe(false)
      })
    })
  })
})
