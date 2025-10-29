/**
 * FFmpeg Service
 * Handles video processing using FFmpeg static binaries
 */
import { spawn, ChildProcess } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { getFfmpegPath as getBinaryPath } from '../utils/binaryPaths'
import type { Clip } from '../../renderer/src/components/Timeline/timeline.types'
import { detectGaps, generateBlackSegmentFilter } from '../utils/timeline.utils'

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
  const path = getBinaryPath()
  if (!path) {
    throw new FFmpegError('FFmpeg binary not found', FFmpegErrorCode.FILE_NOT_FOUND)
  }
  return path
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

  // Check for buffer/memory issues (common with large high-res files)
  if (
    stderr.includes('Conversion failed') ||
    stderr.includes('Encoder buffer') ||
    stderr.includes('buffer underflow') ||
    stderr.includes('buffer overflow')
  ) {
    return new FFmpegError(
      'Export failed due to video complexity or file size. Try exporting at lower resolution (1080p or 720p) or splitting timeline into shorter clips.',
      FFmpegErrorCode.EXECUTION_FAILED
    )
  }

  // Check for muxer/concat failures (common with incompatible intermediate files)
  if (
    stderr.includes('av_interleaved_write_frame') ||
    stderr.includes('muxer') ||
    (stderr.includes('concat') && (stderr.includes('error') || stderr.includes('failed')))
  ) {
    return new FFmpegError(
      'Export failed during video concatenation. This may be due to incompatible intermediate files or codec issues. Try re-importing your source videos or exporting at lower resolution.',
      FFmpegErrorCode.EXECUTION_FAILED
    )
  }

  // Check for timestamp/DTS issues (common with H.264 Intra concat)
  if (
    stderr.includes('non-monotonous DTS') ||
    stderr.includes('Timestamps are unset') ||
    stderr.includes('DTS out of order')
  ) {
    return new FFmpegError(
      'Export failed due to timestamp discontinuities. This can occur with certain video formats. Try re-importing your source videos or contact support.',
      FFmpegErrorCode.EXECUTION_FAILED
    )
  }

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
 * @param clips - Optional clips array for detailed error logging
 * @returns Promise that resolves on success
 */
