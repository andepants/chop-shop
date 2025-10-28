/**
 * TopBar Component
 * Application header with branding and export functionality
 */

import { Button } from '@/components/ui/button'

/**
 * Handles export button click
 * Export functionality to be implemented
 */
function handleExport(): void {
  console.log('Export clicked')
}

/**
 * Top bar with application branding and export button
 */
export function TopBar(): React.JSX.Element {
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

      {/* Export Button */}
      <Button
        onClick={handleExport}
        size="sm"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--text-primary)'
        }}
      >
        Export
      </Button>
    </div>
  )
}
