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
 * Default framerate for frame-accurate snapping
 * Used when source video framerate is unavailable
 */
const DEFAULT_FRAMERATE = 30

/**
 * Magnetic snap threshold in seconds
 * Matches Premiere Pro behavior
 */
const SNAP_THRESHOLD = 0.5

/**
 * LocalStorage key for persisting zoom level (Story 4.2: Task 9, AC #5)
 */
const ZOOM_STORAGE_KEY = 'chop-shop-timeline-zoom'

/**
 * LocalStorage key for persisting snap tolerance
 */
const SNAP_STORAGE_KEY = 'chop-shop-snap-tolerance'

/**
 * Snap tolerance bounds in seconds
 */
const MIN_SNAP_TOLERANCE = 0.1
const MAX_SNAP_TOLERANCE = 2.0

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
    // Silent fail - use default
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
    // Silent fail
  }
}

/**
 * Load saved snap tolerance from localStorage
 * Returns default if not found or invalid
 */
function loadSavedSnapTolerance(): number {
  try {
    const saved = localStorage.getItem(SNAP_STORAGE_KEY)
    if (saved) {
      const parsed = parseFloat(saved)
      if (!isNaN(parsed) && parsed >= MIN_SNAP_TOLERANCE && parsed <= MAX_SNAP_TOLERANCE) {
        return parsed
      }
    }
  } catch (error) {
    // Silent fail - use default
  }
  return SNAP_THRESHOLD
}

/**
 * Save snap tolerance to localStorage
 */