export function executeFFmpegCommand(
  args: string[],
  onProgress?: ProgressCallback,
  totalDuration?: number,
  clips?: Clip[],
  timeoutMs?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath()
    console.log('[FFmpeg] Command:', ffmpegPath, args.join(' '))

    const ffmpegProcess: ChildProcess = spawn(ffmpegPath, args)
    let stderrBuffer = ''
    const MAX_STDERR_BUFFER = 5 * 1024 * 1024 // 5MB limit to prevent memory overflow
    let lastLogTime = 0
    const LOG_THROTTLE_MS = 500 // Throttle logging to max every 500ms

    // Add timeout if specified
    let timeoutHandle: NodeJS.Timeout | null = null
    if (timeoutMs) {
      timeoutHandle = setTimeout(() => {
        console.error(`[FFmpeg] ❌ Export timed out after ${timeoutMs / 1000}s`)
        ffmpegProcess.kill('SIGKILL')
        reject(
          new FFmpegError(
            `Export timed out after ${timeoutMs / 1000}s. Try exporting at lower resolution or splitting into shorter clips.`,
            FFmpegErrorCode.EXECUTION_FAILED
          )
        )
      }, timeoutMs)
    }

    // Capture stdout (usually empty for FFmpeg)
    ffmpegProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log('[FFmpeg] stdout:', output)
    })

    // Capture stderr (where FFmpeg outputs progress and errors)
    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()

      // Prevent buffer overflow - only accumulate up to MAX_STDERR_BUFFER
      if (stderrBuffer.length < MAX_STDERR_BUFFER) {
        stderrBuffer += output
      }

      // Throttle console logging to reduce I/O overhead on main thread
      const now = Date.now()
      if (now - lastLogTime >= LOG_THROTTLE_MS) {
        console.log('[FFmpeg] stderr:', output.trim())
        lastLogTime = now
      }

      // Detect H.264-specific warnings and errors
      if (output.includes('non-monotonous DTS') || output.includes('non monotonous DTS')) {
        console.warn('[FFmpeg] ⚠️  WARNING: Non-monotonous DTS detected - timestamp discontinuity in H.264 stream')
      }
      if (output.includes('Invalid data found') || output.includes('invalid data')) {
        console.error('[FFmpeg] ❌ ERROR: Invalid data found in input stream - possible codec incompatibility')
      }
      if (output.includes('Timestamps are unset') || output.includes('timestamp')) {
        console.warn('[FFmpeg] ⚠️  WARNING: Timestamp issue detected')
      }
      if (output.includes('concat') && (output.includes('error') || output.includes('Error'))) {
        console.error('[FFmpeg] ❌ ERROR: Concatenation error - H.264 Intra streams may have incompatible parameters')
      }

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
      // Clear timeout on completion
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }

      if (code === 0) {
        console.log('[FFmpeg] Command completed successfully')
        resolve()
      } else {
        console.error('[FFmpeg] =====================================')
        console.error('[FFmpeg] ❌ EXPORT FAILED')
        console.error('[FFmpeg] =====================================')
        console.error('[FFmpeg] Exit code:', code)
        console.error('[FFmpeg] FFmpeg version: Static 5.2.0 (FFmpeg 6.0)')
        console.error('[FFmpeg] --------- Command Arguments ---------')
        console.error('[FFmpeg] Full command:', ffmpegPath, args.join(' '))
        console.error('[FFmpeg] --------- Full stderr Buffer ---------')
        console.error('[FFmpeg] stderr (complete):\n', stderrBuffer)

        // Log detailed clip information if available
        if (clips && clips.length > 0) {
          console.error('[FFmpeg] --------- Input Clips Details ---------')
          clips.forEach((clip, index) => {
            console.error(`[FFmpeg] Clip ${index + 1}/${clips.length}:`, {
              id: clip.id,
              name: clip.name,
              intermediatePath: clip.intermediatePath,
              fileExists: existsSync(clip.intermediatePath || ''),
              trimIn: clip.trimIn,
              trimOut: clip.trimOut,
              duration: clip.duration,
              trimmedDuration: clip.duration - clip.trimIn - clip.trimOut,
              startTime: clip.startTime
            })
          })
        }

        console.error('[FFmpeg] =====================================')

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
    mainMuted?: boolean      // Track 1 mute state (default: false)
    overlayMuted?: boolean   // Track 2 mute state (default: false)
    mainVolume?: number      // Track 1 volume (0.0-1.0, default: 1.0)
    overlayVolume?: number   // Track 2 volume (0.0-1.0, default: 1.0)
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
 * Calculate required H.264 level based on resolution and framerate
 * H.264 levels define maximum resolution, bitrate, and decoder capabilities
 * @param width - Video width in pixels
 * @param height - Video height in pixels
 * @param fps - Frame rate (default 30)
 * @returns H.264 level string (e.g., "5.1")
 */
function calculateH264Level(width: number, height: number, fps: number = 30): string {
  const pixels = width * height
  const macroblocksPerFrame = Math.ceil(width / 16) * Math.ceil(height / 16)

  console.log('[FFmpeg] Calculating H.264 level:', {
    resolution: `${width}×${height}`,
    pixels,
    macroblocks: macroblocksPerFrame,
    fps
  })

  // 4K and above (3840x2160 = 8,294,400 pixels, ~32,400 macroblocks)
  // Level 5.1: Max 4096×2160 @ 30fps, 36,864 MB/frame, 240 Mbps
  // Level 5.2: Max 4096×2160 @ 60fps, 36,864 MB/frame, 240 Mbps
  if (pixels >= 3840 * 2160 || macroblocksPerFrame > 22080) {
    return fps > 30 ? '5.2' : '5.1'
  }

  // 2.5K - 4K (2560x1920 = 4,915,200 pixels, ~14,400 macroblocks)
  // Level 5.0: Max 2560×1920 @ 30fps, 22,080 MB/frame, 135 Mbps
  if (pixels >= 2560 * 1920 || macroblocksPerFrame > 8704) {
    return '5.0'
  }

  // 1080p (1920x1080 = 2,073,600 pixels, ~8,100 macroblocks)
  // Level 4.0: Max 2048×1088 @ 30fps, 8,192 MB/frame, 25 Mbps
  // Level 4.1: Max 2048×1088 @ 30fps, 8,192 MB/frame, 50 Mbps
  if (pixels >= 1920 * 1080 || macroblocksPerFrame > 3600) {
    return fps > 30 ? '4.1' : '4.0'
  }

  // 720p and below
  // Level 4.0: Sufficient for 720p and lower
  return '4.0'
}

/**
 * Validate resolution for H.264 encoding
 * H.264 supports up to 4096×2160 (DCI 4K) with Level 5.1/5.2
 * @param width - Video width in pixels
 * @param height - Video height in pixels
 * @throws FFmpegError if resolution exceeds H.264 limits
 */
function validateH264Resolution(width: number, height: number): void {
  const pixels = width * height
  const MAX_PIXELS_4K = 4096 * 2160 // DCI 4K (larger than UHD 4K 3840×2160)

  console.log('[FFmpeg] Validating resolution:', { width, height, pixels })

  // Reject resolutions beyond H.264 Level 5.2 limits
  if (pixels > MAX_PIXELS_4K) {
    throw new FFmpegError(
      `Resolution ${width}×${height} exceeds H.264 maximum (4096×2160 DCI 4K). ` +
        `Please downscale to 4K (3840×2160), 1080p (1920×1080), or 720p (1280×720).`,
      FFmpegErrorCode.UNSUPPORTED_FORMAT
    )
  }

  // Log warning for 4K exports (very large files, slow encoding)
  if (width >= 3840 && height >= 2160) {
    console.warn(
      `[FFmpeg] ⚠️  4K export detected (${width}×${height}). ` +
        `Encoding will be slow and produce very large files (H.264 Intra all-I-frames).`
    )
  }
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
  clips.forEach((clip, index) => {
    // Use intermediate path for export (H.264 Intra provides frame-accurate seeking)
    const inputFile = clip.intermediatePath

    console.log(`[FFmpeg] Validating clip ${index + 1}/${clips.length}:`, {
      clipId: clip.id,
      name: clip.name,
      intermediatePath: inputFile,
      trimIn: clip.trimIn,
      trimOut: clip.trimOut,
      duration: clip.duration,
      trimmedDuration: clip.duration - clip.trimIn - clip.trimOut
    })

    // Validate input file exists
    if (!existsSync(inputFile)) {
      console.error(`[FFmpeg] ERROR: Intermediate file not found for clip ${clip.id}:`, inputFile)
      throw new FFmpegError(
        `Intermediate file not found for clip "${clip.name}": ${inputFile}`,
        FFmpegErrorCode.FILE_NOT_FOUND
      )
    }

    console.log(`[FFmpeg] ✓ Clip ${index + 1} intermediate file exists`)

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

  // Determine output resolution for H.264 level calculation and validation
  let outputWidth: number
  let outputHeight: number

  if (resolution === '720p') {
    outputWidth = 1280
    outputHeight = 720
  } else if (resolution === '1080p') {
    outputWidth = 1920
    outputHeight = 1080
  } else {
    // Source resolution - get from first clip
    const firstClip = clips[0]
    outputWidth = firstClip.resolution?.width || 1920
    outputHeight = firstClip.resolution?.height || 1080
    console.log('[FFmpeg] Source resolution export:', {
      width: outputWidth,
      height: outputHeight,
      clipResolution: firstClip.resolution
    })
  }

  // Validate resolution is within H.264 limits (max 4096×2160)
  validateH264Resolution(outputWidth, outputHeight)

  // Calculate required H.264 level based on output resolution
  // Assume 30fps (can be made dynamic if needed)
  const h264Level = calculateH264Level(outputWidth, outputHeight, 30)
  console.log('[FFmpeg] Using H.264 Level:', h264Level)

  // Check if any clips have audio (default to true for backwards compatibility)
  const hasAnyAudio = clips.some((clip) => clip.hasAudio !== false)
  console.log('[FFmpeg] Audio detection:', {
    totalClips: clips.length,
    hasAnyAudio,
    clipAudioStatus: clips.map((c) => ({ name: c.name, hasAudio: c.hasAudio ?? true }))
  })

  // Detect gaps between clips (AC #5)
  const gaps = detectGaps(clips)
  console.log('[FFmpeg] Gap detection:', {
    gapCount: gaps.length,
    gaps: gaps.map((g) => ({ startTime: g.startTime.toFixed(2), duration: g.duration.toFixed(2) }))
  })

  // Build filter_complex for concatenation if multiple clips
  if (clips.length > 1) {
    let filterComplex = ''

    // Generate black screen filters for gaps (AC #5)
    gaps.forEach((gap, index) => {
      const blackFilter = generateBlackSegmentFilter(index, gap.duration, outputWidth, outputHeight)
      filterComplex += blackFilter.video + ';'
      if (hasAnyAudio) {
        filterComplex += blackFilter.audio + ';'
      }
    })

    // Build concat inputs - interleave clips and gaps
    let concatInputs = ''
    let gapIndex = 0

    for (let i = 0; i < clips.length; i++) {
      const clipHasAudio = clips[i].hasAudio !== false // Default true for backwards compatibility

      // Add clip segment
      if (hasAnyAudio && clipHasAudio) {
        concatInputs += `[${i}:v][${i}:a]`
      } else if (hasAnyAudio && !clipHasAudio) {
        // Clip has no audio but other clips do - generate silent audio
        concatInputs += `[${i}:v][silent${i}]`
      } else {
        // No clips have audio
        concatInputs += `[${i}:v]`
      }

      // Check if there's a gap after this clip
      const gapAfterClip = gaps.find((g) => g.position === i + 1)
      if (gapAfterClip) {
        // Add gap segment
        if (hasAnyAudio) {
          concatInputs += `[gap${gapIndex}v][gap${gapIndex}a]`
        } else {
          concatInputs += `[gap${gapIndex}v]`
        }
        gapIndex++
      }
    }

    // If mixing audio and video-only clips, generate silent audio for video-only clips
    if (hasAnyAudio && clips.some((c) => c.hasAudio === false)) {
      // Prepend silent audio generation for clips without audio
      let silentAudioFilters = ''
      clips.forEach((clip, i) => {
        if (clip.hasAudio === false) {
          // Generate silent audio with same duration as video
          silentAudioFilters += `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${clip.duration - clip.trimIn - clip.trimOut}[silent${i}];`
        }
      })
      filterComplex = silentAudioFilters + filterComplex
    }

    // Calculate total segment count (clips + gaps)
    const totalSegments = clips.length + gaps.length

    // Add concat filter with concatInputs - include audio streams only if any clips have audio
    const audioOutputs = hasAnyAudio ? ':a=1[concatv][outa]' : ':a=0[concatv]'
    if (resolution === '720p' || resolution === '1080p') {
      filterComplex += `${concatInputs}concat=n=${totalSegments}:v=1${audioOutputs}`

      // Add scaling filter in the same filter_complex chain
      if (resolution === '720p') {
        filterComplex += ';[concatv]scale=1280:720[outv]'
      } else if (resolution === '1080p') {
        filterComplex += ';[concatv]scale=1920:1080[outv]'
      }
    } else {
      // Source quality - no scaling needed
      const outputLabels = hasAnyAudio ? '[outv][outa]' : '[outv]'
      filterComplex += `${concatInputs}concat=n=${totalSegments}:v=1${audioOutputs.replace('[concatv][outa]', outputLabels).replace('[concatv]', outputLabels)}`
    }

    args.push('-filter_complex', filterComplex)
    args.push('-map', '[outv]')
    if (hasAnyAudio) {
      args.push('-map', '[outa]')
    }
  } else {
    // Single clip - use simpler -vf for scaling (no filter_complex needed)
    if (resolution === '720p') {
      args.push('-vf', 'scale=1280:720')
    } else if (resolution === '1080p') {
      args.push('-vf', 'scale=1920:1080')
    }
    // For 'source', no scaling is applied
  }

  // Video codec settings - H.264 with high quality and proper level/profile
  args.push('-c:v', 'libx264')
  args.push('-profile:v', 'high') // High profile for best compression efficiency
  args.push('-level', h264Level) // Dynamic level based on resolution (4.0, 5.1, etc.)
  args.push('-crf', '18') // High quality constant rate factor (lower = better quality)
  args.push('-preset', 'slow') // Slower preset for better compression/quality balance

  // For high-resolution exports (1080p+), add bitrate/buffer constraints
  // This prevents encoder buffer overflow and ensures decoder compatibility
  if (resolution === 'source' && (outputWidth >= 1920 || outputHeight >= 1080)) {
    const maxrate = outputWidth >= 3840 ? '300M' : outputWidth >= 2560 ? '150M' : '80M' // 300M for 4K, 150M for 2.5K, 80M for 1080p
    const bufsize = outputWidth >= 3840 ? '600M' : outputWidth >= 2560 ? '300M' : '160M' // 2x maxrate
    args.push('-maxrate', maxrate)
    args.push('-bufsize', bufsize)
    console.log(`[FFmpeg] High-resolution export (${outputWidth}×${outputHeight}): Added buffer constraints (maxrate=${maxrate}, bufsize=${bufsize})`)
  }

  // Audio codec settings - only if clips have audio
  if (hasAnyAudio) {
    args.push('-c:a', 'aac')
    args.push('-b:a', '192k')
  } else {
    // No audio - explicitly disable audio stream
    args.push('-an')
    console.log('[FFmpeg] No audio streams detected - exporting video-only')
  }

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

    // Calculate timeout: 10x realtime (generous for slow systems and high-res exports)
    // Minimum 2 minutes to handle startup overhead
    const timeoutMs = Math.max(totalDuration * 1000 * 10, 120000)
    console.log(`[FFmpeg] Export timeout set to ${(timeoutMs / 1000).toFixed(0)}s (video duration: ${totalDuration.toFixed(1)}s)`)

    // Execute FFmpeg with progress callback and timeout
    await executeFFmpegCommand(
      args,
      onProgress
        ? (progress) => {
            // Convert to simple percent for IPC
            onProgress(Math.round(progress.percent))
          }
        : undefined,
      totalDuration,
      clips, // Pass clips for detailed error logging
      timeoutMs // Pass timeout
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
  tracks.main.forEach((clip, index) => {
    const inputFile = clip.intermediatePath

    console.log(`[FFmpeg] Validating Track 1 clip ${index + 1}/${tracks.main.length}:`, {
      clipId: clip.id,
      name: clip.name,
      intermediatePath: inputFile,
      trimIn: clip.trimIn,
      trimOut: clip.trimOut,
      duration: clip.duration
    })

    if (!existsSync(inputFile)) {
      console.error(`[FFmpeg] ERROR: Track 1 intermediate file not found for clip ${clip.id}:`, inputFile)
      throw new FFmpegError(`Track 1 intermediate file not found for clip "${clip.name}": ${inputFile}`, FFmpegErrorCode.FILE_NOT_FOUND)
    }

    console.log(`[FFmpeg] ✓ Track 1 clip ${index + 1} intermediate file exists`)

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
    tracks.overlay.forEach((clip, index) => {
      const inputFile = clip.intermediatePath

      console.log(`[FFmpeg] Validating Track 2 clip ${index + 1}/${tracks.overlay.length}:`, {
        clipId: clip.id,
        name: clip.name,
        intermediatePath: inputFile,
        trimIn: clip.trimIn,
        trimOut: clip.trimOut,
        duration: clip.duration
      })

      if (!existsSync(inputFile)) {
        console.error(`[FFmpeg] ERROR: Track 2 intermediate file not found for clip ${clip.id}:`, inputFile)
        throw new FFmpegError(`Track 2 intermediate file not found for clip "${clip.name}": ${inputFile}`, FFmpegErrorCode.FILE_NOT_FOUND)
      }

      console.log(`[FFmpeg] ✓ Track 2 clip ${index + 1} intermediate file exists`)

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

  // Determine output resolution for H.264 level calculation and validation
  let outputWidth: number
  let outputHeight: number

  if (resolution === '720p') {
    outputWidth = 1280
    outputHeight = 720
  } else if (resolution === '1080p') {
    outputWidth = 1920
    outputHeight = 1080
  } else {
    // Source resolution - get from first clip of main track
    const firstClip = tracks.main[0]
    outputWidth = firstClip.resolution?.width || 1920
    outputHeight = firstClip.resolution?.height || 1080
    console.log('[FFmpeg] Multi-track source resolution export:', {
      width: outputWidth,
      height: outputHeight,
      clipResolution: firstClip.resolution
    })
  }

  // Validate resolution is within H.264 limits (max 4096×2160)
  validateH264Resolution(outputWidth, outputHeight)

  // Calculate required H.264 level based on output resolution
  const h264Level = calculateH264Level(outputWidth, outputHeight, 30)
  console.log('[FFmpeg] Multi-track using H.264 Level:', h264Level)

  // Detect audio in tracks and apply mute state (AC #3, #4)
  const track1HasClipsWithAudio = tracks.main.some((clip) => clip.hasAudio !== false)
  const track2HasClipsWithAudio = hasOverlay && tracks.overlay.some((clip) => clip.hasAudio !== false)

  // Track has audio only if clips have audio AND track is not muted
  const track1Muted = tracks.mainMuted || false
  const track2Muted = tracks.overlayMuted || false
  const track1HasAudio = track1HasClipsWithAudio && !track1Muted
  const track2HasAudio = track2HasClipsWithAudio && !track2Muted
  const hasAnyAudio = track1HasAudio || track2HasAudio

  // Get configurable track volumes (AC #2)
  const track1Volume = Math.max(0.0, Math.min(1.0, tracks.mainVolume || 1.0))
  const track2Volume = Math.max(0.0, Math.min(1.0, tracks.overlayVolume || 1.0))

  console.log('[FFmpeg] Multi-track audio detection:', {
    track1HasAudio,
    track2HasAudio,
    track1Muted,
    track2Muted,
    track1Volume,
    track2Volume,
    hasAnyAudio,
    track1Clips: tracks.main.map((c) => ({ name: c.name, hasAudio: c.hasAudio ?? true })),
    track2Clips: tracks.overlay.map((c) => ({ name: c.name, hasAudio: c.hasAudio ?? true }))
  })

  // Detect gaps for each track (AC #5)
  const track1Gaps = detectGaps(tracks.main)
  const track2Gaps = hasOverlay ? detectGaps(tracks.overlay) : []

  console.log('[FFmpeg] Multi-track gap detection:', {
    track1Gaps: track1Gaps.length,
    track2Gaps: track2Gaps.length,
    track1GapDetails: track1Gaps.map((g) => ({ startTime: g.startTime.toFixed(2), duration: g.duration.toFixed(2) })),
    track2GapDetails: track2Gaps.map((g) => ({ startTime: g.startTime.toFixed(2), duration: g.duration.toFixed(2) }))
  })

  // Build complex filter
  let filterComplex = ''

  // Generate black screen filters for Track 1 gaps (AC #5)
  track1Gaps.forEach((gap, index) => {
    const blackFilter = generateBlackSegmentFilter(index, gap.duration, outputWidth, outputHeight)
    filterComplex += blackFilter.video + ';'
    if (track1HasAudio) {
      filterComplex += blackFilter.audio + ';'
    }
  })

  // Concatenate Track 1 clips if multiple
  if (tracks.main.length > 1) {
    let track1Inputs = ''
    let gapIndex = 0

    for (let i = 0; i < tracks.main.length; i++) {
      const clipHasAudio = tracks.main[i].hasAudio !== false

      // Add clip segment
      if (track1HasAudio && clipHasAudio) {
        track1Inputs += `[${i}:v][${i}:a]`
      } else if (track1HasAudio && !clipHasAudio) {
        track1Inputs += `[${i}:v][silent_t1_${i}]`
      } else {
        track1Inputs += `[${i}:v]`
      }

      // Check if there's a gap after this clip
      const gapAfterClip = track1Gaps.find((g) => g.position === i + 1)
      if (gapAfterClip) {
        // Add gap segment
        if (track1HasAudio) {
          track1Inputs += `[gap${gapIndex}v][gap${gapIndex}a]`
        } else {
          track1Inputs += `[gap${gapIndex}v]`
        }
        gapIndex++
      }
    }

    // Generate silent audio for Track 1 clips without audio
    if (track1HasAudio && tracks.main.some((c) => c.hasAudio === false)) {
      let silentFilters = ''
      tracks.main.forEach((clip, i) => {
        if (clip.hasAudio === false) {
          silentFilters += `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${clip.duration - clip.trimIn - clip.trimOut}[silent_t1_${i}];`
        }
      })
      filterComplex = silentFilters + filterComplex
    }

    // Calculate total Track 1 segments (clips + gaps)
    const track1TotalSegments = tracks.main.length + track1Gaps.length

    filterComplex += `${track1Inputs}concat=n=${track1TotalSegments}:v=1:a=${track1HasAudio ? 1 : 0}[main]${track1HasAudio ? '[a1]' : ''}`
  } else {
    // Single Track 1 clip - just label it
    const clipHasAudio = tracks.main[0].hasAudio !== false
    if (track1HasAudio && clipHasAudio) {
      filterComplex += '[0:v]null[main];[0:a]anull[a1]'
    } else if (track1HasAudio && !clipHasAudio) {
      // Generate silent audio
      const clip = tracks.main[0]
      filterComplex += `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${clip.duration - clip.trimIn - clip.trimOut}[a1];[0:v]null[main]`
    } else {
      filterComplex += '[0:v]null[main]'
    }
  }

  // Concatenate Track 2 clips if multiple and overlay exists
  if (hasOverlay) {
    filterComplex += ';'

    // Generate black screen filters for Track 2 gaps (use t2_gap prefix to avoid conflicts)
    track2Gaps.forEach((gap, index) => {
      const blackFilter = generateBlackSegmentFilter(index, gap.duration, outputWidth, outputHeight)
      // Use t2_gap prefix for Track 2 gap labels
      filterComplex += blackFilter.video.replace(`gap${index}v`, `t2_gap${index}v`) + ';'
      if (track2HasAudio) {
        filterComplex += blackFilter.audio.replace(`gap${index}a`, `t2_gap${index}a`) + ';'
      }
    })

    if (tracks.overlay.length > 1) {
      let track2Inputs = ''
      let gapIndex = 0

      for (let i = 0; i < tracks.overlay.length; i++) {
        const inputIndex = track1InputCount + i
        const clipHasAudio = tracks.overlay[i].hasAudio !== false

        // Add clip segment
        if (track2HasAudio && clipHasAudio) {
          track2Inputs += `[${inputIndex}:v][${inputIndex}:a]`
        } else if (track2HasAudio && !clipHasAudio) {
          track2Inputs += `[${inputIndex}:v][silent_t2_${i}]`
        } else {
          track2Inputs += `[${inputIndex}:v]`
        }

        // Check if there's a gap after this clip
        const gapAfterClip = track2Gaps.find((g) => g.position === i + 1)
        if (gapAfterClip) {
          // Add gap segment
          if (track2HasAudio) {
            track2Inputs += `[t2_gap${gapIndex}v][t2_gap${gapIndex}a]`
          } else {
            track2Inputs += `[t2_gap${gapIndex}v]`
          }
          gapIndex++
        }
      }

      // Generate silent audio for Track 2 clips without audio
      if (track2HasAudio && tracks.overlay.some((c) => c.hasAudio === false)) {
        let silentFilters = ''
        tracks.overlay.forEach((clip, i) => {
          if (clip.hasAudio === false) {
            silentFilters += `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${clip.duration - clip.trimIn - clip.trimOut}[silent_t2_${i}];`
          }
        })
        // Insert silent audio generation before concat inputs
        const concatStart = filterComplex.lastIndexOf('[')
        filterComplex = filterComplex.substring(0, concatStart) + silentFilters + filterComplex.substring(concatStart)
      }

      // Calculate total Track 2 segments (clips + gaps)
      const track2TotalSegments = tracks.overlay.length + track2Gaps.length

      filterComplex += `${track2Inputs}concat=n=${track2TotalSegments}:v=1:a=${track2HasAudio ? 1 : 0}[overlay]${track2HasAudio ? '[a2]' : ''}`
    } else {
      // Single Track 2 clip
      const overlayInputIndex = track1InputCount
      const clipHasAudio = tracks.overlay[0].hasAudio !== false
      if (track2HasAudio && clipHasAudio) {
        filterComplex += `[${overlayInputIndex}:v]null[overlay];[${overlayInputIndex}:a]anull[a2]`
      } else if (track2HasAudio && !clipHasAudio) {
        // Generate silent audio
        const clip = tracks.overlay[0]
        filterComplex += `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${clip.duration - clip.trimIn - clip.trimOut}[a2];[${overlayInputIndex}:v]null[overlay]`
      } else {
        filterComplex += `[${overlayInputIndex}:v]null[overlay]`
      }
    }

    // Apply overlay filter
    filterComplex += ';'
    filterComplex += buildOverlayFilter(pipPosition, pipSize)
    filterComplex += '[outv]'

    // Mix audio only if tracks have audio
    if (track1HasAudio && track2HasAudio) {
      // Both tracks have audio - mix them with configurable volumes (AC #1, #2)
      filterComplex += `;[a1]volume=${track1Volume}[a1out];[a2]volume=${track2Volume}[a2out];[a1out][a2out]amix=inputs=2:duration=longest[outa]`
    } else if (track1HasAudio) {
      // Only Track 1 has audio - use anull filter (AC #1, #2)
      filterComplex += ';[a1]anull[outa]'
    } else if (track2HasAudio) {
      // Only Track 2 has audio - use anull filter (AC #1, #2)
      filterComplex += ';[a2]anull[outa]'
    }
    // If no tracks have audio, no audio filter needed
  } else {
    // No overlay - just use Track 1 video and audio
    filterComplex += ';[main]null[outv]'
    if (track1HasAudio) {
      filterComplex += ';[a1]anull[outa]'
    }
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
  args.push('-map', '[outv]')
  if (hasAnyAudio) {
    args.push('-map', '[outa]')
  }

  // Codec settings - H.264 with high quality (CRF 18-20)
  args.push('-c:v', 'libx264')
  args.push('-crf', '18') // High quality constant rate factor
  args.push('-preset', 'slow') // Better compression/quality balance

  // Audio codec settings - only if tracks have audio
  if (hasAnyAudio) {
    args.push('-c:a', 'aac')
    args.push('-b:a', '192k')
  } else {
    // No audio - explicitly disable audio stream
    args.push('-an')
    console.log('[FFmpeg] Multi-track: No audio streams detected - exporting video-only')
  }

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

    // Calculate timeout: 10x realtime (generous for slow systems and high-res exports)
    // Minimum 2 minutes to handle startup overhead
    const timeoutMs = Math.max(totalDuration * 1000 * 10, 120000)
    console.log(`[FFmpeg] Multi-track export timeout set to ${(timeoutMs / 1000).toFixed(0)}s (video duration: ${totalDuration.toFixed(1)}s)`)

    // Combine all clips for error logging
    const allClips = [...tracks.main, ...tracks.overlay]

    // Execute FFmpeg with progress callback and timeout
    await executeFFmpegCommand(
      args,
      onProgress
        ? (progress) => {
            onProgress(Math.round(progress.percent))
          }
        : undefined,
      totalDuration,
      allClips, // Pass all clips for detailed error logging
      timeoutMs // Pass timeout
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
