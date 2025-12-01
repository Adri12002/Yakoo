import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
          icons: ['lucide-react'],
          utils: ['papaparse', 'uuid', 'opencc-js', 'tesseract.js']
        }
      }
    }
  }
})
