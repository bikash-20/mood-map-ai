import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png',
        'icons/icon-192x192-maskable.png',
        'icons/icon-512x512-maskable.png',
      ],
      manifest: {
        name: 'Mood Map AI',
        short_name: 'MoodMap',
        description: 'Track your moods and discover emotional patterns with AI',
        theme_color: '#863bff',
        background_color: '#1e1432',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'en',
        categories: ['health', 'lifestyle', 'productivity'],
        icons: [
          { src: 'icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-256x256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
