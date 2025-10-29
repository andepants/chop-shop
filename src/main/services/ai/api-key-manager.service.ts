/**
 * API Key Manager Service
 *
 * Manages secure storage and retrieval of OpenAI API keys using Electron's safeStorage API.
 * Keys are encrypted using OS-level encryption (macOS Keychain, Windows DPAPI, Linux Secret Service).
 *
 * Storage location: {userData}/ai-config.json
 * Security: API keys are never logged or exposed to the renderer process directly.
 */

import { safeStorage, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

/**
 * Structure for storing encrypted API key data
 */
interface APIKeyStorage {
  /** Base64-encoded encrypted key */
  encryptedKey: string
  /** Timestamp of when the key was stored (ISO 8601) */
  timestamp: string
}

/**
 * Result of API key operations
 */
interface ApiKeyResult {
  success: boolean
  error?: string
}

/**
 * Service class for managing encrypted API key storage
 */
export class ApiKeyManager {
  private readonly configPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'ai-config.json')
  }

  /**
   * Stores an API key using OS-level encryption
   *
   * @param apiKey - The plaintext API key to store
   * @returns Result indicating success or failure
   */
  async storeKey(apiKey: string): Promise<ApiKeyResult> {
    try {
      // Validate input
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return { success: false, error: 'API key cannot be empty' }
      }

      // Check if safeStorage is available
      if (!safeStorage.isEncryptionAvailable()) {
        return {
          success: false,
          error: 'Encryption is not available on this system'
        }
      }

      // Encrypt the key
      const encryptedBuffer = safeStorage.encryptString(apiKey)
      const encryptedKey = encryptedBuffer.toString('base64')

      // Create storage object
      const storage: APIKeyStorage = {
        encryptedKey,
        timestamp: new Date().toISOString()
      }

      // Write to file
      await fs.writeFile(
        this.configPath,
        JSON.stringify(storage, null, 2),
        'utf-8'
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Retrieves and decrypts the stored API key
   *
   * @returns The decrypted API key or null if not found
   */
  async getKey(): Promise<string | null> {
    try {
      // Check if config file exists
      try {
        await fs.access(this.configPath)
      } catch {
        return null // No key stored
      }

      // Read and parse config file
      const configData = await fs.readFile(this.configPath, 'utf-8')
      const storage: APIKeyStorage = JSON.parse(configData)

      // Validate storage structure
      if (!storage.encryptedKey) {
        throw new Error('Invalid config file structure')
      }

      // Decrypt the key
      const encryptedBuffer = Buffer.from(storage.encryptedKey, 'base64')
      const decryptedKey = safeStorage.decryptString(encryptedBuffer)

      return decryptedKey
    } catch (error) {
      console.error('Failed to retrieve API key:', error)
      return null
    }
  }

  /**
   * Clears the stored API key by deleting the config file
   *
   * @returns Result indicating success or failure
   */
  async clearKey(): Promise<ApiKeyResult> {
    try {
      // Check if config file exists
      try {
        await fs.access(this.configPath)
      } catch {
        return { success: true } // Already cleared
      }

      // Delete the config file
      await fs.unlink(this.configPath)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Checks if an API key is currently stored
   *
   * @returns True if a key exists, false otherwise
   */
  async hasKey(): Promise<boolean> {
    try {
      await fs.access(this.configPath)
      return true
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const apiKeyManager = new ApiKeyManager()
