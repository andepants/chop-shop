/**
 * Cache Service Tests
 *
 * Tests for cache.service.ts covering save, load, clear, and file management operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import * as cacheService from '../cache.service'
import type { CacheEntry } from '../../../../renderer/src/types/cache.types'

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData')
  }
}))

// Test cache file path
const TEST_CACHE_PATH = path.join('/mock/userData', 'ai-cache.json')

// Sample cache entry for testing
function createMockCacheEntry(overrides?: Partial<CacheEntry>): CacheEntry {
  return {
    id: 'test-entry-1',
    transcription: {
      id: 'trans-1',
      text: 'This is a test transcription',
      audioSourceClips: ['clip-1'],
      createdAt: '2025-10-29T12:00:00Z',
      duration: 60
    },
    generatedPosts: [
      {
        id: 'post-1',
        platform: 'youtube',
        content: 'Test YouTube description',
        characterCount: 24,
        exceedsLimit: false,
        generatedAt: '2025-10-29T12:05:00Z'
      }
    ],
    request: {
      transcription: 'This is a test transcription',
      personas: ['naval'],
      platforms: ['youtube'],
      includeEmojis: false
    },
    createdAt: '2025-10-29T12:05:00Z',
    ...overrides
  }
}

describe('Cache Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(TEST_CACHE_PATH)
    } catch {
      // Ignore errors if file doesn't exist
    }
  })

  describe('loadCache', () => {
    it('should return empty array when cache file does not exist', async () => {
      // Mock file not found
      vi.spyOn(fs, 'readFile').mockRejectedValueOnce({ code: 'ENOENT' })

      const entries = await cacheService.loadCache()

      expect(entries).toEqual([])
    })

    it('should load and parse cache entries from file', async () => {
      const mockEntries = [createMockCacheEntry()]
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(mockEntries))

      const entries = await cacheService.loadCache()

      expect(entries).toEqual(mockEntries)
    })

    it('should return empty array when cache file is corrupted', async () => {
      // Mock corrupted JSON
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce('invalid json')

      const entries = await cacheService.loadCache()

      expect(entries).toEqual([])
    })

    it('should return empty array when cache file is not an array', async () => {
      // Mock non-array JSON
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }))

      const entries = await cacheService.loadCache()

      expect(entries).toEqual([])
    })
  })

  describe('saveCacheEntry', () => {
    it('should save new entry to empty cache file', async () => {
      const newEntry = createMockCacheEntry()

      // Mock loadCache to return empty array
      vi.spyOn(fs, 'readFile').mockRejectedValueOnce({ code: 'ENOENT' })

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValueOnce()

      await cacheService.saveCacheEntry(newEntry)

      expect(writeFileSpy).toHaveBeenCalledWith(
        TEST_CACHE_PATH,
        expect.stringContaining(newEntry.id),
        'utf-8'
      )
    })

    it('should append new entry to existing cache', async () => {
      const existingEntry = createMockCacheEntry({ id: 'existing-1' })
      const newEntry = createMockCacheEntry({ id: 'new-1' })

      // Mock loadCache to return existing entry
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify([existingEntry]))

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValueOnce()

      await cacheService.saveCacheEntry(newEntry)

      // Verify both entries are in the saved content
      const savedContent = writeFileSpy.mock.calls[0][1] as string
      expect(savedContent).toContain('new-1')
      expect(savedContent).toContain('existing-1')

      // New entry should be first (newest first)
      const savedEntries = JSON.parse(savedContent)
      expect(savedEntries[0].id).toBe('new-1')
      expect(savedEntries[1].id).toBe('existing-1')
    })

    it('should throw error when save fails', async () => {
      const newEntry = createMockCacheEntry()

      vi.spyOn(fs, 'readFile').mockRejectedValueOnce({ code: 'ENOENT' })
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Write failed'))

      await expect(cacheService.saveCacheEntry(newEntry)).rejects.toThrow('Failed to save cache entry')
    })
  })

  describe('clearCache', () => {
    it('should delete cache file', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlink').mockResolvedValueOnce()

      await cacheService.clearCache()

      expect(unlinkSpy).toHaveBeenCalledWith(TEST_CACHE_PATH)
    })

    it('should succeed when cache file does not exist', async () => {
      vi.spyOn(fs, 'unlink').mockRejectedValueOnce({ code: 'ENOENT' })

      await expect(cacheService.clearCache()).resolves.not.toThrow()
    })

    it('should throw error when delete fails', async () => {
      vi.spyOn(fs, 'unlink').mockRejectedValueOnce(new Error('Delete failed'))

      await expect(cacheService.clearCache()).rejects.toThrow('Failed to clear cache')
    })
  })

  describe('Cache Size Management', () => {
    it('should trim cache when entry count exceeds limit', async () => {
      // Create 101 entries (exceeds max of 100)
      const entries: CacheEntry[] = []
      for (let i = 0; i < 101; i++) {
        entries.push(createMockCacheEntry({
          id: `entry-${i}`,
          createdAt: new Date(Date.now() - i * 1000).toISOString()
        }))
      }

      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(entries))

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValueOnce()

      await cacheService.saveCacheEntry(createMockCacheEntry({ id: 'new-entry' }))

      // Verify only 100 entries are saved (trimmed)
      const savedContent = writeFileSpy.mock.calls[0][1] as string
      const savedEntries = JSON.parse(savedContent)
      expect(savedEntries.length).toBeLessThanOrEqual(100)
    })

    it('should sort entries by createdAt descending (newest first)', async () => {
      const oldEntry = createMockCacheEntry({
        id: 'old-1',
        createdAt: '2025-10-28T12:00:00Z'
      })
      const newEntry = createMockCacheEntry({
        id: 'new-1',
        createdAt: '2025-10-29T12:00:00Z'
      })

      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify([oldEntry]))

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValueOnce()

      await cacheService.saveCacheEntry(newEntry)

      const savedContent = writeFileSpy.mock.calls[0][1] as string
      const savedEntries = JSON.parse(savedContent)

      // Newest entry should be first
      expect(savedEntries[0].id).toBe('new-1')
      expect(savedEntries[1].id).toBe('old-1')
    })
  })
})
