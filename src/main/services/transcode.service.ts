/**
 * Transcode Service
 * Handles intermediate codec conversion for frame-accurate editing
 * Converts imported videos to H.264 Intra (all I-frames) for optimal editing performance
 * Uses browser-compatible format for seamless HTML5 video playback in Electron
 */

import { spawn } from 'child_process'
import { mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomUUID } from 'crypto'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import { app } from 'electron'

const execAsync = promisify(exec)

/**
 * Progress callback for transcode operations
 */
export interface TranscodeProgressCallback {
  (progress: { percent: number; file: string }): void
}

/**
 * Get the cache directory path
 * Creates .chop-shop/cache/ in the app's user data directory
 * @returns Absolute path to cache directory
 */
export function getCacheDirectory(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, '.chop-shop', 'cache')
}

/**
 * Ensure cache directory exists with proper permissions
 * @returns Promise that resolves when directory is ready
 */
export async function ensureCacheDirectory(): Promise<void> {
  const cacheDir = getCacheDirectory()

  if (!existsSync(cacheDir)) {
    console.log('[Transcode] Creating cache directory:', cacheDir)
    await mkdir(cacheDir, { recursive: true, mode: 0o755 })
    console.log('[Transcode] Cache directory created')
  }
}

/**
 * Generate intermediate file path for a source file
 * Uses UUID to avoid naming collisions
 * @param sourceFile - Path to source video file
 * @returns Path to intermediate H.264 file in cache
 */
export function getIntermediatePath(sourceFile: string): string {
  const cacheDir = getCacheDirectory()
  const uuid = randomUUID()
  const originalName = basename(sourceFile, '.mp4') // Remove extension
  const intermediateName = `${originalName}-${uuid}-intermediate.mp4`
  return join(cacheDir, intermediateName)
}

/**
 * Detect if a video file has Variable Frame Rate (VFR)
 * VFR files (common in screen recordings) need CFR conversion
 * @param filePath - Path to video file
 * @returns Promise resolving to true if VFR detected, false if CFR
 */
export async function detectVFR(filePath: string): Promise<boolean> {
  const ffprobePath = ffprobeStatic.path

  try {
    // Get frame rate info from ffprobe
    const command = `"${ffprobePath}" -v error -select_streams v:0 -count_packets -show_entries stream=r_frame_rate,avg_frame_rate -of csv=p=0 "${filePath}"`
    const { stdout } = await execAsync(command)

    const lines = stdout.trim().split('\n')
    if (lines.length === 0) {
      return false
    }

    // Parse r_frame_rate and avg_frame_rate
    const [rFrameRate, avgFrameRate] = lines[0].split(',')

    // Convert fraction strings to numbers (e.g., "30000/1001" -> 29.97)
    const parseFrameRate = (fr: string): number => {
      const [num, den] = fr.split('/').map(Number)
      return den ? num / den : num
    }

    const rFps = parseFrameRate(rFrameRate)
    const avgFps = parseFrameRate(avgFrameRate)

    // If r_frame_rate and avg_frame_rate differ by more than 0.1, it's likely VFR
    const isVFR = Math.abs(rFps - avgFps) > 0.1

    console.log('[Transcode] Frame rate detection:', {
      file: basename(filePath),
      rFrameRate: rFps.toFixed(2),
      avgFrameRate: avgFps.toFixed(2),
      isVFR
    })

    return isVFR
  } catch (error) {
    console.error('[Transcode] VFR detection failed:', error)
    // Default to false if detection fails
    return false
  }
}

/**
 * Parse FFmpeg stderr for progress updates during transcode
 * @param stderr - FFmpeg stderr output line
 * @param totalDuration - Total video duration in seconds
 * @returns Progress percentage or null
 */
function parseTranscodeProgress(stderr: string, totalDuration: number): number | null {
  // time=00:00:04.00
  const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)

  if (!timeMatch) return null

  const hours = parseInt(timeMatch[1])
  const minutes = parseInt(timeMatch[2])
  const seconds = parseFloat(timeMatch[3])
  const currentSeconds = hours * 3600 + minutes * 60 + seconds

  const percent = (currentSeconds / totalDuration) * 100
  return Math.min(percent, 100)
}

