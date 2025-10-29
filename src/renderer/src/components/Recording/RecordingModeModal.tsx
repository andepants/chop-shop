/**
 * Recording Mode Modal Component
 * Modal dialog for selecting recording mode (screen, webcam, or PiP)
 * Redesigned following Adobe Premiere design principles
 */

import { useState, useEffect } from 'react'
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
import type { RecordingMode } from '@shared/types'

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
 * Icons sized at 20px (h-5 w-5) following Premiere compact design
 */
const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'screen',
    label: 'Screen Only',
    description: 'Record your screen activity',
    icon: <Monitor className="h-5 w-5" />,
    isRecommended: false
  },
  {
    mode: 'webcam',
    label: 'Webcam Only',
    description: 'Record from your camera',
    icon: <Camera className="h-5 w-5" />,
    isRecommended: false
  },
  {
    mode: 'pip',
    label: 'Screen + Webcam (PiP)',
    description: 'Record screen with camera overlay',
    icon: <MonitorPlay className="h-5 w-5" />,
    isRecommended: true
  }
]

/**
 * PiP size options with better labels
 */
const PIP_SIZE_OPTIONS = [
  { value: 0.1, label: 'Small', dimensions: '10%' },
  { value: 0.2, label: 'Medium', dimensions: '20%' },
  { value: 0.3, label: 'Large', dimensions: '30%' }
]

/**
 * PiP position options for visual grid
 */
type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const PIP_POSITIONS: { value: PipPosition; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' }
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
  const [pipPosition, setPipPosition] = useState<PipPosition>('bottom-right') // Default: Bottom-right

  /**
   * Keyboard shortcuts handler
   * 1/2/3 - Select recording mode
   * Enter - Start recording (when PiP configured)
   * ESC - Close modal (handled by Dialog component)
   */
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent): void {
      // Number keys for mode selection
      if (e.key === '1') {
        handleModeClick('screen')
      } else if (e.key === '2') {
        handleModeClick('webcam')
      } else if (e.key === '3') {
        handleModeClick('pip')
      } else if (e.key === 'Enter' && selectedMode === 'pip') {
        // Start recording if PiP is configured
        handleStartRecording('pip')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedMode])

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
      <DialogContent className="sm:max-w-[520px] bg-slate-900/98 backdrop-blur-sm border-slate-700 sm:rounded-md p-5">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-semibold text-slate-100">
            Choose Recording Mode
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Select how you want to record your content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-3">
          {MODE_OPTIONS.map((option, index) => (
            <button
              key={option.mode}
              onClick={() => handleModeClick(option.mode)}
              className={`w-full flex items-center gap-3 p-3 rounded-sm border transition-all duration-150 group ${
                selectedMode === option.mode
                  ? 'border-cyan-500/80 bg-cyan-500/15'
                  : option.isRecommended
                    ? 'border-cyan-600/40 bg-cyan-500/8 hover:bg-cyan-500/12 hover:border-cyan-500/60'
                    : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/60 hover:border-slate-600/70'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 ${
                  selectedMode === option.mode || option.isRecommended
                    ? 'text-cyan-400/90'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {option.icon}
              </div>

              {/* Label and description */}
              <div className="flex-1 text-left">
                <div
                  className={`text-sm font-semibold flex items-center gap-2 ${
                    selectedMode === option.mode || option.isRecommended
                      ? 'text-cyan-400/90'
                      : 'text-slate-200'
                  }`}
                >
                  {option.label}
                  {option.isRecommended && (
                    <span className="text-[11px] px-1.5 py-0.5 bg-cyan-500/15 text-cyan-400/80 rounded border border-cyan-500/25 font-medium">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 leading-tight">
                  {option.description}
                </div>
              </div>

              {/* Keyboard shortcut hint */}
              <div className="flex-shrink-0 text-[10px] text-slate-500 font-medium">
                {index + 1}
              </div>
            </button>
          ))}
        </div>

        {/* PiP Configuration Options */}
        {selectedMode === 'pip' && (
          <div className="space-y-4 pt-4 border-t border-slate-700/50">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
              Webcam Overlay Settings
            </div>

            {/* Webcam Size Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Size</label>
              <div className="grid grid-cols-3 gap-2">
                {PIP_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPipSize(option.value)}
                    className={`p-2 rounded-sm border text-xs font-medium transition-all duration-150 ${
                      pipSize === option.value
                        ? 'border-cyan-500/80 bg-cyan-500/15 text-cyan-400'
                        : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 hover:border-slate-600/70'
                    }`}
                  >
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{option.dimensions}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Webcam Position Visual Grid */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Position</label>
              <div className="grid grid-cols-2 gap-2">
                {PIP_POSITIONS.map((position) => (
                  <button
                    key={position.value}
                    onClick={() => setPipPosition(position.value)}
                    className={`p-2.5 rounded-sm border text-xs font-medium transition-all duration-150 relative ${
                      pipPosition === position.value
                        ? 'border-cyan-500/80 bg-cyan-500/15 text-cyan-400'
                        : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 hover:border-slate-600/70'
                    }`}
                  >
                    {/* Visual preview of position */}
                    <div className="flex items-center justify-center mb-1.5">
                      <div className="relative w-16 h-12 bg-slate-900/50 rounded-sm border border-slate-700/40">
                        <div
                          className={`absolute w-4 h-3 bg-cyan-500/40 rounded-[1px] border border-cyan-500/60 ${
                            position.value === 'top-left' ? 'top-0.5 left-0.5' :
                            position.value === 'top-right' ? 'top-0.5 right-0.5' :
                            position.value === 'bottom-left' ? 'bottom-0.5 left-0.5' :
                            'bottom-0.5 right-0.5'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="font-semibold">{position.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Recording Button */}
            <Button
              onClick={() => handleStartRecording('pip')}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white h-8 text-sm font-medium mt-2"
            >
              Start Recording
              <span className="ml-2 text-[10px] opacity-60">Enter</span>
            </Button>
          </div>
        )}

        {/* Cancel button */}
        <div className="flex justify-end pt-3 border-t border-slate-700/50">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-8 text-xs border-slate-700/60 text-slate-400 hover:text-slate-300 hover:border-slate-600/70 hover:bg-slate-800/40"
          >
            <X className="h-3 w-3 mr-1.5" />
            Cancel
            <span className="ml-2 text-[10px] opacity-60">ESC</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
