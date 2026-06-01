import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      id: '/',
      scope: '/',
      lang: 'en-US',
      categories: ['health', 'fitness'],
      description: 'Calorie and macro tracking built for athletes. Log food by voice, barcode, or search.',
      registerType: 'autoUpdate',
      manifest: {
        name: 'TrueCalorie',
        short_name: 'TrueCalorie',
        description: 'The easiest way to track what you eat',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})