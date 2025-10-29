/**
 * Recording Service
 * Centralized service for screen and webcam recording with auto-configuration
 * Handles auto-selection of primary screen and default webcam, temp file management,
 * and recording lifecycle with fixed configuration defaults
 */

import { desktopCapturer } from 'electron'
import type { DesktopCapturerSource } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'

/**
 * Recording mode types
 */
export type RecordingMode = 'screen' | 'webcam' | 'pip'

/**
 * Recording output metadata for a single recording file
 */
export interface RecordingFileOutput {
  path: string
  size: number
  duration: number
  format: string
}

/**
 * Recording output containing all generated files and metadata
 */
export interface RecordingOutput {
  files: {
    screen?: RecordingFileOutput
    webcam?: RecordingFileOutput
  }
  metadata: {
    mode: RecordingMode
    startTime: Date
    endTime: Date
    totalDuration: number
  }
}

/**
 * Fixed recording configuration defaults
 * No user configuration - smart defaults only per Epic 5 requirements
 */
export const RECORDING_DEFAULTS = {
  screen: {
    resolution: { width: 1920, height: 1080 },
    framerate: 30,
    bitrate: 8_000_000 // 8 Mbps
  },
  webcam: {
    resolution: { width: 640, height: 480 },
    framerate: 30,
    bitrate: 2_500_000, // 2.5 Mbps
    position: 'bottom-right' as const,
    size: 0.2, // 20% of screen size
    shape: 'circle' as const
  },
  audio: {
    autoSelectMicrophone: true,
    echoCancellation: true,
    noiseSuppression: true
  },
  storage: {
    tempDir: path.join(os.tmpdir(), 'chop-shop', 'recordings'),
    format: 'webm',
    codec: 'vp9'
  }
} as const

/**
 * Recording error codes
 */
export enum RecordingErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NO_DEVICES_FOUND = 'NO_DEVICES_FOUND',
  DEVICE_BUSY = 'DEVICE_BUSY',
  DIRECTORY_ERROR = 'DIRECTORY_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Recording error with code and user-friendly messages
 */
export class RecordingError extends Error {
  constructor(
    message: string,
    public code: RecordingErrorCode
  ) {
    super(message)
    this.name = 'RecordingError'
  }
}

/**
 * Recording Service
 * Singleton service for managing screen and webcam recording
 */
class RecordingService {
  private isRecording: boolean = false
  private currentMode: RecordingMode | null = null
  private outputFiles: RecordingOutput['files'] = {}
  private startTime: Date | null = null

  constructor() {
    console.log('[Recording] Recording service initialized')
    this.ensureRecordingDirectory().catch((error) => {
      console.error('[Recording] Failed to initialize recording directory:', error)
    })
  }

