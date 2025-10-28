/**
 * MediaLibrary Component
 * Container for displaying all imported media files
 */

import { useMediaStore } from '../../store/mediaStore'
import { MediaItem } from './MediaItem'
import { EmptyState } from './EmptyState'

/**
 * Displays scrollable list of all imported media files
 * Shows empty state when no files are imported
 */
export function MediaLibrary(): React.JSX.Element {
  const files = useMediaStore((state) => state.files)
  const selectedFileId = useMediaStore((state) => state.selectedFileId)
  const selectFile = useMediaStore((state) => state.selectFile)

  // Show empty state when no files
  if (files.length === 0) {
    return <EmptyState />
  }

  /**
   * Handle background click to deselect
   */
  function handleBackgroundClick(e: React.MouseEvent): void {
    // Only deselect if clicking the background, not a media item
    if (e.target === e.currentTarget) {
      selectFile(null)
    }
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-3 py-2 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
      onClick={handleBackgroundClick}
    >
      {files.map((file) => (
        <MediaItem
          key={file.id}
          file={file}
          isSelected={file.id === selectedFileId}
          onSelect={() => selectFile(file.id)}
        />
      ))}
    </div>
  )
}
