/**
 * Thumbnail Service
 * Generates thumbnail images from video files using FFmpeg
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import ffmpegStatic from 'ffmpeg-static'

const execAsync = promisify(exec)

/**
 * Path to bundled ffmpeg binary
 */
const ffmpegPath = ffmpegStatic as string

/**
 * Generate thumbnail from video at specified timestamp
 * @param filePath - Absolute path to video file
 * @param timestamp - Time in seconds (default: 0 for first frame)
 * @returns Data URL of thumbnail image
 * @throws Error if thumbnail generation fails
 */
export async function generateThumbnail(filePath: string, timestamp: number = 0): Promise<string> {
  try {
    // Use FFmpeg to extract frame as PNG to stdout, then convert to base64
    const command = `"${ffmpegPath}" -ss ${timestamp} -i "${filePath}" -vframes 1 -f image2pipe -vcodec png - | base64`
    const { stdout } = await execAsync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large thumbnails
    })

    // Convert base64 output to data URL
    const base64Data = stdout.trim()
    return `data:image/png;base64,${base64Data}`
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate thumbnail. ${error.message}`)
    }
    throw new Error('Failed to generate thumbnail. Video may not have a valid video track.')
  }
}
