/**
 * FFmpeg Service
 * Handles video processing using FFmpeg static binaries
 */
import { spawn, ChildProcess } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import ffmpegStatic from 'ffmpeg-static'
import type { Clip } from '../../renderer/src/components/Timeline/timeline.types'

/**
 * FFmpeg error codes
 */
export enum FFmpegErrorCode {
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * FFmpeg error with code
 */
export class FFmpegError extends Error {
  constructor(
    message: string,
    public code: FFmpegErrorCode
  ) {
    super(message)
    this.name = 'FFmpegError'
  }
}

/**
 * Progress callback interface
 */
export interface ProgressCallback {
  (progress: { percent: number; frame: number; fps: number; time: string }): void
}

/**
 * Get FFmpeg binary path from ffmpeg-static
 * @returns Path to FFmpeg binary
 */
export function getFfmpegPath(): string {
  if (!ffmpegStatic) {
    throw new FFmpegError('FFmpeg binary not found', FFmpegErrorCode.FILE_NOT_FOUND)
  }
  return ffmpegStatic
}

/**
 * Parse time string (HH:MM:SS.ms) to seconds
 * @param hours - Hours
 * @param minutes - Minutes
 * @param seconds - Seconds with milliseconds
 * @returns Total seconds
 */
function parseTimeToSeconds(hours: string, minutes: string, seconds: string): number {
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)
}

/**
 * Parse FFmpeg stderr for progress updates
 * @param stderr - FFmpeg stderr output
 * @param totalDuration - Total video duration in seconds (if known)
 * @returns Progress information or null
 */
function parseProgress(
  stderr: string,
  totalDuration?: number
): { percent: number; frame: number; fps: number; time: string } | null {
  // frame=  120 fps= 30 q=28.0 size=     512kB time=00:00:04.00 bitrate=1048.6kbits/s
  const frameMatch = stderr.match(/frame=\s*(\d+)/)
  const fpsMatch = stderr.match(/fps=\s*([\d.]+)/)
  const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)

  if (!timeMatch) return null

  const currentSeconds = parseTimeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3])
  const percent = totalDuration ? (currentSeconds / totalDuration) * 100 : 0

  return {
    percent: Math.min(percent, 100),
    frame: frameMatch ? parseInt(frameMatch[1]) : 0,
    fps: fpsMatch ? parseFloat(fpsMatch[1]) : 0,
    time: `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`
  }
}

/**
 * Parse FFmpeg stderr for error messages and return user-friendly error
 * @param stderr - FFmpeg stderr output
 * @param exitCode - Process exit code
 * @returns FFmpegError
 */
function parseFFmpegError(stderr: string, exitCode: number): FFmpegError {
  console.error('[FFmpeg] Error output:', stderr)
  console.error('[FFmpeg] Exit code:', exitCode)

  if (stderr.includes('Invalid data found') || stderr.includes('could not find codec')) {
    return new FFmpegError('Unsupported video format', FFmpegErrorCode.UNSUPPORTED_FORMAT)
  }

  if (stderr.includes('No such file or directory')) {
    return new FFmpegError('Input file not found', FFmpegErrorCode.FILE_NOT_FOUND)
  }

  if (stderr.includes('Permission denied')) {
    return new FFmpegError('Permission denied for output file', FFmpegErrorCode.PERMISSION_DENIED)
  }

  // Extract error message from stderr if available
  const errorLines = stderr
    .split('\n')
    .filter((line) => line.includes('Error') || line.includes('error'))
  const errorMessage = errorLines.length > 0 ? errorLines[0] : 'FFmpeg execution failed'

  return new FFmpegError(errorMessage, FFmpegErrorCode.EXECUTION_FAILED)
}

/**
 * Execute FFmpeg command with progress monitoring
 * @param args - FFmpeg command arguments
 * @param onProgress - Optional progress callback
 * @param totalDuration - Optional total duration for progress calculation
 * @returns Promise that resolves on success
 */
