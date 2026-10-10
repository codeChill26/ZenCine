import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 3001,
    allowedHosts: true,
    proxy: {
      '/api/phim': {
        target: 'https://phimapi.com',
        changeOrigin: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        rewrite: (path) => path.replace(/^\/api\/phim/, ''),
      },
    },
  },
})