function saveSnapTolerance(snapTolerance: number): void {
  try {
    localStorage.setItem(SNAP_STORAGE_KEY, snapTolerance.toString())
  } catch (error) {
    // Silent fail
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
 * Snap a time position to the nearest frame boundary
 * Provides frame-accurate positioning for professional video editing
 *
 * @param position - Time position in seconds (can be decimal)
 * @param framerate - Video framerate (fps), defaults to 30fps
 * @returns Position quantized to nearest frame boundary
 *
 * @example
 * snapToFrame(1.234, 30) // Returns 1.2333... (37th frame)
 * snapToFrame(1.234, 60) // Returns 1.2333... (74th frame)
 */
function snapToFrame(position: number, framerate: number = DEFAULT_FRAMERATE): number {
  const frameInterval = 1 / framerate
  return Math.round(position / frameInterval) * frameInterval
}

/**
 * Maximum number of history snapshots to keep
 * Prevents unbounded memory growth
 */
const MAX_HISTORY_SIZE = 50

/**
 * Create a deep copy of tracks to avoid reference issues in history
 */
function cloneTracks(tracks: import('@/components/Timeline/timeline.types').Track[]): import('@/components/Timeline/timeline.types').Track[] {
  return tracks.map(track => ({
    ...track,
    clips: track.clips.map(clip => ({ ...clip }))
  }))
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
  const initialSnapTolerance = loadSavedSnapTolerance()

  return {
    // State
    tracks: [
      {
        id: 1,
        clips: [],
        height: 100
      },
      {
        id: 2,
        clips: [],
        height: 100
      }
    ],
    playheadPosition: 0,
    totalDuration: 0,
    zoomLevel: initialZoom,
    pixelsPerSecond: BASE_PIXELS_PER_SECOND * initialZoom,
    snapTolerance: initialSnapTolerance,
    selectedClipIds: [],
    historyStack: [],
    historyIndex: -1,

    // Backward-compatible getter for components still using selectedClipId (singular)
    // Returns first selected clip ID or null
    get selectedClipId() {
      return get().selectedClipIds[0] ?? null
    },

    // Helper: Save current state to history before mutation
    // Call this at the start of any action that modifies tracks/clips
    _saveHistory: () => {
      const state = get()
      const snapshot: import('@/components/Timeline/timeline.types').TimelineSnapshot = {
        tracks: cloneTracks(state.tracks),
        playheadPosition: state.playheadPosition,
        totalDuration: state.totalDuration,
        selectedClipIds: [...state.selectedClipIds]
      }

      // If we're not at the end of history, truncate future history
      const newStack = state.historyStack.slice(0, state.historyIndex + 1)
      newStack.push(snapshot)

      // Keep only last MAX_HISTORY_SIZE snapshots
      if (newStack.length > MAX_HISTORY_SIZE) {
        newStack.shift()
      }

      set({
        historyStack: newStack,
        historyIndex: newStack.length - 1
      })
    },

    // Actions

  /**
   * Add a new clip to the timeline
   * Generates UUID and adds clip to specified track
   */
  addClip: (clipData) => {
    // Save history before mutation
    get()._saveHistory()

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
    })
  },

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
        return state
      }

      const deletedStart = deletedClip.startTime
      const deletedDuration = getEffectiveDuration(deletedClip)
      const deletedEnd = deletedStart + deletedDuration

      // Remove clip with auto-close: shift remaining clips left to close gap
      const updatedTracks = state.tracks.map((track) => {
        if (track.id !== deletedTrackId) return track

        // Filter out the deleted clip
        let remainingClips = track.clips.filter((clip) => clip.id !== clipId)

        // Shift all clips that start after the deleted clip left by the deleted clip's duration
        remainingClips = remainingClips.map((clip) => {
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
          clips: remainingClips.sort((a, b) => a.startTime - b.startTime)
        }
      })

      // Recalculate total duration using effective duration (accounts for trimming)
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + getEffectiveDuration(clip)
        return endTime > max ? endTime : max
      }, 0)

      // Update playhead if it was within or after deleted clip
      let newPlayhead = state.playheadPosition
      if (state.playheadPosition >= deletedStart && state.playheadPosition < deletedEnd) {
        // Playhead was on deleted clip - move to clip's start position
        newPlayhead = deletedStart
      } else if (state.playheadPosition >= deletedEnd) {
        // Playhead was after deleted clip - shift left by deleted duration
        newPlayhead = Math.max(deletedStart, state.playheadPosition - deletedDuration)
      }

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime,
        playheadPosition: newPlayhead,
        selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId)
      }
    }),

  /**
   * Ripple delete: Remove clips and close gaps by shifting remaining clips left
   * Adobe Premiere Pro style - deletes clips and shifts all subsequent clips
   *
   * @param clipIds - Array of clip IDs to delete (supports multi-selection)
   */
  rippleDeleteClips: (clipIds: string[]) =>
    set((state) => {
      // Group clips by track for efficient processing
      const clipsByTrack = new Map<number, Array<{ clipId: string; startTime: number; duration: number }>>()

      // Find all clips to delete and organize by track
      for (const clipId of clipIds) {
        for (const track of state.tracks) {
          const clip = track.clips.find((c) => c.id === clipId)
          if (clip) {
            const effectiveDuration = getEffectiveDuration(clip)
            if (!clipsByTrack.has(track.id)) {
              clipsByTrack.set(track.id, [])
            }
            clipsByTrack.get(track.id)!.push({
              clipId: clip.id,
              startTime: clip.startTime,
              duration: effectiveDuration
            })
            break
          }
        }
      }

      // Sort clips by startTime within each track (process from earliest to latest)
      for (const clips of clipsByTrack.values()) {
        clips.sort((a, b) => a.startTime - b.startTime)
      }

      // Process each track
      const updatedTracks = state.tracks.map((track) => {
        const clipsToDelete = clipsByTrack.get(track.id)
        if (!clipsToDelete || clipsToDelete.length === 0) {
          return track // No clips to delete on this track
        }

        // Remove all clips marked for deletion
        let remainingClips = track.clips.filter((clip) => !clipIds.includes(clip.id))

        // Calculate cumulative shift amount for each position
        // Process deletions from earliest to latest
        for (const deletedClip of clipsToDelete) {
          const { startTime: deletedStart, duration: deletedDuration } = deletedClip

          // Shift all clips that start after this deleted clip
          remainingClips = remainingClips.map((clip) => {
            if (clip.startTime > deletedStart) {
              return {
                ...clip,
                startTime: clip.startTime - deletedDuration
              }
            }
            return clip
          })
        }

        return {
          ...track,
          clips: remainingClips.sort((a, b) => a.startTime - b.startTime)
        }
      })

      // Recalculate total duration
      const allClips = updatedTracks.flatMap((track) => track.clips)
      const maxEndTime = allClips.reduce((max, clip) => {
        const endTime = clip.startTime + getEffectiveDuration(clip)
        return endTime > max ? endTime : max
      }, 0)

      // Calculate total gap created by deletions
      let totalGapDuration = 0
      for (const clips of clipsByTrack.values()) {
        for (const clip of clips) {
          totalGapDuration += clip.duration
        }
      }

      // Update playhead if it was within or after deleted clips
      let newPlayhead = state.playheadPosition
      const earliestDeletedStart = Math.min(
        ...Array.from(clipsByTrack.values())
          .flat()
          .map((c) => c.startTime)
      )

      if (state.playheadPosition >= earliestDeletedStart) {
        // Shift playhead left by total gap duration
        newPlayhead = Math.max(earliestDeletedStart, state.playheadPosition - totalGapDuration)
      }

      // Clear selection for any deleted clips
      const newSelectedClipIds = state.selectedClipIds.filter((id) => !clipIds.includes(id))

      return {
        tracks: updatedTracks,
        totalDuration: maxEndTime,
        playheadPosition: newPlayhead,
        selectedClipIds: newSelectedClipIds
      }
    }),

  /**
   * Update properties of an existing clip
   */
  updateClip: (clipId, updates) =>
    set((state) => {
      const updatedTracks = state.tracks.map((track) => {
        const targetClip = track.clips.find((c) => c.id === clipId)
        if (!targetClip) return track

        // Check if startTime is being updated (trim operation that moves clip position)
        const isStartTimeUpdate = updates.startTime !== undefined && updates.startTime !== targetClip.startTime

        if (isStartTimeUpdate) {
          // Apply the updates to get the new clip state
          const updatedClip = { ...targetClip, ...updates }
          const updatedDuration = getEffectiveDuration(updatedClip)
          const newStartTime = updates.startTime!
          const newEndTime = newStartTime + updatedDuration

          // Get other clips on this track
          const otherClips = track.clips.filter((c) => c.id !== clipId)

          // Cascading collision detection for trim operations
          // Create working array with updated clip
          const workingClips: Clip[] = [
            ...otherClips.map(c => ({ ...c })),
            updatedClip
          ]

          // Sort by startTime to process clips in order
          workingClips.sort((a, b) => a.startTime - b.startTime)

          // Iteratively resolve collisions
          let hasCollisions = true
          let iterations = 0
          const MAX_ITERATIONS = 10

          while (hasCollisions && iterations < MAX_ITERATIONS) {
            hasCollisions = false
            iterations++

            for (let i = 1; i < workingClips.length; i++) {
              const prevClip = workingClips[i - 1]
              const currClip = workingClips[i]

              const prevEnd = prevClip.startTime + getEffectiveDuration(prevClip)
              const currStart = currClip.startTime

              const EPSILON = 0.001
              if (prevEnd > currStart + EPSILON) {
                // Collision! Push current clip forward
                currClip.startTime = prevEnd
                hasCollisions = true

                console.debug('[Trim] Cascading collision resolved:', {
                  iteration: iterations,
                  prevClip: prevClip.id.substring(0, 8),
                  prevEnd: prevEnd.toFixed(3),
                  currClip: currClip.id.substring(0, 8),
                  newStart: currClip.startTime.toFixed(3)
                })
              }
            }
          }

          if (iterations >= MAX_ITERATIONS) {
            console.warn('[Trim] Max collision iterations reached')
          }

          console.debug('[Trim] Collision resolution complete:', {
            trimmedClip: clipId.substring(0, 8),
            newStart: newStartTime.toFixed(2),
            newEnd: newEndTime.toFixed(2),
            iterations
          })

          const updatedClips = workingClips.sort((a, b) => a.startTime - b.startTime)

          return {
            ...track,
            clips: updatedClips
          }
        } else {
          // No startTime update, just apply updates without collision check
          return {
            ...track,
            clips: track.clips
              .map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip))
              .sort((a, b) => a.startTime - b.startTime)
          }
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

        // Defensive validation: ensure clips don't overlap
        const clipAEnd = clipA.startTime + getEffectiveDuration(clipA)
        const clipBStart = clipB.startTime
        if (clipAEnd > clipBStart) {
          // Force clipB to start exactly where clipA ends
          clipB.startTime = clipAEnd
        }

        // Defensive validation: ensure effective durations are positive
        const clipADuration = getEffectiveDuration(clipA)
        const clipBDuration = getEffectiveDuration(clipB)
        if (clipADuration <= 0 || clipBDuration <= 0) {
          return track // Abort split for this track
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
        selectedClipIds: []
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
   * Select a single clip (replaces current selection)
   * Pass null to clear selection
   */
  selectClip: (clipId) =>
    set({
      selectedClipIds: clipId ? [clipId] : []
    }),

  /**
   * Toggle a clip in/out of selection (Cmd/Ctrl+click behavior)
   */
  toggleClipSelection: (clipId) =>
    set((state) => {
      const isSelected = state.selectedClipIds.includes(clipId)
      return {
        selectedClipIds: isSelected
          ? state.selectedClipIds.filter((id) => id !== clipId)
          : [...state.selectedClipIds, clipId]
      }
    }),

  /**
   * Select a range of clips between two clips (Shift+click behavior)
   * Finds all clips between fromClipId and toClipId on the timeline
   */
  selectClipRange: (fromClipId, toClipId) =>
    set((state) => {
      // Find both clips
      let fromClip: Clip | undefined
      let toClip: Clip | undefined
      let trackId: number | undefined

      for (const track of state.tracks) {
        const from = track.clips.find((c) => c.id === fromClipId)
        const to = track.clips.find((c) => c.id === toClipId)

        if (from) {
          fromClip = from
          trackId = track.id
        }
        if (to) {
          toClip = to
          if (!trackId) trackId = track.id
        }
      }

      if (!fromClip || !toClip || !trackId) {
        // Can't find clips, just select the toClip
        return { selectedClipIds: [toClipId] }
      }

      // Get all clips on the same track
      const track = state.tracks.find((t) => t.id === trackId)
      if (!track) return state

      // Determine range bounds
      const startTime = Math.min(fromClip.startTime, toClip.startTime)
      const endTime = Math.max(fromClip.startTime, toClip.startTime)

      // Select all clips within the time range
      const clipIds = track.clips
        .filter((clip) => clip.startTime >= startTime && clip.startTime <= endTime)
        .map((clip) => clip.id)

      return {
        selectedClipIds: clipIds
      }
    }),

  /**
   * Clear all selections
   */
  clearSelection: () =>
    set({
      selectedClipIds: []
    }),

  /**
   * Move clip to a specific timeline position (Premiere Pro style)
   * Allows gaps between clips, with collision detection and magnetic snap
   * Includes frame-accurate snapping and playhead magnetic snap
   *
   * @param clipId - ID of clip to move
   * @param targetPosition - Timeline position in seconds to move clip to
   */
  moveClipToPosition: (clipId, targetPosition) =>
    set((state) => {
      // Find which track the clip is currently on
      let sourceTrackId = 1
      for (const track of state.tracks) {
        if (track.clips.find((c) => c.id === clipId)) {
          sourceTrackId = track.id
          break
        }
      }

      const trackId = sourceTrackId
      const playheadPos = state.playheadPosition

      const updatedTracks = state.tracks.map((track) => {
        if (track.id !== trackId) return track

        const clipToMove = track.clips.find((c) => c.id === clipId)
        if (!clipToMove) return track

        const otherClips = track.clips.filter((c) => c.id !== clipId)
        const moveDuration = getEffectiveDuration(clipToMove)

        // Start with target position, ensure non-negative
        let finalPosition = Math.max(0, targetPosition)

        // Magnetic snap to timeline start
        if (finalPosition < state.snapTolerance && finalPosition > 0) {
          finalPosition = 0
        }

        // Magnetic snap to playhead position
        if (Math.abs(finalPosition - playheadPos) < state.snapTolerance) {
          finalPosition = playheadPos
        }

        // Check for magnetic snap to other clip edges (before checking collision)
        for (const otherClip of otherClips) {
          const otherStart = otherClip.startTime
          const otherEnd = otherClip.startTime + getEffectiveDuration(otherClip)

          // Snap to end of other clip (our start near their end)
          if (Math.abs(finalPosition - otherEnd) < state.snapTolerance) {
            finalPosition = otherEnd
          }
          // Snap to start of other clip (our end near their start)
          else if (Math.abs(finalPosition + moveDuration - otherStart) < state.snapTolerance) {
            finalPosition = otherStart - moveDuration
            // Ensure snap doesn't create negative position
            if (finalPosition < 0) {
              finalPosition = 0
            }
          }
        }

        // Apply frame-accurate quantization
        finalPosition = snapToFrame(finalPosition, DEFAULT_FRAMERATE)

        // Adobe Premiere Pro style ripple behavior with cascading collision detection:
        // If clip overlaps others, iteratively push all affected clips forward

        // Create working array with moving clip at new position
        const workingClips: Clip[] = [
          ...otherClips.map(c => ({ ...c })),
          { ...clipToMove, startTime: finalPosition }
        ]

        // Sort by startTime to process clips in order
        workingClips.sort((a, b) => a.startTime - b.startTime)

        // Iteratively resolve collisions (max 10 iterations to prevent infinite loops)
        let hasCollisions = true
        let iterations = 0
        const MAX_ITERATIONS = 10

        while (hasCollisions && iterations < MAX_ITERATIONS) {
          hasCollisions = false
          iterations++

          // Check each clip against the previous clip
          for (let i = 1; i < workingClips.length; i++) {
            const prevClip = workingClips[i - 1]
            const currClip = workingClips[i]

            const prevEnd = prevClip.startTime + getEffectiveDuration(prevClip)
            const currStart = currClip.startTime

            // Check for overlap (with small epsilon for floating point comparison)
            const EPSILON = 0.001
            if (prevEnd > currStart + EPSILON) {
              // Collision detected! Push current clip to end of previous
              // Don't snap to frames for rippled clips - maintains exact positioning
              currClip.startTime = prevEnd
              hasCollisions = true

              console.debug('[Drag] Cascading collision resolved:', {
                iteration: iterations,
                prevClip: prevClip.id.substring(0, 8),
                prevEnd: prevEnd.toFixed(3),
                currClip: currClip.id.substring(0, 8),
                oldStart: currStart.toFixed(3),
                newStart: currClip.startTime.toFixed(3)
              })
            }
          }
        }

        if (iterations >= MAX_ITERATIONS) {
          console.warn('[Drag] Max collision iterations reached - timeline may be too crowded')
        }

        // Debug log final result
        console.debug('[Drag] Collision resolution complete:', {
          draggedClip: clipId.substring(0, 8),
          targetPos: finalPosition.toFixed(2),
          iterations,
          finalPositions: workingClips.map(c => ({
            id: c.id.substring(0, 8),
            start: c.startTime.toFixed(2),
            end: (c.startTime + getEffectiveDuration(c)).toFixed(2)
          }))
        })

        const updatedClips = workingClips.sort((a, b) => a.startTime - b.startTime)

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
      }),

    /**
     * Set snap tolerance for magnetic snapping
     * Value is clamped to valid range (0.1 - 2.0 seconds)
     * Persists to localStorage
     */
    setSnapTolerance: (value: number) =>
      set(() => {
        const clampedValue = Math.max(MIN_SNAP_TOLERANCE, Math.min(MAX_SNAP_TOLERANCE, value))

        // Persist to localStorage
        saveSnapTolerance(clampedValue)

        return {
          snapTolerance: clampedValue
        }
      }),

    /**
     * Undo the last action
     * Restores timeline state from history stack
     */
    undo: () =>
      set((state) => {
        if (state.historyIndex < 0) {
          return state // No history to undo
        }

        const snapshot = state.historyStack[state.historyIndex]

        return {
          tracks: cloneTracks(snapshot.tracks),
          playheadPosition: snapshot.playheadPosition,
          totalDuration: snapshot.totalDuration,
          selectedClipIds: [...snapshot.selectedClipIds],
          historyIndex: state.historyIndex - 1
        }
      }),

    /**
     * Redo the last undone action
     * Restores timeline state from history stack
     */
    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.historyStack.length - 1) {
          return state // No history to redo
        }

        const nextIndex = state.historyIndex + 1
        const snapshot = state.historyStack[nextIndex]

        return {
          tracks: cloneTracks(snapshot.tracks),
          playheadPosition: snapshot.playheadPosition,
          totalDuration: snapshot.totalDuration,
          selectedClipIds: [...snapshot.selectedClipIds],
          historyIndex: nextIndex
        }
      })
  }
})
