/**
 * Recording Service Tests
 * Tests for recording service with auto-selection logic, error handling, and state management
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { DesktopCapturerSource } from 'electron'
import os from 'os'
import path from 'path'

// Mock Electron modules
vi.mock('electron', () => ({
  desktopCapturer: {
    getSources: vi.fn()
  }
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn()
}))

// Import after mocks
import { desktopCapturer } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import {
  recordingService,
  RECORDING_DEFAULTS,
  RecordingError,
  RecordingErrorCode
} from '../recording.service'

// Mock navigator.mediaDevices (not available in Node.js)
const mockEnumerateDevices = vi.fn()
Object.defineProperty(global, 'navigator', {
  writable: true,
  value: {
    mediaDevices: {
      enumerateDevices: mockEnumerateDevices
    }
  }
})

describe('recording.service', () => {
  const mockGetSources = vi.mocked(desktopCapturer.getSources)
  const mockMkdir = vi.mocked(mkdir)
  const mockWriteFile = vi.mocked(writeFile)

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock writeFile to resolve successfully by default
    mockWriteFile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    // Reset recording state
    if ((recordingService as any).isRecording) {
      ;(recordingService as any).isRecording = false
      ;(recordingService as any).currentMode = null
      ;(recordingService as any).startTime = null
      ;(recordingService as any).outputFiles = {}
    }
  })

  describe('RECORDING_DEFAULTS', () => {
    it('defines correct screen recording configuration', () => {
      expect(RECORDING_DEFAULTS.screen).toEqual({
        resolution: { width: 1920, height: 1080 },
        framerate: 30,
        bitrate: 8_000_000 // 8 Mbps
      })
    })

    it('defines correct webcam recording configuration', () => {
      expect(RECORDING_DEFAULTS.webcam).toEqual({
        resolution: { width: 640, height: 480 },
        framerate: 30,
        bitrate: 2_500_000, // 2.5 Mbps
        position: 'bottom-right',
        size: 0.2, // 20% of screen size
        shape: 'circle'
      })
    })

    it('defines correct audio configuration', () => {
      expect(RECORDING_DEFAULTS.audio).toEqual({
        autoSelectMicrophone: true,
        echoCancellation: true,
        noiseSuppression: true
      })
    })

    it('defines correct storage configuration', () => {
      expect(RECORDING_DEFAULTS.storage).toEqual({
        tempDir: path.join(os.tmpdir(), 'chop-shop', 'recordings'),
        format: 'webm',
        codec: 'vp9'
      })
    })
  })

  describe('getPrimaryScreen', () => {
    it('successfully auto-selects the first screen', async () => {
      const mockSources: DesktopCapturerSource[] = [
        {
          id: 'screen:0',
          name: 'Screen 1',
          thumbnail: {} as any,
          display_id: '12345',
          appIcon: {} as any
        },
        {
          id: 'screen:1',
          name: 'Screen 2',
          thumbnail: {} as any,
          display_id: '12346',
          appIcon: {} as any
        }
      ]

      mockGetSources.mockResolvedValueOnce(mockSources)

      const result = await recordingService.getPrimaryScreen()

      expect(result).toEqual(mockSources[0])
      expect(mockGetSources).toHaveBeenCalledWith({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 }
      })
    })

    it('throws NO_DEVICES_FOUND error when no screens available', async () => {
      mockGetSources.mockResolvedValueOnce([])

      await expect(recordingService.getPrimaryScreen()).rejects.toThrow(
        new RecordingError(
          'No screens found. Please ensure your display is connected and try again.',
          RecordingErrorCode.NO_DEVICES_FOUND
        )
      )
    })

    it('throws PERMISSION_DENIED error when screen capture permission denied', async () => {
      mockGetSources.mockRejectedValueOnce(new Error('Screen capture permission denied'))

      await expect(recordingService.getPrimaryScreen()).rejects.toThrow(
        new RecordingError(
          'Screen recording permission denied. Please enable screen recording in System Preferences > Privacy & Security > Screen Recording.',
          RecordingErrorCode.PERMISSION_DENIED
        )
      )
    })

    it('throws UNKNOWN_ERROR for unexpected failures', async () => {
      mockGetSources.mockRejectedValueOnce(new Error('Unexpected error'))

      await expect(recordingService.getPrimaryScreen()).rejects.toThrow(
        new RecordingError(
          'Failed to access screen sources. Please try again.',
          RecordingErrorCode.UNKNOWN_ERROR
        )
      )
    })
  })

  // Note: getDefaultWebcam() tests removed - webcam enumeration now happens in renderer process
  // See RecordingManager.ts for the new implementation

  describe('ensureRecordingDirectory', () => {
    it('successfully creates recording directory', async () => {
      mockMkdir.mockResolvedValueOnce(undefined)

      await expect(recordingService.ensureRecordingDirectory()).resolves.not.toThrow()

      expect(mockMkdir).toHaveBeenCalledWith(RECORDING_DEFAULTS.storage.tempDir, {
        recursive: true
      })
    })

    it('throws DIRECTORY_ERROR on permission denied (EACCES)', async () => {
      const error: any = new Error('Permission denied')
      error.code = 'EACCES'
      mockMkdir.mockRejectedValueOnce(error)

      await expect(recordingService.ensureRecordingDirectory()).rejects.toThrow(
        new RecordingError(
          `Permission denied creating recording directory. Please check your system permissions for: ${RECORDING_DEFAULTS.storage.tempDir}`,
          RecordingErrorCode.DIRECTORY_ERROR
        )
      )
    })

    it('throws DIRECTORY_ERROR on no space (ENOSPC)', async () => {
      const error: any = new Error('No space left')
      error.code = 'ENOSPC'
      mockMkdir.mockRejectedValueOnce(error)

      await expect(recordingService.ensureRecordingDirectory()).rejects.toThrow(
        new RecordingError(
          'Insufficient disk space to create recording directory. Please free up space and try again.',
          RecordingErrorCode.DIRECTORY_ERROR
        )
      )
    })

    it('throws DIRECTORY_ERROR for other mkdir failures', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Unknown error'))

      await expect(recordingService.ensureRecordingDirectory()).rejects.toThrow(
        new RecordingError(
          'Failed to create recording directory. Please check your system permissions.',
          RecordingErrorCode.DIRECTORY_ERROR
        )
      )
    })
  })

  describe('startRecording', () => {
    beforeEach(() => {
      mockMkdir.mockResolvedValue(undefined)
    })

    it('successfully starts screen recording', async () => {
      await recordingService.startRecording('screen')

      const state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(true)
      expect(state.currentMode).toBe('screen')
      expect(mockMkdir).toHaveBeenCalled()
    })

    it('successfully starts webcam recording', async () => {
      await recordingService.startRecording('webcam')

      const state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(true)
      expect(state.currentMode).toBe('webcam')
    })

    it('successfully starts pip recording', async () => {
      await recordingService.startRecording('pip')

      const state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(true)
      expect(state.currentMode).toBe('pip')
    })

    it('throws error when already recording', async () => {
      await recordingService.startRecording('screen')

      await expect(recordingService.startRecording('webcam')).rejects.toThrow(
        new RecordingError(
          'Recording already in progress. Please stop the current recording before starting a new one.',
          RecordingErrorCode.UNKNOWN_ERROR
        )
      )
    })

    it('resets state on failure to start', async () => {
      const error: any = new Error('Directory error')
      error.code = 'EACCES'
      mockMkdir.mockRejectedValueOnce(error)

      await expect(recordingService.startRecording('screen')).rejects.toThrow()

      const state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(false)
      expect(state.currentMode).toBe(null)
    })
  })

  // NOTE: These tests are outdated - they expect stopRecording() but service uses completeRecording(buffer)
  // The current architecture has renderer send buffer via IPC, so stopRecording() without buffer doesn't exist
  describe.skip('stopRecording', () => {
    it('successfully stops recording and returns output', async () => {
      mockMkdir.mockResolvedValue(undefined)

      // Start recording
      await recordingService.startRecording('screen')

      // Wait a moment to ensure duration > 0
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Stop recording - NOTE: stopRecording() method doesn't exist, use completeRecording(buffer)
      // const output = await recordingService.stopRecording()

      // expect(output.metadata.mode).toBe('screen')
      // expect(output.metadata.totalDuration).toBeGreaterThan(0)
      // expect(output.metadata.startTime).toBeInstanceOf(Date)
      // expect(output.metadata.endTime).toBeInstanceOf(Date)
      // expect(output.files).toEqual({})

      // Verify state is reset
      const state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(true) // Still recording since we didn't call completeRecording
      expect(state.currentMode).toBe('screen')
    })

    it('throws error when no recording in progress', async () => {
      // NOTE: stopRecording() method doesn't exist - use completeRecording(buffer) instead
      // await expect(recordingService.stopRecording()).rejects.toThrow(
      //   new RecordingError(
      //     'No recording in progress. Please start a recording before stopping.',
      //     RecordingErrorCode.UNKNOWN_ERROR
      //   )
      // )
    })
  })

  describe('getRecordingState', () => {
    it('returns initial state when not recording', () => {
      const state = recordingService.getRecordingState()

      expect(state).toEqual({
        isRecording: false,
        currentMode: null,
        outputFiles: {}
      })
    })

    it('returns current state when recording', async () => {
      mockMkdir.mockResolvedValue(undefined)
      await recordingService.startRecording('pip')

      const state = recordingService.getRecordingState()

      expect(state.isRecording).toBe(true)
      expect(state.currentMode).toBe('pip')
      expect(state.outputFiles).toEqual({})
    })
  })

  describe('Integration Tests', () => {
    it('completes full recording lifecycle: start → completeRecording → reset', async () => {
      mockMkdir.mockResolvedValue(undefined)

      // Initial state
      let state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(false)

      // Start recording
      await recordingService.startRecording('screen')
      state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(true)
      expect(state.currentMode).toBe('screen')

      // Complete recording with mock buffer
      await new Promise((resolve) => setTimeout(resolve, 50))
      const mockBuffer = Buffer.from('mock video data')
      const output = await recordingService.completeRecording(mockBuffer)
      expect(output.metadata.mode).toBe('screen')
      expect(output.metadata.totalDuration).toBeGreaterThan(0)

      // Final state
      state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(false)
      expect(state.currentMode).toBe(null)
    })

    it('prevents concurrent recordings', async () => {
      mockMkdir.mockResolvedValue(undefined)

      await recordingService.startRecording('screen')

      // Try to start another recording
      await expect(recordingService.startRecording('webcam')).rejects.toThrow(
        new RecordingError(
          'Recording already in progress. Please stop the current recording before starting a new one.',
          RecordingErrorCode.UNKNOWN_ERROR
        )
      )

      // Clean up with mock buffer
      const mockBuffer = Buffer.from('mock video data')
      await recordingService.completeRecording(mockBuffer)
    })

    it('resetState clears recording state', async () => {
      mockMkdir.mockResolvedValue(undefined)

      // Start recording
      await recordingService.startRecording('screen')
      let state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(true)
      expect(state.currentMode).toBe('screen')

      // Force reset
      recordingService.resetState()

      // State should be cleared
      state = recordingService.getRecordingState()
      expect(state.isRecording).toBe(false)
      expect(state.currentMode).toBe(null)
      expect(state.outputFiles).toEqual({})
    })
  })
})
