/**
 * Sidebar Component
 * Left sidebar panel for media library
 */

import { MediaLibrary } from '../MediaLibrary'
import { useMediaStore } from '../../store/mediaStore'
import { useUIStore } from '../../store/uiStore'
import { Button } from '@/components/ui/button'

/**
 * Sidebar component for displaying media library
 */
export function Sidebar(): React.JSX.Element {
  const isImporting = useMediaStore((state) => state.isImporting)
  const setIsImporting = useMediaStore((state) => state.setIsImporting)
  const addFiles = useMediaStore((state) => state.addFiles)
  const showError = useUIStore((state) => state.showError)

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

      console.log('[Renderer] Importing', filePaths.length, 'files from picker')
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
        console.log('[Renderer] Successfully imported', successfulImports.length, 'files')
      }

      setIsImporting(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Renderer] File picker failed:', errorMessage)
      showError(`Failed to open file picker. ${errorMessage}`, 'Error')
      setIsImporting(false)
    }
  }

  return (
    <aside className="w-[280px] flex flex-col pb-16 bg-zinc-800 border-r border-zinc-700">
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Media</h2>
          <Button
            onClick={handleImportClick}
            disabled={isImporting}
            size="sm"
            className={isImporting ? 'bg-zinc-900' : 'bg-cyan-500 hover:bg-cyan-600'}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>
      <MediaLibrary />
    </aside>
  )
}
