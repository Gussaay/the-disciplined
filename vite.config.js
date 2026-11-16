import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// VITE_BASE lets the same build live under a sub-path (GitHub Pages serves the
// site at /the-disciplined/). Firebase Hosting and the Android app use "/".
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'The Disciplined · الملتزم',
        short_name: 'الملتزم',
        description: 'Commit to your goals: training, food, prayer, people and English.',
        theme_color: '#0F3D3E',
        background_color: '#F6F3EC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // The food database: fetched the first time it is opened, then
            // kept for offline use. A new release uses a new file name.
            urlPattern: ({ url }) => /\/nutrition\/foods-v\d+\.json$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'nutrition',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // The Quran (one file per surah) and the azkar: fetched once, then
            // always read from the device, so they work with no connection.
            urlPattern: ({ url }) => /\/(quran\/\d+|azkar)\.json$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-azkar',
              expiration: { maxEntries: 200 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  base,
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.VITE_RELEASE_VERSION': JSON.stringify(pkg.releaseVersion || pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/functions'],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
