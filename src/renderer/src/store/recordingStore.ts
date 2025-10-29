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
}

/**
 * Recording store actions
 */
interface RecordingActions {
  startRecording: (mode: RecordingMode) => Promise<void>
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
  outputFiles: {}
}

/**
 * Auto-import recorded files to media library and timeline
 * Story 5.7: Automatically import and place recordings
 * @param outputFiles - Recording output file paths
 * @param mode - Recording mode (screen, webcam, pip)
 * @param actualDuration - Actual recording duration in seconds (from wall-clock time)
 */
async function autoImportRecordings(
  outputFiles: RecordingOutputFiles,
  mode: RecordingMode,
  actualDuration?: number
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

        // Override duration if FFprobe returned 0 (WebM without duration metadata)
        if (mediaFile.duration === 0 && actualDuration && actualDuration > 0) {
          console.log(
            `[RecordingStore] Overriding screen duration: 0 → ${actualDuration.toFixed(2)}s`
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

          timelineStore.addClipToTrack(
            {
              id: `clip-${Date.now()}-screen`,
              sourceFile: mediaFile.path,
              intermediatePath: mediaFile.intermediatePath || mediaFile.path,
              startTime,
              duration: mediaFile.duration,
              trimIn: 0,
              trimOut: 0,
              trackId: 1
            },
            1
          )

          console.log('[RecordingStore] Screen recording added to Track 1 at', startTime)
        }
      }
    }

    // Import webcam recording if present
    if (outputFiles.webcam) {
      console.log('[RecordingStore] Importing webcam recording:', outputFiles.webcam)

      const webcamMediaFile = await window.api.importFile(outputFiles.webcam)

      if (webcamMediaFile.success && webcamMediaFile.data) {
        const mediaFile = webcamMediaFile.data

        // Override duration if FFprobe returned 0 (WebM without duration metadata)
        if (mediaFile.duration === 0 && actualDuration && actualDuration > 0) {
          console.log(
            `[RecordingStore] Overriding webcam duration: 0 → ${actualDuration.toFixed(2)}s`
          )
          mediaFile.duration = actualDuration
        }

        // Add to media library
        mediaStore.addFiles([mediaFile])
        console.log('[RecordingStore] Webcam recording added to media library')

        // Add to Track 2 (overlay track)
        const tracks = timelineStore.tracks
        const track2 = tracks.find((t) => t.id === 2)

        if (track2) {
          // Calculate start time (align with screen if PiP, or after existing clips)
          let startTime = 0
          if (mode === 'pip') {
            // PiP: align with screen recording
            const track1 = tracks.find((t) => t.id === 1)
            const screenClip = track1?.clips[track1.clips.length - 1]
            startTime = screenClip?.startTime || 0
          } else {
            // Webcam-only: after existing clips
            const lastClip = track2.clips[track2.clips.length - 1]
            startTime = lastClip ? lastClip.startTime + lastClip.duration : 0
          }

          timelineStore.addClipToTrack(
            {
              id: `clip-${Date.now()}-webcam`,
              sourceFile: mediaFile.path,
              intermediatePath: mediaFile.intermediatePath || mediaFile.path,
              startTime,
              duration: mediaFile.duration,
              trimIn: 0,
              trimOut: 0,
              trackId: 2
            },
            2
          )

          console.log('[RecordingStore] Webcam recording added to Track 2 at', startTime)
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
  startRecording: async (mode: RecordingMode) => {
    try {
      console.log('[RecordingStore] Starting recording with mode:', mode)

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
        outputFiles: {}
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
   */
  stopRecording: async () => {
    try {
      console.log('[RecordingStore] Stopping recording...')

      // Stop recording in renderer and get chunks
      const chunks = await recordingManager.stopRecording()

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
        const currentMode = useRecordingStore.getState().mode

        set({
          isRecording: false,
          outputFiles
        })

        console.log('[RecordingStore] Recording stopped successfully')
        console.log('[RecordingStore] Output files:', outputFiles)
        console.log('[RecordingStore] Actual duration:', actualDuration.toFixed(2), 'seconds')

        // Auto-import recordings to media library and timeline
        if (currentMode) {
          await autoImportRecordings(outputFiles, currentMode, actualDuration)
        }
      } else {
        throw new Error(response.error || 'Failed to stop recording')
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
