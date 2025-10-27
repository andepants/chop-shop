/**
 * Sidebar File Picker Tests
 * Tests for Import button and file picker dialog functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import type { IPCResponse, MediaFile } from '../../../../../shared/types'
import { useMediaStore } from '../../../store/mediaStore'
import { useUIStore } from '../../../store/uiStore'

// Mock window.api
const mockOpenFileDialog = vi.fn()
const mockImportFile = vi.fn()

Object.defineProperty(window, 'api', {
  writable: true,
  value: {
    openFileDialog: mockOpenFileDialog,
    importFile: mockImportFile
  }
})

describe('Sidebar - File Picker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Zustand stores
    useMediaStore.setState({ files: [], isImporting: false })
    useUIStore.setState({
      error: {
        isVisible: false,
        message: '',
        title: undefined
      }
    })
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

  it('renders Import button (AC: #1)', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
  })

  it('opens file picker on Import button click (AC: #2)', async () => {
    mockOpenFileDialog.mockResolvedValue({
      success: true,
      data: []
    } as IPCResponse<string[]>)

    render(<Sidebar />)
    const importButton = screen.getByRole('button', { name: /import/i })

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(mockOpenFileDialog).toHaveBeenCalledTimes(1)
    })
  })

  it('imports selected files from file picker (AC: #4)', async () => {
    mockOpenFileDialog.mockResolvedValue({
      success: true,
      data: ['/test/video1.mp4', '/test/video2.mp4']
    } as IPCResponse<string[]>)

    mockImportFile.mockResolvedValue({
      success: true,
      data: mockMediaFile
    } as IPCResponse<MediaFile>)

    render(<Sidebar />)
    const importButton = screen.getByRole('button', { name: /import/i })

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(mockImportFile).toHaveBeenCalledTimes(2)
    })
  })

  it('handles user canceling file picker', async () => {
    mockOpenFileDialog.mockResolvedValue({
      success: true,
      data: []
    } as IPCResponse<string[]>)

    render(<Sidebar />)
    const importButton = screen.getByRole('button', { name: /import/i })

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(mockOpenFileDialog).toHaveBeenCalled()
    })

    // Should not attempt to import any files
    expect(mockImportFile).not.toHaveBeenCalled()
  })

  it('shows importing state during file processing (AC: #6)', async () => {
    mockOpenFileDialog.mockResolvedValue({
      success: true,
      data: ['/test/video.mp4']
    } as IPCResponse<string[]>)

    mockImportFile.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: mockMediaFile
              } as IPCResponse<MediaFile>),
            500 // Longer delay to give test time to check
          )
        )
    )

    render(<Sidebar />)
    const importButton = screen.getByRole('button', { name: /import/i })

    fireEvent.click(importButton)

    // Check immediately for the importing state
    const importingText = await screen.findByText(/importing\.\.\./i, {}, { timeout: 100 })
    expect(importingText).toBeInTheDocument()
  })

  it('disables Import button during import (AC: #6)', async () => {
    mockOpenFileDialog.mockResolvedValue({
      success: true,
      data: ['/test/video.mp4']
    } as IPCResponse<string[]>)

    mockImportFile.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: mockMediaFile
              } as IPCResponse<MediaFile>),
            500
          )
        )
    )

    render(<Sidebar />)
    const importButton = screen.getByRole('button', { name: /import/i })

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(importButton).toBeDisabled()
    })
  })

  it('handles multiple file selection (AC: #5)', async () => {
    const files = ['/test/video1.mp4', '/test/video2.mp4', '/test/video3.mp4']

    mockOpenFileDialog.mockResolvedValue({
      success: true,
      data: files
    } as IPCResponse<string[]>)

    mockImportFile.mockResolvedValue({
      success: true,
      data: mockMediaFile
    } as IPCResponse<MediaFile>)

    render(<Sidebar />)
    const importButton = screen.getByRole('button', { name: /import/i })

    fireEvent.click(importButton)

    // First wait for openFileDialog to be called
    await waitFor(() => {
      expect(mockOpenFileDialog).toHaveBeenCalled()
    })

    // Then wait for all imports to complete
    await waitFor(
      () => {
        expect(mockImportFile).toHaveBeenCalledTimes(3)
      },
      { timeout: 3000 }
    )
  })

  it('handles import errors gracefully', async () => {
    mockOpenFileDialog.mockResolvedValue({
      success: true,
      data: ['/test/video.mp4']
    } as IPCResponse<string[]>)

    mockImportFile.mockResolvedValue({
      success: false,
      error: 'Failed to process video'
    } as IPCResponse<MediaFile>)

    render(<Sidebar />)
    const importButton = screen.getByRole('button', { name: /import/i })

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(mockImportFile).toHaveBeenCalled()
    })
  })
})