export function executeFFmpegCommand(
  args: string[],
  onProgress?: ProgressCallback,
  totalDuration?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath()
    console.log('[FFmpeg] Command:', ffmpegPath, args.join(' '))

    const ffmpegProcess: ChildProcess = spawn(ffmpegPath, args)
    let stderrBuffer = ''

    // Capture stdout (usually empty for FFmpeg)
    ffmpegProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log('[FFmpeg] stdout:', output)
    })

    // Capture stderr (where FFmpeg outputs progress and errors)
    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      stderrBuffer += output

      // Parse progress if callback provided
      if (onProgress) {
        const progress = parseProgress(output, totalDuration)
        if (progress) {
          console.log(
            `[FFmpeg] Progress: ${progress.percent.toFixed(1)}% (frame: ${progress.frame}, fps: ${progress.fps}, time: ${progress.time})`
          )
          onProgress(progress)
        }
      }
    })

    // Handle process completion
    ffmpegProcess.on('close', (code: number | null) => {
      if (code === 0) {
        console.log('[FFmpeg] Command completed successfully')
        resolve()
      } else {
        const error = parseFFmpegError(stderrBuffer, code ?? -1)
        reject(error)
      }
    })

    // Handle process errors
    ffmpegProcess.on('error', (error: Error) => {
      console.error('[FFmpeg] Process error:', error)
      reject(new FFmpegError(error.message, FFmpegErrorCode.EXECUTION_FAILED))
    })
  })
}

/**
 * Test export: convert any video to MP4 with H.264
 * @param inputPath - Path to input video file
 * @param outputPath - Path to output MP4 file
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves when export completes
 */
export async function testExport(
  inputPath: string,
  outputPath: string,
  onProgress?: ProgressCallback
): Promise<void> {
  console.log('[FFmpeg] Starting test export...')
  console.log('[FFmpeg] Input:', inputPath)
  console.log('[FFmpeg] Output:', outputPath)

  // Verify input file exists
  if (!existsSync(inputPath)) {
    throw new FFmpegError(`Input file not found: ${inputPath}`, FFmpegErrorCode.FILE_NOT_FOUND)
  }

  try {
    // Build FFmpeg command for H.264 MP4 export
    const args = [
      '-i',
      inputPath, // Input file
      '-c:v',
      'libx264', // H.264 video codec
      '-preset',
      'fast', // Fast encoding preset
      '-c:a',
      'aac', // AAC audio codec
      '-y', // Overwrite output file if exists
      outputPath // Output file
    ]

    await executeFFmpegCommand(args, onProgress)

    // Verify output file was created
    if (!existsSync(outputPath)) {
      throw new FFmpegError('Output file was not created', FFmpegErrorCode.EXECUTION_FAILED)
    }

    console.log('[FFmpeg] Test export completed successfully')
    console.log('[FFmpeg] Output file:', outputPath)
  } catch (error) {
    if (error instanceof FFmpegError) {
      throw error
    }
    throw new FFmpegError(
      error instanceof Error ? error.message : 'Unknown error',
      FFmpegErrorCode.UNKNOWN_ERROR
    )
  }
}

/**
 * Export resolution options
 */
export type ExportResolution = '720p' | '1080p' | 'source'

/**
 * PiP position options for multi-track export
 */
export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Export options for timeline export
 */
export interface ExportOptions {
  clips: Clip[]
  resolution: ExportResolution
  outputPath: string
}

/**
 * Multi-track export options
 * Extends ExportOptions with track-specific configuration
 */
export interface MultiTrackExportOptions extends Omit<ExportOptions, 'clips'> {
  tracks: {
    main: Clip[]       // Track 1 clips (full-screen)
    overlay: Clip[]    // Track 2 clips (PiP overlay)
  }
  pipPosition?: PipPosition  // Position of overlay (default: bottom-right)
  pipSize?: number           // Size as percentage (default: 25)
}

/**
 * Calculate total duration of all clips accounting for trim values
 * @param clips - Array of timeline clips
 * @returns Total duration in seconds
 */
function calculateTotalDuration(clips: Clip[]): number {
  return clips.reduce((total, clip) => {
    const trimmedDuration = clip.duration - clip.trimIn - clip.trimOut
    return total + trimmedDuration
  }, 0)
}

/**
 * Build FFmpeg command for timeline export with concat and trim support
 * Reads from intermediate ProRes files for frame-accurate export
 * @param clips - Array of timeline clips to export
 * @param resolution - Target resolution (720p, 1080p, or source)
 * @param outputPath - Absolute path for output MP4 file
 * @returns FFmpeg command arguments array
 */
