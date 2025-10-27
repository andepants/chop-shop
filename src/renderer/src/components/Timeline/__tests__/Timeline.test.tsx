/**
 * Timeline Component Tests
 * Tests for main timeline container with drag-drop and auto-zoom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Timeline } from '../Timeline'
import { useMediaStore } from '@/store/mediaStore'
import { useTimelineStore } from '@/store/timelineStore'
import type { MediaFile } from '../../../../../../shared/types'

describe('Timeline', () => {
  const mockMediaFile: MediaFile = {
    id: 'file-123',
    path: '/test/video.mp4',
    name: 'test-video.mp4',
    format: 'MP4',
    duration: 30,
    resolution: { width: 1920, height: 1080 },
    size: 1024000,
    createdAt: Date.now()
  }

  beforeEach(() => {
    // Reset stores
    useMediaStore.setState({ files: [], isImporting: false, selectedFileId: null })
    useTimelineStore.setState({
      tracks: [{ id: 1, clips: [] }],
      playheadPosition: 0,
      totalDuration: 0,
      zoomLevel: 50,
      selectedClipId: null
    })
  })

  it('renders timeline container (AC: #1)', () => {
    const { container } = render(<Timeline />)

    const timelineDiv = container.querySelector('.bg-zinc-900')
    expect(timelineDiv).toBeInTheDocument()
  })

  it('renders timeline ruler (AC: #4)', () => {
    render(<Timeline />)

    // Should render ruler with at least 0:00 marker
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('renders playhead at initial position (AC: #7)', () => {
    const { container } = render(<Timeline />)

    // Playhead should be rendered
    const playhead = container.querySelector('.bg-cyan-500')
    expect(playhead).toBeInTheDocument()
  })

  it('renders track with label (AC: #1)', () => {
    render(<Timeline />)

    expect(screen.getByText('Track 1')).toBeInTheDocument()
  })

  it('accepts drag over event (AC: #2)', () => {
    render(<Timeline />)

    const timeline = document.querySelector('.bg-zinc-900') as HTMLElement
    const dragEvent = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { dropEffect: '' },
      writable: true
    })

    const preventDefaultSpy = vi.spyOn(dragEvent, 'preventDefault')
    timeline.dispatchEvent(dragEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('adds clip from media library on drop (AC: #2, #3)', () => {
    // Add file to media store
    useMediaStore.getState().addFile(mockMediaFile)

    const { container } = render(<Timeline />)

    const timeline = container.firstChild as HTMLElement
    const mockDataTransfer = {
      getData: vi.fn((key: string) => (key === 'fileId' ? 'file-123' : '')),
      dropEffect: '',
      effectAllowed: '',
      files: [] as any,
      items: [] as any,
      types: [] as string[],
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn()
    }

    fireEvent.drop(timeline, {
      preventDefault: vi.fn(),
      dataTransfer: mockDataTransfer
    })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips).toHaveLength(1)
    expect(state.tracks[0].clips[0].sourceFile).toBe('/test/video.mp4')
    expect(state.tracks[0].clips[0].duration).toBe(30)
  })

  it('places first clip at position 0:00 (AC: #5)', () => {
    useMediaStore.getState().addFile(mockMediaFile)

    render(<Timeline />)

    const mockDataTransfer = {
      getData: vi.fn(() => 'file-123'),
      dropEffect: '',
      effectAllowed: '',
      files: [] as any,
      items: [] as any,
      types: [] as string[],
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn()
    }

    const timelineElement = document.querySelector('.bg-zinc-900') as HTMLElement
    fireEvent.drop(timelineElement, {
      preventDefault: vi.fn(),
      dataTransfer: mockDataTransfer
    })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips[0].startTime).toBe(0)
  })

  it('places second clip sequentially after first (AC: #5)', () => {
    const file1: MediaFile = { ...mockMediaFile, id: 'file-1', duration: 20 }
    const file2: MediaFile = { ...mockMediaFile, id: 'file-2', duration: 15 }

    useMediaStore.getState().addFiles([file1, file2])

    const { container } = render(<Timeline />)
    const timeline = container.firstChild as HTMLElement

    // Drop first clip
    const dataTransfer1 = {
      getData: vi.fn(() => 'file-1'),
      dropEffect: '',
      effectAllowed: '',
      files: [] as any,
      items: [] as any,
      types: [] as string[],
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn()
    }
    fireEvent.drop(timeline, { preventDefault: vi.fn(), dataTransfer: dataTransfer1 })

    // Drop second clip
    const dataTransfer2 = {
      getData: vi.fn(() => 'file-2'),
      dropEffect: '',
      effectAllowed: '',
      files: [] as any,
      items: [] as any,
      types: [] as string[],
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn()
    }
    fireEvent.drop(timeline, { preventDefault: vi.fn(), dataTransfer: dataTransfer2 })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips[0].startTime).toBe(0)
    expect(state.tracks[0].clips[1].startTime).toBe(20) // After first clip ends
  })

  it('displays dropped clip with duration label (AC: #3, #4)', () => {
    useMediaStore.getState().addFile(mockMediaFile)

    render(<Timeline />)

    const mockDataTransfer = {
      getData: vi.fn(() => 'file-123'),
      dropEffect: '',
      effectAllowed: '',
      files: [] as any,
      items: [] as any,
      types: [] as string[],
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn()
    }

    const timelineElement = document.querySelector('.bg-zinc-900') as HTMLElement
    fireEvent.drop(timelineElement, { preventDefault: vi.fn(), dataTransfer: mockDataTransfer })

    // Clip filename should be displayed (extracted from path)
    expect(screen.getByText('video.mp4')).toBeInTheDocument()

    // Verify clip was added to store with correct duration
    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips[0].duration).toBe(30)
  })

  it('has horizontal scroll for long timelines', () => {
    const { container } = render(<Timeline />)

    const timeline = container.firstChild as HTMLElement
    expect(timeline.className).toContain('overflow-x-auto')
  })

  it('ignores invalid drops without fileId', () => {
    const { container } = render(<Timeline />)
    const timeline = container.firstChild as HTMLElement

    const mockDataTransfer = {
      getData: vi.fn(() => ''), // No fileId
      dropEffect: '',
      effectAllowed: '',
      files: [] as any,
      items: [] as any,
      types: [] as string[],
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn()
    }

    fireEvent.drop(timeline, { preventDefault: vi.fn(), dataTransfer: mockDataTransfer })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips).toHaveLength(0)
  })

  it('ignores drops for non-existent files', () => {
    const { container } = render(<Timeline />)
    const timeline = container.firstChild as HTMLElement

    const mockDataTransfer = {
      getData: vi.fn(() => 'non-existent-file'),
      dropEffect: '',
      effectAllowed: '',
      files: [] as any,
      items: [] as any,
      types: [] as string[],
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn()
    }

    fireEvent.drop(timeline, { preventDefault: vi.fn(), dataTransfer: mockDataTransfer })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips).toHaveLength(0)
  })
})
