import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Set base to your GitHub repo name for GitHub Pages, e.g. '/cooperative-society/'
// If deploying to a custom domain or root, set base to '/'
const base = process.env.GITHUB_ACTIONS ? '/cooperative-society/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['xlsx', 'papaparse'],
  },
})
