/**
 * TopBar Component
 * Minimal top application bar
 */

/**
 * Minimal top bar for application chrome
 */
export function TopBar(): React.JSX.Element {
  return (
    <div
      className="h-10 border-b"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-subtle)'
      }}
    />
  )
}
