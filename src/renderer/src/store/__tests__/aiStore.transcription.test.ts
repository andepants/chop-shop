/**
 * AI Store Transcription Tests
 *
 * Tests for transcription state management including:
 * - Transcription status updates
 * - Progress tracking
 * - Error handling
 * - State transitions
 *
 * Story 6.3: Audio Extraction & Transcription Service (Whisper API)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useAIStore } from '../aiStore'
import type { TranscriptionStatus, TranscriptionProgress } from '../aiStore'

describe('AI Store - Transcription', () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useAIStore.getState()
    store.clearTranscription()
  })

  describe('setTranscription', () => {
    it('should set transcription result and mark as complete', () => {
      const store = useAIStore.getState()

      const text = 'This is a test transcription from the Whisper API.'
      const duration = 45.5
      const warning = 'Audio was compressed to meet file size limits.'

      store.setTranscription(text, duration, warning)

      const state = useAIStore.getState()

      expect(state.currentTranscription).toEqual({
        text,
        duration,
        warning,
        timestamp: expect.any(Number)
      })
      expect(state.transcriptionStatus).toBe('complete')
      expect(state.transcriptionError).toBeNull()
    })

    it('should set transcription without warning', () => {
      const store = useAIStore.getState()

      const text = 'Another test transcription.'
      const duration = 30.0

      store.setTranscription(text, duration)

      const state = useAIStore.getState()

      expect(state.currentTranscription).toEqual({
        text,
        duration,
        warning: undefined,
        timestamp: expect.any(Number)
      })
      expect(state.transcriptionStatus).toBe('complete')
    })

    it('should update timestamp on each set', async () => {
      const store = useAIStore.getState()

      store.setTranscription('First transcription', 10)
      const firstTimestamp = useAIStore.getState().currentTranscription?.timestamp

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10))

      store.setTranscription('Second transcription', 15)
      const secondTimestamp = useAIStore.getState().currentTranscription?.timestamp

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp!)
    })
  })

  describe('setTranscriptionStatus', () => {
    it('should update transcription status', () => {
      const store = useAIStore.getState()

      const statuses: TranscriptionStatus[] = ['extracting', 'transcribing', 'complete', 'error', 'idle']

      statuses.forEach((status) => {
        store.setTranscriptionStatus(status)
        expect(useAIStore.getState().transcriptionStatus).toBe(status)
      })
    })
  })

  describe('setTranscriptionProgress', () => {
    it('should update transcription progress', () => {
      const store = useAIStore.getState()

      const progress: TranscriptionProgress = {
        percentage: 50,
        message: 'Transcribing audio with Whisper API...'
      }

      store.setTranscriptionProgress(progress)

      expect(useAIStore.getState().transcriptionProgress).toEqual(progress)
    })

    it('should track progress updates through workflow', () => {
      const store = useAIStore.getState()

      // Simulate progress through transcription workflow
      const progressUpdates: TranscriptionProgress[] = [
        { percentage: 0, message: 'Retrieving API key...' },
        { percentage: 10, message: 'Extracting audio from timeline...' },
        { percentage: 50, message: 'Audio extraction complete. Starting transcription...' },
        { percentage: 60, message: 'Transcribing audio with Whisper API...' },
        { percentage: 90, message: 'Transcription complete. Finalizing...' },
        { percentage: 100, message: 'Transcription complete!' }
      ]

      progressUpdates.forEach((progress) => {
        store.setTranscriptionProgress(progress)
        const state = useAIStore.getState()
        expect(state.transcriptionProgress).toEqual(progress)
      })
    })
  })

  describe('setTranscriptionError', () => {
    it('should set error and update status', () => {
      const store = useAIStore.getState()

      const errorMessage = 'Transcription failed: Invalid API key. Please check your AI Settings.'

      store.setTranscriptionError(errorMessage)

      const state = useAIStore.getState()

      expect(state.transcriptionError).toBe(errorMessage)
      expect(state.transcriptionStatus).toBe('error')
    })

    it('should clear error when null', () => {
      const store = useAIStore.getState()

      // Set error first
      store.setTranscriptionError('Some error')
      expect(useAIStore.getState().transcriptionError).toBe('Some error')

      // Clear error
      store.setTranscriptionError(null)
      expect(useAIStore.getState().transcriptionError).toBeNull()
      expect(useAIStore.getState().transcriptionStatus).toBe('error')
    })
  })

  describe('clearTranscription', () => {
    it('should reset all transcription state', () => {
      const store = useAIStore.getState()

      // Set up some state
      store.setTranscription('Test transcription', 30)
      store.setTranscriptionProgress({ percentage: 75, message: 'Processing...' })
      store.setTranscriptionStatus('complete')

      // Clear everything
      store.clearTranscription()

      const state = useAIStore.getState()

      expect(state.currentTranscription).toBeNull()
      expect(state.transcriptionStatus).toBe('idle')
      expect(state.transcriptionProgress).toBeNull()
      expect(state.transcriptionError).toBeNull()
    })
  })

  describe('Complete transcription workflow', () => {
    it('should handle successful transcription workflow', () => {
      const store = useAIStore.getState()

      // Start: idle state
      expect(useAIStore.getState().transcriptionStatus).toBe('idle')

      // Progress: extracting
      store.setTranscriptionStatus('extracting')
      store.setTranscriptionProgress({ percentage: 10, message: 'Extracting audio...' })
      expect(useAIStore.getState().transcriptionStatus).toBe('extracting')

      // Progress: transcribing
      store.setTranscriptionStatus('transcribing')
      store.setTranscriptionProgress({ percentage: 60, message: 'Transcribing...' })
      expect(useAIStore.getState().transcriptionStatus).toBe('transcribing')

      // Complete: set result
      store.setTranscription('Final transcription text', 45.5)
      store.setTranscriptionProgress({ percentage: 100, message: 'Complete!' })

      const state = useAIStore.getState()

      expect(state.transcriptionStatus).toBe('complete')
      expect(state.currentTranscription?.text).toBe('Final transcription text')
      expect(state.currentTranscription?.duration).toBe(45.5)
      expect(state.transcriptionError).toBeNull()
    })

    it('should handle failed transcription workflow', () => {
      const store = useAIStore.getState()

      // Start extracting
      store.setTranscriptionStatus('extracting')
      store.setTranscriptionProgress({ percentage: 10, message: 'Extracting audio...' })

      // Error occurs
      const errorMessage = 'No clips found on timeline. Please add video clips before transcribing.'
      store.setTranscriptionError(errorMessage)

      const state = useAIStore.getState()

      expect(state.transcriptionStatus).toBe('error')
      expect(state.transcriptionError).toBe(errorMessage)
      expect(state.currentTranscription).toBeNull()
    })

    it('should handle retry after error', () => {
      const store = useAIStore.getState()

      // First attempt fails
      store.setTranscriptionError('Network error during transcription.')
      expect(useAIStore.getState().transcriptionStatus).toBe('error')

      // Clear and retry
      store.clearTranscription()
      expect(useAIStore.getState().transcriptionStatus).toBe('idle')
      expect(useAIStore.getState().transcriptionError).toBeNull()

      // Second attempt succeeds
      store.setTranscriptionStatus('extracting')
      store.setTranscriptionStatus('transcribing')
      store.setTranscription('Success on retry!', 25.0)

      const state = useAIStore.getState()

      expect(state.transcriptionStatus).toBe('complete')
      expect(state.currentTranscription?.text).toBe('Success on retry!')
      expect(state.transcriptionError).toBeNull()
    })

    it('should handle multiple transcriptions in session', async () => {
      const store = useAIStore.getState()

      // First transcription
      store.setTranscription('First transcription', 20.0)
      const firstResult = useAIStore.getState().currentTranscription

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 5))

      // Clear and do second transcription
      store.clearTranscription()
      store.setTranscription('Second transcription', 35.0, 'Audio was compressed')
      const secondResult = useAIStore.getState().currentTranscription

      expect(firstResult?.text).toBe('First transcription')
      expect(secondResult?.text).toBe('Second transcription')
      expect(secondResult?.warning).toBe('Audio was compressed')
      expect(secondResult?.timestamp).toBeGreaterThan(firstResult!.timestamp)
    })
  })
})
