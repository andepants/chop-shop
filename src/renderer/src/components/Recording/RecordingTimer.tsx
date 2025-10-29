/**
 * RecordingTimer Component
 * Floating timer overlay that appears during recording sessions
 * Shows elapsed time, recording mode, and provides stop button
 */

import { useEffect } from 'react'
import { Circle } from 'lucide-react'
import { useRecordingStore } from '../../store/recordingStore'
import { Button } from '../ui/button'

/**
 * Format seconds to MM:SS display
 * @param seconds - Total seconds elapsed
 * @returns Formatted time string
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Get user-friendly recording mode label
 * @param mode - Recording mode type
 * @returns Display label for mode
 */
function getModeLabel(mode: 'screen' | 'webcam' | 'pip' | null): string {
  if (!mode) return 'Unknown'

  const labels = {
    screen: 'Screen',
    webcam: 'Webcam',
    pip: 'Screen + Webcam'
  }

  return labels[mode] || 'Unknown'
}

/**
 * RecordingTimer - Floating overlay showing recording status and controls
 * Auto-shows when recording starts, hides when stopped
 * Updates elapsed time every second
 */
export function RecordingTimer() {
  const isRecording = useRecordingStore((state) => state.isRecording)
  const mode = useRecordingStore((state) => state.mode)
  const duration = useRecordingStore((state) => state.duration)
  const updateDuration = useRecordingStore((state) => state.updateDuration)
  const stopRecording = useRecordingStore((state) => state.stopRecording)

  // Timer interval - update every second while recording
  useEffect(() => {
    if (!isRecording) return

    const interval = setInterval(() => {
      updateDuration(duration + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording, duration, updateDuration])

  // Hide if not recording
  if (!isRecording) return null

  /**
   * Handle stop recording button click
   * Shows error notification if stop fails
   */
  async function handleStop() {
    try {
      await stopRecording()
      console.log('[RecordingTimer] Recording stopped successfully')
    } catch (error) {
      console.error('[RecordingTimer] Failed to stop recording:', error)
      // Error is already logged by recordingStore
    }
  }

  return (
    <div className="fixed top-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-4 rounded-lg shadow-2xl z-50 min-w-[200px]">
      {/* Recording indicator with pulsing dot */}
      <div className="flex items-center gap-2 mb-3">
        <Circle className="h-3 w-3 fill-red-500 text-red-500 animate-pulse" />
        <span className="text-slate-300 text-sm font-medium">Recording</span>
      </div>

      {/* Elapsed time display */}
      <div className="text-white font-mono text-3xl font-bold mb-1">
        {formatTime(duration)}
      </div>

      {/* Recording mode indicator */}
      <div className="text-slate-400 text-sm mb-4">
        {getModeLabel(mode)}
      </div>

      {/* Stop recording button */}
      <Button
        onClick={handleStop}
        className="w-full bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
        size="sm"
      >
        Stop Recording
      </Button>
    </div>
  )
}