  /**
   * Get primary screen source for recording
   * Auto-selects the first screen from desktopCapturer with no user input
   * @returns Primary screen source
   * @throws RecordingError if no screen is available
   */
  async getPrimaryScreen(): Promise<DesktopCapturerSource> {
    try {
      console.log('[Recording] Requesting primary screen source...')
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 } // Don't generate thumbnails
      })

      if (sources.length === 0) {
        throw new RecordingError(
          'No screens found. Please ensure your display is connected and try again.',
          RecordingErrorCode.NO_DEVICES_FOUND
        )
      }

      const primaryScreen = sources[0]
      console.log(
        `[Recording] Auto-selected primary screen: ${primaryScreen.name} (ID: ${primaryScreen.id})`
      )

      return primaryScreen
    } catch (error) {
      if (error instanceof RecordingError) {
        throw error
      }

      // Handle permission errors
      if (error instanceof Error && error.message.includes('denied')) {
        throw new RecordingError(
          'Screen recording permission denied. Please enable screen recording in System Preferences > Privacy & Security > Screen Recording.',
          RecordingErrorCode.PERMISSION_DENIED
        )
      }

      console.error('[Recording] Failed to get primary screen:', error)
      throw new RecordingError(
        'Failed to access screen sources. Please try again.',
        RecordingErrorCode.UNKNOWN_ERROR
      )
    }
  }

  /**
   * Get default webcam device for recording
   * Auto-selects the first videoinput device with fallback logic
   * @returns Default webcam device info
   * @throws RecordingError if no webcam is available
   */
  async getDefaultWebcam(): Promise<MediaDeviceInfo> {
    try {
      console.log('[Recording] Requesting default webcam device...')
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === 'videoinput')

      if (videoDevices.length === 0) {
        throw new RecordingError(
          'No webcam found. Please connect a camera and try again.',
          RecordingErrorCode.NO_DEVICES_FOUND
        )
      }

      // Auto-select first available webcam
      const defaultWebcam = videoDevices[0]
      console.log(
        `[Recording] Auto-selected webcam: ${defaultWebcam.label || 'Default Camera'} (ID: ${defaultWebcam.deviceId})`
      )

      return defaultWebcam
    } catch (error) {
      if (error instanceof RecordingError) {
        throw error
      }

      // Handle permission errors (NotAllowedError)
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new RecordingError(
          'Camera permission denied. Please enable camera access in System Preferences > Privacy & Security > Camera.',
          RecordingErrorCode.PERMISSION_DENIED
        )
      }

      // Handle device not found errors (NotFoundError)
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new RecordingError(
          'No webcam found. Please connect a camera and try again.',
          RecordingErrorCode.NO_DEVICES_FOUND
        )
      }

      // Handle device busy errors (NotReadableError)
      if (error instanceof Error && error.name === 'NotReadableError') {
        throw new RecordingError(
          'Camera is busy or already in use by another application. Please close other apps using the camera and try again.',
          RecordingErrorCode.DEVICE_BUSY
        )
      }

      console.error('[Recording] Failed to get default webcam:', error)
      throw new RecordingError(
        'Failed to access webcam. Please try again.',
        RecordingErrorCode.UNKNOWN_ERROR
      )
    }
  }

  /**
   * Ensure recording directory exists with proper error handling
   * Creates temp directory at os.tmpdir()/chop-shop/recordings/
   * @throws RecordingError if directory creation fails
   */
  async ensureRecordingDirectory(): Promise<void> {
    try {
      const recordingDir = RECORDING_DEFAULTS.storage.tempDir
      console.log(`[Recording] Ensuring recording directory exists: ${recordingDir}`)

      await mkdir(recordingDir, { recursive: true })
      console.log('[Recording] Recording directory ready')
    } catch (error) {
      // Handle permission errors (EACCES)
      if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
        throw new RecordingError(
          `Permission denied creating recording directory. Please check your system permissions for: ${RECORDING_DEFAULTS.storage.tempDir}`,
          RecordingErrorCode.DIRECTORY_ERROR
        )
      }

      // Handle no space errors (ENOSPC)
      if (error instanceof Error && 'code' in error && error.code === 'ENOSPC') {
        throw new RecordingError(
          'Insufficient disk space to create recording directory. Please free up space and try again.',
          RecordingErrorCode.DIRECTORY_ERROR
        )
      }

      console.error('[Recording] Failed to create recording directory:', error)
      throw new RecordingError(
        'Failed to create recording directory. Please check your system permissions.',
        RecordingErrorCode.DIRECTORY_ERROR
      )
    }
  }

  /**
   * Save recorded chunks to file
   * @param buffer - Recording data buffer from renderer
   * @param filename - Output filename
   * @returns Absolute file path and file size
   */
  async saveRecordingFile(buffer: Buffer, filename: string): Promise<{ path: string; size: number }> {
    try {
      const filePath = path.join(RECORDING_DEFAULTS.storage.tempDir, filename)
      console.log(`[Recording] Saving recording to: ${filePath}`)

      // Write file
      await writeFile(filePath, buffer)

      const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2)
      console.log(`[Recording] Saved: ${filePath} (${fileSizeMB} MB)`)

      return {
        path: filePath,
        size: buffer.length
      }
    } catch (error) {
      // Handle disk space errors
      if (error instanceof Error && 'code' in error && error.code === 'ENOSPC') {
        throw new RecordingError(
          'Insufficient disk space to save recording. Please free up space and try again.',
          RecordingErrorCode.DIRECTORY_ERROR
        )
      }

      console.error('[Recording] Failed to save recording:', error)
      throw new RecordingError(
        'Failed to save recording file.',
        RecordingErrorCode.UNKNOWN_ERROR
      )
    }
  }

  /**
   * Start recording with specified mode
   * Coordinates with renderer process for actual capture
   * @param mode - Recording mode (screen, webcam, or pip)
   * @throws RecordingError if already recording or recording fails to start
   */
  async startRecording(mode: RecordingMode): Promise<void> {
    if (this.isRecording) {
      throw new RecordingError(
        'Recording already in progress. Please stop the current recording before starting a new one.',
        RecordingErrorCode.UNKNOWN_ERROR
      )
    }

    console.log(`[Recording] Starting ${mode} recording at ${new Date().toISOString()}`)

    try {
      // Ensure recording directory exists
      await this.ensureRecordingDirectory()

      // All modes supported now

      // Update state (actual recording happens in renderer via RecordingManager)
      this.isRecording = true
      this.currentMode = mode
      this.startTime = new Date()
      this.outputFiles = {}

      console.log(`[Recording] ${mode} recording coordination started`)
    } catch (error) {
      // Reset state on failure
      this.isRecording = false
      this.currentMode = null
      this.startTime = null

      console.error('[Recording] Failed to start recording:', error)
      throw error
    }
  }

  /**
   * Complete recording with file data from renderer
   * @param buffer - Recording data from renderer
   * @returns Recording output with file paths and metadata
   * @throws RecordingError if no recording is in progress
   */
  async completeRecording(buffer: Buffer): Promise<RecordingOutput> {
    if (!this.isRecording || !this.currentMode || !this.startTime) {
      throw new RecordingError(
        'No recording in progress. Please start a recording before stopping.',
        RecordingErrorCode.UNKNOWN_ERROR
      )
    }

    const endTime = new Date()
    const mode = this.currentMode
    const startTime = this.startTime

    console.log(`[Recording] Completing ${mode} recording at ${endTime.toISOString()}`)

    try {
      // Save recording to file
      const timestamp = Date.now()
      const filename = `${mode}-recording-${timestamp}.webm`

      const { path: filePath, size } = await this.saveRecordingFile(buffer, filename)

      // Populate output files with metadata based on mode
      const fileMetadata = {
        path: filePath,
        size,
        duration: (endTime.getTime() - startTime.getTime()) / 1000,
        format: 'webm'
      }

      if (mode === 'screen') {
        this.outputFiles.screen = fileMetadata
      } else if (mode === 'webcam') {
        this.outputFiles.webcam = fileMetadata
      } else if (mode === 'pip') {
        // PiP creates both files
        this.outputFiles.screen = fileMetadata
        this.outputFiles.webcam = fileMetadata
      }

      const output: RecordingOutput = {
        files: this.outputFiles,
        metadata: {
          mode,
          startTime,
          endTime,
          totalDuration: (endTime.getTime() - startTime.getTime()) / 1000
        }
      }

      console.log(
        `[Recording] Recording completed. Duration: ${output.metadata.totalDuration.toFixed(2)}s`
      )

      // Reset state
      this.isRecording = false
      this.currentMode = null
      this.outputFiles = {}
      this.startTime = null

      return output
    } catch (error) {
      console.error('[Recording] Error completing recording:', error)

      // Cleanup on error
      this.isRecording = false
      this.currentMode = null
      this.startTime = null

      throw new RecordingError(
        'Failed to complete recording properly. Some files may not have been saved.',
        RecordingErrorCode.UNKNOWN_ERROR
      )
    }
  }

  /**
   * Get current recording state
   */
  getRecordingState(): {
    isRecording: boolean
    currentMode: RecordingMode | null
    outputFiles: RecordingOutput['files']
  } {
    return {
      isRecording: this.isRecording,
      currentMode: this.currentMode,
      outputFiles: { ...this.outputFiles }
    }
  }

  /**
   * Force reset recording state
   * Used for recovery when renderer and main process states are out of sync
   */
  resetState(): void {
    console.log('[Recording] Force resetting recording state')
    this.isRecording = false
    this.currentMode = null
    this.outputFiles = {}
    this.startTime = null
  }
}

// Export singleton instance
export const recordingService = new RecordingService()
