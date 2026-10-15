import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: ['chrome >= 60', 'edge >= 79', 'safari >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
    {
      name: 'webos-clean-crossorigin',
      enforce: 'post',
      transformIndexHtml(html) {
        // Strip crossorigin from all scripts and links for webOS file:// protocol
        return html
          .replace(/\scrossorigin(="[^"]*")?/g, '')
          .replace(/crossorigin/g, '');
      },
    },
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
