/**
 * Vitest configuration for testing main process (Node.js) code
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/main/**/*.test.ts']
  }
})
