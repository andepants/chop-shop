/**
 * EmptyState Component
 * Displays placeholder message when media library is empty
 */

/**
 * Shows empty state message when no media files are imported
 */
export function EmptyState(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <p className="text-zinc-500 text-center text-sm">
        No media imported yet. Drag files or click Import to begin.
      </p>
    </div>
  )
}
