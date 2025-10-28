/**
 * DeleteTool Component
 *
 * Button for deleting selected clips from timeline.
 * Disabled when no clip is selected. Triggers removeClip action.
 *
 * Features:
 * - Trash icon for visual clarity
 * - Disabled state when no clip selected
 * - Tooltip with keyboard shortcut
 * - Integrates with timelineStore
 */

import { Trash2 } from 'lucide-react'
import { useTimelineStore } from '@/store/timelineStore'

/**
 * DeleteTool button component
 * Displays in timeline toolbar for deleting selected clips
 */
export function DeleteTool(): JSX.Element {
  const { selectedClipId, removeClip } = useTimelineStore()

  /**
   * Handle delete button click
   * Removes currently selected clip from timeline
   */
  function handleDelete(): void {
    if (!selectedClipId) return
    removeClip(selectedClipId)
  }

  const isDisabled = !selectedClipId

  return (
    <button
      onClick={handleDelete}
      disabled={isDisabled}
      className={`
        h-8 px-3 flex items-center gap-1.5 rounded text-sm font-medium
        transition-all duration-150
        ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-red-600/20 hover:ring-1 hover:ring-red-600'
        }
      `}
      title="Delete Clip (Delete/Backspace)"
      aria-label="Delete selected clip"
      style={{
        color: isDisabled ? 'var(--text-secondary)' : 'var(--text-primary)'
      }}
    >
      <Trash2
        size={16}
        style={{
          color: isDisabled ? 'var(--text-secondary)' : '#ef4444'
        }}
      />
      <span>Delete</span>
    </button>
  )
}
