/**
 * ImportZone Component
 * Drag-and-drop zone for importing video files
 */

import { useState } from 'react'
import { useMediaStore } from '../../store/mediaStore'
import { useUIStore } from '../../store/uiStore'

const SUPPORTED_FORMATS = ['.mp4', '.mov', '.webm']
const SUPPORTED_FORMATS_STRING = 'MP4, MOV, WebM'

/**
 * Drag-and-drop import zone component
 * Allows users to drag video files into the application
 */
export function ImportZone(): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const isImporting = useMediaStore((state) => state.isImporting)
  const setIsImporting = useMediaStore((state) => state.setIsImporting)
  const addFile = useMediaStore((state) => state.addFile)
  const showError = useUIStore((state) => state.showError)

  /**
   * Handle drag over event
   * Prevents default behavior and highlights drop zone
   */
  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  /**
   * Handle drag leave event
   * Removes drop zone highlight
   */
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  /**
   * Check if file has supported video extension
   */
  function isSupportedFormat(filename: string): boolean {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'))
    return SUPPORTED_FORMATS.includes(extension)
  }

  /**
   * Import a single video file via IPC
   */
  async function importFile(filePath: string): Promise<void> {
    try {
      console.log('[Renderer] Importing file:', filePath)

      const response = await window.api.importFile(filePath)

      if (response.success && response.data) {
        addFile(response.data)
        console.log('[Renderer] File imported successfully:', response.data.name)
      } else {
        throw new Error(response.error || 'Unknown error occurred')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Renderer] Import failed:', errorMessage)
      throw error
    }
  }

  /**
   * Handle file drop event
   * Validates and imports dropped video files
   */
  async function handleDrop(e: React.DragEvent<HTMLDivElement>): Promise<void> {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    setIsImporting(true)

    const importPromises = files.map(async (file) => {
      const filename = file.name

      if (!isSupportedFormat(filename)) {
        showError(
          `Unable to import ${filename}. Supported formats: ${SUPPORTED_FORMATS_STRING}`,
          'Unsupported Format'
        )
        return
      }

      try {
        // Electron adds a 'path' property to File objects
        const filePath = (file as File & { path: string }).path
        await importFile(filePath)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        showError(`Unable to import ${filename}. ${errorMessage}`, 'Import Failed')
      }
    })

    await Promise.all(importPromises)
    setIsImporting(false)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col items-center justify-center
        h-64 rounded-lg border-2 border-dashed
        transition-all cursor-pointer
        ${
          isDragOver
            ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500'
            : 'border-zinc-600 hover:border-zinc-500 bg-zinc-900/50'
        }
        ${isImporting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="text-center px-6">
        <div className="mb-3">
          {isImporting ? (
            <div className="text-cyan-400 text-4xl">⏳</div>
          ) : (
            <div className="text-zinc-400 text-4xl">📁</div>
          )}
        </div>
        <p className="text-zinc-300 text-sm font-medium mb-1">
          {isImporting ? 'Importing files...' : 'Drag video files here'}
        </p>
        <p className="text-zinc-500 text-xs">Supported formats: {SUPPORTED_FORMATS_STRING}</p>
      </div>
    </div>
  )
}
