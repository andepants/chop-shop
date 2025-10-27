/**
 * ErrorDialog Component
 * Modal dialog for displaying error messages to the user
 */

import { useUIStore } from '../../store/uiStore'

/**
 * Error dialog component
 * Shows user-friendly error messages with dismiss action
 */
export function ErrorDialog(): React.JSX.Element | null {
  const error = useUIStore((state) => state.error)
  const hideError = useUIStore((state) => state.hideError)

  if (!error.isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-zinc-50 mb-3">{error.title || 'Error'}</h3>
        <p className="text-zinc-300 text-sm mb-6">{error.message}</p>
        <div className="flex justify-end">
          <button
            onClick={hideError}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
