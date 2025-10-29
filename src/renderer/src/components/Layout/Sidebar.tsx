/**
 * Sidebar Component
 * Left sidebar panel for media library with refined Adobe Premiere Pro styling
 */

import { MediaLibrary } from '../MediaLibrary'
import { useMediaStore } from '../../store/mediaStore'
import { useUIStore } from '../../store/uiStore'
import { useRecordingStore } from '../../store/recordingStore'
import { Button } from '@/components/ui/button'
import { Circle, Sparkles } from 'lucide-react'

/**
 * Sidebar component with polished design and refined button styling
 */
export function Sidebar(): React.JSX.Element {
  const isImporting = useMediaStore((state) => state.isImporting)
  const setIsImporting = useMediaStore((state) => state.setIsImporting)
  const addFiles = useMediaStore((state) => state.addFiles)
  const showError = useUIStore((state) => state.showError)
  const openRecordingModal = useUIStore((state) => state.openRecordingModal)
  const showAIGenerator = useUIStore((state) => state.showAIGenerator)
  const isRecording = useRecordingStore((state) => state.isRecording)

  /**
   * Handle Import button click
   * Opens file picker dialog and imports selected files
   */
  async function handleImportClick(): Promise<void> {
    try {
      // Open file picker dialog
      const response = await window.api.openFileDialog()

      if (!response.success) {
        throw new Error(response.error || 'Failed to open file dialog')
      }

      const filePaths = response.data || []
      if (filePaths.length === 0) {
        return // User canceled
      }

      setIsImporting(true)

      // Import each file using existing import-file IPC
      const importPromises = filePaths.map(async (filePath) => {
        try {
          const importResponse = await window.api.importFile(filePath)

          if (importResponse.success && importResponse.data) {
            return importResponse.data
          } else {
            throw new Error(importResponse.error || 'Unknown error')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const filename = filePath.split('/').pop() || filePath
          showError(`Unable to import ${filename}. ${errorMessage}`, 'Import Failed')
          return null
        }
      })

      const results = await Promise.all(importPromises)
      const successfulImports = results.filter((file) => file !== null)

      if (successfulImports.length > 0) {
        addFiles(successfulImports)
      }

      setIsImporting(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showError(`Failed to open file picker. ${errorMessage}`, 'Error')
      setIsImporting(false)
    }
  }

  return (
    <aside className="w-[280px] flex flex-col pb-16 bg-slate-900/95 border-r border-slate-700/50">
      <div className="px-4 py-3.5 border-b border-slate-700/50 bg-slate-950/50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-100 tracking-tight">Media</h2>
          <div className="flex gap-2">
            <Button
              onClick={openRecordingModal}
              disabled={isRecording}
              size="sm"
              className={
                isRecording
                  ? 'bg-red-800 text-slate-300 cursor-not-allowed shadow-sm'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md hover:shadow-lg transition-all duration-150'
              }
            >
              <Circle
                className={`h-3 w-3 mr-1.5 ${isRecording ? 'fill-red-400 text-red-400 animate-pulse' : 'fill-current'}`}
              />
              {isRecording ? 'Recording...' : 'Record'}
            </Button>
            <Button
              onClick={handleImportClick}
              disabled={isImporting}
              size="sm"
              className={
                isImporting
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed shadow-sm'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md hover:shadow-lg transition-all duration-150'
              }
            >
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>

        {/* AI Generator Button */}
        <Button
          onClick={showAIGenerator}
          size="sm"
          className="w-full bg-purple-600 hover:bg-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-150"
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          AI Generator
        </Button>
      </div>
      <MediaLibrary />
    </aside>
  )
}
