/**
 * FFmpeg Service
 * Handles video processing using FFmpeg static binaries
 */
import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import ffmpegStatic from 'ffmpeg-static'

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
