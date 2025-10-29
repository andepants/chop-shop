/**
 * Transcription Panel
 *
 * Interface for transcribing video audio using Whisper API.
 * Provides editable transcription text, user guidance input, and validation.
 */

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Progress } from '../ui/progress'
import { useAIStore } from '../../store/aiStore'
import { useTimelineStore } from '../../store/timelineStore'
import { Loader2, AlertCircle, Sparkles, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { TIMELINE_ERRORS, VALIDATION_ERRORS } from '../../../../shared/constants/error-messages'
import { logError } from '../../utils/error-handler'

/**
 * Validates transcription input for content generation
 * @param transcription - Transcription text
 * @param userGuidance - User guidance text
 * @param includeTranscription - Whether to include transcription
 * @returns True if valid (at least one field has content)
 */
export function validateTranscriptionInput(
  transcription: string,
  userGuidance: string,
  includeTranscription: boolean
): boolean {
  const hasTranscription = includeTranscription && transcription.trim().length > 0
  const hasGuidance = userGuidance.trim().length > 0
  return hasTranscription || hasGuidance
}

/**
 * Transcription Panel Component
 *
 * Allows users to transcribe audio, edit transcription, and provide guidance
 */
export function TranscriptionPanel() {
  // State from stores
  const clips = useTimelineStore((state) => state.clips)
  const transcriptionStatus = useAIStore((state) => state.transcriptionStatus)
  const transcriptionProgress = useAIStore((state) => state.transcriptionProgress)
  const transcriptionText = useAIStore((state) => state.transcriptionText)
  const userGuidance = useAIStore((state) => state.userGuidance)
  const includeTranscription = useAIStore((state) => state.includeTranscription)
  const transcriptionError = useAIStore((state) => state.transcriptionError)

  // Actions from stores
  const setTranscription = useAIStore((state) => state.setTranscription)
  const setTranscriptionStatus = useAIStore((state) => state.setTranscriptionStatus)
  const setTranscriptionProgress = useAIStore((state) => state.setTranscriptionProgress)
  const setTranscriptionError = useAIStore((state) => state.setTranscriptionError)
  const setTranscriptionText = useAIStore((state) => state.setTranscriptionText)
  const setUserGuidance = useAIStore((state) => state.setUserGuidance)
  const setIncludeTranscription = useAIStore((state) => state.setIncludeTranscription)
  const clearTranscription = useAIStore((state) => state.clearTranscription)

  // Local state
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Check if timeline has clips
  const hasClips = clips.length > 0
  const isTranscribing = transcriptionStatus === 'extracting' || transcriptionStatus === 'transcribing'

  /**
   * Handle transcribe button click
   */
  async function handleTranscribe() {
    // Validate timeline has clips
    if (!hasClips) {
      const errorMsg = TIMELINE_ERRORS.NO_CLIPS
      setTranscriptionError(errorMsg)
      logError('TranscriptionPanel', errorMsg, { clipCount: clips.length })
      return
    }

    try {
      setTranscriptionStatus('extracting')
      setTranscriptionError(null)
      setValidationError(null)

      // Call IPC to transcribe audio
      const response = await window.api.transcribeAudio()

      if (response.success && response.data) {
        setTranscription(response.data.text, response.data.duration, response.data.warning)
      } else {
        const errorMsg = response.error || 'Transcription failed. Please check your API key and try again.'
        setTranscriptionError(errorMsg)
        logError('TranscriptionPanel', errorMsg, { response })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred during transcription.'
      setTranscriptionError(errorMsg)
      logError('TranscriptionPanel', error)
    }
  }

  /**
   * Handle clear transcription button click
   */
  function handleClearClick() {
    setShowClearDialog(true)
  }

  /**
   * Confirm clear transcription
   */
  function confirmClear() {
    clearTranscription()
    setShowClearDialog(false)
    setValidationError(null)
  }

  /**
   * Validate input when fields change
   */
  useEffect(() => {
    if (transcriptionText || userGuidance) {
      const isValid = validateTranscriptionInput(transcriptionText, userGuidance, includeTranscription)
      if (!isValid && transcriptionText.trim().length === 0 && userGuidance.trim().length === 0) {
        setValidationError(VALIDATION_ERRORS.NO_INPUT)
      } else {
        setValidationError(null)
      }
    }
  }, [transcriptionText, userGuidance, includeTranscription])

  /**
   * Listen for transcription progress events
   */
  useEffect(() => {
    const unsubscribe = window.api.onTranscriptionProgress((data) => {
      setTranscriptionProgress({
        percentage: data.percentage,
        message: data.message
      })
    })

    return unsubscribe
  }, [setTranscriptionProgress])

  // Calculate character counts
  const transcriptionCharCount = transcriptionText.length
  const guidanceCharCount = userGuidance.length

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Transcribe Audio</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Convert your video audio to text using AI
          </p>
        </div>

        {/* Transcribe Button */}
        <Button
          onClick={handleTranscribe}
          disabled={!hasClips || isTranscribing}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Transcribing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Transcribe Audio
            </>
          )}
        </Button>
      </div>

      {/* Error Alert */}
      {transcriptionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{transcriptionError}</AlertDescription>
        </Alert>
      )}

      {/* Progress Indicator */}
      {isTranscribing && transcriptionProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">{transcriptionProgress.message}</span>
            <span className="text-zinc-400">{Math.round(transcriptionProgress.percentage)}%</span>
          </div>
          <Progress value={transcriptionProgress.percentage} className="h-2" />
        </div>
      )}

      {/* Transcription Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="transcription" className="text-zinc-300">
            Transcription
          </Label>
          <span className="text-xs text-zinc-500">{transcriptionCharCount} characters</span>
        </div>
        <Textarea
          id="transcription"
          placeholder="Transcription will appear here..."
          value={transcriptionText}
          onChange={(e) => setTranscriptionText(e.target.value)}
          disabled={isTranscribing}
          className="min-h-[200px] resize-y bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      {/* Include Transcription Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="include-transcription"
          checked={includeTranscription}
          onCheckedChange={(checked) => setIncludeTranscription(checked === true)}
          disabled={isTranscribing}
        />
        <Label
          htmlFor="include-transcription"
          className="text-sm text-zinc-300 cursor-pointer"
        >
          Include transcription in post generation prompt
        </Label>
      </div>

      {/* User Guidance Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="guidance" className="text-zinc-300">
            Additional Guidance (Optional)
          </Label>
          <span className="text-xs text-zinc-500">{guidanceCharCount} characters</span>
        </div>
        <Textarea
          id="guidance"
          placeholder="Add any additional context or instructions for post generation..."
          value={userGuidance}
          onChange={(e) => setUserGuidance(e.target.value)}
          disabled={isTranscribing}
          className="min-h-[120px] resize-y bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Clear Button */}
      {(transcriptionText || userGuidance) && (
        <div className="flex justify-end">
          <Button
            onClick={handleClearClick}
            variant="outline"
            disabled={isTranscribing}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Transcription
          </Button>
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Clear Transcription?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will clear both the transcription and additional guidance. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="border-zinc-700 text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmClear}
              variant="destructive"
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
