/**
 * MediaItem Component
 * Compact media file display with thumbnail and metadata
 * Adobe Premiere Pro inspired design with borders, shadows, and professional styling
 */

import type { MediaFile } from '../../../../shared/types'
import { cn, formatTime, formatFileSize } from '../../utils'

interface MediaItemProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
}

/**
 * Media item showing compact thumbnail, filename, and comprehensive metadata
 * Supports click selection and drag-to-timeline with professional visual design
 */
export function MediaItem({ file, isSelected, onSelect }: MediaItemProps): React.JSX.Element {
  /**
   * Handle drag start - sets file ID in dataTransfer for timeline drop
   */
  function handleDragStart(e: React.DragEvent): void {
    e.dataTransfer.setData('fileId', file.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      className={cn(
        'rounded-md mb-1.5 cursor-grab active:cursor-grabbing overflow-hidden',
        'border shadow-sm transition-all duration-150',
        'bg-zinc-800/90',
        isSelected
          ? 'ring-2 ring-cyan-500 border-cyan-500'
          : 'border-zinc-700 hover:border-zinc-600 hover:shadow-md hover:bg-zinc-800'
      )}
    >
      {/* Compact Thumbnail */}
      <div className="relative w-full h-16 bg-black overflow-hidden">
        <img
          src={file.thumbnail || ''}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* File info with all metadata */}
      <div className="px-2 py-1 space-y-0.5">
        {/* Filename */}
        <p className="text-xs truncate text-zinc-100 leading-tight">{file.name}</p>

        {/* Duration • Resolution • File Size */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 leading-tight">
          <span>{formatTime(file.duration)}</span>
          <span className="text-zinc-600">•</span>
          <span>
            {file.resolution.width}×{file.resolution.height}
          </span>
          <span className="text-zinc-600">•</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      </div>
    </div>
  )
}
