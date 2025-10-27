/**
 * Vitest test setup file
 * Configures global test environment and mocks
 */
import { vi } from 'vitest'
import '@testing-library/jest-dom'

/**
 * Mock window.api for IPC communication tests
 */
global.window = Object.create(window)
Object.defineProperty(window, 'api', {
  writable: true,
  value: {
    ping: vi.fn()
  }
})

/**
 * Mock window.electron for Electron API tests
 */
Object.defineProperty(window, 'electron', {
  writable: true,
  value: {
    ipcRenderer: {
      send: vi.fn(),
      on: vi.fn(),
      invoke: vi.fn()
    }
  }
})
