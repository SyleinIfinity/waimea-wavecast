import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    // Mặc định chuyển tiếp đến proxy '/api/v1' nếu không có biến môi trường VITE_API_BASE_URL
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1'),
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://136.85.0.193',
        changeOrigin: true,
      },
    },
  },
})

