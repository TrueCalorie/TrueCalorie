import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Ensure the service worker handles navigation correctly
      // and doesn't interfere with auth session restoration
      workbox: {
        // Cache the app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache API routes — let them go to the network
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Runtime caching strategy
        runtimeCaching: [
          {
            // API calls always go to network
            urlPattern: /^https:\/\/truecalorie\.net\/api\//,
            handler: 'NetworkOnly',
          },
          {
            // Supabase calls always go to network — never cache auth
            urlPattern: /\.supabase\.co\//,
            handler: 'NetworkOnly',
          },
          {
            // Strava API calls always go to network
            urlPattern: /\.strava\.com\//,
            handler: 'NetworkOnly',
          },
        ],
        // Skip waiting so new versions activate immediately
        skipWaiting: true,
        clientsClaim: true,
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
  ],
})
