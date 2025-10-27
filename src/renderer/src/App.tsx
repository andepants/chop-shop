/**
 * Main application component
 * Displays the 3-panel layout UI shell
 */
import { MainLayout } from './components/Layout'
import { ErrorDialog } from './components/shared'

function App(): React.JSX.Element {
  return (
    <>
      <MainLayout />
      <ErrorDialog />
    </>
  )
}

export default App
