/**
 * MediaLibrary Component
 * Container for displaying all imported media files in a 2-column grid
 * Adobe Premiere Pro-inspired design with full-panel drag-drop and sorting
 */

import { useState } from 'react'
import { useMediaStore } from '../../store/mediaStore'
import { useUIStore } from '../../store/uiStore'
import { MediaItem } from './MediaItem'
import { EmptyState } from './EmptyState'
import { cn } from '../../utils'
import type { MediaFile } from '../../../../shared/types'

const SUPPORTED_FORMATS = ['.mp4', '.mov', '.webm']
const SUPPORTED_FORMATS_STRING = 'MP4, MOV, WebM'

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-newest'
  | 'date-oldest'
  | 'duration-longest'
  | 'duration-shortest'
  | 'size-largest'
  | 'size-smallest'

/**
 * Displays grid of all imported media files with sorting and drag-drop import
 * Shows empty state when no files are imported
 */
export function MediaLibrary(): React.JSX.Element {
  const files = useMediaStore((state) => state.files)
  const selectedFileId = useMediaStore((state) => state.selectedFileId)
  const selectFile = useMediaStore((state) => state.selectFile)
  const addFile = useMediaStore((state) => state.addFile)
  const isImporting = useMediaStore((state) => state.isImporting)
  const setIsImporting = useMediaStore((state) => state.setIsImporting)
  const showError = useUIStore((state) => state.showError)

  const [isDragOver, setIsDragOver] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-newest')

  /**
   * Check if file has supported video extension
   */
  function isSupportedFormat(filename: string): boolean {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'))
    return SUPPORTED_FORMATS.includes(extension)
  }

  /**
   * Import a single video file from a File object via IPC
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
   * Handle drag over event
   */
  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  /**
   * Handle drag leave event
   */
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  /**
   * Handle file drop event
   */
  async function handleDrop(e: React.DragEvent<HTMLDivElement>): Promise<void> {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    setIsImporting(true)

    const importPromises = droppedFiles.map(async (file) => {
      const filename = file.name

      if (!isSupportedFormat(filename)) {
        showError(
          `Unable to import ${filename}. Supported formats: ${SUPPORTED_FORMATS_STRING}`,
          'Unsupported Format'
        )
        return
      }

      try {
        await importFile(file)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        showError(`Unable to import ${filename}. ${errorMessage}`, 'Import Failed')
      }
    })

    await Promise.all(importPromises)
    setIsImporting(false)
  }

  /**
   * Handle background click to deselect
   */
  function handleBackgroundClick(e: React.MouseEvent): void {
    if (e.target === e.currentTarget) {
      selectFile(null)
    }
  }

  /**
   * Sort files based on current sort option
   */
  function getSortedFiles(): MediaFile[] {
    const sorted = [...files]

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case 'date-newest':
        return sorted.sort((a, b) => b.createdAt - a.createdAt)
      case 'date-oldest':
        return sorted.sort((a, b) => a.createdAt - b.createdAt)
      case 'duration-longest':
        return sorted.sort((a, b) => b.duration - a.duration)
      case 'duration-shortest':
        return sorted.sort((a, b) => a.duration - b.duration)
      case 'size-largest':
        return sorted.sort((a, b) => b.size - a.size)
      case 'size-smallest':
        return sorted.sort((a, b) => a.size - b.size)
      default:
        return sorted
    }
  }

  // Show empty state with drag-drop capability
  if (files.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex-1 flex items-center justify-center transition-all',
          isDragOver && 'bg-cyan-500/5 border-2 border-cyan-500 border-dashed'
        )}
      >
        {isImporting ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-2"></div>
            <p className="text-sm text-zinc-400">Importing...</p>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    )
  }

  const sortedFiles = getSortedFiles()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sorting Header */}
      <div className="px-3 py-2 border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 bg-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 border border-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="name-asc">Name (A→Z)</option>
            <option value="name-desc">Name (Z→A)</option>
            <option value="date-newest">Date Added (Newest)</option>
            <option value="date-oldest">Date Added (Oldest)</option>
            <option value="duration-longest">Duration (Longest)</option>
            <option value="duration-shortest">Duration (Shortest)</option>
            <option value="size-largest">Size (Largest)</option>
            <option value="size-smallest">Size (Smallest)</option>
          </select>
        </div>
      </div>

      {/* Grid Container with Drag-Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBackgroundClick}
        className={cn(
          'flex-1 overflow-y-auto p-3 scroll-smooth',
          'scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent',
          'grid grid-cols-2 gap-3 auto-rows-min content-start',
          'transition-all',
          isDragOver && 'bg-cyan-500/5 ring-2 ring-inset ring-cyan-500',
          isImporting && 'opacity-50 pointer-events-none'
        )}
      >
        {sortedFiles.map((file) => (
          <MediaItem
            key={file.id}
            file={file}
            isSelected={file.id === selectedFileId}
            onSelect={() => selectFile(file.id)}
          />
        ))}
      </div>
    </div>
  )
}
