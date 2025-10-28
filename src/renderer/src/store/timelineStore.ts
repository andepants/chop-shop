/**
 * Timeline Store
 * Zustand store for managing timeline clips, tracks, and playhead state
 */

import { create } from 'zustand'
import type { Clip, TimelineState } from '@/components/Timeline/timeline.types'

/**
 * Default zoom level in pixels per second
 * 50px/sec provides good balance between visibility and timeline length
 */
const DEFAULT_ZOOM_LEVEL = 50

/**
 * Calculate effective duration of a clip accounting for trim values
 * Effective duration = total duration - trim from start - trim from end
 */
function getEffectiveDuration(clip: Clip): number {
  return clip.duration - clip.trimIn - clip.trimOut
}

/**
 * Timeline state store
 * Manages clips on tracks, playhead position, zoom level, and selection state
 *
 * Initializes with:
 * - Single track (Track 1) for MVP
 * - Playhead at 0:00
 * - Default zoom of 50 pixels per second
 */
export const useTimelineStore = create<TimelineState>((set) => ({
  // State
  tracks: [
    {
      id: 1,
      clips: []
    }
  ],
  playheadPosition: 0,
  totalDuration: 0,
  zoomLevel: DEFAULT_ZOOM_LEVEL,
  selectedClipId: null,

  // Actions

  /**
   * Add a new clip to the timeline
   * Generates UUID and adds clip to specified track
   */
  addClip: (clipData) =>
    set((state) => {
      const newClip: Clip = {
        id: crypto.randomUUID(),
        ...clipData
      }

      const updatedTracks = state.tracks.map((track) => {
        if (track.id === newClip.trackId) {
          return {
            ...track,
            clips: [...track.clips, newClip].sort((a, b) => a.startTime - b.startTime)
          }
        }
        return track
      })

      // Recalculate total duration using effective duration (accounts for trimming)
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + getEffectiveDuration(clip)
        return endTime > max ? endTime : max
      }, 0)

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime
      }
    }),

  /**
   * Remove a clip from the timeline by ID
   * Automatically closes gaps by shifting remaining clips left
   * Updates playhead position if it was on the deleted clip
   */
  removeClip: (clipId) =>
    set((state) => {
      // Find the deleted clip across all tracks
      let deletedClip: Clip | undefined
      let deletedTrackId: number | undefined

      for (const track of state.tracks) {
        const clip = track.clips.find((c) => c.id === clipId)
        if (clip) {
          deletedClip = clip
          deletedTrackId = track.id
          break
        }
      }

      // If clip not found, return unchanged state
      if (!deletedClip) {
        console.warn(`Clip ${clipId} not found for removal`)
        return state
      }

      const deletedStart = deletedClip.startTime
      const deletedDuration = getEffectiveDuration(deletedClip)
      const deletedEnd = deletedStart + deletedDuration

      // Remove clip and close gap by shifting subsequent clips left
      const updatedTracks = state.tracks.map((track) => {
        if (track.id !== deletedTrackId) return track

        // Filter out the deleted clip
        const remainingClips = track.clips.filter((clip) => clip.id !== clipId)

        // Shift clips after deleted clip to close gap
        const shiftedClips = remainingClips.map((clip) => {
          if (clip.startTime > deletedStart) {
            return {
              ...clip,
              startTime: clip.startTime - deletedDuration
            }
          }
          return clip
        })

        return {
          ...track,
          clips: shiftedClips.sort((a, b) => a.startTime - b.startTime)
        }
      })

      // Recalculate total duration using effective duration (accounts for trimming)
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + getEffectiveDuration(clip)
        return endTime > max ? endTime : max
      }, 0)

      // Update playhead if it was within deleted clip bounds or after it
      let newPlayhead = state.playheadPosition
      if (state.playheadPosition >= deletedStart && state.playheadPosition < deletedEnd) {
        // Playhead was on deleted clip - move to clip's start position
        newPlayhead = deletedStart
      } else if (state.playheadPosition >= deletedEnd) {
        // Playhead was after deleted clip - shift left by deleted duration
        newPlayhead = state.playheadPosition - deletedDuration
      }

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime,
        playheadPosition: newPlayhead,
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
      }
    }),

  /**
   * Update properties of an existing clip
   */
  updateClip: (clipId, updates) =>
    set((state) => {
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips
          .map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip))
          .sort((a, b) => a.startTime - b.startTime)
      }))

      // Recalculate total duration using effective duration (accounts for trimming)
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + getEffectiveDuration(clip)
        return endTime > max ? endTime : max
      }, 0)

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime
      }
    }),

  /**
   * Split a clip at a specific time position (Tool Selection System)
   * Creates two clips from one: before splitTime and after splitTime
   * Non-destructive: uses trimIn/trimOut to define playback regions
   */
  splitClip: (clipId, splitTime) =>
    set((state) => {
      const updatedTracks = state.tracks.map((track) => {
        const clipIndex = track.clips.findIndex((c) => c.id === clipId)
        if (clipIndex === -1) return track

        const originalClip = track.clips[clipIndex]

        // Validate split time is within clip bounds
        const clipStart = originalClip.startTime
        const clipEnd = originalClip.startTime + getEffectiveDuration(originalClip)
        if (splitTime <= clipStart || splitTime >= clipEnd) {
          console.warn(`Split time ${splitTime}s is outside clip bounds (${clipStart}s-${clipEnd}s)`)
          return track
        }

        // Calculate offset from clip start (accounting for existing trimIn)
        const offsetFromStart = splitTime - clipStart

        // Create two new clips using trim offsets
        // Clip A: from original start to split point
        // Plays source from trimIn to (trimIn + offsetFromStart)
        const clipA: Clip = {
          ...originalClip,
          id: crypto.randomUUID(),
          trimOut: originalClip.duration - (originalClip.trimIn + offsetFromStart)
        }

        // Clip B: from split point to original end
        const clipB: Clip = {
          ...originalClip,
          id: crypto.randomUUID(),
          startTime: splitTime,
          trimIn: originalClip.trimIn + offsetFromStart
        }

        // Replace original clip with two new clips
        const newClips = [
          ...track.clips.slice(0, clipIndex),
          clipA,
          clipB,
          ...track.clips.slice(clipIndex + 1)
        ].sort((a, b) => a.startTime - b.startTime)

        return {
          ...track,
          clips: newClips
        }
      })

      // Recalculate total duration using effective duration (accounts for trimming)
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + getEffectiveDuration(clip)
        return endTime > max ? endTime : max
      }, 0)

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime,
        selectedClipId: null
      }
    }),

  /**
   * Set the playhead position in seconds
   */
  setPlayhead: (position) =>
    set({
      playheadPosition: position
    }),

  /**
   * Select a clip by ID (null to deselect)
   */
  selectClip: (clipId) =>
    set({
      selectedClipId: clipId
    }),

  /**
   * Reorder clips on a track by moving a clip from sourceIndex to destIndex
   * Recalculates startTime for all clips to maintain sequential positioning
   * Operates on Track 1 (MVP single track)
   *
   * @param sourceIndex - Index of clip to move
   * @param destIndex - Target index to insert clip
   */
  reorderClips: (sourceIndex, destIndex) =>
    set((state) => {
      // No-op if source and destination are the same
      if (sourceIndex === destIndex) return state

      const trackId = 1 // MVP: Single track only
      const updatedTracks = state.tracks.map((track) => {
        if (track.id !== trackId) return track

        // Immutable reorder using array operations
        const clips = [...track.clips]
        const [movedClip] = clips.splice(sourceIndex, 1)
        clips.splice(destIndex, 0, movedClip)

        // Recalculate startTime for all clips sequentially
        let currentTime = 0
        const reorderedClips = clips.map((clip) => {
          const effectiveDuration = getEffectiveDuration(clip)
          const updatedClip = { ...clip, startTime: currentTime }
          currentTime += effectiveDuration
          return updatedClip
        })

        return {
          ...track,
          clips: reorderedClips
        }
      })

      // Recalculate total duration using effective duration
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + getEffectiveDuration(clip)
        return endTime > max ? endTime : max
      }, 0)

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime
      }
    })
}))
