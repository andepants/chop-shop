/**
 * Recording Mode Modal Component
 * Modal dialog for selecting recording mode (screen, webcam, or PiP)
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUIStore } from '../../store/uiStore'
import { useRecordingStore } from '../../store/recordingStore'
import { Monitor, Camera, MonitorPlay, X } from 'lucide-react'
import type { RecordingMode } from '../../../../shared/types'

/**
 * Mode option configuration
 */
interface ModeOption {
  mode: RecordingMode
  label: string
  description: string
  icon: React.ReactNode
  isRecommended: boolean
}

/**
 * Recording mode options with icons and descriptions
 */
const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'screen',
    label: 'Screen Only',
    description: 'Record your screen activity',
    icon: <Monitor className="h-8 w-8" />,
    isRecommended: false
  },
  {
    mode: 'webcam',
    label: 'Webcam Only',
    description: 'Record from your camera',
    icon: <Camera className="h-8 w-8" />,
    isRecommended: false
  },
  {
    mode: 'pip',
    label: 'Screen + Webcam (PiP)',
    description: 'Record screen with camera overlay',
    icon: <MonitorPlay className="h-8 w-8" />,
    isRecommended: true
  }
]

/**
 * Recording Mode Modal
 * Presents 3 recording mode options with PiP highlighted as recommended
 */
export function RecordingModeModal(): React.JSX.Element {
  const isOpen = useUIStore((state) => state.recordingModal.isModalOpen)
  const closeRecordingModal = useUIStore((state) => state.closeRecordingModal)
  const startRecording = useRecordingStore((state) => state.startRecording)
  const showError = useUIStore((state) => state.showError)

  /**
   * Handle mode selection
   * Starts recording with selected mode and closes modal
   */
  async function handleModeSelect(mode: RecordingMode): Promise<void> {
    try {
      console.log('[RecordingModeModal] Starting recording with mode:', mode)
      await startRecording(mode)
      closeRecordingModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[RecordingModeModal] Failed to start recording:', error)
      showError(`Failed to start recording: ${errorMessage}`, 'Recording Error')
    }
  }

  /**
   * Handle modal close (cancel)
   */
  function handleClose(): void {
    closeRecordingModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-100">Choose Recording Mode</DialogTitle>
          <DialogDescription className="text-slate-400">
            Select how you want to record your content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.mode}
              onClick={() => handleModeSelect(option.mode)}
              className={`w-full flex items-center gap-4 p-5 rounded-lg border-2 transition-all group ${
                option.isRecommended
                  ? 'border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 ${
                  option.isRecommended ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {option.icon}
              </div>

              {/* Label and description */}
              <div className="flex-1 text-left">
                <div
                  className={`font-medium flex items-center gap-2 ${
                    option.isRecommended ? 'text-cyan-400' : 'text-slate-200'
                  }`}
                >
                  {option.label}
                  {option.isRecommended && (
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400 mt-1">{option.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <div className="flex justify-end pt-2 border-t border-slate-700">
          <Button variant="outline" onClick={handleClose} className="border-slate-600 text-slate-300">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
