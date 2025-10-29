/**
 * Recording Store
 * Zustand store for managing recording state and operations
 */

import { create } from 'zustand'
import type { RecordingMode, RecordingOutputFiles } from '../../../shared/types'
import { recordingManager } from '../services/RecordingManager'
import { useMediaStore } from './mediaStore'
import { useTimelineStore } from './timelineStore'

/**
 * Recording store state
 */
interface RecordingState {
  isRecording: boolean
  mode: RecordingMode | null
  duration: number
  outputFiles: RecordingOutputFiles
  pipSize: number
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * PiP configuration options
 */
interface PipConfig {
  pipSize: number
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * Recording store actions
 */
interface RecordingActions {
  startRecording: (mode: RecordingMode, config?: PipConfig) => Promise<void>
  stopRecording: () => Promise<void>
  updateDuration: (duration: number) => void
  reset: () => void
}

type RecordingStore = RecordingState & RecordingActions

/**
 * Initial state
 */
const initialState: RecordingState = {
  isRecording: false,
  mode: null,
  duration: 0,
  outputFiles: {},
  pipSize: 0.2, // Default: 20%
  pipPosition: 'bottom-right' // Default: bottom-right
}

/**
 * Auto-import recorded files to media library and timeline
 * Story 5.7: Automatically import and place recordings
 * @param outputFiles - Recording output file paths
 * @param mode - Recording mode (screen, webcam, pip)
 * @param actualDuration - Actual recording duration in seconds (from wall-clock time)
 * @param pipSize - PiP overlay size (0.1-0.5, default 0.2)
 * @param pipPosition - PiP overlay position (default 'bottom-right')
 */
async function autoImportRecordings(
  outputFiles: RecordingOutputFiles,
  mode: RecordingMode,
  actualDuration?: number,
  pipSize: number = 0.2,
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right'
): Promise<void> {
  try {
    console.log('[RecordingStore] Auto-importing recordings...', { outputFiles, mode })

    // Add delay to ensure file system has flushed all writes
    console.log('[RecordingStore] Waiting 500ms for file system flush...')
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log('[RecordingStore] File system flush delay complete, proceeding with import')

    const mediaStore = useMediaStore.getState()
    const timelineStore = useTimelineStore.getState()

    // Import screen recording if present
    if (outputFiles.screen) {
      console.log('[RecordingStore] Importing screen recording:', outputFiles.screen)

      const screenMediaFile = await window.api.importFile(outputFiles.screen)

      if (screenMediaFile.success && screenMediaFile.data) {
        const mediaFile = screenMediaFile.data

        // DEBUG: Log complete mediaFile object
        console.log('[RecordingStore] 📦 Screen mediaFile received:', {
          id: mediaFile.id,
          name: mediaFile.name,
          path: mediaFile.path,
          duration: mediaFile.duration,
          hasThumbnail: !!mediaFile.thumbnail,
          thumbnailLength: mediaFile.thumbnail?.length,
          hasAudio: mediaFile.hasAudio,
          resolution: mediaFile.resolution,
          intermediatePath: mediaFile.intermediatePath
        })

        // Always use actualDuration for freshly recorded files (wall-clock time is more accurate than FFprobe for WebM)
        if (actualDuration && actualDuration > 0) {
          console.log(
            `[RecordingStore] Using wall-clock duration for screen: ${mediaFile.duration.toFixed(2)}s → ${actualDuration.toFixed(2)}s`
          )
          mediaFile.duration = actualDuration
        }

        // Add to media library
        mediaStore.addFiles([mediaFile])
        console.log('[RecordingStore] Screen recording added to media library')

        // Add to Track 1 (main video track)
        const tracks = timelineStore.tracks
        const track1 = tracks.find((t) => t.id === 1)

        if (track1) {
          // Calculate start time (after existing clips)
          const lastClip = track1.clips[track1.clips.length - 1]
          const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0

          const clipData = {
            name: mediaFile.name,
            sourceFile: mediaFile.path,
            intermediatePath: mediaFile.intermediatePath || mediaFile.path,
            startTime,
            duration: mediaFile.duration,
            trimIn: 0,
            trimOut: 0,
            thumbnail: mediaFile.thumbnail,
            hasAudio: mediaFile.hasAudio,
            resolution: mediaFile.resolution
          }

          // DEBUG: Log clip data before adding to timeline
          console.log('[RecordingStore] 🎬 Adding screen clip to Track 1:', {
            name: clipData.name,
            startTime: clipData.startTime,
            duration: clipData.duration,
            hasThumbnail: !!clipData.thumbnail,
            hasAudio: clipData.hasAudio,
            resolution: clipData.resolution,
            trackId: 1
          })

          timelineStore.addClipToTrack(clipData, 1)

          console.log('[RecordingStore] ✅ Screen recording added to Track 1 at', startTime)
        }
      }
    }

    // Import webcam recording if present
    if (outputFiles.webcam) {
      console.log('[RecordingStore] Importing webcam recording:', outputFiles.webcam)

      const webcamMediaFile = await window.api.importFile(outputFiles.webcam)

      if (webcamMediaFile.success && webcamMediaFile.data) {
        const mediaFile = webcamMediaFile.data

        // DEBUG: Log complete mediaFile object
        console.log('[RecordingStore] 📦 Webcam mediaFile received:', {
          id: mediaFile.id,
          name: mediaFile.name,
          path: mediaFile.path,
          duration: mediaFile.duration,
          hasThumbnail: !!mediaFile.thumbnail,
          thumbnailLength: mediaFile.thumbnail?.length,
          hasAudio: mediaFile.hasAudio,
          resolution: mediaFile.resolution,
          intermediatePath: mediaFile.intermediatePath
        })

        // Always use actualDuration for freshly recorded files (wall-clock time is more accurate than FFprobe for WebM)
        if (actualDuration && actualDuration > 0) {
          console.log(
            `[RecordingStore] Using wall-clock duration for webcam: ${mediaFile.duration.toFixed(2)}s → ${actualDuration.toFixed(2)}s`
          )
          mediaFile.duration = actualDuration
        }

        // Add to media library
        mediaStore.addFiles([mediaFile])
        console.log('[RecordingStore] Webcam recording added to media library')

        // Add to Track 1 (standalone webcam) or Track 2 (PiP overlay)
        const tracks = timelineStore.tracks
        const targetTrackId = mode === 'pip' ? 2 : 1
        const targetTrack = tracks.find((t) => t.id === targetTrackId)

        if (targetTrack) {
          // Calculate start time (align with screen if PiP, or after existing clips)
          let startTime = 0
          if (mode === 'pip') {
            // PiP: align with screen recording
            const track1 = tracks.find((t) => t.id === 1)
            const screenClip = track1?.clips[track1.clips.length - 1]
            startTime = screenClip?.startTime || 0
          } else {
            // Webcam-only: after existing clips on target track
            const lastClip = targetTrack.clips[targetTrack.clips.length - 1]
            startTime = lastClip ? lastClip.startTime + lastClip.duration : 0
          }

          const clipData = {
            name: mediaFile.name,
            sourceFile: mediaFile.path,
            intermediatePath: mediaFile.intermediatePath || mediaFile.path,
            startTime,
            duration: mediaFile.duration,
            trimIn: 0,
            trimOut: 0,
            thumbnail: mediaFile.thumbnail,
            hasAudio: mediaFile.hasAudio,
            resolution: mediaFile.resolution,
            // Add PiP positioning for Track 2 overlay (use configured values)
            ...(targetTrackId === 2 && {
              pipPosition: pipPosition as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
              pipSize: pipSize
            })
          }

          // DEBUG: Log clip data before adding to timeline
          console.log(`[RecordingStore] 🎬 Adding webcam clip to Track ${targetTrackId}:`, {
            name: clipData.name,
            startTime: clipData.startTime,
            duration: clipData.duration,
            hasThumbnail: !!clipData.thumbnail,
            hasAudio: clipData.hasAudio,
            resolution: clipData.resolution,
            trackId: targetTrackId
          })

          timelineStore.addClipToTrack(clipData, targetTrackId)

          console.log(`[RecordingStore] ✅ Webcam recording added to Track ${targetTrackId} at`, startTime)
        }
      }
    }

    console.log('[RecordingStore] Auto-import complete')
  } catch (error) {
    console.error('[RecordingStore] Auto-import failed:', error)
    // Don't throw - allow user to manually import if needed
  }
}

/**
 * Recording state store
 * Manages recording session state, mode, duration, and output files
 */
export const useRecordingStore = create<RecordingStore>((set) => ({
  // State
  ...initialState,

  /**
   * Start recording with selected mode
   * Coordinates with main process and starts MediaRecorder in renderer
   */
  startRecording: async (mode: RecordingMode, config?: PipConfig) => {
    try {
      const pipSize = config?.pipSize ?? 0.2
      const pipPosition = config?.pipPosition ?? 'bottom-right'

      console.log('[RecordingStore] Starting recording with mode:', mode, {
        pipSize,
        pipPosition
      })

      // PRE-FLIGHT CHECK: Verify main process state before starting
      const stateResponse = await window.api.getRecordingState()
      if (stateResponse.success && stateResponse.data?.isRecording) {
        console.warn('[RecordingStore] Main process shows recording in progress. Resetting state...')
        await window.api.resetRecordingState()
      }

      // Notify main process to start coordination
      const response = await window.api.startRecording({ mode })

      if (!response.success) {
        throw new Error(response.error || 'Failed to start recording coordination')
      }

      // Start actual recording in renderer
      if (mode === 'screen') {
        await recordingManager.startScreenRecording()
      } else if (mode === 'webcam') {
        await recordingManager.startWebcamRecording()
      } else if (mode === 'pip') {
        await recordingManager.startPiPRecording()
      } else {
        throw new Error(`Unknown recording mode: ${mode}`)
      }

      set({
        isRecording: true,
        mode,
        duration: 0,
        outputFiles: {},
        pipSize,
        pipPosition
      })

      console.log('[RecordingStore] Recording started successfully')
    } catch (error) {
      console.error('[RecordingStore] Failed to start recording:', error)

      // ERROR RECOVERY: Reset main process state if renderer failed
      try {
        console.log('[RecordingStore] Resetting main process state after error...')
        await window.api.resetRecordingState()
      } catch (resetError) {
        console.error('[RecordingStore] Failed to reset main process state:', resetError)
      }

      throw error
    }
  },

  /**
   * Stop recording
   * Stops MediaRecorder and sends data to main process for file writing
   * Handles both single-file modes (screen, webcam) and dual-file mode (PiP)
   */
  stopRecording: async () => {
    try {
      console.log('[RecordingStore] Stopping recording...')

      const currentMode = useRecordingStore.getState().mode

      // Stop recording in renderer and get chunks
      const result = await recordingManager.stopRecording()

      // Check if this is PiP mode with dual blobs
      if (currentMode === 'pip' && !Array.isArray(result)) {
        console.log('[RecordingStore] Processing PiP dual recording...')

        // Convert screen chunks to Blob
        const screenBlob = new Blob(result.screen, { type: 'video/webm;codecs=vp9' })
        const screenBuffer = new Uint8Array(await screenBlob.arrayBuffer())

        // Convert webcam chunks to Blob
        const webcamBlob = new Blob(result.webcam, { type: 'video/webm;codecs=vp9' })
        const webcamBuffer = new Uint8Array(await webcamBlob.arrayBuffer())

        console.log(`[RecordingStore] Sending PiP data - Screen: ${screenBuffer.length} bytes, Webcam: ${webcamBuffer.length} bytes`)

        // Send to main process for dual file writing
        const response = await window.electron.ipcRenderer.invoke('recording:stop-pip', {
          screenData: screenBuffer,
          webcamData: webcamBuffer
        })

        if (response.success && response.data) {
          const outputFiles = response.data.outputFiles || {}
          const actualDuration = response.data.duration || 0

          set({
            isRecording: false,
            outputFiles
          })

          console.log('[RecordingStore] PiP recording stopped successfully')
          console.log('[RecordingStore] Output files:', outputFiles)
          console.log('[RecordingStore] Actual duration:', actualDuration.toFixed(2), 'seconds')

          // Auto-import both recordings to media library and timeline
          const { pipSize, pipPosition } = useRecordingStore.getState()
          await autoImportRecordings(outputFiles, 'pip', actualDuration, pipSize, pipPosition)
        } else {
          throw new Error(response.error || 'Failed to stop PiP recording')
        }
      } else {
        // Single file mode (screen-only or webcam-only)
        console.log('[RecordingStore] Processing single recording...')

        const chunks = result as Blob[]

        // Convert chunks to single Blob
        const blob = new Blob(chunks, { type: 'video/webm;codecs=vp9' })

        // Convert to ArrayBuffer for IPC transfer
        const arrayBuffer = await blob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        console.log(`[RecordingStore] Sending ${uint8Array.length} bytes to main process...`)

        // Send to main process for file writing
        const response = await window.electron.ipcRenderer.invoke('recording:stop', {
          recordingData: uint8Array
        })

        if (response.success && response.data) {
          const outputFiles = response.data.outputFiles || {}
          const actualDuration = response.data.duration || 0

          set({
            isRecording: false,
            outputFiles
          })

          console.log('[RecordingStore] Recording stopped successfully')
          console.log('[RecordingStore] Output files:', outputFiles)
          console.log('[RecordingStore] Actual duration:', actualDuration.toFixed(2), 'seconds')

          // Auto-import recordings to media library and timeline
          if (currentMode) {
            const { pipSize, pipPosition } = useRecordingStore.getState()
            await autoImportRecordings(outputFiles, currentMode, actualDuration, pipSize, pipPosition)
          }
        } else {
          throw new Error(response.error || 'Failed to stop recording')
        }
      }
    } catch (error) {
      console.error('[RecordingStore] Failed to stop recording:', error)
      // Still update state to not-recording even if IPC fails
      set({ isRecording: false })
      throw error
    }
  },

  /**
   * Update recording duration (called periodically during recording)
   */
  updateDuration: (duration: number) => {
    set({ duration })
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState)
  }
}))
