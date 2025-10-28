/**
 * Main application component
 * Displays the 3-panel layout UI shell or export screen
 */
import { MainLayout } from './components/Layout'
import { ErrorDialog } from './components/shared'
import { ExportScreen } from './components/Export'
import { useUIStore } from './store/uiStore'

function App(): React.JSX.Element {
  const isExportModalOpen = useUIStore((state) => state.export.isModalOpen)

  return (
    <>
      {isExportModalOpen ? <ExportScreen /> : <MainLayout />}
      <ErrorDialog />
    </>
  )
}

export default App
