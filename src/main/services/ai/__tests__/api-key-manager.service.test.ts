/**
 * API Key Manager Service Tests
 *
 * Tests for secure API key storage and retrieval
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiKeyManager } from '../api-key-manager.service'
import fs from 'fs/promises'
import path from 'path'

// Mock Electron modules
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from(`encrypted_${str}`, 'utf-8')),
    decryptString: vi.fn((buffer: Buffer) => {
      const str = buffer.toString('utf-8')
      return str.replace('encrypted_', '')
    })
  },
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data')
  }
}))

describe('ApiKeyManager', () => {
  let apiKeyManager: ApiKeyManager
  let testConfigPath: string

  beforeEach(() => {
    apiKeyManager = new ApiKeyManager()
    testConfigPath = path.join('/tmp/test-user-data', 'ai-config.json')
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testConfigPath)
    } catch {
      // Ignore if file doesn't exist
    }
  })

  describe('storeKey', () => {
    it('should store an API key successfully', async () => {
      const testKey = 'sk-test123456789'
      const result = await apiKeyManager.storeKey(testKey)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      // Verify file was created
      const fileExists = await fs.access(testConfigPath).then(() => true).catch(() => false)
      expect(fileExists).toBe(true)
    })

    it('should encrypt the API key before storing', async () => {
      const testKey = 'sk-test123456789'
      await apiKeyManager.storeKey(testKey)

      const fileContent = await fs.readFile(testConfigPath, 'utf-8')
      const stored = JSON.parse(fileContent)

      expect(stored.encryptedKey).toBeDefined()
      expect(stored.encryptedKey).not.toBe(testKey)
      expect(stored.timestamp).toBeDefined()
    })

    it('should reject empty API key', async () => {
      const result = await apiKeyManager.storeKey('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should reject whitespace-only API key', async () => {
      const result = await apiKeyManager.storeKey('   ')

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should fail gracefully when encryption is unavailable', async () => {
      const { safeStorage } = await import('electron')
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false)

      const result = await apiKeyManager.storeKey('sk-test123456789')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Encryption is not available')
    })
  })

  describe('getKey', () => {
    it('should retrieve and decrypt a stored API key', async () => {
      const testKey = 'sk-test123456789'
      await apiKeyManager.storeKey(testKey)

      const retrievedKey = await apiKeyManager.getKey()

      expect(retrievedKey).toBe(testKey)
    })

    it('should return null when no key is stored', async () => {
      const retrievedKey = await apiKeyManager.getKey()

      expect(retrievedKey).toBeNull()
    })

    it('should return null when config file is corrupted', async () => {
      // Create a corrupted config file
      await fs.writeFile(testConfigPath, 'invalid json', 'utf-8')

      const retrievedKey = await apiKeyManager.getKey()

      expect(retrievedKey).toBeNull()
    })

    it('should perform encryption/decryption roundtrip correctly', async () => {
      const testKeys = [
        'sk-short',
        'sk-test123456789abcdefghijklmnopqrstuvwxyz',
        'sk-with-special-chars-!@#$%^&*()'
      ]

      for (const testKey of testKeys) {
        await apiKeyManager.storeKey(testKey)
        const retrieved = await apiKeyManager.getKey()
        expect(retrieved).toBe(testKey)

        // Clean up for next iteration
        await apiKeyManager.clearKey()
      }
    })
  })

  describe('clearKey', () => {
    it('should clear a stored API key', async () => {
      await apiKeyManager.storeKey('sk-test123456789')

      const result = await apiKeyManager.clearKey()

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      // Verify file was deleted
      const fileExists = await fs.access(testConfigPath).then(() => true).catch(() => false)
      expect(fileExists).toBe(false)
    })

    it('should succeed even when no key is stored', async () => {
      const result = await apiKeyManager.clearKey()

      expect(result.success).toBe(true)
    })

    it('should return null after clearing', async () => {
      await apiKeyManager.storeKey('sk-test123456789')
      await apiKeyManager.clearKey()

      const retrievedKey = await apiKeyManager.getKey()

      expect(retrievedKey).toBeNull()
    })
  })

  describe('hasKey', () => {
    it('should return true when API key is stored', async () => {
      await apiKeyManager.storeKey('sk-test123456789')

      const hasKey = await apiKeyManager.hasKey()

      expect(hasKey).toBe(true)
    })

    it('should return false when no API key is stored', async () => {
      const hasKey = await apiKeyManager.hasKey()

      expect(hasKey).toBe(false)
    })

    it('should return false after clearing key', async () => {
      await apiKeyManager.storeKey('sk-test123456789')
      await apiKeyManager.clearKey()

      const hasKey = await apiKeyManager.hasKey()

      expect(hasKey).toBe(false)
    })
  })
})
