/**
 * Vitest configuration for testing renderer (React) components
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
