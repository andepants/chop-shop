/**
 * Class Name Utility
 * Merges Tailwind CSS classes intelligently using clsx and tailwind-merge
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names, handling Tailwind conflicts
 * @param inputs - Class names to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