export function buildFFmpegCommand(
  clips: Clip[],
  resolution: ExportResolution,
  outputPath: string
): string[] {
  const args: string[] = []

  // Add input files with trim parameters
  // Each input needs its own -ss and -t positioned correctly
  clips.forEach((clip) => {
    // Use intermediate path for export (ProRes provides better quality)
    const inputFile = clip.intermediatePath

    // Validate input file exists
    if (!existsSync(inputFile)) {
      throw new FFmpegError(
        `Intermediate file not found: ${inputFile}`,
        FFmpegErrorCode.FILE_NOT_FOUND
      )
    }

    // Apply trim start (seek to position before reading - more efficient)
    if (clip.trimIn > 0) {
      args.push('-ss', clip.trimIn.toString())
    }

    // Add input file (intermediate ProRes file)
    args.push('-i', inputFile)

    // Calculate and apply duration limit after trim
    const trimmedDuration = clip.duration - clip.trimIn - clip.trimOut
    if (trimmedDuration > 0 && (clip.trimIn > 0 || clip.trimOut > 0)) {
      args.push('-t', trimmedDuration.toString())
    }
  })

  // Build filter_complex for concatenation if multiple clips
  if (clips.length > 1) {
    let filterComplex = ''

    // Build concat inputs [0:v][0:a][1:v][1:a]...
    for (let i = 0; i < clips.length; i++) {
      filterComplex += `[${i}:v][${i}:a]`
    }

    // Add concat filter - output to intermediate label if scaling needed
    if (resolution === '720p' || resolution === '1080p') {
      filterComplex += `concat=n=${clips.length}:v=1:a=1[concatv][outa]`

      // Add scaling filter in the same filter_complex chain
      if (resolution === '720p') {
        filterComplex += ';[concatv]scale=1280:720[outv]'
      } else if (resolution === '1080p') {
        filterComplex += ';[concatv]scale=1920:1080[outv]'
      }
    } else {
      // Source quality - no scaling needed
      filterComplex += `concat=n=${clips.length}:v=1:a=1[outv][outa]`
    }

    args.push('-filter_complex', filterComplex)
    args.push('-map', '[outv]', '-map', '[outa]')
  } else {
    // Single clip - use simpler -vf for scaling (no filter_complex needed)
    if (resolution === '720p') {
      args.push('-vf', 'scale=1280:720')
    } else if (resolution === '1080p') {
      args.push('-vf', 'scale=1920:1080')
    }
    // For 'source', no scaling is applied
  }

  // Video codec settings - H.264 with high quality (CRF 18-20)
  args.push('-c:v', 'libx264')
  args.push('-crf', '18') // High quality constant rate factor (lower = better quality)
  args.push('-preset', 'slow') // Slower preset for better compression/quality balance

  // Audio codec settings
  args.push('-c:a', 'aac')
  args.push('-b:a', '192k')

  // Overwrite output file
  args.push('-y')

  // Output file
  args.push(outputPath)

  return args
}

/**
 * Execute timeline export to MP4
 * @param options - Export options including clips, resolution, and output path
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving with output path on success
 */
export async function executeExport(
  options: ExportOptions,
  onProgress?: (percent: number) => void
): Promise<{ outputPath: string }> {
  const { clips, resolution, outputPath } = options

  console.log('[FFmpeg] Starting timeline export...')
  console.log('[FFmpeg] Clips:', clips.length)
  console.log('[FFmpeg] Resolution:', resolution)
  console.log('[FFmpeg] Output:', outputPath)

  // Validate inputs
  if (!clips || clips.length === 0) {
    throw new FFmpegError('No clips to export', FFmpegErrorCode.EXECUTION_FAILED)
  }

  if (!outputPath) {
    throw new FFmpegError('Output path is required', FFmpegErrorCode.EXECUTION_FAILED)
  }

  try {
    // Build FFmpeg command
    const args = buildFFmpegCommand(clips, resolution, outputPath)
    console.log('[FFmpeg] Command:', args.join(' '))

    // Calculate total duration for progress tracking
    const totalDuration = calculateTotalDuration(clips)

    // Execute FFmpeg with progress callback
    await executeFFmpegCommand(
      args,
      onProgress
        ? (progress) => {
            // Convert to simple percent for IPC
            onProgress(Math.round(progress.percent))
          }
        : undefined,
      totalDuration
    )

    // Verify output file was created
    if (!existsSync(outputPath)) {
      throw new FFmpegError('Output file was not created', FFmpegErrorCode.EXECUTION_FAILED)
    }

    console.log('[FFmpeg] Export completed successfully')
    console.log('[FFmpeg] Output file:', outputPath)

    return { outputPath }
  } catch (error) {
    // Clean up partial file on error
    try {
      if (existsSync(outputPath)) {
        unlinkSync(outputPath)
        console.log('[FFmpeg] Cleaned up partial output file')
      }
    } catch (cleanupError) {
      console.error('[FFmpeg] Failed to clean up partial file:', cleanupError)
    }

    // Re-throw the error
    if (error instanceof FFmpegError) {
      throw error
    }
    throw new FFmpegError(
      error instanceof Error ? error.message : 'Export failed',
      FFmpegErrorCode.EXECUTION_FAILED
    )
  }
}

