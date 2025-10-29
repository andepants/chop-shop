/**
 * Temporary Export Service
 *
 * Handles temporary video exports for AI transcription and processing.
 * Exports timeline to temporary video file with multi-track audio mixing,
 * leveraging existing FFmpeg multi-track export logic for consistency.
 */

import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { executeMultiTrackExport } from '../ffmpeg.service'
import type { Track } from '../../../shared/types'

/**
 * Options for temporary export
 */
export interface TempExportOptions {
  /** Timeline tracks to export */
  tracks: Track[]
  /** Export resolution (defaults to 1920x1080) */
  resolution?: { width: number; height: number }
}

/**
 * Result of temporary export
 */
export interface TempExportResult {
  /** Path to temporary video file */
  videoPath: string
  /** Total duration of exported video in seconds */
  duration: number
}

/**
 * Export timeline to temporary video file for transcription
 *
 * Uses existing multi-track export logic to ensure audio mixing matches final export.
 * Optimized for speed: uses fast preset and doesn't optimize quality.
 *
 * @param options - Export options
 * @returns Temporary video path and duration
 */
export async function exportTimelineForTranscription(
  options: TempExportOptions
): Promise<TempExportResult> {
  const { tracks, resolution = { width: 1920, height: 1080 } } = options

  console.log('[TempExport] Starting temporary export for transcription...')
  console.log('[TempExport] Tracks:', tracks.length)

  // Validate tracks
  if (!tracks || tracks.length === 0) {
    throw new Error('No tracks provided for export')
  }

  // Get clips from each track
  const track1 = tracks.find((t) => t.id === 1)
  const track2 = tracks.find((t) => t.id === 2)

  if (!track1 || track1.clips.length === 0) {
    throw new Error('Track 1 must have at least one clip')
  }

  // Generate unique temporary file path
  const tempFileName = `temp-export-${randomBytes(8).toString('hex')}.mp4`
  const outputPath = join(tmpdir(), tempFileName)

  console.log('[TempExport] Temporary file path:', outputPath)

  try {
    // Calculate total duration (max of all tracks)
    const track1Duration = calculateTrackDuration(track1.clips)
    const track2Duration = track2 ? calculateTrackDuration(track2.clips) : 0
    const totalDuration = Math.max(track1Duration, track2Duration)

    console.log('[TempExport] Total duration:', totalDuration)

    // Export using multi-track FFmpeg command
    await executeMultiTrackExport({
      tracks: {
        main: track1.clips,
        overlay: track2?.clips || [],
        mainMuted: track1.isMuted,
        overlayMuted: track2?.isMuted,
        mainVolume: track1.volume,
        overlayVolume: track2?.volume
      },
      resolution,
      outputPath,
      // Use fast preset for transcription (speed > quality)
      preset: 'faster' as any, // FFmpeg preset
      pipPosition: 'bottom-right',
      pipSize: 25
    })

    console.log('[TempExport] Temporary export completed:', outputPath)

    return {
      videoPath: outputPath,
      duration: totalDuration
    }
  } catch (error) {
    console.error('[TempExport] Export failed:', error)
    throw new Error(
      `Failed to export timeline for transcription: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Calculate total duration of clips in a track
 *
 * Finds the end time of the last clip (startTime + effective duration)
 *
 * @param clips - Array of clips
 * @returns Total duration in seconds
 */
function calculateTrackDuration(clips: any[]): number {
  if (!clips || clips.length === 0) {
    return 0
  }

  // Find the end time of the last clip
  let maxEndTime = 0
  for (const clip of clips) {
    const effectiveDuration = clip.trimOut - clip.trimIn
    const endTime = clip.startTime + effectiveDuration
    if (endTime > maxEndTime) {
      maxEndTime = endTime
    }
  }

  return maxEndTime
}
