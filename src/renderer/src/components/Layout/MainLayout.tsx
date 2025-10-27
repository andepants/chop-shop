/**
 * MainLayout Component
 * Main application layout with 3-panel structure:
 * - TopBar (top, full-width)
 * - Sidebar (left, fixed width)
 * - Center area split into Preview (top 60%) and Timeline (bottom 40%)
 */
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Timeline } from '@/components/Timeline'

/**
 * Main layout container for the application
 * Implements the 3-panel layout structure
 */
export function MainLayout(): React.JSX.Element {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-900">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Content (Preview + Timeline) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview Area (60% height) */}
          <div className="flex-[3] bg-zinc-900 border-b border-zinc-700 flex items-center justify-center">
            <div className="text-zinc-400 text-lg">Preview</div>
          </div>

          {/* Timeline Area (40% height) */}
          <div className="flex-[2] overflow-hidden">
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  )
}
