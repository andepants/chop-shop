/**
 * MainLayout Component
 * Main application layout with 3-panel structure:
 * - TopBar (top, full-width)
 * - Sidebar (left, fixed width)
 * - Center area split into Preview and Timeline with PlaybackBar
 */
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Timeline, ToolSelectionBar } from '@/components/Timeline'
import { PreviewPlayer, PlaybackBar } from '@/components/Preview'

/**
 * Main layout container for the application
 * Implements the 3-panel layout structure
 */
export function MainLayout(): React.JSX.Element {
  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Content (Preview + PlaybackBar + Timeline) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview Area - Minimum height to ensure video player and controls are visible */}
          <div className="flex-1 min-h-[400px] bg-black border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <PreviewPlayer />
          </div>

          {/* Playback Bar */}
          <PlaybackBar />

          {/* Tool Selection Bar */}
          <ToolSelectionBar />

          {/* Timeline Area - Fixed height to ensure visibility */}
          <div className="h-64" style={{ backgroundColor: 'var(--bg-timeline)' }}>
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  )
}
