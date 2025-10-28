/**
 * MediaItem Component
 * Minimal media file display with thumbnail, duration, and filename
 */

import type { MediaFile } from '../../../../shared/types'
import { cn, formatTime } from '../../utils'

interface MediaItemProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
}

/**
 * Simplified media item showing thumbnail, duration badge, and filename only
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
        'hover:opacity-80',
        isSelected && 'ring-1'
      )}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: isSelected ? 'var(--accent)' : 'transparent'
      }}
    >
      {/* Thumbnail with duration badge */}
      <div className="relative w-full h-28 bg-black overflow-hidden">
        <img
          src={file.thumbnail || ''}
          alt={file.name}
          className="w-full h-full object-cover"
        />

        {/* Duration badge */}
        <div
          className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', color: 'var(--text-primary)' }}
        >
          {formatTime(file.duration)}
        </div>
      </div>

      {/* Filename */}
      <div className="px-2 py-1.5">
        <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
          {file.name}
        </p>
      </div>
    </div>
  )
}
