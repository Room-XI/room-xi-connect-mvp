import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['/icons/icon-192.png', '/icons/icon-512.png'],
      manifest: {
        name: 'Room XI Connect',
        short_name: 'Room XI',
        description: 'Daily check-ins, local programs, and quick crisis support for youth.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4EFE6',
        theme_color: '#2F4A3F',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/programs.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'programs-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/crisis_supports.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'crisis-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { 
    port: 5173,
    host: true // Allow external connections for Replit
  }
});
