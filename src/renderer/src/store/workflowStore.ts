/**
 * Workflow Store
 *
 * Manages state for the 3-step workflow (Edit → Export → Generate Posts).
 * Tracks current workflow tab, workflow visibility, and exported video path.
 */

import { create } from 'zustand'

/**
 * Workflow step identifiers
 */
export type WorkflowStep = 'edit' | 'export' | 'generate'

/**
 * Workflow state interface
 */
export interface WorkflowState {
  /** Whether workflow mode is active (shows tabs) */
  isWorkflowActive: boolean

  /** Current active workflow tab */
  currentTab: WorkflowStep

  /** Path to exported video (set after export, used by generate tab) */
  exportedVideoPath: string | null

  /**
   * Activate workflow mode and set initial tab
   */
  activateWorkflow: (initialTab?: WorkflowStep) => void

  /**
   * Deactivate workflow mode
   */
  deactivateWorkflow: () => void

  /**
   * Set the current workflow tab
   */
  setCurrentTab: (tab: WorkflowStep) => void

  /**
   * Set the exported video path (called after successful export)
   */
  setExportedVideoPath: (path: string | null) => void

  /**
   * Clear workflow state (reset to initial state)
   */
  clearWorkflow: () => void
}

/**
 * Workflow store
 *
 * State management for workflow navigation and video export tracking.
 */
export const useWorkflowStore = create<WorkflowState>((set) => ({
  isWorkflowActive: true, // Default to workflow mode active
  currentTab: 'edit',
  exportedVideoPath: null,

  activateWorkflow: (initialTab = 'edit') =>
    set({
      isWorkflowActive: true,
      currentTab: initialTab
    }),

  deactivateWorkflow: () =>
    set({ isWorkflowActive: false }),

  setCurrentTab: (tab: WorkflowStep) =>
    set({ currentTab: tab }),

  setExportedVideoPath: (path: string | null) =>
    set({ exportedVideoPath: path }),

  clearWorkflow: () =>
    set({
      currentTab: 'edit',
      exportedVideoPath: null
    })
}))
