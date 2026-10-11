import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // three.js + react-three in one lazy chunk, loaded after the page text is up
        manualChunks(id) {
          if (id.includes('node_modules/three/') || id.includes('@react-three')) return '3d'
        },
      },
    },
  },
})
