/**
 * UI Store
 * Zustand store for managing UI state (modals, dialogs, notifications)
 */

import { create } from 'zustand'

interface ErrorState {
  isVisible: boolean
  message: string
  title?: string
}

interface UIStoreState {
  error: ErrorState
}

interface UIStoreActions {
  showError: (message: string, title?: string) => void
  hideError: () => void
}

type UIStore = UIStoreState & UIStoreActions

/**
 * UI state store
 * Manages error dialogs, modals, and other UI states
 */
export const useUIStore = create<UIStore>((set) => ({
  // State
  error: {
    isVisible: false,
    message: '',
    title: undefined
  },

  // Actions
  showError: (message, title) =>
    set({
      error: {
        isVisible: true,
        message,
        title
      }
    }),

  hideError: () =>
    set({
      error: {
        isVisible: false,
        message: '',
        title: undefined
      }
    })
}))
