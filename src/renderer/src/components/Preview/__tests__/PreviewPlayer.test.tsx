/**
 * PreviewPlayer Component Tests
 * Tests for video player component rendering and behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviewPlayer } from '../PreviewPlayer'
import { usePlaybackStore } from '@/store/playbackStore'
import { useTimelineStore } from '@/store/timelineStore'

// Mock PlaybackControls
vi.mock('../PlaybackControls', () => ({
  PlaybackControls: () => <div data-testid="playback-controls">Playback Controls</div>
}))

describe('PreviewPlayer', () => {
  beforeEach(() => {
    // Reset stores
    usePlaybackStore.setState({
      currentClipId: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      videoElement: null,
      isLoading: false
    })

    useTimelineStore.setState({
      tracks: [
        {
          id: 1,
          clips: [
            {
              id: 'clip-1',
              sourceFile: '/path/to/video1.mp4',
              startTime: 0,
              duration: 10,
              trimIn: 0,
              trimOut: 0, // Trim offset from end (0 = no trim)
              trackId: 1
            },
            {
              id: 'clip-2',
              sourceFile: '/path/to/video2.mp4',
              startTime: 10,
              duration: 5,
              trimIn: 2,
              trimOut: 1, // Trim 1s from end
              trackId: 1
            }
          ]
        }
      ],
      playheadPosition: 0,
      totalDuration: 15,
      zoomLevel: 50,
      selectedClipId: null
    })
  })

  describe('Rendering (AC: #1)', () => {
    it('should render HTML5 video element', () => {
      render(<PreviewPlayer />)

      const video = document.querySelector('video')
      expect(video).toBeTruthy()
    })

    it('should render PlaybackControls', () => {
      render(<PreviewPlayer />)

      expect(screen.getByTestId('playback-controls')).toBeTruthy()
    })

    it('should display "No clip selected" when no clip loaded (AC: #1)', () => {
      render(<PreviewPlayer />)

      expect(screen.getByText('No clip selected')).toBeTruthy()
      expect(screen.getByText('Click a clip on the timeline to preview')).toBeTruthy()
    })

    it('should hide "No clip selected" when clip is loaded', () => {
      usePlaybackStore.setState({ currentClipId: 'clip-1' })

      render(<PreviewPlayer />)

      expect(screen.queryByText('No clip selected')).toBeFalsy()
    })

    it('should display loading spinner when loading (AC: #1)', () => {
      usePlaybackStore.setState({ isLoading: true })

      render(<PreviewPlayer />)

      expect(screen.getByText('Loading video...')).toBeTruthy()
    })

    it('should hide video element when loading', () => {
      usePlaybackStore.setState({ isLoading: true })

      render(<PreviewPlayer />)

      const video = document.querySelector('video')
      expect(video?.className).toContain('hidden')
    })

    it('should hide video element when no clip loaded', () => {
      render(<PreviewPlayer />)

      const video = document.querySelector('video')
      expect(video?.className).toContain('hidden')
    })

    it('should show video element when clip loaded and not loading', () => {
      usePlaybackStore.setState({ currentClipId: 'clip-1', isLoading: false })

      render(<PreviewPlayer />)

      const video = document.querySelector('video')
      expect(video?.className).not.toContain('hidden')
    })
  })

  describe('Playhead Synchronization (AC: #4)', () => {
    it('should calculate correct timeline position: playheadPosition = clip.startTime + (currentTime - trimIn)', () => {
      usePlaybackStore.setState({ currentClipId: 'clip-1' })

      render(<PreviewPlayer />)

      const video = document.querySelector('video') as HTMLVideoElement

      // Simulate timeupdate event
      Object.defineProperty(video, 'currentTime', { value: 5, writable: true })
      video.dispatchEvent(new Event('timeupdate'))

      // Expected: playheadPosition = 0 + (5 - 0) = 5
      const state = useTimelineStore.getState()
      expect(state.playheadPosition).toBe(5)
    })

    it('should handle clip with trimIn offset', () => {
      usePlaybackStore.setState({ currentClipId: 'clip-2' })

      render(<PreviewPlayer />)

      const video = document.querySelector('video') as HTMLVideoElement

      // Simulate timeupdate event at currentTime = 4 (2 seconds into the trimmed clip)
      Object.defineProperty(video, 'currentTime', { value: 4, writable: true })
      video.dispatchEvent(new Event('timeupdate'))

      // Expected: playheadPosition = 10 + (4 - 2) = 12
      const state = useTimelineStore.getState()
      expect(state.playheadPosition).toBe(12)
    })
  })

  describe('Multi-Clip Playback (AC: #4)', () => {
    it('should transition to next clip when current clip ends', () => {
      usePlaybackStore.setState({ currentClipId: 'clip-1' })

      const loadClipSpy = vi.spyOn(usePlaybackStore.getState(), 'loadClip')

      render(<PreviewPlayer />)

      const video = document.querySelector('video') as HTMLVideoElement
      video.dispatchEvent(new Event('ended'))

      // Should load next clip (clip-2)
      expect(loadClipSpy).toHaveBeenCalledWith('clip-2')
    })

    it('should stop playback and reset playhead at end of timeline', () => {
      usePlaybackStore.setState({ currentClipId: 'clip-2' }) // Last clip

      const pauseSpy = vi.spyOn(usePlaybackStore.getState(), 'pause')
      const setPlayheadSpy = vi.spyOn(useTimelineStore.getState(), 'setPlayhead')

      render(<PreviewPlayer />)

      const video = document.querySelector('video') as HTMLVideoElement
      video.dispatchEvent(new Event('ended'))

      expect(pauseSpy).toHaveBeenCalled()
      expect(setPlayheadSpy).toHaveBeenCalledWith(0)
    })
  })

  describe('Video Event Handlers', () => {
    it('should set duration and stop loading on loadedmetadata', () => {
      render(<PreviewPlayer />)

      const video = document.querySelector('video') as HTMLVideoElement
      Object.defineProperty(video, 'duration', { value: 120.5, writable: true })

      video.dispatchEvent(new Event('loadedmetadata'))

      const state = usePlaybackStore.getState()
      expect(state.duration).toBe(120.5)
      expect(state.isLoading).toBe(false)
    })

    it('should handle video error and stop loading', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<PreviewPlayer />)

      const video = document.querySelector('video') as HTMLVideoElement

      // Mock error
      Object.defineProperty(video, 'error', {
        value: {
          code: 4,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
          MEDIA_ERR_ABORTED: 1,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3
        },
        writable: true
      })

      video.dispatchEvent(new Event('error'))

      const state = usePlaybackStore.getState()
      expect(state.isLoading).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle different error codes correctly', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<PreviewPlayer />)

      const video = document.querySelector('video') as HTMLVideoElement

      // Test MEDIA_ERR_NETWORK
      Object.defineProperty(video, 'error', {
        value: {
          code: 2,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
          MEDIA_ERR_ABORTED: 1,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3
        },
        writable: true
      })

      video.dispatchEvent(new Event('error'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Video error:',
        'Network error while loading video'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Video Element Initialization', () => {
    it('should set video element reference on mount', () => {
      render(<PreviewPlayer />)

      const state = usePlaybackStore.getState()
      expect(state.videoElement).toBeTruthy()
      expect(state.videoElement?.tagName).toBe('VIDEO')
    })

    it('should clear video element reference on unmount', () => {
      const { unmount } = render(<PreviewPlayer />)

      // Verify it was set
      let state = usePlaybackStore.getState()
      expect(state.videoElement).toBeTruthy()

      // Unmount and verify it's cleared
      unmount()
      state = usePlaybackStore.getState()
      expect(state.videoElement).toBe(null)
    })
  })
})
