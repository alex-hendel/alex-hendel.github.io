import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to '/' if deploying to a custom domain,
// or '/repo-name/' if deploying to username.github.io/repo-name
export default defineConfig({
  plugins: [react()],
  base: '/trips/spring2026/',
  build: {
    outDir: '../trips/spring2026',
    emptyOutDir: false,
  },
})
