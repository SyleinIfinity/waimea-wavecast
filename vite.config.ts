import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'WAIMEA_DEV_')
  const backend = {
    target: env.WAIMEA_DEV_API_TARGET || 'https://apiwaimea.liems.io.vn',
    changeOrigin: true,
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/v1': backend,
        '/health': backend,
      },
    },
  }
})
