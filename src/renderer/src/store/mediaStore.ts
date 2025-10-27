/**
 * Media Store
 * Zustand store for managing imported media files
 */

import { create } from 'zustand'
import type { MediaFile } from '../../../shared/types'

interface MediaStoreState {
  files: MediaFile[]
  isImporting: boolean
}

interface MediaStoreActions {
  addFile: (file: MediaFile) => void
  addFiles: (files: MediaFile[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  setIsImporting: (isImporting: boolean) => void
}

type MediaStore = MediaStoreState & MediaStoreActions

/**
 * Media library state store
 * Manages all imported video files with metadata
 */
export const useMediaStore = create<MediaStore>((set) => ({
  // State
  files: [],
  isImporting: false,

  // Actions
  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file]
    })),

  addFiles: (files) =>
    set((state) => ({
      files: [...state.files, ...files]
    })),

  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id)
    })),

  clearFiles: () =>
    set({
      files: []
    }),

  setIsImporting: (isImporting) =>
    set({
      isImporting
    })
}))
