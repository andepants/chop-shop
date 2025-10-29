/**
 * Recording Mode Modal Component
 * Modal dialog for selecting recording mode (screen, webcam, or PiP)
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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

  // PiP configuration state
  const [selectedMode, setSelectedMode] = useState<RecordingMode | null>(null)
  const [pipSize, setPipSize] = useState<number>(0.2) // Default: Medium (20%)
  const [pipPosition, setPipPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right') // Default: Bottom-right

  /**
   * Handle mode button click
   * For screen/webcam: start immediately
   * For PiP: show configuration options
   */
  function handleModeClick(mode: RecordingMode): void {
    if (mode === 'pip') {
      setSelectedMode('pip')
    } else {
      handleStartRecording(mode)
    }
  }

  /**
   * Handle start recording with current configuration
   * Starts recording with selected mode and closes modal
   */
  async function handleStartRecording(mode: RecordingMode): Promise<void> {
    try {
      console.log('[RecordingModeModal] Starting recording with mode:', mode, {
        pipSize,
        pipPosition
      })
      await startRecording(mode, mode === 'pip' ? { pipSize, pipPosition } : undefined)
      closeRecordingModal()
      // Reset state
      setSelectedMode(null)
      setPipSize(0.2)
      setPipPosition('bottom-right')
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
    // Reset state
    setSelectedMode(null)
    setPipSize(0.2)
    setPipPosition('bottom-right')
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
              onClick={() => handleModeClick(option.mode)}
              className={`w-full flex items-center gap-4 p-5 rounded-lg border-2 transition-all group ${
                selectedMode === option.mode
                  ? 'border-cyan-400 bg-cyan-500/20'
                  : option.isRecommended
                    ? 'border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 ${
                  selectedMode === option.mode || option.isRecommended
                    ? 'text-cyan-400'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {option.icon}
              </div>

              {/* Label and description */}
              <div className="flex-1 text-left">
                <div
                  className={`font-medium flex items-center gap-2 ${
                    selectedMode === option.mode || option.isRecommended
                      ? 'text-cyan-400'
                      : 'text-slate-200'
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

        {/* PiP Configuration Options */}
        {selectedMode === 'pip' && (
          <div className="space-y-4 py-4 px-1 border-t border-slate-700">
            <div className="text-sm font-medium text-slate-300 mb-3">
              Configure Webcam Overlay
            </div>

            {/* Webcam Size Dropdown */}
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Webcam Size</label>
              <Select
                value={pipSize.toString()}
                onValueChange={(value) => setPipSize(parseFloat(value))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="0.1" className="text-slate-200">
                    Small (10%)
                  </SelectItem>
                  <SelectItem value="0.2" className="text-slate-200">
                    Medium (20%)
                  </SelectItem>
                  <SelectItem value="0.3" className="text-slate-200">
                    Large (30%)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Webcam Position Dropdown */}
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Webcam Position</label>
              <Select value={pipPosition} onValueChange={(value) => setPipPosition(value as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right')}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="top-left" className="text-slate-200">
                    Top Left
                  </SelectItem>
                  <SelectItem value="top-right" className="text-slate-200">
                    Top Right
                  </SelectItem>
                  <SelectItem value="bottom-left" className="text-slate-200">
                    Bottom Left
                  </SelectItem>
                  <SelectItem value="bottom-right" className="text-slate-200">
                    Bottom Right
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Recording Button */}
            <Button
              onClick={() => handleStartRecording('pip')}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white mt-4"
            >
              Start Recording
            </Button>
          </div>
        )}

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
