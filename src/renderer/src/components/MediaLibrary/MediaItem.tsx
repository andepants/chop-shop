/**
 * MediaItem Component
 * Media file display with thumbnail, metadata, duration, and filename
 */

import type { MediaFile } from '../../../../shared/types'
import { cn, formatTime, formatFileSize } from '../../utils'

interface MediaItemProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
}

/**
 * Media item showing thumbnail, duration badge, filename, and metadata
 * Supports click selection and drag-to-timeline
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
        'rounded mb-2 cursor-grab active:cursor-grabbing overflow-hidden transition-colors',
        'hover:opacity-80 bg-zinc-800',
        isSelected && 'ring-2 ring-cyan-500'
      )}
    >
      {/* Thumbnail with duration badge */}
      <div className="relative w-full h-28 bg-black overflow-hidden">
        <img
          src={file.thumbnail || ''}
          alt={file.name}
          className="w-full h-full object-cover"
        />

        {/* Duration badge */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-mono bg-black/75 text-zinc-100">
          {formatTime(file.duration)}
        </div>
      </div>

      {/* File info */}
      <div className="px-2 py-1.5">
        <p className="text-xs truncate text-zinc-100 mb-1">{file.name}</p>
        <div className="flex justify-between text-xs text-zinc-400">
          <span>
            {file.resolution.width}×{file.resolution.height}
          </span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      </div>
    </div>
  )
}
