/**
 * Tooltip Component
 *
 * Fast-appearing tooltip for UI elements with minimal delay.
 * Appears in 150ms vs native browser tooltips (~1000ms).
 */

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  /** Tooltip text to display */
  text: string
  /** Child element to attach tooltip to */
  children: React.ReactNode
  /** Delay before showing tooltip in milliseconds (default: 150ms) */
  delay?: number
}

/**
 * Tooltip wrapper component with fast appearance
 *
 * Usage:
 * ```tsx
 * <Tooltip text="Click to mute">
 *   <button>M</button>
 * </Tooltip>
 * ```
 *
 * @param text - Tooltip content
 * @param children - Element to attach tooltip to
 * @param delay - Appearance delay in ms (default 150ms)
 */
export function Tooltip({ text, children, delay = 150 }: TooltipProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<'top' | 'bottom'>('top')
  const timeoutRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  /**
   * Show tooltip after delay
   */
  function handleMouseEnter(): void {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  /**
   * Hide tooltip immediately and clear delay timer
   */
  function handleMouseLeave(): void {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  /**
   * Calculate optimal tooltip position (top or bottom)
   * to keep it visible within viewport
   */
  useEffect(() => {
    if (isVisible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom

      // Show below if not enough space above
      setPosition(spaceAbove < 40 ? 'bottom' : 'top')
    }
  }, [isVisible])

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Tooltip popup */}
      {isVisible && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap pointer-events-none z-50"
          style={{
            backgroundColor: 'rgb(24, 24, 27)', // zinc-900
            color: 'rgb(228, 228, 231)', // zinc-200
            border: '1px solid rgb(63, 63, 70)', // zinc-700
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            [position === 'top' ? 'bottom' : 'top']: '100%',
            [position === 'top' ? 'marginBottom' : 'marginTop']: '4px',
            animation: 'tooltipFadeIn 150ms ease-out'
          }}
        >
          {text}
          {/* Arrow pointer */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              [position === 'top' ? 'bottom' : 'top']: '-3px',
              width: 0,
              height: 0,
              borderLeft: '3px solid transparent',
              borderRight: '3px solid transparent',
              [position === 'top' ? 'borderTop' : 'borderBottom']: '3px solid rgb(24, 24, 27)'
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(${position === 'top' ? '4px' : '-4px'});
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
