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
import { MAX_FILE_SIZE } from '../../shared/constants'
import {
  detectVFR,
  getIntermediatePath,
  transcodeToProRes,
  type TranscodeProgressCallback
} from './transcode.service'
import { getFfprobePath } from '../utils/binaryPaths'

const execAsync = promisify(exec)

/**
 * Path to bundled ffprobe binary
 */
const ffprobePath = getFfprobePath()

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

  // Check file size limit (2GB)
  if (size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(size / (1024 * 1024))
    const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024))
    throw new Error(
      `File too large (${sizeMB}MB). Maximum supported size is ${maxSizeMB}MB.`
    )
  }

  // Use FFprobe to extract video metadata
  try {
    const command = `"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${filePath}"`
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
      hasAudio: !!audioStream,
      intermediatePath: null,
      isVFR: false,
      transcodeStatus: 'pending'
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process video. ${error.message}`)
    }
    throw new Error('Failed to process video. File may be corrupted.')
  }
}

/**
 * Import video file with validation and transcode to intermediate codec
 * Performs full import workflow: validate → detect VFR → transcode to ProRes
 * @param filePath - Absolute path to video file
 * @param onProgress - Optional callback for transcode progress updates
 * @returns Video metadata including intermediate file path
 * @throws Error if validation or transcode fails
 */
export async function importVideoFile(
  filePath: string,
  onProgress?: TranscodeProgressCallback
): Promise<VideoMetadata> {
  console.log('[FileService] Starting video import:', filePath)

  // Step 1: Validate and extract metadata
  const metadata = await validateVideoFile(filePath)
  console.log('[FileService] Validation complete:', metadata)

  // Step 2: Detect VFR
  const isVFR = await detectVFR(filePath)
  console.log('[FileService] VFR detection:', isVFR ? 'Variable frame rate' : 'Constant frame rate')

  // Step 3: Generate intermediate path
  const intermediatePath = getIntermediatePath(filePath)
  console.log('[FileService] Intermediate path:', intermediatePath)

  // Step 4: Update metadata with VFR status and intermediate path
  const updatedMetadata: VideoMetadata = {
    ...metadata,
    isVFR,
    intermediatePath,
    transcodeStatus: 'in-progress'
  }

  // Step 5: Trigger transcode (async, but wait for completion)
  try {
    console.log('[FileService] Starting transcode to ProRes...')
    await transcodeToProRes(filePath, intermediatePath, onProgress)

    // Transcode succeeded
    updatedMetadata.transcodeStatus = 'complete'
    console.log('[FileService] Import complete:', updatedMetadata)
  } catch (error) {
    console.error('[FileService] Transcode failed:', error)
    updatedMetadata.transcodeStatus = 'failed'
    updatedMetadata.intermediatePath = null
    throw new Error(
      `Failed to optimize video for editing: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  return updatedMetadata
}