/**
 * Build FFmpeg overlay filter string for PiP positioning
 * @param pipPosition - Position of overlay (top-left, top-right, bottom-left, bottom-right)
 * @param pipSize - Size as percentage (e.g., 25 for 25%)
 * @returns FFmpeg overlay filter expression
 */
function buildOverlayFilter(pipPosition: PipPosition, pipSize: number): string {
  const padding = 10 // Padding from edges in pixels

  // Scale overlay to specified size (percentage of main video width)
  const scaleFilter = `[overlay]scale=iw*${pipSize / 100}:ih*${pipSize / 100}[pip]`

  // Calculate overlay position based on pipPosition
  let overlayPosition: string
  switch (pipPosition) {
    case 'top-left':
      overlayPosition = `${padding}:${padding}`
      break
    case 'top-right':
      overlayPosition = `W-w-${padding}:${padding}`
      break
    case 'bottom-left':
      overlayPosition = `${padding}:H-h-${padding}`
      break
    case 'bottom-right':
    default:
      overlayPosition = `W-w-${padding}:H-h-${padding}`
      break
  }

  return `${scaleFilter};[main][pip]overlay=${overlayPosition}`
}

/**
 * Build FFmpeg command for multi-track export with overlay and audio mixing
 * @param options - Multi-track export options
 * @returns FFmpeg command arguments array
 */
export function buildMultiTrackFFmpegCommand(options: MultiTrackExportOptions): string[] {
  const { tracks, resolution, outputPath, pipPosition = 'bottom-right', pipSize = 25 } = options
  const args: string[] = []

  // Validate both tracks have clips
  if (tracks.main.length === 0) {
    throw new FFmpegError('Track 1 (main) must have at least one clip', FFmpegErrorCode.EXECUTION_FAILED)
  }

  // Build track 1 (main) concatenation
  const hasOverlay = tracks.overlay.length > 0

  // Add Track 1 inputs with trim (using intermediate files)
  tracks.main.forEach((clip) => {
    const inputFile = clip.intermediatePath

    if (!existsSync(inputFile)) {
      throw new FFmpegError(`Intermediate file not found: ${inputFile}`, FFmpegErrorCode.FILE_NOT_FOUND)
    }

    if (clip.trimIn > 0) {
      args.push('-ss', clip.trimIn.toString())
    }
    args.push('-i', inputFile)

    const trimmedDuration = clip.duration - clip.trimIn - clip.trimOut
    if (trimmedDuration > 0 && (clip.trimIn > 0 || clip.trimOut > 0)) {
      args.push('-t', trimmedDuration.toString())
    }
  })

  // Track the number of Track 1 inputs for filter indexing
  const track1InputCount = tracks.main.length

  // Add Track 2 inputs with trim (if overlay exists, using intermediate files)
  if (hasOverlay) {
    tracks.overlay.forEach((clip) => {
      const inputFile = clip.intermediatePath

      if (!existsSync(inputFile)) {
        throw new FFmpegError(`Intermediate file not found: ${inputFile}`, FFmpegErrorCode.FILE_NOT_FOUND)
      }

      if (clip.trimIn > 0) {
        args.push('-ss', clip.trimIn.toString())
      }
      args.push('-i', inputFile)

      const trimmedDuration = clip.duration - clip.trimIn - clip.trimOut
      if (trimmedDuration > 0 && (clip.trimIn > 0 || clip.trimOut > 0)) {
        args.push('-t', trimmedDuration.toString())
      }
    })
  }

  // Build complex filter
  let filterComplex = ''

  // Concatenate Track 1 clips if multiple
  if (tracks.main.length > 1) {
    for (let i = 0; i < tracks.main.length; i++) {
      filterComplex += `[${i}:v][${i}:a]`
    }
    filterComplex += `concat=n=${tracks.main.length}:v=1:a=1[main][a1]`
  } else {
    // Single Track 1 clip - just label it
    filterComplex += '[0:v]copy[main];[0:a]copy[a1]'
  }

  // Concatenate Track 2 clips if multiple and overlay exists
  if (hasOverlay) {
    filterComplex += ';'

    if (tracks.overlay.length > 1) {
      for (let i = 0; i < tracks.overlay.length; i++) {
        const inputIndex = track1InputCount + i
        filterComplex += `[${inputIndex}:v][${inputIndex}:a]`
      }
      filterComplex += `concat=n=${tracks.overlay.length}:v=1:a=1[overlay][a2]`
    } else {
      // Single Track 2 clip
      const overlayInputIndex = track1InputCount
      filterComplex += `[${overlayInputIndex}:v]copy[overlay];[${overlayInputIndex}:a]copy[a2]`
    }

    // Apply overlay filter
    filterComplex += ';'
    filterComplex += buildOverlayFilter(pipPosition, pipSize)
    filterComplex += '[outv]'

    // Mix audio: Track 1 @ 100% (0dB), Track 2 @ 50% (-6dB)
    filterComplex += ';[a1]volume=1.0[a1out];[a2]volume=0.5[a2out];[a1out][a2out]amix=inputs=2:duration=longest[outa]'
  } else {
    // No overlay - just use Track 1 video and audio
    filterComplex += ';[main]copy[outv];[a1]copy[outa]'
  }

  // Apply resolution scaling if needed
  if (resolution === '720p') {
    filterComplex = filterComplex.replace('[outv]', '[outv_temp]')
    filterComplex += ';[outv_temp]scale=1280:720[outv]'
  } else if (resolution === '1080p') {
    filterComplex = filterComplex.replace('[outv]', '[outv_temp]')
    filterComplex += ';[outv_temp]scale=1920:1080[outv]'
  }

  args.push('-filter_complex', filterComplex)
  args.push('-map', '[outv]', '-map', '[outa]')

  // Codec settings - H.264 with high quality (CRF 18-20)
  args.push('-c:v', 'libx264')
  args.push('-crf', '18') // High quality constant rate factor
  args.push('-preset', 'slow') // Better compression/quality balance
  args.push('-c:a', 'aac')
  args.push('-b:a', '192k')

  // Overwrite output
  args.push('-y')
  args.push(outputPath)

  return args
}

