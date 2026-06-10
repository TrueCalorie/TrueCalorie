import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isCapacitor = process.env.CAPACITOR_BUILD === 'true'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@capgo/capacitor-health', '@capacitor-community/speech-recognition', '@capacitor/app', '@capacitor/browser'],
    },
  },
  plugins: [
    react(),
    !isCapacitor && VitePWA({
      registerType: 'autoUpdate',
      // Disable precaching entirely — service worker only handles manifest
      // This prevents the SW from clearing localStorage on activation
      workbox: {
        globPatterns: [],
        navigateFallback: null,
        runtimeCaching: [],
      },
      manifest: {
        name: 'TrueCalorie',
        short_name: 'TrueCalorie',
        description: 'Calorie and macro tracking built for athletes. Log food by voice, barcode, or search.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        id: '/',
        scope: '/',
        lang: 'en-US',
        categories: ['health', 'fitness'],
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
  ].filter(Boolean),
})
