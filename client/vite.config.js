import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      //api to the Express backend during development
      "/api": {
        target:      "http://localhost:6000",
        changeOrigin: true,
        secure:       false,
      },
    },
  },
  build: {
    outDir:        "dist",
    sourcemap:     true,
    chunkSizeWarningLimit: 600,
  },
});