/**
 * Execute multi-track timeline export to MP4
 * Composites Track 2 (overlay) over Track 1 (main) with PiP positioning
 * @param options - Multi-track export options
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving with output path on success
 */
export async function executeMultiTrackExport(
  options: MultiTrackExportOptions,
  onProgress?: (percent: number) => void
): Promise<{ outputPath: string }> {
  const { tracks, resolution, outputPath } = options

  console.log('[FFmpeg] Starting multi-track export...')
  console.log('[FFmpeg] Track 1 clips:', tracks.main.length)
  console.log('[FFmpeg] Track 2 clips:', tracks.overlay.length)
  console.log('[FFmpeg] Resolution:', resolution)
  console.log('[FFmpeg] Output:', outputPath)

  // Validate inputs
  if (!tracks.main || tracks.main.length === 0) {
    throw new FFmpegError('Track 1 must have at least one clip', FFmpegErrorCode.EXECUTION_FAILED)
  }

  if (!outputPath) {
    throw new FFmpegError('Output path is required', FFmpegErrorCode.EXECUTION_FAILED)
  }

  try {
    // Build FFmpeg command
    const args = buildMultiTrackFFmpegCommand(options)
    console.log('[FFmpeg] Command:', args.join(' '))

    // Calculate total duration (use longest track)
    const track1Duration = calculateTotalDuration(tracks.main)
    const track2Duration = tracks.overlay.length > 0 ? calculateTotalDuration(tracks.overlay) : 0
    const totalDuration = Math.max(track1Duration, track2Duration)

    // Execute FFmpeg with progress callback
    await executeFFmpegCommand(
      args,
      onProgress
        ? (progress) => {
            onProgress(Math.round(progress.percent))
          }
        : undefined,
      totalDuration
    )

    // Verify output file was created
    if (!existsSync(outputPath)) {
      throw new FFmpegError('Output file was not created', FFmpegErrorCode.EXECUTION_FAILED)
    }

    console.log('[FFmpeg] Multi-track export completed successfully')
    console.log('[FFmpeg] Output file:', outputPath)

    return { outputPath }
  } catch (error) {
    // Clean up partial file on error
    try {
      if (existsSync(outputPath)) {
        unlinkSync(outputPath)
        console.log('[FFmpeg] Cleaned up partial output file')
      }
    } catch (cleanupError) {
      console.error('[FFmpeg] Failed to clean up partial file:', cleanupError)
    }

    // Re-throw the error
    if (error instanceof FFmpegError) {
      throw error
    }
    throw new FFmpegError(
      error instanceof Error ? error.message : 'Multi-track export failed',
      FFmpegErrorCode.EXECUTION_FAILED
    )
  }
}
