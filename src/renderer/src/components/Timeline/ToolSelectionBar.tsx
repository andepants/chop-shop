/**
 * ToolSelectionBar Component
 *
 * Toolbar for selecting timeline editing tools (Select, Trim, Split)
 * Displays icon-only toggle buttons with tooltips and keyboard shortcuts
 * Positioned above the timeline for contextual grouping
 */

import { MousePointer2, Scissors, SeparatorHorizontal } from 'lucide-react'
import { useToolStore } from '@/store/toolStore'
import type { Tool } from '@/types/tools.types'

/**
 * Tool configuration for UI rendering
 * Each tool has an icon, label, and keyboard shortcut
 */
const TOOLS = [
  {
    id: 'select' as Tool,
    icon: MousePointer2,
    label: 'Select Tool',
    shortcut: 'V',
    description: 'Select and move clips'
  },
  {
    id: 'trim' as Tool,
    icon: Scissors,
    label: 'Trim Tool',
    shortcut: 'B',
    description: 'Trim clip in/out points'
  },
  {
    id: 'split' as Tool,
    icon: SeparatorHorizontal,
    label: 'Razor Tool',
    shortcut: 'C',
    description: 'Split clip at playhead'
  }
] as const

/**
 * ToolSelectionBar component
 * Renders icon-only tool selection buttons with active state
 */
export function ToolSelectionBar(): JSX.Element {
  const { selectedTool, setTool } = useToolStore()

  /**
   * Handle tool button click
   */
  function handleToolClick(tool: Tool): void {
    setTool(tool)
  }

  return (
    <div
      className="h-12 flex items-center gap-1 px-4 border-b"
      style={{
        backgroundColor: 'var(--bg-timeline)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* Tool Selection Buttons */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const isActive = selectedTool === tool.id

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`
                h-8 w-8 flex items-center justify-center rounded
                transition-all duration-150
                ${
                  isActive
                    ? 'ring-2 ring-cyan-500 bg-cyan-500/20'
                    : 'hover:bg-white/5'
                }
              `}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={tool.label}
              aria-pressed={isActive}
            >
              <Icon
                size={18}
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)'
                }}
              />
            </button>
          )
        })}
      </div>

      {/* Tool Info Display */}
      <div className="flex-1 flex items-center gap-2 ml-4">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {TOOLS.find((t) => t.id === selectedTool)?.label}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-secondary)'
          }}
        >
          {TOOLS.find((t) => t.id === selectedTool)?.shortcut}
        </span>
      </div>
    </div>
  )
}
