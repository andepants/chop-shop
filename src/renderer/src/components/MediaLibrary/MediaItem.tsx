/**
 * MediaItem Component
 * Vertical card media file display with refined Adobe Premiere Pro styling
 * Clean, modern design with improved spacing, typography, and shadows
 */

import { useState } from 'react'
import type { MediaFile } from '@shared/types'
import { cn, formatTime, formatFileSize } from '../../utils'
import { useMediaStore } from '../../store/mediaStore'

interface MediaItemProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
}

/**
 * Grid-optimized media card with polished Adobe Premiere Pro aesthetic
 * Features refined spacing, shadows, and professional styling
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
        'rounded-md overflow-hidden cursor-grab active:cursor-grabbing',
        'border transition-all duration-200',
        'bg-slate-800',
        'flex flex-col',
        'shadow-sm hover:shadow-md',
        isSelected
          ? 'ring-2 ring-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/10'
          : 'border-slate-700/50 hover:border-slate-600'
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
              'absolute top-1.5 right-1.5 p-1 rounded-md',
              'bg-red-600/90 hover:bg-red-500',
              'text-white shadow-lg',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-red-400/50',
              'hover:scale-110'
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

      {/* Metadata - Refined Spacing and Typography */}
      <div className="p-3 space-y-1">
        {/* Filename - Better Typography */}
        <p
          className="text-sm font-medium text-slate-100 truncate leading-snug"
          title={file.name}
        >
          {file.name}
        </p>

        {/* Duration, Resolution, Size - Compact Metadata */}
        <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
          {formatTime(file.duration)} • {file.resolution.width}×{file.resolution.height} •{' '}
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  )
}
