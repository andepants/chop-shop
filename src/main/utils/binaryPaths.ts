/**
 * Binary Path Utilities
 * Handles resolution of ffmpeg/ffprobe binary paths for both development and production
 * In production (packaged app), binaries are unpacked from app.asar to app.asar.unpacked
 */

import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

/**
 * Fix binary path to work in both development and packaged Electron app
 * When packaged, node_modules are inside app.asar but binaries are unpacked to app.asar.unpacked
 * This function replaces 'app.asar' with 'app.asar.unpacked' in the path
 * @param binaryPath - Original path from ffmpeg-static or ffprobe-static
 * @returns Corrected path that works in production
 */
function fixAsarPath(binaryPath: string): string {
  // In production, replace app.asar path with app.asar.unpacked
  if (binaryPath.includes('app.asar')) {
    return binaryPath.replace('app.asar', 'app.asar.unpacked')
  }
  // In development, return path as-is
  return binaryPath
}

/**
 * Get the correct ffmpeg binary path for current environment
 */
export function getFfmpegPath(): string {
  if (!ffmpegStatic) {
    throw new Error('ffmpeg-static binary not found')
  }
  return fixAsarPath(ffmpegStatic)
}

/**
 * Get the correct ffprobe binary path for current environment
 */
export function getFfprobePath(): string {
  return fixAsarPath(ffprobeStatic.path)
}
