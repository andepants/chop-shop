/**
 * MediaLibrary Component Tests
 * Tests for media library display and functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MediaLibrary } from '../MediaLibrary'
import { useMediaStore } from '../../../store/mediaStore'
import type { MediaFile } from '@shared/types'

describe('MediaLibrary', () => {
  beforeEach(() => {
    // Reset store before each test
    useMediaStore.setState({ files: [], isImporting: false, selectedFileId: null })
  })

  const mockMediaFile: MediaFile = {
    id: '123',
    path: '/test/video.mp4',
    name: 'test-video.mp4',
    format: 'MP4',
    duration: 120,
    resolution: { width: 1920, height: 1080 },
    size: 45234567,
    thumbnail: 'data:image/png;base64,abc123',
    createdAt: Date.now()
  }

  it('renders empty state when no files imported (AC: #1)', () => {
    render(<MediaLibrary />)

    expect(
      screen.getByText(/No media imported yet. Drag files or click Import to begin./i)
    ).toBeInTheDocument()
  })

  it('renders list of files when files are present (AC: #1)', () => {
    const files: MediaFile[] = [
      { ...mockMediaFile, id: '1', name: 'video1.mp4' },
      { ...mockMediaFile, id: '2', name: 'video2.mp4' },
      { ...mockMediaFile, id: '3', name: 'video3.mp4' }
    ]

    useMediaStore.setState({ files })

    render(<MediaLibrary />)

    expect(screen.getByText('video1.mp4')).toBeInTheDocument()
    expect(screen.getByText('video2.mp4')).toBeInTheDocument()
    expect(screen.getByText('video3.mp4')).toBeInTheDocument()
  })

  it('applies scrollable container class (AC: #5)', () => {
    const files: MediaFile[] = [mockMediaFile]
    useMediaStore.setState({ files })

    const { container } = render(<MediaLibrary />)
    const scrollContainer = container.firstChild as HTMLElement

    expect(scrollContainer.className).toContain('overflow-y-auto')
    expect(scrollContainer.className).toContain('scroll-smooth')
  })

  it('renders correct number of MediaItem components (AC: #1)', () => {
    const files: MediaFile[] = Array.from({ length: 10 }, (_, i) => ({
      ...mockMediaFile,
      id: `${i}`,
      name: `video${i}.mp4`
    }))

    useMediaStore.setState({ files })

    render(<MediaLibrary />)

    files.forEach((file) => {
      expect(screen.getByText(file.name)).toBeInTheDocument()
    })
  })
})
