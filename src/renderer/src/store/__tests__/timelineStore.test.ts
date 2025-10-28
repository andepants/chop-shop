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
    trimIn: 0, // Trim offset from start (default: 0)
    trimOut: 0, // Trim offset from end (default: 0)
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

  // Trim functionality tests (Story 3.1)
  it('initializes clips with trimIn and trimOut set to 0', () => {
    const { addClip } = useTimelineStore.getState()

    addClip(mockClip)

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips[0].trimIn).toBe(0)
    expect(state.tracks[0].clips[0].trimOut).toBe(0)
  })

  it('updates clip trim values using updateClip action', () => {
    const { addClip, updateClip } = useTimelineStore.getState()

    addClip(mockClip)
    const clipId = useTimelineStore.getState().tracks[0].clips[0].id

    updateClip(clipId, { trimIn: 2, trimOut: 3 })

    const state = useTimelineStore.getState()
    expect(state.tracks[0].clips[0].trimIn).toBe(2)
    expect(state.tracks[0].clips[0].trimOut).toBe(3)
  })

  it('maintains state immutability when updating trim values', () => {
    const { addClip, updateClip } = useTimelineStore.getState()

    addClip(mockClip)
    const clipId = useTimelineStore.getState().tracks[0].clips[0].id
    const originalState = useTimelineStore.getState()
    const originalClip = originalState.tracks[0].clips[0]

    updateClip(clipId, { trimIn: 1.5 })

    const newState = useTimelineStore.getState()
    const updatedClip = newState.tracks[0].clips[0]

    // Original clip should not be mutated
    expect(originalClip).not.toBe(updatedClip)
    expect(originalClip.trimIn).toBe(0)
    expect(updatedClip.trimIn).toBe(1.5)
  })

  it('calculates effective duration with trim values', () => {
    const { addClip, updateClip } = useTimelineStore.getState()

    addClip({ ...mockClip, duration: 100 })
    const clipId = useTimelineStore.getState().tracks[0].clips[0].id

    updateClip(clipId, { trimIn: 10, trimOut: 15 })

    const clip = useTimelineStore.getState().tracks[0].clips[0]
    const effectiveDuration = clip.duration - clip.trimIn - clip.trimOut

    expect(effectiveDuration).toBe(75) // 100 - 10 - 15 = 75
  })

  // Split functionality tests (Story 3.2)
  describe('splitClip', () => {
    it('creates two clips at split position (AC #3, #4)', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      // Add a 10-second clip starting at 0
      addClip({ ...mockClip, startTime: 0, duration: 10, trimIn: 0, trimOut: 0 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Split at 5 seconds
      splitClip(clipId, 5)

      const state = useTimelineStore.getState()
      const clips = state.tracks[0].clips

      // Should have 2 clips now
      expect(clips).toHaveLength(2)

      // Clip A: 0-5s
      expect(clips[0].startTime).toBe(0)
      const clipAEffectiveDuration = clips[0].duration - clips[0].trimIn - clips[0].trimOut
      expect(clipAEffectiveDuration).toBe(5)

      // Clip B: 5-10s
      expect(clips[1].startTime).toBe(5)
      const clipBEffectiveDuration = clips[1].duration - clips[1].trimIn - clips[1].trimOut
      expect(clipBEffectiveDuration).toBe(5)
    })

    it('generates unique UUIDs for both new clips (AC #3)', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })
      const originalClipId = useTimelineStore.getState().tracks[0].clips[0].id

      splitClip(originalClipId, 5)

      const clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(2)

      // Both clips should have unique IDs
      expect(clips[0].id).toBeDefined()
      expect(clips[1].id).toBeDefined()
      expect(clips[0].id).not.toBe(clips[1].id)
      expect(clips[0].id).not.toBe(originalClipId)
      expect(clips[1].id).not.toBe(originalClipId)
    })

    it('preserves trim values correctly when splitting trimmed clip (Edge Case)', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      // Add clip with trimIn=2, trimOut=1, duration=10
      // Effective playback: 2-9 seconds of source (7 seconds total)
      addClip({ ...mockClip, startTime: 0, duration: 10, trimIn: 2, trimOut: 1 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Split at position 3.5 (which is 3.5s into the effective timeline)
      splitClip(clipId, 3.5)

      const clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(2)

      // Clip A: 0-3.5s on timeline
      const clipA = clips[0]
      expect(clipA.startTime).toBe(0)
      expect(clipA.duration).toBe(10) // Original duration preserved
      expect(clipA.trimIn).toBe(2) // Original trimIn preserved
      const clipAEffective = clipA.duration - clipA.trimIn - clipA.trimOut
      expect(clipAEffective).toBe(3.5)

      // Clip B: 3.5-7s on timeline
      const clipB = clips[1]
      expect(clipB.startTime).toBe(3.5)
      expect(clipB.duration).toBe(10) // Original duration preserved
      expect(clipB.trimOut).toBe(1) // Original trimOut preserved
      const clipBEffective = clipB.duration - clipB.trimIn - clipB.trimOut
      expect(clipBEffective).toBe(3.5)
    })

    it('rejects split at clip start boundary (Edge Case)', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 5, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Attempt split at clip start (5s)
      splitClip(clipId, 5)

      // Should not split - clip count remains 1
      const clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(1)
    })

    it('rejects split at clip end boundary (Edge Case)', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 5, duration: 10, trimIn: 0, trimOut: 0 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Attempt split at clip end (15s)
      splitClip(clipId, 15)

      // Should not split - clip count remains 1
      const clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(1)
    })

    it('rejects split outside clip bounds', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 5, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Attempt split before clip start
      splitClip(clipId, 2)

      // Should not split
      expect(useTimelineStore.getState().tracks[0].clips).toHaveLength(1)

      // Attempt split after clip end
      splitClip(clipId, 20)

      // Should not split
      expect(useTimelineStore.getState().tracks[0].clips).toHaveLength(1)
    })

    it('deselects clip after split (AC #2)', () => {
      const { addClip, splitClip, selectClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Select the clip
      selectClip(clipId)
      expect(useTimelineStore.getState().selectedClipId).toBe(clipId)

      // Split the clip
      splitClip(clipId, 5)

      // Should deselect after split
      expect(useTimelineStore.getState().selectedClipId).toBe(null)
    })

    it('maintains state immutability during split', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      const originalState = useTimelineStore.getState()
      const originalClips = originalState.tracks[0].clips

      splitClip(clipId, 5)

      const newState = useTimelineStore.getState()
      const newClips = newState.tracks[0].clips

      // Arrays should be different instances (immutability)
      expect(newClips).not.toBe(originalClips)
      expect(originalClips).toHaveLength(1)
      expect(newClips).toHaveLength(2)
    })

    it('updates totalDuration after split', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      expect(useTimelineStore.getState().totalDuration).toBe(10)

      splitClip(clipId, 5)

      // Total duration should remain the same (split doesn't change overall length)
      expect(useTimelineStore.getState().totalDuration).toBe(10)
    })

    it('sorts clips correctly after split', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      // Add two clips
      addClip({ ...mockClip, startTime: 0, duration: 10 })
      addClip({ ...mockClip, startTime: 20, duration: 10 })

      const firstClipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Split first clip
      splitClip(firstClipId, 5)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Should have 3 clips in sorted order
      expect(clips).toHaveLength(3)
      expect(clips[0].startTime).toBe(0) // First part of split
      expect(clips[1].startTime).toBe(5) // Second part of split
      expect(clips[2].startTime).toBe(20) // Original second clip
    })

    it('completes split operation synchronously (AC #6 - Performance NFR001)', () => {
      const { addClip, splitClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      const startTime = performance.now()
      splitClip(clipId, 5)
      const endTime = performance.now()

      const duration = endTime - startTime

      // Should complete in under 16ms (60fps requirement)
      expect(duration).toBeLessThan(16)

      // Verify split completed successfully
      expect(useTimelineStore.getState().tracks[0].clips).toHaveLength(2)
    })
  })
})
