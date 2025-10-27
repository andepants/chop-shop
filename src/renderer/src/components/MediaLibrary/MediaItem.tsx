/**
 * MediaItem Component
 * Displays individual media file with thumbnail, metadata, and drag capability
 */

import type { MediaFile } from '../../../../shared/types'
import { cn, formatFileSize, formatTime } from '../../utils'

interface MediaItemProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
}

/**
 * Renders a single media item with thumbnail, filename, duration, resolution, and file size
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
        'rounded p-2 mb-2 cursor-pointer hover:bg-zinc-700 transition-colors',
        isSelected && 'ring-2 ring-cyan-500'
      )}
    >
      {/* Thumbnail */}
      <img
        src={file.thumbnail || ''}
        alt={file.name}
        className="w-full h-16 object-cover rounded bg-zinc-900"
      />

      {/* Filename */}
      <p className="text-sm truncate mt-2 text-zinc-50">{file.name}</p>

      {/* Duration and Resolution */}
      <div className="flex justify-between text-xs text-zinc-400 mt-1">
        <span>{formatTime(file.duration)}</span>
        <span>
          {file.resolution.width}×{file.resolution.height}
        </span>
      </div>

      {/* File Size */}
      <p className="text-xs text-zinc-500 mt-0.5">{formatFileSize(file.size)}</p>
    </div>
  )
}
