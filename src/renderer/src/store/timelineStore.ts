/**
 * Timeline Store
 * Zustand store for managing timeline clips, tracks, and playhead state
 */

import { create } from 'zustand'
import type { Clip, TimelineState } from '@/components/Timeline/timeline.types'

/**
 * Base pixels per second for zoom calculations
 * 50px/sec at 1.0x zoom provides good balance between visibility and timeline length
 */
const BASE_PIXELS_PER_SECOND = 50

/**
 * Default zoom level multiplier (range: 0.1 to 5.0)
 * Starting at 10% zoom to show full timeline view
 */
const DEFAULT_ZOOM_MULTIPLIER = 0.1

/**
 * Zoom bounds
 */
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5.0
const ZOOM_STEP = 1.2 // Premiere Pro standard

/**
 * LocalStorage key for persisting zoom level (Story 4.2: Task 9, AC #5)
 */
const ZOOM_STORAGE_KEY = 'chop-shop-timeline-zoom'

/**
 * Load saved zoom level from localStorage
 * Returns default if not found or invalid
 */
function loadSavedZoom(): number {
  try {
    const saved = localStorage.getItem(ZOOM_STORAGE_KEY)
    if (saved) {
      const parsed = parseFloat(saved)
      if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('[TimelineStore] Failed to load saved zoom:', error)
  }
  return DEFAULT_ZOOM_MULTIPLIER
}

/**
 * Save zoom level to localStorage
 */
function saveZoom(zoomLevel: number): void {
  try {
    localStorage.setItem(ZOOM_STORAGE_KEY, zoomLevel.toString())
  } catch (error) {
    console.warn('[TimelineStore] Failed to save zoom:', error)
  }
}

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
 * - Two tracks: Track 1 (main) and Track 2 (overlay)
 * - Each track height is 80px
 * - Playhead at 0:00
 * - Default zoom of 50 pixels per second
 */
export const useTimelineStore = create<TimelineState>((set, get) => {
  // Load saved zoom level from localStorage (Story 4.2: Task 9, AC #5)
  const initialZoom = loadSavedZoom()

  return {
    // State
    tracks: [
      {
        id: 1,
        clips: [],
        height: 80
      },
      {
        id: 2,
        clips: [],
        height: 80
      }
    ],
    playheadPosition: 0,
    totalDuration: 0,
    zoomLevel: initialZoom,
    pixelsPerSecond: BASE_PIXELS_PER_SECOND * initialZoom,
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
   * Add a clip to a specific track
   * Generates UUID and adds clip to the specified track by trackId
   */
  addClipToTrack: (clipData, trackId) =>
    set((state) => {
      const newClip: Clip = {
        id: crypto.randomUUID(),
        ...clipData,
        trackId
      }

      const updatedTracks = state.tracks.map((track) => {
        if (track.id === trackId) {
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
   * Get all clips for a specific track
   * Returns clips array for the specified track, or empty array if track not found
   */
  getClipsForTrack: (trackId) => {
    const state = get()
    const track = state.tracks.find((t) => t.id === trackId)
    return track ? track.clips : []
  },

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
   * Move clip to a specific timeline position (Premiere Pro style)
   * Allows gaps between clips, with collision detection and magnetic snap
   *
   * @param clipId - ID of clip to move
   * @param targetPosition - Timeline position in seconds to move clip to
   */
  moveClipToPosition: (clipId, targetPosition) =>
    set((state) => {
      const trackId = 1 // MVP: Single track only
      const updatedTracks = state.tracks.map((track) => {
        if (track.id !== trackId) return track

        const clipToMove = track.clips.find((c) => c.id === clipId)
        if (!clipToMove) return track

        const otherClips = track.clips.filter((c) => c.id !== clipId)
        const moveDuration = getEffectiveDuration(clipToMove)

        // Collision detection: check if target position overlaps any existing clip
        let finalPosition = Math.max(0, targetPosition) // Don't allow negative positions

        const SNAP_THRESHOLD = 0.5 // 0.5 seconds magnetic snap (like Premiere Pro)

        // Check for collisions and find snap points
        for (const otherClip of otherClips) {
          const otherStart = otherClip.startTime
          const otherEnd = otherClip.startTime + getEffectiveDuration(otherClip)

          // Check if our target position would overlap this clip
          const wouldOverlap =
            (finalPosition >= otherStart && finalPosition < otherEnd) ||
            (finalPosition + moveDuration > otherStart && finalPosition < otherStart)

          if (wouldOverlap) {
            // Snap to nearest edge (before or after the other clip)
            const distanceToBefore = Math.abs(finalPosition - (otherEnd))
            const distanceToAfter = Math.abs(finalPosition - otherStart + moveDuration)

            if (distanceToBefore < distanceToAfter) {
              finalPosition = otherEnd // Snap to end of other clip
            } else {
              finalPosition = otherStart - moveDuration // Snap before other clip
            }
          }

          // Magnetic snap to edges (within threshold)
          if (Math.abs(finalPosition - otherEnd) < SNAP_THRESHOLD) {
            finalPosition = otherEnd // Snap to end of other clip
          } else if (Math.abs(finalPosition + moveDuration - otherStart) < SNAP_THRESHOLD) {
            finalPosition = otherStart - moveDuration // Snap end to start of other clip
          }
        }

        // Magnetic snap to timeline start
        if (finalPosition < SNAP_THRESHOLD && finalPosition > 0) {
          finalPosition = 0
        }

        // Update clip position
        const updatedClips = track.clips
          .map((clip) =>
            clip.id === clipId ? { ...clip, startTime: finalPosition } : clip
          )
          .sort((a, b) => a.startTime - b.startTime)

        return {
          ...track,
          clips: updatedClips
        }
      })

      // Recalculate total duration
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
    }),

    /**
     * Set zoom level with bounds checking (0.1 to 5.0)
     * Automatically updates pixelsPerSecond based on new zoom level
     * Persists to localStorage (Story 4.2: Task 9, AC #5)
     *
     * @param level - Zoom multiplier (0.1 = 10%, 1.0 = 100%, 5.0 = 500%)
     */
    setZoomLevel: (level) =>
      set(() => {
        // Clamp zoom level to valid range
        const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level))
        const newPixelsPerSecond = BASE_PIXELS_PER_SECOND * clampedLevel

        // Persist to localStorage
        saveZoom(clampedLevel)

        return {
          zoomLevel: clampedLevel,
          pixelsPerSecond: newPixelsPerSecond
        }
      }),

    /**
     * Zoom in by 1.2x (Premiere Pro standard)
     * Maximum zoom level is 5.0
     * Persists to localStorage (Story 4.2: Task 9, AC #5)
     */
    zoomIn: () =>
      set((state) => {
        const newZoomLevel = Math.min(MAX_ZOOM, state.zoomLevel * ZOOM_STEP)
        const newPixelsPerSecond = BASE_PIXELS_PER_SECOND * newZoomLevel

        // Persist to localStorage
        saveZoom(newZoomLevel)

        return {
          zoomLevel: newZoomLevel,
          pixelsPerSecond: newPixelsPerSecond
        }
      }),

    /**
     * Zoom out by 1.2x (Premiere Pro standard)
     * Minimum zoom level is 0.1
     * Persists to localStorage (Story 4.2: Task 9, AC #5)
     */
    zoomOut: () =>
      set((state) => {
        const newZoomLevel = Math.max(MIN_ZOOM, state.zoomLevel / ZOOM_STEP)
        const newPixelsPerSecond = BASE_PIXELS_PER_SECOND * newZoomLevel

        // Persist to localStorage
        saveZoom(newZoomLevel)

        return {
          zoomLevel: newZoomLevel,
          pixelsPerSecond: newPixelsPerSecond
        }
      }),

    /**
     * Calculate zoom level to fit all clips in viewport
     * Assumes viewport width is available from window
     * Falls back to 1.0 if no clips exist
     * Persists to localStorage (Story 4.2: Task 9, AC #5)
     */
    fitToTimeline: () =>
      set((state) => {
        // Get total timeline duration
        const { totalDuration } = state

        // If no clips, reset to default zoom
        if (totalDuration === 0) {
          const defaultZoom = DEFAULT_ZOOM_MULTIPLIER
          saveZoom(defaultZoom)
          return {
            zoomLevel: defaultZoom,
            pixelsPerSecond: BASE_PIXELS_PER_SECOND * defaultZoom
          }
        }

        // Calculate viewport width (timeline container minus padding)
        // Assume timeline takes 80% of window width (heuristic)
        const viewportWidth = window.innerWidth * 0.8

        // Calculate required pixels per second to fit entire timeline
        const requiredPixelsPerSecond = viewportWidth / totalDuration

        // Convert to zoom level and clamp to valid range
        const calculatedZoomLevel = requiredPixelsPerSecond / BASE_PIXELS_PER_SECOND
        const clampedZoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoomLevel))
        const newPixelsPerSecond = BASE_PIXELS_PER_SECOND * clampedZoomLevel

        // Persist to localStorage
        saveZoom(clampedZoomLevel)

        return {
          zoomLevel: clampedZoomLevel,
          pixelsPerSecond: newPixelsPerSecond
        }
      })
  }
})
