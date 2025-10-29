/**
 * Audio Extractor Service
 *
 * Extracts and concatenates audio from timeline clips using FFmpeg.
 * Converts audio to Whisper API compatible formats (MP3/WAV).
 * Handles multi-clip timelines and validates audio track presence.
 *
 * Story 6.3: Audio Extraction & Transcription Service (Whisper API)
 */

import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import ffmpegPath from 'ffmpeg-static'

/**
 * Timeline clip structure (subset of full Clip type)
 */
export interface TimelineClip {
  id: string
  sourceFile: string
  intermediatePath: string
  startTime: number
  duration: number
  trimIn: number
  trimOut: number
  hasAudio?: boolean
}

/**
 * Audio extraction options
 */
export interface AudioExtractionOptions {
  /** Bitrate for MP3 encoding (default: 128k for balance of quality and file size) */
  bitrate?: string
  /** Sample rate in Hz (default: 44100) */
  sampleRate?: number
  /** Output format (default: 'mp3') */
  format?: 'mp3' | 'wav'
}

/**
 * Audio extraction result
 */
export interface AudioExtractionResult {
  /** Path to the extracted audio file */
  audioFilePath: string
  /** Duration of the extracted audio in seconds */
  duration: number
  /** File size in bytes */
  fileSize: number
}

/**
 * Audio Extractor Service
 * Manages audio extraction from timeline clips for transcription
 */
export class AudioExtractorService {
  private readonly tempDir: string

  constructor() {
    // Initialize temporary directory for audio files
    this.tempDir = path.join(os.tmpdir(), 'chop-shop', 'ai-audio')
  }

  /**
   * Extract and concatenate audio from timeline clips
   *
   * @param clips - Array of timeline clips to extract audio from
   * @param options - Audio extraction options
   * @returns Audio extraction result with file path and metadata
   * @throws Error if timeline validation fails or FFmpeg extraction fails
   */
  async extractAudioFromTimeline(
    clips: TimelineClip[],
    options: AudioExtractionOptions = {}
  ): Promise<AudioExtractionResult> {
    // Validate timeline has clips
    if (!clips || clips.length === 0) {
      throw new Error('No clips found on timeline. Please add video clips before transcribing.')
    }

    // Validate at least one clip has audio
    const clipsWithAudio = clips.filter((clip) => clip.hasAudio !== false)
    if (clipsWithAudio.length === 0) {
      throw new Error(
        'No audio tracks found. Please ensure your clips contain audio before transcribing.'
      )
    }

    // Ensure temp directory exists
    await this.ensureTempDirectory()

    // Extract audio from each clip
    const extractedAudioPaths: string[] = []

    for (let i = 0; i < clipsWithAudio.length; i++) {
      const clip = clipsWithAudio[i]
      const audioPath = await this.extractAudioFromClip(clip, i, options)
      extractedAudioPaths.push(audioPath)
    }

    // Concatenate all audio files into single file
    const finalAudioPath = await this.concatenateAudioFiles(extractedAudioPaths, options)

    // Get file metadata
    const stats = await fs.stat(finalAudioPath)
    const duration = await this.getAudioDuration(finalAudioPath)

    // Clean up individual clip audio files
    await Promise.all(
      extractedAudioPaths.map((audioPath) =>
        fs.unlink(audioPath).catch((err) => {
          console.warn(`Failed to delete temporary audio file ${audioPath}:`, err)
        })
      )
    )

    return {
      audioFilePath: finalAudioPath,
      duration,
      fileSize: stats.size
    }
  }

  /**
   * Extract audio from a single clip
   *
   * @param clip - Timeline clip to extract audio from
   * @param index - Clip index for unique file naming
   * @param options - Audio extraction options
   * @returns Path to extracted audio file
   * @private
   */
  private async extractAudioFromClip(
    clip: TimelineClip,
    index: number,
    options: AudioExtractionOptions
  ): Promise<string> {
    const { bitrate = '128k', sampleRate = 44100, format = 'mp3' } = options

    // Use intermediate path if available (H.264 Intra for frame-accurate editing)
    const inputPath = clip.intermediatePath || clip.sourceFile

    // Generate output path for this clip's audio
    const timestamp = Date.now()
    const outputPath = path.join(this.tempDir, `clip-${index}-${timestamp}.${format}`)

    // Build FFmpeg command
    // -i: input file
    // -vn: disable video (audio only)
    // -acodec libmp3lame: use MP3 encoder
    // -ar: sample rate
    // -ab: audio bitrate
    // -y: overwrite output file
    const args = [
      '-i',
      inputPath,
      '-vn', // No video
      '-acodec',
      format === 'mp3' ? 'libmp3lame' : 'pcm_s16le',
      '-ar',
      sampleRate.toString(),
      '-ab',
      bitrate,
      '-y', // Overwrite
      outputPath
    ]

    await this.runFFmpeg(args, `Extracting audio from clip ${index + 1}`)

    return outputPath
  }

