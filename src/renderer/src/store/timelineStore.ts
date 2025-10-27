/**
 * Timeline Store
 * Zustand store for managing timeline clips, tracks, and playhead state
 */

import { create } from 'zustand'
import type { Clip, Track, TimelineState } from '@/components/Timeline/timeline.types'

/**
 * Default zoom level in pixels per second
 * 50px/sec provides good balance between visibility and timeline length
 */
const DEFAULT_ZOOM_LEVEL = 50

/**
 * Timeline state store
 * Manages clips on tracks, playhead position, zoom level, and selection state
 *
 * Initializes with:
 * - Single track (Track 1) for MVP
 * - Playhead at 0:00
 * - Default zoom of 50 pixels per second
 */
export const useTimelineStore = create<TimelineState>((set, get) => ({
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

      // Recalculate total duration
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + clip.duration
        return endTime > max ? endTime : max
      }, 0)

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime
      }
    }),

  /**
   * Remove a clip from the timeline by ID
   */
  removeClip: (clipId) =>
    set((state) => {
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== clipId)
      }))

      // Recalculate total duration
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + clip.duration
        return endTime > max ? endTime : max
      }, 0)

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime,
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

      // Recalculate total duration
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + clip.duration
        return endTime > max ? endTime : max
      }, 0)

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime
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
    })
}))
