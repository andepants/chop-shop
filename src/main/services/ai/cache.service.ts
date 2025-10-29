/**
 * Cache Service
 * Manages persistent storage of transcriptions and generated posts
 * Stores data in userData/ai-cache.json for cross-session persistence
 */

import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { CacheEntry } from '../../../renderer/src/types/cache.types'

const MAX_CACHE_ENTRIES = 100
const MAX_CACHE_SIZE_MB = 10

/**
 * Get the full path to the cache file in userData directory
 */
function getCacheFilePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'ai-cache.json')
}

/**
 * Load all cache entries from file
 * Returns empty array if file doesn't exist or is corrupted
 */
export async function loadCache(): Promise<CacheEntry[]> {
  const cachePath = getCacheFilePath()

  try {
    const fileContent = await fs.readFile(cachePath, 'utf-8')
    const entries = JSON.parse(fileContent) as CacheEntry[]

    // Validate that it's an array
    if (!Array.isArray(entries)) {
      console.warn('[CacheService] Cache file is not an array, resetting to empty')
      return []
    }

    return entries
  } catch (error: any) {
    // File doesn't exist or is corrupted
    if (error.code === 'ENOENT') {
      console.log('[CacheService] Cache file does not exist, starting fresh')
      return []
    }

    console.error('[CacheService] Error loading cache, resetting to empty:', error)
    return []
  }
}

/**
 * Save a new cache entry
 * Appends to existing entries and trims if necessary
 */
export async function saveCacheEntry(entry: CacheEntry): Promise<void> {
  const cachePath = getCacheFilePath()

  try {
    // Load existing entries
    const entries = await loadCache()

    // Add new entry at beginning (newest first)
    entries.unshift(entry)

    // Trim cache if needed
    const trimmedEntries = trimCache(entries)

    // Write back to file
    await fs.writeFile(cachePath, JSON.stringify(trimmedEntries, null, 2), 'utf-8')

    console.log(`[CacheService] Saved cache entry ${entry.id}, total entries: ${trimmedEntries.length}`)
  } catch (error) {
    console.error('[CacheService] Error saving cache entry:', error)
    throw new Error('Failed to save cache entry')
  }
}

/**
 * Clear all cache entries
 * Deletes the cache file or resets to empty array
 */
export async function clearCache(): Promise<void> {
  const cachePath = getCacheFilePath()

  try {
    await fs.unlink(cachePath)
    console.log('[CacheService] Cache file deleted')
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, nothing to clear
      console.log('[CacheService] Cache file already does not exist')
      return
    }

    console.error('[CacheService] Error clearing cache:', error)
    throw new Error('Failed to clear cache')
  }
}

/**
 * Trim cache entries to stay within size limits
 * Implements FIFO removal (oldest entries removed first)
 */
function trimCache(entries: CacheEntry[]): CacheEntry[] {
  // Sort by createdAt descending (newest first)
  const sorted = entries.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Keep only latest MAX_CACHE_ENTRIES
  let trimmed = sorted.slice(0, MAX_CACHE_ENTRIES)

  // Check file size
  const fileSizeBytes = JSON.stringify(trimmed).length
  const fileSizeMB = fileSizeBytes / (1024 * 1024)

  if (fileSizeMB > MAX_CACHE_SIZE_MB) {
    // Aggressive trim to 50% of max entries
    const targetCount = Math.floor(MAX_CACHE_ENTRIES / 2)
    trimmed = trimmed.slice(0, targetCount)
    console.warn(
      `[CacheService] Cache size ${fileSizeMB.toFixed(2)}MB exceeds ${MAX_CACHE_SIZE_MB}MB limit, trimmed to ${targetCount} entries`
    )
  }

  return trimmed
}
