/**
 * PlaybackControls Component Tests
 * Tests for play/pause button and time display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { PlaybackControls } from '../PlaybackControls'
import { usePlaybackStore } from '@/store/playbackStore'

describe('PlaybackControls', () => {
  beforeEach(() => {
    // Reset store
    usePlaybackStore.setState({
      currentClipId: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      videoElement: null,
      isLoading: false
    })
  })

  describe('Play/Pause Button (AC: #3)', () => {
    it('should render play button when paused', () => {
      usePlaybackStore.setState({ isPlaying: false, currentClipId: 'clip-1' })

      render(<PlaybackControls />)

      const button = screen.getByRole('button', { name: 'Play' })
      expect(button).toBeTruthy()
    })

    it('should render pause button when playing', () => {
      usePlaybackStore.setState({ isPlaying: true, currentClipId: 'clip-1' })

      render(<PlaybackControls />)

      const button = screen.getByRole('button', { name: 'Pause' })
      expect(button).toBeTruthy()
    })

    it('should call play() when play button clicked', async () => {
      const user = userEvent.setup()
      const playSpy = vi.spyOn(usePlaybackStore.getState(), 'play')

      usePlaybackStore.setState({ isPlaying: false, currentClipId: 'clip-1' })

      render(<PlaybackControls />)

      const button = screen.getByRole('button', { name: 'Play' })
      await user.click(button)

      expect(playSpy).toHaveBeenCalled()
    })

    it('should call pause() when pause button clicked', async () => {
      const user = userEvent.setup()
      const pauseSpy = vi.spyOn(usePlaybackStore.getState(), 'pause')

      usePlaybackStore.setState({ isPlaying: true, currentClipId: 'clip-1' })

      render(<PlaybackControls />)

      const button = screen.getByRole('button', { name: 'Pause' })
      await user.click(button)

      expect(pauseSpy).toHaveBeenCalled()
    })

    it('should be disabled when no clip is loaded', () => {
      usePlaybackStore.setState({ currentClipId: null })

      render(<PlaybackControls />)

      const button = screen.getByRole('button')
      expect(button.hasAttribute('disabled')).toBe(true)
    })

    it('should be enabled when clip is loaded', () => {
      usePlaybackStore.setState({ currentClipId: 'clip-1' })

      render(<PlaybackControls />)

      const button = screen.getByRole('button')
      expect(button.hasAttribute('disabled')).toBe(false)
    })
  })

  describe('Time Display (AC: #5)', () => {
    it('should display formatted currentTime and duration', () => {
      usePlaybackStore.setState({
        currentTime: 65.5, // 1:05
        duration: 185.25 // 3:05
      })

      render(<PlaybackControls />)

      // formatTime should display as MM:SS
      expect(screen.getByText(/1:05/)).toBeTruthy()
      expect(screen.getByText(/3:05/)).toBeTruthy()
    })

    it('should display 0:00 / 0:00 when no clip loaded', () => {
      usePlaybackStore.setState({
        currentTime: 0,
        duration: 0
      })

      render(<PlaybackControls />)

      expect(screen.getByText(/0:00/)).toBeTruthy()
    })

    it('should update time display when currentTime changes', () => {
      usePlaybackStore.setState({
        currentTime: 10,
        duration: 60
      })

      const { rerender } = render(<PlaybackControls />)

      expect(screen.getByText(/0:10/)).toBeTruthy()

      // Update time
      usePlaybackStore.setState({ currentTime: 30 })
      rerender(<PlaybackControls />)

      expect(screen.getByText(/0:30/)).toBeTruthy()
    })

    it('should format times correctly for hours', () => {
      usePlaybackStore.setState({
        currentTime: 3665, // 1:01:05
        duration: 7325 // 2:02:05
      })

      render(<PlaybackControls />)

      expect(screen.getByText(/1:01:05/)).toBeTruthy()
      expect(screen.getByText(/2:02:05/)).toBeTruthy()
    })
  })

  describe('Styling', () => {
    it('should have proper Tailwind classes', () => {
      render(<PlaybackControls />)

      const container = document.querySelector('.bg-zinc-900')
      expect(container).toBeTruthy()

      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-cyan-500')
      expect(button.className).toContain('rounded-full')
    })
  })
})
