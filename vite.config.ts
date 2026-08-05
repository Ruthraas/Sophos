import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // SPA: navegações offline caem no index.html
        navigateFallback: '/index.html',
      },
      manifest: {
        id: '/',
        start_url: '/',
        name: 'Fórum de Sophos',
        short_name: 'Sophos',
        description:
          'Comunidade de leitura: compartilhe livros e leia direto no navegador.',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#171310',
        theme_color: '#171310',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
