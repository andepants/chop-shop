/**
 * Format Time Utility
 * Converts seconds to human-readable time format (MM:SS or HH:MM:SS)
 */

/**
 * Formats duration in seconds to time string
 * @param seconds - Duration in seconds
 * @returns Formatted time string (e.g., "01:23" or "1:23:45")
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return '00:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
