/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: [
      'server/__tests__/**/*.test.ts',
      'src/**/*.test.{ts,tsx}'
    ],
  },
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
            urlPattern: /\/api\/programs.*/,
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
            urlPattern: /\/api\/events.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'events-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /\/api\/crisis.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'crisis-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            urlPattern: /\/api\/quotes.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quotes-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
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
      '@assets': path.resolve(__dirname, './attached_assets'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation': ['framer-motion'],
          'charts': ['recharts'],
          'maps': ['leaflet', 'react-leaflet'],
          'forms': ['react-hook-form', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: { 
    port: 5000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true
  }
});
