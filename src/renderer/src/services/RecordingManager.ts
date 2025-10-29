/**
 * Recording Manager (Renderer Process)
 * Handles MediaRecorder capture in renderer process with IPC coordination
 * Works with main process recording.service for state management and file writing
 */

import type { RecordingMode } from '../../../shared/types'

/**
 * Recording Manager
 * Singleton for managing MediaRecorder in renderer process
 */
class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private recordedChunks: Blob[] = []
  private isRecording: boolean = false
  private currentMode: RecordingMode | null = null

  /**
   * Start picture-in-picture recording
   * Captures both screen and webcam, composites webcam as overlay
   */
  async startPiPRecording(): Promise<void> {
    try {
      console.log('[RecordingManager] Starting PiP recording...')

      // Get screen source
      const screenResponse = await window.electron.ipcRenderer.invoke('recording:get-screen-source')
      if (!screenResponse.success || !screenResponse.data?.sourceId) {
        throw new Error(screenResponse.error || 'Failed to get screen source')
      }

      // Enumerate webcams in renderer process
      const videoDevices = await this.enumerateWebcams()

      if (videoDevices.length === 0) {
        throw new Error('No webcam devices found. Please connect a camera.')
      }

      // Auto-select first available webcam
      const selectedDevice = videoDevices[0]
      console.log(`[RecordingManager] Selected webcam: ${selectedDevice.label}`)

      // Get screen stream
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenResponse.data.sourceId,
            minWidth: 1920,
            maxWidth: 1920,
            minHeight: 1080,
            maxHeight: 1080,
            minFrameRate: 30,
            maxFrameRate: 30
          }
        } as any
      })

      console.log('[RecordingManager] Screen stream acquired')

      // Get webcam stream with fallback for audio
      let webcamStream: MediaStream
      try {
        console.log('[RecordingManager] Requesting webcam with audio...')
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDevice.deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        console.log('[RecordingManager] Webcam stream acquired with audio')
      } catch (error: any) {
        console.warn('[RecordingManager] Failed to get audio, trying video-only webcam:', error.name)
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDevice.deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
          audio: false
        })
        console.log('[RecordingManager] Webcam stream acquired (video-only)')
      }

      // Composite streams using canvas
      const compositeStream = await this.compositeStreams(screenStream, webcamStream)

      this.mediaStream = compositeStream

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8'

      console.log('[RecordingManager] Using codec:', mimeType)

      this.mediaRecorder = new MediaRecorder(compositeStream, {
        mimeType,
        videoBitsPerSecond: 8_000_000 // 8 Mbps for screen quality
      })

      this.recordedChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
          console.log(`[RecordingManager] Chunk received: ${(event.data.size / 1024).toFixed(2)} KB`)
        }
      }

      this.mediaRecorder.onerror = (event: any) => {
        console.error('[RecordingManager] MediaRecorder error:', event.error)
      }

      this.mediaRecorder.start(5000)

      console.log('[RecordingManager] PiP recording started')

      this.isRecording = true
      this.currentMode = 'pip'
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Composite screen and webcam streams using canvas
   * Creates a single stream with webcam overlaid on screen
   */
  private async compositeStreams(
    screenStream: MediaStream,
    webcamStream: MediaStream
  ): Promise<MediaStream> {
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    const ctx = canvas.getContext('2d')!

    const screenVideo = document.createElement('video')
    screenVideo.srcObject = screenStream
    screenVideo.muted = true
    await screenVideo.play()

    const webcamVideo = document.createElement('video')
    webcamVideo.srcObject = webcamStream
    webcamVideo.muted = true
    await webcamVideo.play()

    // Calculate PiP size (20% of screen width)
    const pipWidth = canvas.width * 0.2
    const pipHeight = (pipWidth * 3) / 4 // 4:3 aspect ratio
    const pipX = canvas.width - pipWidth - 20 // 20px from right
    const pipY = canvas.height - pipHeight - 20 // 20px from bottom

    // Draw composite frame
    const drawFrame = () => {
      if (!this.isRecording) return

      // Draw screen
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height)

      // Draw webcam PiP with circular mask
      ctx.save()
      ctx.beginPath()
      ctx.arc(pipX + pipWidth / 2, pipY + pipHeight / 2, pipWidth / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(webcamVideo, pipX, pipY, pipWidth, pipHeight)
      ctx.restore()

      // Border for PiP
      ctx.strokeStyle = '#06b6d4'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(pipX + pipWidth / 2, pipY + pipHeight / 2, pipWidth / 2, 0, Math.PI * 2)
      ctx.stroke()

      requestAnimationFrame(drawFrame)
    }

    drawFrame()

    // Get composite video stream
    const compositeVideoStream = canvas.captureStream(30)

    // Add audio from webcam
    const audioTracks = webcamStream.getAudioTracks()
    if (audioTracks.length > 0) {
      compositeVideoStream.addTrack(audioTracks[0])
    }

    return compositeVideoStream
  }

  /**
   * Enumerate available webcam devices
   * MUST run in renderer process where navigator.mediaDevices is available
   * @returns Array of video input devices, or empty array if none found
   */
  private async enumerateWebcams(): Promise<MediaDeviceInfo[]> {
    try {
      console.log('[RecordingManager] Enumerating webcam devices...')

      // Request permission first by calling getUserMedia
      // This triggers the OS permission prompt if needed
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })

      // Immediately stop the temporary stream - we just needed it for permission
      tempStream.getTracks().forEach(track => track.stop())

      // Now enumerate devices (requires permission first)
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      console.log(`[RecordingManager] Found ${videoDevices.length} webcam device(s)`)
      videoDevices.forEach((device, index) => {
        console.log(`  [${index}] ${device.label} (${device.deviceId})`)
      })

      return videoDevices
    } catch (error: any) {
      console.error('[RecordingManager] Failed to enumerate webcams:', error)

      // Handle specific error types with user-friendly messages
      if (error.name === 'NotAllowedError') {
        throw new Error(
          'Camera permission denied. Please:\n' +
          '1. Open System Settings > Privacy & Security > Camera\n' +
          '2. Enable camera access for Chop Shop\n' +
          '3. Restart the application'
        )
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera devices found. Please connect a camera.')
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is busy or in use by another application.')
      }

      throw new Error(`Failed to access webcam: ${error.message || 'Unknown error'}`)
    }
  }

  /**
   * Start webcam-only recording
   * Captures webcam video and audio with auto-selected device
   */
  async startWebcamRecording(): Promise<void> {
    try {
      console.log('[RecordingManager] Starting webcam recording...')

      // Enumerate webcams in renderer process (where navigator.mediaDevices exists)
      const videoDevices = await this.enumerateWebcams()

      if (videoDevices.length === 0) {
        throw new Error('No webcam devices found. Please connect a camera.')
      }

      // Auto-select first available webcam
      const selectedDevice = videoDevices[0]
      console.log(`[RecordingManager] Selected webcam: ${selectedDevice.label}`)

      let webcamStream: MediaStream

      // Try to get webcam stream with video and audio
      try {
        console.log('[RecordingManager] Requesting video + audio stream...')
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDevice.deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        console.log('[RecordingManager] Webcam stream acquired with audio')
      } catch (error: any) {
        // If requesting audio fails (microphone permission denied), try video-only
        console.warn('[RecordingManager] Failed to get audio, trying video-only:', error.name)

        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDevice.deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
          audio: false
        })
        console.log('[RecordingManager] Webcam stream acquired (video-only, no audio)')
      }

      this.mediaStream = webcamStream

      // Create MediaRecorder with VP9 codec
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8'

      console.log('[RecordingManager] Using codec:', mimeType)

      this.mediaRecorder = new MediaRecorder(webcamStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000 // 2.5 Mbps
      })

      this.recordedChunks = []

      // Handle data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
          console.log(`[RecordingManager] Chunk received: ${(event.data.size / 1024).toFixed(2)} KB`)
        }
      }

      this.mediaRecorder.onerror = (event: any) => {
        console.error('[RecordingManager] MediaRecorder error:', event.error)
      }

      // Start recording with 5s timeslice
      this.mediaRecorder.start(5000)

      const { width, height } = webcamStream.getVideoTracks()[0].getSettings()
      console.log(`[RecordingManager] Recording started: ${width}x${height} @ 30fps`)

      this.isRecording = true
      this.currentMode = 'webcam'
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Start screen-only recording
   * Uses desktopCapturer via main process, captures with MediaRecorder in renderer
   */
  async startScreenRecording(): Promise<void> {
    try {
      console.log('[RecordingManager] Starting screen recording...')

      // Request screen source ID from main process
      const response = await window.electron.ipcRenderer.invoke('recording:get-screen-source')
      if (!response.success || !response.data?.sourceId) {
        throw new Error(response.error || 'Failed to get screen source')
      }

      const sourceId = response.data.sourceId

      // Get screen stream using Electron's desktopCapturer via getUserMedia
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1920,
            maxWidth: 1920,
            minHeight: 1080,
            maxHeight: 1080,
            minFrameRate: 30,
            maxFrameRate: 30
          }
        } as any
      })

      console.log('[RecordingManager] Screen stream acquired')

      // Get microphone audio if available
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })

        const audioTrack = audioStream.getAudioTracks()[0]
        if (audioTrack) {
          screenStream.addTrack(audioTrack)
          console.log('[RecordingManager] Microphone audio added')
        }
      } catch (error) {
        console.warn('[RecordingManager] Microphone unavailable, proceeding without audio:', error)
      }

      this.mediaStream = screenStream

      // Create MediaRecorder with VP9 codec
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8'

      console.log('[RecordingManager] Using codec:', mimeType)

      this.mediaRecorder = new MediaRecorder(screenStream, {
        mimeType,
        videoBitsPerSecond: 8_000_000 // 8 Mbps
      })

      this.recordedChunks = []

      // Handle data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
          console.log(`[RecordingManager] Chunk received: ${(event.data.size / 1024).toFixed(2)} KB`)
        }
      }

      this.mediaRecorder.onerror = (event: any) => {
        console.error('[RecordingManager] MediaRecorder error:', event.error)
      }

      // Start recording with 5s timeslice
      this.mediaRecorder.start(5000)

      const { width, height } = screenStream.getVideoTracks()[0].getSettings()
      console.log(`[RecordingManager] Recording started: ${width}x${height} @ 30fps`)

      this.isRecording = true
      this.currentMode = 'screen'
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Stop recording and return chunks
   */
  async stopRecording(): Promise<Blob[]> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress')
    }

    console.log('[RecordingManager] Stopping recording...')

    // Stop MediaRecorder and wait for final chunks
    await new Promise<void>((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not found'))
        return
      }

      this.mediaRecorder.onstop = () => {
        console.log('[RecordingManager] MediaRecorder stopped')
        resolve()
      }

      this.mediaRecorder.onerror = (event: any) => {
        reject(new Error(`MediaRecorder error: ${event.error}`))
      }

      this.mediaRecorder.stop()
    })

    // Stop all media tracks
    this.cleanup()

    const chunks = [...this.recordedChunks]
    this.recordedChunks = []
    this.isRecording = false
    this.currentMode = null

    console.log(`[RecordingManager] Recording stopped, ${chunks.length} chunks collected`)

    return chunks
  }

  /**
   * Cleanup media resources
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop()
        console.log(`[RecordingManager] Stopped ${track.kind} track`)
      })
      this.mediaStream = null
    }

    this.mediaRecorder = null
  }

  /**
   * Get recording state
   */
  getState(): { isRecording: boolean; mode: RecordingMode | null } {
    return {
      isRecording: this.isRecording,
      mode: this.currentMode
    }
  }
}

// Export singleton instance
export const recordingManager = new RecordingManager()
