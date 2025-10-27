/**
 * Timeline Store Tests
 * Tests for Zustand timeline state management
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore } from '../timelineStore'
import type { Clip } from '@/components/Timeline/timeline.types'

describe('timelineStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTimelineStore.setState({
      tracks: [{ id: 1, clips: [] }],
      playheadPosition: 0,
      totalDuration: 0,
      zoomLevel: 50,
      selectedClipId: null
    })
  })

  const mockClip: Omit<Clip, 'id'> = {
    sourceFile: '/test/video.mp4',
    startTime: 0,
    duration: 10,
    trimIn: 0,
    trimOut: 10,
    trackId: 1
  }

  it('initializes with empty timeline (AC: #7)', () => {
    const state = useTimelineStore.getState()
    expect(state.tracks).toHaveLength(1)
    expect(state.tracks[0].id).toBe(1)
    expect(state.tracks[0].clips).toEqual([])
    expect(state.playheadPosition).toBe(0)
    expect(state.totalDuration).toBe(0)
    expect(state.selectedClipId).toBe(null)
  })

  it('adds a clip to timeline and generates UUID', () => {
    const { addClip } = useTimelineStore.getState()

    addClip(mockClip)

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips).toHaveLength(1)
    expect(state.tracks[0].clips[0].id).toBeDefined()
    expect(state.tracks[0].clips[0].sourceFile).toBe('/test/video.mp4')
  })

  it('updates totalDuration when clip is added', () => {
    const { addClip } = useTimelineStore.getState()

    addClip(mockClip)

    const state = useTimelineStore.getState()
    expect(state.totalDuration).toBe(10) // startTime 0 + duration 10
  })

  it('adds multiple clips and sorts by startTime (AC: #5)', () => {
    const { addClip } = useTimelineStore.getState()

    addClip({ ...mockClip, startTime: 20 })
    addClip({ ...mockClip, startTime: 0 })
    addClip({ ...mockClip, startTime: 10 })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips).toHaveLength(3)
    expect(state.tracks[0].clips[0].startTime).toBe(0)
    expect(state.tracks[0].clips[1].startTime).toBe(10)
    expect(state.tracks[0].clips[2].startTime).toBe(20)
  })

  it('calculates totalDuration as maximum clip end time', () => {
    const { addClip } = useTimelineStore.getState()

    addClip({ ...mockClip, startTime: 0, duration: 10 }) // ends at 10
    addClip({ ...mockClip, startTime: 15, duration: 5 }) // ends at 20
    addClip({ ...mockClip, startTime: 10, duration: 3 }) // ends at 13

    const state = useTimelineStore.getState()
    expect(state.totalDuration).toBe(20) // Maximum end time
  })

  it('removes a clip from timeline', () => {
    const { addClip, removeClip } = useTimelineStore.getState()

    addClip(mockClip)
    const clipId = useTimelineStore.getState().tracks[0].clips[0].id
    removeClip(clipId)

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips).toHaveLength(0)
    expect(state.totalDuration).toBe(0)
  })

  it('updates totalDuration when clip is removed', () => {
    const { addClip, removeClip } = useTimelineStore.getState()

    addClip({ ...mockClip, startTime: 0, duration: 10 })
    addClip({ ...mockClip, startTime: 10, duration: 10 })

    const clipId = useTimelineStore.getState().tracks[0].clips[1].id
    removeClip(clipId)

    const state = useTimelineStore.getState()
    expect(state.totalDuration).toBe(10) // Only first clip remains
  })

  it('deselects clip when removed clip was selected', () => {
    const { addClip, removeClip, selectClip } = useTimelineStore.getState()

    addClip(mockClip)
    const clipId = useTimelineStore.getState().tracks[0].clips[0].id
    selectClip(clipId)

    expect(useTimelineStore.getState().selectedClipId).toBe(clipId)

    removeClip(clipId)

    expect(useTimelineStore.getState().selectedClipId).toBe(null)
  })

  it('updates clip properties and maintains sort order', () => {
    const { addClip, updateClip } = useTimelineStore.getState()

    addClip({ ...mockClip, startTime: 0 })
    addClip({ ...mockClip, startTime: 20 })

    const firstClipId = useTimelineStore.getState().tracks[0].clips[0].id

    // Move first clip to position 30
    updateClip(firstClipId, { startTime: 30 })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips[0].startTime).toBe(20) // Second clip now first
    expect(state.tracks[0].clips[1].startTime).toBe(30) // Updated clip now last
  })

  it('updates totalDuration when clip is modified', () => {
    const { addClip, updateClip } = useTimelineStore.getState()

    addClip({ ...mockClip, startTime: 0, duration: 10 })
    const clipId = useTimelineStore.getState().tracks[0].clips[0].id

    updateClip(clipId, { duration: 50 })

    const state = useTimelineStore.getState()
    expect(state.totalDuration).toBe(50) // 0 + 50
  })

  it('sets playhead position (AC: #7)', () => {
    const { setPlayhead } = useTimelineStore.getState()

    setPlayhead(15.5)

    const state = useTimelineStore.getState()
    expect(state.playheadPosition).toBe(15.5)
  })

  it('selects a clip by id', () => {
    const { selectClip } = useTimelineStore.getState()

    selectClip('clip-123')

    const state = useTimelineStore.getState()
    expect(state.selectedClipId).toBe('clip-123')
  })

  it('deselects clip when null is passed', () => {
    const { selectClip } = useTimelineStore.getState()

    selectClip('clip-123')
    expect(useTimelineStore.getState().selectedClipId).toBe('clip-123')

    selectClip(null)
    expect(useTimelineStore.getState().selectedClipId).toBe(null)
  })

  it('handles empty timeline when calculating totalDuration', () => {
    const state = useTimelineStore.getState()
    expect(state.totalDuration).toBe(0)
  })

  it('maintains track structure when adding clips', () => {
    const { addClip } = useTimelineStore.getState()

    addClip(mockClip)

    const state = useTimelineStore.getState()
    expect(state.tracks[0].id).toBe(1)
    expect(state.tracks[0].clips[0].trackId).toBe(1)
  })
})
