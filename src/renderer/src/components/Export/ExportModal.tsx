/**
 * Export Modal Component
 * Modal dialog for configuring and starting timeline export
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUIStore } from '../../store/uiStore'
import { useTimelineStore } from '../../store/timelineStore'
import { FolderOpen } from 'lucide-react'
import type { ExportResolution } from '../../../../main/services/ffmpeg.service'

/**
 * Export Modal
 * Allows user to configure export settings and start export process
 */
export function ExportModal(): React.JSX.Element {
  const isOpen = useUIStore((state) => state.export.isModalOpen)
  const closeExportModal = useUIStore((state) => state.closeExportModal)
  const startExport = useUIStore((state) => state.startExport)

  const tracks = useTimelineStore((state) => state.tracks)

  const [resolution, setResolution] = useState<ExportResolution>('1080p')
  const [outputPath, setOutputPath] = useState<string | null>(null)

  /**
   * Handle file location selection
   * Opens native save dialog
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
      console.error('[ExportModal] Failed to open save dialog:', error)
    }
  }

  /**
   * Handle export button click
   * Starts export process with selected settings
   */
  async function handleExport(): Promise<void> {
    if (!outputPath) return

    // Get all clips from all tracks
    const allClips = tracks.flatMap((track) => track.clips)

    if (allClips.length === 0) {
      console.warn('[ExportModal] No clips to export')
      return
    }

    try {
      console.log('[ExportModal] Starting export...')
      console.log('[ExportModal] Clips:', allClips.length)
      console.log('[ExportModal] Resolution:', resolution)
      console.log('[ExportModal] Output:', outputPath)

      startExport()

      // Call IPC to start export
      await window.api.startExport({
        clips: allClips,
        resolution,
        outputPath
      })
    } catch (error) {
      console.error('[ExportModal] Export failed:', error)
    }
  }

  /**
   * Handle modal close
   */
  function handleClose(): void {
    setOutputPath(null)
    setResolution('1080p')
    closeExportModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Timeline</DialogTitle>
          <DialogDescription>Configure export settings for your video</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resolution Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Resolution</label>
            <div className="flex gap-3">
              {(['720p', '1080p', 'source'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`flex-1 px-4 py-3 rounded-md border-2 transition-all ${
                    resolution === res
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {res === 'source' ? 'Source' : res.toUpperCase()}
                  </div>
                  <div className="text-xs opacity-70">
                    {res === '720p' && '1280×720'}
                    {res === '1080p' && '1920×1080'}
                    {res === 'source' && 'Original'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Output Location */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Output Location</label>
            <div className="space-y-2">
              <Button
                onClick={handleChooseLocation}
                variant="outline"
                className="w-full justify-start"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Choose File Location
              </Button>
              {outputPath && (
                <div className="text-xs text-gray-400 truncate px-2">{outputPath}</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!outputPath}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
