/**
 * TopBar Component
 * Application header with branding and export functionality
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTimelineStore } from '../../store/timelineStore'
import { useUIStore } from '../../store/uiStore'
import { Download, Settings } from 'lucide-react'

/**
 * Top bar with application branding and export button
 */
export function TopBar(): React.JSX.Element {
  const tracks = useTimelineStore((state) => state.tracks)
  const openExportModal = useUIStore((state) => state.openExportModal)
  const openSettings = useUIStore((state) => state.openSettings)

  // Calculate total clips count
  const totalClips = tracks.reduce((count, track) => count + track.clips.length, 0)
  const hasClips = totalClips > 0

  /**
   * Handle export button click
   * Opens export modal if timeline has clips
   */
  function handleExport(): void {
    if (hasClips) {
      console.log('[TopBar] Opening export modal')
      openExportModal()
    }
  }

  /**
   * Keyboard shortcut: Cmd/Ctrl+E to open export modal
   */
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && hasClips) {
        e.preventDefault()
        console.log('[TopBar] Export triggered via keyboard shortcut (Cmd/Ctrl+E)')
        openExportModal()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [hasClips, openExportModal])

  return (
    <div
      className="h-10 border-b flex items-center justify-between px-4"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* App Name */}
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        chop shop
      </span>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Settings Button */}
        <Button
          onClick={openSettings}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Export Button */}
        <Button
        onClick={handleExport}
        disabled={!hasClips}
        size="sm"
        className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
          <Download className="mr-1 h-3 w-3" />
          Export
        </Button>
      </div>
    </div>
  )
}
