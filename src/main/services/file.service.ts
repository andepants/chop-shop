/**
 * File Service
 * Handles video file validation and metadata extraction using FFmpeg
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { access, stat } from 'fs/promises'
import { constants } from 'fs'
import path from 'path'
import type { VideoMetadata } from '../../shared/types'

const execAsync = promisify(exec)

/**
 * Validate video file and extract metadata using FFprobe
 * @param filePath - Absolute path to video file
 * @returns Video metadata including duration, resolution, and format
 * @throws Error if file is invalid or unreadable
 */
export async function validateVideoFile(filePath: string): Promise<VideoMetadata> {
  // Check file exists and is readable
  try {
    await access(filePath, constants.R_OK)
  } catch {
    throw new Error('Cannot read file. Please check permissions.')
  }

  // Get file size
  const stats = await stat(filePath)
  const size = stats.size

  // Use FFprobe to extract video metadata
  try {
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
    const { stdout } = await execAsync(command)
    const data = JSON.parse(stdout)

    if (!data.streams || data.streams.length === 0) {
      throw new Error('No streams found in file')
    }

    // Find video stream
    const videoStream = data.streams.find((s) => s.codec_type === 'video')
    const audioStream = data.streams.find((s) => s.codec_type === 'audio')

    if (!videoStream) {
      throw new Error('No video stream found')
    }

    // Extract metadata
    const duration = parseFloat(data.format.duration) || 0
    const width = videoStream.width || 0
    const height = videoStream.height || 0
    const format = path.extname(filePath).slice(1).toUpperCase()

    return {
      duration,
      resolution: { width, height },
      format,
      size,
      hasVideo: !!videoStream,
      hasAudio: !!audioStream
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process video. ${error.message}`)
    }
    throw new Error('Failed to process video. File may be corrupted.')
  }
}
