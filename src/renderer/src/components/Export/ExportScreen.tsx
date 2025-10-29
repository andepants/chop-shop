/**
 * Export Screen Component
 * Full-screen view for configuring export settings and monitoring export progress
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useUIStore } from '../../store/uiStore'
import { useTimelineStore } from '../../store/timelineStore'
import { useWorkflowStore } from '../../store/workflowStore'
import { FolderOpen, X, CheckCircle2, XCircle, ExternalLink, AlertCircle, Film } from 'lucide-react'
import type { ExportResolution } from '../../../../main/services/ffmpeg.service'

/**
 * Full-screen export interface
 * Handles configuration, progress, and completion states
 */
export function ExportScreen(): React.JSX.Element {
  const exportState = useUIStore((state) => state.export)
  const closeExportModal = useUIStore((state) => state.closeExportModal)
  const startExport = useUIStore((state) => state.startExport)
  const updateExportProgress = useUIStore((state) => state.updateExportProgress)
  const completeExport = useUIStore((state) => state.completeExport)
  const failExport = useUIStore((state) => state.failExport)
  const resetExport = useUIStore((state) => state.resetExport)

  const tracks = useTimelineStore((state) => state.tracks)
  const setCurrentTab = useWorkflowStore((state) => state.setCurrentTab)
  const setExportedVideoPath = useWorkflowStore((state) => state.setExportedVideoPath)

  const [resolution, setResolution] = useState<ExportResolution>('1080p')
  const [outputPath, setOutputPath] = useState<string | null>(null)

  const { isExporting, progress, error, successPath } = exportState

  // Validation: Check if timeline has clips
  const hasClips = tracks.some((track) => track.clips.length > 0)

  /**
   * Subscribe to export events from main process
   */
  useEffect(() => {
    const cleanupProgress = window.api.onExportProgress((data) => {
      console.log('[ExportScreen] Progress:', data.percent, '%')
      updateExportProgress(data.percent)
    })

    const cleanupComplete = window.api.onExportComplete((data) => {
      console.log('[ExportScreen] Export complete:', data.outputPath)
      completeExport(data.outputPath)
      // Save exported video path to workflow store for Generate tab
      setExportedVideoPath(data.outputPath)
    })

    const cleanupError = window.api.onExportError((data) => {
      console.error('[ExportScreen] Export failed:', data.message)
      failExport(data.message)
    })

    return () => {
      cleanupProgress()
      cleanupComplete()
      cleanupError()
    }
  }, [updateExportProgress, completeExport, failExport])

  /**
   * Handle file location selection
   */
  async function handleChooseLocation(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const defaultPath = `chop-shop-export-${timestamp}.mp4`

      const response = await window.api.saveFileDialog({ defaultPath })

      if (response.success && response.data) {
        setOutputPath(response.data)
      }
    } catch (error) {
      console.error('[ExportScreen] Failed to open save dialog:', error)
    }
  }

  /**
   * Handle export start
   * Automatically uses multi-track export if both tracks have clips
   */
  async function handleExport(): Promise<void> {
    if (!outputPath) return

    // Separate clips by track and explicitly sort by startTime (AC #6)
    const track1Clips = (tracks[0]?.clips || []).sort((a, b) => a.startTime - b.startTime)
    const track2Clips = (tracks[1]?.clips || []).sort((a, b) => a.startTime - b.startTime)
    const allClips = tracks.flatMap((track) => track.clips)

    if (allClips.length === 0) {
      console.warn('[ExportScreen] No clips to export')
      return
    }

    // Determine if multi-track export is needed
    const isMultiTrack = track1Clips.length > 0 && track2Clips.length > 0

    try {
      console.log('[ExportScreen] Starting export...')
      console.log('[ExportScreen] Multi-track:', isMultiTrack)
      console.log('[ExportScreen] Track 1 clips:', track1Clips.length)
      console.log('[ExportScreen] Track 2 clips:', track2Clips.length)
      console.log('[ExportScreen] Resolution:', resolution)
      console.log('[ExportScreen] Output:', outputPath)

      startExport()

      if (isMultiTrack) {
        // Use multi-track export with overlay compositing
        // Read track mute and volume state (AC #3, #4, #2)
        const track1Muted = tracks[0]?.isMuted || false
        const track2Muted = tracks[1]?.isMuted || false
        const track1Volume = tracks[0]?.volume || 1.0
        const track2Volume = tracks[1]?.volume || 1.0

        console.log('[ExportScreen] Track audio state:', {
          track1Muted,
          track2Muted,
          track1Volume,
          track2Volume
        })

        await window.api.startMultiTrackExport({
          tracks: {
            main: track1Clips,
            overlay: track2Clips,
            mainMuted: track1Muted,
            overlayMuted: track2Muted,
            mainVolume: track1Volume,
            overlayVolume: track2Volume
          },
          resolution,
          outputPath,
          pipPosition: 'bottom-right', // Default PiP position
          pipSize: 25 // 25% of main video width
        })
      } else {
        // Use single-track export (original behavior)
        await window.api.startExport({
          clips: allClips,
          resolution,
          outputPath
        })
      }
    } catch (error) {
      console.error('[ExportScreen] Export failed:', error)
    }
  }

  /**
   * Handle close/cancel
   */
  function handleClose(): void {
    setOutputPath(null)
    setResolution('1080p')
    resetExport()
    closeExportModal()
  }

  /**
   * Open file location in system file manager
   */
  async function handleOpenLocation(): Promise<void> {
    if (successPath) {
      try {
        await window.api.openFileLocation(successPath)
      } catch (error) {
        console.error('[ExportScreen] Failed to open file location:', error)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-2xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">
            {isExporting && 'Exporting Timeline...'}
            {successPath && 'Export Complete'}
            {error && 'Export Failed'}
            {!isExporting && !successPath && !error && 'Export Timeline'}
          </h1>
          {!isExporting && (
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Configuration View */}
        {!isExporting && !successPath && !error && (
          <div className="space-y-8">
            <p className="text-gray-400">Configure export settings for your video</p>

            {/* Validation Alert - No Clips */}
            {!hasClips && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>No clips found on timeline. Add clips to the Edit tab before exporting.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentTab('edit')}
                    className="ml-4 border-red-600 text-red-400 hover:bg-red-600/10"
                  >
                    <Film className="mr-2 h-4 w-4" />
                    Go to Edit
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Resolution Selection */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-white">Resolution</label>
              <div className="grid grid-cols-3 gap-4">
                {(['720p', '1080p', 'source'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`px-6 py-4 rounded-lg border-2 transition-all ${
                      resolution === res
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500'
                        : 'border-zinc-700 bg-zinc-800/50 text-gray-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-base font-medium">
                      {res === 'source' ? 'Source' : res.toUpperCase()}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {res === '720p' && '1280×720'}
                      {res === '1080p' && '1920×1080'}
                      {res === 'source' && 'Original'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Output Location */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-white">Output Location</label>
              <div className="space-y-3">
                <Button
                  onClick={handleChooseLocation}
                  variant="outline"
                  className="w-full justify-start h-12 text-base"
                >
                  <FolderOpen className="mr-3 h-5 w-5" />
                  Choose File Location
                </Button>
                {outputPath && (
                  <div className="text-sm text-gray-400 truncate px-3 py-2 bg-zinc-800/50 rounded">
                    {outputPath}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={!outputPath || !hasClips}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                Export
              </Button>
            </div>
          </div>
        )}

        {/* Exporting Progress */}
        {isExporting && (
          <div className="space-y-6">
            <Progress value={progress} className="w-full h-3" />
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-500 mb-2">{progress}%</div>
              <div className="text-sm text-gray-400">Processing your video...</div>
            </div>
          </div>
        )}

        {/* Success State */}
        {successPath && (
          <div className="flex flex-col items-center space-y-6">
            <CheckCircle2 className="h-24 w-24 text-green-500" />
            <div className="text-center space-y-3">
              <p className="text-lg font-medium text-white">Your video has been exported successfully</p>
              <p className="text-sm text-gray-400 break-all max-w-xl">{successPath}</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleOpenLocation} variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open File Location
              </Button>
              <Button onClick={handleClose} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center space-y-6">
            <XCircle className="h-24 w-24 text-red-500" />
            <div className="text-center space-y-3">
              <p className="text-lg font-medium text-red-500">Export Failed</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
