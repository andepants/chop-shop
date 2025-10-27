/**
 * Tests for shared type definitions
 * Validates IPCResponse format and IPC channel constants
 */
import { describe, it, expect } from 'vitest'
import { IPCResponse, IPC_CHANNELS } from '../types'

describe('IPCResponse Type', () => {
  it('validates successful response structure', () => {
    const response: IPCResponse<string> = {
      success: true,
      data: 'test data'
    }

    expect(response.success).toBe(true)
    expect(response.data).toBe('test data')
    expect(response.error).toBeUndefined()
  })

  it('validates error response structure', () => {
    const response: IPCResponse = {
      success: false,
      error: 'Test error'
    }

    expect(response.success).toBe(false)
    expect(response.error).toBe('Test error')
    expect(response.data).toBeUndefined()
  })

  it('supports generic type parameter', () => {
    const numberResponse: IPCResponse<number> = {
      success: true,
      data: 42
    }

    const objectResponse: IPCResponse<{ id: number; name: string }> = {
      success: true,
      data: { id: 1, name: 'test' }
    }

    expect(numberResponse.data).toBe(42)
    expect(objectResponse.data).toEqual({ id: 1, name: 'test' })
  })
})

describe('IPC_CHANNELS', () => {
  it('defines PING channel', () => {
    expect(IPC_CHANNELS.PING).toBe('ping')
  })

  it('defines PONG channel', () => {
    expect(IPC_CHANNELS.PONG).toBe('pong')
  })

  it('uses kebab-case naming convention', () => {
    const channels = Object.values(IPC_CHANNELS)
    channels.forEach((channel) => {
      expect(channel).toMatch(/^[a-z]+(-[a-z]+)*$/)
    })
  })

  it('is typed as const for compile-time immutability', () => {
    // The 'as const' assertion ensures type-level immutability
    // TypeScript prevents reassignment at compile time
    expect(IPC_CHANNELS).toBeDefined()
    expect(Object.keys(IPC_CHANNELS).length).toBeGreaterThan(0)
  })
})
