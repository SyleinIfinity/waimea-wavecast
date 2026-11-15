import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/v1': {
        target: 'https://apiwaimea.liems.io.vn',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
