/**
 * MediaItem Component Tests
 * Tests for individual media item display and interactions
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MediaItem } from '../MediaItem'
import type { MediaFile } from '@shared/types'

describe('MediaItem', () => {
  const mockMediaFile: MediaFile = {
    id: '123',
    path: '/test/video.mp4',
    name: 'test-video.mp4',
    format: 'MP4',
    duration: 125, // 2:05
    resolution: { width: 1920, height: 1080 },
    size: 45234567, // Should format to ~43.1 MB
    thumbnail: 'data:image/png;base64,abc123',
    createdAt: Date.now()
  }

  const mockOnSelect = vi.fn()

  it('displays thumbnail (AC: #1, #2)', () => {
    render(<MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />)

    const thumbnail = screen.getByAltText('test-video.mp4') as HTMLImageElement
    expect(thumbnail).toBeInTheDocument()
    expect(thumbnail.src).toContain('data:image/png;base64,abc123')
  })

  it('displays filename (AC: #1)', () => {
    render(<MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />)

    expect(screen.getByText('test-video.mp4')).toBeInTheDocument()
  })

  it('displays formatted duration (AC: #1)', () => {
    render(<MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />)

    expect(screen.getByText('02:05')).toBeInTheDocument()
  })

  it('displays resolution metadata (AC: #6)', () => {
    render(<MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />)

    expect(screen.getByText('1920×1080')).toBeInTheDocument()
  })

  it('displays formatted file size (AC: #6)', () => {
    render(<MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />)

    expect(screen.getByText('43.1 MB')).toBeInTheDocument()
  })

  it('applies selection highlight when selected (AC: #3)', () => {
    const { container } = render(
      <MediaItem file={mockMediaFile} isSelected={true} onSelect={mockOnSelect} />
    )

    const itemDiv = container.firstChild as HTMLElement
    expect(itemDiv.className).toContain('ring-2')
    expect(itemDiv.className).toContain('ring-cyan-500')
  })

  it('does not apply selection highlight when not selected (AC: #3)', () => {
    const { container } = render(
      <MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />
    )

    const itemDiv = container.firstChild as HTMLElement
    expect(itemDiv.className).not.toContain('ring-2')
  })

  it('calls onSelect when clicked (AC: #3)', () => {
    const { container } = render(
      <MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />
    )

    const itemDiv = container.firstChild as HTMLElement
    fireEvent.click(itemDiv)

    expect(mockOnSelect).toHaveBeenCalledTimes(1)
  })

  it('is draggable (AC: #4)', () => {
    const { container } = render(
      <MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />
    )

    const itemDiv = container.firstChild as HTMLElement
    expect(itemDiv.getAttribute('draggable')).toBe('true')
  })

  it('sets file ID in dataTransfer on drag start (AC: #4)', () => {
    const { container } = render(
      <MediaItem file={mockMediaFile} isSelected={false} onSelect={mockOnSelect} />
    )

    const itemDiv = container.firstChild as HTMLElement
    const mockSetData = vi.fn()

    const mockDataTransfer = {
      setData: mockSetData,
      effectAllowed: '',
      getData: vi.fn()
    }

    fireEvent.dragStart(itemDiv, { dataTransfer: mockDataTransfer })

    expect(mockSetData).toHaveBeenCalledWith('fileId', '123')
  })

  it('truncates long filenames (AC: #1)', () => {
    const longNameFile: MediaFile = {
      ...mockMediaFile,
      name: 'this-is-a-very-long-filename-that-should-be-truncated-when-displayed.mp4'
    }

    render(<MediaItem file={longNameFile} isSelected={false} onSelect={mockOnSelect} />)

    const nameElement = screen.getByText(longNameFile.name)
    expect(nameElement.className).toContain('truncate')
  })
})
