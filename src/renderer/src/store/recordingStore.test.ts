/**
 * Recording Store Tests
 * Tests recording store state management and actions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRecordingStore } from './recordingStore'

// Mock window.api
const mockStartRecording = vi.fn()
const mockStopRecording = vi.fn()
const mockGetRecordingState = vi.fn()
const mockResetRecordingState = vi.fn()

global.window = {
  api: {
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    getRecordingState: mockGetRecordingState,
    resetRecordingState: mockResetRecordingState
  }
} as any

describe('recordingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store to initial state
    useRecordingStore.setState({
      isRecording: false,
      mode: null,
      duration: 0,
      outputFiles: {}
    })
    // Set up default mock responses
    mockGetRecordingState.mockResolvedValue({
      success: true,
      data: { isRecording: false, currentMode: null }
    })
    mockResetRecordingState.mockResolvedValue({
      success: true,
      data: { success: true }
    })
  })

  it('should initialize with correct default state', () => {
    const state = useRecordingStore.getState()

    expect(state.isRecording).toBe(false)
    expect(state.mode).toBe(null)
    expect(state.duration).toBe(0)
    expect(state.outputFiles).toEqual({})
  })

  describe('startRecording', () => {
    it('should update state when recording starts successfully', async () => {
      mockStartRecording.mockResolvedValue({
        success: true,
        data: { success: true }
      })

      await useRecordingStore.getState().startRecording('screen')

      const state = useRecordingStore.getState()
      expect(state.isRecording).toBe(true)
      expect(state.mode).toBe('screen')
      expect(state.duration).toBe(0)
      expect(state.outputFiles).toEqual({})
    })

    it('should call IPC with correct mode parameter', async () => {
      mockStartRecording.mockResolvedValue({
        success: true,
        data: { success: true }
      })

      await useRecordingStore.getState().startRecording('pip')

      expect(mockStartRecording).toHaveBeenCalledWith({ mode: 'pip' })
    })

    it('should throw error when IPC returns error', async () => {
      mockStartRecording.mockResolvedValue({
        success: false,
        error: 'No recording device found'
      })

      await expect(useRecordingStore.getState().startRecording('webcam')).rejects.toThrow(
        'No recording device found'
      )
    })

    it('should not update state when IPC fails', async () => {
      mockStartRecording.mockResolvedValue({
        success: false,
        error: 'Failed'
      })

      const initialState = useRecordingStore.getState()

      try {
        await useRecordingStore.getState().startRecording('screen')
      } catch (error) {
        // Expected to throw
      }

      const state = useRecordingStore.getState()
      expect(state.isRecording).toBe(initialState.isRecording)
      expect(state.mode).toBe(initialState.mode)
    })
  })

  describe('stopRecording', () => {
    beforeEach(() => {
      // Set initial recording state
      useRecordingStore.setState({
        isRecording: true,
        mode: 'screen',
        duration: 30,
        outputFiles: {}
      })
    })

    it('should update state when recording stops successfully', async () => {
      mockStopRecording.mockResolvedValue({
        success: true,
        data: {
          outputFiles: {
            screen: '/path/to/screen.mp4'
          }
        }
      })

      await useRecordingStore.getState().stopRecording()

      const state = useRecordingStore.getState()
      expect(state.isRecording).toBe(false)
      expect(state.outputFiles).toEqual({ screen: '/path/to/screen.mp4' })
    })

    it('should handle PiP output files correctly', async () => {
      mockStopRecording.mockResolvedValue({
        success: true,
        data: {
          outputFiles: {
            screen: '/path/to/screen.mp4',
            webcam: '/path/to/webcam.mp4'
          }
        }
      })

      await useRecordingStore.getState().stopRecording()

      const state = useRecordingStore.getState()
      expect(state.outputFiles).toEqual({
        screen: '/path/to/screen.mp4',
        webcam: '/path/to/webcam.mp4'
      })
    })

    it('should set isRecording to false even if IPC fails', async () => {
      mockStopRecording.mockResolvedValue({
        success: false,
        error: 'Stop failed'
      })

      try {
        await useRecordingStore.getState().stopRecording()
      } catch (error) {
        // Expected to throw
      }

      const state = useRecordingStore.getState()
      expect(state.isRecording).toBe(false)
    })
  })

  describe('updateDuration', () => {
    it('should update duration', () => {
      useRecordingStore.getState().updateDuration(15.5)

      expect(useRecordingStore.getState().duration).toBe(15.5)
    })

    it('should update duration multiple times', () => {
      useRecordingStore.getState().updateDuration(10)
      useRecordingStore.getState().updateDuration(20)
      useRecordingStore.getState().updateDuration(30)

      expect(useRecordingStore.getState().duration).toBe(30)
    })
  })

  describe('reset', () => {
    it('should reset to initial state', () => {
      // Set some state
      useRecordingStore.setState({
        isRecording: true,
        mode: 'pip',
        duration: 45,
        outputFiles: { screen: '/test.mp4' }
      })

      // Reset
      useRecordingStore.getState().reset()

      const state = useRecordingStore.getState()
      expect(state.isRecording).toBe(false)
      expect(state.mode).toBe(null)
      expect(state.duration).toBe(0)
      expect(state.outputFiles).toEqual({})
    })
  })
})
