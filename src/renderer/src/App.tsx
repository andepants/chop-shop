/**
 * Main application component
 * Displays the workflow-based 3-step UI: Edit → Export → Generate Posts
 */
import { MainLayout } from './components/Layout'
import { ErrorDialog } from './components/shared'
import { ExportScreen } from './components/Export'
import { RecordingModeModal } from './components/Recording/RecordingModeModal'
import { RecordingTimer } from './components/Recording/RecordingTimer'
import { Settings } from './components/Settings/Settings'
import { AIGeneratorPage } from './components/AI/AIGeneratorPage'
import { WorkflowTabs } from './components/Workflow/WorkflowTabs'
import { useUIStore } from './store/uiStore'
import { useWorkflowStore } from './store/workflowStore'

function App(): React.JSX.Element {
  const isSettingsOpen = useUIStore((state) => state.settings.isOpen)
  const closeSettings = useUIStore((state) => state.closeSettings)
  const openSettings = useUIStore((state) => state.openSettings)

  console.log('[App] Rendering. isSettingsOpen =', isSettingsOpen)

  const isWorkflowActive = useWorkflowStore((state) => state.isWorkflowActive)
  const currentTab = useWorkflowStore((state) => state.currentTab)

  /**
   * Handle settings dialog state change
   */
  const handleSettingsChange = (open: boolean) => {
    console.log('[App] handleSettingsChange called with open =', open)
    if (open) {
      openSettings()
    } else {
      closeSettings()
    }
  }

  // Determine which workflow screen to show based on current tab
  const renderWorkflowScreen = () => {
    switch (currentTab) {
      case 'edit':
        return <MainLayout />
      case 'export':
        return <ExportScreen />
      case 'generate':
        return <AIGeneratorPage />
      default:
        return <MainLayout />
    }
  }

  return (
    <>
      {isWorkflowActive && (
        <div className="flex flex-col h-screen">
          <WorkflowTabs />
          <div className="flex-1 overflow-hidden">
            {renderWorkflowScreen()}
          </div>
        </div>
      )}
      {!isWorkflowActive && <MainLayout />}
      <ErrorDialog />
      <RecordingModeModal />
      <RecordingTimer />
      <Settings open={isSettingsOpen} onOpenChange={handleSettingsChange} />
    </>
  )
}

export default App
