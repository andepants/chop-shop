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

  // Delete functionality tests (Story 3.3)
  describe('removeClip - Story 3.3', () => {
    it('removes clip and closes gap by shifting remaining clips left (AC #3)', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      // Add 3 clips: [0-5s, 5-10s, 10-15s]
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      const clips = useTimelineStore.getState().tracks[0].clips
      const middleClipId = clips[1].id

      // Delete middle clip (5-10s)
      removeClip(middleClipId)

      const state = useTimelineStore.getState()
      const remainingClips = state.tracks[0].clips

      // Should have 2 clips
      expect(remainingClips).toHaveLength(2)

      // First clip unchanged
      expect(remainingClips[0].startTime).toBe(0)

      // Third clip shifted left to close gap (was 10, now 5)
      expect(remainingClips[1].startTime).toBe(5)

      // Total duration updated (was 15, now 10)
      expect(state.totalDuration).toBe(10)
    })

    it('updates playhead when positioned on deleted clip (AC #4)', () => {
      const { addClip, removeClip, setPlayhead } = useTimelineStore.getState()

      // Add clip at 5-15s
      addClip({ ...mockClip, startTime: 5, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Position playhead within clip at 8s
      setPlayhead(8)

      // Delete clip
      removeClip(clipId)

      const state = useTimelineStore.getState()

      // Playhead should move to clip's start position (5s)
      expect(state.playheadPosition).toBe(5)
    })

    it('updates playhead when positioned after deleted clip (AC #4)', () => {
      const { addClip, removeClip, setPlayhead } = useTimelineStore.getState()

      // Add clips: [0-5s, 5-10s]
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })

      const firstClipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Position playhead after both clips at 12s
      setPlayhead(12)

      // Delete first clip (5s duration)
      removeClip(firstClipId)

      const state = useTimelineStore.getState()

      // Playhead should shift left by deleted duration (12 - 5 = 7)
      expect(state.playheadPosition).toBe(7)
    })

    it('maintains playhead when positioned before deleted clip (AC #4)', () => {
      const { addClip, removeClip, setPlayhead } = useTimelineStore.getState()

      // Add clip at 10-20s
      addClip({ ...mockClip, startTime: 10, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Position playhead before clip at 3s
      setPlayhead(3)

      // Delete clip
      removeClip(clipId)

      const state = useTimelineStore.getState()

      // Playhead should remain unchanged
      expect(state.playheadPosition).toBe(3)
    })

    it('clears selectedClipId when deleted clip was selected (AC #2, AC #6)', () => {
      const { addClip, removeClip, selectClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      selectClip(clipId)
      expect(useTimelineStore.getState().selectedClipId).toBe(clipId)

      removeClip(clipId)

      expect(useTimelineStore.getState().selectedClipId).toBe(null)
    })

    it('supports multiple sequential deletions (AC #6)', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      // Add 4 clips
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })
      addClip({ ...mockClip, startTime: 15, duration: 5 })

      let clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(4)

      // Delete second clip
      removeClip(clips[1].id)
      clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(3)
      expect(clips[1].startTime).toBe(5) // Third clip shifted left

      // Delete first clip
      removeClip(clips[0].id)
      clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(2)
      expect(clips[0].startTime).toBe(0) // Second clip now at start
    })

    it('deletes first clip and shifts remaining clips to start at 0 (Edge Case)', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      // Add 3 clips: [0-5s, 5-10s, 10-15s]
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      const firstClipId = useTimelineStore.getState().tracks[0].clips[0].id

      removeClip(firstClipId)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Remaining clips shifted to start
      expect(clips).toHaveLength(2)
      expect(clips[0].startTime).toBe(0) // Was 5, now 0
      expect(clips[1].startTime).toBe(5) // Was 10, now 5
    })

    it('deletes last clip without affecting others (Edge Case)', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      // Add 3 clips: [0-5s, 5-10s, 10-15s]
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      const clips = useTimelineStore.getState().tracks[0].clips
      const lastClipId = clips[2].id

      removeClip(lastClipId)

      const state = useTimelineStore.getState()
      const remainingClips = state.tracks[0].clips

      // First two clips unchanged
      expect(remainingClips).toHaveLength(2)
      expect(remainingClips[0].startTime).toBe(0)
      expect(remainingClips[1].startTime).toBe(5)
      expect(state.totalDuration).toBe(10)
    })

    it('handles delete when timeline becomes empty (Edge Case)', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      removeClip(clipId)

      const state = useTimelineStore.getState()

      expect(state.tracks[0].clips).toHaveLength(0)
      expect(state.totalDuration).toBe(0)
    })

    it('handles playhead at exact clip start boundary (Edge Case)', () => {
      const { addClip, removeClip, setPlayhead } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 5, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Playhead at exact clip start
      setPlayhead(5)

      removeClip(clipId)

      const state = useTimelineStore.getState()

      // Playhead should move to clip start (already there)
      expect(state.playheadPosition).toBe(5)
    })

    it('handles playhead at exact clip end boundary (Edge Case)', () => {
      const { addClip, removeClip, setPlayhead } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 5, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Playhead at exact clip end (15s)
      setPlayhead(15)

      removeClip(clipId)

      const state = useTimelineStore.getState()

      // Playhead should shift left by deleted duration (15 - 10 = 5)
      expect(state.playheadPosition).toBe(5)
    })

    it('correctly handles trimmed clips when calculating gap closure (AC #3)', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      // Add clips with trim values
      // Clip 1: duration 10, trimIn 2, trimOut 1 → effective duration 7
      addClip({ ...mockClip, startTime: 0, duration: 10, trimIn: 2, trimOut: 1 })
      // Clip 2: duration 8, trimIn 1, trimOut 1 → effective duration 6
      addClip({ ...mockClip, startTime: 7, duration: 8, trimIn: 1, trimOut: 1 })
      // Clip 3: duration 10, no trim → effective duration 10
      addClip({ ...mockClip, startTime: 13, duration: 10, trimIn: 0, trimOut: 0 })

      const clips = useTimelineStore.getState().tracks[0].clips
      const secondClipId = clips[1].id

      // Delete second clip (effective duration 6)
      removeClip(secondClipId)

      const remainingClips = useTimelineStore.getState().tracks[0].clips

      expect(remainingClips).toHaveLength(2)
      expect(remainingClips[0].startTime).toBe(0)
      // Third clip should shift left by 6 seconds (13 - 6 = 7)
      expect(remainingClips[1].startTime).toBe(7)
    })

    it('does not affect media library when clip deleted from timeline (AC #5)', () => {
      // This test verifies that removeClip only operates on timelineStore
      // Media library is separate in mediaStore and should be unaffected
      const { addClip, removeClip } = useTimelineStore.getState()

      addClip({ ...mockClip, sourceFile: '/test/video.mp4', startTime: 0, duration: 10 })
      const clipId = useTimelineStore.getState().tracks[0].clips[0].id

      // Remove from timeline
      removeClip(clipId)

      // Timeline should be empty
      expect(useTimelineStore.getState().tracks[0].clips).toHaveLength(0)

      // Note: mediaStore is independent and tested separately
      // This test documents the architectural separation (AC #5)
    })

    it('returns unchanged state when trying to remove non-existent clip', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })

      const stateBefore = useTimelineStore.getState()

      // Try to remove clip that doesn't exist
      removeClip('non-existent-id')

      const stateAfter = useTimelineStore.getState()

      // State should remain unchanged
      expect(stateAfter.tracks[0].clips).toHaveLength(1)
      expect(stateAfter.tracks[0].clips[0]).toBe(stateBefore.tracks[0].clips[0])
    })

    it('maintains state immutability during delete operation', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })

      const originalState = useTimelineStore.getState()
      const originalClips = originalState.tracks[0].clips
      const clipIdToDelete = originalClips[0].id

      removeClip(clipIdToDelete)

      const newState = useTimelineStore.getState()
      const newClips = newState.tracks[0].clips

      // Arrays should be different instances (immutability)
      expect(newClips).not.toBe(originalClips)
      expect(originalClips).toHaveLength(2)
      expect(newClips).toHaveLength(1)
    })

    it('completes delete operation synchronously (NFR001 - Performance)', () => {
      const { addClip, removeClip } = useTimelineStore.getState()

      // Add multiple clips to test performance with realistic data
      for (let i = 0; i < 10; i++) {
        addClip({ ...mockClip, startTime: i * 5, duration: 5 })
      }

      const clips = useTimelineStore.getState().tracks[0].clips
      const middleClipId = clips[5].id

      const startTime = performance.now()
      removeClip(middleClipId)
      const endTime = performance.now()

      const duration = endTime - startTime

      // Should complete in under 16ms (60fps requirement)
      expect(duration).toBeLessThan(16)

      // Verify delete completed successfully
      expect(useTimelineStore.getState().tracks[0].clips).toHaveLength(9)
    })
  })

  // Drag-to-reorder functionality tests (Story 3.4)
  describe('reorderClips - Story 3.4', () => {
    it('reorders clips and recalculates startTime (AC #3, #4)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Setup 3 clips: A (0-5s), B (5-10s), C (10-15s)
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      // Move clip C (index 2) to beginning (index 0)
      reorderClips(2, 0)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify order: C, A, B
      expect(clips).toHaveLength(3)
      expect(clips[0].startTime).toBe(0) // C now starts at 0
      expect(clips[1].startTime).toBe(5) // A starts after C (0 + 5)
      expect(clips[2].startTime).toBe(10) // B starts after A (5 + 5)

      // Verify total duration unchanged
      expect(useTimelineStore.getState().totalDuration).toBe(15)
    })

    it('handles no-op when source equals destination', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })

      const stateBefore = useTimelineStore.getState()
      const clipsBefore = stateBefore.tracks[0].clips

      // Reorder with sourceIndex === destIndex
      reorderClips(1, 1)

      const stateAfter = useTimelineStore.getState()
      const clipsAfter = stateAfter.tracks[0].clips

      // State should remain unchanged
      expect(clipsAfter).toBe(clipsBefore)
      expect(clipsAfter).toHaveLength(2)
      expect(clipsAfter[0].startTime).toBe(0)
      expect(clipsAfter[1].startTime).toBe(5)
    })

    it('handles two-clip swap', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Clips: A (0-10s), B (10-15s)
      addClip({ ...mockClip, startTime: 0, duration: 10 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      // Swap: move A to end
      reorderClips(0, 1)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify order: B, A
      expect(clips).toHaveLength(2)
      expect(clips[0].startTime).toBe(0) // B now starts at 0
      expect(clips[1].startTime).toBe(5) // A starts after B (0 + 5)
    })

    it('moves first clip to end of timeline', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Clips: A (0-5s), B (5-10s), C (10-15s)
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      // Move A to end
      reorderClips(0, 3)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify order: B, C, A
      expect(clips).toHaveLength(3)
      expect(clips[0].startTime).toBe(0) // B at 0
      expect(clips[1].startTime).toBe(5) // C at 5
      expect(clips[2].startTime).toBe(10) // A at 10
    })

    it('moves last clip to beginning of timeline', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Clips: A (0-5s), B (5-10s), C (10-15s)
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      // Move C to beginning
      reorderClips(2, 0)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify order: C, A, B
      expect(clips).toHaveLength(3)
      expect(clips[0].startTime).toBe(0) // C at 0
      expect(clips[1].startTime).toBe(5) // A at 5
      expect(clips[2].startTime).toBe(10) // B at 10
    })

    it('reorders middle clip forward (AC #3)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Clips: A, B, C, D
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 3 })
      addClip({ ...mockClip, startTime: 8, duration: 7 })
      addClip({ ...mockClip, startTime: 15, duration: 2 })

      // Move B (index 1) after C (to index 3)
      reorderClips(1, 3)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify order: A, C, D, B
      expect(clips).toHaveLength(4)
      expect(clips[0].startTime).toBe(0) // A: 0-5
      expect(clips[1].startTime).toBe(5) // C: 5-12
      expect(clips[2].startTime).toBe(12) // D: 12-14
      expect(clips[3].startTime).toBe(14) // B: 14-17
    })

    it('reorders middle clip backward (AC #3)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Clips: A, B, C, D
      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 3 })
      addClip({ ...mockClip, startTime: 8, duration: 7 })
      addClip({ ...mockClip, startTime: 15, duration: 2 })

      // Move C (index 2) before B (to index 1)
      reorderClips(2, 1)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify order: A, C, B, D
      expect(clips).toHaveLength(4)
      expect(clips[0].startTime).toBe(0) // A: 0-5
      expect(clips[1].startTime).toBe(5) // C: 5-12
      expect(clips[2].startTime).toBe(12) // B: 12-15
      expect(clips[3].startTime).toBe(15) // D: 15-17
    })

    it('correctly handles trimmed clips when reordering (AC #4)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Clip A: duration 10, trimIn 2, trimOut 1 → effective 7s
      addClip({ ...mockClip, startTime: 0, duration: 10, trimIn: 2, trimOut: 1 })
      // Clip B: duration 8, trimIn 1, trimOut 1 → effective 6s
      addClip({ ...mockClip, startTime: 7, duration: 8, trimIn: 1, trimOut: 1 })
      // Clip C: duration 5, no trim → effective 5s
      addClip({ ...mockClip, startTime: 13, duration: 5, trimIn: 0, trimOut: 0 })

      // Move C to beginning
      reorderClips(2, 0)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify order: C, A, B with correct startTime based on effective durations
      expect(clips).toHaveLength(3)
      expect(clips[0].startTime).toBe(0) // C: 0-5 (effective 5s)
      expect(clips[1].startTime).toBe(5) // A: 5-12 (effective 7s)
      expect(clips[2].startTime).toBe(12) // B: 12-18 (effective 6s)

      // Verify total duration
      expect(useTimelineStore.getState().totalDuration).toBe(18)
    })

    it('maintains state immutability during reorder', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 5 })
      addClip({ ...mockClip, startTime: 10, duration: 5 })

      const originalState = useTimelineStore.getState()
      const originalClips = originalState.tracks[0].clips
      const originalFirstClip = originalClips[0]

      reorderClips(2, 0)

      const newState = useTimelineStore.getState()
      const newClips = newState.tracks[0].clips

      // Arrays should be different instances (immutability)
      expect(newClips).not.toBe(originalClips)

      // Clips should be new objects with updated startTime
      expect(newClips[1]).not.toBe(originalFirstClip)
      expect(originalFirstClip.startTime).toBe(0) // Original unchanged
      expect(newClips[1].startTime).toBe(5) // New clip has updated startTime
    })

    it('preserves all clip properties during reorder (AC #3)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, sourceFile: '/video1.mp4', startTime: 0, duration: 10, trimIn: 1, trimOut: 2 })
      addClip({ ...mockClip, sourceFile: '/video2.mp4', startTime: 7, duration: 5, trimIn: 0, trimOut: 0 })

      const originalClipAId = useTimelineStore.getState().tracks[0].clips[0].id
      const originalClipBId = useTimelineStore.getState().tracks[0].clips[1].id

      // Reorder
      reorderClips(1, 0)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify all properties preserved (except startTime)
      expect(clips[0].id).toBe(originalClipBId)
      expect(clips[0].sourceFile).toBe('/video2.mp4')
      expect(clips[0].duration).toBe(5)

      expect(clips[1].id).toBe(originalClipAId)
      expect(clips[1].sourceFile).toBe('/video1.mp4')
      expect(clips[1].duration).toBe(10)
      expect(clips[1].trimIn).toBe(1)
      expect(clips[1].trimOut).toBe(2)
    })

    it('updates totalDuration correctly after reorder (AC #4)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 10 })

      expect(useTimelineStore.getState().totalDuration).toBe(15)

      // Reorder shouldn't change total duration
      reorderClips(0, 1)

      expect(useTimelineStore.getState().totalDuration).toBe(15)
    })

    it('handles reorder with only 2 clips', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 8 })
      addClip({ ...mockClip, startTime: 8, duration: 4 })

      reorderClips(0, 1)

      const clips = useTimelineStore.getState().tracks[0].clips

      expect(clips).toHaveLength(2)
      expect(clips[0].startTime).toBe(0) // Second clip now first
      expect(clips[1].startTime).toBe(4) // First clip now second (starts after 4s)
    })

    it('handles reorder with single clip (no-op)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 10 })

      const stateBefore = useTimelineStore.getState()
      reorderClips(0, 0)
      const stateAfter = useTimelineStore.getState()

      expect(stateAfter.tracks[0].clips).toBe(stateBefore.tracks[0].clips)
    })

    it('completes reorder operation synchronously (NFR001 - Performance)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      // Add multiple clips to test performance
      for (let i = 0; i < 10; i++) {
        addClip({ ...mockClip, startTime: i * 5, duration: 5 })
      }

      const startTime = performance.now()
      reorderClips(0, 9) // Move first to last
      const endTime = performance.now()

      const duration = endTime - startTime

      // Should complete in under 33ms (30fps requirement per NFR001)
      expect(duration).toBeLessThan(33)

      // Verify reorder completed successfully
      const clips = useTimelineStore.getState().tracks[0].clips
      expect(clips).toHaveLength(10)
      expect(clips[0].startTime).toBe(0) // Sequential positioning maintained
    })

    it('maintains clips sorted by startTime after reorder (AC #4)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 3 })
      addClip({ ...mockClip, startTime: 3, duration: 7 })
      addClip({ ...mockClip, startTime: 10, duration: 2 })

      reorderClips(1, 0)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify clips are sorted by startTime
      for (let i = 1; i < clips.length; i++) {
        expect(clips[i].startTime).toBeGreaterThanOrEqual(clips[i - 1].startTime)
      }
    })

    it('ensures no gaps between clips after reorder (AC #4)', () => {
      const { addClip, reorderClips } = useTimelineStore.getState()

      addClip({ ...mockClip, startTime: 0, duration: 5 })
      addClip({ ...mockClip, startTime: 5, duration: 3 })
      addClip({ ...mockClip, startTime: 8, duration: 4 })

      reorderClips(2, 0)

      const clips = useTimelineStore.getState().tracks[0].clips

      // Verify no gaps: each clip starts where previous ends
      expect(clips[0].startTime).toBe(0)
      expect(clips[1].startTime).toBe(4) // 0 + 4
      expect(clips[2].startTime).toBe(9) // 4 + 5
    })
  })
})
