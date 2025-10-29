/**
 * Main application component
 * Displays the 3-panel layout UI shell or export screen
 */
import { MainLayout } from './components/Layout'
import { ErrorDialog } from './components/shared'
import { ExportScreen } from './components/Export'
import { RecordingModeModal } from './components/Recording/RecordingModeModal'
import { RecordingTimer } from './components/Recording/RecordingTimer'
import { Settings } from './components/Settings/Settings'
import { AIGeneratorPage } from './components/AI/AIGeneratorPage'
import { useUIStore } from './store/uiStore'

function App(): React.JSX.Element {
  const isExportModalOpen = useUIStore((state) => state.export.isModalOpen)
  const isSettingsOpen = useUIStore((state) => state.settings.isOpen)
  const closeSettings = useUIStore((state) => state.closeSettings)
  const isAIGeneratorVisible = useUIStore((state) => state.aiGenerator.isVisible)

  // Determine which main view to show
  const renderMainView = () => {
    if (isAIGeneratorVisible) return <AIGeneratorPage />
    if (isExportModalOpen) return <ExportScreen />
    return <MainLayout />
  }

  return (
    <>
      {renderMainView()}
      <ErrorDialog />
      <RecordingModeModal />
      <RecordingTimer />
      <Settings open={isSettingsOpen} onOpenChange={closeSettings} />
    </>
  )
}

export default App
