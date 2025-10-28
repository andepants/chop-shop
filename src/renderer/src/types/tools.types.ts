/**
 * Tool Types and Configurations
 * Defines timeline editing tools and their properties
 */

import type { LucideIcon } from 'lucide-react'

/**
 * Available timeline editing tools
 */
export type Tool = 'select' | 'split'

/**
 * Tool configuration interface
 * Defines visual and behavioral properties for each tool
 */
export interface ToolConfig {
  /** Tool identifier */
  id: Tool
  /** Display label for tooltips */
  label: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Keyboard shortcut key */
  shortcut: string
  /** CSS cursor style for this tool */
  cursor: string
  /** Optional description for tooltips */
  description?: string
}

/**
 * Tool metadata for UI rendering and behavior
 * Maps tool IDs to their configurations
 */
export const TOOL_CONFIGS: Record<Tool, Omit<ToolConfig, 'id'>> = {
  select: {
    label: 'Select',
    icon: null as any, // Will be imported as MousePointer2 in component
    shortcut: 'V',
    cursor: 'default',
    description: 'Select and move clips'
  },
  split: {
    label: 'Razor',
    icon: null as any, // Will be imported as SeparatorHorizontal in component
    shortcut: 'C',
    cursor: 'crosshair',
    description: 'Split clip at playhead'
  }
}
