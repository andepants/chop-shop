/**
 * Whisper Service
 *
 * Integrates with OpenAI Whisper API for audio transcription.
 * Handles file size validation, compression, and chunking for large files.
 * Manages API authentication and error handling.
 *
 * Story 6.3: Audio Extraction & Transcription Service (Whisper API)
 */

import OpenAI from 'openai'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'
import ffmpegPath from 'ffmpeg-static'
import { getFfprobePath } from '../../utils/binaryPaths'

/**
 * Whisper API constraints
 */
const WHISPER_MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB in bytes
const CHUNK_DURATION_SECONDS = 600 // 10 minutes per chunk
const COMPRESSED_BITRATE = '64k' // Bitrate for compression

/**
 * Transcription options
 */
export interface TranscriptionOptions {
  /** OpenAI API key for authentication */
  apiKey: string
  /** Language code (optional, auto-detect if omitted) */
  language?: string
  /** Temperature for sampling (0-1, default 0 for deterministic) */
  temperature?: number
  /** Custom prompt to guide transcription style */
  prompt?: string
}

/**
 * Transcription result
 */
export interface TranscriptionResult {
  /** Transcribed text */
  text: string
  /** Duration of audio transcribed in seconds */
  duration: number
  /** Whether file was compressed/chunked */
  wasCompressed: boolean
  /** Warning message if quality may be affected */
  warning?: string
}

/**
 * Whisper Service
 * Manages audio transcription using OpenAI Whisper API
 */
export class WhisperService {
  private readonly tempDir: string

  constructor() {
    // Reuse same temp directory as audio extractor
    this.tempDir = path.join(os.tmpdir(), 'chop-shop', 'ai-audio')
  }

  /**
   * Transcribe audio file using OpenAI Whisper API
   *
   * @param audioFilePath - Path to audio file (MP3/WAV)
   * @param options - Transcription options including API key
   * @returns Transcription result with text and metadata
   * @throws Error if API authentication fails, file too large, or network errors
   */
  async transcribeAudio(
    audioFilePath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const { apiKey, language, temperature = 0, prompt } = options

    // Validate API key
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('Transcription failed: Invalid API key. Please check your AI Settings.')
    }

    // Get file size
    const stats = await fs.stat(audioFilePath)
    const fileSize = stats.size

    // Get audio duration
    const duration = await this.getAudioDuration(audioFilePath)

    // Check if file needs compression or chunking
    if (fileSize > WHISPER_MAX_FILE_SIZE) {
      console.log(
        `[WhisperService] File size (${(fileSize / 1024 / 1024).toFixed(2)} MB) exceeds Whisper limit. Attempting compression...`
      )

      // Try compression first
      const compressedPath = await this.compressAudio(audioFilePath)
      const compressedStats = await fs.stat(compressedPath)
      const compressedSize = compressedStats.size

      if (compressedSize <= WHISPER_MAX_FILE_SIZE) {
        console.log(
          `[WhisperService] Compression successful (${(compressedSize / 1024 / 1024).toFixed(2)} MB). Transcribing...`
        )

        // Transcribe compressed file
        const text = await this.callWhisperAPI(compressedPath, options)

        // Clean up compressed file
        await fs.unlink(compressedPath).catch((err) => {
          console.warn(`Failed to delete compressed file ${compressedPath}:`, err)
        })

        return {
          text,
          duration,
          wasCompressed: true,
          warning: 'Audio was compressed to meet file size limits. Quality may be slightly reduced.'
        }
      } else {
        console.log(
          `[WhisperService] Compression insufficient (${(compressedSize / 1024 / 1024).toFixed(2)} MB). Chunking required...`
        )

        // Clean up failed compression
        await fs.unlink(compressedPath).catch((err) => {
          console.warn(`Failed to delete compressed file ${compressedPath}:`, err)
        })

        // File still too large after compression, use chunking
        const text = await this.transcribeInChunks(audioFilePath, options, duration)

        return {
          text,
          duration,
          wasCompressed: true,
          warning:
            'Audio was split into chunks for processing. Transcription may have minor gaps at chunk boundaries.'
        }
      }
    }

    // File is within size limit, transcribe directly
    const text = await this.callWhisperAPI(audioFilePath, options)

