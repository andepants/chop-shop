/**
 * Button Component
 * Reusable button with variants and states
 */
import { cn } from '../../utils/cn.util'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable button component with support for different variants and sizes
 * @param variant - Button style variant (primary, secondary, ghost)
 * @param size - Button size (sm, md, lg)
 * @param className - Additional CSS classes
 * @param children - Button content
 * @param props - Additional HTML button attributes
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={cn(
        // Base styles
        'rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
        // Variant styles
        {
          'bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-cyan-800 disabled:text-cyan-400':
            variant === 'primary',
          'bg-zinc-700 text-zinc-100 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500':
            variant === 'secondary',
          'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:text-zinc-600':
            variant === 'ghost'
        },
        // Size styles
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg'
        },
        // Disabled styles
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
