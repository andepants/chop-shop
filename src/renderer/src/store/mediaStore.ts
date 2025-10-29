/**
 * Media Store
 * Zustand store for managing imported media files with localStorage persistence
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { MediaFile } from '@shared/types'

interface MediaStoreState {
  files: MediaFile[]
  isImporting: boolean
  selectedFileId: string | null
}

interface MediaStoreActions {
  addFile: (file: MediaFile) => void
  addFiles: (files: MediaFile[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  setIsImporting: (isImporting: boolean) => void
  selectFile: (id: string | null) => void
}

type MediaStore = MediaStoreState & MediaStoreActions

/**
 * Media library state store
 * Manages all imported video files with metadata
 * Persists files to localStorage to survive app restarts
 */
export const useMediaStore = create<MediaStore>()(
  persist(
    (set) => ({
      // State
      files: [],
      isImporting: false,
      selectedFileId: null,

      // Actions
      addFile: (file) => {
        console.log('MediaStore: Adding file', file.name)
        set((state) => ({
          files: [...state.files, file]
        }))
      },

      addFiles: (files) => {
        console.log('MediaStore: Adding files', files.length)
        set((state) => ({
          files: [...state.files, ...files]
        }))
      },

      removeFile: (id) => {
        console.log('MediaStore: Removing file', id)
        set((state) => ({
          files: state.files.filter((f) => f.id !== id)
        }))
      },

      clearFiles: () => {
        console.log('MediaStore: Clearing all files')
        set({
          files: []
        })
      },

      setIsImporting: (isImporting) =>
        set({
          isImporting
        }),

      selectFile: (id) =>
        set({
          selectedFileId: id
        })
    }),
    {
      name: 'media-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist the files array, not importing state or selection
      partialize: (state) => ({
        files: state.files
      })
    }
  )
)
