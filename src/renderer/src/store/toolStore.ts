/**
 * Tool Store
 * Zustand store for managing timeline editing tool selection
 */

import { create } from 'zustand'
import type { Tool } from '@/types/tools.types'

/**
 * Tool state interface
 * Manages the currently active timeline editing tool
 */
export interface ToolState {
  /** Currently selected tool */
  selectedTool: Tool

  /** Set the active tool */
  setTool: (tool: Tool) => void
}

/**
 * Tool selection store
 * Manages which timeline editing tool is currently active
 *
 * Default tool: 'select' (pointer tool for selection and movement)
 */
export const useToolStore = create<ToolState>((set) => ({
  selectedTool: 'select',

  /**
   * Set the active timeline tool
   * Updates cursor and interaction behavior across timeline
   */
  setTool: (tool: Tool) => {
    console.log(`[ToolStore] Switching to ${tool} tool`)
    set({ selectedTool: tool })
  }
}))
