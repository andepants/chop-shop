/**
 * TopBar Component
 * Top application bar with title and actions
 */
import { Button } from '../shared'

/**
 * Top bar component displaying app title and Export button
 */
export function TopBar(): React.JSX.Element {
  return (
    <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-700 px-4 py-3">
      <h1 className="text-xl font-bold text-zinc-50">Chop Shop</h1>

      <Button variant="primary" size="sm" disabled>
        Export
      </Button>
    </div>
  )
}
