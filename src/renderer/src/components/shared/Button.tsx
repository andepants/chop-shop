/**
 * Button Component
 * Migrated to shadcn/ui with backward compatibility for existing variants
 */
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from '../ui/button'

interface ButtonProps extends Omit<ShadcnButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable button component using shadcn/ui with backward compatibility
 * Maintains original variant names (primary, secondary, ghost) for existing code
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
  // Map old variants to shadcn variants
  const shadcnVariant: ShadcnButtonProps['variant'] =
    variant === 'primary' ? 'default' : variant === 'secondary' ? 'secondary' : 'ghost'

  // Map sizes - shadcn uses 'default' instead of 'md'
  const shadcnSize: ShadcnButtonProps['size'] = size === 'md' ? 'default' : size

  return (
    <ShadcnButton variant={shadcnVariant} size={shadcnSize} className={className} {...props}>
      {children}
    </ShadcnButton>
  )
}
