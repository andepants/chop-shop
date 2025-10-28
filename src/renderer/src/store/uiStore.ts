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

interface ExportState {
  isModalOpen: boolean
  isExporting: boolean
  progress: number
  error: string | null
  successPath: string | null
}

interface UIStoreState {
  error: ErrorState
  export: ExportState
}

interface UIStoreActions {
  showError: (message: string, title?: string) => void
  hideError: () => void
  openExportModal: () => void
  closeExportModal: () => void
  startExport: () => void
  updateExportProgress: (progress: number) => void
  completeExport: (outputPath: string) => void
  failExport: (error: string) => void
  resetExport: () => void
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

  export: {
    isModalOpen: false,
    isExporting: false,
    progress: 0,
    error: null,
    successPath: null
  },

  // Error actions
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
    }),

  // Export actions
  openExportModal: () =>
    set((state) => ({
      export: {
        ...state.export,
        isModalOpen: true,
        error: null,
        successPath: null
      }
    })),

  closeExportModal: () =>
    set((state) => ({
      export: {
        ...state.export,
        isModalOpen: false
      }
    })),

  startExport: () =>
    set((state) => ({
      export: {
        ...state.export,
        isExporting: true,
        progress: 0,
        error: null,
        successPath: null
      }
    })),

  updateExportProgress: (progress) =>
    set((state) => ({
      export: {
        ...state.export,
        progress
      }
    })),

  completeExport: (outputPath) =>
    set((state) => ({
      export: {
        ...state.export,
        isExporting: false,
        progress: 100,
        successPath: outputPath,
        error: null
      }
    })),

  failExport: (error) =>
    set((state) => ({
      export: {
        ...state.export,
        isExporting: false,
        error,
        successPath: null
      }
    })),

  resetExport: () =>
    set((state) => ({
      export: {
        ...state.export,
        isExporting: false,
        progress: 0,
        error: null,
        successPath: null
      }
    }))
}))
