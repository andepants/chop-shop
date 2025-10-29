/**
 * Workflow Tabs Component
 *
 * Visual tab navigation for the 3-step workflow: Edit → Export → Generate Posts.
 * All tabs are always clickable. Shows active state with visual highlights.
 */

import { useWorkflowStore, type WorkflowStep } from '../../store/workflowStore'
import { useUIStore } from '../../store/uiStore'
import { Film, Download, Sparkles, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Tab definition
 */
interface TabConfig {
  id: WorkflowStep
  label: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Workflow tabs configuration
 */
const WORKFLOW_TABS: TabConfig[] = [
  {
    id: 'edit',
    label: 'Edit',
    icon: Film
  },
  {
    id: 'export',
    label: 'Export',
    icon: Download
  },
  {
    id: 'generate',
    label: 'Generate Posts',
    icon: Sparkles
  }
]

/**
 * WorkflowTabs Component
 *
 * Horizontal tab bar for workflow navigation.
 * Always-accessible tabs with visual active state indication.
 */
export function WorkflowTabs() {
  const currentTab = useWorkflowStore((state) => state.currentTab)
  const setCurrentTab = useWorkflowStore((state) => state.setCurrentTab)
  const openSettings = useUIStore((state) => state.openSettings)

  /**
   * Handle tab click navigation
   */
  function handleTabClick(tabId: WorkflowStep) {
    setCurrentTab(tabId)
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center h-14 px-6">
        {/* Left spacer for centering */}
        <div className="w-10" />

        {/* Centered workflow tabs - flex-1 to take remaining space and center content */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {WORKFLOW_TABS.map((tab, index) => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id

            return (
              <div key={tab.id} className="flex items-center gap-2">
                {/* Tab Button */}
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                    'text-sm font-medium',
                    isActive
                      ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>

                {/* Arrow separator (not after last tab) */}
                {index < WORKFLOW_TABS.length - 1 && (
                  <div className="text-zinc-700 text-sm px-1">→</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Settings button pinned to far right - matching left spacer width for symmetry */}
        <div className="w-10 flex justify-end">
          <button
            onClick={openSettings}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
