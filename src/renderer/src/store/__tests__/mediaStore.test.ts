/**
 * Media Store Tests
 * Tests for Zustand media library state management
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useMediaStore } from '../mediaStore'
import type { MediaFile } from '../../../../shared/types'

describe('mediaStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMediaStore.setState({ files: [], isImporting: false, selectedFileId: null })
  })

  const mockMediaFile: MediaFile = {
    id: '123',
    path: '/test/video.mp4',
    name: 'video.mp4',
    format: 'MP4',
    duration: 120,
    resolution: { width: 1920, height: 1080 },
    size: 1024000,
    createdAt: Date.now()
  }

  it('initializes with empty files array', () => {
    const state = useMediaStore.getState()
    expect(state.files).toEqual([])
    expect(state.isImporting).toBe(false)
    expect(state.selectedFileId).toBe(null)
  })

  it('adds a file to the store (AC: #4)', () => {
    const { addFile } = useMediaStore.getState()

    addFile(mockMediaFile)

    const state = useMediaStore.getState()
    expect(state.files).toHaveLength(1)
    expect(state.files[0]).toEqual(mockMediaFile)
  })

  it('adds multiple files simultaneously (AC: #6)', () => {
    const { addFiles } = useMediaStore.getState()

    const files: MediaFile[] = [
      { ...mockMediaFile, id: '1', name: 'video1.mp4' },
      { ...mockMediaFile, id: '2', name: 'video2.mp4' },
      { ...mockMediaFile, id: '3', name: 'video3.mp4' }
    ]

    addFiles(files)

    const state = useMediaStore.getState()
    expect(state.files).toHaveLength(3)
  })

  it('removes a file by id', () => {
    const { addFile, removeFile } = useMediaStore.getState()

    addFile(mockMediaFile)
    removeFile('123')

    const state = useMediaStore.getState()
    expect(state.files).toHaveLength(0)
  })

  it('clears all files', () => {
    const { addFiles, clearFiles } = useMediaStore.getState()

    const files: MediaFile[] = [
      { ...mockMediaFile, id: '1' },
      { ...mockMediaFile, id: '2' }
    ]

    addFiles(files)
    clearFiles()

    const state = useMediaStore.getState()
    expect(state.files).toHaveLength(0)
  })

  it('sets importing state', () => {
    const { setIsImporting } = useMediaStore.getState()

    setIsImporting(true)
    expect(useMediaStore.getState().isImporting).toBe(true)

    setIsImporting(false)
    expect(useMediaStore.getState().isImporting).toBe(false)
  })

  it('stores file metadata correctly (AC: #4)', () => {
    const { addFile } = useMediaStore.getState()

    const fileWithMetadata: MediaFile = {
      id: '456',
      path: '/test/video.mp4',
      name: 'video.mp4',
      format: 'MP4',
      duration: 180.5,
      resolution: { width: 3840, height: 2160 },
      size: 5242880,
      thumbnail: 'data:image/png;base64,abc123',
      createdAt: 1234567890
    }

    addFile(fileWithMetadata)

    const state = useMediaStore.getState()
    const stored = state.files[0]

    expect(stored.duration).toBe(180.5)
    expect(stored.resolution.width).toBe(3840)
    expect(stored.resolution.height).toBe(2160)
    expect(stored.size).toBe(5242880)
    expect(stored.thumbnail).toBe('data:image/png;base64,abc123')
  })

  it('selects a file by id (AC: #3)', () => {
    const { selectFile } = useMediaStore.getState()

    selectFile('123')

    const state = useMediaStore.getState()
    expect(state.selectedFileId).toBe('123')
  })

  it('deselects file when null is passed (AC: #3)', () => {
    const { selectFile } = useMediaStore.getState()

    selectFile('123')
    expect(useMediaStore.getState().selectedFileId).toBe('123')

    selectFile(null)
    expect(useMediaStore.getState().selectedFileId).toBe(null)
  })
})
