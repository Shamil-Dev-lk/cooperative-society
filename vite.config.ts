import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Dynamic base URL resolver for GitHub Pages:
// Root user site (shamil-dev-lk.github.io) -> '/'
// Project site (cooperative-society) -> '/cooperative-society/'
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : ''
const base = repoName && repoName.toLowerCase().endsWith('.github.io')
  ? '/'
  : (process.env.GITHUB_ACTIONS ? '/cooperative-society/' : '/')

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