/**
 * Get video duration using ffprobe
 * @param filePath - Path to video file
 * @returns Duration in seconds
 */
async function getVideoDuration(filePath: string): Promise<number> {
  const ffprobePath = ffprobeStatic.path

  try {
    const command = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    const { stdout } = await execAsync(command)
    return parseFloat(stdout.trim()) || 0
  } catch (error) {
    console.error('[Transcode] Failed to get duration:', error)
    return 0
  }
}

/**
 * Transcode video to H.264 Intra intermediate codec (all I-frames)
 * Applies CFR conversion for VFR sources
 * Uses browser-compatible format for Electron HTML5 video playback
 * @param sourcePath - Path to source video file
 * @param outputPath - Path for output H.264 file
 * @param progressCallback - Optional callback for progress updates
 * @returns Promise that resolves when transcode completes
 */
export async function transcodeToProRes(
  sourcePath: string,
  outputPath: string,
  progressCallback?: TranscodeProgressCallback
): Promise<void> {
  if (!ffmpegStatic) {
    throw new Error('FFmpeg binary not found')
  }

  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`)
  }

  // Ensure cache directory exists
  await ensureCacheDirectory()

  // Get video duration for progress calculation
  const duration = await getVideoDuration(sourcePath)

  console.log('[Transcode] Starting H.264 Intra conversion...')
  console.log('[Transcode] Source:', sourcePath)
  console.log('[Transcode] Output:', outputPath)
  console.log('[Transcode] Duration:', duration.toFixed(2), 'seconds')

  // Build FFmpeg command for H.264 Intra conversion
  // Uses all I-frames (-g 1) for frame-accurate seeking
  // This format is universally supported by Chromium/Electron
  const args = [
    '-i', sourcePath,           // Input file
    '-c:v', 'libx264',          // H.264 video codec
    '-preset', 'ultrafast',     // Fast encoding (editing workflow priority)
    '-crf', '15',               // High quality (lower = better, 0-51 scale)
    '-g', '1',                  // GOP size 1 (all I-frames for frame-accurate seeking)
    '-pix_fmt', 'yuv420p',      // 8-bit 4:2:0 (Chromium compatible)
    '-c:a', 'aac',              // AAC audio (widely supported)
    '-b:a', '256k',             // High quality audio
    '-vsync', 'cfr',            // Force constant frame rate
    '-movflags', '+faststart',  // Enable fast start for web playback
    '-y',                       // Overwrite output file
    outputPath                  // Output file
  ]

  return new Promise((resolve, reject) => {
    console.log('[Transcode] FFmpeg command:', ffmpegStatic, args.join(' '))

    const ffmpegProcess = spawn(ffmpegStatic as string, args)
    let stderrBuffer = ''

    // Capture stderr for progress and errors
    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      stderrBuffer += output

      // Parse progress
      if (progressCallback && duration > 0) {
        const percent = parseTranscodeProgress(output, duration)
        if (percent !== null) {
          progressCallback({
            percent: Math.round(percent),
            file: basename(sourcePath)
          })
        }
      }
    })

    // Handle completion
    ffmpegProcess.on('close', (code: number | null) => {
      if (code === 0) {
        console.log('[Transcode] H.264 Intra conversion completed successfully')
        console.log('[Transcode] Output file:', outputPath)
        resolve()
      } else {
        console.error('[Transcode] FFmpeg failed with code:', code)
        console.error('[Transcode] stderr:', stderrBuffer)
        reject(new Error(`Transcode failed with exit code ${code}`))
      }
    })

    // Handle errors
    ffmpegProcess.on('error', (error: Error) => {
      console.error('[Transcode] Process error:', error)
      reject(new Error(`Transcode process error: ${error.message}`))
    })
  })
}

/**
 * Delete intermediate file from cache
 * @param intermediatePath - Path to intermediate file
 * @returns Promise that resolves when file is deleted
 */
export async function deleteIntermediateFile(intermediatePath: string): Promise<void> {
  if (existsSync(intermediatePath)) {
    console.log('[Transcode] Deleting intermediate file:', intermediatePath)
    await unlink(intermediatePath)
    console.log('[Transcode] Intermediate file deleted')
  }
}