    return {
      text,
      duration,
      wasCompressed: false
    }
  }

  /**
   * Call OpenAI Whisper API to transcribe audio file
   *
   * @param audioFilePath - Path to audio file
   * @param options - Transcription options
   * @returns Transcribed text
   * @private
   */
  private async callWhisperAPI(
    audioFilePath: string,
    options: TranscriptionOptions
  ): Promise<string> {
    const { apiKey, language, temperature = 0, prompt } = options

    try {
      // Create OpenAI client
      const openai = new OpenAI({ apiKey })

      // Read audio file as stream
      const audioStream = await fs.readFile(audioFilePath)
      const audioFile = new File([audioStream], path.basename(audioFilePath), {
        type: 'audio/mpeg'
      })

      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language || undefined,
        temperature,
        prompt: prompt || undefined
      })

      return transcription.text
    } catch (error) {
      // Handle specific API errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()

        // Invalid API key
        if (
          errorMessage.includes('incorrect api key') ||
          errorMessage.includes('invalid api key') ||
          errorMessage.includes('unauthorized')
        ) {
          throw new Error('Transcription failed: Invalid API key. Please check your AI Settings.')
        }

        // Rate limit or quota errors
        if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
          throw new Error(
            'Transcription failed: API quota exceeded. Please try again later or check your OpenAI usage limits.'
          )
        }

        // Network errors
        if (
          errorMessage.includes('network') ||
          errorMessage.includes('enotfound') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('econnrefused')
        ) {
          throw new Error(
            'Network error during transcription. Please check your internet connection.'
          )
        }

        // File size errors (shouldn't happen with our validation, but handle anyway)
        if (errorMessage.includes('file') && errorMessage.includes('size')) {
          throw new Error(
            'Audio file too large (> 25MB). Please use shorter clips or split your timeline.'
          )
        }

        // Generic API error
        throw new Error(`Transcription failed: ${error.message}`)
      }

      throw new Error('An unknown error occurred during transcription')
    }
  }

  /**
   * Compress audio file to reduce file size
   *
   * @param audioFilePath - Path to original audio file
   * @returns Path to compressed audio file
   * @private
   */
  private async compressAudio(audioFilePath: string): Promise<string> {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const compressedPath = path.join(
      this.tempDir,
      `compressed-${timestamp}-${random}.mp3`
    )

    if (!ffmpegPath) {
      throw new Error('FFmpeg binary not found')
    }

    return new Promise((resolve, reject) => {
      // Compress using lower bitrate (64kbps)
      const args = [
        '-i',
        audioFilePath,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ab',
        COMPRESSED_BITRATE,
        '-ar',
        '16000', // Lower sample rate (16kHz is sufficient for speech)
        '-ac',
        '1', // Mono channel (speech only needs mono)
        '-y',
        compressedPath
      ]

      const ffmpeg = spawn(ffmpegPath, args)
      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.error('[WhisperService] FFmpeg compression error:', stderr)
          reject(new Error('Failed to compress audio file'))
          return
        }

        resolve(compressedPath)
      })

      ffmpeg.on('error', (err) => {
        console.error('[WhisperService] FFmpeg process error:', err)
        reject(new Error(`Audio compression failed: ${err.message}`))
      })
    })
  }

  /**
   * Split audio into chunks and transcribe each chunk
   *
   * @param audioFilePath - Path to audio file
   * @param options - Transcription options
   * @param totalDuration - Total duration of audio in seconds
   * @returns Combined transcription text from all chunks
   * @private
   */
  private async transcribeInChunks(
    audioFilePath: string,
    options: TranscriptionOptions,
    totalDuration: number
  ): Promise<string> {
    // Calculate number of chunks needed
    const numChunks = Math.ceil(totalDuration / CHUNK_DURATION_SECONDS)
    console.log(
      `[WhisperService] Splitting audio into ${numChunks} chunks (${CHUNK_DURATION_SECONDS}s each)`
    )

    const chunkPaths: string[] = []
    const transcriptions: string[] = []

    try {
      // Split audio into chunks
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * CHUNK_DURATION_SECONDS
        const chunkPath = await this.extractAudioChunk(
          audioFilePath,
          startTime,
          CHUNK_DURATION_SECONDS,
          i
        )
        chunkPaths.push(chunkPath)
      }

      // Transcribe each chunk sequentially
      for (let i = 0; i < chunkPaths.length; i++) {
        console.log(`[WhisperService] Transcribing chunk ${i + 1}/${chunkPaths.length}...`)

        const chunkPath = chunkPaths[i]
        const text = await this.callWhisperAPI(chunkPath, options)
        transcriptions.push(text)
      }

      // Combine transcriptions with space separator
      return transcriptions.join(' ')
    } finally {
      // Clean up chunk files
      await Promise.all(
        chunkPaths.map((chunkPath) =>
          fs.unlink(chunkPath).catch((err) => {
            console.warn(`Failed to delete chunk file ${chunkPath}:`, err)
          })
        )
      )
    }
  }

  /**
   * Extract a chunk of audio from the original file
   *
   * @param audioFilePath - Path to original audio file
   * @param startTime - Start time in seconds
   * @param duration - Duration of chunk in seconds
   * @param index - Chunk index for unique file naming
   * @returns Path to extracted chunk file
   * @private
   */
  private async extractAudioChunk(
    audioFilePath: string,
    startTime: number,
    duration: number,
    index: number
  ): Promise<string> {
    const timestamp = Date.now()
    const chunkPath = path.join(this.tempDir, `chunk-${index}-${timestamp}.mp3`)

    if (!ffmpegPath) {
      throw new Error('FFmpeg binary not found')
    }

    return new Promise((resolve, reject) => {
      // Extract chunk using FFmpeg
      // -ss: start time
      // -t: duration
      const args = [
        '-ss',
        startTime.toString(),
        '-t',
        duration.toString(),
        '-i',
        audioFilePath,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ab',
        COMPRESSED_BITRATE, // Use compressed bitrate for chunks
        '-ar',
        '16000',
        '-ac',
        '1',
        '-y',
        chunkPath
      ]

      const ffmpeg = spawn(ffmpegPath, args)
      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.error('[WhisperService] FFmpeg chunk extraction error:', stderr)
          reject(new Error('Failed to extract audio chunk'))
          return
        }

        resolve(chunkPath)
      })

      ffmpeg.on('error', (err) => {
        console.error('[WhisperService] FFmpeg process error:', err)
        reject(new Error(`Audio chunk extraction failed: ${err.message}`))
      })
    })
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
      const ffprobePath = getFfprobePath()

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
}

// Export singleton instance
export const whisperService = new WhisperService()
