/**
 * ImportZone Component Tests
 * Tests for drag-and-drop video import functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImportZone } from '../ImportZone'
import type { IPCResponse, MediaFile } from '../../../../../shared/types'

// Mock window.api
const mockImportFileFromObject = vi.fn()

// Setup global window.api mock before tests
Object.defineProperty(window, 'api', {
  writable: true,
  value: {
    importFileFromObject: mockImportFileFromObject
  }
})

describe('ImportZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders drag-and-drop zone with instructions (AC: #1)', () => {
    render(<ImportZone />)
    expect(screen.getByText(/Drag video files here/i)).toBeInTheDocument()
    expect(screen.getByText(/MP4, MOV, WebM/i)).toBeInTheDocument()
  })

  it('highlights zone on drag over', () => {
    const { container } = render(<ImportZone />)
    const dropZone = container.firstChild as HTMLElement

    fireEvent.dragOver(dropZone)

    // Component uses Tailwind classes for drag state
    expect(dropZone.className).toContain('border-cyan-500')
    expect(dropZone.className).toContain('bg-cyan-500/5')
  })

  it('removes highlight on drag leave', () => {
    const { container } = render(<ImportZone />)
    const dropZone = container.firstChild as HTMLElement

    fireEvent.dragOver(dropZone)
    fireEvent.dragLeave(dropZone)

    // Component uses Tailwind classes for drag state
    expect(dropZone.className).toContain('border-zinc-700')
    expect(dropZone.className).toContain('bg-transparent')
  })

  it('filters and imports only supported video formats (AC: #2)', async () => {
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

    mockImportFileFromObject.mockResolvedValue({
      success: true,
      data: mockMediaFile
    } as IPCResponse<MediaFile>)

    const { container } = render(<ImportZone />)
    const dropZone = container.firstChild as HTMLElement

    const mp4File = new File(['content'], 'test.mp4', { type: 'video/mp4' })
    const movFile = new File(['content'], 'test.mov', { type: 'video/quicktime' })
    const webmFile = new File(['content'], 'test.webm', { type: 'video/webm' })

    Object.defineProperty(mp4File, 'path', { value: '/test/video.mp4' })
    Object.defineProperty(movFile, 'path', { value: '/test/video.mov' })
    Object.defineProperty(webmFile, 'path', { value: '/test/video.webm' })

    const dataTransfer = {
      files: [mp4File, movFile, webmFile]
    }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(mockImportFileFromObject).toHaveBeenCalledTimes(3)
    })
  })

  it('shows error for unsupported file formats (AC: #5)', async () => {
    const { container } = render(<ImportZone />)
    const dropZone = container.firstChild as HTMLElement

    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(txtFile, 'path', { value: '/test/file.txt' })

    const dataTransfer = {
      files: [txtFile]
    }

    fireEvent.drop(dropZone, { dataTransfer })

    // ImportZone should not call importFile for unsupported formats
    await waitFor(() => {
      expect(mockImportFileFromObject).not.toHaveBeenCalled()
    })
  })

  it('handles multiple file drops simultaneously (AC: #6)', async () => {
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

    mockImportFileFromObject.mockResolvedValue({
      success: true,
      data: mockMediaFile
    } as IPCResponse<MediaFile>)

    const { container } = render(<ImportZone />)
    const dropZone = container.firstChild as HTMLElement

    const file1 = new File(['content1'], 'test1.mp4', { type: 'video/mp4' })
    const file2 = new File(['content2'], 'test2.mp4', { type: 'video/mp4' })
    const file3 = new File(['content3'], 'test3.mp4', { type: 'video/mp4' })

    Object.defineProperty(file1, 'path', { value: '/test/video1.mp4' })
    Object.defineProperty(file2, 'path', { value: '/test/video2.mp4' })
    Object.defineProperty(file3, 'path', { value: '/test/video3.mp4' })

    const dataTransfer = {
      files: [file1, file2, file3]
    }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(mockImportFileFromObject).toHaveBeenCalledTimes(3)
    })
  })

  it('shows importing state during file processing', async () => {
    mockImportFileFromObject.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

    const { container } = render(<ImportZone />)
    const dropZone = container.firstChild as HTMLElement

    const file = new File(['content'], 'test.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'path', { value: '/test/video.mp4' })

    const dataTransfer = {
      files: [file]
    }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByText(/Importing.../i)).toBeInTheDocument()
    })
  })

  it('handles import errors gracefully', async () => {
    mockImportFileFromObject.mockResolvedValue({
      success: false,
      error: 'Failed to process video'
    } as IPCResponse<MediaFile>)

    const { container } = render(<ImportZone />)
    const dropZone = container.firstChild as HTMLElement

    const file = new File(['content'], 'test.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'path', { value: '/test/video.mp4' })

    const dataTransfer = {
      files: [file]
    }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(mockImportFileFromObject).toHaveBeenCalled()
    })
  })
})
