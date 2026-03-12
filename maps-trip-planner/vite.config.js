import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to '/' if deploying to a custom domain,
// or '/repo-name/' if deploying to username.github.io/repo-name
export default defineConfig({
  plugins: [react()],
  base: '/trips/',
  build: {
    outDir: '../trips',
    emptyOutDir: false,
  },
})
