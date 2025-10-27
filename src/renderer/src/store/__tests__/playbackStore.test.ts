/**
 * PlaybackStore Tests
 * Tests for playback state management store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlaybackStore } from '../playbackStore'
import { useTimelineStore } from '../timelineStore'

describe('playbackStore', () => {
  beforeEach(() => {
    // Reset stores before each test
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
              trimOut: 10,
              trackId: 1
            },
            {
              id: 'clip-2',
              sourceFile: '/path/to/video2.mp4',
              startTime: 10,
              duration: 5,
              trimIn: 0,
              trimOut: 5,
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

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = usePlaybackStore.getState()

      expect(state.currentClipId).toBe(null)
      expect(state.isPlaying).toBe(false)
      expect(state.currentTime).toBe(0)
      expect(state.duration).toBe(0)
      expect(state.videoElement).toBe(null)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('loadClip (AC: #2)', () => {
    it('should load clip and set video source to file:// path', () => {
      const mockVideo = {
        src: '',
        currentTime: 0,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn()
      } as unknown as HTMLVideoElement

      usePlaybackStore.setState({ videoElement: mockVideo })

      const { loadClip } = usePlaybackStore.getState()
      loadClip('clip-1')

      const state = usePlaybackStore.getState()
      expect(state.currentClipId).toBe('clip-1')
      expect(state.isLoading).toBe(true)
      expect(mockVideo.src).toBe('file:///path/to/video1.mp4')
    })

    it('should set initial currentTime to clip trimIn', () => {
      const mockVideo = {
        src: '',
        currentTime: 0,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn()
      } as unknown as HTMLVideoElement

      usePlaybackStore.setState({ videoElement: mockVideo })

      // Add clip with trimIn offset
      useTimelineStore.setState({
        tracks: [
          {
            id: 1,
            clips: [
              {
                id: 'clip-3',
                sourceFile: '/path/to/video3.mp4',
                startTime: 0,
                duration: 10,
                trimIn: 2.5, // Start at 2.5 seconds
                trimOut: 10,
                trackId: 1
              }
            ]
          }
        ]
      })

      const { loadClip } = usePlaybackStore.getState()
      loadClip('clip-3')

      expect(mockVideo.currentTime).toBe(2.5)
    })

    it('should warn if video element not initialized', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { loadClip } = usePlaybackStore.getState()
      loadClip('clip-1')

      expect(consoleSpy).toHaveBeenCalledWith('Cannot load clip: video element not initialized')
      consoleSpy.mockRestore()
    })

    it('should warn if clip not found', () => {
      const mockVideo = {
        src: '',
        currentTime: 0,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn()
      } as unknown as HTMLVideoElement

      usePlaybackStore.setState({ videoElement: mockVideo })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { loadClip } = usePlaybackStore.getState()
      loadClip('non-existent-clip')

      expect(consoleSpy).toHaveBeenCalledWith('Clip not found: non-existent-clip')
      consoleSpy.mockRestore()
    })
  })

  describe('play (AC: #3)', () => {
    it('should start playback and set isPlaying to true', async () => {
      const mockVideo = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn()
      } as unknown as HTMLVideoElement

      usePlaybackStore.setState({ videoElement: mockVideo })

      const { play } = usePlaybackStore.getState()
      await play()

      const state = usePlaybackStore.getState()
      expect(state.isPlaying).toBe(true)
      expect(mockVideo.play).toHaveBeenCalled()
    })

    it('should handle playback errors', async () => {
      const mockVideo = {
        play: vi.fn().mockRejectedValue(new Error('Playback failed')),
        pause: vi.fn()
      } as unknown as HTMLVideoElement

      usePlaybackStore.setState({ videoElement: mockVideo })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { play } = usePlaybackStore.getState()
      await play()

      const state = usePlaybackStore.getState()
      expect(state.isPlaying).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('pause (AC: #3)', () => {
    it('should pause playback and set isPlaying to false', () => {
      const mockVideo = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn()
      } as unknown as HTMLVideoElement

      usePlaybackStore.setState({ videoElement: mockVideo, isPlaying: true })

      const { pause } = usePlaybackStore.getState()
      pause()

      const state = usePlaybackStore.getState()
      expect(state.isPlaying).toBe(false)
      expect(mockVideo.pause).toHaveBeenCalled()
    })
  })

  describe('seek (AC: #6)', () => {
    it('should update video.currentTime and state', () => {
      const mockVideo = {
        currentTime: 0,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn()
      } as unknown as HTMLVideoElement

      usePlaybackStore.setState({ videoElement: mockVideo })

      const { seek } = usePlaybackStore.getState()
      seek(5.5)

      expect(mockVideo.currentTime).toBe(5.5)
      const state = usePlaybackStore.getState()
      expect(state.currentTime).toBe(5.5)
    })
  })

  describe('setCurrentTime', () => {
    it('should update currentTime state', () => {
      const { setCurrentTime } = usePlaybackStore.getState()
      setCurrentTime(3.14)

      const state = usePlaybackStore.getState()
      expect(state.currentTime).toBe(3.14)
    })
  })

  describe('setVideoElement', () => {
    it('should set video element reference', () => {
      const mockVideo = {} as HTMLVideoElement

      const { setVideoElement } = usePlaybackStore.getState()
      setVideoElement(mockVideo)

      const state = usePlaybackStore.getState()
      expect(state.videoElement).toBe(mockVideo)
    })
  })

  describe('setLoading', () => {
    it('should update loading state', () => {
      const { setLoading } = usePlaybackStore.getState()
      setLoading(true)

      let state = usePlaybackStore.getState()
      expect(state.isLoading).toBe(true)

      setLoading(false)
      state = usePlaybackStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setDuration', () => {
    it('should update duration state', () => {
      const { setDuration } = usePlaybackStore.getState()
      setDuration(120.5)

      const state = usePlaybackStore.getState()
      expect(state.duration).toBe(120.5)
    })
  })
})
