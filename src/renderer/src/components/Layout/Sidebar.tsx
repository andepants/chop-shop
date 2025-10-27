/**
 * Sidebar Component
 * Left sidebar panel for media library
 */

/**
 * Sidebar component for displaying media library
 */
export function Sidebar(): React.JSX.Element {
  return (
    <aside className="w-[280px] bg-zinc-800 border-r border-zinc-700 flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">Media Library</h2>

        <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
          Drop files here or click to import
        </div>
      </div>
    </aside>
  )
}
