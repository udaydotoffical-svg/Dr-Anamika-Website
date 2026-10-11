import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // In dev and preview, /api goes to the local stand-in server (npm run api). On Vercel it is the real functions.
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      // two pages: the public website and the doctor's Desk app at /desk
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        desk: resolve(import.meta.dirname, 'desk/index.html'),
      },
      output: {
        // three.js + react-three in one lazy chunk, loaded after the page text is up
        manualChunks(id) {
          if (id.includes('node_modules/three/') || id.includes('@react-three')) return '3d'
        },
      },
    },
  },
})
