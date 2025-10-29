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

interface RecordingModalState {
  isModalOpen: boolean
}

interface SettingsState {
  isOpen: boolean
}

interface AIGeneratorState {
  isVisible: boolean
}

interface UIStoreState {
  error: ErrorState
  export: ExportState
  recordingModal: RecordingModalState
  settings: SettingsState
  aiGenerator: AIGeneratorState
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
  openRecordingModal: () => void
  closeRecordingModal: () => void
  openSettings: () => void
  closeSettings: () => void
  showAIGenerator: () => void
  hideAIGenerator: () => void
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

  recordingModal: {
    isModalOpen: false
  },

  settings: {
    isOpen: false
  },

  aiGenerator: {
    isVisible: false
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
    })),

  // Recording modal actions
  openRecordingModal: () =>
    set((state) => ({
      recordingModal: {
        ...state.recordingModal,
        isModalOpen: true
      }
    })),

  closeRecordingModal: () =>
    set((state) => ({
      recordingModal: {
        ...state.recordingModal,
        isModalOpen: false
      }
    })),

  // Settings actions
  openSettings: () => {
    console.log('[UIStore] openSettings called')
    set((state) => {
      console.log('[UIStore] Setting isOpen to true. Current state:', state.settings)
      return {
        settings: {
          ...state.settings,
          isOpen: true
        }
      }
    })
  },

  closeSettings: () => {
    console.log('[UIStore] closeSettings called')
    set((state) => {
      console.log('[UIStore] Setting isOpen to false. Current state:', state.settings)
      return {
        settings: {
          ...state.settings,
          isOpen: false
        }
      }
    })
  },

  // AI Generator actions
  showAIGenerator: () =>
    set((state) => ({
      aiGenerator: {
        ...state.aiGenerator,
        isVisible: true
      }
    })),

  hideAIGenerator: () =>
    set((state) => ({
      aiGenerator: {
        ...state.aiGenerator,
        isVisible: false
      }
    }))
}))
