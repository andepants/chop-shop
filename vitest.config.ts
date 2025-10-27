/**
 * Vitest configuration for testing renderer (React) components
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/renderer/src')
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/renderer/src/__tests__/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      'src/main/**/*.test.ts' // Exclude main process tests (use vitest.main.config.ts)
    ]
  }
})
