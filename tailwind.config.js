/**
 * Tailwind CSS Configuration
 * Configures content paths for the renderer process
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#06b6d4' // cyan for primary actions
      }
    }
  },
  plugins: []
}
