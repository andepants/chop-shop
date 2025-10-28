/**
 * Export Progress Component
 * Displays export progress, success, and error states
 */

import { useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

/**
 * Export Progress Dialog
 * Shows progress bar during export and success/error notifications
 */
export function ExportProgress(): React.JSX.Element {
  const exportState = useUIStore((state) => state.export)
  const updateExportProgress = useUIStore((state) => state.updateExportProgress)
  const completeExport = useUIStore((state) => state.completeExport)
  const failExport = useUIStore((state) => state.failExport)
  const resetExport = useUIStore((state) => state.resetExport)
  const closeExportModal = useUIStore((state) => state.closeExportModal)

  const { isExporting, progress, error, successPath } = exportState

  /**
   * Subscribe to export events from main process
   */
  useEffect(() => {
    // Listen for progress updates
    const cleanupProgress = window.api.onExportProgress((data) => {
      console.log('[ExportProgress] Progress:', data.percent, '%')
      updateExportProgress(data.percent)
    })

    // Listen for completion
    const cleanupComplete = window.api.onExportComplete((data) => {
      console.log('[ExportProgress] Export complete:', data.outputPath)
      completeExport(data.outputPath)
    })

    // Listen for errors
    const cleanupError = window.api.onExportError((data) => {
      console.error('[ExportProgress] Export failed:', data.message)
      failExport(data.message)
    })

    // Cleanup on unmount
    return () => {
      cleanupProgress()
      cleanupComplete()
      cleanupError()
    }
  }, [updateExportProgress, completeExport, failExport])

  /**
   * Handle opening file location in system file manager
   */
  async function handleOpenLocation(): Promise<void> {
    if (successPath) {
      try {
        await window.api.openFileLocation(successPath)
      } catch (error) {
        console.error('[ExportProgress] Failed to open file location:', error)
      }
    }
  }

  /**
   * Handle dialog close
   */
  function handleClose(): void {
    resetExport()
    closeExportModal()
  }

  // Show dialog when exporting, or when there's a result (success/error)
  const isOpen = isExporting || !!successPath || !!error

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[450px]"
        // Prevent closing during export
        onPointerDownOutside={(e) => isExporting && e.preventDefault()}
        onEscapeKeyDown={(e) => isExporting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isExporting && 'Exporting Timeline...'}
            {successPath && 'Export Complete'}
            {error && 'Export Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Progress State */}
          {isExporting && (
            <>
              <Progress value={progress} className="w-full" />
              <div className="text-center text-sm text-gray-400">{progress}% complete</div>
            </>
          )}

          {/* Success State */}
          {successPath && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Your video has been exported successfully</p>
                <p className="text-xs text-gray-400 truncate max-w-[400px]">{successPath}</p>
              </div>
              <Button onClick={handleOpenLocation} variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open File Location
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-red-500">Export Failed</p>
                <p className="text-xs text-gray-400">{error}</p>
              </div>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          )}
        </div>

        {/* Close button for success state */}
        {successPath && (
          <div className="flex justify-end">
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
