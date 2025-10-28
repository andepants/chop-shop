/**
 * MediaItem Component
 * Vertical card media file display with large thumbnail and compact metadata
 * Adobe Premiere Pro inspired design - clean and minimal
 */

import { useState } from 'react'
import type { MediaFile } from '../../../../shared/types'
import { cn, formatTime, formatFileSize } from '../../utils'
import { useMediaStore } from '../../store/mediaStore'

interface MediaItemProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
}

/**
 * Grid-optimized media card with large thumbnail, delete button, and minimal metadata
 * Supports click selection and drag-to-timeline functionality
 */
export function MediaItem({ file, isSelected, onSelect }: MediaItemProps): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const removeFile = useMediaStore((state) => state.removeFile)
  const selectFile = useMediaStore((state) => state.selectFile)

  /**
   * Handle drag start - sets file ID in dataTransfer for timeline drop
   */
  function handleDragStart(e: React.DragEvent): void {
    e.dataTransfer.setData('fileId', file.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  /**
   * Handle delete button click
   * Removes file from media store and deselects if currently selected
   */
  function handleDelete(e: React.MouseEvent): void {
    e.stopPropagation()
    removeFile(file.id)
    selectFile(null)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'rounded overflow-hidden cursor-grab active:cursor-grabbing',
        'border transition-all duration-150',
        'bg-zinc-900',
        'flex flex-col',
        isSelected
          ? 'ring-2 ring-cyan-500 border-cyan-500'
          : 'border-zinc-700 hover:border-zinc-600'
      )}
    >
      {/* Thumbnail with Delete Button */}
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        <img
          src={file.thumbnail || ''}
          alt={file.name}
          className="w-full h-full object-cover"
        />

        {/* Delete Button */}
        {(isHovered || isSelected) && (
          <button
            onClick={handleDelete}
            className={cn(
              'absolute top-1 right-1 p-1 rounded',
              'bg-red-600/90 hover:bg-red-500',
              'text-white',
              'transition-all',
              'focus:outline-none focus:ring-1 focus:ring-red-400'
            )}
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Metadata - Compact and Clean */}
      <div className="p-2 space-y-0.5">
        {/* Filename */}
        <p className="text-xs text-zinc-200 truncate leading-tight" title={file.name}>
          {file.name}
        </p>

        {/* Duration, Resolution, Size - Single compact line */}
        <p className="text-[10px] text-zinc-500 font-mono leading-tight">
          {formatTime(file.duration)} • {file.resolution.width}×{file.resolution.height} •{' '}
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  )
}