  /**
   * Concatenate multiple audio files into a single file
   *
   * @param audioPaths - Array of audio file paths to concatenate
   * @param options - Audio extraction options
   * @returns Path to final concatenated audio file
   * @private
   */
  private async concatenateAudioFiles(
    audioPaths: string[],
    options: AudioExtractionOptions
  ): Promise<string> {
    const { format = 'mp3' } = options

    // If only one audio file, just rename it
    if (audioPaths.length === 1) {
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const finalPath = path.join(this.tempDir, `transcription-${timestamp}-${random}.${format}`)

      await fs.rename(audioPaths[0], finalPath)
      return finalPath
    }

    // Create concat file list for FFmpeg
    const concatListPath = path.join(this.tempDir, `concat-list-${Date.now()}.txt`)
    const concatListContent = audioPaths.map((p) => `file '${p}'`).join('\n')
    await fs.writeFile(concatListPath, concatListContent, 'utf-8')

    // Generate final output path
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const outputPath = path.join(this.tempDir, `transcription-${timestamp}-${random}.${format}`)

    // Concatenate using FFmpeg concat demuxer
    // -f concat: use concat demuxer
    // -safe 0: allow absolute paths
    // -i: input concat file list
    // -c copy: copy codec without re-encoding (faster)
    const args = ['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-y', outputPath]

    await this.runFFmpeg(args, 'Concatenating audio files')

    // Clean up concat list file
    await fs.unlink(concatListPath).catch((err) => {
      console.warn(`Failed to delete concat list file ${concatListPath}:`, err)
    })

    return outputPath
  }

  /**
   * Get audio duration using FFprobe
   *
   * @param audioFilePath - Path to audio file
   * @returns Duration in seconds
   * @private
   */
  private async getAudioDuration(audioFilePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Use ffprobe (bundled with ffmpeg-static) to get audio duration
      const ffprobePath = ffmpegPath?.replace('ffmpeg', 'ffprobe') || 'ffprobe'

      const args = [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        audioFilePath
      ]

      const ffprobe = spawn(ffprobePath, args)
      let output = ''

      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to get audio duration'))
          return
        }

        const duration = parseFloat(output.trim())
        if (isNaN(duration)) {
          reject(new Error('Invalid audio duration'))
          return
        }

        resolve(duration)
      })

      ffprobe.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Run FFmpeg command and handle errors
   *
   * @param args - FFmpeg command arguments
   * @param description - Description of operation for error messages
   * @private
   */
  private async runFFmpeg(args: string[], description: string): Promise<void> {
    if (!ffmpegPath) {
      throw new Error('FFmpeg binary not found')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, args)
      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.error(`FFmpeg error (${description}):`, stderr)
          reject(new Error(`Audio extraction failed. Please check your video files.`))
          return
        }

        resolve()
      })

      ffmpeg.on('error', (err) => {
        console.error(`FFmpeg process error (${description}):`, err)
        reject(new Error(`Audio extraction failed: ${err.message}`))
      })
    })
  }

  /**
   * Ensure temporary directory exists
   * Creates directory structure if it doesn't exist
   *
   * @private
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      throw new Error(`Failed to create temporary directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clean up a specific audio file
   *
   * @param audioFilePath - Path to audio file to delete
   */
  async cleanupAudioFile(audioFilePath: string): Promise<void> {
    try {
      await fs.unlink(audioFilePath)
    } catch (error) {
      console.warn(`Failed to delete audio file ${audioFilePath}:`, error)
    }
  }

  /**
   * Clean up all orphaned audio files older than specified age
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   */
  async cleanupOrphanedFiles(maxAgeMs: number = 3600000): Promise<void> {
    try {
      await fs.access(this.tempDir)
    } catch {
      // Directory doesn't exist, nothing to clean
      return
    }

    try {
      const files = await fs.readdir(this.tempDir)
      const now = Date.now()

      for (const file of files) {
        const filePath = path.join(this.tempDir, file)
        const stats = await fs.stat(filePath)

        // Delete if older than maxAge
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath).catch((err) => {
            console.warn(`Failed to delete orphaned file ${filePath}:`, err)
          })
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup orphaned audio files:', error)
    }
  }
}

// Export singleton instance
export const audioExtractorService = new AudioExtractorService()
