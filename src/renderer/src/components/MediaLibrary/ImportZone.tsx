/**
 * ImportZone Component
 * Drag-and-drop zone for importing video files
 */

import { useState } from 'react'
import { useMediaStore } from '../../store/mediaStore'
import { useUIStore } from '../../store/uiStore'
import { cn } from '../../utils'

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
   * Import a single video file from a File object via IPC
   * Uses webUtils.getPathForFile in preload for secure path extraction
   */
  async function importFile(file: File): Promise<void> {
    try {
      console.log('[Renderer] Importing file:', file.name)

      const response = await window.api.importFileFromObject(file)

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
        // Pass the File object directly - the preload script will handle path extraction
        await importFile(file)
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
      className={cn(
        'flex flex-col items-center justify-center h-32 rounded border-2 border-dashed transition-all cursor-pointer',
        isDragOver
          ? 'border-cyan-500 bg-cyan-500/5'
          : 'border-zinc-700 bg-transparent hover:border-zinc-600',
        isImporting && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mb-2 flex justify-center">
          {isImporting ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          ) : (
            <svg
              className={cn(
                'w-8 h-8 transition-colors',
                isDragOver ? 'text-cyan-500' : 'text-zinc-400'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <p
          className={cn(
            'text-xs mb-1',
            isDragOver ? 'text-cyan-500' : 'text-zinc-100'
          )}
        >
          {isImporting ? 'Importing...' : isDragOver ? 'Drop to import' : 'Drag video files here'}
        </p>
        <p className="text-xs text-zinc-400">{SUPPORTED_FORMATS_STRING}</p>
      </div>
    </div>
  )
}
