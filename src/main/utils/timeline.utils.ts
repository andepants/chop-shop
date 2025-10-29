/**
 * Timeline Utilities
 *
 * Utility functions for timeline gap detection and FFmpeg filter generation.
 * Used for filling gaps between clips with black screens and silent audio during export.
 */

import type { Clip } from '@/components/Timeline/timeline.types'

/**
 * Represents a gap between clips on the timeline
 */
export interface Gap {
  /** Timeline position where gap starts (in seconds) */
  startTime: number
  /** Duration of the gap (in seconds) */
  duration: number
  /** Index position in clip array for insertion */
  position: number
}

/**
 * Detect gaps between clips on a timeline
 *
 * Analyzes clip positioning and returns gaps where black screens should be inserted.
 * Gaps are detected when the next clip's startTime is greater than the previous clip's end time.
 *
 * @param clips - Array of clips to analyze (will be sorted by startTime)
 * @returns Array of Gap objects representing timeline gaps (empty if no gaps found)
 *
 * @example
 * // Clips at 0-5s and 10-15s
 * const clips = [
 *   { startTime: 0, duration: 5, trimIn: 0, trimOut: 0 },
 *   { startTime: 10, duration: 5, trimIn: 0, trimOut: 0 }
 * ]
 * const gaps = detectGaps(clips)
 * // Returns: [{ startTime: 5, duration: 5, position: 1 }]
 */
export function detectGaps(clips: Clip[]): Gap[] {
  // Handle edge cases
  if (!clips || clips.length === 0) {
    return []
  }

  if (clips.length === 1) {
    return [] // Single clip, no gaps
  }

  // Sort clips by startTime (defensive copy to avoid mutation)
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)
  const gaps: Gap[] = []

  // Iterate through clips and detect gaps
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const currentClip = sortedClips[i]
    const nextClip = sortedClips[i + 1]

    // Calculate effective duration of current clip (accounting for trim)
    const effectiveDuration = currentClip.duration - currentClip.trimIn - currentClip.trimOut
    const currentClipEnd = currentClip.startTime + effectiveDuration
    const nextClipStart = nextClip.startTime

    // Check if there's a gap between clips
    const EPSILON = 0.001 // Small tolerance for floating point comparison
    if (nextClipStart > currentClipEnd + EPSILON) {
      const gapDuration = nextClipStart - currentClipEnd

      gaps.push({
        startTime: currentClipEnd,
        duration: gapDuration,
        position: i + 1 // Position where gap segment should be inserted
      })
    }
  }

  return gaps
}

/**
 * Generate FFmpeg filter for black screen and silent audio segment
 *
 * Creates filter_complex strings for inserting black video and silent audio
 * to fill gaps in the timeline export.
 *
 * @param gapIndex - Unique index for this gap (used for filter labels)
 * @param duration - Duration of the gap in seconds
 * @param width - Video width in pixels (e.g., 1920)
 * @param height - Video height in pixels (e.g., 1080)
 * @returns Object with video and audio filter strings
 *
 * @example
 * const filter = generateBlackSegmentFilter(0, 5.0, 1920, 1080)
 * // Returns:
 * // {
 * //   video: "color=black:s=1920x1080:d=5.0:r=30[gap0v]",
 * //   audio: "anullsrc=channel_layout=stereo:sample_rate=48000:duration=5.0[gap0a]"
 * // }
 */
export function generateBlackSegmentFilter(
  gapIndex: number,
  duration: number,
  width: number,
  height: number
): { video: string; audio: string } {
  // Video filter: black screen with specified dimensions and duration
  const videoFilter = `color=black:s=${width}x${height}:d=${duration}:r=30[gap${gapIndex}v]`

  // Audio filter: silent stereo audio with 48kHz sample rate
  const audioFilter = `anullsrc=channel_layout=stereo:sample_rate=48000:duration=${duration}[gap${gapIndex}a]`

  return {
    video: videoFilter,
    audio: audioFilter
  }
}
